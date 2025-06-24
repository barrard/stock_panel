import React, { useState, useEffect, useCallback } from "react";
import { eastCoastTime } from "../../../../../indicators/indicatorHelpers/IsMarketOpen";
import SpyChart from "./SpyChart";
import { timeScaleValues, priceScaleValues, compileOrders, currencyFormatter } from "../utils.js";
import CallsPutsToggle from "./CallsOrPutsToggle";
import {
    Container,
    TabsContainer,
    TabsList,
    Tab,
    OptionsChainContainer,
    TableContainer,
    Table,
    TableHead,
    TableHeader,
    TableBody,
    UnderlyingContainer,
    UnderlyingPrice,
    UnderlyingStats,
    UnderlyingStat,
} from "./spyOptionsComponents/styledComponents";

import TableRowEl from "./spyOptionsComponents/TableRowEl";

function UnderlyingElement({ underlyingData }) {
    const { netPercentChange, netChange, highPrice, lowPrice, lastPrice, openPrice } = underlyingData;
    const roundedNetPercentChange = netPercentChange?.toFixed(2);
    return (
        <tr>
            <td colSpan="17" style={{ padding: 0, position: "relative" }}>
                <UnderlyingContainer>
                    <UnderlyingStats>
                        <UnderlyingStat>
                            <div className="label">H</div>
                            <div className="value">{currencyFormatter.format(highPrice)}</div>
                        </UnderlyingStat>
                        <UnderlyingStat>
                            <div className="label">O</div>
                            <div className="value">{currencyFormatter.format(openPrice)}</div>
                        </UnderlyingStat>
                        <UnderlyingPrice>{currencyFormatter.format(lastPrice)}</UnderlyingPrice>
                        <UnderlyingStat>
                            <div className="label">L</div>
                            <div className="value">{currencyFormatter.format(lowPrice)}</div>
                        </UnderlyingStat>
                        <UnderlyingStat>
                            <div className="label">Δ</div>
                            <div className="value">
                                {netPercentChange > 0 ? "+" : "-"}
                                {currencyFormatter.format(netChange)}
                                {` (${roundedNetPercentChange}%)`}
                            </div>
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
    const [callsOrPuts, setCallsOrPuts] = useState("CALLS");
    const [selectedExpiration, setSelectedExpiration] = useState(null);
    const [underlyingData, setUnderlyingData] = useState(null);
    const [lvl2Data, setLvl2Data] = useState({});
    // const [chartInstance, setChartInstance] = useState(null);
    const [spyLevelOne, setSpyLevelOne] = useState(null);

    useEffect(() => {
        Socket.on("spyOptionSnaps", (d) => {
            const calls = d?.callExpDateMap;
            const puts = d?.putExpDateMap;
            const underlying = d?.underlying;
            const lvl2 = d?.lvl2Data;
            // console.log(lvl2);
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

            setCallsData(calls);
            setPutsData(puts);
        });

        Socket.on("spyLevelOne", (d) => {
            setSpyLevelOne(d);
        });

        return () => {
            Socket.off("spyOptionSnaps");
            Socket.off("spyLevelOne");
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

    //get list of strikeprices and current price
    // function getCurrentStrikeData() {
    //     const callsCurrentData = getCurrentCallsData();
    //     const putsCurrentData = getCurrentPutsData();
    //     return {
    //         callsCurrentData,
    //         putsCurrentData,
    //     };
    // }

    const getCurrentStrikeData = useCallback(() => {
        const callsCurrentData = getCurrentCallsData();
        const putsCurrentData = getCurrentPutsData();

        return {
            callsCurrentData,
            putsCurrentData,
        };
    }, [callsData, selectedExpiration, putsData, callsOrPuts]);

    // console.log(getCurrentPutsData());
    const spyChartData = {
        // candleData: candleData.spy1MinData,
        height: 500,
        width: 600,
        spyLevelOne,
        Socket,
        getCurrentStrikeData,
        callsOrPuts,
        callsData,
        putsData,
        underlyingData,
        lvl2Data,
    };

    return (
        <Container>
            {/* Chart Placeholder */}
            {/* <ChartPlaceholder>
                <ChartTitle>SPY Chart Placeholder</ChartTitle>
                <ChartSubtitle>Real-time price chart will go here</ChartSubtitle>
            </ChartPlaceholder> */}

            <CallsPutsToggle callsOrPuts={callsOrPuts} setCallsOrPuts={setCallsOrPuts} />
            <SpyChart {...spyChartData} />
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
                                const within5 = Math.abs(strike - spyLevelOne?.lastPrice) <= 5;
                                if (!within5) return <></>;
                                const callData = getCurrentCallsData()[strike.toFixed(1)];
                                const putData = getCurrentPutsData()[strike.toFixed(1)];

                                const callOption = callData?.[0];
                                const putOption = putData?.[0];

                                const putLvl2 = putOption?.symbol ? lvl2Data[putOption.symbol] : null;
                                const callLvl2 = callOption?.symbol ? lvl2Data[callOption.symbol] : null;

                                // Check if we need to insert underlying here
                                const shouldShowUnderlying =
                                    spyLevelOne &&
                                    strike >= spyLevelOne.lastPrice &&
                                    (index === getStrikePrices().length - 1 || getStrikePrices()[index + 1] < spyLevelOne.lastPrice);

                                return (
                                    <React.Fragment key={strike}>
                                        <TableRowEl
                                            // callData={callData}
                                            // putData={putData}
                                            putOption={putOption}
                                            callOption={callOption}
                                            putLvl2={putLvl2}
                                            callLvl2={callLvl2}
                                            strike={strike}
                                            spyLevelOne={spyLevelOne}
                                            Socket={Socket}
                                            exp={selectedExpiration.split(":")[0]}
                                        />

                                        {/* Insert underlying after this row if needed */}
                                        {shouldShowUnderlying && (
                                            //<UnderlyingElement underlyingData={spyLevelOne} />
                                            <React.Fragment key="underlying-chart-section">
                                                {/* // <TableRow> */}
                                                {/* <td colSpan="10" style={{ padding: 0, border: "none" }}> */}
                                                <UnderlyingElement underlyingData={spyLevelOne} />

                                                {/* </td> */}
                                                {/* // </TableRow> */}
                                            </React.Fragment>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </OptionsChainContainer>

            {/* 

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
*/}

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
