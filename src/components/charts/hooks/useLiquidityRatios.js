import { useEffect, useRef } from "react";
import API from "../../API";

/**
 * Custom hook to capture liquidity ratios from socket data
 *
 * Listens to liquidity-{symbol} socket events and stores ratio data
 * on each OHLC bar for display as indicators
 *
 * Also fetches historical compiled data from the API to populate past bars
 *
 * @param {Object} params
 * @param {string} params.symbol - Symbol to listen for
 * @param {Object} params.Socket - Socket.io instance
 * @param {Object} params.pixiDataRef - Ref to GenericDataHandler
 * @param {boolean} params.enabled - Whether the hook is active
 * @param {string} params.timeframe - Current timeframe for API fetch
 * @param {Array} params.ohlcData - OHLC data for date range
 */
export const useLiquidityRatios = ({ symbol, Socket, pixiDataRef, enabled = true, timeframe, ohlcData }) => {
    const latestDataRef = useRef(null);
    const hasLoadedHistoricalRef = useRef(false);

    // Track snapshots for current bar to build OHLC
    const currentBarSnapshotsRef = useRef({
        datetime: null,
        snapshots: {
            delta: [],
            nearPriceBidSizeToAskSizeRatioMA: [],
            bidSizeToAskSizeRatioMA: [],
            bidSizeToAskSizeRatio: [],
        },
    });

    // Fetch historical compiled data from API
    useEffect(() => {
        // console.log(`[useLiquidityRatios] useEffect triggered - enabled: ${enabled}, ohlcData length: ${ohlcData?.length}, symbol: ${symbol}, timeframe: ${timeframe}`);

        if (!enabled || !ohlcData?.length || !symbol || !timeframe) {
            console.log(`[useLiquidityRatios] Skipping - conditions not met`);
            return;
        }

        // Reset flag when symbol/timeframe changes
        hasLoadedHistoricalRef.current = false;

        const fetchHistoricalRatios = async () => {
            try {
                if (!pixiDataRef?.current?.ohlcDatas) {
                    console.log(`[useLiquidityRatios] pixiDataRef.current.ohlcDatas not ready yet, will retry in 100ms`);
                    // Retry after a short delay
                    setTimeout(() => {
                        if (!hasLoadedHistoricalRef.current) {
                            fetchHistoricalRatios();
                        }
                    }, 100);
                    return;
                }

                // console.log(
                //     `[useLiquidityRatios] pixiDataRef.current.ohlcDatas is ready with ${pixiDataRef.current.ohlcDatas.length} bars`
                // );

                const startTime = ohlcData[0].timestamp || ohlcData[0].datetime;
                const endTime = ohlcData[ohlcData.length - 1].timestamp || ohlcData[ohlcData.length - 1].datetime;

                // console.log(
                //     `[useLiquidityRatios] Fetching historical ratio data for ${symbol} (${timeframe}), date range: ${new Date(
                //         startTime
                //     ).toLocaleString()} to ${new Date(endTime).toLocaleString()}`
                // );
                const liquidityData = await API.getLiquidityMetrics({
                    start: startTime,
                    end: endTime,
                    symbol: symbol,
                    timeframe: timeframe, // Get compiled OHLC data per timeframe
                });

                if (liquidityData && Array.isArray(liquidityData) && pixiDataRef?.current?.ohlcDatas) {
                    console.log(`[useLiquidityRatios] Received ${liquidityData.length} historical bars`);

                    // Create a map of datetime -> metrics for fast lookup
                    const metricsMap = new Map();
                    liquidityData.forEach((bar) => {
                        const datetime = bar.datetime || bar.createdAt || bar.timestamp;
                        if (datetime) {
                            // Server returns OHLC with _open, _high, _low, _close suffixes
                            metricsMap.set(new Date(datetime).getTime(), {
                                // Delta OHLC
                                delta: bar.delta_close,
                                deltaOpen: bar.delta_open,
                                deltaHigh: bar.delta_high,
                                deltaLow: bar.delta_low,
                                deltaClose: bar.delta_close,

                                // Near Price Ratio OHLC (nearPriceBidSizeToAskSizeRatioMA from server)
                                nearPriceBidSizeToAskSizeRatioMA: bar.nearPriceBidSizeToAskSizeRatioMA_close,
                                nearPriceRatioOpen: bar.nearPriceBidSizeToAskSizeRatioMA_open,
                                nearPriceRatioHigh: bar.nearPriceBidSizeToAskSizeRatioMA_high,
                                nearPriceRatioLow: bar.nearPriceBidSizeToAskSizeRatioMA_low,
                                nearPriceRatioClose: bar.nearPriceBidSizeToAskSizeRatioMA_close,

                                // Full Book Ratio OHLC (bidSizeToAskSizeRatioMA from server)
                                bidSizeToAskSizeRatioMA: bar.bidSizeToAskSizeRatioMA_close,
                                fullBookRatioOpen: bar.bidSizeToAskSizeRatioMA_open,
                                fullBookRatioHigh: bar.bidSizeToAskSizeRatioMA_high,
                                fullBookRatioLow: bar.bidSizeToAskSizeRatioMA_low,
                                fullBookRatioClose: bar.bidSizeToAskSizeRatioMA_close,

                                // Other fields (if you want to display them later)
                                bidSizeToAskSizeRatio: bar.bidSizeToAskSizeRatio_close,
                                nearPriceBidSizeToAskSizeRatio: bar.nearPriceBidSizeToAskSizeRatio_close,
                                bidOrderToAskOrderRatio: bar.bidOrderToAskOrderRatio_close,
                                runningOrderDepthCount: bar.runningOrderDepthCount_close,
                            });
                        }
                    });

                    // Populate all OHLC bars with matching metrics
                    let matchedCount = 0;
                    pixiDataRef.current.ohlcDatas.forEach((bar) => {
                        const barTime = bar.timestamp || bar.datetime;
                        const metrics = metricsMap.get(barTime);
                        if (metrics) {
                            Object.assign(bar, metrics);
                            matchedCount++;
                        }
                    });

                    // console.log(`[useLiquidityRatios] Populated ${matchedCount} bars with ratio data`);
                    hasLoadedHistoricalRef.current = true;

                    // Log a sample bar to verify data structure
                    const sampleBar = pixiDataRef.current.ohlcDatas.find((bar) => bar.deltaClose !== undefined);
                    if (sampleBar) {
                        // console.log(`[useLiquidityRatios] Sample bar after population:`, {
                        //     deltaOpen: sampleBar.deltaOpen,
                        //     deltaHigh: sampleBar.deltaHigh,
                        //     deltaLow: sampleBar.deltaLow,
                        //     deltaClose: sampleBar.deltaClose,
                        //     nearPriceRatioClose: sampleBar.nearPriceRatioClose,
                        //     fullBookRatioClose: sampleBar.fullBookRatioClose,
                        // });
                    }

                    // Trigger redraw
                    pixiDataRef.current.draw();
                }
            } catch (error) {
                console.error(`[useLiquidityRatios] Failed to fetch historical data:`, error);
            }
        };

        if (!hasLoadedHistoricalRef.current) {
            fetchHistoricalRatios();
        }
    }, [enabled, symbol, timeframe, ohlcData?.length]);

    // Helper function to calculate OHLC from array of values
    const calculateOHLC = (values) => {
        if (!values || values.length === 0) return null;
        return {
            open: values[0],
            high: Math.max(...values),
            low: Math.min(...values),
            close: values[values.length - 1],
        };
    };

    // Listen to real-time socket updates
    useEffect(() => {
        if (!Socket || !symbol || !enabled) return;

        const liquidityEventName = `liquidity-${symbol}`;
        console.log(`[useLiquidityRatios] Registering listener for: ${liquidityEventName}`);

        const handleLiquidityData = (liquidityData) => {
            // Check symbol matches
            if (liquidityData.symbol !== symbol) {
                return;
            }

            // Store the latest data
            latestDataRef.current = {
                delta: liquidityData.delta,
                nearPriceBidSizeToAskSizeRatioMA: liquidityData.nearPriceBidSizeToAskSizeRatioMA,
                bidSizeToAskSizeRatioMA: liquidityData.bidSizeToAskSizeRatioMA,
                bidSizeToAskSizeRatio: liquidityData.bidSizeToAskSizeRatio,
                nearPriceBidSizeToAskSizeRatio: liquidityData.nearPriceBidSizeToAskSizeRatio,
                bidOrderToAskOrderRatio: liquidityData.bidOrderToAskOrderRatio,
                bidSizeOrderRatio: liquidityData.bidSizeOrderRatio,
                askSizeOrderRatio: liquidityData.askSizeOrderRatio,
                timestamp: Date.now(),
            };

            // Update the last bar in the chart with the ratio data
            if (pixiDataRef?.current?.ohlcDatas) {
                const lastIndex = pixiDataRef.current.ohlcDatas.length - 1;
                if (lastIndex >= 0) {
                    const lastBar = pixiDataRef.current.ohlcDatas[lastIndex];
                    const barTime = lastBar.timestamp || lastBar.datetime;

                    // Check if we're on a new bar
                    const currentBarSnapshots = currentBarSnapshotsRef.current;
                    if (currentBarSnapshots.datetime !== barTime) {
                        // New bar - reset snapshots
                        currentBarSnapshots.datetime = barTime;
                        currentBarSnapshots.snapshots = {
                            delta: [],
                            nearPriceBidSizeToAskSizeRatioMA: [],
                            bidSizeToAskSizeRatioMA: [],
                            bidSizeToAskSizeRatio: [],
                        };
                    }

                    // Add current values to snapshot arrays
                    if (liquidityData.delta !== undefined && liquidityData.delta !== null) {
                        currentBarSnapshots.snapshots.delta.push(liquidityData.delta);
                    }
                    if (
                        liquidityData.nearPriceBidSizeToAskSizeRatioMA !== undefined &&
                        liquidityData.nearPriceBidSizeToAskSizeRatioMA !== null
                    ) {
                        currentBarSnapshots.snapshots.nearPriceBidSizeToAskSizeRatioMA.push(liquidityData.nearPriceBidSizeToAskSizeRatioMA);
                    }
                    if (liquidityData.bidSizeToAskSizeRatioMA !== undefined && liquidityData.bidSizeToAskSizeRatioMA !== null) {
                        currentBarSnapshots.snapshots.bidSizeToAskSizeRatioMA.push(liquidityData.bidSizeToAskSizeRatioMA);
                    }
                    if (liquidityData.bidSizeToAskSizeRatio !== undefined && liquidityData.bidSizeToAskSizeRatio !== null) {
                        currentBarSnapshots.snapshots.bidSizeToAskSizeRatio.push(liquidityData.bidSizeToAskSizeRatio);
                    }

                    // Calculate OHLC for delta
                    const deltaOHLC = calculateOHLC(currentBarSnapshots.snapshots.delta);
                    if (deltaOHLC) {
                        lastBar.deltaOpen = deltaOHLC.open;
                        lastBar.deltaHigh = deltaOHLC.high;
                        lastBar.deltaLow = deltaOHLC.low;
                        lastBar.deltaClose = deltaOHLC.close;
                        lastBar.delta = deltaOHLC.close; // Keep for backward compatibility

                        // Debug log
                        if (Math.random() < 0.05) {
                            console.log(
                                `[useLiquidityRatios] Delta OHLC: O=${deltaOHLC.open} H=${deltaOHLC.high} L=${deltaOHLC.low} C=${deltaOHLC.close}, snapshots=${currentBarSnapshots.snapshots.delta.length}`
                            );
                        }
                    }

                    // Calculate OHLC for nearPriceBidSizeToAskSizeRatioMA
                    const nearPriceOHLC = calculateOHLC(currentBarSnapshots.snapshots.nearPriceBidSizeToAskSizeRatioMA);
                    if (nearPriceOHLC) {
                        lastBar.nearPriceRatioOpen = nearPriceOHLC.open;
                        lastBar.nearPriceRatioHigh = nearPriceOHLC.high;
                        lastBar.nearPriceRatioLow = nearPriceOHLC.low;
                        lastBar.nearPriceRatioClose = nearPriceOHLC.close;
                        lastBar.nearPriceBidSizeToAskSizeRatioMA = nearPriceOHLC.close; // Line fallback
                    }

                    // Calculate OHLC for bidSizeToAskSizeRatioMA
                    const fullBookOHLC = calculateOHLC(currentBarSnapshots.snapshots.bidSizeToAskSizeRatioMA);
                    if (fullBookOHLC) {
                        lastBar.fullBookRatioOpen = fullBookOHLC.open;
                        lastBar.fullBookRatioHigh = fullBookOHLC.high;
                        lastBar.fullBookRatioLow = fullBookOHLC.low;
                        lastBar.fullBookRatioClose = fullBookOHLC.close;
                        lastBar.bidSizeToAskSizeRatioMA = fullBookOHLC.close; // Line fallback
                    }

                    // Store other fields
                    lastBar.bidSizeToAskSizeRatio = liquidityData.bidSizeToAskSizeRatio;
                    lastBar.nearPriceBidSizeToAskSizeRatio = liquidityData.nearPriceBidSizeToAskSizeRatio;
                    lastBar.bidOrderToAskOrderRatio = liquidityData.bidOrderToAskOrderRatio;

                    // Trigger redraw
                    pixiDataRef.current.draw();
                }
            }
        };

        Socket.on(liquidityEventName, handleLiquidityData);

        return () => {
            console.log(`[useLiquidityRatios] Cleaning up listener for: ${liquidityEventName}`);
            Socket.off(liquidityEventName, handleLiquidityData);
        };
    }, [symbol, Socket, pixiDataRef, enabled]);

    return latestDataRef;
};
