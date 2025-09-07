import React, { useState, useEffect, useRef } from "react";
import GenericPixiChart from "../../GenericPixiChart";
import DrawCombinedKeyLevels from "./DrawCombinedKeyLevels";
import DrawPivots from "./DrawPivots";
import DrawMinMax from "./DrawMinMax";
import IndicatorSelector from "../../reusableChartComponents/IndicatorSelector";

const BackTestChartGeneric = (props) => {
    const { width, height, symbol = "ES", Socket, data } = props;

    const pixiDataRef = useRef();

    const [candleData, setCandleData] = useState({});

    const combinedKeyLevelsRef = useRef(null);
    const pivotsRef = useRef(null);
    const minMaxRef = useRef(null);
    const [indicators, setIndicators] = useState([
        { id: "combinedKeyLevels", name: "CombinedKey Levels", enabled: true, drawFunctionKey: "drawAllCombinedLevels", layer: 0 },
        { id: "pivots", name: "Pivots", enabled: true, drawFunctionKey: "drawAllPivots", layer: 0 },
        { id: "minMax", name: "Min/Max", enabled: true, drawFunctionKey: "drawAllMinMax", layer: 0 },
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

            const instance = new DrawCombinedKeyLevels(data.combinedKeyLevels, pixiDataRef, indicatorConfig.layer);
            combinedKeyLevelsRef.current = instance;
            instance.drawAllCombinedLevels();

            pixiDataRef.current.registerDrawFn(indicatorConfig.drawFunctionKey, instance.drawAllCombinedLevels.bind(instance));
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

            const instance = new DrawPivots(data.lastTwoDaysCompiled, data.bars, pixiDataRef, indicatorConfig.layer);
            pivotsRef.current = instance;
            instance.drawAllPivots();

            pixiDataRef.current.registerDrawFn(indicatorConfig.drawFunctionKey, instance.drawAllPivots.bind(instance));
        } else {
            cleanup();
        }
    }, [data?.lastTwoDaysCompiled, data?.bars, indicators]);

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

    useEffect(() => {
        if (data?.bars) {
            console.log(data);
            setCandleData(data);
        }
    }, [data]);

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
