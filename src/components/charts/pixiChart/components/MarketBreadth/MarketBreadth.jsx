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
        if (!tick || !pixiDataRef.current) return;
        // const lastBar = pixiDataRef.current.ohlcDatas.slice(-1)[0];
        const lastVolume = lastTotalVolumeRef.current || tick.totalVolume;
        tick.volume = tick.totalVolume - lastVolume;
        tick.totalVol = tick.totalVolume;
        tick.lastPrice = tick.last;

        pixiDataRef.current.setNewBar(tick);
        pixiDataRef.current.updateCurrentPriceLabel(tick.lastPrice);
        lastTotalVolumeRef.current = tick.totalVolume;

        if (candleData && pixiDataRef.current) {
            // const monteCarlo = new MonteCarloCone(pixiDataRef, candleData);
            // const results = monteCarlo.updateSimulation();
            // monteCarlo.drawHistogramHeatmap();

            // Register for redraws
            // pixiDataRef.current.registerDrawFn("drawHistogramHeatmap", monteCarlo.drawHistogramHeatmap.bind(monteCarlo));

            return () => {
                // pixiDataRef.current?.unregisterDrawFn("drawHistogramHeatmap");
                // monteCarlo.cleanup();
            };
        }
    }, [tick, pixiDataRef.current]);

    // useEffect(() => {
    //     if (!pixiDataRef.current || !spyLevelOne) return;
    //     // pixiDataRef.current.newTick(spyLevelOne);
    //     // setLastSpyLevelOne(spyLevelOne);
    // }, [spyLevelOne, pixiDataRef.current]);

    //     useEffect(() => {
    //     if (!pixiDataRef.current || !spyLevelOne) return;
    //     // pixiDataRef.current.newTick(spyLevelOne);
    //     setLastSpyLevelOne(spyLevelOne);
    // }, [tick, pixiDataRef.current]);

    useEffect(() => {
        console.log("MarketBreadth loaded");
        fetchData({ limit: 2000, sort: { _id: -1 }, filter: {} });

        Socket.on("market-breadth", (data) => {
            debugger;
            console.log("market-breadth", data);
            const datetime = new Date().getTime();
            // Object.keys(breadthKeys).forEach((key) => {
            //     const tick = { datetime, value: data[key] };
            //     candleData[key].push(tick);
            //     pixiDataRef.current.setNewBar(tick);
            //     pixiDataRef.current.updateCurrentPriceLabel(tick.value);
            // });
            // setCandleData({ ...candleData });
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
                            ...Object.keys(breadthKeys).map((key) => ({
                                lineColor: breadthKeys[key].color,
                                name: key,
                                type: "line",
                                lineKey: key,
                                xKey: "datetime",
                            })),
                            // { lineColor: 0x44ef44, name: "$NDX", type: "line", lineKey: "$NDX", xKey: "datetime" },
                            // { lineColor: 0x11ff11, name: "$TRIN", type: "line", lineKey: "$TRIN", xKey: "datetime" },
                            // { lineColor: 0xff1111, name: "avgTRIN", type: "line", lineKey: "avgTRIN", xKey: "datetime" },
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
