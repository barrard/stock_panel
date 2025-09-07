import React, { useState, useEffect, useRef } from "react";
import GenericPixiChart from "../GenericPixiChart";
import DrawCombinedKeyLevels from "./DrawCombinedKeyLevels";
import DrawPivots from "./DrawPivots";
import IndicatorSelector from "../reusableChartComponents/IndicatorSelector";

const BackTestChartGeneric = (props) => {
    const { width, height, symbol = "ES", Socket, data } = props;

    // Default bar type and period for GenericPixiChart
    const barType = { value: 2, name: "Minutes" };
    const barTypePeriod = 1;
    const tickSize = 0.01;

    // const pixiApplicationRef = useRef();
    const pixiDataRef = useRef();

    const [candleData, setCandleData] = useState({});
    //TODO add a way to toggle the 5 min data?   Set to 1 minute
    // const [timeframe, setTimeframe] = useState("spy1MinData");

    const [lastSpyLevelOne, setLastSpyLevelOne] = useState(null);
    const [newSpyMinuteBar, setNewSpyMinuteBar] = useState(null);

    const combinedKeyLevelsRef = useRef(null);
    const pivotsRef = useRef(null);
    const [indicators, setIndicators] = useState([
        { id: "combinedKeyLevels", name: "CombinedKey Levels", enabled: true, drawFunctionKey: "drawAllCombinedLevels" },
        { id: "pivots", name: "Pivots", enabled: true, drawFunctionKey: "drawAllPivots" },
        // { id: "strikes", name: "Strike Lines", enabled: true, drawFunctionKey: "drawAllStrikeLines", instanceRef: null },
    ]);

    const toggleIndicator = (id) => {
        setIndicators((prevIndicators) =>
            prevIndicators.map((indicator) => (indicator.id === id ? { ...indicator, enabled: !indicator.enabled } : indicator))
        );
    };

    useEffect(() => {
        const indicatorConfig = indicators.find((ind) => ind.id === "combinedKeyLevels");
        if (!indicatorConfig || !pixiDataRef.current) return;

        const cleanup = () => {
            if (combinedKeyLevelsRef.current) {
                pixiDataRef.current?.unregisterDrawFn(indicatorConfig.drawFunctionKey);
                combinedKeyLevelsRef.current.cleanup();
                combinedKeyLevelsRef.current = null;
            }
        };

        if (indicatorConfig.enabled && data?.combinedKeyLevels?.length > 0) {
            cleanup(); // Clean up previous instance.

            const instance = new DrawCombinedKeyLevels(data.combinedKeyLevels, pixiDataRef);
            combinedKeyLevelsRef.current = instance;
            instance.drawAllCombinedLevels();

            pixiDataRef.current.registerDrawFn(
                indicatorConfig.drawFunctionKey,
                instance.drawAllCombinedLevels.bind(instance)
            );
        } else {
            cleanup(); // Clean up if disabled or no data.
        }
    }, [data?.combinedKeyLevels, indicators]);

    useEffect(() => {
        const indicatorConfig = indicators.find((ind) => ind.id === "pivots");
        if (!indicatorConfig || !pixiDataRef.current) return;

        const cleanup = () => {
            if (pivotsRef.current) {
                pixiDataRef.current?.unregisterDrawFn(indicatorConfig.drawFunctionKey);
                pivotsRef.current.cleanup();
                pivotsRef.current = null;
            }
        };

        if (indicatorConfig.enabled && data?.lastTwoDaysCompiled && data?.bars) {
            cleanup();

            const instance = new DrawPivots(data.lastTwoDaysCompiled, data.bars, pixiDataRef);
            pivotsRef.current = instance;
            instance.drawAllPivots();

            pixiDataRef.current.registerDrawFn(indicatorConfig.drawFunctionKey, instance.drawAllPivots.bind(instance));
        } else {
            cleanup();
        }
    }, [data?.lastTwoDaysCompiled, data?.bars, indicators]);

    useEffect(() => {
        debugger;
        if (data?.bars) {
            console.log(data);
            setCandleData(data);
        }
    }, [data]);

    // useEffect(() => {
    //     console.log(timeframe);
    // }, [timeframe]);

    // useEffect(() => {
    //     if (!candleData[timeframe]) {
    //         console.log("no data");
    //         Socket.emit("getSpyCandles");
    //     }
    // }, [candleData[timeframe]]);

    // useEffect(() => {
    //     const strikesIndicator = indicators.find((ind) => ind.id === "strikes");
    //     if (!strikesIndicator) return; // Should not happen if initialized correctly

    //     // if (!getCurrentStrikeData || !pixiDataRef.current || !spyLevelOne?.lastPrice) return;

    //     if (strikesIndicator.enabled) {
    //         // const data = getCurrentStrikeData();
    //         // const spyPrice = spyLevelOne.lastPrice;
    //         // const strikes = new drawStrikes(data, pixiDataRef, callsOrPuts, spyPrice);
    //         // strikes.drawAllStrikeLines();

    //         // Update instanceRef in state
    //         // setIndicators((prevIndicators) => prevIndicators.map((ind) => (ind.id === "strikes" ? { ...ind, instanceRef: strikes } : ind)));

    //         // pixiDataRef.current.registerDrawFn(strikesIndicator.drawFunctionKey, strikes.drawAllStrikeLines.bind(strikes));

    //         return () => {
    //             pixiDataRef.current?.unregisterDrawFn(strikesIndicator.drawFunctionKey);
    //             const currentStrikesInstance = indicators.find((ind) => ind.id === "strikes")?.instanceRef;
    //             if (currentStrikesInstance && currentStrikesInstance.cleanup) {
    //                 currentStrikesInstance.cleanup();
    //             }
    //             // Clear instanceRef in state on cleanup
    //             setIndicators((prevIndicators) =>
    //                 prevIndicators.map((ind) => (ind.id === "strikes" ? { ...ind, instanceRef: null } : ind))
    //             );
    //         };
    //     } else if (!strikesIndicator.enabled) {
    //         // If disabled, ensure it's cleaned up
    //         pixiDataRef.current?.unregisterDrawFn(strikesIndicator.drawFunctionKey);
    //         const currentStrikesInstance = indicators.find((ind) => ind.id === "strikes")?.instanceRef;
    //         if (currentStrikesInstance && currentStrikesInstance.cleanup) {
    //             currentStrikesInstance.cleanup();
    //         }
    //         // Clear instanceRef in state
    //         setIndicators((prevIndicators) => prevIndicators.map((ind) => (ind.id === "strikes" ? { ...ind, instanceRef: null } : ind)));
    //     }
    // }, [pixiDataRef.current, callsOrPuts, underlyingData, callsData, putsData, lvl2Data, getCurrentStrikeData, spyLevelOne]);

    // if (!candleData[timeframe]?.length) {
    //     return <div>Loading... {timeframe}</div>;
    // }

    return (
        <>
            <IndicatorSelector indicators={indicators} toggleIndicator={toggleIndicator} />

            {!candleData?.bars?.length ? (
                <div>Loading... {symbol}</div>
            ) : (
                <GenericPixiChart
                    key={symbol}
                    ohlcDatas={candleData.bars}
                    width={width}
                    height={height}
                    symbol={symbol}
                    barType={barType}
                    barTypePeriod={barTypePeriod}
                    pixiDataRef={pixiDataRef}
                    tickSize={tickSize}
                />
            )}
        </>
    );
};

export default BackTestChartGeneric;
