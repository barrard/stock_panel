import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GenericPixiChart from "./charts/GenericPixiChart";
import API from "./API";
import DrawDepthSignals from "./charts/pixiChart/components/DrawDepthSignals";
import {
	createDualHistogramDrawFn,
	createHistogramDrawFn,
	drawLine,
} from "./charts/pixiChart/components/drawFns";
import { TICKS } from "../indicators/indicatorHelpers/TICKS";
import { useIndicator } from "./charts/hooks/useIndicator";

const {
	DEFAULT_TUNING_OPTIONS,
	TUNING_FIELD_META,
	DepthSignalAnalyzer,
} = require("../shared/depthSignalAnalyzerShared");

const DEFAULT_SYMBOL = "ES";
const DEFAULT_EXCHANGE = "CME";
const DEFAULT_TIMEFRAME = "10s";
const DEFAULT_WINDOW_SECONDS = 10;

const toTimestamp = (value) => {
	const numericValue = Number(value);
	if (Number.isFinite(numericValue)) {
		return numericValue > 1e12 ? numericValue : numericValue * 1000;
	}

	const parsed = new Date(value).getTime();
	return Number.isFinite(parsed) ? parsed : null;
};

const normalizeBar = (bar = {}) => {
	const timestamp = toTimestamp(bar.datetime ?? bar.timestamp);
	return {
		...bar,
		datetime: timestamp ?? Date.now(),
		timestamp: timestamp ?? Date.now(),
	};
};

const buildBucketKey = (timestamp, timeframeMs) => {
	if (!Number.isFinite(timestamp) || !Number.isFinite(timeframeMs) || timeframeMs <= 0) return null;
	return Math.floor(timestamp / timeframeMs) * timeframeMs;
};

const createLineDrawFn = (yField, lineColor) => {
	return (opts) => {
		drawLine({
			...opts,
			yField,
			lineColor,
			lineWidth: 2,
		});
	};
};

const createLineWithZeroDrawFn = (yField, lineColor, zeroField = "depthZeroLine", zeroColor = 0x666666) => {
	return (opts) => {
		drawLine({
			...opts,
			yField,
			lineColor,
			lineWidth: 2,
		});
		drawLine({
			...opts,
			yField: zeroField,
			lineColor: zeroColor,
			lineWidth: 1,
			skipClear: true,
		});
	};
};

const buildDepthSignalPayload = (row = {}) => {
	const timestamp = toTimestamp(row.snapshotTimestamp ?? row.createdAt);
	const direction = Number(row.signalDirection) || (Number(row.windowScore) > 0 ? 1 : Number(row.windowScore) < 0 ? -1 : 0);

	if (!direction || !Number.isFinite(timestamp) || !Number.isFinite(Number(row.lastPrice))) {
		return null;
	}

	return {
		symbol: row.symbol,
		frontMonth: row.frontMonth,
		direction,
		lastPrice: Number(row.lastPrice),
		cumulative: Number(row.cumulative) || 0,
		consecutive: Number(row.signalConsecutive) || 0,
		windowScore: Number(row.windowScore) || 0,
		narrative: row.narrative || "",
		timestamp,
		signalType: row.signalType || "primary",
		signalSeverity: row.signalSeverity || "normal",
		signalImpulseScore: Number(row.signalImpulseScore) || 0,
	};
};

const buildReplayRows = (rows = [], tickSize) => {
	if (!Array.isArray(rows) || !rows.length) return [];

	return rows
		.map((row, index) => {
			const previousWindow = index > 0 ? rows[index - 1] : null;
			const recentWindows = rows.slice(Math.max(0, index - 6), index);
			const currentPrice = Number(row.lastPrice) || 0;
			const previousPrice = Number(previousWindow?.lastPrice) || currentPrice;
			const timingMetrics = row.timingMetrics || {};

			return {
				...row,
				timestamp: toTimestamp(row.snapshotTimestamp ?? row.createdAt),
				liveAgedNearDelta: Number(timingMetrics.liveAgedNearDelta ?? row.liveAgedNearDelta) || 0,
				persistNearDelta: Number(timingMetrics.persistNearDelta ?? row.persistNearDelta) || 0,
				context: {
					previousWindow: previousWindow
						? {
								...previousWindow,
								liveAgedNearDelta:
									Number(previousWindow?.timingMetrics?.liveAgedNearDelta ?? previousWindow?.liveAgedNearDelta) || 0,
								windowScore: Number(previousWindow?.windowScore) || 0,
						  }
						: null,
					recentWindows: recentWindows.map((recentRow) => ({
						...recentRow,
						priceDelta:
							Number(recentRow.lastPrice) -
							(Number(rows[Math.max(0, rows.indexOf(recentRow) - 1)]?.lastPrice) || Number(recentRow.lastPrice)),
						windowScore: Number(recentRow.windowScore) || 0,
					})),
					priceDeltaFromPrev: currentPrice - previousPrice,
					tickSize,
				},
			};
		})
		.filter((row) => Number.isFinite(row.timestamp));
};

const mergeDepthRowsIntoBars = (bars = [], depthRows = [], timeframeMs = 10_000) => {
	if (!Array.isArray(bars) || !bars.length) return [];
	if (!Array.isArray(depthRows) || !depthRows.length) return bars;

	const depthMap = new Map();
	depthRows.forEach((row) => {
		const timestamp = toTimestamp(row.snapshotTimestamp ?? row.createdAt);
		const key = buildBucketKey(timestamp, timeframeMs);
		if (key === null) return;
		depthMap.set(key, row);
	});

	return bars.map((bar) => {
		const key = buildBucketKey(toTimestamp(bar.datetime ?? bar.timestamp), timeframeMs);
		const row = key !== null ? depthMap.get(key) : null;
		if (!row) {
			return {
				...bar,
				depthWindowScore: 0,
				depthZeroLine: 0,
				depthCumulative: 0,
				depthTradeCountRatio: 0,
				depthReplenishmentRatio: 0,
				depthWallDriftTowardPrice: 0,
				depthLiveAgedNearDelta: 0,
				depthPersistNearDelta: 0,
				depthFlashNearDelta: 0,
				depthBuyNet: 0,
				depthSellNetNegative: 0,
				depthBuyAbsorbCount: 0,
				depthSellAbsorbCountNegative: 0,
				depthBuyQuickCancelCount: 0,
				depthSellQuickCancelCountNegative: 0,
				depthBuyStalking: 0,
				depthSellStalkingNegative: 0,
				depthBuyRetreating: 0,
				depthSellRetreatingNegative: 0,
			};
		}

		const timingMetrics = row.timingMetrics || {};
		return {
			...bar,
			depthWindowScore: Number(row.windowScore) || 0,
			depthZeroLine: 0,
			depthCumulative: Number(row.cumulative) || 0,
			depthTradeCountRatio: Number(row.tradeCountRatio) || 0,
			depthReplenishmentRatio: Number(row.replenishmentRatio) || 0,
			depthWallDriftTowardPrice: Number(row.wallDriftTowardPrice) || 0,
			depthLiveAgedNearDelta: Number(timingMetrics.liveAgedNearDelta ?? row.liveAgedNearDelta) || 0,
			depthPersistNearDelta: Number(timingMetrics.persistNearDelta ?? row.persistNearDelta) || 0,
			depthFlashNearDelta: Number(timingMetrics.flashNearDelta ?? row.flashNearDelta) || 0,
			depthBuyNet: Number(row.buyNet) || 0,
			depthSellNetNegative: -(Number(row.sellNet) || 0),
			depthBuyAbsorbCount: Number(row.buyAbsorbCount) || 0,
			depthSellAbsorbCountNegative: -(Number(row.sellAbsorbCount) || 0),
			depthBuyQuickCancelCount: Number(row.buyQuickCancelCount) || 0,
			depthSellQuickCancelCountNegative: -(Number(row.sellQuickCancelCount) || 0),
			depthBuyStalking: Number(row.buyStalking) || 0,
			depthSellStalkingNegative: -(Number(row.sellStalking) || 0),
			depthBuyRetreating: Number(row.buyRetreating) || 0,
			depthSellRetreatingNegative: -(Number(row.sellRetreating) || 0),
		};
	});
};

const OMIT_TUNING_KEYS = new Set(["enableAnsi", "cacheLimit"]);
const NON_SIGNAL_COUNT_KEYS = new Set([
	"depthAlertMinDepthEvents",
	"depthAlertMinChurnRatio",
	"depthAlertMinWallDriftTicks",
	"severityWindowStrongThreshold",
	"severityWindowVeryStrongThreshold",
	"severityCumulativeStrongThreshold",
	"severityCumulativeVeryStrongThreshold",
	"severityTradeRatioThreshold",
	"severityTradeRatioVeryStrongThreshold",
	"severityTradeCountThreshold",
	"severityDomNetStrongThreshold",
	"severityDomNetVeryStrongThreshold",
	"severityWeakNetStrongThreshold",
	"severityWeakNetVeryStrongThreshold",
	"severityPriceAlignTicksThreshold",
	"severityLiveAgedThreshold",
	"severityStrongScore",
	"severityVeryStrongScore",
	"heavyVolThreshold",
	"activeVolThreshold",
	"veryQuietThreshold",
	"slowThreshold",
	"fastPriceMoveTicks",
	"liveFlipNearDeltaThreshold",
	"liveFlipPrevNearDeltaThreshold",
	"liveFlipPriceTicksThreshold",
	"liveFlipPersistDeltaThreshold",
	"stopFlushPriceTicksThreshold",
	"stopFlushPersistDeltaThreshold",
	"stopFlushLiveAgedDeltaThreshold",
	"stopFlushPrevScoreThreshold",
	"bothSidesBuildThreshold",
	"bothSidesDrainThreshold",
	"wallNarrativeThreshold",
	"bookTearingCancelToMoveRatio",
	"bookThickThreshold",
	"bookThickMinDepthEvents",
	"absorbCountThreshold",
	"absorbDominanceRatio",
	"spoofBaseThreshold",
	"spoofDepthEventPct",
	"flashNearCancelThreshold",
	"stalkingThreshold",
	"stalkingDominanceRatio",
	"retreatingThreshold",
	"retreatingDominanceRatio",
]);

const TUNING_LAYOUT = [
	{
		id: "core",
		label: "Core",
		controls: [
			{ primary: "decay" },
			{ primary: "baseThreshold", secondary: ["baseMinConsecutive", "historySize", "signalDirectionThreshold"] },
			{ primary: "chopThreshold", secondary: ["chopMinConsecutive", "chopLookback", "choppySignChangesThreshold"] },
			{ primary: "cooldownMs", secondary: ["impulseCooldownMs", "continuationCooldownFactor", "continuationCooldownFloorMs"] },
		],
	},
	{
		id: "score",
		label: "Score",
		controls: [
			{ primary: "heavyVolThreshold", secondary: ["activeVolThreshold", "scoreHeavyVolBonus", "scoreActiveVolBonus"] },
			{ primary: "significantImbalancePct", secondary: ["significantImbalanceMin", "significantImbalanceCap"] },
			{ primary: "scoreImbalanceRatioThreshold", secondary: ["scoreCloseNetBonus", "farNetDominanceRatio"] },
			{ primary: "scoreWallDriftThreshold" },
			{ primary: "bookVacuumThreshold", secondary: ["bookVacuumWeakThreshold", "bookThinThreshold", "scoreLowReplenishmentBonus", "scoreMidReplenishmentBonus"] },
			{ primary: "scoreLiveAgedStrongThreshold", secondary: ["scoreLiveAgedVeryStrongThreshold", "scoreLiveAgedNegativeThreshold", "scoreLiveAgedStrongBonus", "scoreLiveAgedNegativePenalty"] },
		],
	},
	{
		id: "continuation",
		label: "Continuation",
		controls: [
			{ primary: "continuationWindowThreshold" },
			{ primary: "continuationThresholdFloor", secondary: ["continuationThresholdOffset"] },
			{ primary: "continuationBookTotalThreshold", secondary: ["continuationBookAdvantageThreshold"] },
		],
	},
	{
		id: "impulse",
		label: "Impulse",
		controls: [
			{ primary: "impulseWindowThreshold" },
			{ primary: "impulseCumulativeFloor", secondary: ["impulseBaseThresholdOffset"] },
			{ primary: "impulseSevereOrderFlowMin", secondary: ["impulseSevereOrderFlowPct"] },
			{ primary: "impulseBookAdvantageThreshold", secondary: ["impulseBookReplenishmentThreshold", "impulseActiveTradeRatioThreshold", "impulseActiveTradeCountThreshold"] },
		],
	},
	{
		id: "severity",
		label: "Severity",
		controls: [
			{ primary: "severityStrongScore", secondary: ["severityVeryStrongScore"] },
			{ primary: "severityTradeRatioThreshold", secondary: ["severityTradeRatioVeryStrongThreshold", "severityTradeCountThreshold"] },
			{ primary: "severityWindowStrongThreshold", secondary: ["severityWindowVeryStrongThreshold", "severityCumulativeStrongThreshold", "severityCumulativeVeryStrongThreshold"] },
			{ primary: "severityDomNetStrongThreshold", secondary: ["severityDomNetVeryStrongThreshold", "severityWeakNetStrongThreshold", "severityWeakNetVeryStrongThreshold"] },
		],
	},
];

const CONTROL_DESCRIPTIONS = {
	decay: {
		what: "Controls how quickly older window scores fade out of cumulative memory.",
		looksAt: ["recent windowScore history"],
		interpretation: "Higher keeps memory longer. Lower makes the signal react more to the newest windows.",
	},
	baseThreshold: {
		what: "Main cumulative score required for a normal primary signal.",
		looksAt: ["abs(cumulative)"],
		interpretation: "Higher is stricter. Lower emits earlier and more often.",
	},
	baseMinConsecutive: {
		what: "Minimum same-direction windows required before a primary signal can emit.",
		looksAt: ["consecutive", "direction"],
		interpretation: "Higher demands more persistence. Lower allows faster flips.",
	},
	chopThreshold: {
		what: "Cumulative threshold used when the analyzer thinks the regime is choppy.",
		looksAt: ["abs(cumulative)", "isChoppy"],
		interpretation: "Higher suppresses signals in noisy conditions.",
	},
	cooldownMs: {
		what: "Main cooldown between emitted signals.",
		looksAt: ["lastSignalTime"],
		interpretation: "Higher spaces signals out. Lower allows more frequent emits.",
	},
	heavyVolThreshold: {
		what: "Trade-count-ratio cutoff for treating a window as heavy volume in the score.",
		looksAt: ["tradeCountRatio"],
		interpretation: "Lower increases score more often. Higher makes volume bonuses rarer.",
	},
	significantImbalancePct: {
		what: "Percent-of-depth-events imbalance needed before a window is treated as directional.",
		looksAt: ["abs(sellNet - buyNet)", "depthEventCount"],
		interpretation: "Lower makes more windows count as directional. Higher filters weak imbalances.",
	},
	scoreImbalanceRatioThreshold: {
		what: "Dominant-side net imbalance ratio needed to add a score bonus.",
		looksAt: ["abs(domNet) / depthEventCount"],
		interpretation: "Lower rewards imbalances more often. Higher requires stronger dominance.",
	},
	bookVacuumThreshold: {
		what: "Low replenishment cutoff that adds strong score pressure.",
		looksAt: ["replenishmentRatio", "buyNet", "sellNet"],
		interpretation: "Higher treats more windows as vacuum/thinning conditions.",
	},
	scoreLiveAgedStrongThreshold: {
		what: "Directional live-aged near-book advantage needed for a stronger score bonus.",
		looksAt: ["domLiveAgedAdvantage"],
		interpretation: "Lower rewards book control more often. Higher requires stronger resting-book edge.",
	},
	continuationBookTotalThreshold: {
		what: "Minimum total live aged near-price book required for continuation signals.",
		looksAt: ["liveAgedBuyNear + liveAgedSellNear"],
		interpretation: "Higher requires a thicker near-price book. Lower allows thinner-book continuations.",
	},
	continuationBookAdvantageThreshold: {
		what: "Minimum directional live-aged book advantage required for continuation.",
		looksAt: ["domLiveAgedAdvantage"],
		interpretation: "Higher requires the resting near-price book to lean more strongly toward the signal direction.",
	},
	impulseBaseThresholdOffset: {
		what: "Extra cumulative requirement added on top of the base threshold for impulse logic.",
		looksAt: ["baseThreshold", "impulse cumulative gate"],
		interpretation: "Higher makes impulse alerts harder than normal primary alerts.",
	},
	severityTradeRatioVeryStrongThreshold: {
		what: "Trade activity ratio that contributes a high-confidence point toward very strong severity.",
		looksAt: ["tradeCountRatio"],
		interpretation: "Higher makes very-strong labels rarer.",
	},
};

const SIMPLE_GROUPS = new Set(["core", "continuation", "impulse"]);
const INTERMEDIATE_GROUPS = new Set(["core", "score", "continuation", "impulse"]);

const getFieldMeta = (key, value) => {
	if (TUNING_FIELD_META[key]) return TUNING_FIELD_META[key];
	if (Number.isInteger(value)) {
		return {
			label: key,
			min: 0,
			max: Math.max(10, value * 4 || 10),
			step: 1,
		};
	}
	return {
		label: key,
		min: 0,
		max: Math.max(5, Math.abs(value) * 4 || 5),
		step: 0.1,
	};
};

const countSignalsByType = (signals = []) => {
	return signals.reduce(
		(acc, signal) => {
			const type = signal?.signalType || "primary";
			if (type === "transition") acc.transition += 1;
			else if (type === "continuation") acc.continuation += 1;
			else if (type === "impulse") acc.impulse += 1;
			else acc.primary += 1;
			acc.total += 1;
			return acc;
		},
		{ total: 0, primary: 0, transition: 0, continuation: 0, impulse: 0 }
	);
};

const filterSignalsByEnabledTypes = (signals = [], enabledTypes = {}) => {
	return signals.filter((signal) => {
		const type = signal?.signalType || "primary";
		return enabledTypes[type] !== false;
	});
};

const CompactSlider = ({ fieldKey, value, onChange }) => {
	const meta = getFieldMeta(fieldKey, value);
	const description = CONTROL_DESCRIPTIONS[fieldKey];
	return (
		<label style={{ fontSize: "11px", color: "#aaa", background: "#222", padding: "6px", borderRadius: "4px", minWidth: 0 }}>
			<div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meta.label}</div>
			<input type="range" min={meta.min} max={meta.max} step={meta.step} value={value} onChange={onChange(fieldKey)} style={{ width: "100%", height: "16px" }} />
			<div style={{ color: "#ddd", marginTop: "2px", fontSize: "11px" }}>{Number.isInteger(value) ? value : Number(value).toFixed(2)}</div>
			{description ? (
				<details style={{ marginTop: "4px", fontSize: "11px" }}>
					<summary style={{ cursor: "pointer", color: "#8ab4f8" }}>Help</summary>
					<div style={{ marginTop: "4px", color: "#cfcfcf", lineHeight: 1.35 }}>
						<div>{description.what}</div>
						<div style={{ marginTop: "4px" }}>Looks at: {description.looksAt.join(", ")}</div>
						<div style={{ marginTop: "4px" }}>{description.interpretation}</div>
					</div>
				</details>
			) : null}
		</label>
	);
};

export default function DepthMetricsTuningPage({ Socket }) {
	const pixiDataRef = useRef();
	const replayDepthSignalsRef = useRef(null);
	const storedDepthSignalsRef = useRef(null);
	const tickLookup = useMemo(() => TICKS(), []);
	const replayAnalyzerRef = useRef(null);

	const [symbol] = useState(DEFAULT_SYMBOL);
	const [bars, setBars] = useState([]);
	const [depthMetrics, setDepthMetrics] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [loadedRange, setLoadedRange] = useState(null);
	const [replaySignals, setReplaySignals] = useState([]);
	const [showStoredSignals, setShowStoredSignals] = useState(true);
	const [showReplaySignals, setShowReplaySignals] = useState(true);
	const [storedTypeFilters, setStoredTypeFilters] = useState({
		primary: true,
		transition: true,
		continuation: true,
		impulse: true,
	});
	const [replayTypeFilters, setReplayTypeFilters] = useState({
		primary: true,
		transition: true,
		continuation: true,
		impulse: true,
	});
	const [tuningMode, setTuningMode] = useState("simple");
	const [tuningOptions, setTuningOptions] = useState(() => ({ ...DEFAULT_TUNING_OPTIONS, enableAnsi: false }));
	const [indicators, setIndicators] = useState([
		{
			id: "replayDepthSignals",
			name: "Replay Depth Signals",
			enabled: true,
			drawFunctionKey: "drawReplayDepthSignals",
			instanceRef: null,
		},
		{
			id: "storedDepthSignals",
			name: "Stored Depth Signals",
			enabled: true,
			drawFunctionKey: "drawStoredDepthSignals",
			instanceRef: null,
		},
	]);

	const tickSize = tickLookup?.[symbol] || 0.25;
	const timeframeMs = 10_000;

	useEffect(() => {
		replayAnalyzerRef.current = new DepthSignalAnalyzer({
			...tuningOptions,
			enableAnsi: false,
		});
	}, [tuningOptions]);

	const fetchChartData = useCallback(async () => {
		console.log("[DepthMetricsTuning] Reload requested", {
			symbol,
			timeframe: DEFAULT_TIMEFRAME,
			windowSeconds: DEFAULT_WINDOW_SECONDS,
		});
		setIsLoading(true);
		setError(null);

		try {
			const liveBars = await API.rapi_requestLiveBars({
				symbol,
				timeframe: DEFAULT_TIMEFRAME,
			});
			console.log("[DepthMetricsTuning] OHLC response", {
				count: Array.isArray(liveBars) ? liveBars.length : 0,
				firstBar: Array.isArray(liveBars) && liveBars.length ? liveBars[0] : null,
				lastBar: Array.isArray(liveBars) && liveBars.length ? liveBars[liveBars.length - 1] : null,
			});

			const normalizedBars = Array.isArray(liveBars) ? liveBars.map(normalizeBar).sort((a, b) => a.datetime - b.datetime) : [];

			if (!normalizedBars.length) {
				console.warn("[DepthMetricsTuning] No OHLC bars returned");
				setBars([]);
				setDepthMetrics([]);
				setLoadedRange(null);
				return;
			}

			const start = normalizedBars[0].datetime;
			const end = normalizedBars[normalizedBars.length - 1].datetime;

			setLoadedRange({ start, end });
			console.log("[DepthMetricsTuning] Fetching depth metrics", {
				symbol,
				start,
				end,
				startIso: new Date(start).toISOString(),
				endIso: new Date(end).toISOString(),
			});

			const depthResponse = await API.getDepthMetrics({
				symbol,
				start,
				end,
				windowSeconds: DEFAULT_WINDOW_SECONDS,
				limit: 20000,
			});

			const rows = Array.isArray(depthResponse?.rows) ? depthResponse.rows : [];
			console.log("[DepthMetricsTuning] Depth metrics response", {
				count: rows.length,
				firstRow: rows.length ? rows[0] : null,
				lastRow: rows.length ? rows[rows.length - 1] : null,
			});
			setDepthMetrics(rows);
			setBars(mergeDepthRowsIntoBars(normalizedBars, rows, timeframeMs));
		} catch (err) {
			console.error("[DepthMetricsTuningPage] Failed to load chart data", err);
			setError(err?.message || "Failed to load depth metrics tuning data");
			setBars([]);
			setDepthMetrics([]);
		} finally {
			setIsLoading(false);
		}
	}, [symbol, timeframeMs]);

	useEffect(() => {
		fetchChartData();
	}, [fetchChartData]);

	const storedDepthSignals = useMemo(() => {
		return depthMetrics
			.filter((row) => row?.signalShouldEmit)
			.map(buildDepthSignalPayload)
			.filter(Boolean);
	}, [depthMetrics]);

	const visibleStoredSignals = useMemo(
		() => filterSignalsByEnabledTypes(storedDepthSignals, storedTypeFilters),
		[storedDepthSignals, storedTypeFilters]
	);
	const visibleReplaySignals = useMemo(
		() => filterSignalsByEnabledTypes(replaySignals, replayTypeFilters),
		[replaySignals, replayTypeFilters]
	);

	const storedSignalCounts = useMemo(() => countSignalsByType(visibleStoredSignals), [visibleStoredSignals]);
	const replaySignalCounts = useMemo(() => countSignalsByType(visibleReplaySignals), [visibleReplaySignals]);

	useEffect(() => {
		if (!depthMetrics.length) {
			console.warn("[DepthMetricsTuning] No depth metrics available for replay");
			setReplaySignals([]);
			return;
		}

		const replayRows = buildReplayRows(depthMetrics, tickSize);
		console.log("[DepthMetricsTuning] Building replay rows", {
			depthMetricsCount: depthMetrics.length,
			replayRowCount: replayRows.length,
			firstReplayRow: replayRows.length ? replayRows[0] : null,
			lastReplayRow: replayRows.length ? replayRows[replayRows.length - 1] : null,
		});
		const analyzer = replayAnalyzerRef.current || new DepthSignalAnalyzer({ ...tuningOptions, enableAnsi: false });
		analyzer.reset(symbol);
		const replayResults = analyzer.analyzeSeries(replayRows, { reset: false });
		const nextReplaySignals = replayResults.alerts
			.map((result) => buildDepthSignalPayload({
				...result,
				signalDirection: result.direction,
				signalConsecutive: result.consecutive,
				signalType: result.emitType,
				signalSeverity: result.signalSeverity,
				signalImpulseScore: result.signalImpulseScore,
				cumulative: result.cumulative,
				snapshotTimestamp: result.timestampMs,
			}))
			.filter(Boolean);
		console.log("[DepthMetricsTuning] Replay results", {
			resultCount: replayResults.results.length,
			alertCount: replayResults.alerts.length,
			replaySignalCount: nextReplaySignals.length,
			firstReplaySignal: nextReplaySignals.length ? nextReplaySignals[0] : null,
			lastReplaySignal: nextReplaySignals.length ? nextReplaySignals[nextReplaySignals.length - 1] : null,
		});
		setReplaySignals(nextReplaySignals);
	}, [depthMetrics, symbol, tickSize, tuningOptions]);

	const replayDepthSignalsIndicator = indicators.find((indicator) => indicator.id === "replayDepthSignals");
	const storedDepthSignalsIndicator = indicators.find((indicator) => indicator.id === "storedDepthSignals");

	useIndicator({
		indicator: replayDepthSignalsIndicator,
		pixiDataRef,
		createInstance: (pixiData) => {
			const instance = new DrawDepthSignals(pixiData, {
				signalLabel: "REPLAY",
				buyColor: 0x00c853,
				sellColor: 0xd50000,
				hoverHitboxPadding: 12,
			});
			instance.draw = instance.draw.bind(instance);
			replayDepthSignalsRef.current = instance;
			console.log("[DepthMetricsTuning] Created replay signal indicator instance");
			return instance;
		},
		setIndicators,
		dependencies: [],
	});

	useIndicator({
		indicator: storedDepthSignalsIndicator,
		pixiDataRef,
		createInstance: (pixiData) => {
			const instance = new DrawDepthSignals(pixiData, {
				signalLabel: "STORED",
				buyColor: 0x80cbc4,
				sellColor: 0xffcc80,
				hoverHitboxPadding: 12,
			});
			instance.draw = instance.draw.bind(instance);
			storedDepthSignalsRef.current = instance;
			console.log("[DepthMetricsTuning] Created stored signal indicator instance");
			return instance;
		},
		setIndicators,
		dependencies: [],
	});

	useEffect(() => {
		const instance = replayDepthSignalsRef.current;
		const pixiData = pixiDataRef.current;
		if (!instance || !pixiData) {
			console.log("[DepthMetricsTuning] Replay signal instance not ready yet", {
				hasInstance: !!instance,
				hasPixiData: !!pixiData,
			});
			return;
		}

		instance.setSignals(showReplaySignals ? visibleReplaySignals : []);
		console.log("[DepthMetricsTuning] Updated replay signals on persistent instance", {
			replaySignalCount: showReplaySignals ? visibleReplaySignals.length : 0,
			ohlcCount: pixiData?.ohlcDatas?.length || 0,
			slicedCount: pixiData?.slicedData?.length || 0,
			firstSignal: visibleReplaySignals.length ? visibleReplaySignals[0] : null,
			lastSignal: visibleReplaySignals.length ? visibleReplaySignals[visibleReplaySignals.length - 1] : null,
		});
		pixiData.draw();
	}, [visibleReplaySignals, bars.length, showReplaySignals]);

	useEffect(() => {
		const instance = storedDepthSignalsRef.current;
		const pixiData = pixiDataRef.current;
		if (!instance || !pixiData) {
			console.log("[DepthMetricsTuning] Stored signal instance not ready yet", {
				hasInstance: !!instance,
				hasPixiData: !!pixiData,
			});
			return;
		}

		instance.setSignals(showStoredSignals ? visibleStoredSignals : []);
		console.log("[DepthMetricsTuning] Updated stored signals on persistent instance", {
			storedSignalCount: showStoredSignals ? visibleStoredSignals.length : 0,
			ohlcCount: pixiData?.ohlcDatas?.length || 0,
			slicedCount: pixiData?.slicedData?.length || 0,
			firstSignal: visibleStoredSignals.length ? visibleStoredSignals[0] : null,
			lastSignal: visibleStoredSignals.length ? visibleStoredSignals[visibleStoredSignals.length - 1] : null,
		});
		pixiData.draw();
	}, [visibleStoredSignals, bars.length, showStoredSignals]);

	const lowerIndicators = useMemo(() => {
		return [
			{
				name: "Depth Window Score",
				height: 90,
				type: "line",
				accessors: "depthWindowScore",
				drawFn: createLineWithZeroDrawFn("depthWindowScore", 0x4fc3f7),
				canGoNegative: true,
			},
			{
				name: "Depth Cumulative",
				height: 90,
				type: "line",
				accessors: "depthCumulative",
				drawFn: createLineDrawFn("depthCumulative", 0xfdd835),
				canGoNegative: true,
			},
			{
				name: "Buy vs Sell Net",
				height: 100,
				type: "volume",
				accessors: "depthBuyNet",
				extentFields: ["depthBuyNet", "depthSellNetNegative"],
				drawFn: createDualHistogramDrawFn({
					positiveField: "depthBuyNet",
					negativeField: "depthSellNetNegative",
					positiveColor: 0x00c853,
					negativeColor: 0xd50000,
				}),
				canGoNegative: true,
			},
			{
				name: "Trade Count Ratio",
				height: 90,
				type: "line",
				accessors: "depthTradeCountRatio",
				drawFn: createLineDrawFn("depthTradeCountRatio", 0xffb300),
				canGoNegative: false,
			},
			{
				name: "Replenishment Ratio",
				height: 90,
				type: "line",
				accessors: "depthReplenishmentRatio",
				drawFn: createLineDrawFn("depthReplenishmentRatio", 0x8e24aa),
				canGoNegative: false,
			},
			{
				name: "Wall Drift Toward Price",
				height: 90,
				type: "line",
				accessors: "depthWallDriftTowardPrice",
				drawFn: createLineDrawFn("depthWallDriftTowardPrice", 0xff7043),
				canGoNegative: true,
			},
			{
				name: "Live Aged Near Delta",
				height: 90,
				type: "line",
				accessors: "depthLiveAgedNearDelta",
				drawFn: createLineDrawFn("depthLiveAgedNearDelta", 0x26c6da),
				canGoNegative: true,
			},
			{
				name: "Persist Near Delta",
				height: 90,
				type: "line",
				accessors: "depthPersistNearDelta",
				drawFn: createLineDrawFn("depthPersistNearDelta", 0x7cb342),
				canGoNegative: true,
			},
			{
				name: "Flash Near Delta",
				height: 90,
				type: "line",
				accessors: "depthFlashNearDelta",
				drawFn: createLineDrawFn("depthFlashNearDelta", 0xef5350),
				canGoNegative: true,
			},
			{
				name: "Absorption",
				height: 100,
				type: "volume",
				accessors: "depthBuyAbsorbCount",
				extentFields: ["depthBuyAbsorbCount", "depthSellAbsorbCountNegative"],
				drawFn: createDualHistogramDrawFn({
					positiveField: "depthBuyAbsorbCount",
					negativeField: "depthSellAbsorbCountNegative",
					positiveColor: 0x66bb6a,
					negativeColor: 0xe57373,
				}),
				canGoNegative: true,
			},
			{
				name: "Quick Cancels",
				height: 100,
				type: "volume",
				accessors: "depthBuyQuickCancelCount",
				extentFields: ["depthBuyQuickCancelCount", "depthSellQuickCancelCountNegative"],
				drawFn: createDualHistogramDrawFn({
					positiveField: "depthBuyQuickCancelCount",
					negativeField: "depthSellQuickCancelCountNegative",
					positiveColor: 0x29b6f6,
					negativeColor: 0xff8a65,
				}),
				canGoNegative: true,
			},
			{
				name: "Stalking",
				height: 90,
				type: "volume",
				accessors: "depthBuyStalking",
				extentFields: ["depthBuyStalking", "depthSellStalkingNegative"],
				drawFn: createDualHistogramDrawFn({
					positiveField: "depthBuyStalking",
					negativeField: "depthSellStalkingNegative",
					positiveColor: 0x9ccc65,
					negativeColor: 0xef5350,
				}),
				canGoNegative: true,
			},
			{
				name: "Retreating",
				height: 90,
				type: "volume",
				accessors: "depthBuyRetreating",
				extentFields: ["depthBuyRetreating", "depthSellRetreatingNegative"],
				drawFn: createDualHistogramDrawFn({
					positiveField: "depthBuyRetreating",
					negativeField: "depthSellRetreatingNegative",
					positiveColor: 0xb39ddb,
					negativeColor: 0xff7043,
				}),
				canGoNegative: true,
			},
			{
				name: "Buy Absorb Count",
				height: 80,
				type: "volume",
				accessors: "depthBuyAbsorbCount",
				drawFn: createHistogramDrawFn({
					barColor: 0x2e7d32,
				}),
				canGoNegative: false,
			},
		];
	}, []);

	const infoText = useMemo(() => {
		if (!loadedRange?.start || !loadedRange?.end) return "No range loaded";
		return `${new Date(loadedRange.start).toLocaleString()} to ${new Date(loadedRange.end).toLocaleString()}`;
	}, [loadedRange]);

	const tuningGroups = useMemo(() => {
		const configuredKeys = new Set(TUNING_LAYOUT.flatMap((group) => group.controls.flatMap((control) => [control.primary, ...(control.secondary || [])])));
		const advancedKeys = Object.keys(tuningOptions).filter(
			(key) => !configuredKeys.has(key) && !OMIT_TUNING_KEYS.has(key) && !NON_SIGNAL_COUNT_KEYS.has(key)
		);
		return [
			...TUNING_LAYOUT,
			{ id: "advanced", label: "Advanced", controls: advancedKeys.map((key) => ({ primary: key })) },
		].filter((group) => group.controls.length);
	}, [tuningOptions]);

	const visibleTuningGroups = useMemo(() => {
		if (tuningMode === "advanced") return tuningGroups;
		const allowed = tuningMode === "intermediate" ? INTERMEDIATE_GROUPS : SIMPLE_GROUPS;
		return tuningGroups.filter((group) => allowed.has(group.id));
	}, [tuningGroups, tuningMode]);

	const updateTuningOption = useCallback((key) => {
		return (event) => {
			const nextValue = Number(event.target.value);
			setTuningOptions((prev) => ({
				...prev,
				[key]: Number.isFinite(nextValue) ? nextValue : prev[key],
			}));
		};
	}, []);

	const updateTypeFilter = useCallback((setter, type) => {
		return (event) => {
			const checked = event.target.checked;
			setter((prev) => ({
				...prev,
				[type]: checked,
			}));
		};
	}, []);

	return (
		<div style={{ padding: "12px 16px", color: "#fff" }}>
			<div className="row g-0 align-items-center mb-2">
				<div className="col-auto">
					<h3 style={{ margin: 0 }}>Depth Metrics Tuning</h3>
				</div>
				<div className="col-auto" style={{ marginLeft: "16px", fontSize: "12px", color: "#bbb" }}>
					{symbol} 10-second OHLC with stored depth metrics
				</div>
				<div className="col-auto" style={{ marginLeft: "16px" }}>
					<button
						type="button"
						onClick={fetchChartData}
						style={{
							background: "#1e88e5",
							color: "#fff",
							border: "none",
							borderRadius: "4px",
							padding: "6px 10px",
							cursor: "pointer",
							fontSize: "12px",
						}}
					>
						Reload
					</button>
				</div>
			</div>

			<div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px", fontSize: "12px" }}>
				<span style={{ color: "#ddd" }}>Tuning Mode</span>
				<button type="button" onClick={() => setTuningMode("simple")} style={{ padding: "4px 8px", background: tuningMode === "simple" ? "#1e88e5" : "#333", color: "#fff", border: "1px solid #555", borderRadius: "4px" }}>Simple</button>
				<button type="button" onClick={() => setTuningMode("intermediate")} style={{ padding: "4px 8px", background: tuningMode === "intermediate" ? "#1e88e5" : "#333", color: "#fff", border: "1px solid #555", borderRadius: "4px" }}>Intermediate</button>
				<button type="button" onClick={() => setTuningMode("advanced")} style={{ padding: "4px 8px", background: tuningMode === "advanced" ? "#1e88e5" : "#333", color: "#fff", border: "1px solid #555", borderRadius: "4px" }}>Advanced</button>
			</div>

			{visibleTuningGroups.map((group) => (
				<div key={group.id} style={{ marginBottom: "12px" }}>
					<div style={{ fontSize: "12px", color: "#ddd", marginBottom: "6px", fontWeight: 600 }}>{group.label}</div>
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(5, minmax(140px, 1fr))",
							gap: "8px",
						}}
					>
						{group.controls.map((control) => {
							const primary = control.primary;
							const value = tuningOptions[primary];
							return (
								<div key={primary} style={{ minWidth: 0 }}>
									<CompactSlider fieldKey={primary} value={value} onChange={updateTuningOption} />
									{control.secondary?.length ? (
										<details style={{ marginTop: "4px", fontSize: "11px" }}>
											<summary style={{ cursor: "pointer", color: "#8ab4f8" }}>Related</summary>
											<div style={{ display: "grid", gap: "4px", marginTop: "4px" }}>
												{control.secondary.map((secondaryKey) => (
													<CompactSlider
														key={secondaryKey}
														fieldKey={secondaryKey}
														value={tuningOptions[secondaryKey]}
														onChange={updateTuningOption}
													/>
												))}
											</div>
										</details>
									) : null}
								</div>
							);
						})}
					</div>
				</div>
			))}

			<div style={{ fontSize: "12px", color: "#aaa", marginBottom: "8px" }}>
				Range: {infoText} | Bars: {bars.length} | Depth rows: {depthMetrics.length} | Stored signals: {storedDepthSignals.length} | Replay signals: {replaySignals.length}
			</div>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(2, minmax(260px, 1fr))",
					gap: "10px",
					marginBottom: "10px",
					fontSize: "12px",
				}}
			>
				<div style={{ background: "#1d2b2a", padding: "8px", borderRadius: "4px" }}>
					<div style={{ color: "#80cbc4", fontWeight: 600, marginBottom: "4px" }}>Stored Signal Types</div>
					<div>Total: {storedSignalCounts.total}</div>
					<div>Primary: {storedSignalCounts.primary}</div>
					<div>Transition: {storedSignalCounts.transition}</div>
					<div>Continuation: {storedSignalCounts.continuation}</div>
					<div>Impulse: {storedSignalCounts.impulse}</div>
				</div>
				<div style={{ background: "#1d261d", padding: "8px", borderRadius: "4px" }}>
					<div style={{ color: "#66bb6a", fontWeight: 600, marginBottom: "4px" }}>Replay Signal Types</div>
					<div>Total: {replaySignalCounts.total}</div>
					<div>Primary: {replaySignalCounts.primary}</div>
					<div>Transition: {replaySignalCounts.transition}</div>
					<div>Continuation: {replaySignalCounts.continuation}</div>
					<div>Impulse: {replaySignalCounts.impulse}</div>
				</div>
			</div>

			<div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "10px", fontSize: "12px", color: "#ddd" }}>
				<label style={{ display: "flex", gap: "6px", alignItems: "center" }}>
					<input type="checkbox" checked={showStoredSignals} onChange={(event) => setShowStoredSignals(event.target.checked)} />
					Show stored signals
				</label>
				<label style={{ display: "flex", gap: "6px", alignItems: "center" }}>
					<input type="checkbox" checked={showReplaySignals} onChange={(event) => setShowReplaySignals(event.target.checked)} />
					Show replay signals
				</label>
				<span style={{ color: "#80cbc4" }}>Stored colors</span>
				<span style={{ color: "#66bb6a" }}>Replay colors</span>
			</div>

			<div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(260px, 1fr))", gap: "10px", marginBottom: "10px", fontSize: "12px" }}>
				<div style={{ background: "#1d2b2a", padding: "8px", borderRadius: "4px" }}>
					<div style={{ color: "#80cbc4", fontWeight: 600, marginBottom: "6px" }}>Stored Type Filters</div>
					<div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
						{["primary", "transition", "continuation", "impulse"].map((type) => (
							<label key={`stored-${type}`} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
								<input type="checkbox" checked={storedTypeFilters[type]} onChange={updateTypeFilter(setStoredTypeFilters, type)} />
								{type}
							</label>
						))}
					</div>
				</div>
				<div style={{ background: "#1d261d", padding: "8px", borderRadius: "4px" }}>
					<div style={{ color: "#66bb6a", fontWeight: 600, marginBottom: "6px" }}>Replay Type Filters</div>
					<div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
						{["primary", "transition", "continuation", "impulse"].map((type) => (
							<label key={`replay-${type}`} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
								<input type="checkbox" checked={replayTypeFilters[type]} onChange={updateTypeFilter(setReplayTypeFilters, type)} />
								{type}
							</label>
						))}
					</div>
				</div>
			</div>

			{error ? (
				<div style={{ color: "#ff8a80", marginBottom: "8px" }}>{error}</div>
			) : null}

			<GenericPixiChart
				name="DepthMetricsTuningChart"
				key={symbol}
				ohlcDatas={bars}
				height={500}
				symbol={symbol}
				fullSymbol={symbol}
				exchange={DEFAULT_EXCHANGE}
				barType={1}
				barTypePeriod={10}
				pixiDataRef={pixiDataRef}
				lowerIndicators={lowerIndicators}
				isLoading={isLoading}
				hideTimeRangeOverlay={true}
				margin={{ top: 50, right: 60, left: 0, bottom: 40 }}
				tickSize={tickSize}
			/>
		</div>
	);
}
