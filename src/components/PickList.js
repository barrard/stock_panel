import React, { useState, useEffect } from "react";
import API from "./API";
import styled from "styled-components";
import Socket from "./Socket.js";
import { useHistory } from "react-router-dom";

const Container = styled.div`
    padding: 1rem;
    background-color: #1a1a1a;
    color: #ffffff;
    min-height: 100vh;
`;

const Title = styled.h1`
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 1rem;
    color: #ffffff;
`;

const ListContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
`;

const HighlightSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.25rem;
    border: 1px solid #333333;
    border-radius: 0.5rem;
    background: #202020;
`;

const HighlightHeader = styled.div`
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 1rem;
`;

const HighlightTitle = styled.h2`
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
    color: #ffffff;
`;

const SummaryRow = styled.div`
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
`;

const SummaryStat = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.65rem 0.9rem;
    border: 1px solid #2f2f2f;
    border-radius: 0.4rem;
    background: #252525;
`;

const SummaryValue = styled.span`
    font-size: 1.1rem;
    font-weight: 600;
    color: ${(props) => props.color || "#ffffff"};
`;

const SummaryLabel = styled.span`
    font-size: 0.7rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #9ca3af;
`;

const WinnerLoserGrid = styled.div`
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
`;

const HighlightCard = styled.div`
    padding: 1rem;
    border-radius: 0.5rem;
    border: 1px solid #333333;
    background: #1e1e1e;
    border-left: 4px solid ${(props) => (props.type === "winner" ? "#16a34a" : "#dc2626")};
    cursor: pointer;
    transition: transform 0.15s ease, border-color 0.15s ease;

    &:hover {
        transform: translateY(-2px);
        border-color: ${(props) => (props.type === "winner" ? "#22c55e" : "#ef4444")};
    }
`;

const HighlightCardHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
`;

const HighlightTicker = styled.span`
    font-size: 1.1rem;
    font-weight: 600;
    color: #ffffff;
`;

const HighlightScore = styled.span`
    font-size: 1rem;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border-radius: 0.4rem;
    background: ${(props) => (props.type === "winner" ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)")};
    color: ${(props) => (props.type === "winner" ? "#22c55e" : "#f87171")};
`;

const HighlightMeta = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.8rem;
    color: #9ca3af;
`;

const HighlightBadge = styled.span`
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${(props) => (props.type === "winner" ? "#34d399" : "#fca5a5")};
`;

const CategorySection = styled.div`
    border: 1px solid #333333;
    border-radius: 0.5rem;
    overflow: hidden;
    background-color: #1e1e1e;
`;

const CategoryHeader = styled.div`
    background-color: #2d2d2d;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #333333;
`;

const CategoryTitle = styled.h2`
    font-size: 1.125rem;
    font-weight: 600;
    color: #ffffff;
`;

const TickerGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 0.5rem;
    padding: 1rem;
    background-color: #1e1e1e;
`;

const TickerItem = styled.div`
    padding: 0.5rem;
    background-color: #2d2d2d;
    border: 1px solid #404040;
    border-radius: 0.25rem;
    text-align: center;
    font-family: monospace;
    font-size: 0.875rem;
    color: #ffffff;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;

    &:hover {
        background-color: #404040;
        border-color: #525252;
        transform: translateY(-1px);
    }
`;

const TickerSymbol = styled.div`
    font-weight: 600;
    font-size: 0.875rem;
`;

const ScoreBadge = styled.div`
    font-size: 0.65rem;
    padding: 0.15rem 0.3rem;
    border-radius: 0.2rem;
    background-color: ${(props) => {
        if (props.strength === "exceptional") return "#16a34a";
        if (props.strength === "strong") return "#22c55e";
        if (props.strength === "moderate") return "#84cc16";
        if (props.severity === "critical") return "#dc2626";
        if (props.severity === "high") return "#ef4444";
        if (props.severity === "warning") return "#f59e0b";
        return "#6b7280";
    }};
    color: #ffffff;
    font-weight: 500;
`;

const SignalCount = styled.div`
    font-size: 0.65rem;
    color: #9ca3af;
`;

const LoadingContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 16rem;
    background-color: #1a1a1a;
`;

const LoadingSpinner = styled.div`
    height: 2rem;
    width: 2rem;
    border-radius: 50%;
    border: 2px solid #333333;
    border-bottom-color: #ffffff;
    animation: spin 1s linear infinite;

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
`;

const Alert = styled.div`
    padding: 1rem;
    border-radius: 0.5rem;
    background-color: #3b1818;
    border: 1px solid #592727;
    color: #ff8080;
    margin-bottom: 1rem;
`;

const categoryNames = {
    highGrowth: "High Growth",
    qualityValueTickers: "Quality Value",
    momentumGrowthTickers: "Momentum Growth",
    turnaroundTickers: "Turnaround",
    cashFlowTickers: "Cash Flow",
    financialDistress: "Financial Distress",
    deteriorating: "Deteriorating",
    zombieCompanies: "Zombie Companies",
    valueTraps: "Value Traps",
};

export default function PickList() {
    const [pickLists, setPickLists] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [winnersLosers, setWinnersLosers] = useState(null);
    const [winnersLosersError, setWinnersLosersError] = useState(null);
    const history = useHistory();

    useEffect(() => {
        fetchData();

        Socket.on("scannerMovers", (data) => {
            console.log(data);
        });

        return () => {
            Socket.off("scannerMovers");
        };
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [pickListResult, winnersLosersResult] = await Promise.allSettled([
                API.getEnhancedPickLists(),
                API.getTopWinnersLosers({ topN: 8, bottomN: 8 }),
            ]);

            if (pickListResult.status === "fulfilled") {
                setPickLists(pickListResult.value);
                setError(null);
            } else {
                setPickLists({});
                setError(pickListResult.reason?.message || "Failed to load pick lists");
            }

            if (winnersLosersResult.status === "fulfilled") {
                setWinnersLosers(winnersLosersResult.value);
                setWinnersLosersError(null);
            } else {
                setWinnersLosers(null);
                setWinnersLosersError("Unable to load top winners/losers right now.");
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleTickerClick = (ticker) => {
        history.push(`/filing-analysis/${ticker}`);
    };

    const renderTickerWithAnalysis = (tickerData) => {
        // If it's just a string (no analysis data), render simple ticker
        if (typeof tickerData === "string") {
            return (
                <TickerItem key={tickerData} onClick={() => handleTickerClick(tickerData)}>
                    <TickerSymbol>{tickerData}</TickerSymbol>
                </TickerItem>
            );
        }

        // Render ticker with analysis data
        const { ticker, score, strength, severity, signalCount } = tickerData;
        const displayLabel = strength || severity || "low";

        return (
            <TickerItem key={ticker} onClick={() => handleTickerClick(ticker)}>
                <TickerSymbol>{ticker}</TickerSymbol>
                {score !== undefined && (
                    <>
                        <ScoreBadge strength={strength} severity={severity}>
                            {score} - {displayLabel}
                        </ScoreBadge>
                        {signalCount > 0 && (
                            <SignalCount>{signalCount} signals</SignalCount>
                        )}
                    </>
                )}
            </TickerItem>
        );
    };

    if (loading) {
        return (
            <LoadingContainer>
                <LoadingSpinner />
            </LoadingContainer>
        );
    }

    if (error) {
        return <Alert>Error loading pick lists: {error}</Alert>;
    }

    return (
        <Container>
            <Title>Stock Pick Lists</Title>
            {winnersLosersError && <Alert>{winnersLosersError}</Alert>}
            {winnersLosers && (
                <HighlightSection>
                    <HighlightHeader>
                        <HighlightTitle>Top Winners &amp; Losers</HighlightTitle>
                        {winnersLosers.summary && (
                            <SummaryRow>
                                <SummaryStat>
                                    <SummaryValue>{winnersLosers.summary.totalAnalyzed}</SummaryValue>
                                    <SummaryLabel>Analyzed</SummaryLabel>
                                </SummaryStat>
                                <SummaryStat>
                                    <SummaryValue color="#34d399">{winnersLosers.summary.totalWinners}</SummaryValue>
                                    <SummaryLabel>Winners</SummaryLabel>
                                </SummaryStat>
                                <SummaryStat>
                                    <SummaryValue color="#f87171">{winnersLosers.summary.totalLosers}</SummaryValue>
                                    <SummaryLabel>Losers</SummaryLabel>
                                </SummaryStat>
                            </SummaryRow>
                        )}
                    </HighlightHeader>
                    <WinnerLoserGrid>
                        {winnersLosers.topWinners?.map((stock) => (
                            <HighlightCard key={`winner-${stock.ticker}`} type="winner" onClick={() => handleTickerClick(stock.ticker)}>
                                <HighlightCardHeader>
                                    <HighlightTicker>{stock.ticker}</HighlightTicker>
                                    <HighlightScore type="winner">{stock.score}</HighlightScore>
                                </HighlightCardHeader>
                                <HighlightMeta>
                                    <HighlightBadge type="winner">
                                        Winner{stock.strength ? ` • ${stock.strength.toUpperCase()}` : ""}
                                    </HighlightBadge>
                                    <span>
                                        {stock.signalCount} signals • {stock.quarter}
                                    </span>
                                </HighlightMeta>
                            </HighlightCard>
                        ))}
                        {winnersLosers.topLosers?.map((stock) => (
                            <HighlightCard key={`loser-${stock.ticker}`} type="loser" onClick={() => handleTickerClick(stock.ticker)}>
                                <HighlightCardHeader>
                                    <HighlightTicker>{stock.ticker}</HighlightTicker>
                                    <HighlightScore type="loser">{stock.score}</HighlightScore>
                                </HighlightCardHeader>
                                <HighlightMeta>
                                    <HighlightBadge type="loser">
                                        Loser{stock.severity ? ` • ${stock.severity.toUpperCase()}` : ""}
                                    </HighlightBadge>
                                    <span>
                                        {stock.signalCount} signals • {stock.quarter}
                                    </span>
                                </HighlightMeta>
                            </HighlightCard>
                        ))}
                    </WinnerLoserGrid>
                </HighlightSection>
            )}
            <ListContainer>
                {Object.entries(pickLists).map(([category, categoryData]) => {
                    // Handle both old format (array of strings) and new format (object with tickers + analysis)
                    const tickers = Array.isArray(categoryData) ? categoryData : categoryData.tickers || [];
                    const topByScore = categoryData.topByScore || [];

                    return (
                        <CategorySection key={category}>
                            <CategoryHeader>
                                <CategoryTitle>
                                    {categoryNames[category] || category}
                                    {categoryData.count && ` (${categoryData.count} stocks)`}
                                </CategoryTitle>
                            </CategoryHeader>
                            <TickerGrid>
                                {/* Show top scored tickers first if available */}
                                {topByScore.length > 0 ? (
                                    topByScore.map((tickerData) => renderTickerWithAnalysis(tickerData))
                                ) : (
                                    tickers.map((ticker) => renderTickerWithAnalysis(ticker))
                                )}
                            </TickerGrid>
                        </CategorySection>
                    );
                })}
            </ListContainer>
        </Container>
    );
}
