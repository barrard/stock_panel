import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import GenericPixiChart from "../../../GenericPixiChart";
import drawStrikes from "./drawStrikes";
import MonteCarloCone from "./monteCarloSimulation";
import TimeframeSelector from "./spyOptionsComponents/TimeframeSelector";
import IndicatorSelector from "../../../reusableChartComponents/IndicatorSelector";
import DrawMovingAverages from "../../../drawFunctions/DrawMovingAverages";
import DrawVWAP from "../../../drawFunctions/DrawVWAP";
import DrawExtremaAnalysis from "../../../drawFunctions/DrawExtremaAnalysis";
import { makeExtremaIndicator } from "../../../drawFunctions/extremaAnalysisConfig";
import { useIndicator } from "../../../hooks/useIndicator";

const ONE_MINUTE = 60 * 1000;

// Bar length behind each timeframe key, used to fold the live 1-minute stream into
// whatever the chart is currently showing.
const TIMEFRAME_MINUTES = {
    spy1MinData: 1,
    spy5MinData: 5,
    spy30MinData: 30,
    spy60MinData: 60,
};

/**
 * Roll the 1-minute bars covering `bucketStart` into a single bar. Bars are
 * start-labeled, so a minute belongs to the bucket it opens in - the same
 * floor-bucketing the server uses for its own aggregates.
 */
const buildBucket = (minuteBars, bucketStart, frameMs) => {
    const bars = minuteBars.filter((b) => b.datetime >= bucketStart && b.datetime < bucketStart + frameMs);
    if (!bars.length) return null;

    const first = bars[0];
    const last = bars[bars.length - 1];

    return {
        symbol: first.symbol || "SPY",
        datetime: bucketStart,
        // Only meaningful when the bucket's opening minute is actually present
        ...(first.datetime === bucketStart && first.timestamp ? { timestamp: first.timestamp } : {}),
        open: first.open,
        high: bars.reduce((max, b) => Math.max(max, b.high), -Infinity),
        low: bars.reduce((min, b) => Math.min(min, b.low), Infinity),
        close: last.close,
        volume: bars.reduce((sum, b) => sum + (Number(b.volume) || 0), 0),
    };
};

export const defaultSpyIndicators = [
    { id: "monteCarlo", name: "Monte Carlo", enabled: false, drawFunctionKey: "drawHistogramHeatmap", instanceRef: null },
    { id: "strikes", name: "Strike Lines", enabled: false, drawFunctionKey: "drawAllStrikeLines", instanceRef: null },
    {
        id: "movingAverages",
        name: "Moving Averages",
        enabled: false,
        drawFunctionKey: "drawMovingAverages",
        instanceRef: null,
        layer: 2,
        options: { periods: [20, 50, 200] },
    },
    { id: "vwap", name: "VWAP", enabled: false, drawFunctionKey: "drawAll", instanceRef: null, layer: 2 },
    makeExtremaIndicator("fibonacci", "Fib", "fibonacci"),
];

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
        // Optional controlled props - when supplied the parent owns the toolbar state
        timeframe: timeframeProp,
        setTimeframe: setTimeframeProp,
        indicators: indicatorsProp,
        setIndicators: setIndicatorsProp,
        hideControls = false,
    } = props;

    // Default bar type and period for GenericPixiChart
    const barType = { value: 2, name: "Minutes" };
    const barTypePeriod = 1;
    const tickSize = 0.01;

    const pixiDataRef = useRef();

    const [candleData, setCandleData] = useState({});
    //TODO add a way to toggle the 5 min data?   Set to 1 minute
    const [internalTimeframe, setInternalTimeframe] = useState("spy1MinData");
    const timeframe = timeframeProp ?? internalTimeframe;
    const setTimeframe = setTimeframeProp ?? setInternalTimeframe;

    const [lastSpyLevelOne, setLastSpyLevelOne] = useState(null);
    const [newSpyMinuteBar, setNewSpyMinuteBar] = useState(null);

    // The server only streams completed 1-minute bars, so higher timeframes are
    // compiled here from this source series rather than showing raw 1m updates.
    const minuteBarsRef = useRef([]);
    const frameMs = (TIMEFRAME_MINUTES[timeframe] || 1) * ONE_MINUTE;

    const [internalIndicators, setInternalIndicators] = useState(defaultSpyIndicators);
    const indicators = indicatorsProp ?? internalIndicators;
    const setIndicators = setIndicatorsProp ?? setInternalIndicators;

    const toggleIndicator = (id) => {
        setIndicators((prevIndicators) =>
            prevIndicators.map((indicator) => (indicator.id === id ? { ...indicator, enabled: !indicator.enabled } : indicator))
        );
    };

    useEffect(() => {
        const monteCarloIndicator = indicators.find((ind) => ind.id === "monteCarlo");
        if (!monteCarloIndicator) return; // Should not happen if initialized correctly

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

    // Re-seed the 1-minute source series whenever a fresh payload lands
    useEffect(() => {
        minuteBarsRef.current = Array.isArray(candleData.spy1MinData) ? [...candleData.spy1MinData] : [];
    }, [candleData]);

    useEffect(() => {
        if (!newSpyMinuteBar || !pixiDataRef.current) return;

        // Keep the source series current no matter which timeframe is displayed
        const minuteBars = minuteBarsRef.current;
        const existingIndex = minuteBars.findIndex((b) => b.datetime === newSpyMinuteBar.datetime);
        if (existingIndex >= 0) minuteBars[existingIndex] = newSpyMinuteBar;
        else minuteBars.push(newSpyMinuteBar);

        // Fold the minute into the bucket it belongs to, so a new bar appears only when
        // the bucket rolls over rather than once a minute. At 1m the bucket is just the
        // minute bar itself. The bucket may no longer be the last bar on the chart -
        // ticks open the next one as soon as the clock crosses the boundary, while this
        // completed bar trails it by a few seconds - so upsertBar matches on datetime.
        const bucketStart = Math.floor(newSpyMinuteBar.datetime / frameMs) * frameMs;
        const bucket = buildBucket(minuteBars, bucketStart, frameMs);
        if (bucket) pixiDataRef.current.upsertBar(bucket);
    }, [newSpyMinuteBar]);

    // Handle live price updates (updates temporary bar)
    useEffect(() => {
        if (!pixiDataRef.current || !spyLevelOne) return;

        // totalVol is cumulative for the session, so measuring a delta needs a previous
        // sample - without one the first tick would dump the whole day's volume into
        // the forming bar. The comparison also absorbs the reset at a new session.
        const previousTotalVol = lastSpyLevelOne?.totalVol;
        const volume =
            Number.isFinite(previousTotalVol) && spyLevelOne.totalVol >= previousTotalVol
                ? spyLevelOne.totalVol - previousTotalVol
                : 0;

        // When this tick happened. tradeTime/quoteTime ride along with every level-one
        // message, so they track the clock; `datetime` is only refreshed once a minute
        // when the completed candle arrives, which left the first seconds of each new
        // minute being folded into the minute before it.
        const tickTime = spyLevelOne.tradeTime || spyLevelOne.quoteTime || spyLevelOne.datetime || Date.now();

        // The chart knows the bar length and labelling convention, so it decides which
        // bucket this lands in and whether that opens a new bar.
        pixiDataRef.current.newTick({
            lastPrice: spyLevelOne.lastPrice || spyLevelOne.close,
            volume: volume,
            datetime: tickTime,
            timestamp: tickTime,
        });

        setLastSpyLevelOne(spyLevelOne);
    }, [spyLevelOne, pixiDataRef.current]);

    // Load initial data and set up socket listeners
    useEffect(() => {
        console.log("spychart loaded");
        Socket.emit("getSpyCandles");

        // Receive initial historical data
        Socket.on("spyCandles", (d) => {
            console.log("first spyCandles", d);
            // d[timeframe] = d[timeframe].slice(0, -418); // Drop last 400
            setCandleData(d);
        });

        // Receive complete 1-minute bars (replaces temporary bar)
        Socket.on("newSpyMinuteBar", (completeBar) => {
            console.log("[SpyChart] Complete 1m bar received", completeBar);
            setNewSpyMinuteBar(completeBar);
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

    const ohlcData = candleData[timeframe];

    const movingAverageIndicator = indicators.find((ind) => ind.id === "movingAverages");
    const vwapIndicator = indicators.find((ind) => ind.id === "vwap");
    const fibonacciIndicator = indicators.find((ind) => ind.id === "fibonacci");

    // Rebuild only on a timeframe switch or when the first bars land - all three draw
    // classes recalculate themselves as new bars arrive, so keying on bar count would
    // tear down and rebuild every instance on every tick.
    const indicatorDataKey = useMemo(() => `${timeframe}|${ohlcData?.length ? "ready" : "empty"}`, [timeframe, ohlcData]);

    useIndicator({
        indicator: movingAverageIndicator,
        pixiDataRef,
        createInstance: (pixiData) => {
            if (!pixiData?.ohlcDatas?.length) return null;
            const periods = movingAverageIndicator?.options?.periods || [20, 50, 200];
            const instance = new DrawMovingAverages(pixiData.ohlcDatas, pixiDataRef, periods, movingAverageIndicator?.layer ?? 2);
            // useIndicator registers by drawFunctionKey
            instance.drawMovingAverages = instance.drawAll;
            return instance;
        },
        setIndicators,
        dependencies: [indicatorDataKey, movingAverageIndicator?.options?.periods?.join("-") || ""],
    });

    useIndicator({
        indicator: vwapIndicator,
        pixiDataRef,
        createInstance: (pixiData) => {
            if (!pixiData?.ohlcDatas?.length) return null;
            return new DrawVWAP(pixiData.ohlcDatas, pixiDataRef, vwapIndicator?.layer ?? 2);
        },
        setIndicators,
        dependencies: [indicatorDataKey],
    });

    const createExtremaInstance = useCallback(
        (indicator) => (pixiData) => {
            if (!pixiData?.ohlcDatas?.length) return null;
            return new DrawExtremaAnalysis(pixiData, indicator.createMode, indicator.options, 2);
        },
        []
    );

    useIndicator({
        indicator: fibonacciIndicator,
        pixiDataRef,
        createInstance: createExtremaInstance(fibonacciIndicator || {}),
        setIndicators,
        dependencies: [indicatorDataKey],
    });

    return (
        <>
            {!hideControls && (
                <>
                    <TimeframeSelector setTimeframe={setTimeframe} timeframe={timeframe} />
                    <IndicatorSelector indicators={indicators} toggleIndicator={toggleIndicator} />
                </>
            )}
            {!ohlcData?.length ? (
                <div>Loading... {timeframe}</div>
            ) : (
                <GenericPixiChart
                    name="SpyChart"
                    key={timeframe}
                    ohlcDatas={ohlcData}
                    height={height}
                    symbol={symbol}
                    // fullSymbolRef={fullSymbolRef}
                    barType={barType}
                    barTypePeriod={barTypePeriod}
                    // loadData={loadData}
                    pixiDataRef={pixiDataRef}
                    tickSize={tickSize}
                    barSizeMs={frameMs}
                    barLabel="start"
                />
            )}
        </>
    );
};

export default SpyChart;
