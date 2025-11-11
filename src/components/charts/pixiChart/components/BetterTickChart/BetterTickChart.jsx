import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import GenericPixiChart from "../../../GenericPixiChart";
import API from "../../../../API";
import { IconButton } from "../../../../StratBuilder/components";
import IndicatorsBtns from "../IndicatorsBtns";
import { useToggleIndicator } from "../../../hooks/useToggleIndicator";
import { useIndicator } from "../../../hooks/useIndicator";
import { useLiquidityData } from "../../../hooks/useLiquidityData";
import { LiquidityHeatmap, liquidityHeatMapConfig } from "../indicatorDrawFunctions";
import DrawOrdersV2 from "../DrawOrdersV2";
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
    const [isLoading, setIsLoading] = useState(false);
    const [join, setJoin] = useState(1);
    const rawDataRef = useRef([]); // Raw 100-tick bars from server (used for combining)

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
        // Add more indicators here as needed
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

    const symbolFilteredOrders = useMemo(() => {
        if (!ordersFromParent || !fullSymbol) return {};
        const filtered = {};
        Object.keys(ordersFromParent).forEach((basketId) => {
            const orderArray = ordersFromParent[basketId];
            if (!Array.isArray(orderArray) || orderArray.length === 0) return;

            const matchesSymbol = orderArray.some((orderEvent) => {
                const eventSymbol = orderEvent?.symbol || orderEvent?.fullSymbol;
                return eventSymbol && eventSymbol === fullSymbol;
            });

            if (matchesSymbol) {
                filtered[basketId] = orderArray;
            }
        });
        console.log("[BetterTickChart] Filtered orders", {
            total: Object.keys(ordersFromParent).length,
            filtered: Object.keys(filtered).length,
            fullSymbol,
        });
        return filtered;
    }, [ordersFromParent, fullSymbol]);

    // Keep a ref to indicators to avoid stale closures in socket handlers
    const indicatorsRef = useRef(indicators);
    useEffect(() => {
        indicatorsRef.current = indicators;
    }, [indicators]);

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

    useEffect(() => {
        const ordersInstance = ordersIndicator?.instanceRef;
        if (!ordersInstance || !ordersIndicator?.enabled) return;

        console.log("[BetterTickChart] Drawing orders on chart", {
            baskets: Object.keys(symbolFilteredOrders).length,
            fullSymbol,
        });
        ordersInstance.draw(symbolFilteredOrders);
    }, [ordersIndicator?.enabled, ordersIndicator?.instanceRef, symbolFilteredOrders, fullSymbol]);

    // Use the liquidity data hook for fetching and caching
    useLiquidityData({
        liquidityHeatmapIndicator,
        symbol,
        timeframe: "tick",
        ohlcData: candleData,
        Socket,
        indicatorsRef,
    });

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
        debugger;
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

        Socket.on(tickBarEvent, handleNew100TickBar);
        Socket.on(liveBarUpdateEvent, handleLiveBarUpdate);

        return () => {
            console.log("[BetterTickChart] Cleaning up socket listeners", { tickBarEvent, liveBarUpdateEvent });
            Socket.off(tickBarEvent, handleNew100TickBar);
            Socket.off(liveBarUpdateEvent, handleLiveBarUpdate);
        };
    }, [symbol, fullSymbol, join, Socket, exchange]); // IMPORTANT: Don't include pixiDataRef.current!

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
    const canRenderChart = candleData.length > 0;

    return (
        <div style={{ width: "100%" }}>
            <div className="row g-0">
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
            </div>
            <div style={{ border: "1px solid white", width: "100%", minHeight: `${height}px` }}>
                {canRenderChart ? (
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
                        loadMoreData={loadMoreData}
                        onTimeRangeChange={handleTimeRangeChange}
                        isLoading={isLoading}
                        options={{
                            withoutVolume: false,
                            chartType: "OHLC",
                        }}
                        margin={{ top: 50, right: 100, left: 0, bottom: 40 }}
                    />
                ) : (
                    <div className="d-flex align-items-center justify-content-center h-100 text-muted">Loading {symbol} tick data...</div>
                )}
            </div>
        </div>
    );
};

export default BetterTickChart;
