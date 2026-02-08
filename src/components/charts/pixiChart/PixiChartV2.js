import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import GenericPixiChart from "../GenericPixiChart";
import API from "../../API";
import { LiquidityHeatmap, liquidityHeatMapConfig } from "./components/indicatorDrawFunctions";
import DrawOrdersV2 from "./components/DrawOrdersV2";
import DrawSuperTrend from "../drawFunctions/DrawSuperTrend";
import DrawMovingAverages from "../drawFunctions/DrawMovingAverages";
import IndicatorsBtns from "./components/IndicatorsBtns";
import SymbolBtns from "./components/SymbolBtns";
import TimeFrameBtns from "./components/TimeFrameBtns";
import Select from "./components/Select";
// import OrdersList from "./components/OrdersList";
import { symbolOptions, barTypeToTimeframe, parseBarTypeTimeFrame, normalizeBarData } from "./components/utils";
import { sendFuturesOrder } from "./components/sendFuturesOrder";
import { useIndicator } from "../hooks/useIndicator";
import { useToggleIndicator } from "../hooks/useToggleIndicator";
import { useLiquidityData } from "../hooks/useLiquidityData";
import { useLiquidityRatios } from "../hooks/useLiquidityRatios";
import { TICKS } from "../../../indicators/indicatorHelpers/TICKS";
import { drawLine, drawIndicatorCandlestick, createHistogramDrawFn, createDualHistogramDrawFn } from "./components/drawFns";
import handleTimeRangeChange from "./components/handleTimeRangeChange";
// import { liquidityHeatMapConfig } from "./components/indicatorConfigs";
// import drawStrikes from "./drawStrikes";
// import MonteCarloCone from "./monteCarloSimulation";
// import TimeframeSelector from "./spyOptionsComponents/TimeframeSelector";
// import IndicatorSelector from "../../../reusableChartComponents/IndicatorSelector";
const ticks = TICKS();
const LIQUIDITY_MA_LINE_COLOR = 0xffd966;
const BID_CANDLE_COLORS = {
	up: 0x66ff66,
	down: 0x1b5e20,
	ma: 0x00b050,
};
const ASK_CANDLE_COLORS = {
	up: 0xff9999,
	down: 0xaa1f1f,
	ma: 0xcc3333,
};
const BID_ASK_SIZE_RATIO_CONFIGS = [
	{
		id: "bid",
		openField: "bidSizeOrderRatioOpen",
		highField: "bidSizeOrderRatioHigh",
		lowField: "bidSizeOrderRatioLow",
		closeField: "bidSizeOrderRatioClose",
		maField: "bidSizeOrderRatioMA20",
		upColor: BID_CANDLE_COLORS.up,
		downColor: BID_CANDLE_COLORS.down,
		maColor: BID_CANDLE_COLORS.ma,
	},
	{
		id: "ask",
		openField: "askSizeOrderRatioOpen",
		highField: "askSizeOrderRatioHigh",
		lowField: "askSizeOrderRatioLow",
		closeField: "askSizeOrderRatioClose",
		maField: "askSizeOrderRatioMA20",
		upColor: ASK_CANDLE_COLORS.up,
		downColor: ASK_CANDLE_COLORS.down,
		maColor: ASK_CANDLE_COLORS.ma,
	},
];

const NEAR_FULL_RATIO_CONFIGS = [
	{
		id: "near",
		openField: "nearPriceRatioOpen",
		highField: "nearPriceRatioHigh",
		lowField: "nearPriceRatioLow",
		closeField: "nearPriceRatioClose",
		maField: "nearPriceRatioMA20",
		upColor: 0x00aa00,
		downColor: 0xaa0000,
	},
	{
		id: "fullBook",
		openField: "fullBookRatioOpen",
		highField: "fullBookRatioHigh",
		lowField: "fullBookRatioLow",
		closeField: "fullBookRatioClose",
		maField: "fullBookRatioMA20",
		upColor: 0x0088ff,
		downColor: 0xff6600,
	},
];

const createCandlesWithMovingAverageDrawFn = ({
	openField,
	highField,
	lowField,
	closeField,
	upColor,
	downColor,
	maField,
	maColor = LIQUIDITY_MA_LINE_COLOR,
	maLineWidth = 2,
}) => {
	return (opts) => {
		const { chartData, data } = opts;

		// Debug logging for Uber Near Above Cancellation indicator so we can inspect incoming values
		if (chartData?.name === "Uber Near Cancellation") {
			const now = Date.now();
			if (!chartData.__lastUberNearAboveLog || now - chartData.__lastUberNearAboveLog > 2000) {
				chartData.__lastUberNearAboveLog = now;
				const sampleBar = Array.isArray(data) ? data[data.length - 1] : undefined;
				console.log("[PixiChartV2] Uber Near Above Cancellation data", {
					totalBars: data?.length ?? 0,
					lastTimestamp: sampleBar?.datetime || sampleBar?.timestamp,
					open: sampleBar?.[openField],
					high: sampleBar?.[highField],
					low: sampleBar?.[lowField],
					close: sampleBar?.[closeField],
					sampleBar,
				});
			}
		}

		drawIndicatorCandlestick({
			...opts,
			openField,
			highField,
			lowField,
			closeField,
			upColor,
			downColor,
		});

		drawLine({
			...opts,
			lineColor: maColor,
			lineWidth: maLineWidth,
			yField: maField,
			skipClear: true,
		});
	};
};

const createMultiCandlesWithMovingAverageDrawFn = (configs = []) => {
	return (opts) => {
		if (!Array.isArray(configs) || configs.length === 0) return;

		configs.forEach((config, index) => {
			drawIndicatorCandlestick({
				...opts,
				openField: config.openField,
				highField: config.highField,
				lowField: config.lowField,
				closeField: config.closeField,
				upColor: config.upColor,
				downColor: config.downColor,
				skipClear: index !== 0,
			});

			if (config.maField) {
				drawLine({
					...opts,
					lineColor: config.maColor || LIQUIDITY_MA_LINE_COLOR,
					lineWidth: config.maLineWidth ?? 2,
					yField: config.maField,
					skipClear: true,
				});
			}
		});
	};
};

const PixiChartV2 = (props) => {
	const { Socket, height = 500, orders: ordersFromParent = {}, fullSymbol } = props;

	// always need to make a ref for pixiDataRef
	const pixiDataRef = useRef();
	const ohlcDataRef = useRef([]);
	const loadingMoreRef = useRef(false);
	const isLoadingRef = useRef(true);

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
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		ohlcDataRef.current = ohlcData;
	}, [ohlcData]);

	useEffect(() => {
		isLoadingRef.current = isLoading;
	}, [isLoading]);

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
		{
			id: "superTrend",
			name: "Super Trend",
			enabled: false,
			drawFunctionKey: "drawAll",
			instanceRef: null,
		},
		{
			id: "movingAverages",
			name: "Moving Averages",
			enabled: false,
			drawFunctionKey: "drawMovingAverages",
			instanceRef: null,
			layer: 2,
			options: {
				periods: [20, 50, 200],
			},
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
	const superTrendIndicator = indicators.find((ind) => ind.id === "superTrend");
	const movingAverageIndicator = indicators.find((ind) => ind.id === "movingAverages");

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

	// Use the useIndicator hook for superTrend
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
		dependencies: [ohlcData],
	});

	// Use the useIndicator hook for price moving averages
	useIndicator({
		indicator: movingAverageIndicator,
		pixiDataRef,
		createInstance: (pixiData) => {
			if (!pixiData?.ohlcDatas || pixiData.ohlcDatas.length === 0) {
				return null;
			}
			const periods = movingAverageIndicator?.options?.periods || [20, 50, 200];
			const layer = movingAverageIndicator?.layer ?? 2;
			const instance = new DrawMovingAverages(pixiData.ohlcDatas, pixiDataRef, periods, layer);
			// Expose method expected by useIndicator (registers by drawFunctionKey)
			instance.drawMovingAverages = instance.drawAll;
			return instance;
		},
		setIndicators,
		dependencies: [movingAverageIndicator?.options?.periods?.join("-") || ""],
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

	const fetchHistoricalWindow = useCallback(
		async (finishIndex) => {
			const lookbackWindow = parseBarTypeTimeFrame({
				barType: barType.value,
				barTypePeriod,
			});

			const exchange = symbol.exchange || "CME";
			const maxAttempts = 10;
			let attempt = 0;
			let normalized = [];
			let nextFinish = finishIndex;

			while (attempt < maxAttempts && nextFinish > 0) {
				const nextStart = Math.max(0, nextFinish - lookbackWindow);
				console.log(
					`[PixiChartV2] loadMore attempt ${attempt + 1} (${new Date(nextStart).toLocaleString()} -> ${new Date(
						nextFinish
					).toLocaleString()})`
				);

				const olderData = await API.rapi_requestBars({
					symbol: symbol.value,
					exchange,
					barType: barType.value,
					barTypePeriod,
					startIndex: nextStart,
					finishIndex: nextFinish,
				});

				normalized = normalizeBarData(olderData);
				if (normalized.length) {
					break;
				}

				attempt += 1;
				nextFinish = nextStart;
			}

			return normalized;
		},
		[barType.value, barTypePeriod, normalizeBarData, symbol.exchange, symbol.value]
	);

	const loadMoreData = useCallback(async () => {
		if (loadingMoreRef.current || isLoadingRef.current) {
			return;
		}

		const currentData = ohlcDataRef.current;
		if (!currentData.length) {
			return;
		}

		const earliestBar = currentData[0];
		const finishIndex = Math.floor(earliestBar?.datetime ?? earliestBar?.timestamp ?? 0);

		if (!finishIndex) {
			console.warn("[PixiChartV2] Cannot load more data - missing finishIndex");
			return;
		}

		try {
			loadingMoreRef.current = true;
			setIsLoading(true);

			console.log(
				`[PixiChartV2] Loading older data for ${symbol.value} ${timeframe} before ${new Date(finishIndex).toLocaleString()}`
			);

			const normalized = await fetchHistoricalWindow(finishIndex);

			if (normalized.length) {
				setOhlcData((prevOhlcData) => {
					const merged = [...normalized, ...prevOhlcData];
					return Array.from(new Map(merged.map((bar) => [bar.datetime, bar])).values()).sort((a, b) => a.datetime - b.datetime);
				});
			} else {
				console.log("[PixiChartV2] No additional historical data returned after multiple attempts.");
			}
		} catch (error) {
			console.error("[PixiChartV2] Failed to load more data:", error);
		} finally {
			loadingMoreRef.current = false;
			setIsLoading(false);
		}
	}, [fetchHistoricalWindow, timeframe]);

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

	const handleChartTimeRangeChange = useCallback(
		(range) => {
			if (!range?.startTime) {
				console.warn("[PixiChartV2] Ignoring time range request without startTime", range);
				return;
			}

			handleTimeRangeChange({
				...range,
				barType,
				barTypePeriod,
				symbol,
				setIsLoading,
				setOhlcData,
			});
		},
		[barType, barTypePeriod, symbol, setIsLoading, setOhlcData]
	);

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
			if (!Array.isArray(orderArray) || orderArray.length === 0) return;

			const matchesSymbol = orderArray.some((orderEvent) => {
				const eventSymbol = orderEvent?.symbol || orderEvent?.fullSymbol;
				return eventSymbol && eventSymbol === fullSymbol;
			});

			if (matchesSymbol) {
				filtered[basketId] = orderArray;
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
				drawFn: createCandlesWithMovingAverageDrawFn({
					openField: "deltaOpen",
					highField: "deltaHigh",
					lowField: "deltaLow",
					closeField: "deltaClose",
					upColor: 0x00ff00,
					downColor: 0xff0000,
					maField: "deltaMA20",
				}),
				canGoNegative: true,
			},
			{
				name: "Near vs Full Book Ratio",
				height: 120,
				type: "candlestick",
				accessors: "nearPriceRatioClose",
				candlestickSets: NEAR_FULL_RATIO_CONFIGS,
				drawFn: createMultiCandlesWithMovingAverageDrawFn(NEAR_FULL_RATIO_CONFIGS),
				canGoNegative: false,
			},
			{
				name: "Bid/Ask Order Ratio",
				height: 100,
				type: "candlestick",
				accessors: "bidOrderToAskOrderRatioClose",
				drawFn: createCandlesWithMovingAverageDrawFn({
					openField: "bidOrderToAskOrderRatioOpen",
					highField: "bidOrderToAskOrderRatioHigh",
					lowField: "bidOrderToAskOrderRatioLow",
					closeField: "bidOrderToAskOrderRatioClose",
					upColor: 0x00ffaa, // Cyan-green
					downColor: 0xff00aa, // Magenta
					maField: "bidOrderToAskOrderRatioMA20",
				}),
				canGoNegative: false,
			},
			{
				name: "Uber Near Cancellation",
				height: 100,
				type: "volume",
				accessors: "uberNearAbovePriceCancellationCountClose",
				extentFields: ["uberNearAbovePriceCancellationCountClose", "uberNearBelowPriceCancellationCountNegative"],
				drawFn: createDualHistogramDrawFn({
					positiveField: "uberNearAbovePriceCancellationCountClose",
					negativeField: "uberNearBelowPriceCancellationCountNegative",
					positiveColor: 0x00c853,
					negativeColor: 0xd50000,
					positiveMAField: "uberNearAbovePriceCancellationCountMA20",
					negativeMAField: "uberNearBelowPriceCancellationCountMA20",
					positiveMAColor: 0xc5ffb7,
					negativeMAColor: 0xffcdd2,
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
			{
				name: "Far Price Cancellation",
				height: 90,
				type: "volume",
				accessors: "farAbovePriceCancellationCountClose",
				extentFields: ["farAbovePriceCancellationCountClose", "farBelowPriceCancellationCountNegative"],
				drawFn: createDualHistogramDrawFn({
					positiveField: "farAbovePriceCancellationCountClose",
					negativeField: "farBelowPriceCancellationCountNegative",
					positiveColor: 0x00bcd4,
					negativeColor: 0xff7043,
					positiveMAField: "farAbovePriceCancellationCountMA20",
					negativeMAField: "farBelowPriceCancellationCountMA20",
					positiveMAColor: 0xb2ebf2,
					negativeMAColor: 0xffccbc,
				}),
				canGoNegative: true,
			},
			{
				name: "Majah Chasah",
				height: 90,
				type: "volume",
				accessors: "majahChasahClose",
				drawFn: createHistogramDrawFn({
					barColor: 0x00ffaa,
					maField: "majahChasahMA20",
					maColor: 0x88ffee,
				}),
				canGoNegative: false,
			},
			{
				name: "Majah Runnah",
				height: 90,
				type: "volume",
				accessors: "majahRunnahClose",
				drawFn: createHistogramDrawFn({
					barColor: 0x66ff66,
					maField: "majahRunnahMA20",
					maColor: 0xbbffbb,
				}),
				canGoNegative: false,
			},
			{
				name: "Bid/Ask Size Order Ratio",
				height: 120,
				type: "candlestick",
				accessors: "bidSizeOrderRatioClose",
				candlestickSets: BID_ASK_SIZE_RATIO_CONFIGS,
				drawFn: createMultiCandlesWithMovingAverageDrawFn(BID_ASK_SIZE_RATIO_CONFIGS),
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
			<GenericPixiChart
				name="PixiChartV2"
				//always add a unique key to force remount on changes to important props
				key={`${symbol.value}-${timeframe}`} //include both symbol and timeframe in key to force remount
				ohlcDatas={ohlcData}
				// width={width}
				height={height}
				symbol={symbol.value}
				fullSymbol={symbol.value}
				exchange={symbol.exchange} // symbol.exchange
				barType={barType.value}
				barTypePeriod={barTypePeriod}
				// loadData={loadData}
				pixiDataRef={pixiDataRef}
				lowerIndicators={lowerIndicators}
				loadMoreData={loadMoreData}
				onTimeRangeChange={handleChartTimeRangeChange}
				isLoading={isLoading}
				sendOrder={sendFuturesOrder}
			// tickSize={tickSize}
			/>

			{/* Symbol-filtered orders list */}
			{/* {Object.keys(symbolFilteredOrders).length > 0 && (
                <div className="mt-3">
                    <h5>Orders for {symbol.value}</h5>
                    <OrdersList orders={symbolFilteredOrders} />
                </div>
            )} */}
		</>
	);
};

export default React.memo(PixiChartV2);
