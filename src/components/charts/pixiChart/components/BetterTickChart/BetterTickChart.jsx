import React, { useState, useEffect, useRef, useCallback } from "react";
import GenericPixiChart from "../../../GenericPixiChart";
import API from "../../../../API";
import { IconButton } from "../../../../StratBuilder/components";
import IndicatorsBtns from "../IndicatorsBtns";
import { useToggleIndicator } from "../../../hooks/useToggleIndicator";
import { useIndicator } from "../../../hooks/useIndicator";
import { useLiquidityData } from "../../../hooks/useLiquidityData";
import { LiquidityHeatmap, liquidityHeatMapConfig } from "../indicatorDrawFunctions";
// import { liquidityHeatMapConfig } from "../indicatorConfigs";

const BetterTickChart = (props) => {
    const { height = 400, symbol = "SPY", timeframe = "tick", Socket, contractSymbol, fullSymbol: propFullSymbol } = props;

    // Use provided fullSymbol or fallback to symbol
    const fullSymbol = propFullSymbol || symbol;

    console.log("[BetterTickChart] render", { symbol, fullSymbol });

    const pixiDataRef = useRef();
    const loadingRef = useRef(false);
    // Chart data state
        const [candleData, setCandleData] = useState([]);
        const [dataSymbol, setDataSymbol] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [join, setJoin] = useState(1);
    const rawDataRef = useRef([]);
    const tempBarRef = useRef(null); // Temporary bar created from 1s updates

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
        console.log("[BetterTickChart] fetchData called", {
            opts,
            loadingRefCurrent: loadingRef.current,
            isLoading,
            fullSymbol,
            symbol
        });

        if (loadingRef.current) {
            console.log("[BetterTickChart] fetchData skipped - already loading");
            return;
        }

        loadingRef.current = true;
        setIsLoading(true);

        try {
            console.log("[BetterTickChart] Calling API.getCustomTicks with:", opts);
            const data = await API.getCustomTicks(opts);
            console.log("[BetterTickChart] API.getCustomTicks returned:", {
                dataLength: data?.length,
                firstItem: data?.[0],
                lastItem: data?.[data?.length - 1]
            });

            rawDataRef.current = data;
            const combined = combineBars(data, join);

            console.log("[BetterTickChart] Combined bars:", {
                combinedLength: combined.length,
                join,
                firstCombined: combined[0],
                lastCombined: combined[combined.length - 1]
            });

            setCandleData(combined);
            setDataSymbol(symbol);
            console.log("[BetterTickChart] State updated - candleData and dataSymbol set");
        } catch (error) {
            console.error("[BetterTickChart] fetchData error:", error);
        } finally {
            console.log("[BetterTickChart] fetchData end - clearing loading flags");
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
                setDataSymbol(symbol);
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
        console.log("[BetterTickChart] Symbol/fullSymbol effect triggered", {
            symbol,
            fullSymbol,
            currentCandleDataLength: candleData.length,
            currentDataSymbol: dataSymbol
        });

        rawDataRef.current = [];
        setCandleData([]);
        setDataSymbol(null);
        tempBarRef.current = null;
        loadingRef.current = false;

        console.log("[BetterTickChart] State cleared, calling fetchData");
        fetchData({ symbol: symbol, limit: 2000 });
    }, [symbol, fullSymbol]);

    // Separate effect for socket listeners that depends on pixiDataRef being ready
    useEffect(() => {
        // Wait for pixiDataRef to be initialized before setting up socket listeners
        if (!pixiDataRef.current) {
            console.log("[BetterTickChart] Waiting for pixiDataRef to initialize");
            return;
        }

        console.log("[BetterTickChart] Setting up socket listeners for symbol:", { fullSymbol, symbol });

        // Listen for new 100-tick bar events from server
        // Pattern for TICK bars: new-100-{symbol}-tickBar
        const tickBarEvent = `new-100-${fullSymbol}-tickBar`;
        debugger;
        const handleNew100TickBar = (data) => {
            console.log(`${tickBarEvent} received`, data);
            if (data.symbol !== symbol) return;
            debugger;
            // Add new bar to raw data
            rawDataRef.current.push(data);

            // Reset temp bar based on this new tick bar's close price
            tempBarRef.current = {
                open: data.close,
                high: data.close,
                low: data.close,
                close: data.close,
                volume: 0,
                datetime: Date.now(),
                timestamp: Date.now(),
                symbol: data.symbol,
                isTemp: true,
            };

            if (join === 1) {
                debugger;
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
                    debugger;
                    setCandleData((prev) => [...prev, lastCombinedBar]);
                } else {
                    // Update existing combined bar
                    debugger;
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
        };

        // Listen for 1-second price updates - creates/updates temporary bar
        // Pattern: 1s-{symbol}-LiveBarUpdate (separate from time bars)
        const liveBarUpdateEvent = `1s-${fullSymbol}-LiveBarUpdate`;
        const handleLiveBarUpdate = (tick) => {
            console.log(`${liveBarUpdateEvent} received`, tick);
            if (!pixiDataRef.current) return;

            const lastPrice = tick.lastPrice || tick.close || tick.last;
            if (!lastPrice) return;

            // Initialize temp bar if it doesn't exist (use last real bar's close)
            if (!tempBarRef.current) {
                const lastRealBar = rawDataRef.current[rawDataRef.current.length - 1];
                if (!lastRealBar) return;

                tempBarRef.current = {
                    open: lastRealBar.close,
                    high: lastRealBar.close,
                    low: lastRealBar.close,
                    close: lastRealBar.close,
                    volume: 0,
                    datetime: Date.now(),
                    timestamp: Date.now(),
                    symbol: symbol,
                    isTemp: true,
                };
            }

            // Update temp bar with new price data
            tempBarRef.current.close = lastPrice;
            tempBarRef.current.high = Math.max(tempBarRef.current.high, lastPrice);
            tempBarRef.current.low = Math.min(tempBarRef.current.low, lastPrice);
            tempBarRef.current.datetime = Date.now();
            tempBarRef.current.timestamp = Date.now();

            // Use newTick to update the visual representation without altering stored data
            pixiDataRef.current.newTick({
                lastPrice: lastPrice,
                high: tempBarRef.current.high,
                low: tempBarRef.current.low,
                close: lastPrice,
                datetime: Date.now(),
            });
        };

        Socket.on(tickBarEvent, handleNew100TickBar);
        Socket.on(liveBarUpdateEvent, handleLiveBarUpdate);

        return () => {
            Socket.off(tickBarEvent, handleNew100TickBar);
            Socket.off(liveBarUpdateEvent, handleLiveBarUpdate);
        };
    }, [symbol, fullSymbol, join, Socket]);

    // Note: Time-based charts use pattern: new-${timeframe}-${symbol}-timeBar
    // Example: new-1m-YMZ5-timeBar, new-5m-YMZ5-timeBar
    // This tick chart uses: new-100-${symbol}-tickBar

    // Effect to recombine bars when join value changes
    useEffect(() => {
        if (rawDataRef.current.length > 0) {
            const combined = combineBars(rawDataRef.current, join);
            debugger;
            setCandleData(combined);
        }
    }, [join]);

    const joinOptions = [1, 5, 10, 15, 20];

    const TickJoinBtn = ({ isActive, value, label }) => (
        <div className="col-auto">
            <IconButton borderColor={isActive ? "green" : false} title={label} onClick={() => setJoin(value)} text={label} />
        </div>
    );

    const canRenderChart = dataSymbol === symbol && candleData.length > 0;

    console.log("[BetterTickChart] Render decision", {
        canRenderChart,
        dataSymbol,
        symbol,
        candleDataLength: candleData.length,
        isLoading,
        loadingRefCurrent: loadingRef.current
    });

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
                    <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                        Loading {symbol} tick data...
                    </div>
                )}
            </div>
        </div>
    );
};

export default BetterTickChart;
