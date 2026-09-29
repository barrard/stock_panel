import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MdDateRange } from "react-icons/md";
import GenericPixiChart from "../../../GenericPixiChart";
import API from "../../../../API";
import { IconButton } from "../../../../StratBuilder/components";
import IndicatorsBtns from "../IndicatorsBtns";
import { useToggleIndicator } from "../../../hooks/useToggleIndicator";
import { useIndicator } from "../../../hooks/useIndicator";
import { useLiquidityData } from "../../../hooks/useLiquidityData";
import { useLiquidityRatios } from "../../../hooks/useLiquidityRatios";
import { LiquidityHeatmap, liquidityHeatMapConfig } from "../indicatorDrawFunctions";
import DrawOrdersV2 from "../DrawOrdersV2";
import DrawDepthSignals from "../DrawDepthSignals";
import DrawSuperTrend from "../../../drawFunctions/DrawSuperTrend";
import DrawExtremaAnalysis from "../../../drawFunctions/DrawExtremaAnalysis";
import { createDefaultExtremaIndicators, EXTREMA_INDICATOR_IDS } from "../../../drawFunctions/extremaAnalysisConfig";
import { saveIndicatorOptions } from "../../../drawFunctions/indicatorOptionsStorage";
import { sendFuturesOrder } from "../sendFuturesOrder";
import { createDualHistogramDrawFn } from "../drawFns";
import DrawBetterTickMarkers from "./DrawBetterTickMarkers";
// import { liquidityHeatMapConfig } from "../indicatorConfigs";

const BETTER_VOLUME_COLORS = {
    pro: 0xffb74d,
    am: 0xfff176,
    climaxChurn: 0xff4dff,
    highChurn: 0x42a5f5,
    lowVolume: 0xfdd835,
    climaxDown: 0xffffff,
    climaxUp: 0xff5252,
    default: 0x78909c,
};

const PRO_VOL_PER_ORDER_MIN = 2;
const AM_VOL_PER_ORDER_MAX = 1.1;

const getBetterVolumeColor = (bar = {}) => {
    if (bar.volumePro) return BETTER_VOLUME_COLORS.pro;
    if (bar.volumeAm) return BETTER_VOLUME_COLORS.am;
    if (bar.volumeClimaxChurnBar) return BETTER_VOLUME_COLORS.climaxChurn;
    if (bar.highVolumeChurnBar) return BETTER_VOLUME_COLORS.highChurn;
    if (bar.lowVolumeBar || bar.lowVolumeChurnBar) return BETTER_VOLUME_COLORS.lowVolume;
    if (bar.volumeClimaxDownBar) return BETTER_VOLUME_COLORS.climaxDown;
    if (bar.volumeClimaxUpBar) return BETTER_VOLUME_COLORS.climaxUp;
    return BETTER_VOLUME_COLORS.default;
};

const getBarDelta = (bar = {}) => {
    const apiDelta = Number(bar.delta);
    if (Number.isFinite(apiDelta)) return apiDelta;

    const askVolume = Number(bar.askVolume);
    const bidVolume = Number(bar.bidVolume);
    if (Number.isFinite(askVolume) && Number.isFinite(bidVolume)) {
        return askVolume - bidVolume;
    }

    const normalizedDelta = Number(bar.barDelta);
    return Number.isFinite(normalizedDelta) ? normalizedDelta : null;
};

const buildBetterTickMarkers = (bar = {}, { avgTradeSize = null, betterMomentumHist = null, barDelta = null } = {}) => {
    const markers = [];
    const isBuyingBar = Number(barDelta) >= 0;
    const high = Number(bar.high);
    const low = Number(bar.low);
    const close = Number(bar.close);
    const hasHigh = Number.isFinite(high);
    const hasLow = Number.isFinite(low);
    const fallbackPrice = Number.isFinite(close) ? close : null;

    const buyPrice = hasLow ? low : fallbackPrice;
    const sellPrice = hasHigh ? high : fallbackPrice;
    const proRun = Number(bar.volumeProRun);
    const amRun = Number(bar.volumeAmRun);
    const showProMarker = bar.volumeProExtreme || proRun >= 3;
    const showAmMarker = bar.volumeAmExtreme || amRun >= 3;

    if (showProMarker && Number.isFinite(avgTradeSize)) {
        markers.push({
            type: "pro",
            label: "PRO",
            compactLabel: "",
            direction: isBuyingBar ? 1 : -1,
            price: isBuyingBar ? buyPrice : sellPrice,
            color: 0xffb74d,
            shape: "diamond",
            size: 6,
            tooltipLines: [
                "PRO high avg trade size",
                `Avg trade: ${avgTradeSize.toFixed(2)}`,
                Number.isFinite(proRun) ? `Run: ${proRun}` : null,
                bar.volumeProRelativeExtreme ? "Rolling extreme: yes" : null,
                `Volume: ${Number(bar.volume || 0).toFixed(0)}`,
                `Delta: ${Number(barDelta || 0).toFixed(0)}`,
            ].filter(Boolean),
        });
    }

    if (showAmMarker && Number.isFinite(avgTradeSize)) {
        markers.push({
            type: "am",
            label: "AM",
            compactLabel: "",
            direction: isBuyingBar ? 1 : -1,
            price: isBuyingBar ? buyPrice : sellPrice,
            color: 0xfff176,
            shape: "square",
            size: 5,
            tooltipLines: [
                "AM low avg trade size",
                `Avg trade: ${avgTradeSize.toFixed(2)}`,
                Number.isFinite(amRun) ? `Run: ${amRun}` : null,
                bar.volumeAmRelativeExtreme ? "Rolling extreme: yes" : null,
                `Volume: ${Number(bar.volume || 0).toFixed(0)}`,
                `Delta: ${Number(barDelta || 0).toFixed(0)}`,
            ].filter(Boolean),
        });
    }

    const buyExhaustion = bar.momentumExhaustionBuy || (bar.buyingExhaustion && Number(betterMomentumHist) > 0);
    const sellExhaustion = bar.momentumExhaustionSell || (bar.sellingExhaustion && Number(betterMomentumHist) < 0);

    if (buyExhaustion) {
        markers.push({
            type: "buyExhaustion",
            label: "BX",
            direction: 1,
            price: buyPrice,
            color: 0x26c6da,
            size: 7,
            tooltipLines: [
                "Buy exhaustion",
                `Momentum hist: ${Number(betterMomentumHist || 0).toFixed(4)}`,
                `Delta: ${Number(barDelta || 0).toFixed(0)}`,
                `Close location: ${Number(bar.closeLocation || 0).toFixed(2)}`,
            ],
        });
    }

    if (sellExhaustion) {
        markers.push({
            type: "sellExhaustion",
            label: "SX",
            direction: -1,
            price: sellPrice,
            color: 0xef5350,
            size: 7,
            tooltipLines: [
                "Sell exhaustion",
                `Momentum hist: ${Number(betterMomentumHist || 0).toFixed(4)}`,
                `Delta: ${Number(barDelta || 0).toFixed(0)}`,
                `Close location: ${Number(bar.closeLocation || 0).toFixed(2)}`,
            ],
        });
    }

    return markers.filter((marker) => Number.isFinite(Number(marker.price)));
};

const normalizeBetterTickBars = (bars = [], { startingCumulativeDelta = 0, startingProRun = 0, startingAmRun = 0 } = {}) => {
    let cumulativeDelta = Number(startingCumulativeDelta);
    if (!Number.isFinite(cumulativeDelta)) {
        cumulativeDelta = 0;
    }
    let proRun = Number(startingProRun);
    if (!Number.isFinite(proRun)) {
        proRun = 0;
    }
    let amRun = Number(startingAmRun);
    if (!Number.isFinite(amRun)) {
        amRun = 0;
    }

    return bars.map((bar) => {
        const rawAvgTradeSize = Number(bar.avgTradeSize ?? bar.volPerOrder);
        const volume = Number(bar.volume);
        const tickCount = Number(bar.tickCount);
        const avgTradeSize =
            Number.isFinite(rawAvgTradeSize) || !Number.isFinite(volume) || !Number.isFinite(tickCount) || tickCount <= 0
                ? rawAvgTradeSize
                : volume / tickCount;
        const betterMomentumHist = Number(bar.betterMomentumHist);
        const barDelta = getBarDelta(bar);
        if (Number.isFinite(barDelta)) {
            cumulativeDelta += barDelta;
        }
        const isPro = Boolean(bar.volumePro) || avgTradeSize >= PRO_VOL_PER_ORDER_MIN;
        const isAm = Boolean(bar.volumeAm) || avgTradeSize <= AM_VOL_PER_ORDER_MAX;
        proRun = isPro ? proRun + 1 : 0;
        amRun = isAm ? amRun + 1 : 0;

        const normalizedBar = {
            ...bar,
            volumePro: isPro || undefined,
            volumeAm: isAm || undefined,
            timestamp: bar.timestamp ?? bar.datetime,
            barDelta: Number.isFinite(barDelta) ? barDelta : null,
            cumulativeDelta,
            avgTradeSize: Number.isFinite(avgTradeSize) ? avgTradeSize : null,
            volPerOrder: Number.isFinite(avgTradeSize) ? avgTradeSize : null,
            betterProSize: isPro && Number.isFinite(avgTradeSize) ? avgTradeSize : null,
            betterAmSize: isAm && Number.isFinite(avgTradeSize) ? -avgTradeSize : null,
            volumeProRun: proRun,
            volumeAmRun: amRun,
            betterMomentumHist: Number.isFinite(betterMomentumHist) ? betterMomentumHist : null,
            betterMomentumPositive: Number.isFinite(betterMomentumHist) && betterMomentumHist > 0 ? betterMomentumHist : null,
            betterMomentumNegative: Number.isFinite(betterMomentumHist) && betterMomentumHist < 0 ? betterMomentumHist : null,
        };
        normalizedBar.betterTickMarkers = buildBetterTickMarkers(normalizedBar, {
            avgTradeSize,
            betterMomentumHist,
            barDelta,
        });
        return normalizedBar;
    });
};

const createBetterVolumeDrawFn = () => {
    return (indicator) => {
        const { chart } = indicator;
        if (!chart?.slicedData?.length || !indicator?.gfx) return;

        try {
            if (!indicator.gfx?._geometry) return;
            indicator.gfx.clear();
        } catch (err) {
            console.log("CLEAR() Error?");
            console.log(err);
            return err;
        }

        const dataLength = chart.slicedData.length;
        const candleWidth = (chart.width - (chart.margin.left + chart.margin.right)) / dataLength;
        const halfWidth = candleWidth / 2;
        const candleMargin = candleWidth * 0.1;
        const doubleMargin = candleMargin * 2;
        const strokeWidth = candleWidth * 0.1;
        const halfStrokeWidth = strokeWidth / 2;
        const bottom = indicator.scale(0);

        chart.slicedData.forEach((bar, i) => {
            const volume = Number(bar.volume);
            if (!Number.isFinite(volume)) return;

            const x = chart.xScale(i);
            const top = indicator.scale(volume);
            const height = Math.max(1, bottom - top - strokeWidth);
            indicator.gfx.beginFill(getBetterVolumeColor(bar), 0.9);
            indicator.gfx.drawRect(x + candleMargin - halfWidth, top + halfStrokeWidth, candleWidth - doubleMargin, height);
            indicator.gfx.endFill();
        });
    };
};

const getBarTimestamp = (bar) => {
    const timestamp = Number(bar?.timestamp ?? bar?.datetime);
    return Number.isFinite(timestamp) ? timestamp : null;
};

const getExtremaAnalysisDataKey = (bars = []) => {
    if (!bars.length) return "empty";

    const firstBar = bars[0];
    const completedIndex = Math.max(0, bars.length - 2);
    const completedBar = bars[completedIndex];

    return [
        bars.length,
        getBarTimestamp(firstBar),
        firstBar?.open,
        firstBar?.high,
        firstBar?.low,
        firstBar?.close,
        getBarTimestamp(completedBar),
        completedBar?.open,
        completedBar?.high,
        completedBar?.low,
        completedBar?.close,
    ].join(":");
};

const BetterTickChart = (props) => {
    const {
        height = 400,
        symbol = "SPY",
        // timeframe = "tick",
        Socket,
        // contractSymbol,
        fullSymbol,
        exchange = "CME",
        orders: ordersFromParent = {},
    } = props;

    // Use provided fullSymbol or fallback to symbol
    // const fullSymbol = propFullSymbol || symbol;

    console.log("[BetterTickChart] COMPONENT RENDER", {
        symbol,
        fullSymbol,
        exchange,
        timestamp: Date.now(),
        stack: new Error().stack.split("\n").slice(1, 4).join("\n"),
    });

    const pixiDataRef = useRef();
    const loadingRef = useRef(false);

    // Chart data state
    const [candleData, setCandleData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [join, setJoin] = useState(1);
    const rawDataRef = useRef([]); // Display bars returned from server using the active join value
    const liveJoinBufferRef = useRef([]); // Raw 100-tick bars collected until they complete the next joined bar
    const depthSignalsDrawRef = useRef(null);
    const betterTickMarkersDrawRef = useRef(null);
    const pendingDepthSignalsRef = useRef([]);
    const seenDepthSignalKeysRef = useRef(new Set());

    // Date range picker state
    const [showDateRange, setShowDateRange] = useState(false);
    const [drStartTime, setDrStartTime] = useState("");
    const [drEndTime, setDrEndTime] = useState("");
    const [drNumDays, setDrNumDays] = useState("5");
    const [drUseNumDays, setDrUseNumDays] = useState(true);

    // Indicators configuration
    const [indicators, setIndicators] = useState([
        liquidityHeatMapConfig,
        {
            id: "orders",
            name: "Orders",
            enabled: false,
            drawFunctionKey: "draw",
            instanceRef: null,
        },
        {
            id: "depthSignals",
            name: "Depth Signals",
            enabled: true,
            instanceRef: null,
        },
        {
            id: "superTrend",
            name: "Super Trend",
            enabled: false,
            drawFunctionKey: "drawAll",
            instanceRef: null,
        },
        ...createDefaultExtremaIndicators(),
    ]);

    // Use custom hook for indicator toggling
    const toggleIndicator = useToggleIndicator(indicators, setIndicators, "tick");

    // Function to update indicator options
    const updateIndicatorOptions = useCallback((indicatorId, newOptions) => {
        console.log("[BetterTickChart updateIndicatorOptions] Called with:", indicatorId, newOptions);
        setIndicators((prevIndicators) => {
            return prevIndicators.map((ind) => {
                if (ind.id === indicatorId) {
                    const updatedIndicator = {
                        ...ind,
                        options: { ...ind.options, ...newOptions },
                    };

                    if (EXTREMA_INDICATOR_IDS.includes(indicatorId)) {
                        saveIndicatorOptions(indicatorId, updatedIndicator.options);
                    }

                    // If the indicator is enabled and has an instance, update it
                    if (updatedIndicator.enabled && updatedIndicator.instanceRef) {
                        const instance = updatedIndicator.instanceRef;

                        // Update visualization mode if changed (for liquidity heatmap)
                        if (newOptions.visualizationMode && instance.setVisualizationMode) {
                            instance.setVisualizationMode(newOptions.visualizationMode);
                        }

                        if (instance.setOptions) {
                            instance.setOptions(newOptions);
                        }

                        // Update color scheme if changed
                        if (newOptions.colorScheme && newOptions.colorScheme.colorStops) {
                            const { colorStops } = newOptions.colorScheme;
                            instance.colors = colorStops.map((stop) => stop.color);
                            instance.liquidityThresholds = colorStops.map((stop) => stop.threshold);
                        }

                        // If we only updated color scheme (not visualization mode), trigger redraw
                        if (!newOptions.visualizationMode && newOptions.colorScheme && instance.draw) {
                            instance.draw(true);
                        }
                    }

                    return updatedIndicator;
                }
                return ind;
            });
        });
    }, []);

    // Get indicator configs
    const liquidityHeatmapIndicator = indicators.find((ind) => ind.id === "liquidityHeatmap");
    const ordersIndicator = indicators.find((ind) => ind.id === "orders");
    const depthSignalsIndicator = indicators.find((ind) => ind.id === "depthSignals");
    const superTrendIndicator = indicators.find((ind) => ind.id === "superTrend");
    const priceLevelsIndicator = indicators.find((ind) => ind.id === "priceLevels");
    const fibonacciIndicator = indicators.find((ind) => ind.id === "fibonacci");
    const trendlinesIndicator = indicators.find((ind) => ind.id === "trendlines");
    const zigZagIndicator = indicators.find((ind) => ind.id === "zigZag");
    const extremaAnalysisDataKey = useMemo(
        () => [fullSymbol, join, getExtremaAnalysisDataKey(candleData)].join("|"),
        [fullSymbol, join, candleData]
    );

    // Keep a ref to indicators to avoid stale closures in socket handlers
    const indicatorsRef = useRef(indicators);
    useEffect(() => {
        indicatorsRef.current = indicators;
    }, [indicators]);

    const normalizeDepthSignal = useCallback((signal = {}) => {
        const timestamp = Number(signal?.timestamp ?? signal?.timestampMs ?? signal?.receivedAt ?? Date.now());
        const lastPrice = Number(signal?.lastPrice);
        const direction = signal?.direction > 0 ? 1 : signal?.direction < 0 ? -1 : 0;

        if (!Number.isFinite(timestamp) || !Number.isFinite(lastPrice) || !direction) {
            return null;
        }

        return {
            ...signal,
            timestamp,
            lastPrice,
            direction,
            consecutive: Number.isFinite(Number(signal?.consecutive)) ? Number(signal.consecutive) : 0,
            cumulative: Number.isFinite(Number(signal?.cumulative)) ? Number(signal.cumulative) : 0,
            windowScore: Number.isFinite(Number(signal?.windowScore)) ? Number(signal.windowScore) : 0,
            receivedAt: Date.now(),
        };
    }, []);

    const getDepthSignalKey = useCallback((signal) => {
        return [
            signal?.timestamp,
            signal?.direction,
            signal?.lastPrice,
            signal?.consecutive,
            signal?.cumulative,
            signal?.windowScore,
        ].join(":");
    }, []);

    // Use the useIndicator hook for liquidity heatmap
    useIndicator({
        indicator: liquidityHeatmapIndicator,
        pixiDataRef,
        createInstance: (pixiData) => {
            // Pass timeframe to LiquidityHeatmap for proper datetime alignment
            const instance = new LiquidityHeatmap(pixiData, { timeframe: "tick" });
            // Initialize with options from indicator config
            if (liquidityHeatmapIndicator?.options) {
                if (liquidityHeatmapIndicator.options.visualizationMode) {
                    instance.visualizationMode = liquidityHeatmapIndicator.options.visualizationMode;
                }
                if (liquidityHeatmapIndicator.options.colorScheme) {
                    const { colorStops } = liquidityHeatmapIndicator.options.colorScheme;
                    instance.colors = colorStops.map((stop) => stop.color);
                    instance.liquidityThresholds = colorStops.map((stop) => stop.threshold);
                }
            }
            return instance;
        },
        setIndicators,
        dependencies: [],
    });

    // Orders indicator hook
    useIndicator({
        indicator: ordersIndicator,
        pixiDataRef,
        createInstance: (pixiData) => {
            if (!pixiData) {
                console.warn("[BetterTickChart] Cannot create DrawOrdersV2 instance - pixiData missing");
                return null;
            }
            console.log("[BetterTickChart] Creating DrawOrdersV2 instance", {
                chartName: pixiData?.name,
            });
            return new DrawOrdersV2(pixiData);
        },
        setIndicators,
        dependencies: [],
    });

    // SuperTrend indicator hook
    useIndicator({
        indicator: superTrendIndicator,
        pixiDataRef,
        createInstance: (pixiData) => {
            if (!pixiData?.ohlcDatas || pixiData.ohlcDatas.length === 0) {
                return null;
            }
            return new DrawSuperTrend(pixiData.ohlcDatas, { current: pixiData }, 0);
        },
        setIndicators,
        dependencies: [candleData],
    });

    const createExtremaInstance = useCallback((indicator) => {
        return (pixiData) => {
            if (!pixiData?.ohlcDatas || pixiData.ohlcDatas.length === 0) {
                return null;
            }
            return new DrawExtremaAnalysis(pixiData, indicator.createMode, indicator.options, 2);
        };
    }, []);

    useIndicator({
        indicator: priceLevelsIndicator,
        pixiDataRef,
        createInstance: createExtremaInstance(priceLevelsIndicator || {}),
        setIndicators,
        dependencies: [extremaAnalysisDataKey],
    });

    useIndicator({
        indicator: fibonacciIndicator,
        pixiDataRef,
        createInstance: createExtremaInstance(fibonacciIndicator || {}),
        setIndicators,
        dependencies: [extremaAnalysisDataKey],
    });

    useIndicator({
        indicator: trendlinesIndicator,
        pixiDataRef,
        createInstance: createExtremaInstance(trendlinesIndicator || {}),
        setIndicators,
        dependencies: [extremaAnalysisDataKey],
    });

    useIndicator({
        indicator: zigZagIndicator,
        pixiDataRef,
        createInstance: createExtremaInstance(zigZagIndicator || {}),
        setIndicators,
        dependencies: [extremaAnalysisDataKey],
    });

    useEffect(() => {
        const ordersInstance = ordersIndicator?.instanceRef;
        if (!ordersInstance || !ordersIndicator?.enabled) return;

        console.log("[BetterTickChart] Drawing orders on chart", {
            baskets: Object.keys(ordersFromParent || {}).length,
            fullSymbol,
        });
        ordersInstance.draw(ordersFromParent || {});
    }, [ordersIndicator?.enabled, ordersIndicator?.instanceRef, ordersFromParent, fullSymbol]);

    const hasCandleData = candleData.length > 0;

    useEffect(() => {
        if (!pixiDataRef.current || !hasCandleData) return;

        const pixiData = pixiDataRef.current;
        if (betterTickMarkersDrawRef.current?.chart !== pixiData) {
            betterTickMarkersDrawRef.current?.cleanup?.();
            betterTickMarkersDrawRef.current = new DrawBetterTickMarkers(pixiData);
            pixiData.registerDrawFn("betterTickMarkers", betterTickMarkersDrawRef.current.draw.bind(betterTickMarkersDrawRef.current));
        }

        pixiData.draw?.();

        return () => {
            pixiData.unregisterDrawFn("betterTickMarkers");
            if (betterTickMarkersDrawRef.current?.chart === pixiData) {
                betterTickMarkersDrawRef.current.cleanup?.();
                betterTickMarkersDrawRef.current = null;
            }
        };
    }, [hasCandleData, symbol, join]);

    useEffect(() => {
        if (!pixiDataRef.current || !candleData.length) return;

        const pixiData = pixiDataRef.current;
        if (!depthSignalsIndicator?.enabled) {
            pixiData.unregisterDrawFn("depthSignals");
            depthSignalsDrawRef.current?.clearSignals?.();
            depthSignalsDrawRef.current?.cleanup?.();
            depthSignalsDrawRef.current = null;
            pixiData.draw?.();
            return;
        }
        if (depthSignalsDrawRef.current?.chart === pixiData) {
            depthSignalsDrawRef.current.setSignals(pendingDepthSignalsRef.current);
            pixiData.draw?.();
            return;
        }

        depthSignalsDrawRef.current?.cleanup?.();

        const instance = new DrawDepthSignals(pixiData);
        depthSignalsDrawRef.current = instance;
        instance.setSignals(pendingDepthSignalsRef.current);
        pixiData.registerDrawFn("depthSignals", instance.draw.bind(instance));
        pixiData.draw?.();

        return () => {
            pixiData.unregisterDrawFn("depthSignals");
            if (depthSignalsDrawRef.current === instance) {
                depthSignalsDrawRef.current = null;
            }
            instance.cleanup?.();
        };
    }, [candleData.length, isLoading, symbol, join, depthSignalsIndicator?.enabled]);

    useEffect(() => {
        pendingDepthSignalsRef.current = [];
        seenDepthSignalKeysRef.current.clear();
        depthSignalsDrawRef.current?.clearSignals?.();
        pixiDataRef.current?.draw?.();
    }, [symbol, fullSymbol, join]);

    // Use the liquidity data hook for fetching and caching
    useLiquidityData({
        liquidityHeatmapIndicator,
        symbol,
        timeframe: "tick",
        ohlcData: candleData,
        Socket,
        indicatorsRef,
        requireIndicatorEnabled: true,
        join,
    });

    useLiquidityRatios({
        symbol,
        Socket,
        pixiDataRef,
        enabled: true,
        timeframe: "tick",
        ohlcData: candleData,
        join,
    });

    const lowerIndicators = useMemo(() => {
        return [
            {
                name: "Better Volume",
                height: 100,
                type: "volume",
                accessors: "volume",
                drawFn: createBetterVolumeDrawFn(),
                canGoNegative: false,
            },
            {
                name: "Cumulative Delta",
                height: 70,
                type: "line",
                accessors: "cumulativeDelta",
                lineColor: 0x26c6da,
                canGoNegative: true,
            },
            {
                name: "Avg Trade Size",
                height: 70,
                type: "line",
                accessors: "avgTradeSize",
                lineColor: 0xffb74d,
                canGoNegative: false,
            },
            {
                name: "Pro/Am",
                height: 70,
                type: "volume",
                accessors: "betterProSize",
                extentFields: ["betterProSize", "betterAmSize"],
                drawFn: createDualHistogramDrawFn({
                    positiveField: "betterProSize",
                    negativeField: "betterAmSize",
                    positiveColor: 0xffb74d,
                    negativeColor: 0xfff176,
                }),
                canGoNegative: true,
            },
            {
                name: "Better Momentum",
                height: 80,
                type: "volume",
                accessors: "betterMomentumHist",
                extentFields: ["betterMomentumPositive", "betterMomentumNegative"],
                drawFn: createDualHistogramDrawFn({
                    positiveField: "betterMomentumPositive",
                    negativeField: "betterMomentumNegative",
                    positiveColor: 0x26c6da,
                    negativeColor: 0xef5350,
                }),
                canGoNegative: true,
            },
            {
                name: "Uber Near Cancellation",
                height: 90,
                type: "volume",
                accessors: "uberNearAbovePriceCancellationCountClose",
                extentFields: ["uberNearAbovePriceCancellationCountClose", "uberNearBelowPriceCancellationCountNegative"],
                drawFn: createDualHistogramDrawFn({
                    positiveField: "uberNearAbovePriceCancellationCountClose",
                    negativeField: "uberNearBelowPriceCancellationCountNegative",
                    positiveColor: 0x3399ff,
                    negativeColor: 0xff3366,
                    positiveMAField: "uberNearAbovePriceCancellationCountMA20",
                    negativeMAField: "uberNearBelowPriceCancellationCountMA20",
                    positiveMAColor: 0x99ccff,
                    negativeMAColor: 0xff99bb,
                }),
                canGoNegative: true,
            },
            {
                name: "Near Price Cancellation",
                height: 90,
                type: "volume",
                accessors: "nearAbovePriceCancellationCountClose",
                extentFields: ["nearAbovePriceCancellationCountClose", "nearBelowPriceCancellationCountNegative"],
                drawFn: createDualHistogramDrawFn({
                    positiveField: "nearAbovePriceCancellationCountClose",
                    negativeField: "nearBelowPriceCancellationCountNegative",
                    positiveColor: 0x66ff66,
                    negativeColor: 0xff6666,
                    positiveMAField: "nearAbovePriceCancellationCountMA20",
                    negativeMAField: "nearBelowPriceCancellationCountMA20",
                    positiveMAColor: 0xd4ffd4,
                    negativeMAColor: 0xffd6d6,
                }),
                canGoNegative: true,
            },
        ];
    }, []);

    const buildCombinedBar = useCallback((barsToJoin) => {
        if (!barsToJoin?.length) return null;

        return {
            open: barsToJoin[0].open,
            high: Math.max(...barsToJoin.map((b) => b.high)),
            low: Math.min(...barsToJoin.map((b) => b.low)),
            close: barsToJoin[barsToJoin.length - 1].close,
            volume: barsToJoin.reduce((sum, b) => sum + (b.volume || 0), 0),
            askVolume: barsToJoin.reduce((sum, b) => sum + (b.askVolume || 0), 0),
            bidVolume: barsToJoin.reduce((sum, b) => sum + (b.bidVolume || 0), 0),
            delta: barsToJoin.reduce((sum, b) => sum + (getBarDelta(b) || 0), 0),
            tickCount: barsToJoin.reduce((sum, b) => sum + (b.tickCount || 0), 0),
            datetime: barsToJoin[barsToJoin.length - 1].datetime,
            timestamp: barsToJoin[barsToJoin.length - 1].timestamp || barsToJoin[barsToJoin.length - 1].datetime,
            symbol: barsToJoin[0].symbol,
        };
    }, []);

    const mergeBarsByTimestamp = useCallback((bars = []) => {
        return Array.from(
            new Map(
                bars.map((bar) => {
                    const key = bar?.timestamp || bar?.datetime;
                    return [key, bar];
                })
            ).values()
        ).sort((a, b) => (a.timestamp || a.datetime) - (b.timestamp || b.datetime));
    }, []);

    const requestHistoricalBars = useCallback(
        async (opts = {}) => {
            const requestOpts = {
                ...opts,
                symbol,
                join,
            };
            console.log("[BetterTickChart] Calling API.getCustomTicks with:", requestOpts);
            return await API.getCustomTicks(requestOpts);
        },
        [join, symbol]
    );

    const syncServerBarsToState = useCallback((bars = []) => {
        const normalizedBars = normalizeBetterTickBars(bars);
        rawDataRef.current = normalizedBars;
        liveJoinBufferRef.current = [];
        setCandleData(normalizedBars);
    }, []);

    const fetchData = useCallback(async (opts = {}) => {
        const { symbol, limit = 2000 } = opts;
        console.log("[BetterTickChart] fetchData called", {
            symbol,
            join,
        });

        // Mark this request as active
        loadingRef.current = true;
        setIsLoading(true);

        try {
            const data = await requestHistoricalBars({ ...opts, limit, symbol });

            console.log("[BetterTickChart] API.getCustomTicks returned:", {
                dataLength: data?.length,
                firstItem: data?.[0],
                lastItem: data?.[data?.length - 1],
            });

            console.log("[BetterTickChart] Server bars loaded:", {
                barsLength: data.length,
                join,
                firstBar: data[0],
                lastBar: data[data.length - 1],
            });

            syncServerBarsToState(data);
            console.log("[BetterTickChart] State updated from server bars");
        } catch (error) {
            console.error("[BetterTickChart] fetchData error:", error);
        } finally {
            // Only clear loading if this is still the active request

            console.log("[BetterTickChart] fetchData end - NOT clearing flags (superseded)");
            loadingRef.current = false;
            setIsLoading(false);
        }
    }, [join, requestHistoricalBars, syncServerBarsToState]);

    // Handler for time range changes from the GenericPixiChart
    const handleTimeRangeChange = useCallback(async ({ startTime, endTime }) => {
        console.log(
            `[BetterTickChart] Loading data for time range: ${new Date(startTime).toLocaleString()} to ${new Date(
                endTime
            ).toLocaleString()}`
        );

        try {
            const data = await requestHistoricalBars({
                start: Math.floor(startTime),
                finish: Math.floor(endTime),
                limit: 10000, // Allow larger limit for custom time ranges
            });

            if (data && data.length > 0) {
                console.log(`[BetterTickChart] Loaded ${data.length} bars for time range`);
                syncServerBarsToState(data);
            } else {
                console.log("[BetterTickChart] No data available for selected time range");
                alert("No data available for selected time range");
            }
        } catch (error) {
            console.error("[BetterTickChart] Failed to load time range data:", error);
            alert("Failed to load data for selected time range");
        }
    }, [requestHistoricalBars, syncServerBarsToState]);

    const handleDateRangeSubmit = useCallback(() => {
        if (!drStartTime) return alert("Please provide a start date");
        const startTimestamp = new Date(drStartTime + "T00:00:00").getTime();
        if (drUseNumDays) {
            if (!drNumDays || drNumDays <= 0) return alert("Please provide a valid number of days");
            const endTimestamp = startTimestamp + parseInt(drNumDays) * 24 * 60 * 60 * 1000;
            handleTimeRangeChange({ startTime: startTimestamp, endTime: endTimestamp });
        } else {
            if (!drEndTime) return alert("Please provide an end date");
            const endTimestamp = new Date(drEndTime + "T23:59:59.999").getTime();
            if (startTimestamp >= endTimestamp) return alert("Start date must be before end date");
            handleTimeRangeChange({ startTime: startTimestamp, endTime: endTimestamp });
        }
        setShowDateRange(false);
    }, [drStartTime, drEndTime, drNumDays, drUseNumDays, handleTimeRangeChange]);

    // Load more historical data (called when scrolling back)
    const loadMoreData = async () => {
        if (loadingRef.current) {
            return;
        }
        loadingRef.current = true;
        setIsLoading(true);

        if (rawDataRef.current.length === 0) {
            console.log("[BetterTickChart] No data to load more from");
            loadingRef.current = false;
            setIsLoading(false);
            return;
        }

        // Get the datetime of the earliest bar (first in the array)
        const firstBar = rawDataRef.current[0];
        const finishTime = firstBar.timestamp || firstBar.datetime;
        console.log(`[BetterTickChart] Loading more data before ${new Date(finishTime).toLocaleString()}`);

        try {
            const olderData = await requestHistoricalBars({
                finish: Math.floor(finishTime),
                limit: 2000, // Load 2000 older bars
            });

            if (olderData && olderData.length > 0) {
                console.log(`[BetterTickChart] Loaded ${olderData.length} older bars`);

                const existingTimestamps = new Set(rawDataRef.current.map((bar) => bar?.timestamp || bar?.datetime));
                const uniqueOlderData = olderData.filter((bar) => !existingTimestamps.has(bar?.timestamp || bar?.datetime));
                const mergedServerBars = normalizeBetterTickBars(mergeBarsByTimestamp([...uniqueOlderData, ...rawDataRef.current]));
                rawDataRef.current = mergedServerBars;
                setCandleData(mergedServerBars);
            } else {
                console.log("[BetterTickChart] No more historical data available");
            }
            loadingRef.current = false;
            setIsLoading(false);
        } catch (error) {
            console.error("[BetterTickChart] Failed to load more data:", error);
            loadingRef.current = false;
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Create an abort controller for this effect
        const requestKey = `${symbol}-${Date.now()}`;
        rawDataRef.current = [];
        setCandleData([]);
        loadingRef.current = false;

        console.log("[BetterTickChart] State cleared, calling fetchData");
        liveJoinBufferRef.current = [];
        fetchData({ symbol: symbol, limit: 2000 });

        // Cleanup function - abort the fetch if component unmounts or deps change
        return () => {
            console.log("[BetterTickChart] Effect cleanup - aborting fetch", { requestKey });
        };
    }, [fetchData, join, symbol]);

    // Separate effect for socket listeners
    useEffect(() => {
        if (!fullSymbol) return;
        console.log("[BetterTickChart] Setting up socket listeners", {
            symbol,
            fullSymbol,
            exchange,
            hasPixiDataRef: !!pixiDataRef.current,
        });

        // Register with server to receive tick bar updates
        Socket.emit("requestTickBarUpdate", {
            symbol: fullSymbol,
            barTypeSpecifier: 100,
            exchange: exchange,
        });
        console.log("[BetterTickChart] Emitted requestTickBarUpdate", { symbol: fullSymbol, exchange });

        // Listen for new COMPLETE 100-tick bars from server
        // Server emits: new-100-${fullSymbol}-tickBar (e.g., "new-100-ESZ5-tickBar")
        const tickBarEvent = `new-100-${fullSymbol}-tickBar`;
        console.log(`[BetterTickChart] Listening for event: "${tickBarEvent}"`);

        const handleNew100TickBar = (data) => {
            // console.log("[BetterTickChart] handleNew100TickBar called", {
            //     dataSymbol: data.symbol,
            //     symbol,
            //     fullSymbol,
            //     hasPixiDataRef: !!pixiDataRef.current,
            // });

            // Check symbol match - data.symbol from server uses FULL symbol (e.g., "ESZ5")
            if (data.symbol !== fullSymbol) {
                console.warn(
                    `[BetterTickChart] ❌ Symbol mismatch - data.symbol="${data.symbol}" !== fullSymbol="${fullSymbol}" - ignoring`
                );
                return;
            }

            if (!pixiDataRef.current) {
                console.warn("[BetterTickChart] ❌ pixiDataRef.current not initialized - ignoring update");
                return;
            }

            if (join === 1) {
                const previousBar = rawDataRef.current[rawDataRef.current.length - 1] || {};
                const normalizedBar = normalizeBetterTickBars([data], {
                    startingCumulativeDelta: previousBar.cumulativeDelta || 0,
                    startingProRun: previousBar.volumeProRun || 0,
                    startingAmRun: previousBar.volumeAmRun || 0,
                })[0];
                rawDataRef.current = [...rawDataRef.current, normalizedBar];
                // No combining - use the complete 100-tick bar directly
                pixiDataRef.current.setCompleteBar(normalizedBar);
                pixiDataRef.current.updateCurrentPriceLabel(normalizedBar.close);
            } else {
                liveJoinBufferRef.current = [...liveJoinBufferRef.current, data];
                const inProgressBar = buildCombinedBar(liveJoinBufferRef.current);
                if (!inProgressBar) return;

                if (liveJoinBufferRef.current.length >= join) {
                    const previousBar = rawDataRef.current[rawDataRef.current.length - 1] || {};
                    const normalizedBar = normalizeBetterTickBars([inProgressBar], {
                        startingCumulativeDelta: previousBar.cumulativeDelta || 0,
                        startingProRun: previousBar.volumeProRun || 0,
                        startingAmRun: previousBar.volumeAmRun || 0,
                    })[0];
                    console.log("[BetterTickChart] Completed joined live bar", normalizedBar);
                    rawDataRef.current = [...rawDataRef.current, normalizedBar];
                    liveJoinBufferRef.current = [];
                    pixiDataRef.current.setCompleteBar(normalizedBar);
                    pixiDataRef.current.updateCurrentPriceLabel(normalizedBar.close);
                } else {
                    console.log("[BetterTickChart] Updating joined live bar", inProgressBar);
                    pixiDataRef.current.newTick({
                        lastPrice: inProgressBar.close,
                        high: inProgressBar.high,
                        low: inProgressBar.low,
                        volume: 0, // Already included in combined bar
                        datetime: inProgressBar.datetime,
                        timestamp: inProgressBar.timestamp,
                    });
                    pixiDataRef.current.updateCurrentPriceLabel(inProgressBar.close);
                }
            }
        };

        // Listen for 1-second price updates - updates temporary bar
        // Pattern: 1s-{symbol}-LiveBarUpdate (separate from time bars)
        const liveBarUpdateEvent = `1s-${symbol}-LiveBarUpdate`;
        const handleLiveBarUpdate = (tick) => {
            // console.log(`[BetterTickChart] ${liveBarUpdateEvent} received`, { tick, hasPixiDataRef: !!pixiDataRef.current });
            if (!pixiDataRef.current) return;

            const lastPrice = tick.lastPrice || tick.close || tick.last;
            if (!lastPrice) return;

            // newTick will automatically create/update the temporary bar
            pixiDataRef.current.newTick({
                lastPrice: lastPrice,
                volume: tick.volume || 0,
                datetime: tick.datetime || Date.now(),
                timestamp: tick.timestamp || Date.now(),
            });
        };

        const depthSignalEvents = [...new Set([`depthTradeSignal-${symbol}`, fullSymbol ? `depthTradeSignal-${fullSymbol}` : null].filter(Boolean))];
        const handleDepthSignal = (signal) => {
            const normalizedSignal = normalizeDepthSignal(signal);
            if (!normalizedSignal) return;

            const signalKey = getDepthSignalKey(normalizedSignal);
            if (seenDepthSignalKeysRef.current.has(signalKey)) return;
            seenDepthSignalKeysRef.current.add(signalKey);

            pendingDepthSignalsRef.current = [...pendingDepthSignalsRef.current.slice(-99), normalizedSignal];

            if (depthSignalsDrawRef.current) {
                depthSignalsDrawRef.current.pushSignal(normalizedSignal);
            }
        };

        Socket.on(tickBarEvent, handleNew100TickBar);
        Socket.on(liveBarUpdateEvent, handleLiveBarUpdate);
        depthSignalEvents.forEach((eventName) => Socket.on(eventName, handleDepthSignal));

        return () => {
            console.log("[BetterTickChart] Cleaning up socket listeners", { tickBarEvent, liveBarUpdateEvent, depthSignalEvents });
            Socket.off(tickBarEvent, handleNew100TickBar);
            Socket.off(liveBarUpdateEvent, handleLiveBarUpdate);
            depthSignalEvents.forEach((eventName) => Socket.off(eventName, handleDepthSignal));
        };
    }, [symbol, fullSymbol, join, Socket, exchange, getDepthSignalKey, normalizeDepthSignal, buildCombinedBar]); // IMPORTANT: Don't include pixiDataRef.current!

    // Note: Server event patterns
    // Time-based charts: ${timeframe}-${symbol}-LiveBarNew (e.g., "1m-ES-LiveBarNew", "5m-YMZ5-LiveBarNew")
    // Tick charts: new-100-${fullSymbol}-tickBar (e.g., "new-100-ESZ5-tickBar", "new-100-NQZ5-tickBar")
    // Live updates: 1s-${fullSymbol}-LiveBarUpdate (e.g., "1s-ESZ5-LiveBarUpdate")

    const joinOptions = [1, 5, 10, 15, 20];

    const TickJoinBtn = ({ isActive, value, label }) => (
        <div className="col-auto">
            <IconButton borderColor={isActive ? "green" : false} title={label} onClick={() => setJoin(value)} text={label} />
        </div>
    );

    // const canRenderChart = dataSymbol === symbol && candleData.length > 0;
    return (
        <div style={{ width: "100%" }}>
            <div className="row g-0 align-items-center">
                <div className="col-auto">
                    <IndicatorsBtns
                        indicators={indicators}
                        toggleIndicator={toggleIndicator}
                        timeframe="tick"
                        updateIndicatorOptions={updateIndicatorOptions}
                    />
                </div>
                {joinOptions.map((value) => (
                    <TickJoinBtn key={value} isActive={join === value} value={value} label={value === 1 ? "1" : `${value}`} />
                ))}
                {/* Date Range Toggle */}
                <div className="col-auto" style={{ position: "relative" }}>
                    <button
                        onClick={() => setShowDateRange((v) => !v)}
                        title="Load Date Range"
                        style={{
                            background: showDateRange ? "steelblue" : "#333",
                            border: "1px solid #555",
                            borderRadius: "4px",
                            color: "#fff",
                            cursor: "pointer",
                            padding: "4px 8px",
                            display: "flex",
                            alignItems: "center",
                            fontSize: "12px",
                        }}
                    >
                        <MdDateRange size={16} />
                    </button>
                    {showDateRange && (
                        <div
                            style={{
                                position: "absolute",
                                top: "100%",
                                left: 0,
                                zIndex: 10000,
                                background: "#222",
                                border: "1px solid #555",
                                borderRadius: "4px",
                                padding: "8px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "6px",
                                minWidth: "240px",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                            }}
                        >
                            <label style={{ color: "#aaa", fontSize: "11px" }}>
                                Start Date
                                <input type="date" value={drStartTime} onChange={(e) => setDrStartTime(e.target.value)} style={{ display: "block", width: "100%", padding: "4px", background: "#333", color: "#fff", border: "1px solid #555", borderRadius: "3px", fontSize: "12px" }} />
                            </label>
                            <label style={{ color: "#aaa", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>
                                <input type="checkbox" checked={drUseNumDays} onChange={(e) => setDrUseNumDays(e.target.checked)} />
                                Days
                                <input type="number" min="1" value={drNumDays} onChange={(e) => setDrNumDays(e.target.value)} disabled={!drUseNumDays} style={{ width: "50px", padding: "4px", background: drUseNumDays ? "#333" : "#222", color: drUseNumDays ? "#fff" : "#666", border: "1px solid #555", borderRadius: "3px", fontSize: "12px" }} />
                            </label>
                            {!drUseNumDays && (
                                <label style={{ color: "#aaa", fontSize: "11px" }}>
                                    End Date
                                    <input type="date" value={drEndTime} onChange={(e) => setDrEndTime(e.target.value)} style={{ display: "block", width: "100%", padding: "4px", background: "#333", color: "#fff", border: "1px solid #555", borderRadius: "3px", fontSize: "12px" }} />
                                </label>
                            )}
                            <button onClick={handleDateRangeSubmit} style={{ padding: "5px 12px", background: "#0066cc", color: "#fff", border: "none", borderRadius: "3px", cursor: "pointer", fontSize: "12px" }}>
                                Load
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <div style={{ border: "1px solid #444", width: "100%", height: "100%", minHeight: 0 }}>
                <GenericPixiChart
                    name="BetterTickChart"
                    key={`${symbol}-${join}`}
                    ohlcDatas={candleData}
                    height={height}
                    symbol={symbol}
                    fullSymbol={fullSymbol}
                    pixiDataRef={pixiDataRef}
                    tickSize={0.01}
                    Socket={Socket}
                    lowerIndicators={lowerIndicators}
                    loadMoreData={loadMoreData}
                    onTimeRangeChange={handleTimeRangeChange}
                    hideTimeRangeOverlay={true}
                    isLoading={isLoading}
                    exchange={exchange}
                    sendOrder={sendFuturesOrder}
                    options={{
                        withoutVolume: true,
                        chartType: "OHLC",
                        axisFontSizes: {
                            x: 12,
                        },
                    }}
                    margin={{ top: 50, right: 50, left: 0, bottom: 40 }}
                />
            </div>
        </div>
    );
};

export default BetterTickChart;
