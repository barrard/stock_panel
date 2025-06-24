import React, { useState, useEffect, useRef } from "react";
import GenericPixiChart from "../../../GenericPixiChart";
import API from "../../../../API";
// import drawStrikes from "./drawStrikes";
// import MonteCarloCone from "./monteCarloSimulation";
const OptionContractChart = (props) => {
    const {
        width = 800,
        height = 600,
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

    const [candleData, setCandleData] = useState({ "4Seconds": [] });
    //TODO add a way to toggle the 5 min data?   Set to 1 minute
    const [timeframe, setTimeframe] = useState("4Seconds");

    const [lastSpyLevelOne, setLastSpyLevelOne] = useState(null);
    const [newSpyMinuteBar, setNewSpyMinuteBar] = useState(null);

    const fetchData = async (opts = {}) => {
        const data = await API.fetchOptionContractData(opts);
        console.log(data);
        const cleanSnaps = data
            .sort((a, b) => a.timestamp - b.timestamp)
            .map((snap, iSnap) => {
                let lastSnap = data[iSnap - 1];
                if (iSnap == 0) {
                    lastSnap = snap;
                }
                let volume = snap.totalVolume - lastSnap.totalVolume;
                return {
                    ...snap,
                    volume,
                };
            });
        candleData["4Seconds"] = cleanSnaps;
        setCandleData({ ...candleData });
    };

    useEffect(() => {
        if (!tick || !pixiDataRef.current) return;

        const lastBar = pixiDataRef.current.ohlcDatas.slice(-1)[0];
        tick.volume = tick.totalVolume - lastBar.totalVolume;

        pixiDataRef.current.setNewBar(tick);

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

    useEffect(() => {
        if (!pixiDataRef.current || !spyLevelOne) return;
        // pixiDataRef.current.newTick(spyLevelOne);
        setLastSpyLevelOne(spyLevelOne);
    }, [spyLevelOne, pixiDataRef.current]);

    //     useEffect(() => {
    //     if (!pixiDataRef.current || !spyLevelOne) return;
    //     // pixiDataRef.current.newTick(spyLevelOne);
    //     setLastSpyLevelOne(spyLevelOne);
    // }, [tick, pixiDataRef.current]);

    useEffect(() => {
        console.log("spyOptionContractChart loaded");
        fetchData({ putCall, strike, symbol, exp });
    }, []);

    // useEffect(() => {
    //     if (!candleData[timeframe]) {
    //         console.log("no data");
    //         Socket.emit("getSpyCandles");
    //     }
    // }, [candleData[timeframe]]);

    if (!candleData[timeframe]?.length) {
        return <div>Loading... {timeframe}</div>;
    }
    return (
        <GenericPixiChart
            ohlcDatas={candleData[timeframe]}
            width={width}
            height={height}
            symbol={symbol}
            fullSymbolRef={fullSymbolRef}
            barType={barType}
            barTypePeriod={barTypePeriod}
            // loadData={loadData}
            pixiDataRef={pixiDataRef}
            tickSize={tickSize}
            options={{ chartType: "line", lineKey: "last", xKey: "timestamp" }}
            lowerIndicators={[
                { lineColor: 0xef4444, name: "askSize", type: "line", lineKey: "askSize", xKey: "timestamp" },
                { lineColor: 0x11ff11, name: "bidSize", type: "line", lineKey: "bidSize", xKey: "timestamp" },
                { lineColor: 0x3b82f6, name: "gamma", type: "line", lineKey: "gamma", xKey: "timestamp" },
                { lineColor: 0x6b7280, name: "delta", type: "line", lineKey: "delta", xKey: "timestamp" },
                { lineColor: 0x3b82f6, name: "rho", type: "line", lineKey: "rho", xKey: "timestamp" },
                { lineColor: 0xf59e0b, name: "vega", type: "line", lineKey: "vega", xKey: "timestamp" },
                { lineColor: 0x8b5cf6, name: "volatility", type: "line", lineKey: "volatility", xKey: "timestamp" },
            ]}
        />
    );
};

export default OptionContractChart;
