import React, { useState, useEffect, useRef } from "react";
import GenericPixiChart from "../../../GenericPixiChart";
import drawStrikes from "./drawStrikes";
import MonteCarloCone from "./monteCarloSimulation";
import TimeframeSelector from "./spyOptionsComponents/TimeframeSelector";
import IndicatorSelector from "../../../reusableChartComponents/IndicatorSelector";
const SpyChart = (props) => {
    const {
        // width,
        height,
        symbol = "SPY",
        Socket,
        fullSymbolRef,
        spyLevelOne,
        getCurrentStrikeData,
        callsOrPuts,
        callsData,
        putsData,
        underlyingData,
        lvl2Data,
    } = props;

    // Default bar type and period for GenericPixiChart
    const barType = { value: 2, name: "Minutes" };
    const barTypePeriod = 1;
    const tickSize = 0.01;

    const pixiDataRef = useRef();

    const [candleData, setCandleData] = useState({});
    //TODO add a way to toggle the 5 min data?   Set to 1 minute
    const [timeframe, setTimeframe] = useState("spy1MinData");

    const [lastSpyLevelOne, setLastSpyLevelOne] = useState(null);
    const [newSpyMinuteBar, setNewSpyMinuteBar] = useState(null);

    const [indicators, setIndicators] = useState([
        { id: "monteCarlo", name: "Monte Carlo", enabled: false, drawFunctionKey: "drawHistogramHeatmap", instanceRef: null },
        { id: "strikes", name: "Strike Lines", enabled: false, drawFunctionKey: "drawAllStrikeLines", instanceRef: null },
    ]);

    const toggleIndicator = (id) => {
        setIndicators((prevIndicators) =>
            prevIndicators.map((indicator) => (indicator.id === id ? { ...indicator, enabled: !indicator.enabled } : indicator))
        );
    };

    useEffect(() => {
        const monteCarloIndicator = indicators.find((ind) => ind.id === "monteCarlo");
        if (!monteCarloIndicator) return; // Should not happen if initialized correctly

        if (!newSpyMinuteBar || !pixiDataRef.current) return;
        pixiDataRef.current.setNewBar(newSpyMinuteBar);

        if (monteCarloIndicator.enabled && candleData && pixiDataRef.current) {
            const monteCarlo = new MonteCarloCone(pixiDataRef, candleData);
            const results = monteCarlo.updateSimulation();
            // monteCarlo.drawHistogramHeatmap();

            // Update instanceRef in state
            setIndicators((prevIndicators) =>
                prevIndicators.map((ind) => (ind.id === "monteCarlo" ? { ...ind, instanceRef: monteCarlo } : ind))
            );

            pixiDataRef.current.registerDrawFn(monteCarloIndicator.drawFunctionKey, monteCarlo.drawHistogramHeatmap.bind(monteCarlo));

            return () => {
                pixiDataRef.current?.unregisterDrawFn(monteCarloIndicator.drawFunctionKey);
                // Use the instanceRef for cleanup if it exists
                const currentMonteCarloInstance = indicators.find((ind) => ind.id === "monteCarlo")?.instanceRef;
                if (currentMonteCarloInstance && currentMonteCarloInstance.cleanup) {
                    currentMonteCarloInstance.cleanup();
                }
                // Clear instanceRef in state on cleanup
                setIndicators((prevIndicators) =>
                    prevIndicators.map((ind) => (ind.id === "monteCarlo" ? { ...ind, instanceRef: null } : ind))
                );
            };
        } else if (!monteCarloIndicator.enabled) {
            // If disabled, ensure it's cleaned up
            pixiDataRef.current?.unregisterDrawFn(monteCarloIndicator.drawFunctionKey);
            const currentMonteCarloInstance = indicators.find((ind) => ind.id === "monteCarlo")?.instanceRef;
            if (currentMonteCarloInstance && currentMonteCarloInstance.cleanup) {
                currentMonteCarloInstance.cleanup();
            }
            // Clear instanceRef in state
            setIndicators((prevIndicators) => prevIndicators.map((ind) => (ind.id === "monteCarlo" ? { ...ind, instanceRef: null } : ind)));
        }
    }, [newSpyMinuteBar, pixiDataRef.current, candleData]);

    useEffect(() => {
        if (!pixiDataRef.current || !spyLevelOne) return;
        const volume = spyLevelOne.totalVol - (lastSpyLevelOne ? lastSpyLevelOne.totalVol : 0);
        spyLevelOne.volume = volume;
        pixiDataRef.current.newTick(spyLevelOne);
        setLastSpyLevelOne(spyLevelOne);
    }, [spyLevelOne, pixiDataRef.current]);

    useEffect(() => {
        console.log("spychart loaded");
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
            Socket.off("newSpyMinuteBar");
        };
    }, []);

    useEffect(() => {
        console.log(timeframe);
    }, [timeframe]);

    // useEffect(() => {
    //     if (!candleData[timeframe]) {
    //         console.log("no data");
    //         Socket.emit("getSpyCandles");
    //     }
    // }, [candleData[timeframe]]);

    useEffect(() => {
        const strikesIndicator = indicators.find((ind) => ind.id === "strikes");
        if (!strikesIndicator) return; // Should not happen if initialized correctly

        if (!getCurrentStrikeData || !pixiDataRef.current || !spyLevelOne?.lastPrice) return;

        if (strikesIndicator.enabled) {
            const data = getCurrentStrikeData();
            const spyPrice = spyLevelOne.lastPrice;
            const strikes = new drawStrikes(data, pixiDataRef, callsOrPuts, spyPrice);
            strikes.drawAllStrikeLines();

            // Update instanceRef in state
            setIndicators((prevIndicators) => prevIndicators.map((ind) => (ind.id === "strikes" ? { ...ind, instanceRef: strikes } : ind)));

            pixiDataRef.current.registerDrawFn(strikesIndicator.drawFunctionKey, strikes.drawAllStrikeLines.bind(strikes));

            return () => {
                pixiDataRef.current?.unregisterDrawFn(strikesIndicator.drawFunctionKey);
                const currentStrikesInstance = indicators.find((ind) => ind.id === "strikes")?.instanceRef;
                if (currentStrikesInstance && currentStrikesInstance.cleanup) {
                    currentStrikesInstance.cleanup();
                }
                // Clear instanceRef in state on cleanup
                setIndicators((prevIndicators) =>
                    prevIndicators.map((ind) => (ind.id === "strikes" ? { ...ind, instanceRef: null } : ind))
                );
            };
        } else if (!strikesIndicator.enabled) {
            // If disabled, ensure it's cleaned up
            pixiDataRef.current?.unregisterDrawFn(strikesIndicator.drawFunctionKey);
            const currentStrikesInstance = indicators.find((ind) => ind.id === "strikes")?.instanceRef;
            if (currentStrikesInstance && currentStrikesInstance.cleanup) {
                currentStrikesInstance.cleanup();
            }
            // Clear instanceRef in state
            setIndicators((prevIndicators) => prevIndicators.map((ind) => (ind.id === "strikes" ? { ...ind, instanceRef: null } : ind)));
        }
    }, [pixiDataRef.current, callsOrPuts, callsData, putsData, spyLevelOne]);

    // if (!candleData[timeframe]?.length) {
    //     return <div>Loading... {timeframe}</div>;
    // }

    return (
        <>
            <TimeframeSelector setTimeframe={setTimeframe} timeframe={timeframe} />
            <IndicatorSelector indicators={indicators} toggleIndicator={toggleIndicator} />
            {!candleData[timeframe]?.length ? (
                <div>Loading... {timeframe}</div>
            ) : (
                <GenericPixiChart
                    key={timeframe}
                    ohlcDatas={candleData[timeframe]}
                    height={height}
                    symbol={symbol}
                    fullSymbolRef={fullSymbolRef}
                    barType={barType}
                    barTypePeriod={barTypePeriod}
                    // loadData={loadData}
                    pixiDataRef={pixiDataRef}
                    tickSize={tickSize}
                />
            )}
        </>
    );
};

export default SpyChart;
