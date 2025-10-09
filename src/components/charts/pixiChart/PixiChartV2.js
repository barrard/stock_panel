import React, { useState, useEffect, useRef } from "react";
import GenericPixiChart from "../GenericPixiChart";
import API from "../../API";
import LiquidityHeatmap from "./components/LiquidityHeatmap";
import IndicatorsBtns from "./components/IndicatorsBtns";
import { useIndicator } from "../hooks/useIndicator";
import { useToggleIndicator } from "../hooks/useToggleIndicator";
// import drawStrikes from "./drawStrikes";
// import MonteCarloCone from "./monteCarloSimulation";
// import TimeframeSelector from "./spyOptionsComponents/TimeframeSelector";
// import IndicatorSelector from "../../../reusableChartComponents/IndicatorSelector";
const PixiChartV2 = (props) => {
    const { Socket, height = 500 } = props;

    // always need to make a ref for pixiDataRef
    const pixiDataRef = useRef();

    //most charts handle timeframe with barType and barTypePeriod
    // barType 1 = seconds, 2 = minutes, 3 = hours, 4 = days
    const [barType, setBarType] = useState("1");
    // barTypePeriod is the number of barType units
    const [barTypePeriod, setBarTypePeriod] = useState("60");
    //human readable timeframe
    const [timeframe, setTimeframe] = useState("1m");

    //place to store ohlc data
    const [ohlcData, setOhlcData] = useState([]);

    // the symbol of the chart
    const [symbol, setSymbol] = useState("ES");

    // Cache for liquidity data (persists across indicator toggles)
    const liquidityDataCacheRef = useRef({
        history: [], // Historical compiled data from API
        hasLoaded: false, // Flag to track if we've fetched from server
        symbol: null, // Track which symbol this cache is for
        timeframe: null, // Track which timeframe this cache is for
        lastFetchTime: null, // Track when we last fetched data
        endDatetime: null, // Track the end datetime of cached data
    });

    //controls various indicators
    const [indicators, setIndicators] = useState([
        {
            id: "liquidityHeatmap",
            name: "Liquidity Heatmap",
            enabled: false,
            drawFunctionKey: "draw",
            instanceRef: null,
            manualDraw: true, // Only draw on socket updates (every 2 seconds), not on pan/zoom
            // Only enable for 1m/5m timeframes
            shouldEnable: (timeframe) => timeframe === "1m" || timeframe === "5m",
            options: {
                visualizationMode: "volume", // 'volume', 'orders', or 'ratio'
                thresholds: [0, 10, 20, 30, 40, 50, 60, 70], // Color thresholds
            },
        },
        // { id: "monteCarlo", name: "Monte Carlo", enabled: false, drawFunctionKey: "drawHistogramHeatmap", instanceRef: null },
        // { id: "strikes", name: "Strike Lines", enabled: false, drawFunctionKey: "drawAllStrikeLines", instanceRef: null },
    ]);

    // Use custom hook for indicator toggling
    const toggleIndicator = useToggleIndicator(indicators, setIndicators, timeframe);

    // Function to update indicator options
    const updateIndicatorOptions = (indicatorId, newOptions) => {
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

                        // Update visualization mode if changed
                        if (newOptions.visualizationMode && instance.setVisualizationMode) {
                            instance.visualizationMode = newOptions.visualizationMode;
                        }

                        // Update thresholds if changed
                        if (newOptions.thresholds && Array.isArray(newOptions.thresholds)) {
                            instance.liquidityThresholds = newOptions.thresholds;
                        }

                        // Trigger redraw with new settings
                        if (instance.draw) {
                            instance.draw(true);
                        }
                    }

                    return updatedIndicator;
                }
                return ind;
            });
        });
    };

    // Get indicator configs
    const liquidityHeatmapIndicator = indicators.find((ind) => ind.id === "liquidityHeatmap");

    // Use the useIndicator hook for liquidity heatmap
    useIndicator({
        indicator: liquidityHeatmapIndicator,
        pixiDataRef,
        createInstance: (pixiData) => {
            // Only create if timeframe is valid
            if (timeframe !== "1m" && timeframe !== "5m") {
                return null;
            }
            return new LiquidityHeatmap(pixiData);
        },
        setIndicators,
        dependencies: [timeframe],
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
        const currentStartDatetime = ohlcData[0].timestamp || ohlcData[0].datetime;
        const currentEndDatetime = ohlcData[ohlcData.length - 1].timestamp || ohlcData[ohlcData.length - 1].datetime;

        // If cache has data beyond our current OHLC range, we might be missing OHLC bars
        if (cache.endDatetime && cache.endDatetime - 1000 * 60 * 30 > currentEndDatetime) {
            console.log(
                `[Cache] Detected missing OHLC data - cache ends at ${new Date(
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
            console.log("Loading liquidity data from cache (fresh)");
            heatmapInstance.setLiquidityHistory(cache.history);
            heatmapInstance.draw(true);
            return;
        }

        // Cache is stale or missing - fetch from API
        const fetchLiquidityData = async () => {
            try {
                const startTime = ohlcData[0].timestamp || ohlcData[0].datetime;
                const endTime = ohlcData[ohlcData.length - 1].timestamp || ohlcData[ohlcData.length - 1].datetime;
                const start = startTime;
                const end = endTime;

                console.log("Fetching liquidity data from API");
                const liquidityData = await API.getOrderFlow({
                    start,
                    end,
                    symbol,
                    compiled: timeframe, // Get pre-compiled data from server
                });

                // Server returns array of objects with:
                // { datetime, orderPrices: [], orderSizes: [], orderCounts: [], ... }
                // Transform to our format: { datetime, liquidity: {price: {volume, orders}} }
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

                        return {
                            datetime: bar.datetime,
                            liquidity,
                            // Store the extra metrics for future use
                            metrics: {
                                bidSizeOrderRatio: bar.bidSizeOrderRatio,
                                askSizeOrderRatio: bar.askSizeOrderRatio,
                                bidSizeToAskSizeRatio: bar.bidSizeToAskSizeRatio,
                                bidOrderToAskOrderRatio: bar.bidOrderToAskOrderRatio,
                                bidSizeToAskSizeRatioMA: bar.bidSizeToAskSizeRatioMA,
                                delta: bar.delta,
                            },
                        };
                    });

                    // Store in cache with metadata
                    cache.history = transformedData;
                    cache.hasLoaded = true;
                    cache.lastFetchTime = Date.now();
                    cache.endDatetime = endTime;

                    console.log(`[Cache] Stored ${transformedData.length} bars, end datetime: ${new Date(endTime).toLocaleString()}`);

                    // Load into heatmap
                    heatmapInstance.setLiquidityHistory(transformedData);

                    // Manually trigger heatmap draw (force full redraw)
                    heatmapInstance.draw(true);
                }
            } catch (error) {
                console.error("Failed to fetch liquidity data:", error);
            }
        };

        fetchLiquidityData();
    }, [liquidityHeatmapIndicator?.enabled, liquidityHeatmapIndicator?.instanceRef, symbol, timeframe]);

    //function to get Data
    async function fetchLiveDataAndUpdate() {
        const liveData = await API.rapi_requestLiveBars({
            // barType,
            // barTypePeriod,
            timeframe,
            symbol: symbol,
            // exchange: getExchangeFromSymbol(symbol),
        });
        // console.log(liveData);
        liveData.forEach((d) => {
            d.datetime = d.datetime * 1000;
            if (d.volume.low) {
                d.totalVol = d.volume.low;
            }
        });

        //merge and remove duplicate datetime with data.bars
        const mergedBars = [...ohlcData, ...liveData].reduce((acc, bar) => {
            if (!acc.find((b) => b.datetime === bar.datetime)) {
                acc.push(bar);
            }
            return acc;
        }, []);
        setOhlcData(mergedBars);
    }

    const addBar = (newBar) => {
        newBar.datetime = newBar.datetime * 1000;
        pixiDataRef?.current?.setNewBar(newBar);
    };
    const updateBar = (tick) => {
        tick.datetime = tick.datetime * 1000;
        pixiDataRef?.current?.newTick(tick);
    };
    //main on load to get data
    useEffect(() => {
        console.log(`[useEffect] Socket setup running - symbol: ${symbol}, timeframe: ${timeframe}`);

        //get data from OHLC_Compiler thing
        fetchLiveDataAndUpdate();

        const liveBarNew = `${timeframe}-${symbol}-LiveBarNew`;
        const handleLiveBarNew = (newBar) => {
            // setNewSpyMinuteBar(d);
            //add this to ohlcData
            console.log("new live bar", newBar);
            addBar(newBar);
        };
        Socket.on(liveBarNew, handleLiveBarNew);

        const liveBarUpdate = `1s-${symbol}-LiveBarUpdate`;
        const handleLiveBarUpdate = (tick) => {
            //update last ohlcBar
            // console.log("tick", tick);
            updateBar(tick);
        };
        Socket.on(liveBarUpdate, handleLiveBarUpdate);

        // Liquidity data socket listener (only for 1m and 5m timeframes)
        let liquidityEventName = null;
        let handleLiquidityData = null;

        console.log(`[Socket] Checking timeframe: ${timeframe}, is 1m or 5m: ${timeframe === "1m" || timeframe === "5m"}`);
        if (timeframe === "1m" || timeframe === "5m") {
            liquidityEventName = `liquidity-${symbol}`;
            console.log(`[Socket] Registering liquidity listener for event: ${liquidityEventName}`);

            handleLiquidityData = (liquidityData) => {
                console.log(`[Socket] Received liquidity data for ${symbol} at ${new Date().toLocaleTimeString()}`);

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

                console.log(`[Socket] Converted snapshot - price levels: ${Object.keys(liquidity).length}`);

                // Always store socket data in cache (even if indicator is disabled)
                const cache = liquidityDataCacheRef.current;

                // Only cache if this matches current symbol/timeframe
                if (cache.symbol === symbol && cache.timeframe === timeframe) {
                    // Find if we already have a bar for this datetime
                    const barDatetime = new Date(datetime);
                    barDatetime.setSeconds(0, 0);
                    const alignedDatetime = barDatetime.getTime();

                    const existingBarIndex = cache.history.findIndex((bar) => bar.datetime === alignedDatetime);

                    if (existingBarIndex >= 0) {
                        // Update existing bar (replace with latest snapshot)
                        cache.history[existingBarIndex] = { datetime: alignedDatetime, liquidity };
                        console.log(`[Socket] Updated existing cache bar at ${new Date(alignedDatetime).toLocaleTimeString()}`);
                    } else {
                        // Add new bar
                        cache.history.push({ datetime: alignedDatetime, liquidity });
                        console.log(`[Socket] Added new cache bar at ${new Date(alignedDatetime).toLocaleTimeString()}`);

                        // Keep only recent history (e.g., last 500 bars)
                        if (cache.history.length > 500) {
                            cache.history.shift();
                        }
                    }

                    // Update cache metadata to reflect latest data
                    cache.endDatetime = Math.max(cache.endDatetime || 0, alignedDatetime);
                    cache.lastFetchTime = Date.now();
                }

                // If indicator is enabled, also update the heatmap instance
                // Use setIndicators callback to get current state (avoids stale closure)
                setIndicators((currentIndicators) => {
                    const currentHeatmapIndicator = currentIndicators.find((ind) => ind.id === "liquidityHeatmap");
                    const heatmapInstance = currentHeatmapIndicator?.instanceRef;

                    if (heatmapInstance && heatmapInstance.addLiquiditySnapshot) {
                        console.log(`[Socket] Adding snapshot to heatmap instance`);
                        heatmapInstance.addLiquiditySnapshot(snapshot);
                        // Manually trigger draw (only on socket updates, not on pan/zoom)
                        heatmapInstance.draw();
                    } else {
                        console.log(
                            `[Socket] Heatmap instance not available - enabled: ${
                                currentHeatmapIndicator?.enabled
                            }, hasInstance: ${!!heatmapInstance}`
                        );
                    }

                    // Return unchanged to avoid triggering re-render
                    return currentIndicators;
                });
            };

            Socket.on(liquidityEventName, handleLiquidityData);
        }

        return () => {
            Socket.off(liveBarNew, handleLiveBarNew);
            Socket.off(liveBarUpdate, handleLiveBarUpdate);
            if (liquidityEventName && handleLiquidityData) {
                Socket.off(liquidityEventName, handleLiquidityData);
            }
        };
    }, [symbol, timeframe]); // Socket intentionally omitted to prevent re-registrations

    return (
        <>
            {/* <TimeframeSelector setTimeframe={setTimeframe} timeframe={timeframe} />
            <IndicatorSelector indicators={indicators} toggleIndicator={toggleIndicator} /> */}
            <IndicatorsBtns
                indicators={indicators}
                toggleIndicator={toggleIndicator}
                timeframe={timeframe}
                updateIndicatorOptions={updateIndicatorOptions}
            />
            {!ohlcData?.length ? (
                <div>Loading... {symbol}</div>
            ) : (
                <GenericPixiChart
                    //always add a unique key to force remount on changes to important props
                    key={symbol} //symbol works well for as the key
                    ohlcDatas={ohlcData}
                    // width={width}
                    height={height}
                    symbol={symbol}
                    // fullSymbolRef={fullSymbolRef}
                    barType={barType}
                    barTypePeriod={barTypePeriod}
                    // loadData={loadData}
                    pixiDataRef={pixiDataRef}
                    // tickSize={tickSize}
                />
            )}
        </>
    );
};

export default PixiChartV2;
