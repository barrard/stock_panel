import React, { useState, useEffect, useRef } from "react";
import GenericPixiChart from "../../../GenericPixiChart";
import API from "../../../../API";
// import drawStrikes from "./drawStrikes";
// import MonteCarloCone from "./monteCarloSimulation";

const breadthKeys = {
    $ADVN: { color: 0x1abc9c },
    $COMPX: { color: 0x3498db },
    $DECN: { color: 0x9b59b6 },
    $DJC: { color: 0xe67e22 },
    $DJI: { color: 0xe74c3c },
    $DJT: { color: 0xf1c40f },
    $DVOL: { color: 0x2ecc71 },
    $GDMOC: { color: 0x16a085 },
    $NDX: { color: 0x2980b9 },
    $NYA: { color: 0x8e44ad },
    $OEX: { color: 0xd35400 },
    $R25I: { color: 0xc0392b },
    $RUI: { color: 0xf39c12 },
    $RUT: { color: 0x27ae60 },
    $UVOL: { color: 0x2f3e50 },
    $VIX: { color: 0x95a5a6 },

    // avgTICK: {
    //     ticks: 0.01,
    // },
    // avgTRIN: {
    //     ticks: 0.01,
    // },

    // $TICK: {
    //     ticks: 0.01,
    // },

    // $TRIN: {
    //     ticks: 0.01,
    // },

    // $SPX: {
    //     ticks: 0.01,
    // },
    // tick: {
    //     ticks: 0.01,
    // },
    // trin: {
    //     ticks: 0.01,
    // },
};
const MarketBreadth = (props) => {
    const {
        // width = 800,
        height = 60,
        symbol = "SPY",
        Socket,
        fullSymbolRef,
        spyLevelOne,
        strike,
        putCall,
        exp,
        getCurrentStrikeData,
        callsOrPuts,
        tick,
        // ...rest
    } = props;

    // Default bar type and period for GenericPixiChart
    const barType = { value: 2, name: "Minutes" };
    const barTypePeriod = 1;
    const tickSize = 0.01;

    // const pixiApplicationRef = useRef();
    const pixiDataRef = useRef();

    const lastTotalVolumeRef = useRef();

    const [candleData, setCandleData] = useState({});
    //TODO add a way to toggle the 5 min data?   Set to 1 minute
    // const [timeframe, setTimeframe] = useState("4Seconds");

    const [lastSpyLevelOne, setLastSpyLevelOne] = useState(null);
    const [newSpyMinuteBar, setNewSpyMinuteBar] = useState(null);

    const fetchData = async (opts = {}) => {
        const data = await API.fetchMarketBreadth(opts);
        console.log(data);

        setCandleData(data);
    };

    useEffect(() => {
        console.log("MarketBreadth loaded");
        fetchData({ limit: 2000, sort: { _id: -1 }, filter: {} });

        Socket.on("market-breadth", (data) => {
            console.log("market-breadth", data);
            if (!pixiDataRef.current) return;

            const datetime = new Date().getTime();

            // Create a new data point with all breadth values
            const newDataPoint = {
                datetime,
                ...data, // Spread all the breadth data ($SPX, $NDX, etc.)
            };

            // Update the chart with the new data point
            // The setNewBar method adds the data point to pixiDataRef.current.ohlcDatas
            pixiDataRef.current.setNewBar(newDataPoint);

            // Update the current price label with the main symbol value
            if (data[key]) {
                pixiDataRef.current.updateCurrentPriceLabel(data[key]);
            }
        });

        return () => {
            Socket.off("market-breadth");
        };
    }, []);

    if (!candleData?.length) {
        return <div>Loading... </div>;
    }
    let key = "$SPX";
    return (
        <>
            <div className="row w-100 ">
                {/* {Object.keys(breadthKeys).map((key) => ( */}
                <div style={{ border: "1px solid white" }} className="col-12  border-white" key={key}>
                    <GenericPixiChart
                        ohlcDatas={candleData}
                        // width={100}
                        height={50}
                        symbol={key}
                        fullSymbolRef={fullSymbolRef}
                        barType={barType}
                        barTypePeriod={barTypePeriod}
                        // loadData={loadData}
                        pixiDataRef={pixiDataRef}
                        tickSize={1}
                        lowerIndicators={[
                            ...Object.keys(breadthKeys)
                                .filter((key) => key !== "$DVOL" && key !== "$UVOL" && key !== "$GDMOC") // Exclude these from individual indicators
                                .map((key) => ({
                                    lineColor: breadthKeys[key].color,
                                    name: key,
                                    type: "line",
                                    lineKey: key,
                                    xKey: "datetime",
                                })),
                            {
                                name: "Volume",
                                type: "multi-line",
                                lines: [
                                    { lineColor: breadthKeys.$DVOL.color, lineKey: "$DVOL", lineWidth: 2 },
                                    { lineColor: breadthKeys.$UVOL.color, lineKey: "$UVOL", lineWidth: 2 },
                                ],
                            },
                            {
                                name: "TICK",
                                type: "multi-line",
                                lines: [
                                    { lineColor: 0xef4444, lineKey: "$TICK" },
                                    { lineColor: 0x44ef44, lineKey: "avgTICK" },
                                ],
                            },

                            {
                                name: "TRIN",
                                type: "multi-line",
                                height: 80,
                                lines: [
                                    { lineColor: 0x11ff11, lineKey: "$TRIN", lineWidth: 1 },
                                    { lineColor: 0xff1111, lineKey: "avgTRIN", lineWidth: 2 },
                                ],
                            },
                        ]}
                        options={{
                            withoutVolume: true,
                            chartType: "line",
                            lineKey: key,
                            xKey: "datetime",
                            lineColor: 0xffa500,
                        }}
                        margin={{ top: 0, right: 50, left: 0, bottom: 15 }}
                    />
                </div>
                {/* ))} */}
            </div>
        </>
    );
};

export default MarketBreadth;
