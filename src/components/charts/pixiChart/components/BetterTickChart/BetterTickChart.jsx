import React, { useState, useEffect, useRef, useCallback } from "react";
import GenericPixiChart from "../../../GenericPixiChart";
import API from "../../../../API";
import { IconButton } from "../../../../StratBuilder/components";
import IndicatorsBtns from "../IndicatorsBtns";
import { useToggleIndicator } from "../../../hooks/useToggleIndicator";
import { useIndicator } from "../../../hooks/useIndicator";
import { LiquidityHeatmap, liquidityHeatMapConfig } from "../indicatorDrawFunctions";
// import { liquidityHeatMapConfig } from "../indicatorConfigs";

const BetterTickChart = (props) => {
    const { height = 400, symbol = "SPY", Socket, fullSymbolRef } = props;

    const pixiDataRef = useRef();
    const [candleData, setCandleData] = useState([]);
    const [join, setJoin] = useState(1);
    const rawDataRef = useRef([]);

    // Cache for liquidity data (persists across indicator toggles)
    const liquidityDataCacheRef = useRef({
        history: [], // Historical compiled data from API
        hasLoaded: false, // Flag to track if we've fetched from server
        symbol: null, // Track which symbol this cache is for
        lastFetchTime: null, // Track when we last fetched data
        endDatetime: null, // Track the end datetime of cached data
    });

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

    // Fetch initial liquidity data when indicator is enabled
    useEffect(() => {
        const heatmapInstance = liquidityHeatmapIndicator?.instanceRef;

        if (!heatmapInstance || !liquidityHeatmapIndicator?.enabled || !candleData.length) {
            return;
        }

        const cache = liquidityDataCacheRef.current;

        // Check if cache is invalid (symbol changed)
        if (cache.symbol !== symbol) {
            // Clear cache for new symbol
            cache.history = [];
            cache.hasLoaded = false;
            cache.symbol = symbol;
        }

        // Cache staleness check
        const now = Date.now();
        const CACHE_STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

        const isCacheStale =
            !cache.hasLoaded || !cache.history.length || !cache.lastFetchTime || now - cache.lastFetchTime > CACHE_STALE_THRESHOLD;

        // Check cache first - if we have fresh data, use it
        if (cache.hasLoaded && cache.history.length > 0 && !isCacheStale) {
            console.log("[BetterTickChart] Loading liquidity data from cache (fresh)");
            console.log("[BetterTickChart] Cache has", cache.history.length, "items");
            if (cache.history.length > 0) {
                console.log("[BetterTickChart] First cache item datetime:", cache.history[0].datetime);
            }
            heatmapInstance.setLiquidityHistory(cache.history);
            heatmapInstance.draw(true);
            return;
        }

        // Cache is stale or missing - fetch from API
        const fetchLiquidityData = async () => {
            try {
                const startTime = candleData[0].timestamp || candleData[0].datetime;
                const endTime = candleData[candleData.length - 1].timestamp || candleData[candleData.length - 1].datetime;

                console.log("[BetterTickChart] Fetching liquidity data from API");
                const liquidityData = await API.getOrderFlow({
                    start: startTime,
                    end: endTime,
                    symbol: symbol,
                    compiled: "tick", // Get tick-level compiled data
                });

                // Log first item to see structure
                if (liquidityData && liquidityData.length > 0) {
                    console.log("[BetterTickChart] First liquidity item:", liquidityData[0]);
                    console.log("[BetterTickChart] All keys in first item:", Object.keys(liquidityData[0]));
                    console.log("[BetterTickChart] Full first item:", JSON.stringify(liquidityData[0], null, 2));
                }

                // Transform to our format
                if (liquidityData && Array.isArray(liquidityData)) {
                    const transformedData = liquidityData.map((bar) => {
                        const liquidity = {};

                        // Convert parallel arrays to price: {volume, orders} object
                        if (bar.orderPrices && bar.orderSizes) {
                            bar.orderPrices.forEach((price, index) => {
                                const volume = bar.orderSizes[index];
                                const orders = bar.orderCounts ? bar.orderCounts[index] : 0;
                                if (price !== undefined && volume !== undefined) {
                                    liquidity[price.toString()] = {
                                        volume,
                                        orders: orders || 0,
                                    };
                                }
                            });
                        }

                        // Handle different datetime field names
                        // For tick data, use createdAt; for compiled data, use datetime
                        const datetime = bar.createdAt || bar.datetime || bar.timestamp || bar.time || bar.dt;

                        if (!datetime) {
                            console.warn("[BetterTickChart] Missing datetime in bar:", bar);
                        }

                        return {
                            datetime: datetime ? new Date(datetime).getTime() : null,
                            liquidity,
                        };
                    });

                    // Store in cache
                    cache.history = transformedData;
                    cache.hasLoaded = true;
                    cache.lastFetchTime = Date.now();
                    cache.endDatetime = endTime;

                    console.log(`[BetterTickChart] Stored ${transformedData.length} bars in cache`);
                    if (transformedData.length > 0) {
                        console.log(`[BetterTickChart] First transformed item datetime:`, transformedData[0].datetime);
                        console.log(`[BetterTickChart] First transformed item liquidity keys:`, Object.keys(transformedData[0].liquidity).length);
                    }

                    // Load into heatmap
                    heatmapInstance.setLiquidityHistory(transformedData);
                    heatmapInstance.draw(true);
                }
            } catch (error) {
                console.error("[BetterTickChart] Failed to fetch liquidity data:", error);
            }
        };

        fetchLiquidityData();
    }, [liquidityHeatmapIndicator?.enabled, liquidityHeatmapIndicator?.instanceRef, symbol, candleData.length]);

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
        const data = await API.getCustomTicks(opts);
        console.log("BetterTickChart data loaded:", data);
        rawDataRef.current = data;
        const combined = combineBars(data, join);
        setCandleData(combined);
    };

    useEffect(() => {
        console.log("BetterTickChart loaded");
        fetchData({ symbol, limit: 2000 });

        Socket.on("better-tick", (data) => {
            console.log("better-tick", data);
            if (data.symbol !== symbol) return;

            // Add new bar to raw data
            rawDataRef.current.push(data);

            if (join === 1) {
                // No joining needed, just add the bar directly
                setCandleData((prev) => [...prev, data]);
                if (pixiDataRef.current) {
                    pixiDataRef.current.setNewBar(data);
                    pixiDataRef.current.updateCurrentPriceLabel(data.close);
                }
            } else {
                // Determine which bars should be in the last combined bar
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
                    // Add new combined bar
                    setCandleData((prev) => [...prev, lastCombinedBar]);
                } else {
                    // Update existing combined bar
                    setCandleData((prev) => {
                        const newData = [...prev];
                        newData[newData.length - 1] = lastCombinedBar;
                        return newData;
                    });
                }

                if (pixiDataRef.current) {
                    pixiDataRef.current.setNewBar(lastCombinedBar);
                    pixiDataRef.current.updateCurrentPriceLabel(lastCombinedBar.close);
                }
            }
        });

        // Liquidity data socket listener
        const liquidityEventName = `liquidity-${symbol}`;
        console.log(`[BetterTickChart] Registering liquidity listener for event: ${liquidityEventName}`);

        const handleLiquidityData = (liquidityData) => {
            // liquidityData format: { symbol, highLiquidity: [{p: price, size: volume, orders: count}], ... }
            if (liquidityData.symbol !== symbol || !liquidityData.highLiquidity) return;

            // Convert to our snapshot format: {datetime, liquidity: {price: {volume, orders}}}
            const datetime = Date.now();
            const liquidity = {};

            liquidityData.highLiquidity.forEach((level) => {
                liquidity[level.p.toString()] = {
                    volume: level.size,
                    orders: level.orders || 0,
                };
            });

            const snapshot = {
                datetime,
                liquidity,
            };

            // Always store socket data in cache (even if indicator is disabled)
            const cache = liquidityDataCacheRef.current;

            // Only cache if this matches current symbol
            if (cache.symbol === symbol) {
                // Determine which bar this snapshot belongs to
                const barDatetime = new Date(datetime);
                barDatetime.setSeconds(0, 0);
                const alignedDatetime = barDatetime.getTime();

                const existingBarIndex = cache.history.findIndex((bar) => bar.datetime === alignedDatetime);

                if (existingBarIndex >= 0) {
                    // Update existing bar (replace with latest snapshot)
                    cache.history[existingBarIndex] = { datetime: alignedDatetime, liquidity };
                } else {
                    // Add new bar
                    cache.history.push({ datetime: alignedDatetime, liquidity });

                    // Keep only recent history (e.g., last 500 bars)
                    if (cache.history.length > 500) {
                        cache.history.shift();
                    }
                }

                // Update cache metadata
                cache.endDatetime = Math.max(cache.endDatetime || 0, alignedDatetime);
                cache.lastFetchTime = Date.now();
            }

            // If indicator is enabled, also update the heatmap instance
            const currentHeatmapIndicator = indicatorsRef.current.find((ind) => ind.id === "liquidityHeatmap");
            const heatmapInstance = currentHeatmapIndicator?.instanceRef;

            if (heatmapInstance && heatmapInstance.addLiquiditySnapshot) {
                heatmapInstance.addLiquiditySnapshot(snapshot);
                // Manually trigger draw (only on socket updates, not on pan/zoom)
                heatmapInstance.draw();
            }
        };

        Socket.on(liquidityEventName, handleLiquidityData);

        return () => {
            Socket.off("better-tick");
            Socket.off(liquidityEventName, handleLiquidityData);
        };
    }, [symbol, join]);

    // Effect to recombine bars when join value changes
    useEffect(() => {
        if (rawDataRef.current.length > 0) {
            const combined = combineBars(rawDataRef.current, join);
            setCandleData(combined);
        }
    }, [join]);

    if (!candleData?.length) {
        return <div>Loading Better Tick Chart...</div>;
    }

    const joinOptions = [1, 5, 10, 15, 20];

    const TickJoinBtn = ({ isActive, value, label }) => (
        <div className="col-auto">
            <IconButton borderColor={isActive ? "green" : false} title={label} onClick={() => setJoin(value)} text={label} />
        </div>
    );

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
            <div style={{ border: "1px solid white", width: "100%" }}>
                <GenericPixiChart
                    ohlcDatas={candleData}
                    height={height}
                    symbol={symbol}
                    fullSymbolRef={fullSymbolRef}
                    pixiDataRef={pixiDataRef}
                    tickSize={0.01}
                    Socket={Socket}
                    options={{
                        withoutVolume: false,
                        chartType: "OHLC",
                    }}
                    margin={{ top: 50, right: 100, left: 0, bottom: 40 }}
                />
            </div>
        </div>
    );
};

export default BetterTickChart;
