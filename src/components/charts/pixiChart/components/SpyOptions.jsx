import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { eastCoastTime } from "../../../../indicators/indicatorHelpers/IsMarketOpen";
import SpyChart from "../../SpyChart";

const Container = styled.div`
    max-width: 1400px;
    margin: 0 auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const ChartPlaceholder = styled.div`
    background-color: #f5f5f5;
    border: 2px dashed #ccc;
    border-radius: 8px;
    height: 250px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    color: #666;
`;

const ChartTitle = styled.div`
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 4px;
`;

const ChartSubtitle = styled.div`
    font-size: 14px;
`;

const TabsContainer = styled.div`
    border-bottom: 1px solid #e0e0e0;
`;

const TabsList = styled.nav`
    display: flex;
    gap: 32px;
    margin-bottom: -1px;
`;

const Tab = styled.button`
    padding: 8px 4px;
    border: none;
    border-bottom: 2px solid transparent;
    background: none;
    font-weight: 500;
    font-size: 14px;
    color: ${(props) => (props.active ? "#2563eb" : "#666")};
    border-bottom-color: ${(props) => (props.active ? "#2563eb" : "transparent")};
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        color: ${(props) => (props.active ? "#2563eb" : "#333")};
        border-bottom-color: ${(props) => (props.active ? "#2563eb" : "#ccc")};
    }
`;

const OptionsChainContainer = styled.div`
    background: white;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
    overflow: hidden;
`;

const TableContainer = styled.div`
    overflow-x: auto;
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
`;

const TableHead = styled.thead`
    background-color: #f8f9fa;
`;

const TableHeader = styled.th`
    padding: 12px;
    text-align: left;
    font-size: 12px;
    font-weight: 500;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const TableBody = styled.tbody`
    background: white;
`;

const TableRow = styled.tr`
    background-color: ${(props) => (props.itm ? "#f0fdf4" : "white")};
    transition: background-color 0.1s;

    &:hover {
        background-color: ${(props) => (props.itm ? "#ecfdf5" : "#f9fafb")};
    }

    & + & {
        border-top: 1px solid #f0f0f0;
    }
`;

const TableCell = styled.td`
    padding: 16px 12px;
    white-space: nowrap;
    font-size: 14px;
    color: #111;
`;

const StrikeCell = styled(TableCell)`
    font-weight: 600;
`;

const PriceCell = styled(TableCell)`
    font-weight: 500;
`;

const ChangeCell = styled(TableCell)`
    font-weight: 600;
    color: ${(props) => (props.positive ? "#059669" : "#dc2626")};
`;

const SummaryGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 16px;
`;

const SummaryCard = styled.div`
    background: white;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
    padding: 16px;
`;

const SummaryLabel = styled.div`
    font-size: 14px;
    font-weight: 500;
    color: #666;
    margin-bottom: 4px;
`;

const SummaryValue = styled.div`
    font-size: 24px;
    font-weight: 600;
    color: #111;
`;

const SummaryValueSmall = styled.div`
    font-size: 18px;
    font-weight: 600;
    color: #111;
`;

const UnderlyingRow = styled(TableRow)`
    background-color: #dbeafe !important;
    border-top: 2px solid #3b82f6;
    border-bottom: 2px solid #3b82f6;

    &:hover {
        background-color: #dbeafe !important;
    }
`;

const UnderlyingCell = styled(TableCell)`
    font-weight: 600;
    color: #1e40af;
`;

const UnderlyingContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 8px 0;
    margin: 4px 0;
    border-top: 1px solid #3b82f6;
    border-bottom: 1px solid #3b82f6;
    background: linear-gradient(90deg, transparent 0%, #dbeafe 45%, #bfdbfe 50%, #dbeafe 55%, transparent 100%);
    position: relative;
    gap: 24px;
`;

const UnderlyingPrice = styled.div`
    font-size: 16px;
    font-weight: 700;
    color: #1e40af;
    background: white;
    padding: 4px 12px;
    border-radius: 4px;
    border: 1px solid #3b82f6;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const UnderlyingStats = styled.div`
    display: flex;
    gap: 12px;
    font-size: 12px;
`;

const UnderlyingStat = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    background: white;
    padding: 2px 6px;
    border-radius: 3px;

    .label {
        color: #6b7280;
        font-size: 10px;
        margin-bottom: 1px;
    }

    .value {
        font-weight: 600;
        color: #111;
        font-size: 11px;
    }
`;

const Lvl2Text = styled.div`
    font-size: 10px;
    color: #666;
    margin-top: 2px;
    line-height: 1.1;
`;

const PutCell = styled(TableCell)`
    text-align: right;
    background-color: #fef2f2;
    border-right: 1px solid #e5e7eb;
    tr:hover & {
        background-color: #fecaca;
    }
`;

const CallCell = styled(TableCell)`
    text-align: left;
    background-color: #f0fdf4;
    border-left: 1px solid #e5e7eb;
    tr:hover & {
        background-color: #dcfce7;
    }
`;

const StrikeCellCenter = styled(StrikeCell)`
    text-align: center;
    background-color: #f9fafb;
    border-left: 1px solid #e5e7eb;
    border-right: 1px solid #e5e7eb;
    font-weight: 700;
    tr:hover & {
        background-color: #f3f4f6;
    }
`;

const PutChangeCell = styled(ChangeCell)`
    text-align: right;
    background-color: #fef2f2;
    tr:hover & {
        background-color: #fecaca;
    }
`;

const CallChangeCell = styled(ChangeCell)`
    text-align: left;
    background-color: #f0fdf4;
    tr:hover & {
        background-color: #dcfce7;
    }
`;

function UnderlyingElement({ underlyingData }) {
    return (
        <tr>
            <td colSpan="17" style={{ padding: 0, position: "relative" }}>
                <UnderlyingContainer>
                    <UnderlyingStats>
                        <UnderlyingStat>
                            <div className="label">H</div>
                            <div className="value">${underlyingData.highPrice}</div>
                        </UnderlyingStat>
                        <UnderlyingPrice>${underlyingData.last}</UnderlyingPrice>
                        <UnderlyingStat>
                            <div className="label">L</div>
                            <div className="value">${underlyingData.lowPrice}</div>
                        </UnderlyingStat>
                        <UnderlyingStat>
                            <div className="label">Δ</div>
                            <div className="value">+{underlyingData.percentChange}%</div>
                        </UnderlyingStat>
                    </UnderlyingStats>
                </UnderlyingContainer>
            </td>
        </tr>
    );
}

// ADD THIS FUNCTION
function cleanOptionBookData(levels) {
    levels.forEach((level) => {
        level["price"] = level["0"];
        delete level["0"];
        level["size"] = level["1"];
        delete level["1"];
        level["marketMakerCount"] = level["2"];
        delete level["2"];
        const marketMakers = level["3"] || [];
        delete level["3"];
        marketMakers.forEach((marketMaker) => {
            marketMaker.marketMakerId = marketMaker[0];
            delete marketMaker[0];
            marketMaker.size = marketMaker[1];
            delete marketMaker[1];
            marketMaker.time = marketMaker[2];
            delete marketMaker[2];
        });
        level["marketMakers"] = marketMakers;
    });
}

export default function SpyOptions({ Socket }) {
    const [callsData, setCallsData] = useState(null);
    const [putsData, setPutsData] = useState(null);
    const [selectedExpiration, setSelectedExpiration] = useState(null);
    const [underlyingData, setUnderlyingData] = useState(null);
    const [lvl2Data, setLvl2Data] = useState({});
    const [candleData, setCandleData] = useState([]);
    const [chartInstance, setChartInstance] = useState(null);

    useEffect(() => {
        Socket.on("spyOptionSnaps", (d) => {
            const calls = d?.callExpDateMap;
            const puts = d?.putExpDateMap;
            const underlying = d?.underlying;
            const lvl2 = d?.lvl2Data;
            // Clean and set lvl2 data
            if (lvl2) {
                const cleanedLvl2 = {};
                Object.keys(lvl2).forEach((symbol) => {
                    const data = { ...lvl2[symbol] };
                    cleanOptionBookData(data.bidSideLevels || []);
                    cleanOptionBookData(data.askSideLevels || []);
                    cleanedLvl2[symbol] = data;
                });
                setLvl2Data(cleanedLvl2);
            }
            setUnderlyingData(underlying);

            console.log(d);
            setCallsData(calls);
            setPutsData(puts);
        });

        Socket.on("spyCandles", (d) => {
            console.log("first spyCandles", d);
            setCandleData(d);
        });
        Socket.emit("getSpyCandles");

        return () => {
            Socket.off("spyOptionSnaps");
            Socket.off("spyCandles");
        };
    }, []);

    useEffect(() => {
        // Set first expiration as default if not already set
        if (!selectedExpiration && callsData && putsData) {
            const firstExp = Object.keys(callsData)[0];
            setSelectedExpiration(firstExp);
        }
    }, [selectedExpiration, callsData, putsData]);

    const getExpirationDates = () => {
        if (!callsData && !putsData) return [];
        const callExps = callsData ? Object.keys(callsData) : [];
        const putExps = putsData ? Object.keys(putsData) : [];
        // Combine and dedupe expiration dates
        const allExps = [...new Set([...callExps, ...putExps])];
        return allExps.sort();
    };

    const formatExpiration = (expKey) => {
        const [date, days] = expKey.split(":");
        const dateObj = new Date(date);
        const estObj = eastCoastTime(date);

        const monthShort = dateObj.toLocaleDateString("en-US", { month: "short" });
        const day = estObj.date;
        return `${monthShort} ${day} (${days}d)`;
    };

    const getCurrentCallsData = () => {
        if (!callsData || !selectedExpiration) return {};
        return callsData[selectedExpiration] || {};
    };

    const getCurrentPutsData = () => {
        if (!putsData || !selectedExpiration) return {};
        return putsData[selectedExpiration] || {};
    };

    const getStrikePrices = () => {
        const callsCurrentData = getCurrentCallsData();
        const putsCurrentData = getCurrentPutsData();

        // Combine strike prices from both calls and puts
        const callStrikes = Object.keys(callsCurrentData).map(Number);
        const putStrikes = Object.keys(putsCurrentData).map(Number);
        const allStrikes = [...new Set([...callStrikes, ...putStrikes])];

        return allStrikes.sort((a, b) => b - a);
    };

    const formatPrice = (price) => {
        if (price === null || price === undefined) return "-";
        return price.toFixed(2);
    };

    const formatVolume = (volume) => {
        if (!volume) return "-";
        if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
        if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
        return volume.toString();
    };

    const formatPercent = (percent) => {
        if (percent === null || percent === undefined) return "-";
        const sign = percent >= 0 ? "+" : "";
        return `${sign}${percent.toFixed(2)}%`;
    };

    return (
        <Container>
            {/* Chart Placeholder */}
            {/* <ChartPlaceholder>
                <ChartTitle>SPY Chart Placeholder</ChartTitle>
                <ChartSubtitle>Real-time price chart will go here</ChartSubtitle>
            </ChartPlaceholder> */}
            <SpyChart candleData={candleData.spy1MinData} height={500} />

            {/* Expiration Tabs */}
            <TabsContainer>
                <TabsList>
                    {getExpirationDates().map((expKey) => (
                        <Tab key={expKey} active={selectedExpiration === expKey} onClick={() => setSelectedExpiration(expKey)}>
                            {formatExpiration(expKey)}
                        </Tab>
                    ))}
                </TabsList>
            </TabsContainer>

            {/* Options Chain */}
            <OptionsChainContainer>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <tr>
                                {/* PUT Headers */}
                                <TableHeader style={{ textAlign: "right" }}>Change</TableHeader>
                                {/* <TableHeader style={{ textAlign: "right" }}>Delta</TableHeader> */}
                                {/* <TableHeader style={{ textAlign: "right" }}>IV</TableHeader> */}
                                <TableHeader style={{ textAlign: "right" }}>OI</TableHeader>
                                <TableHeader style={{ textAlign: "right" }}>Volume</TableHeader>
                                <TableHeader style={{ textAlign: "right" }}>Ask</TableHeader>
                                <TableHeader style={{ textAlign: "right" }}>Last</TableHeader>
                                <TableHeader style={{ textAlign: "right" }}>Bid</TableHeader>

                                {/* STRIKE Header */}
                                <TableHeader style={{ textAlign: "center", background: "#f0f0f0" }}>Strike</TableHeader>

                                {/* CALL Headers */}
                                <TableHeader>Bid</TableHeader>
                                <TableHeader>Last</TableHeader>
                                <TableHeader>Ask</TableHeader>
                                <TableHeader>Volume</TableHeader>
                                <TableHeader>OI</TableHeader>
                                {/* <TableHeader>IV</TableHeader> */}
                                {/* <TableHeader>Delta</TableHeader> */}
                                <TableHeader>Change</TableHeader>
                            </tr>
                        </TableHead>
                        <TableBody>
                            {getStrikePrices().map((strike, index) => {
                                const callData = getCurrentCallsData()[strike.toFixed(1)];
                                const putData = getCurrentPutsData()[strike.toFixed(1)];

                                const callOption = callData?.[0];
                                const putOption = putData?.[0];

                                const putLvl2 = putOption?.symbol ? lvl2Data[putOption.symbol] : null;
                                const callLvl2 = callOption?.symbol ? lvl2Data[callOption.symbol] : null;

                                // Check if we need to insert underlying here
                                const shouldShowUnderlying = underlyingData && strike >= underlyingData.last && (index === getStrikePrices().length - 1 || getStrikePrices()[index + 1] < underlyingData.last);

                                return (
                                    <React.Fragment key={strike}>
                                        <TableRow>
                                            {/* PUT Data (right-aligned) */}
                                            <PutChangeCell positive={putOption?.percentChange >= 0}>{putOption ? formatPercent(putOption.percentChange) : "-"}</PutChangeCell>
                                            {/* <PutCell>{putOption?.delta ? putOption.delta.toFixed(3) : "-"}</PutCell> */}
                                            {/* <PutCell>{putOption?.volatility ? `${putOption.volatility.toFixed(1)}%` : "-"}</PutCell> */}
                                            <PutCell>{putOption ? formatVolume(putOption.openInterest) : "-"}</PutCell>
                                            <PutCell>{putOption ? formatVolume(putOption.totalVolume) : "-"}</PutCell>
                                            {/* UPDATED PUT ASK CELL */}
                                            <PutCell>
                                                {putOption ? formatPrice(putOption.ask) : "-"}
                                                {putLvl2?.askSideLevels?.[0] && <Lvl2Text>@{putLvl2.askSideLevels[0].size}</Lvl2Text>}
                                            </PutCell>{" "}
                                            <PutCell style={{ fontWeight: 500 }}>{putOption ? formatPrice(putOption.last) : "-"}</PutCell>
                                            {/* UPDATED PUT BID CELL */}
                                            <PutCell>
                                                {putOption ? formatPrice(putOption.bid) : "-"}
                                                {putLvl2?.bidSideLevels?.[0] && <Lvl2Text>@{putLvl2.bidSideLevels[0].size}</Lvl2Text>}
                                            </PutCell>
                                            {/* STRIKE (center) */}
                                            <StrikeCellCenter>{strike.toFixed(0)}</StrikeCellCenter>
                                            {/* CALL Data (left-aligned) */}
                                            {/* UPDATED CALL BID CELL */}
                                            <CallCell>
                                                {callOption ? formatPrice(callOption.bid) : "-"}
                                                {callLvl2?.bidSideLevels?.[0] && <Lvl2Text>@{callLvl2.bidSideLevels[0].size}</Lvl2Text>}
                                            </CallCell>{" "}
                                            <CallCell style={{ fontWeight: 500 }}>{callOption ? formatPrice(callOption.last) : "-"}</CallCell>
                                            {/* UPDATED CALL ASK CELL */}
                                            <CallCell>
                                                {callOption ? formatPrice(callOption.ask) : "-"}
                                                {callLvl2?.askSideLevels?.[0] && <Lvl2Text>@{callLvl2.askSideLevels[0].size}</Lvl2Text>}
                                            </CallCell>{" "}
                                            <CallCell>{callOption ? formatVolume(callOption.totalVolume) : "-"}</CallCell>
                                            <CallCell>{callOption ? formatVolume(callOption.openInterest) : "-"}</CallCell>
                                            {/* <CallCell>{callOption?.volatility ? `${callOption.volatility.toFixed(1)}%` : "-"}</CallCell> */}
                                            {/* <CallCell>{callOption?.delta ? callOption.delta.toFixed(3) : "-"}</CallCell> */}
                                            <CallChangeCell positive={callOption?.percentChange >= 0}>{callOption ? formatPercent(callOption.percentChange) : "-"}</CallChangeCell>
                                        </TableRow>

                                        {/* Insert underlying after this row if needed */}
                                        {shouldShowUnderlying && <UnderlyingElement underlyingData={underlyingData} />}
                                    </React.Fragment>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </OptionsChainContainer>

            {/* Summary Stats */}
            {/* <SummaryGrid>
                <SummaryCard>
                    <SummaryLabel>Total Volume</SummaryLabel>
                    <SummaryValue>
                        {formatVolume(
                            getStrikePrices().reduce((sum, strike) => {
                                const callOption = getCurrentCallsData()[strike.toFixed(1)]?.[0];
                                const putOption = getCurrentPutsData()[strike.toFixed(1)]?.[0];
                                return sum + (callOption?.totalVolume || 0) + (putOption?.totalVolume || 0);
                            }, 0)
                        )}
                    </SummaryValue>
                </SummaryCard>
                <SummaryCard>
                    <SummaryLabel>Total OI</SummaryLabel>
                    <SummaryValue>
                        {formatVolume(
                            getStrikePrices().reduce((sum, strike) => {
                                const callOption = getCurrentCallsData()[strike.toFixed(1)]?.[0];
                                const putOption = getCurrentPutsData()[strike.toFixed(1)]?.[0];
                                return sum + (callOption?.openInterest || 0) + (putOption?.openInterest || 0);
                            }, 0)
                        )}
                    </SummaryValue>
                </SummaryCard>
                <SummaryCard>
                    <SummaryLabel>Strikes</SummaryLabel>
                    <SummaryValue>{getStrikePrices().length}</SummaryValue>
                </SummaryCard>
                <SummaryCard>
                    <SummaryLabel>Expiration</SummaryLabel>
                    <SummaryValueSmall>{selectedExpiration ? formatExpiration(selectedExpiration) : "-"}</SummaryValueSmall>
                </SummaryCard>
            </SummaryGrid> */}
        </Container>
    );
}
