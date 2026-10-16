import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { MdDateRange } from "react-icons/md";
import GenericPixiChart from "../GenericPixiChart";
import API from "../../API";
import { LiquidityHeatmap, liquidityHeatMapConfig } from "./components/indicatorDrawFunctions";
import DrawOrdersV2 from "./components/DrawOrdersV2";
import DrawDepthSignals, { DEFAULT_DEPTH_SIGNAL_OPTIONS, DEPTH_SIGNAL_OPTION_FIELDS } from "./components/DrawDepthSignals";
import DrawDepthCues, { MAX_DEPTH_CUES } from "./components/DrawDepthCues";
import { useDepthCueHistory } from "../hooks/useDepthCueHistory";
import DrawSuperTrend from "../drawFunctions/DrawSuperTrend";
import DrawMovingAverages from "../drawFunctions/DrawMovingAverages";
import DrawExtremaAnalysis from "../drawFunctions/DrawExtremaAnalysis";
import { createDefaultExtremaIndicators, EXTREMA_INDICATOR_IDS } from "../drawFunctions/extremaAnalysisConfig";
import { loadSavedIndicatorOptions, saveIndicatorOptions } from "../drawFunctions/indicatorOptionsStorage";
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
import { useDepthSummaryBars } from "../hooks/useDepthSummaryBars";
import { TICKS } from "../../../indicators/indicatorHelpers/TICKS";
import { buildDepthLowerIndicators, createCandlesWithMovingAverageDrawFn } from "./components/depthLowerIndicators";
import handleTimeRangeChange from "./components/handleTimeRangeChange";
import { areRelatedFuturesSymbols } from "./components/futuresSymbolFamily";
// import { liquidityHeatMapConfig } from "./components/indicatorConfigs";
// import drawStrikes from "./drawStrikes";
// import MonteCarloCone from "./monteCarloSimulation";
// import TimeframeSelector from "./spyOptionsComponents/TimeframeSelector";
// import IndicatorSelector from "../../../reusableChartComponents/IndicatorSelector";
const ticks = TICKS();
const ACTUAL_CANDLE_DELTA_LINE_FIELD = "__actualCandleDeltaCumulative";
const ACTUAL_CANDLE_DELTA_LINE_COLOR = 0x4fc3f7;

const getBarSideVolumeValue = (volumeData) => {
	if (volumeData === undefined || volumeData === null) {
		return null;
	}

	if (typeof volumeData === "number") {
		return Number.isFinite(volumeData) ? volumeData : null;
	}

	if (typeof volumeData === "object") {
		const normalizedValue = volumeData.low ?? volumeData.close ?? volumeData.value ?? null;
		return typeof normalizedValue === "number" && Number.isFinite(normalizedValue) ? normalizedValue : null;
	}

	const numericValue = Number(volumeData);
	return Number.isFinite(numericValue) ? numericValue : null;
};

const getBarActualDelta = (bar) => {
	if (!bar) {
		return null;
	}

	const askVolume = getBarSideVolumeValue(bar.askVolume);
	const bidVolume = getBarSideVolumeValue(bar.bidVolume);

	if (askVolume === null && bidVolume === null) {
		return null;
	}

	return (bidVolume ?? 0) - (askVolume ?? 0);
};

const buildActualCandleDeltaLineData = (bars = []) => {
	let runningDelta = 0;

	return bars.map((bar) => {
		const barDelta = getBarActualDelta(bar);
		if (barDelta === null) {
			return { [ACTUAL_CANDLE_DELTA_LINE_FIELD]: null };
		}

		runningDelta += barDelta;
		return { [ACTUAL_CANDLE_DELTA_LINE_FIELD]: runningDelta };
	});
};

const getActualCandleDeltaExtentValues = ({ data = [] } = {}) => {
	let runningDelta = 0;
	const values = [0];

	data.forEach((bar) => {
		const barDelta = getBarActualDelta(bar);
		if (barDelta === null) {
			return;
		}

		runningDelta += barDelta;
		values.push(runningDelta);
	});

	return values;
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

const getBarTimestamp = (bar) => {
	const timestamp = Number(bar?.timestamp ?? bar?.datetime);
	return Number.isFinite(timestamp) ? timestamp : null;
};

const getExtremaAnalysisDataKey = (bars = []) => {
	if (!bars.length) return "empty";

	const firstBar = bars[0];
	const completedIndex = Math.max(0, bars.length - 2);
	const completedBar = bars[completedIndex];

	return [
		bars.length,
		getBarTimestamp(firstBar),
		firstBar?.open,
		firstBar?.high,
		firstBar?.low,
		firstBar?.close,
		getBarTimestamp(completedBar),
		completedBar?.open,
		completedBar?.high,
		completedBar?.low,
		completedBar?.close,
	].join(":");
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
	const depthCuesRef = useRef(null);
	const pendingDepthCuesRef = useRef([]);

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

	useEffect(() => {
		if (!props.symbol || props.symbol === symbol.value) return;
		setSymbol(getSymbolConfig(props.symbol));
	}, [props.symbol, symbol.value]);

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
			options: {
				...DEFAULT_DEPTH_SIGNAL_OPTIONS,
				...loadSavedIndicatorOptions("depthSignals"),
				fields: DEPTH_SIGNAL_OPTION_FIELDS,
			},
		},
		{
			id: "depthCues",
			name: "Depth Cues",
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
		...createDefaultExtremaIndicators(),
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
						!!ind.instanceRef,
					);
					const updatedIndicator = {
						...ind,
						options: { ...ind.options, ...newOptions },
					};

					if (EXTREMA_INDICATOR_IDS.includes(indicatorId) || indicatorId === "depthSignals") {
						saveIndicatorOptions(indicatorId, updatedIndicator.options);
					}

					// If the indicator is enabled and has an instance, update it
					if (updatedIndicator.enabled && updatedIndicator.instanceRef) {
						const instance = updatedIndicator.instanceRef;
						console.log("[updateIndicatorOptions] Instance found, has setVisualizationMode:", !!instance.setVisualizationMode);

						// Update visualization mode if changed (this triggers a redraw internally)
						if (newOptions.visualizationMode && instance.setVisualizationMode) {
							console.log("[updateIndicatorOptions] Calling setVisualizationMode with:", newOptions.visualizationMode);
							instance.setVisualizationMode(newOptions.visualizationMode);
						}

						if (instance.setOptions) {
							instance.setOptions(newOptions);
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
							!!updatedIndicator.instanceRef,
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
	const depthCuesIndicator = indicators.find((ind) => ind.id === "depthCues");
	const superTrendIndicator = indicators.find((ind) => ind.id === "superTrend");
	const movingAverageIndicator = indicators.find((ind) => ind.id === "movingAverages");
	const priceLevelsIndicator = indicators.find((ind) => ind.id === "priceLevels");
	const fibonacciIndicator = indicators.find((ind) => ind.id === "fibonacci");
	const trendlinesIndicator = indicators.find((ind) => ind.id === "trendlines");
	const zigZagIndicator = indicators.find((ind) => ind.id === "zigZag");
	const extremaAnalysisDataKey = useMemo(
		() => [symbol.value, timeframe, getExtremaAnalysisDataKey(ohlcData)].join("|"),
		[symbol.value, timeframe, ohlcData],
	);

	// Debug: Log indicators on mount
	useEffect(() => {
		console.log(
			"[PixiChartV2] Indicators:",
			indicators.map((ind) => ({ id: ind.id, enabled: ind.enabled })),
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

	const createExtremaInstance = useCallback((indicator) => {
		return (pixiData) => {
			if (!pixiData?.ohlcDatas || pixiData.ohlcDatas.length === 0) {
				return null;
			}
			return new DrawExtremaAnalysis(pixiData, indicator.createMode, indicator.options, 2);
		};
	}, []);

	useIndicator({
		indicator: priceLevelsIndicator,
		pixiDataRef,
		createInstance: createExtremaInstance(priceLevelsIndicator || {}),
		setIndicators,
		dependencies: [extremaAnalysisDataKey],
	});

	useIndicator({
		indicator: fibonacciIndicator,
		pixiDataRef,
		createInstance: createExtremaInstance(fibonacciIndicator || {}),
		setIndicators,
		dependencies: [extremaAnalysisDataKey],
	});

	useIndicator({
		indicator: trendlinesIndicator,
		pixiDataRef,
		createInstance: createExtremaInstance(trendlinesIndicator || {}),
		setIndicators,
		dependencies: [extremaAnalysisDataKey],
	});

	useIndicator({
		indicator: zigZagIndicator,
		pixiDataRef,
		createInstance: createExtremaInstance(zigZagIndicator || {}),
		setIndicators,
		dependencies: [extremaAnalysisDataKey],
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
							(a, b) => a.datetime - b.datetime,
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
		[symbol.value, timeframe], // Removed ohlcData - use functional update instead
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
						nextFinish,
					).toLocaleString()})`,
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
		[barType.value, barTypePeriod, normalizeBarData, symbol.exchange, symbol.value],
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
				`[PixiChartV2] Loading older data for ${symbol.value} ${timeframe} before ${new Date(finishIndex).toLocaleString()}`,
			);

			const normalized = await fetchHistoricalWindow(finishIndex);

			if (normalized.length) {
				setOhlcData((prevOhlcData) => {
					const merged = [...normalized, ...prevOhlcData];
					const deduped = Array.from(new Map(merged.map((bar) => [bar.datetime, bar])).values()).sort(
						(a, b) => a.datetime - b.datetime,
					);
					return deduped;
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
	}, [fetchHistoricalWindow, symbol.value, timeframe]);

	// Liquidity data is expensive for the server to compute/serve, so only request it
	// for the low timeframes where it's actually useful (1m/5m). Larger timeframes were
	// causing the server to crash from the volume of liquidity data requested.
	const isLiquidityTimeframe = timeframe === "1m" || timeframe === "5m";

	// Use the liquidity data hook for fetching and caching
	useLiquidityData({
		liquidityHeatmapIndicator,
		symbol: symbol.value,
		timeframe,
		ohlcData,
		Socket,
		indicatorsRef,
		fetchLiveDataAndUpdate, // Pass for OHLC bar fetching when needed
		enabled: isLiquidityTimeframe,
	});

	// Use the liquidity ratios hook for real-time ratio data
	useLiquidityRatios({
		symbol: symbol.value,
		Socket,
		pixiDataRef,
		enabled: isLiquidityTimeframe,
		timeframe,
		ohlcData,
	});

	// Depth Cumulative panel: every live depthWindow, and history rolled up per bar by the server. Bars here are
	// labelled by their close (barLabel="end"), so a bar opened one bar size before its datetime.
	const getDepthBarStart = useCallback(
		(bar) => {
			const start = Number(bar?.datetime) - depthTimeframeMs;
			return Number.isFinite(start) ? start : null;
		},
		[depthTimeframeMs],
	);
	const { applyToBars: applyDepthSummaries } = useDepthSummaryBars({
		symbol: symbol.value,
		Socket,
		pixiDataRef,
		ohlcData,
		enabled: Number.isFinite(depthTimeframeMs) && depthTimeframeMs > 0,
		bucketMs: depthTimeframeMs,
		getBarStart: getDepthBarStart,
	});
	// The bar just completed and the one opening; a merge from two bars back is a couple of binary searches
	const applyDepthSummariesToLiveBars = useCallback(() => {
		const bars = pixiDataRef.current?.ohlcDatas;
		if (bars?.length) applyDepthSummaries(bars.length - 2);
	}, [applyDepthSummaries]);

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

		const depthSignals = new DrawDepthSignals(pixiData, { filters: depthSignalsIndicator.options });
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

	useEffect(() => {
		depthSignalsRef.current?.setOptions(depthSignalsIndicator?.options);
	}, [depthSignalsIndicator?.options]);

	// Saved cues for the loaded bars; live ones arrive on depthFlowMarker-{symbol} below
	useDepthCueHistory({
		symbol: symbol.value,
		resetKey: `${symbol.value}:${timeframe}`,
		ohlcData,
		pendingRef: pendingDepthCuesRef,
		drawRef: depthCuesRef,
		getBarStart: getDepthBarStart,
	});

	// Real-time depth cues (250ms server cues) as markers at the price they fired
	const depthCueMinStrength = props.depthCueMinStrength ?? 1;
	useEffect(() => {
		const pixiData = pixiDataRef.current;
		if (!pixiData) return;
		if (!depthCuesIndicator?.enabled) {
			pixiData.unregisterDrawFn("depthCues");
			depthCuesRef.current?.cleanup?.();
			depthCuesRef.current = null;
			pixiData.draw();
			return;
		}
		if (depthCuesRef.current?.chart === pixiData) {
			depthCuesRef.current.setCues(pendingDepthCuesRef.current);
			pixiData.draw();
			return;
		}

		depthCuesRef.current?.cleanup?.();
		const depthCues = new DrawDepthCues(pixiData, { minStrength: depthCueMinStrength });
		depthCuesRef.current = depthCues;
		depthCues.setCues(pendingDepthCuesRef.current);
		pixiData.registerDrawFn("depthCues", depthCues.draw.bind(depthCues));
		pixiData.draw();

		return () => {
			pixiData.unregisterDrawFn("depthCues");
			if (depthCuesRef.current === depthCues) {
				depthCuesRef.current = null;
			}
			depthCues.cleanup();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [symbol.value, timeframe, isLoading, depthCuesIndicator?.enabled]);

	useEffect(() => {
		depthCuesRef.current?.setMinStrength(depthCueMinStrength);
	}, [depthCueMinStrength]);

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
			Object.keys(ordersFromParent).length,
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
						setOhlcData((prevOhlcData) => dataOrUpdater(prevOhlcData));
						return;
					}

					setOhlcData(dataOrUpdater);
				},
			});
		},
		[barType, barTypePeriod, symbol, setIsLoading, setOhlcData],
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

	// Server rooms for the live data below (kept apart so the main effect's other deps don't churn subscriptions)
	useEffect(() => {
		const releases = [
			Socket.subscribe("lastTrade", { symbol: symbol.value }),
			Socket.subscribe("bars", { symbol: symbol.value, tf: timeframe }),
			Socket.subscribe("bars", { symbol: symbol.value, tf: "1s" }),
		];
		return () => releases.forEach((release) => release());
	}, [Socket, symbol.value, timeframe]);

	//main on load to get data
	useEffect(() => {
		console.log(`[useEffect] Socket setup running - symbol: ${symbol.value}, timeframe: ${timeframe}`);

		//get data from OHLC_Compiler thing - replace data on timeframe/symbol change
		fetchLiveDataAndUpdate(true);

		// Update vwap on the current bar from lastTrade (OHLC_Compiler doesn't carry vwap)
		const handleLastTradeVwap = (msg) => {
			if (msg.symbol !== symbol.value || !msg.vwap) return;
			const ohlcDatas = pixiDataRef?.current?.ohlcDatas;
			if (!ohlcDatas?.length) return;
			ohlcDatas[ohlcDatas.length - 1].vwap = msg.vwap;
		};
		Socket.on("lastTrade", handleLastTradeVwap);

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

		// depthTradeSignal / depthFlowMarker are published to the depthSummary room
		Socket.subscribeDepthSummary(symbol.value);

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

		const depthCueEvent = `depthFlowMarker-${symbol.value}`;
		const handleDepthCue = (cue) => {
			const pending = pendingDepthCuesRef.current;
			pending.push(cue);
			if (pending.length > MAX_DEPTH_CUES) pending.splice(0, pending.length - MAX_DEPTH_CUES);
			depthCuesRef.current?.pushCue(cue);
		};
		Socket.on(depthCueEvent, handleDepthCue);

		return () => {
			Socket.off("lastTrade", handleLastTradeVwap);
			Socket.off(liveBarNew, handleLiveBarNew);
			Socket.off(liveBarUpdate, handleLiveBarUpdate);
			Socket.off(depthSignalEvent, handleDepthSignal);
			Socket.off(depthCueEvent, handleDepthCue);
			Socket.unsubscribeDepthSummary(symbol.value);
		};
	}, [
		symbol.value,
		timeframe,
		Socket,
		applyDepthSummariesToLiveBars,
		fetchLiveDataAndUpdate,
	]); // Socket intentionally omitted to prevent re-registrations

	useEffect(() => {
		pendingDepthSignalsRef.current = [];
		pendingDepthCuesRef.current = [];
	}, [symbol.value, timeframe]);

	// Filter orders by current symbol
	const symbolFilteredOrders = useMemo(() => {
		const filtered = {};

		Object.keys(ordersFromParent).forEach((basketId) => {
			const orderArray = ordersFromParent[basketId];
			if (!Array.isArray(orderArray) || orderArray.length === 0) return;

			const matchesSymbol = orderArray.some((orderEvent) => {
				const eventSymbol = orderEvent?.symbol || orderEvent?.fullSymbol;
				return eventSymbol && areRelatedFuturesSymbols(eventSymbol, fullSymbol || symbol.value);
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
					overlayLines: [
						{
							yField: ACTUAL_CANDLE_DELTA_LINE_FIELD,
							lineColor: ACTUAL_CANDLE_DELTA_LINE_COLOR,
							lineWidth: 2,
							dataBuilder: buildActualCandleDeltaLineData,
						},
					],
				}),
				canGoNegative: true,
				extentValueProvider: getActualCandleDeltaExtentValues,
				disableCache: true,
			},
			...buildDepthLowerIndicators(),
		];
	}, []);

	const hasParentToolbarControls =
		props.plantStatusControl ||
		props.symbolButtonsControl ||
		props.symbolSelectControl ||
		props.breadthToggleControl ||
		props.orderFlowSoundControl;
	const toolbarClassName = hasParentToolbarControls
		? props.toolbarPortalTarget
			? "platform-toolbar"
			: "row g-0 align-items-center platform-toolbar"
		: "row g-0 align-items-center";

	const toolbar = (
		<div className={toolbarClassName}>
			{props.plantStatusControl && (
				<>
					<div className="toolbar-group plant-status-toolbar">{props.plantStatusControl}</div>
					<div className="toolbar-divider" />
				</>
			)}
			{props.symbolButtonsControl && <div className="toolbar-group">{props.symbolButtonsControl}</div>}
			{props.symbolSelectControl && <div className="toolbar-group">{props.symbolSelectControl}</div>}
			{(props.symbolButtonsControl || props.symbolSelectControl) && <div className="toolbar-divider" />}
			<div className={hasParentToolbarControls ? "toolbar-group" : "col-auto"}>
				<IndicatorsBtns
					indicators={indicators}
					toggleIndicator={toggleIndicator}
					timeframe={timeframe}
					updateIndicatorOptions={updateIndicatorOptions}
				/>
			</div>
			{props.withTimeFrameBtns && (
				<div className={hasParentToolbarControls ? "toolbar-group" : "col-auto"}>
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
					<div className={hasParentToolbarControls ? "toolbar-group" : "col-auto"}>
						<SymbolBtns symbolOptions={symbolOptions} symbol={symbol} setSymbol={setSymbol} />
					</div>
					<div className={hasParentToolbarControls ? "toolbar-group" : "col-auto"}>
						<Select value={symbol} setValue={setSymbol} options={symbolOptions} />
					</div>
				</>
			)}
			{/* Date Range Toggle */}
			<div className={hasParentToolbarControls ? "toolbar-group" : "col-auto"} style={{ position: "relative" }}>
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
									style={{
										display: "block",
										width: "100%",
										padding: "4px",
										background: "#333",
										color: "#fff",
										border: "1px solid #555",
										borderRadius: "3px",
										fontSize: "12px",
									}}
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
									style={{
										width: "50px",
										padding: "4px",
										background: drUseNumDays ? "#333" : "#222",
										color: drUseNumDays ? "#fff" : "#666",
										border: "1px solid #555",
										borderRadius: "3px",
										fontSize: "12px",
									}}
								/>
							</label>
							{!drUseNumDays && (
								<label style={{ color: "#aaa", fontSize: "11px" }}>
									End Date
									<input
										type="date"
										value={drEndTime}
										onChange={(e) => setDrEndTime(e.target.value)}
										style={{
											display: "block",
											width: "100%",
											padding: "4px",
											background: "#333",
											color: "#fff",
											border: "1px solid #555",
											borderRadius: "3px",
											fontSize: "12px",
										}}
									/>
								</label>
							)}
							<button
								onClick={handleDateRangeSubmit}
								style={{
									padding: "5px 12px",
									background: "#0066cc",
									color: "#fff",
									border: "none",
									borderRadius: "3px",
									cursor: "pointer",
									fontSize: "12px",
								}}
							>
								Load
							</button>
						</div>
					)}
				</div>
				{props.breadthToggleControl && (
					<>
						<div className="toolbar-divider" />
						<div className="toolbar-group">{props.breadthToggleControl}</div>
					</>
				)}
				{props.orderFlowSoundControl && (
					<>
						<div className="toolbar-divider" />
						<div className="toolbar-group">{props.orderFlowSoundControl}</div>
					</>
				)}
			</div>
	);

	return (
		<div>
			{props.toolbarPortalTarget ? createPortal(toolbar, props.toolbarPortalTarget) : toolbar}
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
				barSizeMs={timeframeToMs(timeframe)}
				barLabel="end"
			/>

			{/* Symbol-filtered orders list */}
			{/* {Object.keys(symbolFilteredOrders).length > 0 && (
                <div className="mt-3">
                    <h5>Orders for {symbol.value}</h5>
                    <OrdersList orders={symbolFilteredOrders} />
                </div>
            )} */}
		</div>
	);
};

export default React.memo(PixiChartV2);
