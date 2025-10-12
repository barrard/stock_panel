import { useEffect, useRef } from "react";
import API from "../../API";

/**
 * Custom hook to manage liquidity data fetching, caching, and socket updates
 *
 * @param {Object} params
 * @param {Object} params.liquidityHeatmapIndicator - The indicator config object
 * @param {string} params.symbol - Symbol to fetch data for
 * @param {string} params.timeframe - Timeframe ('1m', '5m', 'tick', etc.)
 * @param {Array} params.ohlcData - OHLC data array (for date range)
 * @param {Object} params.Socket - Socket.io instance
 * @param {Object} params.indicatorsRef - Ref to indicators array (for socket handlers)
 * @param {Function} params.fetchLiveDataAndUpdate - Optional: Function to fetch more OHLC data (PixiChartV2 only)
 */
export const useLiquidityData = ({
    liquidityHeatmapIndicator,
    symbol,
    timeframe,
    ohlcData,
    Socket,
    indicatorsRef,
    fetchLiveDataAndUpdate,
}) => {
    // Cache for liquidity data (persists across indicator toggles)
    const liquidityDataCacheRef = useRef({
        history: [], // Historical compiled data from API
        hasLoaded: false, // Flag to track if we've fetched from server
        symbol: null, // Track which symbol this cache is for
        timeframe: null, // Track which timeframe this cache is for
        lastFetchTime: null, // Track when we last fetched data
        endDatetime: null, // Track the end datetime of cached data
    });

    // Fetch initial liquidity data when indicator is enabled
    useEffect(() => {
        const heatmapInstance = liquidityHeatmapIndicator?.instanceRef;

        if (!heatmapInstance || !liquidityHeatmapIndicator?.enabled || !ohlcData.length) {
            return;
        }

        const cache = liquidityDataCacheRef.current;

        // Check if cache is invalid (symbol or timeframe changed)
        if (cache.symbol !== symbol || cache.timeframe !== timeframe) {
            // Clear cache for new symbol/timeframe
            cache.history = [];
            cache.hasLoaded = false;
            cache.symbol = symbol;
            cache.timeframe = timeframe;
        }

        // Check if we need to fetch more OHLC bars (if cache indicates we have data beyond current OHLC range)
        // Only relevant for PixiChartV2 with compiled timeframes
        const currentStartDatetime = ohlcData[0].timestamp || ohlcData[0].datetime;
        const currentEndDatetime = ohlcData[ohlcData.length - 1].timestamp || ohlcData[ohlcData.length - 1].datetime;

        if (fetchLiveDataAndUpdate && cache.endDatetime && cache.endDatetime - 1000 * 60 * 30 > currentEndDatetime) {
            console.log(
                `[useLiquidityData] Detected missing OHLC data - cache ends at ${new Date(
                    cache.endDatetime
                ).toLocaleTimeString()}, OHLC ends at ${new Date(currentEndDatetime).toLocaleTimeString()}`
            );
            // Trigger OHLC data fetch (this will re-run this effect with updated ohlcData)
            fetchLiveDataAndUpdate();
            return;
        }

        // Cache staleness check - determine if we need to fetch new data
        const now = Date.now();
        const CACHE_STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

        const isCacheStale =
            !cache.hasLoaded ||
            !cache.history.length ||
            !cache.lastFetchTime ||
            now - cache.lastFetchTime > CACHE_STALE_THRESHOLD ||
            (cache.endDatetime && currentEndDatetime > cache.endDatetime);

        // Check cache first - if we have fresh data, use it
        if (cache.hasLoaded && cache.history.length > 0 && !isCacheStale) {
            console.log(`[useLiquidityData] Loading liquidity data from cache (fresh) - ${cache.history.length} items`);
            heatmapInstance.setLiquidityHistory(cache.history);
            heatmapInstance.draw(true);
            return;
        }

        // Cache is stale or missing - fetch from API
        const fetchLiquidityData = async () => {
            try {
                const startTime = ohlcData[0].timestamp || ohlcData[0].datetime;
                const endTime = ohlcData[ohlcData.length - 1].timestamp || ohlcData[ohlcData.length - 1].datetime;

                console.log(`[useLiquidityData] Fetching liquidity data from API for ${symbol} (${timeframe})`);
                const liquidityData = await API.getOrderFlow({
                    start: startTime,
                    end: endTime,
                    symbol: symbol,
                    compiled: timeframe, // Get pre-compiled data from server
                });

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

                        return {
                            datetime: datetime ? new Date(datetime).getTime() : null,
                            liquidity,
                            // Store the extra metrics for future use (only present in compiled data)
                            metrics: bar.bidSizeOrderRatio ? {
                                bidSizeOrderRatio: bar.bidSizeOrderRatio,
                                askSizeOrderRatio: bar.askSizeOrderRatio,
                                bidSizeToAskSizeRatio: bar.bidSizeToAskSizeRatio,
                                bidOrderToAskOrderRatio: bar.bidOrderToAskOrderRatio,
                                bidSizeToAskSizeRatioMA: bar.bidSizeToAskSizeRatioMA,
                                delta: bar.delta,
                            } : undefined,
                        };
                    });

                    // Store in cache with metadata
                    cache.history = transformedData;
                    cache.hasLoaded = true;
                    cache.lastFetchTime = Date.now();
                    cache.endDatetime = endTime;

                    console.log(`[useLiquidityData] Stored ${transformedData.length} bars in cache`);

                    // Load into heatmap
                    heatmapInstance.setLiquidityHistory(transformedData);
                    heatmapInstance.draw(true);
                }
            } catch (error) {
                console.error(`[useLiquidityData] Failed to fetch liquidity data:`, error);
            }
        };

        fetchLiquidityData();
    }, [liquidityHeatmapIndicator?.enabled, liquidityHeatmapIndicator?.instanceRef, symbol, timeframe, ohlcData.length]);

    // Socket listener for real-time liquidity updates
    useEffect(() => {
        if (!liquidityHeatmapIndicator?.enabled || !Socket) return;

        const liquidityEventName = `liquidity-${symbol}`;
        console.log(`[useLiquidityData] Registering liquidity listener for event: ${liquidityEventName}`);

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
                // For minute-based timeframes, align to minute boundary
                const barDatetime = new Date(datetime);
                if (timeframe !== 'tick') {
                    barDatetime.setSeconds(0, 0);
                }
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
            // Use ref to get current indicators without causing re-renders
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
            Socket.off(liquidityEventName, handleLiquidityData);
        };
    }, [liquidityHeatmapIndicator?.enabled, symbol, timeframe, Socket, indicatorsRef]);

    return liquidityDataCacheRef;
};
