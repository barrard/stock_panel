import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import GenericPixiChart from "../GenericPixiChart";
import API from "../../API";
import { LiquidityHeatmap, liquidityHeatMapConfig } from "./components/indicatorDrawFunctions";
import DrawOrdersV2 from "./components/DrawOrdersV2";
import IndicatorsBtns from "./components/IndicatorsBtns";
import SymbolBtns from "./components/SymbolBtns";
import TimeFrameBtns from "./components/TimeFrameBtns";
import Select from "./components/Select";
import OrdersList from "./components/OrdersList";
import { symbolOptions, barTypeToTimeframe } from "./components/utils";
import { useIndicator } from "../hooks/useIndicator";
import { useToggleIndicator } from "../hooks/useToggleIndicator";
import { useLiquidityData } from "../hooks/useLiquidityData";
import { useLiquidityRatios } from "../hooks/useLiquidityRatios";
import { TICKS } from "../../../indicators/indicatorHelpers/TICKS";
import { drawLine, drawIndicatorCandlestick } from "./components/drawFns";
import handleTimeRangeChange from "./components/handleTimeRangeChange";
// import { liquidityHeatMapConfig } from "./components/indicatorConfigs";
// import drawStrikes from "./drawStrikes";
// import MonteCarloCone from "./monteCarloSimulation";
// import TimeframeSelector from "./spyOptionsComponents/TimeframeSelector";
// import IndicatorSelector from "../../../reusableChartComponents/IndicatorSelector";
const ticks = TICKS();

const PixiChartV2 = (props) => {
    const { Socket, height = 500, orders: ordersFromParent = {}, fullSymbol } = props;

    // always need to make a ref for pixiDataRef
    const pixiDataRef = useRef();

    //most charts handle timeframe with barType and barTypePeriod
    // barType 1 = seconds, 2 = minutes, 3 = hours, 4 = days
    const [barType, setBarType] = useState({ value: 1, name: "Seconds" });
    // barTypePeriod is the number of barType units
    const [barTypePeriod, setBarTypePeriod] = useState(60);
    //human readable timeframe
    const [timeframe, setTimeframe] = useState("1m");

    //place to store ohlc data
    const [ohlcData, setOhlcData] = useState([]);

    // Loading state for data fetching
    const [isLoading, setIsLoading] = useState(false);

    // the symbol of the chart
    const [symbol, setSymbol] = useState({
        value: "ES",
        name: "ES",
        exchange: "CME",
        tickSize: ticks["ES"],
    });

    //controls various indicators
    const [indicators, setIndicators] = useState([
        liquidityHeatMapConfig,
        {
            id: "orders",
            name: "Orders",
            enabled: false,
            drawFunctionKey: "draw",
            instanceRef: null,
        },
        // { id: "zigZag", name: "ZigZag", enabled: false, drawFunctionKey: "draw", instanceRef: null },
        // { id: "marketProfile", name: "Market Profile", enabled: false, drawFunctionKey: "draw", instanceRef: null },
        // { id: "pivotLines", name: "Pivot Lines", enabled: false, drawFunctionKey: "draw", instanceRef: null },
        // { id: "monteCarlo", name: "Monte Carlo", enabled: false, drawFunctionKey: "drawHistogramHeatmap", instanceRef: null },
        // { id: "strikes", name: "Strike Lines", enabled: false, drawFunctionKey: "drawAllStrikeLines", instanceRef: null },
    ]);

    // Use custom hook for indicator toggling
    const toggleIndicator = useToggleIndicator(indicators, setIndicators, timeframe);

    // Function to update indicator options (memoized to prevent unnecessary re-renders)
    const updateIndicatorOptions = useCallback((indicatorId, newOptions) => {
        console.log("[updateIndicatorOptions] Called with:", indicatorId, newOptions);
        setIndicators((prevIndicators) => {
            return prevIndicators.map((ind) => {
                if (ind.id === indicatorId) {
                    console.log(
                        "[updateIndicatorOptions] Found indicator:",
                        ind.id,
                        "enabled:",
                        ind.enabled,
                        "instanceRef:",
                        !!ind.instanceRef
                    );
                    const updatedIndicator = {
                        ...ind,
                        options: { ...ind.options, ...newOptions },
                    };

                    // If the indicator is enabled and has an instance, update it
                    if (updatedIndicator.enabled && updatedIndicator.instanceRef) {
                        const instance = updatedIndicator.instanceRef;
                        console.log("[updateIndicatorOptions] Instance found, has setVisualizationMode:", !!instance.setVisualizationMode);

                        // Update visualization mode if changed (this triggers a redraw internally)
                        if (newOptions.visualizationMode && instance.setVisualizationMode) {
                            console.log("[updateIndicatorOptions] Calling setVisualizationMode with:", newOptions.visualizationMode);
                            instance.setVisualizationMode(newOptions.visualizationMode);
                        }

                        // Update color scheme if changed
                        if (newOptions.colorScheme && newOptions.colorScheme.colorStops) {
                            const { colorStops } = newOptions.colorScheme;
                            instance.colors = colorStops.map((stop) => stop.color);
                            instance.liquidityThresholds = colorStops.map((stop) => stop.threshold);
                            console.log("[updateIndicatorOptions] Updated color scheme:", newOptions.colorScheme.name);
                        }

                        // If we only updated color scheme (not visualization mode), trigger redraw
                        if (!newOptions.visualizationMode && newOptions.colorScheme && instance.draw) {
                            instance.draw(true);
                        }
                    } else {
                        console.log(
                            "[updateIndicatorOptions] Instance not available - enabled:",
                            updatedIndicator.enabled,
                            "instanceRef:",
                            !!updatedIndicator.instanceRef
                        );
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

    // Debug: Log indicators on mount
    useEffect(() => {
        console.log(
            "[PixiChartV2] Indicators:",
            indicators.map((ind) => ({ id: ind.id, enabled: ind.enabled }))
        );

        console.log("[PixiChartV2] Orders from parent:", Object.keys(ordersFromParent).length, "baskets");
    }, []);

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
            // Only create if timeframe is valid
            if (timeframe !== "1m" && timeframe !== "5m") {
                return null;
            }
            // Pass timeframe to LiquidityHeatmap for proper datetime alignment
            const instance = new LiquidityHeatmap(pixiData, { timeframe });
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
        dependencies: [timeframe],
    });

    // Use the useIndicator hook for orders
    useIndicator({
        indicator: ordersIndicator,
        pixiDataRef,
        createInstance: (pixiData) => {
            return new DrawOrdersV2(pixiData);
        },
        setIndicators,
        dependencies: [],
    });

    //function to get Data
    const fetchLiveDataAndUpdate = useCallback(
        async (replaceData = false) => {
            try {
                setIsLoading(true);
                console.log(`[PixiChartV2] Fetching live data for ${symbol.value} ${timeframe}`);

                const liveData = await API.rapi_requestLiveBars({
                    // barType,
                    // barTypePeriod,
                    timeframe,
                    symbol: symbol.value,
                    // exchange: getExchangeFromSymbol(symbol),
                });

                if (replaceData) {
                    // Replace data completely (for timeframe changes)
                    setOhlcData(liveData);
                    console.log(`[PixiChartV2] Replaced data with ${liveData.length} bars`);
                } else {
                    // Use functional update to avoid dependency on ohlcData
                    setOhlcData((prevOhlcData) => {
                        const result = Array.from(new Map([...prevOhlcData, ...liveData].map((b) => [b.datetime, b])).values()).sort(
                            (a, b) => a.datetime - b.datetime
                        );
                        console.log(`[PixiChartV2] Merged to ${result.length} total bars`);
                        return result;
                    });
                }
            } catch (error) {
                console.error(`[PixiChartV2] Failed to fetch live data:`, error);
            } finally {
                setIsLoading(false);
            }
        },
        [symbol.value, timeframe] // Removed ohlcData - use functional update instead
    );

    // Use the liquidity data hook for fetching and caching
    useLiquidityData({
        liquidityHeatmapIndicator,
        symbol: symbol.value,
        timeframe,
        ohlcData,
        Socket,
        indicatorsRef,
        fetchLiveDataAndUpdate, // Pass for OHLC bar fetching when needed
    });

    // Use the liquidity ratios hook for real-time ratio data (always enabled)
    useLiquidityRatios({
        symbol: symbol.value,
        Socket,
        pixiDataRef,
        enabled: true, // Always enabled
        timeframe,
        ohlcData,
    });

    // Update timeframe state when barType or barTypePeriod changes
    useEffect(() => {
        const newTimeframe = barTypeToTimeframe({
            barType: barType.value,
            barTypePeriod: barTypePeriod,
        });
        console.log(`[useEffect] barType/barTypePeriod changed - updating timeframe from "${timeframe}" to "${newTimeframe}"`);

        // Don't clear ohlcData here - let the chart show loading overlay instead
        // The data will be cleared when new data is fetched
        if (newTimeframe !== timeframe) {
            console.log(`[useEffect] Timeframe changed - will fetch new data`);
            // Set loading state to show overlay
            setIsLoading(true);
        }

        setTimeframe(newTimeframe);
    }, [barType.value, barTypePeriod, timeframe]);

    // Draw orders when indicator is enabled or orders change
    useEffect(() => {
        const ordersInstance = ordersIndicator?.instanceRef;

        console.log(
            "[Orders] useEffect - enabled:",
            ordersIndicator?.enabled,
            "instance:",
            !!ordersInstance,
            "orders count:",
            Object.keys(ordersFromParent).length
        );

        if (!ordersInstance || !ordersIndicator?.enabled) {
            return;
        }

        // Draw orders on chart
        console.log("[Orders] Drawing orders on chart...");
        ordersInstance.draw(ordersFromParent);
    }, [ordersFromParent, ordersIndicator?.enabled, ordersIndicator?.instanceRef]);

    // Handler for time range changes from GenericPixiChart
    // const handleTimeRangeChange = async ({ startTime, endTime, numDays }) => {
    //     console.log(`[PixiChartV2] Loading data for time range:`, { startTime, endTime, numDays });

    //     try {
    //         setIsLoading(true);

    //         // Convert barType/barTypePeriod to timeframe string (e.g., "1m", "5m")
    //         const timeframeStr = barTypeToTimeframe({
    //             barType: barType.value,
    //             barTypePeriod: barTypePeriod,
    //         });

    //         // Convert timestamp to MM/DD/YYYY format
    //         const startDate = new Date(startTime);
    //         const month = String(startDate.getMonth() + 1).padStart(2, "0");
    //         const day = String(startDate.getDate()).padStart(2, "0");
    //         const year = startDate.getFullYear();
    //         const formattedDate = `${month}/${day}/${year}`;

    //         console.log(`[PixiChartV2] Requesting: ${symbol.value}/${symbol.exchange}/${timeframeStr} from ${formattedDate}`);

    //         const data = await API.rapi_requestBarsTimeRange({
    //             symbol: symbol.value,
    //             exchange: symbol.exchange,
    //             timeframe: timeframeStr,
    //             startDate: formattedDate,
    //             numDays: numDays || undefined,
    //         });

    //         if (data && data.length > 0) {
    //             console.log(`[PixiChartV2] Loaded ${data.length} bars for time range`);

    //             // Process the data
    //             data.forEach((d) => {
    //                 d.datetime = d.datetime * 1000;
    //                 if (d.volume?.low !== undefined) {
    //                     d.volume = d.volume.low;
    //                 }
    //             });

    //             // Replace current data with time range data
    //             setOhlcData(data);
    //         } else {
    //             console.log("[PixiChartV2] No data available for selected time range");
    //             alert("No data available for selected time range");
    //         }
    //     } catch (error) {
    //         console.error("[PixiChartV2] Failed to load time range data:", error);
    //         alert(`Failed to load data: ${error.message}`);
    //     } finally {
    //         setIsLoading(false);
    //     }
    // };

    //main on load to get data
    useEffect(() => {
        console.log(`[useEffect] Socket setup running - symbol: ${symbol.value}, timeframe: ${timeframe}`);

        //get data from OHLC_Compiler thing - replace data on timeframe/symbol change
        fetchLiveDataAndUpdate(true);

        // Listen for COMPLETE bars for this timeframe (replaces temporary bar)
        const liveBarNew = `${timeframe}-${symbol.value}-LiveBarNew`;
        const handleLiveBarNew = (newBar) => {
            console.log(`[PixiChartV2] Complete ${timeframe} bar received`, newBar);

            // Replace temporary bar with complete bar
            pixiDataRef?.current?.setCompleteBar(newBar);
        };
        Socket.on(liveBarNew, handleLiveBarNew);

        // Listen for 1s updates (updates temporary bar)
        const liveBarUpdate = `1s-${symbol.value}-LiveBarUpdate`;
        const handleLiveBarUpdate = (tick) => {
            // console.log(`[PixiChartV2] 1s tick update`, tick);

            // Update temporary bar
            pixiDataRef?.current?.newTick(tick);
        };

        Socket.on(liveBarUpdate, handleLiveBarUpdate);

        return () => {
            Socket.off(liveBarNew, handleLiveBarNew);
            Socket.off(liveBarUpdate, handleLiveBarUpdate);
        };
    }, [symbol.value, timeframe, Socket, fetchLiveDataAndUpdate]); // Socket intentionally omitted to prevent re-registrations

    // Filter orders by current symbol
    const symbolFilteredOrders = useMemo(() => {
        const filtered = {};

        Object.keys(ordersFromParent).forEach((basketId) => {
            const orderArray = ordersFromParent[basketId];
            // Check if any order in this basket matches the current symbol
            if (orderArray && orderArray.length > 0) {
                const firstOrder = orderArray[0];
                if (firstOrder.symbol === fullSymbol) {
                    filtered[basketId] = orderArray;
                }
            }
        });

        console.log("[Orders] Filtered orders for", symbol.value, ":", Object.keys(filtered).length, "baskets");
        return filtered;
    }, [ordersFromParent, symbol.value, fullSymbol]);

    // Create lower indicators array - always visible
    const lowerIndicators = useMemo(() => {
        return [
            {
                name: "Delta",
                height: 100,
                type: "candlestick",
                accessors: "deltaClose", // For scale calculation
                drawFn: (opts) =>
                    drawIndicatorCandlestick({
                        ...opts,
                        openField: "deltaOpen",
                        highField: "deltaHigh",
                        lowField: "deltaLow",
                        closeField: "deltaClose",
                        upColor: 0x00ff00,
                        downColor: 0xff0000,
                    }),
                canGoNegative: true,
            },
            {
                name: "Near Price Ratio",
                height: 100,
                type: "candlestick",
                accessors: "nearPriceRatioClose",
                drawFn: (opts) =>
                    drawIndicatorCandlestick({
                        ...opts,
                        openField: "nearPriceRatioOpen",
                        highField: "nearPriceRatioHigh",
                        lowField: "nearPriceRatioLow",
                        closeField: "nearPriceRatioClose",
                        upColor: 0x00aa00, // Darker green
                        downColor: 0xaa0000, // Darker red
                    }),
                canGoNegative: false,
            },
            {
                name: "Full Book Ratio",
                height: 100,
                type: "candlestick",
                accessors: "fullBookRatioClose",
                drawFn: (opts) =>
                    drawIndicatorCandlestick({
                        ...opts,
                        openField: "fullBookRatioOpen",
                        highField: "fullBookRatioHigh",
                        lowField: "fullBookRatioLow",
                        closeField: "fullBookRatioClose",
                        upColor: 0x0088ff, // Bright blue
                        downColor: 0xff6600, // Orange
                    }),
                canGoNegative: false,
            },
        ];
    }, []);

    return (
        <>
            <div className="row g-0">
                <div className="col-auto">
                    <IndicatorsBtns
                        indicators={indicators}
                        toggleIndicator={toggleIndicator}
                        timeframe={timeframe}
                        updateIndicatorOptions={updateIndicatorOptions}
                    />
                </div>
                {props.withTimeFrameBtns && (
                    <div className="col-auto">
                        <TimeFrameBtns
                            barType={barType}
                            barTypePeriod={barTypePeriod}
                            setBarType={setBarType}
                            setBarTypePeriod={setBarTypePeriod}
                        />
                    </div>
                )}
                {props.withSymbolBtns && (
                    <>
                        <div className="col-auto">
                            <SymbolBtns symbolOptions={symbolOptions} symbol={symbol} setSymbol={setSymbol} />
                        </div>
                        <div className="col-auto">
                            <Select value={symbol} setValue={setSymbol} options={symbolOptions} />
                        </div>
                    </>
                )}
            </div>
            {!ohlcData?.length ? (
                <div>Loading... {symbol.value}</div>
            ) : (
                <GenericPixiChart
                    name="PixiChartV2"
                    //always add a unique key to force remount on changes to important props
                    key={`${symbol.value}-${timeframe}`} //include both symbol and timeframe in key to force remount
                    ohlcDatas={ohlcData}
                    // width={width}
                    height={height}
                    symbol={symbol.value}
                    // fullSymbolRef={fullSymbolRef}
                    barType={barType.value}
                    barTypePeriod={barTypePeriod}
                    // loadData={loadData}
                    pixiDataRef={pixiDataRef}
                    lowerIndicators={lowerIndicators}
                    onTimeRangeChange={handleTimeRangeChange}
                    isLoading={isLoading}
                    // tickSize={tickSize}
                />
            )}

            {/* Symbol-filtered orders list */}
            {Object.keys(symbolFilteredOrders).length > 0 && (
                <div className="mt-3">
                    <h5>Orders for {symbol.value}</h5>
                    <OrdersList orders={symbolFilteredOrders} />
                </div>
            )}
        </>
    );
};

export default React.memo(PixiChartV2);
