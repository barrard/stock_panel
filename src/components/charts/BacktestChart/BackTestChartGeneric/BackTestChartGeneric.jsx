import React, { useState, useEffect, useRef } from "react";
import GenericPixiChart from "../../GenericPixiChart";
import DrawCombinedKeyLevels from "./DrawCombinedKeyLevels";
import DrawPivots from "./DrawPivots";
import DrawMinMax from "./DrawMinMax";
import DrawTrendlines from "../../chartComponents/DrawTrendlines";
// import DrawDailyTrendLines from "../../chartComponents/DrawDailyTrendLines";
import DrawMovingAverages from "../../drawFunctions/DrawMovingAverages";
import DrawSessionRangeZones from "../../drawFunctions/DrawSessionRangeZones";
import IndicatorSelector from "../../reusableChartComponents/IndicatorSelector";
import API from "../../../API";
// import { getExchangeFromSymbol } from "../../pixiChart/components/utils";
const BackTestChartGeneric = (props) => {
    const { width, height, symbol = "ES", Socket, data } = props;

    const pixiDataRef = useRef();

    const [candleData, setCandleData] = useState({});

    const combinedKeyLevelsRef = useRef(null);
    const pivotsRef = useRef(null);
    const minMaxRef = useRef(null);
    const trendlinesRef = useRef(null);
    const dailyTrendLinesRef = useRef(null);
    const movingAveragesRef = useRef(null);
    const sessionRangeZonesRef = useRef(null);

    const [indicators, setIndicators] = useState([
        { id: "combinedKeyLevels", name: "CombinedKey Levels", enabled: false, drawFunctionKey: "drawAllCombinedLevels", layer: 0 },
        { id: "pivots", name: "Pivots", enabled: false, drawFunctionKey: "drawAllPivots", layer: 0 },
        { id: "minMax", name: "Min/Max", enabled: false, drawFunctionKey: "drawAllMinMax", layer: 0 },
        { id: "trendlines", name: "Trendlines", enabled: false, drawFunctionKey: "drawTrendlines", layer: 0 },
        // { id: "dailyTrendLines", name: "Daily Trendlines", enabled: false, drawFunctionKey: "drawDailyTrendLines", layer: 0 },
        { id: "movingAverages", name: "Moving Averages", enabled: false, drawFunctionKey: "drawMovingAverages", layer: 0 },
        { id: "sessionRangeZones", name: "Session Range Zones", enabled: false, drawFunctionKey: "drawSessionRangeZones", layer: 0 },
    ]);

    const toggleIndicator = (id) => {
        setIndicators((prevIndicators) =>
            prevIndicators.map((indicator) => (indicator.id === id ? { ...indicator, enabled: !indicator.enabled } : indicator))
        );
    };

    //combined key levels
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

            const instance = new DrawCombinedKeyLevels(data.combinedKeyLevels, pixiDataRef, indicatorConfig.layer);
            combinedKeyLevelsRef.current = instance;
            instance.drawAllCombinedLevels();

            pixiDataRef.current.registerDrawFn(indicatorConfig.drawFunctionKey, instance.drawAllCombinedLevels.bind(instance));
        } else {
            cleanup(); // Clean up if disabled or no data.
        }
    }, [data?.combinedKeyLevels, indicators]);

    //pivots
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

            const instance = new DrawPivots(data.lastTwoDaysCompiled, data.bars, pixiDataRef, indicatorConfig.layer);
            pivotsRef.current = instance;
            instance.drawAllPivots();

            pixiDataRef.current.registerDrawFn(indicatorConfig.drawFunctionKey, instance.drawAllPivots.bind(instance));
        } else {
            cleanup();
        }
    }, [data?.lastTwoDaysCompiled, data?.bars, indicators]);

    //min max
    useEffect(() => {
        const indicatorConfig = indicators.find((ind) => ind.id === "minMax");
        if (!indicatorConfig || !pixiDataRef.current) return;

        const cleanup = () => {
            if (minMaxRef.current) {
                pixiDataRef.current?.unregisterDrawFn(indicatorConfig.drawFunctionKey);
                minMaxRef.current.cleanup();
                minMaxRef.current = null;
            }
        };

        if (indicatorConfig.enabled && data?.weeklyTrendLines) {
            cleanup();

            const instance = new DrawMinMax(data.weeklyTrendLines, pixiDataRef, indicatorConfig.layer);
            minMaxRef.current = instance;
            instance.drawAll();

            pixiDataRef.current.registerDrawFn(indicatorConfig.drawFunctionKey, instance.drawAll.bind(instance));
        } else {
            cleanup();
        }
    }, [data?.weeklyTrendLines, indicators]);

    //trendlines
    useEffect(() => {
        const indicatorConfig = indicators.find((ind) => ind.id === "trendlines");
        if (!indicatorConfig || !pixiDataRef.current) return;

        const cleanup = () => {
            if (trendlinesRef.current) {
                pixiDataRef.current?.unregisterDrawFn(indicatorConfig.drawFunctionKey);
                trendlinesRef.current.destroy();
                trendlinesRef.current = null;
            }
        };

        if (indicatorConfig.enabled && data?.weeklyTrendLines) {
            cleanup();

            const instance = new DrawTrendlines(pixiDataRef, data.weeklyTrendLines);
            trendlinesRef.current = instance;
            instance.draw();
            pixiDataRef.current.registerDrawFn(indicatorConfig.drawFunctionKey, instance.draw.bind(instance));
        } else {
            cleanup();
        }
    }, [data?.weeklyTrendLines, indicators]);

    // useEffect(() => {
    //     const indicatorConfig = indicators.find((ind) => ind.id === "dailyTrendLines");
    //     if (!indicatorConfig || !pixiDataRef.current) return;
    //     debugger;
    //     const cleanup = () => {
    //         if (dailyTrendLinesRef.current) {
    //             pixiDataRef.current?.unregisterDrawFn(indicatorConfig.drawFunctionKey);
    //             dailyTrendLinesRef.current.cleanup();
    //             dailyTrendLinesRef.current = null;
    //         }
    //     };

    //     if (indicatorConfig.enabled && data?.dailyTrendLines) {
    //         cleanup();

    //         const instance = new DrawDailyTrendLines(pixiDataRef, data.dailyTrendLines, indicatorConfig.layer);
    //         dailyTrendLinesRef.current = instance;
    //         pixiDataRef.current.registerDrawFn(indicatorConfig.drawFunctionKey, instance.draw);
    //     } else {
    //         cleanup();
    //     }
    // }, [data?.dailyTrendLines, indicators]);

    // Moving Averages (20, 50, 200)
    useEffect(() => {
        const indicatorConfig = indicators.find((ind) => ind.id === "movingAverages");
        if (!indicatorConfig || !pixiDataRef.current) return;

        const cleanup = () => {
            if (movingAveragesRef.current) {
                pixiDataRef.current?.unregisterDrawFn(indicatorConfig.drawFunctionKey);
                movingAveragesRef.current.cleanup();
                movingAveragesRef.current = null;
            }
        };

        if (indicatorConfig.enabled && candleData?.bars?.length > 0) {
            cleanup();

            const instance = new DrawMovingAverages(candleData.bars, pixiDataRef, [20, 50, 200], indicatorConfig.layer);
            movingAveragesRef.current = instance;
            instance.drawAll();

            pixiDataRef.current.registerDrawFn(indicatorConfig.drawFunctionKey, instance.drawAll.bind(instance));
        } else {
            cleanup();
        }
    }, [candleData?.bars, indicators]);

    // Session Range Zones
    useEffect(() => {
        const indicatorConfig = indicators.find((ind) => ind.id === "sessionRangeZones");
        if (!indicatorConfig || !pixiDataRef.current) return;

        const cleanup = () => {
            if (sessionRangeZonesRef.current) {
                pixiDataRef.current?.unregisterDrawFn(indicatorConfig.drawFunctionKey);
                sessionRangeZonesRef.current.cleanup();
                sessionRangeZonesRef.current = null;
            }
        };

        if (indicatorConfig.enabled && candleData?.bars?.length > 0 && data?.avgON_dailyRange && data?.avgRTH_dailyRange) {
            cleanup();

            const instance = new DrawSessionRangeZones(
                candleData.bars,
                data.avgON_dailyRange,
                data.avgRTH_dailyRange,
                pixiDataRef,
                indicatorConfig.layer
            );
            sessionRangeZonesRef.current = instance;
            instance.drawAll();

            pixiDataRef.current.registerDrawFn(indicatorConfig.drawFunctionKey, instance.drawAll.bind(instance));
        } else {
            cleanup();
        }
    }, [candleData?.bars, data?.avgON_dailyRange, data?.avgRTH_dailyRange, indicators]);

    useEffect(() => {
        if (data?.bars?.length) {
            console.log(data);
            // setCandleData(data);
            //fetch some new data?
            fetchLiveDataAndUpdate(data);
        }
    }, [data]);

    async function fetchLiveDataAndUpdate(data) {
        const liveData = await API.rapi_requestLiveBars({
            // barType: 2,
            // barTypePeriod: 30,
            timeframe: "30m",
            symbol: symbol,
            // exchange: getExchangeFromSymbol(symbol),
        });
        //merge and remove duplicate datetime with data.bars
        const mergedBars = [...data.bars, ...liveData].reduce((acc, bar) => {
            if (!acc.find((b) => b.datetime === bar.datetime)) {
                acc.push(bar);
            }
            return acc;
        }, []);
        setCandleData({ ...data, bars: mergedBars });
    }

    return (
        <>
            <IndicatorSelector indicators={indicators} toggleIndicator={toggleIndicator} />

            {!candleData?.bars?.length ? (
                <div>Loading... {symbol}</div>
            ) : (
                <GenericPixiChart
                    name="BackTestChartGeneric"
                    key={symbol}
                    ohlcDatas={candleData.bars}
                    width={width}
                    height={height}
                    symbol={symbol}
                    pixiDataRef={pixiDataRef}
                />
            )}
        </>
    );
};

export default BackTestChartGeneric;
