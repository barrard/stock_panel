import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { MdDateRange } from "react-icons/md";
import GenericPixiChart from "../GenericPixiChart";
import API from "../../API";
import { LiquidityHeatmap, liquidityHeatMapConfig } from "./components/indicatorDrawFunctions";
import DrawOrdersV2 from "./components/DrawOrdersV2";
import DrawDepthSignals from "./components/DrawDepthSignals";
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

const getSymbolConfig = (symbolValue = "ES") => {
	const option = symbolOptions.find((item) => item.value === symbolValue);
	return {
		value: symbolValue,
		name: option?.value || symbolValue,
		exchange: option?.exchange || "CME",
		tickSize: ticks[symbolValue] || ticks.ES,
	};
};

const timeframeToMs = (timeframe) => {
	if (typeof timeframe !== "string") return null;

	const match = timeframe.trim().match(/^(\d+)([smhdw])$/i);
	if (!match) return null;

	const amount = Number(match[1]);
	if (!Number.isFinite(amount) || amount <= 0) return null;

	const unit = match[2].toLowerCase();
	const unitMs =
		unit === "s"
			? 1000
			: unit === "m"
				? 60 * 1000
				: unit === "h"
					? 60 * 60 * 1000
					: unit === "d"
						? 24 * 60 * 60 * 1000
						: 7 * 24 * 60 * 60 * 1000;

	return amount * unitMs;
};

const toFiniteNumber = (value) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
};

const getBarTimestamp = (bar) => {
	const timestamp = Number(bar?.timestamp ?? bar?.datetime);
	return Number.isFinite(timestamp) ? timestamp : null;
};

const buildDepthBarKey = (timestamp, timeframeMs) => {
	if (!Number.isFinite(timestamp) || !Number.isFinite(timeframeMs) || timeframeMs <= 0) return null;
	return Math.floor(timestamp / timeframeMs) * timeframeMs;
};

const findBarByDepthKey = (bars = [], timestamp, timeframeMs) => {
	if (!Array.isArray(bars) || !bars.length) return null;
	const targetKey = buildDepthBarKey(timestamp, timeframeMs);
	if (targetKey === null) return null;

	for (let index = bars.length - 1; index >= 0; index -= 1) {
		const bar = bars[index];
		const barKey = buildDepthBarKey(getBarTimestamp(bar), timeframeMs);
		if (barKey === targetKey) {
			return bar;
		}
	}

	return null;
};

const aggregateDepthSummariesByBar = (summaries = [], timeframeMs) => {
	const aggregated = new Map();
	if (!Array.isArray(summaries) || !summaries.length || !Number.isFinite(timeframeMs) || timeframeMs <= 0) {
		return aggregated;
	}

	summaries.forEach((summary) => {
		const timestamp = toFiniteNumber(summary?.timestamp);
		const barKey = buildDepthBarKey(timestamp, timeframeMs);
		if (barKey === null) return;

		const existing = aggregated.get(barKey) || {
			depthSignalWindowScore: 0,
			depthSignalZero: 0,
			latestTimestamp: Number.NEGATIVE_INFINITY,
		};

		const nextAggregate = { ...existing };
		const windowScore = toFiniteNumber(summary?.windowScore);
		if (windowScore !== null) {
			nextAggregate.depthSignalWindowScore += windowScore;
		}

		if (timestamp >= nextAggregate.latestTimestamp) {
			const cumulative = toFiniteNumber(summary?.signalCumulative);
			const direction = toFiniteNumber(summary?.signalDirection);
			const consecutive = toFiniteNumber(summary?.signalConsecutive);

			nextAggregate.latestTimestamp = timestamp;
			if (cumulative !== null) nextAggregate.depthSignalCumulative = cumulative;
			if (direction !== null) nextAggregate.depthSignalDirection = direction;
			if (consecutive !== null) nextAggregate.depthSignalConsecutive = consecutive;
		}

		aggregated.set(barKey, nextAggregate);
	});

	return aggregated;
};

const mergeDepthAggregateIntoBar = (bar, depthAggregate, timeframeMs) => {
	if (!bar || !Number.isFinite(timeframeMs) || timeframeMs <= 0) return bar;

	const timestamp = getBarTimestamp(bar);
	const barKey = buildDepthBarKey(timestamp, timeframeMs);
	if (barKey === null) return bar;

	const aggregate = depthAggregate.get(barKey);
	if (!aggregate) return bar;

	return {
		...bar,
		...(aggregate.depthSignalCumulative !== undefined && { depthSignalCumulative: aggregate.depthSignalCumulative }),
		...(aggregate.depthSignalWindowScore !== undefined && { depthSignalWindowScore: aggregate.depthSignalWindowScore }),
		...(aggregate.depthSignalDirection !== undefined && { depthSignalDirection: aggregate.depthSignalDirection }),
		...(aggregate.depthSignalConsecutive !== undefined && { depthSignalConsecutive: aggregate.depthSignalConsecutive }),
		depthSignalZero: 0,
	};
};

const PixiChartV2 = (props) => {
	const { Socket, height = 500, orders: ordersFromParent = {}, fullSymbol } = props;

	// always need to make a ref for pixiDataRef
	const pixiDataRef = useRef();
	const ohlcDataRef = useRef([]);
	const loadingMoreRef = useRef(false);
	const isLoadingRef = useRef(true);
	const depthSignalsRef = useRef(null);
	const pendingDepthSignalsRef = useRef([]);
	const depthSummaryEventsRef = useRef([]);
	const depthSummaryAggregationRef = useRef(new Map());

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

	// Date range picker state
	const [showDateRange, setShowDateRange] = useState(false);
	const [drStartTime, setDrStartTime] = useState("");
	const [drEndTime, setDrEndTime] = useState("");
	const [drNumDays, setDrNumDays] = useState("5");
	const [drUseNumDays, setDrUseNumDays] = useState(true);

	useEffect(() => {
		ohlcDataRef.current = ohlcData;
	}, [ohlcData]);

	useEffect(() => {
		isLoadingRef.current = isLoading;
	}, [isLoading]);

	const depthTimeframeMs = useMemo(() => timeframeToMs(timeframe), [timeframe]);

	// the symbol of the chart
	const [symbol, setSymbol] = useState(() => getSymbolConfig(props.symbol || "ES"));

	const rebuildDepthSummaryAggregation = useCallback(() => {
		depthSummaryAggregationRef.current = aggregateDepthSummariesByBar(depthSummaryEventsRef.current, depthTimeframeMs);
	}, [depthTimeframeMs]);

	const hydrateBarsWithDepthSummaries = useCallback(
		(bars = []) => {
			if (!Array.isArray(bars) || !bars.length) return Array.isArray(bars) ? bars : [];
			const depthAggregate = depthSummaryAggregationRef.current;
			if (!depthAggregate?.size || !Number.isFinite(depthTimeframeMs) || depthTimeframeMs <= 0) return bars;

			return bars.map((bar) => mergeDepthAggregateIntoBar(bar, depthAggregate, depthTimeframeMs));
		},
		[depthTimeframeMs]
	);

	const applyDepthSummaryToBarInPlace = useCallback(
		(bar) => {
			if (!bar || !Number.isFinite(depthTimeframeMs) || depthTimeframeMs <= 0) return false;

			const timestamp = getBarTimestamp(bar);
			const barKey = buildDepthBarKey(timestamp, depthTimeframeMs);
			if (barKey === null) return false;

			const aggregate = depthSummaryAggregationRef.current.get(barKey);
			if (!aggregate) return false;

			let changed = false;
			const assignIfDifferent = (field, value) => {
				if (value === undefined || bar[field] === value) return;
				bar[field] = value;
				changed = true;
			};

			assignIfDifferent("depthSignalCumulative", aggregate.depthSignalCumulative);
			assignIfDifferent("depthSignalWindowScore", aggregate.depthSignalWindowScore);
			assignIfDifferent("depthSignalDirection", aggregate.depthSignalDirection);
			assignIfDifferent("depthSignalConsecutive", aggregate.depthSignalConsecutive);
			assignIfDifferent("depthSignalZero", 0);

			return changed;
		},
		[depthTimeframeMs]
	);

	const applyDepthSummariesToLiveBars = useCallback(() => {
		const bars = pixiDataRef.current?.ohlcDatas;
		if (!Array.isArray(bars) || !bars.length) return;

		const changed = [bars[bars.length - 2], bars[bars.length - 1]].some((bar) => applyDepthSummaryToBarInPlace(bar));
		if (changed) {
			pixiDataRef.current?.draw();
		}
	}, [applyDepthSummaryToBarInPlace]);

	useEffect(() => {
		if (!props.symbol || props.symbol === symbol.value) return;
		setSymbol(getSymbolConfig(props.symbol));
	}, [props.symbol, symbol.value]);

	useEffect(() => {
		depthSummaryEventsRef.current = [];
		depthSummaryAggregationRef.current = new Map();
	}, [symbol.value]);

	useEffect(() => {
		rebuildDepthSummaryAggregation();
	}, [rebuildDepthSummaryAggregation]);

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
			id: "depthSignals",
			name: "Depth Signals",
			enabled: true,
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
	const depthSignalsIndicator = indicators.find((ind) => ind.id === "depthSignals");
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
					setOhlcData(hydrateBarsWithDepthSummaries(liveData));
					console.log(`[PixiChartV2] Replaced data with ${liveData.length} bars`);
				} else {
					// Use functional update to avoid dependency on ohlcData
					setOhlcData((prevOhlcData) => {
						const result = Array.from(new Map([...prevOhlcData, ...liveData].map((b) => [b.datetime, b])).values()).sort(
							(a, b) => a.datetime - b.datetime
						);
						console.log(`[PixiChartV2] Merged to ${result.length} total bars`);
						return hydrateBarsWithDepthSummaries(result);
					});
				}
			} catch (error) {
				console.error(`[PixiChartV2] Failed to fetch live data:`, error);
			} finally {
				setIsLoading(false);
			}
		},
		[hydrateBarsWithDepthSummaries, symbol.value, timeframe] // Removed ohlcData - use functional update instead
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
					const deduped = Array.from(new Map(merged.map((bar) => [bar.datetime, bar])).values()).sort(
						(a, b) => a.datetime - b.datetime
					);
					return hydrateBarsWithDepthSummaries(deduped);
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
	}, [fetchHistoricalWindow, hydrateBarsWithDepthSummaries, symbol.value, timeframe]);

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

	useEffect(() => {
		const pixiData = pixiDataRef.current;
		if (!pixiData) return;
		if (!depthSignalsIndicator?.enabled) {
			pixiData.unregisterDrawFn("depthSignals");
			depthSignalsRef.current?.clearSignals?.();
			depthSignalsRef.current?.cleanup?.();
			depthSignalsRef.current = null;
			pixiData.draw();
			return;
		}
		if (depthSignalsRef.current?.chart === pixiData) {
			depthSignalsRef.current.setSignals(pendingDepthSignalsRef.current);
			pixiData.draw();
			return;
		}

		depthSignalsRef.current?.cleanup?.();

		const depthSignals = new DrawDepthSignals(pixiData);
		depthSignalsRef.current = depthSignals;
		depthSignals.setSignals(pendingDepthSignalsRef.current);
		pixiData.registerDrawFn("depthSignals", depthSignals.draw.bind(depthSignals));
		pixiData.draw();

		return () => {
			pixiData.unregisterDrawFn("depthSignals");
			if (depthSignalsRef.current === depthSignals) {
				depthSignalsRef.current = null;
			}
			depthSignals.cleanup();
		};
	}, [symbol.value, timeframe, isLoading, depthSignalsIndicator?.enabled]);

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
				setOhlcData: (dataOrUpdater) => {
					if (typeof dataOrUpdater === "function") {
						setOhlcData((prevOhlcData) => hydrateBarsWithDepthSummaries(dataOrUpdater(prevOhlcData)));
						return;
					}

					setOhlcData(hydrateBarsWithDepthSummaries(dataOrUpdater));
				},
			});
		},
		[barType, barTypePeriod, hydrateBarsWithDepthSummaries, symbol, setIsLoading, setOhlcData]
	);

	const handleDateRangeSubmit = useCallback(() => {
		if (!drStartTime) return alert("Please provide a start date");
		const startTimestamp = new Date(drStartTime + "T00:00:00").getTime();
		if (drUseNumDays) {
			if (!drNumDays || drNumDays <= 0) return alert("Please provide a valid number of days");
			handleChartTimeRangeChange({ startTime: startTimestamp, numDays: parseInt(drNumDays) });
		} else {
			if (!drEndTime) return alert("Please provide an end date");
			const endTimestamp = new Date(drEndTime + "T23:59:59.999").getTime();
			if (startTimestamp >= endTimestamp) return alert("Start date must be before end date");
			handleChartTimeRangeChange({ startTime: startTimestamp, endTime: endTimestamp });
		}
		setShowDateRange(false);
	}, [drStartTime, drEndTime, drNumDays, drUseNumDays, handleChartTimeRangeChange]);

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
			applyDepthSummariesToLiveBars();
		};
		Socket.on(liveBarNew, handleLiveBarNew);

		// Listen for 1s updates (updates temporary bar)
		const liveBarUpdate = `1s-${symbol.value}-LiveBarUpdate`;
		const handleLiveBarUpdate = (tick) => {
			// console.log(`[PixiChartV2] 1s tick update`, tick);

			// Update temporary bar
			pixiDataRef?.current?.newTick(tick);
			applyDepthSummariesToLiveBars();
		};

		Socket.on(liveBarUpdate, handleLiveBarUpdate);

		const depthSummaryEvent = `depthSummary-${symbol.value}`;
		const handleDepthSummary = (summary) => {
			const timestamp = toFiniteNumber(summary?.timestamp) ?? Date.now();
			depthSummaryEventsRef.current = [...depthSummaryEventsRef.current.slice(-499), { ...summary, timestamp }];
			rebuildDepthSummaryAggregation();

			const targetBar = findBarByDepthKey(pixiDataRef.current?.ohlcDatas, timestamp, depthTimeframeMs);
			if (applyDepthSummaryToBarInPlace(targetBar)) {
				pixiDataRef.current?.draw();
			}
		};
		Socket.on(depthSummaryEvent, handleDepthSummary);

		const depthSignalEvent = `depthTradeSignal-${symbol.value}`;
		const handleDepthSignal = (signal) => {
			const nextSignal = {
				...signal,
				timestamp: signal?.timestamp || Date.now(),
				receivedAt: Date.now(),
			};
			pendingDepthSignalsRef.current = [...pendingDepthSignalsRef.current.slice(-99), nextSignal];
			depthSignalsRef.current?.pushSignal(nextSignal);
		};
		Socket.on(depthSignalEvent, handleDepthSignal);

		return () => {
			Socket.off(liveBarNew, handleLiveBarNew);
			Socket.off(liveBarUpdate, handleLiveBarUpdate);
			Socket.off(depthSummaryEvent, handleDepthSummary);
			Socket.off(depthSignalEvent, handleDepthSignal);
		};
	}, [
		symbol.value,
		timeframe,
		Socket,
		applyDepthSummariesToLiveBars,
		applyDepthSummaryToBarInPlace,
		depthTimeframeMs,
		fetchLiveDataAndUpdate,
		rebuildDepthSummaryAggregation,
	]); // Socket intentionally omitted to prevent re-registrations

	useEffect(() => {
		pendingDepthSignalsRef.current = [];
	}, [symbol.value, timeframe]);

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
				name: "Depth Cumulative",
				height: 90,
				type: "line",
				accessors: "depthSignalCumulative",
				lineColor: 0xfdd835,
				canGoNegative: true,
			},
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
			<div className="row g-0 align-items-center">
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
				{/* Date Range Toggle */}
				<div className="col-auto" style={{ position: "relative" }}>
					<button
						onClick={() => setShowDateRange((v) => !v)}
						title="Load Date Range"
						style={{
							background: showDateRange ? "steelblue" : "#333",
							border: "1px solid #555",
							borderRadius: "4px",
							color: "#fff",
							cursor: "pointer",
							padding: "4px 8px",
							display: "flex",
							alignItems: "center",
							gap: "4px",
							fontSize: "12px",
						}}
					>
						<MdDateRange size={16} />
					</button>
					{showDateRange && (
						<div
							style={{
								position: "absolute",
								top: "100%",
								left: 0,
								zIndex: 10000,
								background: "#222",
								border: "1px solid #555",
								borderRadius: "4px",
								padding: "8px",
								display: "flex",
								flexDirection: "column",
								gap: "6px",
								minWidth: "240px",
								boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
							}}
						>
							<label style={{ color: "#aaa", fontSize: "11px" }}>
								Start Date
								<input
									type="date"
									value={drStartTime}
									onChange={(e) => setDrStartTime(e.target.value)}
									style={{ display: "block", width: "100%", padding: "4px", background: "#333", color: "#fff", border: "1px solid #555", borderRadius: "3px", fontSize: "12px" }}
								/>
							</label>
							<label style={{ color: "#aaa", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>
								<input type="checkbox" checked={drUseNumDays} onChange={(e) => setDrUseNumDays(e.target.checked)} />
								Days
								<input
									type="number"
									min="1"
									value={drNumDays}
									onChange={(e) => setDrNumDays(e.target.value)}
									disabled={!drUseNumDays}
									style={{ width: "50px", padding: "4px", background: drUseNumDays ? "#333" : "#222", color: drUseNumDays ? "#fff" : "#666", border: "1px solid #555", borderRadius: "3px", fontSize: "12px" }}
								/>
							</label>
							{!drUseNumDays && (
								<label style={{ color: "#aaa", fontSize: "11px" }}>
									End Date
									<input
										type="date"
										value={drEndTime}
										onChange={(e) => setDrEndTime(e.target.value)}
										style={{ display: "block", width: "100%", padding: "4px", background: "#333", color: "#fff", border: "1px solid #555", borderRadius: "3px", fontSize: "12px" }}
									/>
								</label>
							)}
							<button
								onClick={handleDateRangeSubmit}
								style={{ padding: "5px 12px", background: "#0066cc", color: "#fff", border: "none", borderRadius: "3px", cursor: "pointer", fontSize: "12px" }}
							>
								Load
							</button>
						</div>
					)}
				</div>
			</div>
			<GenericPixiChart
				name="PixiChartV2"
				key={`${symbol.value}-${timeframe}`}
				ohlcDatas={ohlcData}
				height={height}
				symbol={symbol.value}
				fullSymbol={fullSymbol || symbol.value}
				exchange={symbol.exchange}
				barType={barType.value}
				barTypePeriod={barTypePeriod}
				pixiDataRef={pixiDataRef}
				lowerIndicators={lowerIndicators}
				loadMoreData={loadMoreData}
				onTimeRangeChange={handleChartTimeRangeChange}
				hideTimeRangeOverlay={true}
				isLoading={isLoading}
				sendOrder={sendFuturesOrder}
				margin={{ top: 50, right: 50, left: 0, bottom: 40 }}
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
