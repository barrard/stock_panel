import React, { useEffect, useState, useMemo } from "react";
import { useHistory, useParams } from "react-router-dom";
import styled from "styled-components";
import API from "./API";

const Container = styled.div`
    padding: 1.5rem;
    background-color: #1a1a1a;
    color: #ffffff;
    min-height: 100vh;
`;

const Header = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.5rem;
`;

const Title = styled.h1`
    margin: 0;
    font-size: 1.75rem;
    font-weight: 700;
    letter-spacing: 0.03em;
`;

const BackButton = styled.button`
    background: none;
    border: 1px solid #444444;
    color: #e5e7eb;
    border-radius: 0.4rem;
    padding: 0.4rem 0.75rem;
    font-size: 0.85rem;
    cursor: pointer;
    transition: border-color 0.15s ease, color 0.15s ease;

    &:hover {
        border-color: #818cf8;
        color: #c7d2fe;
    }
`;

const LoadingState = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 40vh;
    font-size: 1rem;
    color: #d1d5db;
`;

const Alert = styled.div`
    padding: 1rem;
    border-radius: 0.5rem;
    background-color: #3b1818;
    border: 1px solid #592727;
    color: #ff8080;
`;

const ScoreGrid = styled.div`
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    margin-bottom: 1.5rem;
`;

const ScoreCard = styled.div`
    padding: 1rem;
    border-radius: 0.6rem;
    border: 1px solid #2f2f2f;
    background: #202020;
    border-left: 4px solid ${(props) => (props.variant === "positive" ? "#16a34a" : "#dc2626")};
`;

const ScoreHeading = styled.div`
    font-size: 0.8rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #9ca3af;
    margin-bottom: 0.5rem;
`;

const ScoreValue = styled.div`
    font-size: 2rem;
    font-weight: 700;
    color: #ffffff;
`;

const ScoreLabel = styled.div`
    font-size: 0.85rem;
    font-weight: 600;
    color: ${(props) => props.color || "#f9fafb"};
`;

const ScoreMeta = styled.div`
    margin-top: 0.5rem;
    font-size: 0.8rem;
    color: #9ca3af;
`;

const SignalsSection = styled.div`
    display: grid;
    gap: 1.5rem;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    margin-bottom: 1.5rem;
`;

const SignalsColumn = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
`;

const ColumnTitle = styled.h2`
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0;
`;

const SignalCard = styled.div`
    padding: 0.9rem;
    border-radius: 0.5rem;
    border: 1px solid #2f2f2f;
    background: #1e1e1e;
`;

const SignalTitle = styled.div`
    font-size: 0.9rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
`;

const SignalMessage = styled.div`
    font-size: 0.85rem;
    color: #d1d5db;
`;

const SignalFooter = styled.div`
    margin-top: 0.5rem;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #9ca3af;
`;

const TrendsSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1rem;
`;

const TrendsHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
`;

const TrendsTitle = styled.h2`
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
`;

const TrendsSummary = styled.div`
    font-size: 0.85rem;
    color: #9ca3af;
`;

const TrendsTable = styled.table`
    width: 100%;
    border-collapse: collapse;
    background: #1e1e1e;
    border-radius: 0.5rem;
    overflow: hidden;
`;

const TrendsHeadCell = styled.th`
    text-align: left;
    padding: 0.75rem;
    font-size: 0.75rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    background: #242424;
    color: #9ca3af;
    border-bottom: 1px solid #2f2f2f;
`;

const TrendsCell = styled.td`
    padding: 0.7rem 0.75rem;
    font-size: 0.85rem;
    border-bottom: 1px solid #2a2a2a;
    color: #e5e7eb;

    &:last-child {
        white-space: nowrap;
    }
`;

const EmptyState = styled.div`
    font-size: 0.85rem;
    color: #9ca3af;
`;

const formatPercent = (value) => {
    if (value === null || value === undefined || Number.isNaN(value)) return "–";
    return `${Number(value).toFixed(1)}%`;
};

const formatBillions = (value) => {
    if (value === null || value === undefined || Number.isNaN(value)) return "–";
    return `$${(Number(value) / 1e9).toFixed(2)}B`;
};

const formatQuarterLabel = (filing) => {
    if (!filing) return "–";
    if (filing.quarter) return filing.quarter;
    if (filing.DocumentFiscalYearFocus && filing.DocumentFiscalPeriodFocus) {
        return `${filing.DocumentFiscalYearFocus}-${filing.DocumentFiscalPeriodFocus}`;
    }
    if (filing.ticker && filing.latestQuarter) return filing.latestQuarter;
    return filing.DocumentPeriodEndDate || filing.filed_date || "–";
};

export default function FilingAnalysisDetail() {
    const { ticker } = useParams();
    const history = useHistory();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        async function fetchAnalysis() {
            setLoading(true);
            try {
                const response = await API.getFilingAnalysisFull(ticker);
                if (!isMounted) return;
                setData(response);
                setError(null);
            } catch (err) {
                if (!isMounted) return;
                setData(null);
                setError(err.message || "Unable to load filing analysis.");
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        if (ticker) {
            fetchAnalysis();
        }

        return () => {
            isMounted = false;
        };
    }, [ticker]);

    const filings = useMemo(() => data?.trends?.filings || [], [data]);

    if (loading) {
        return (
            <Container>
                <Header>
                    <BackButton onClick={() => history.push("/pick-list")}>← Back to Pick Lists</BackButton>
                    <Title>{ticker?.toUpperCase()} Filing Analysis</Title>
                </Header>
                <LoadingState>Loading filing analysis…</LoadingState>
            </Container>
        );
    }

    if (error) {
        return (
            <Container>
                <Header>
                    <BackButton onClick={() => history.push("/pick-list")}>← Back to Pick Lists</BackButton>
                    <Title>{ticker?.toUpperCase()} Filing Analysis</Title>
                </Header>
                <Alert>{error}</Alert>
            </Container>
        );
    }

    if (!data) {
        return (
            <Container>
                <Header>
                    <BackButton onClick={() => history.push("/pick-list")}>← Back to Pick Lists</BackButton>
                    <Title>{ticker?.toUpperCase()} Filing Analysis</Title>
                </Header>
                <EmptyState>No analysis data available.</EmptyState>
            </Container>
        );
    }

    const acceleration = data.acceleration || {};
    const deterioration = data.deterioration || {};

    return (
        <Container>
            <Header>
                <BackButton onClick={() => history.push("/pick-list")}>← Back to Pick Lists</BackButton>
                <Title>{ticker?.toUpperCase()} Filing Analysis</Title>
            </Header>

            <ScoreGrid>
                <ScoreCard variant="positive">
                    <ScoreHeading>Acceleration Score</ScoreHeading>
                    <ScoreValue>{acceleration.score ?? "–"}</ScoreValue>
                    <ScoreLabel color="#34d399">{acceleration.strength?.toUpperCase() || "N/A"}</ScoreLabel>
                    <ScoreMeta>{acceleration.signalCount ?? 0} positive signals</ScoreMeta>
                    <ScoreMeta>Latest quarter: {acceleration.latestQuarter || "–"}</ScoreMeta>
                </ScoreCard>
                <ScoreCard variant="negative">
                    <ScoreHeading>Deterioration Score</ScoreHeading>
                    <ScoreValue>{deterioration.score ?? "–"}</ScoreValue>
                    <ScoreLabel color="#f87171">{deterioration.severity?.toUpperCase() || "N/A"}</ScoreLabel>
                    <ScoreMeta>{deterioration.signalCount ?? 0} warning signals</ScoreMeta>
                    <ScoreMeta>Latest quarter: {deterioration.latestQuarter || "–"}</ScoreMeta>
                </ScoreCard>
            </ScoreGrid>

            <SignalsSection>
                <SignalsColumn>
                    <ColumnTitle>Positive Signals</ColumnTitle>
                    {acceleration.signals?.length ? (
                        acceleration.signals.map((signal, idx) => (
                            <SignalCard key={`positive-${idx}`}>
                                <SignalTitle>{signal.type?.replace(/_/g, " ") || "Signal"}</SignalTitle>
                                <SignalMessage>{signal.message}</SignalMessage>
                                <SignalFooter>
                                    {signal.strength ? `${signal.strength.toUpperCase()} • ` : ""}
                                    Score {signal.score ?? "–"}
                                </SignalFooter>
                            </SignalCard>
                        ))
                    ) : (
                        <EmptyState>No notable acceleration signals.</EmptyState>
                    )}
                </SignalsColumn>
                <SignalsColumn>
                    <ColumnTitle>Warning Signals</ColumnTitle>
                    {deterioration.signals?.length ? (
                        deterioration.signals.map((signal, idx) => (
                            <SignalCard key={`warning-${idx}`}>
                                <SignalTitle>{signal.type?.replace(/_/g, " ") || "Signal"}</SignalTitle>
                                <SignalMessage>{signal.message}</SignalMessage>
                                <SignalFooter>
                                    {signal.severity ? `${signal.severity.toUpperCase()} • ` : ""}
                                    Score {signal.score ?? "–"}
                                </SignalFooter>
                            </SignalCard>
                        ))
                    ) : (
                        <EmptyState>No significant deterioration signals.</EmptyState>
                    )}
                </SignalsColumn>
            </SignalsSection>

            <TrendsSection>
                <TrendsHeader>
                    <TrendsTitle>Quarterly Metrics</TrendsTitle>
                    <TrendsSummary>
                        Covering {data.trends?.quarterCount || (filings.length ? filings.length : "–")} quarters • Latest filing{" "}
                        {acceleration.latestFilingDate || deterioration.latestFilingDate || "–"}
                    </TrendsSummary>
                </TrendsHeader>
                {filings.length ? (
                    <TrendsTable>
                        <thead>
                            <tr>
                                <TrendsHeadCell>Quarter</TrendsHeadCell>
                                <TrendsHeadCell>Revenue</TrendsHeadCell>
                                <TrendsHeadCell>Net Income</TrendsHeadCell>
                                <TrendsHeadCell>Gross Margin</TrendsHeadCell>
                                <TrendsHeadCell>Operating Margin</TrendsHeadCell>
                                <TrendsHeadCell>Net Margin</TrendsHeadCell>
                                <TrendsHeadCell>Current Ratio</TrendsHeadCell>
                            </tr>
                        </thead>
                        <tbody>
                            {filings.slice(0, 8).map((filing, idx) => (
                                <tr key={idx}>
                                    <TrendsCell>{formatQuarterLabel(filing)}</TrendsCell>
                                    <TrendsCell>{formatBillions(filing.Revenues ?? filing.revenue)}</TrendsCell>
                                    <TrendsCell>{formatBillions(filing.NetIncomeLoss ?? filing.netIncome)}</TrendsCell>
                                    <TrendsCell>{formatPercent(filing.GrossMargin ?? filing.grossMargin)}</TrendsCell>
                                    <TrendsCell>{formatPercent(filing.OperatingMargin ?? filing.operatingMargin)}</TrendsCell>
                                    <TrendsCell>{formatPercent(filing.NetMargin ?? filing.netMargin)}</TrendsCell>
                                    <TrendsCell>{filing.CurrentRatio !== undefined ? Number(filing.CurrentRatio).toFixed(2) : "–"}</TrendsCell>
                                </tr>
                            ))}
                        </tbody>
                    </TrendsTable>
                ) : (
                    <EmptyState>No quarterly filings returned.</EmptyState>
                )}
            </TrendsSection>
        </Container>
    );
}
