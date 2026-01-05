import { useEffect, useRef } from "react";
import API from "../../API";

const timeframeToMs = (timeframe) => {
    if (typeof timeframe !== "string") {
        return 60 * 1000;
    }

    if (timeframe === "tick") {
        return 1000;
    }

    const match = timeframe.match(/^(\d+)([smhd])$/i);
    if (!match) {
        return 60 * 1000;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    const unitMs = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
    };

    return value * (unitMs[unit] || 60 * 1000);
};

const LIQUIDITY_MA_PERIOD = 20;
const LIQUIDITY_MA_CONFIGS = [
    { valueField: "deltaClose", targetField: "deltaMA20" },
    { valueField: "nearPriceRatioClose", targetField: "nearPriceRatioMA20" },
    { valueField: "fullBookRatioClose", targetField: "fullBookRatioMA20" },
    { valueField: "bidOrderToAskOrderRatioClose", targetField: "bidOrderToAskOrderRatioMA20" },
    { valueField: "runningOrderDepthCountClose", targetField: "runningOrderDepthCountMA20" },
    { valueField: "runningOrderDepthNearPriceCountClose", targetField: "runningOrderDepthNearPriceCountMA20" },
    { valueField: "bidSizeOrderRatioClose", targetField: "bidSizeOrderRatioMA20" },
    { valueField: "askSizeOrderRatioClose", targetField: "askSizeOrderRatioMA20" },
];

const toNumericValue = (value) => {
    if (value === null || value === undefined) return null;
    const numeric = typeof value === "number" ? value : Number(value);
    return Number.isFinite(numeric) ? numeric : null;
};

const recalculateMovingAveragesForAllBars = (bars) => {
    if (!Array.isArray(bars) || !bars.length) {
        return;
    }

    LIQUIDITY_MA_CONFIGS.forEach(({ valueField, targetField }) => {
        const window = [];
        let sum = 0;

        bars.forEach((bar) => {
            const value = toNumericValue(bar[valueField]);
            if (value === null) {
                bar[targetField] = null;
                window.length = 0;
                sum = 0;
                return;
            }

            window.push(value);
            sum += value;
            if (window.length > LIQUIDITY_MA_PERIOD) {
                sum -= window.shift();
            }

            bar[targetField] = window.length === LIQUIDITY_MA_PERIOD ? sum / LIQUIDITY_MA_PERIOD : null;
        });
    });
};

const updateMovingAveragesForLatestBar = (bars) => {
    if (!Array.isArray(bars) || !bars.length) {
        return;
    }

    const lastIndex = bars.length - 1;
    const lastBar = bars[lastIndex];
    if (!lastBar) return;

    LIQUIDITY_MA_CONFIGS.forEach(({ valueField, targetField }) => {
        let count = 0;
        let sum = 0;
        for (let i = lastIndex; i >= 0 && count < LIQUIDITY_MA_PERIOD; i--) {
            const value = toNumericValue(bars[i][valueField]);
            if (value === null) {
                lastBar[targetField] = null;
                return;
            }
            sum += value;
            count++;
        }

        lastBar[targetField] = count === LIQUIDITY_MA_PERIOD ? sum / LIQUIDITY_MA_PERIOD : null;
    });
};

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
    // Stores the most recent liquidity snapshot from socket
    // Currently unused but available for future features (e.g., displaying current values in UI)
    const latestDataRef = useRef(null);
    const hasLoadedHistoricalRef = useRef(false);
    const fetchedRangeRef = useRef({
        symbol: null,
        timeframe: null,
        start: null,
        end: null,
    });
    const isFetchingHistoricalRef = useRef(false);

    // Track the earliest timestamp we've seen to detect scrolling left
    const earliestSeenRef = useRef(null);

    // Track snapshots for current bar to build OHLC
    const currentBarSnapshotsRef = useRef({
        datetime: null,
        snapshots: {
            delta: [],
            nearPriceBidSizeToAskSizeRatioMA: [],
            bidSizeToAskSizeRatioMA: [],
            bidSizeToAskSizeRatio: [],
            bidOrderToAskOrderRatio: [],
            runningOrderDepthCount: [],
            runningOrderDepthNearPriceCount: [],
            bidSizeOrderRatio: [],
            askSizeOrderRatio: [],
        },
    });
    // Fetch historical compiled data on symbol/timeframe change or initial load
    // Scrolling detection happens in a separate effect below
    useEffect(() => {
        if (!enabled || !symbol || !timeframe) {
            return;
        }

        const previousRange = fetchedRangeRef.current;
        const symbolChanged = previousRange.symbol !== symbol;
        const timeframeChanged = previousRange.timeframe !== timeframe;

        if (symbolChanged || timeframeChanged) {
            // Context changed - clear all tracking and fetch
            console.log(`[useLiquidityRatios] Context changed - clearing and fetching`);
            fetchedRangeRef.current = {
                symbol: null,
                timeframe: null,
                start: null,
                end: null,
            };
            hasLoadedHistoricalRef.current = false;
            earliestSeenRef.current = null;
        }

        // Only fetch if we haven't loaded data for this context yet
        if (hasLoadedHistoricalRef.current || isFetchingHistoricalRef.current || !ohlcData?.length) {
            return;
        }

        console.log(`[useLiquidityRatios] Initial load for ${symbol} ${timeframe}`);

        const fetchHistoricalRatios = async () => {
            try {
                isFetchingHistoricalRef.current = true;

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

                                // Other ratio fields with OHLC
                                bidSizeToAskSizeRatio: bar.bidSizeToAskSizeRatio_close,
                                nearPriceBidSizeToAskSizeRatio: bar.nearPriceBidSizeToAskSizeRatio_close,

                                // bidOrderToAskOrderRatio OHLC
                                bidOrderToAskOrderRatio: bar.bidOrderToAskOrderRatio_close,
                                bidOrderToAskOrderRatioOpen: bar.bidOrderToAskOrderRatio_open,
                                bidOrderToAskOrderRatioHigh: bar.bidOrderToAskOrderRatio_high,
                                bidOrderToAskOrderRatioLow: bar.bidOrderToAskOrderRatio_low,
                                bidOrderToAskOrderRatioClose: bar.bidOrderToAskOrderRatio_close,

                                // runningOrderDepthCount OHLC
                                runningOrderDepthCount: bar.runningOrderDepthCount_close,
                                runningOrderDepthCountOpen: bar.runningOrderDepthCount_open,
                                runningOrderDepthCountHigh: bar.runningOrderDepthCount_high,
                                runningOrderDepthCountLow: bar.runningOrderDepthCount_low,
                                runningOrderDepthCountClose: bar.runningOrderDepthCount_close,

                                // runningOrderDepthNearPriceCount OHLC
                                runningOrderDepthNearPriceCount: bar.runningOrderDepthNearPriceCount_close,
                                runningOrderDepthNearPriceCountOpen: bar.runningOrderDepthNearPriceCount_open,
                                runningOrderDepthNearPriceCountHigh: bar.runningOrderDepthNearPriceCount_high,
                                runningOrderDepthNearPriceCountLow: bar.runningOrderDepthNearPriceCount_low,
                                runningOrderDepthNearPriceCountClose: bar.runningOrderDepthNearPriceCount_close,

                                // bidSizeOrderRatio OHLC
                                bidSizeOrderRatio: bar.bidSizeOrderRatio_close,
                                bidSizeOrderRatioOpen: bar.bidSizeOrderRatio_open,
                                bidSizeOrderRatioHigh: bar.bidSizeOrderRatio_high,
                                bidSizeOrderRatioLow: bar.bidSizeOrderRatio_low,
                                bidSizeOrderRatioClose: bar.bidSizeOrderRatio_close,

                                // askSizeOrderRatio OHLC
                                askSizeOrderRatio: bar.askSizeOrderRatio_close,
                                askSizeOrderRatioOpen: bar.askSizeOrderRatio_open,
                                askSizeOrderRatioHigh: bar.askSizeOrderRatio_high,
                                askSizeOrderRatioLow: bar.askSizeOrderRatio_low,
                                askSizeOrderRatioClose: bar.askSizeOrderRatio_close,
                            });
                        }
                    });

                    // Populate all OHLC bars with matching metrics
                    // let matchedCount = 0;
                    pixiDataRef.current.ohlcDatas.forEach((bar) => {
                        const barTime = bar.timestamp || bar.datetime;
                        const metrics = metricsMap.get(barTime);
                        if (metrics) {
                            Object.assign(bar, metrics);
                            // matchedCount++;
                        }
                    });

                    // console.log(`[useLiquidityRatios] Populated ${matchedCount} bars with ratio data`);
                    recalculateMovingAveragesForAllBars(pixiDataRef.current.ohlcDatas);
                    hasLoadedHistoricalRef.current = true;

                    // Update tracking - expand to include newly fetched range
                    // Note: Socket updates will extend the end time, so we only track start here
                    const prevRange = fetchedRangeRef.current;
                    fetchedRangeRef.current = {
                        symbol,
                        timeframe,
                        start: prevRange.start === null ? startTime : Math.min(prevRange.start, startTime),
                        end: Math.max(prevRange.end || 0, endTime),
                    };

                    // Log a sample bar to verify data structure
                    // const sampleBar = pixiDataRef.current.ohlcDatas.find((bar) => bar.deltaClose !== undefined);
                    // if (sampleBar) {
                    // console.log(`[useLiquidityRatios] Sample bar after population:`, {
                    //     deltaOpen: sampleBar.deltaOpen,
                    //     deltaHigh: sampleBar.deltaHigh,
                    //     deltaLow: sampleBar.deltaLow,
                    //     deltaClose: sampleBar.deltaClose,
                    //     nearPriceRatioClose: sampleBar.nearPriceRatioClose,
                    //     fullBookRatioClose: sampleBar.fullBookRatioClose,
                    // });
                    // }

                    // Trigger redraw
                    pixiDataRef.current.draw();
                }
            } catch (error) {
                console.error(`[useLiquidityRatios] Failed to fetch historical data:`, error);
            } finally {
                isFetchingHistoricalRef.current = false;
            }
        };

        fetchHistoricalRatios();
    }, [enabled, symbol, timeframe, ohlcData?.length]); // Include length to trigger when data loads

    // Separate effect to detect when user scrolls left to load earlier data
    // This uses a ref to track earliest timestamp, avoiding dependency on ohlcData
    useEffect(() => {
        if (!enabled || !ohlcData?.length || !hasLoadedHistoricalRef.current) {
            return;
        }

        const currentStart = ohlcData[0].timestamp || ohlcData[0].datetime;
        if (!currentStart) return;

        // Track earliest timestamp we've seen
        if (earliestSeenRef.current === null) {
            earliestSeenRef.current = currentStart;
            return;
        }

        // If current start is earlier than what we've seen, user scrolled left
        if (currentStart < earliestSeenRef.current) {
            console.log(`[useLiquidityRatios] User scrolled left: ${currentStart} < ${earliestSeenRef.current}`);
            earliestSeenRef.current = currentStart;

            // Check if we need to fetch more data
            const previousRange = fetchedRangeRef.current;
            if (previousRange.start === null || currentStart < previousRange.start) {
                console.log(`[useLiquidityRatios] Need to fetch earlier liquidity data`);

                // Trigger fetch by temporarily setting hasLoadedHistoricalRef to false
                // This will cause the main effect to run
                hasLoadedHistoricalRef.current = false;
            }
        }
    }, [enabled, ohlcData?.length, ohlcData?.[0]?.datetime, ohlcData?.[0]?.timestamp]);

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

            // Store the latest snapshot (available for future use)
            latestDataRef.current = {
                delta: liquidityData.delta,
                nearPriceBidSizeToAskSizeRatioMA: liquidityData.nearPriceBidSizeToAskSizeRatioMA,
                bidSizeToAskSizeRatioMA: liquidityData.bidSizeToAskSizeRatioMA,
                bidSizeToAskSizeRatio: liquidityData.bidSizeToAskSizeRatio,
                nearPriceBidSizeToAskSizeRatio: liquidityData.nearPriceBidSizeToAskSizeRatio,
                bidOrderToAskOrderRatio: liquidityData.bidOrderToAskOrderRatio,
                bidSizeOrderRatio: liquidityData.bidSizeOrderRatio,
                askSizeOrderRatio: liquidityData.askSizeOrderRatio,
                runningOrderDepthCount: liquidityData.runningOrderDepthCount,
                runningOrderDepthNearPriceCount: liquidityData.runningOrderDepthNearPriceCount,
                timestamp: Date.now(),
            };

            // Update the last bar in the chart with the ratio data
            if (pixiDataRef?.current?.ohlcDatas?.length > 0) {
                const lastIndex = pixiDataRef.current.ohlcDatas.length - 1;
                // if (lastIndex >= 0) {
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
                        bidOrderToAskOrderRatio: [],
                        runningOrderDepthCount: [],
                        runningOrderDepthNearPriceCount: [],
                        bidSizeOrderRatio: [],
                        askSizeOrderRatio: [],
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
                if (liquidityData.bidOrderToAskOrderRatio !== undefined && liquidityData.bidOrderToAskOrderRatio !== null) {
                    currentBarSnapshots.snapshots.bidOrderToAskOrderRatio.push(liquidityData.bidOrderToAskOrderRatio);
                }
                if (liquidityData.runningOrderDepthCount !== undefined && liquidityData.runningOrderDepthCount !== null) {
                    currentBarSnapshots.snapshots.runningOrderDepthCount.push(liquidityData.runningOrderDepthCount);
                }
                if (liquidityData.runningOrderDepthNearPriceCount !== undefined && liquidityData.runningOrderDepthNearPriceCount !== null) {
                    currentBarSnapshots.snapshots.runningOrderDepthNearPriceCount.push(liquidityData.runningOrderDepthNearPriceCount);
                }
                if (liquidityData.bidSizeOrderRatio !== undefined && liquidityData.bidSizeOrderRatio !== null) {
                    currentBarSnapshots.snapshots.bidSizeOrderRatio.push(liquidityData.bidSizeOrderRatio);
                }
                if (liquidityData.askSizeOrderRatio !== undefined && liquidityData.askSizeOrderRatio !== null) {
                    currentBarSnapshots.snapshots.askSizeOrderRatio.push(liquidityData.askSizeOrderRatio);
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

                // Calculate OHLC for bidOrderToAskOrderRatio
                const bidOrderToAskOrderOHLC = calculateOHLC(currentBarSnapshots.snapshots.bidOrderToAskOrderRatio);
                if (bidOrderToAskOrderOHLC) {
                    lastBar.bidOrderToAskOrderRatioOpen = bidOrderToAskOrderOHLC.open;
                    lastBar.bidOrderToAskOrderRatioHigh = bidOrderToAskOrderOHLC.high;
                    lastBar.bidOrderToAskOrderRatioLow = bidOrderToAskOrderOHLC.low;
                    lastBar.bidOrderToAskOrderRatioClose = bidOrderToAskOrderOHLC.close;
                    lastBar.bidOrderToAskOrderRatio = bidOrderToAskOrderOHLC.close; // Line fallback
                }

                // Calculate OHLC for runningOrderDepthCount
                const runningOrderDepthCountOHLC = calculateOHLC(currentBarSnapshots.snapshots.runningOrderDepthCount);
                if (runningOrderDepthCountOHLC) {
                    lastBar.runningOrderDepthCountOpen = runningOrderDepthCountOHLC.open;
                    lastBar.runningOrderDepthCountHigh = runningOrderDepthCountOHLC.high;
                    lastBar.runningOrderDepthCountLow = runningOrderDepthCountOHLC.low;
                    lastBar.runningOrderDepthCountClose = runningOrderDepthCountOHLC.close;
                    lastBar.runningOrderDepthCount = runningOrderDepthCountOHLC.close; // Line fallback
                }

                // Calculate OHLC for runningOrderDepthNearPriceCount
                const runningOrderDepthNearPriceCountOHLC = calculateOHLC(currentBarSnapshots.snapshots.runningOrderDepthNearPriceCount);
                if (runningOrderDepthNearPriceCountOHLC) {
                    lastBar.runningOrderDepthNearPriceCountOpen = runningOrderDepthNearPriceCountOHLC.open;
                    lastBar.runningOrderDepthNearPriceCountHigh = runningOrderDepthNearPriceCountOHLC.high;
                    lastBar.runningOrderDepthNearPriceCountLow = runningOrderDepthNearPriceCountOHLC.low;
                    lastBar.runningOrderDepthNearPriceCountClose = runningOrderDepthNearPriceCountOHLC.close;
                    lastBar.runningOrderDepthNearPriceCount = runningOrderDepthNearPriceCountOHLC.close; // Line fallback
                }

                // Calculate OHLC for bidSizeOrderRatio
                const bidSizeOrderRatioOHLC = calculateOHLC(currentBarSnapshots.snapshots.bidSizeOrderRatio);
                if (bidSizeOrderRatioOHLC) {
                    lastBar.bidSizeOrderRatioOpen = bidSizeOrderRatioOHLC.open;
                    lastBar.bidSizeOrderRatioHigh = bidSizeOrderRatioOHLC.high;
                    lastBar.bidSizeOrderRatioLow = bidSizeOrderRatioOHLC.low;
                    lastBar.bidSizeOrderRatioClose = bidSizeOrderRatioOHLC.close;
                    lastBar.bidSizeOrderRatio = bidSizeOrderRatioOHLC.close; // Line fallback
                }

                // Calculate OHLC for askSizeOrderRatio
                const askSizeOrderRatioOHLC = calculateOHLC(currentBarSnapshots.snapshots.askSizeOrderRatio);
                if (askSizeOrderRatioOHLC) {
                    lastBar.askSizeOrderRatioOpen = askSizeOrderRatioOHLC.open;
                    lastBar.askSizeOrderRatioHigh = askSizeOrderRatioOHLC.high;
                    lastBar.askSizeOrderRatioLow = askSizeOrderRatioOHLC.low;
                    lastBar.askSizeOrderRatioClose = askSizeOrderRatioOHLC.close;
                    lastBar.askSizeOrderRatio = askSizeOrderRatioOHLC.close; // Line fallback
                }

                // Store other fields
                lastBar.bidSizeToAskSizeRatio = liquidityData.bidSizeToAskSizeRatio;
                lastBar.nearPriceBidSizeToAskSizeRatio = liquidityData.nearPriceBidSizeToAskSizeRatio;

                updateMovingAveragesForLatestBar(pixiDataRef.current.ohlcDatas);
                // Trigger redraw
                pixiDataRef.current.draw();

                // Update fetched range with live data
                // Socket data primarily extends the end time (real-time updates)
                // Only set start if this is the first data point
                if (fetchedRangeRef.current.start === null) {
                    fetchedRangeRef.current.symbol = symbol;
                    fetchedRangeRef.current.timeframe = timeframe;
                    fetchedRangeRef.current.start = barTime;
                }
                // Always extend end time to latest bar
                fetchedRangeRef.current.end = Math.max(fetchedRangeRef.current.end || 0, barTime);
                // }
            }
        };

        Socket.on(liquidityEventName, handleLiquidityData);

        return () => {
            console.log(`[useLiquidityRatios] Cleaning up listener for: ${liquidityEventName}`);
            Socket.off(liquidityEventName, handleLiquidityData);
        };
    }, [symbol, Socket, pixiDataRef, enabled]);

    // Return ref for potential future use (e.g., displaying current values)
    return latestDataRef;
};
