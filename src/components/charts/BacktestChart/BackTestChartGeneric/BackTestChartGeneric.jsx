import React, { useState, useEffect, useRef } from "react";
import GenericPixiChart from "../../GenericPixiChart";
import DrawCombinedKeyLevels from "./DrawCombinedKeyLevels";
import DrawPivots from "./DrawPivots";
import DrawMinMax from "./DrawMinMax";
import DrawTrendlines from "../../chartComponents/DrawTrendlines";
// import DrawDailyTrendLines from "../../chartComponents/DrawDailyTrendLines";
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

    const [indicators, setIndicators] = useState([
        { id: "combinedKeyLevels", name: "CombinedKey Levels", enabled: true, drawFunctionKey: "drawAllCombinedLevels", layer: 0 },
        { id: "pivots", name: "Pivots", enabled: true, drawFunctionKey: "drawAllPivots", layer: 0 },
        { id: "minMax", name: "Min/Max", enabled: true, drawFunctionKey: "drawAllMinMax", layer: 0 },
        { id: "trendlines", name: "Trendlines", enabled: true, drawFunctionKey: "drawTrendlines", layer: 0 },
        // { id: "dailyTrendLines", name: "Daily Trendlines", enabled: true, drawFunctionKey: "drawDailyTrendLines", layer: 0 },
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
        console.log(liveData);
        liveData.forEach((d) => (d.datetime = d.datetime * 1000));
        debugger;
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
