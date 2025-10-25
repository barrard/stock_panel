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
// import { liquidityHeatMapConfig } from "./components/indicatorConfigs";
// import drawStrikes from "./drawStrikes";
// import MonteCarloCone from "./monteCarloSimulation";
// import TimeframeSelector from "./spyOptionsComponents/TimeframeSelector";
// import IndicatorSelector from "../../../reusableChartComponents/IndicatorSelector";
const ticks = TICKS();

const PixiChartV2 = (props) => {
    const { Socket, height = 500, orders: ordersFromParent = {} } = props;

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

    //function to get Data
    async function fetchLiveDataAndUpdate() {
        const liveData = await API.rapi_requestLiveBars({
            // barType,
            // barTypePeriod,
            timeframe,
            symbol: symbol.value,
            // exchange: getExchangeFromSymbol(symbol),
        });
        // console.log(liveData);
        liveData.forEach((d) => {
            d.datetime = d.datetime * 1000;
            if (d.volume.low) {
                d.volume = d.volume.low;
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

    // Handler for time range changes from GenericPixiChart
    const handleTimeRangeChange = async ({ startTime, endTime, numDays }) => {
        console.log(`[PixiChartV2] Loading data for time range:`, { startTime, endTime, numDays });

        try {
            // Convert barType/barTypePeriod to timeframe string (e.g., "1m", "5m")
            const timeframeStr = barTypeToTimeframe({
                barType: barType.value,
                barTypePeriod: barTypePeriod,
            });

            // Convert timestamp to MM/DD/YYYY format
            const startDate = new Date(startTime);
            const month = String(startDate.getMonth() + 1).padStart(2, "0");
            const day = String(startDate.getDate()).padStart(2, "0");
            const year = startDate.getFullYear();
            const formattedDate = `${month}/${day}/${year}`;

            console.log(`[PixiChartV2] Requesting: ${symbol.value}/${symbol.exchange}/${timeframeStr} from ${formattedDate}`);

            const data = await API.rapi_requestBarsTimeRange({
                symbol: symbol.value,
                exchange: symbol.exchange,
                timeframe: timeframeStr,
                startDate: formattedDate,
                numDays: numDays || undefined,
            });

            if (data && data.length > 0) {
                console.log(`[PixiChartV2] Loaded ${data.length} bars for time range`);

                // Process the data
                data.forEach((d) => {
                    d.datetime = d.datetime * 1000;
                    if (d.volume?.low !== undefined) {
                        d.volume = d.volume.low;
                    }
                });

                // Replace current data with time range data
                setOhlcData(data);
            } else {
                console.log("[PixiChartV2] No data available for selected time range");
                alert("No data available for selected time range");
            }
        } catch (error) {
            console.error("[PixiChartV2] Failed to load time range data:", error);
            alert(`Failed to load data: ${error.message}`);
        }
    };

    const addBar = (newBar) => {
        newBar.datetime = newBar.datetime * 1000;
        newBar.volume = newBar.volume.low;
        pixiDataRef?.current?.setNewBar(newBar);
    };
    const updateBar = (tick) => {
        tick.datetime = tick.datetime * 1000;
        tick.volume = tick.volume.low;
        pixiDataRef?.current?.newTick(tick);
    };
    //main on load to get data
    useEffect(() => {
        console.log(`[useEffect] Socket setup running - symbol: ${symbol.value}, timeframe: ${timeframe}`);

        //get data from OHLC_Compiler thing
        fetchLiveDataAndUpdate();

        const liveBarNew = `${timeframe}-${symbol.value}-LiveBarNew`;
        const handleLiveBarNew = (newBar) => {
            // setNewSpyMinuteBar(d);
            //add this to ohlcData
            console.log("new live bar", newBar);
            addBar(newBar);
        };
        Socket.on(liveBarNew, handleLiveBarNew);

        const liveBarUpdate = `1s-${symbol.value}-LiveBarUpdate`;
        const handleLiveBarUpdate = (tick) => {
            //update last ohlcBar
            // console.log("tick", tick);
            updateBar(tick);
        };
        Socket.on(liveBarUpdate, handleLiveBarUpdate);

        return () => {
            Socket.off(liveBarNew, handleLiveBarNew);
            Socket.off(liveBarUpdate, handleLiveBarUpdate);
        };
    }, [symbol.value, timeframe]); // Socket intentionally omitted to prevent re-registrations

    // Filter orders by current symbol
    const symbolFilteredOrders = useMemo(() => {
        const filtered = {};
        Object.keys(ordersFromParent).forEach((basketId) => {
            const orderArray = ordersFromParent[basketId];
            // Check if any order in this basket matches the current symbol
            if (orderArray && orderArray.length > 0) {
                const firstOrder = orderArray[0];
                if (firstOrder.symbol === symbol.value) {
                    filtered[basketId] = orderArray;
                }
            }
        });

        console.log("[Orders] Filtered orders for", symbol.value, ":", Object.keys(filtered).length, "baskets");
        return filtered;
    }, [ordersFromParent, symbol.value]);

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
                    key={symbol.value} //symbol works well for as the key
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

export default PixiChartV2;
