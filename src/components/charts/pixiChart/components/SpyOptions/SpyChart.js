import React, { useState, useEffect, useRef } from "react";
import GenericPixiChart from "../../../GenericPixiChart";
import drawStrikes from "./drawStrikes";
import MonteCarloCone from "./monteCarloSimulation";
const SpyChart = (props) => {
    const {
        width,
        height,
        symbol = "SPY",
        Socket,
        fullSymbolRef,
        spyLevelOne,
        getCurrentStrikeData,
        callsOrPuts,
        // ...rest
    } = props;

    // Default bar type and period for GenericPixiChart
    const barType = { value: 2, name: "Minutes" };
    const barTypePeriod = 1;
    const tickSize = 0.01;

    const pixiApplicationRef = useRef();
    const pixiDataRef = useRef();

    const [candleData, setCandleData] = useState({});
    //TODO add a way to toggle the 5 min data?   Set to 1 minute
    const [timeframe, setTimeframe] = useState("spy1MinData");

    const [lastSpyLevelOne, setLastSpyLevelOne] = useState(null);
    const [newSpyMinuteBar, setNewSpyMinuteBar] = useState({ open: 600, close: 600, high: 600, low: 600 });

    useEffect(() => {
        if (!newSpyMinuteBar || !pixiDataRef.current) return;
        pixiDataRef.current.setNewBar(newSpyMinuteBar);
        debugger;
        if (candleData && pixiDataRef.current) {
            const monteCarlo = new MonteCarloCone(pixiDataRef, candleData);
            monteCarlo.updateSimulation();
            monteCarlo.drawProbabilityHeatmap();

            // Register for redraws
            pixiDataRef.current.registerDrawFn("drawProbabilityHeatmap", monteCarlo.drawProbabilityHeatmap.bind(monteCarlo));

            return () => {
                pixiDataRef.current?.unregisterDrawFn("drawProbabilityHeatmap");
                monteCarlo.cleanup();
            };
        }
    }, [newSpyMinuteBar, pixiDataRef.current]);

    useEffect(() => {
        if (!pixiDataRef.current || !spyLevelOne) return;
        pixiDataRef.current.newTick(spyLevelOne);
        setLastSpyLevelOne(spyLevelOne);
    }, [spyLevelOne, pixiDataRef.current]);

    useEffect(() => {
        Socket.emit("getSpyCandles");
        Socket.on("spyCandles", (d) => {
            console.log("first spyCandles", d);
            // d[timeframe] = d[timeframe].slice(0, -418); // Drop last 400

            setCandleData(d);
        });

        Socket.on("newSpyMinuteBar", (d) => {
            setNewSpyMinuteBar(d);
        });
        return () => {
            Socket.off("spyCandles");
        };
    }, []);

    useEffect(() => {
        if (!getCurrentStrikeData || !pixiDataRef.current || !spyLevelOne?.lastPrice) return;
        const data = getCurrentStrikeData();

        const spyPrice = spyLevelOne.lastPrice;
        const strikes = new drawStrikes(data, pixiDataRef, callsOrPuts, spyPrice);
        strikes.drawAllStrikeLines();
        pixiDataRef.current.registerDrawFn("drawAllStrikeLines", strikes.drawAllStrikeLines.bind(strikes));
        return () => {
            // Unregister the draw function
            pixiDataRef.current?.unregisterDrawFn("drawAllStrikeLines");

            // Clean up the strikes instance
            if (strikes && strikes.cleanup) {
                strikes.cleanup();
            }
        };
    }, [getCurrentStrikeData, pixiDataRef.current, callsOrPuts]);

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
            pixiApplicationRef={pixiApplicationRef}
            // TouchGesture1Prop={TouchGesture1}
            // TouchGesture2Prop={TouchGesture2}
            // newSymbolTimerRefProp={newSymbolTimerRef}
            // loadDataRefProp={loadDataRef}
            // lastTradesRefProp={lastTradesRef}
            tickSize={tickSize}
            // {...rest}
        />
    );
};

export default SpyChart;
