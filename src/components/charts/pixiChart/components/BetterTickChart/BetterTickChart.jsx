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
import { sendFuturesOrder } from "../sendFuturesOrder";
import { createDualHistogramDrawFn } from "../drawFns";
// import { liquidityHeatMapConfig } from "../indicatorConfigs";

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
    const rawDataRef = useRef([]); // Raw 100-tick bars from server (used for combining)
    const depthSignalsDrawRef = useRef(null);
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

                    // If the indicator is enabled and has an instance, update it
                    if (updatedIndicator.enabled && updatedIndicator.instanceRef) {
                        const instance = updatedIndicator.instanceRef;

                        // Update visualization mode if changed (for liquidity heatmap)
                        if (newOptions.visualizationMode && instance.setVisualizationMode) {
                            instance.setVisualizationMode(newOptions.visualizationMode);
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

    useEffect(() => {
        const ordersInstance = ordersIndicator?.instanceRef;
        if (!ordersInstance || !ordersIndicator?.enabled) return;

        console.log("[BetterTickChart] Drawing orders on chart", {
            baskets: Object.keys(ordersFromParent || {}).length,
            fullSymbol,
        });
        ordersInstance.draw(ordersFromParent || {});
    }, [ordersIndicator?.enabled, ordersIndicator?.instanceRef, ordersFromParent, fullSymbol]);

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
    });

    useLiquidityRatios({
        symbol,
        Socket,
        pixiDataRef,
        enabled: true,
        timeframe: "tick",
        ohlcData: candleData,
    });

    const lowerIndicators = useMemo(() => {
        return [
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

    // Function to combine bars on the frontend
    const combineBars = (bars, joinValue) => {
        if (joinValue <= 1 || bars.length === 0) return bars;

        const combined = [];
        for (let i = 0; i < bars.length; i += joinValue) {
            const barsToJoin = bars.slice(i, i + joinValue);
            if (barsToJoin.length === 0) continue;

            const combinedBar = {
                open: barsToJoin[0].open,
                high: Math.max(...barsToJoin.map((b) => b.high)),
                low: Math.min(...barsToJoin.map((b) => b.low)),
                close: barsToJoin[barsToJoin.length - 1].close,
                volume: barsToJoin.reduce((sum, b) => sum + (b.volume || 0), 0),
                datetime: barsToJoin[barsToJoin.length - 1].datetime,
                timestamp: barsToJoin[barsToJoin.length - 1].timestamp || barsToJoin[barsToJoin.length - 1].datetime,
                symbol: barsToJoin[0].symbol,
            };
            combined.push(combinedBar);
        }
        return combined;
    };

    const fetchData = async (opts = {}) => {
        const { symbol, limit = 2000 } = opts;
        console.log("[BetterTickChart] fetchData called", {
            symbol,
        });

        // Mark this request as active
        loadingRef.current = true;
        setIsLoading(true);

        try {
            console.log("[BetterTickChart] Calling API.getCustomTicks with:", opts);
            const data = await API.getCustomTicks(opts);

            console.log("[BetterTickChart] API.getCustomTicks returned:", {
                dataLength: data?.length,
                firstItem: data?.[0],
                lastItem: data?.[data?.length - 1],
            });

            rawDataRef.current = data;
            const combined = combineBars(data, join);

            console.log("[BetterTickChart] Combined bars:", {
                combinedLength: combined.length,
                join,
                firstCombined: combined[0],
                lastCombined: combined[combined.length - 1],
            });

            setCandleData(combined);
            // setDataSymbol(symbol);
            console.log("[BetterTickChart] State updated - candleData and dataSymbol set");
        } catch (error) {
            console.error("[BetterTickChart] fetchData error:", error);
        } finally {
            // Only clear loading if this is still the active request

            console.log("[BetterTickChart] fetchData end - NOT clearing flags (superseded)");
            loadingRef.current = false;
            setIsLoading(false);
        }
    };

    // Handler for time range changes from the GenericPixiChart
    const handleTimeRangeChange = async ({ startTime, endTime }) => {
        console.log(
            `[BetterTickChart] Loading data for time range: ${new Date(startTime).toLocaleString()} to ${new Date(
                endTime
            ).toLocaleString()}`
        );

        try {
            const data = await API.getCustomTicks({
                symbol,
                start: Math.floor(startTime),
                finish: Math.floor(endTime),
                limit: 10000, // Allow larger limit for custom time ranges
            });

            if (data && data.length > 0) {
                console.log(`[BetterTickChart] Loaded ${data.length} bars for time range`);
                rawDataRef.current = data;
                const combined = combineBars(data, join);
                debugger;
                setCandleData(combined);
                // setDataSymbol(symbol);
            } else {
                console.log("[BetterTickChart] No data available for selected time range");
                alert("No data available for selected time range");
            }
        } catch (error) {
            console.error("[BetterTickChart] Failed to load time range data:", error);
            alert("Failed to load data for selected time range");
        }
    };

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
            const olderData = await API.getCustomTicks({
                symbol,
                finish: Math.floor(finishTime),
                limit: 2000, // Load 2000 older bars
            });

            if (olderData && olderData.length > 0) {
                console.log(`[BetterTickChart] Loaded ${olderData.length} older bars`);

                // Prepend older data to raw data
                rawDataRef.current = [...olderData, ...rawDataRef.current];

                // Recombine all bars with current join value
                const combined = combineBars(rawDataRef.current, join);

                // Combine the older data with the current join value
                const combinedOlderData = combineBars(olderData, join);

                // Update the data handler - same as old version
                if (pixiDataRef.current) {
                    pixiDataRef.current.sliceStart += combinedOlderData.length;
                    pixiDataRef.current.sliceEnd += combinedOlderData.length;
                    pixiDataRef.current.ohlcDatas = combinedOlderData.concat(pixiDataRef.current.ohlcDatas);
                    pixiDataRef.current.draw();
                }

                debugger;
                setCandleData(combined);
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
        fetchData({ symbol: symbol, limit: 2000 });

        // Cleanup function - abort the fetch if component unmounts or deps change
        return () => {
            console.log("[BetterTickChart] Effect cleanup - aborting fetch", { requestKey });
        };
    }, [symbol]);

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

            // Add new complete 100-tick bar to raw data (used for combining when join > 1)
            // rawDataRef.current.push(data);
            // console.log("[BetterTickChart] New 100-tick bar received:", data);

            if (join === 1) {
                // No combining - use the complete 100-tick bar directly
                // setCompleteBar handles adding/replacing the bar in the chart's internal data
                // No need to call setCandleData - chart manages its own data after init
                // console.log("[BetterTickChart] Processing complete 100-tick bar (join=1)");
                pixiDataRef.current.setCompleteBar(data);
                pixiDataRef.current.updateCurrentPriceLabel(data.close);
            } else {
                // Combining multiple 100-tick bars
                const totalBars = rawDataRef.current.length;
                const lastCombinedStartIndex = Math.floor((totalBars - 1) / join) * join;
                const barsForLastCombined = rawDataRef.current.slice(lastCombinedStartIndex);
                const isNewCombinedBar = barsForLastCombined.length === 1; // First bar of a new combined bar

                const lastCombinedBar = {
                    open: barsForLastCombined[0].open,
                    high: Math.max(...barsForLastCombined.map((b) => b.high)),
                    low: Math.min(...barsForLastCombined.map((b) => b.low)),
                    close: barsForLastCombined[barsForLastCombined.length - 1].close,
                    volume: barsForLastCombined.reduce((sum, b) => sum + (b.volume || 0), 0),
                    datetime: barsForLastCombined[barsForLastCombined.length - 1].datetime,
                    timestamp:
                        barsForLastCombined[barsForLastCombined.length - 1].timestamp ||
                        barsForLastCombined[barsForLastCombined.length - 1].datetime,
                    symbol: data.symbol,
                };

                if (isNewCombinedBar) {
                    // Starting a new combined bar - this is a complete bar
                    console.log("[BetterTickChart] New combined bar starting", lastCombinedBar);
                    // setCompleteBar handles adding the bar - no setCandleData needed
                    pixiDataRef.current.setCompleteBar(lastCombinedBar);
                    pixiDataRef.current.updateCurrentPriceLabel(lastCombinedBar.close);
                } else {
                    // Still building the current combined bar - update it with newTick
                    console.log("[BetterTickChart] Updating combined bar", lastCombinedBar);
                    // newTick updates the existing temp bar in place - no setCandleData needed
                    pixiDataRef.current.newTick({
                        lastPrice: lastCombinedBar.close,
                        high: lastCombinedBar.high,
                        low: lastCombinedBar.low,
                        volume: 0, // Already included in combined bar
                        datetime: lastCombinedBar.datetime,
                        timestamp: lastCombinedBar.timestamp,
                    });
                    pixiDataRef.current.updateCurrentPriceLabel(lastCombinedBar.close);
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
    }, [symbol, fullSymbol, join, Socket, exchange, getDepthSignalKey, normalizeDepthSignal]); // IMPORTANT: Don't include pixiDataRef.current!

    // Note: Server event patterns
    // Time-based charts: ${timeframe}-${symbol}-LiveBarNew (e.g., "1m-ES-LiveBarNew", "5m-YMZ5-LiveBarNew")
    // Tick charts: new-100-${fullSymbol}-tickBar (e.g., "new-100-ESZ5-tickBar", "new-100-NQZ5-tickBar")
    // Live updates: 1s-${fullSymbol}-LiveBarUpdate (e.g., "1s-ESZ5-LiveBarUpdate")

    // Effect to recombine bars when join value changes
    // This triggers a chart remount (via key change) with the newly combined data
    useEffect(() => {
        if (rawDataRef.current.length > 0) {
            console.log("[BetterTickChart] Join value changed, recombining bars", {
                join,
                rawBarsCount: rawDataRef.current.length,
            });
            const combined = combineBars(rawDataRef.current, join);
            console.log("[BetterTickChart] Recombined into", combined.length, "bars");
            setCandleData(combined);
        }
    }, [join]);

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
                        withoutVolume: false,
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
