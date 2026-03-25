const CHURN_REGIME = { insufficient: 0, normal: 1, elevated: 2, extreme: 3 };

const DEFAULT_TUNING_OPTIONS = {
	// Alert gates
	depthAlertMinDepthEvents: 25,
	depthAlertMinChurnRatio: 3,
	depthAlertMinWallDriftTicks: 20,
	// Cumulative
	decay: 0.82,
	historySize: 12,
	// Scoring
	heavyVolThreshold: 2.0,
	activeVolThreshold: 1.5,
	bookControlStrongThreshold: 25,
	bookControlModerateThreshold: 8,
	priceAlignTicksThreshold: 3,
	priceFadePenalty: -1.5,
	scoreCap: 10,
	significantImbalanceMin: 5,
	significantImbalancePct: 0.03,
	significantImbalanceCap: 200,
	scoreBothSidesDrainingThreshold: -10,
	scoreBothSidesDrainingMultiplier: 0.5,
	// Signal
	continuationWindowThreshold: 4,
	continuationCumulativeMin: 3,
	continuationCooldownMs: 60_000,
	swingWindowThreshold: 5,
	swingCumulativeMin: 3,
	swingCooldownMs: 30_000,
	signalDirectionThreshold: 0.5,
	// General
	cacheLimit: 500,
	enableAnsi: true,
	// Narrative (display only)
	veryQuietThreshold: 0.4,
	slowThreshold: 0.6,
	fastPriceMoveTicks: 4,
	bothSidesBuildThreshold: 5,
	bothSidesDrainThreshold: -5,
	wallNarrativeThreshold: 20,
	bothDrainingThreshold: -10,
	oneSideDrainingThreshold: -20,
	bookVacuumThreshold: 0.65,
	bookVacuumWeakThreshold: 0.8,
	bookTearingCancelToMoveRatio: 2,
	bookThinThreshold: 0.85,
	bookStripThreshold: 1.0,
	bookThickThreshold: 1.3,
	bookThickMinDepthEvents: 200,
	absorbCountThreshold: 5,
	absorbDominanceRatio: 2,
	spoofBaseThreshold: 12,
	spoofDepthEventPct: 0.12,
	flashNearCancelThreshold: 8,
	stalkingThreshold: 3,
	stalkingDominanceRatio: 2,
	retreatingThreshold: 3,
	retreatingDominanceRatio: 2,
};

const TUNING_GROUPS = [
	{
		id: "signal",
		label: "Core Signal",
		keys: [
			"decay", "historySize", "signalDirectionThreshold",
			"continuationWindowThreshold", "continuationCumulativeMin", "continuationCooldownMs",
			"swingWindowThreshold", "swingCumulativeMin", "swingCooldownMs",
		],
	},
	{
		id: "scoring",
		label: "Scoring",
		keys: [
			"heavyVolThreshold", "activeVolThreshold",
			"bookControlStrongThreshold", "bookControlModerateThreshold",
			"priceAlignTicksThreshold", "priceFadePenalty",
			"scoreCap", "significantImbalanceMin", "significantImbalancePct", "significantImbalanceCap",
			"scoreBothSidesDrainingThreshold", "scoreBothSidesDrainingMultiplier",
		],
	},
	{
		id: "gates",
		label: "Alert Gates",
		keys: ["depthAlertMinDepthEvents", "depthAlertMinChurnRatio", "depthAlertMinWallDriftTicks"],
	},
];

const TUNING_FIELD_META = {
	decay: { label: "Decay", min: 0, max: 1, step: 0.01 },
	historySize: { label: "History Size", min: 1, max: 30, step: 1 },
	signalDirectionThreshold: { label: "Direction Threshold", min: 0, max: 3, step: 0.1 },
	continuationWindowThreshold: { label: "Cont Window", min: 0, max: 10, step: 0.25 },
	continuationCumulativeMin: { label: "Cont Cumulative Min", min: 0, max: 10, step: 0.25 },
	continuationCooldownMs: { label: "Cont Cooldown Ms", min: 0, max: 180000, step: 5000 },
	swingWindowThreshold: { label: "Swing Window", min: 0, max: 10, step: 0.25 },
	swingCumulativeMin: { label: "Swing Cumulative Min", min: 0, max: 10, step: 0.25 },
	swingCooldownMs: { label: "Swing Cooldown Ms", min: 0, max: 120000, step: 5000 },
	heavyVolThreshold: { label: "Heavy Vol", min: 0, max: 5, step: 0.1 },
	activeVolThreshold: { label: "Active Vol", min: 0, max: 5, step: 0.1 },
	bookControlStrongThreshold: { label: "Book Strong", min: 0, max: 100, step: 1 },
	bookControlModerateThreshold: { label: "Book Moderate", min: 0, max: 50, step: 1 },
	priceAlignTicksThreshold: { label: "Price Align Ticks", min: 0, max: 10, step: 1 },
	priceFadePenalty: { label: "Price Fade Penalty", min: -5, max: 0, step: 0.25 },
	scoreCap: { label: "Score Cap", min: 1, max: 20, step: 0.5 },
	significantImbalanceMin: { label: "Imbalance Min", min: 0, max: 50, step: 1 },
	significantImbalancePct: { label: "Imbalance %", min: 0, max: 0.2, step: 0.005 },
	significantImbalanceCap: { label: "Imbalance Cap", min: 0, max: 500, step: 10 },
	scoreBothSidesDrainingThreshold: { label: "Both Draining Thr", min: -50, max: 0, step: 1 },
	scoreBothSidesDrainingMultiplier: { label: "Both Draining Mult", min: 0, max: 1, step: 0.05 },
	depthAlertMinDepthEvents: { label: "Min Depth Events", min: 0, max: 200, step: 1 },
	depthAlertMinChurnRatio: { label: "Min Churn Ratio", min: 0, max: 10, step: 0.1 },
	depthAlertMinWallDriftTicks: { label: "Min Wall Drift", min: 0, max: 100, step: 1 },
};

function normalizeChurnRegime(churnRegime) {
	if (typeof churnRegime === "string") return churnRegime;
	switch (churnRegime) {
		case CHURN_REGIME.extreme:
			return "extreme";
		case CHURN_REGIME.elevated:
			return "elevated";
		case CHURN_REGIME.normal:
			return "normal";
		default:
			return "insufficient";
	}
}

class DepthSignalAnalyzer {
	constructor(options = {}) {
		this.options = {
			...DEFAULT_TUNING_OPTIONS,
			...options,
		};
		this.symbolStates = new Map();
	}

	reset(symbol) {
		if (symbol) {
			this.symbolStates.delete(symbol);
			return;
		}
		this.symbolStates.clear();
	}

	getState(symbol) {
		const key = symbol || "UNKNOWN";
		if (!this.symbolStates.has(key)) {
			this.symbolStates.set(key, {
				scores: [],
				cumulative: 0,
				direction: 0,
				consecutive: 0,
				lastContinuationTime: 0,
				lastSwingTime: 0,
				results: [],
			});
		}
		return this.symbolStates.get(key);
	}

	getCachedResults(symbol) {
		if (symbol) return [...(this.getState(symbol).results || [])];
		return Array.from(this.symbolStates.entries()).reduce((acc, [key, state]) => {
			acc[key] = [...(state.results || [])];
			return acc;
		}, {});
	}

	analyzeSeries(records, options = {}) {
		const list = Array.isArray(records) ? [...records] : [];
		if (options.reset !== false) this.reset();
		list.sort((a, b) => this.compareRecords(a, b));
		const results = list.map((record) => this.ingest(record));
		return {
			results,
			alerts: results.filter((result) => result.shouldEmit),
			logs: results.flatMap((result) => result.logs),
		};
	}

	ingest(record) {
		const normalized = this.normalizeRecord(record);
		const state = this.getState(normalized.baseSymbol);
		const alertContext = this.buildAlertContext(normalized);
		const narrative = this.buildDepthNarrative(normalized);
		const windowScore = this.scoreDepthWindow(normalized);
		this.updateCumulative(state, windowScore);
		const signalResult = this.evaluateSignal(state, windowScore, normalized);
		const logs = this.buildLogLines(normalized, alertContext, narrative, windowScore, signalResult);
		const socketPayload = this.buildTradeSignalPayload(normalized, narrative, windowScore, signalResult);
		const result = {
			...normalized,
			...alertContext,
			narrative,
			windowScore,
			...signalResult,
			socketPayload,
			logs,
			headerLog: logs[0] || null,
			narrativeLog: logs[1] || null,
			signalLog: logs[2] || null,
			emitLog: logs[logs.length - 1] || null,
		};
		state.results.push(result);
		state.results = state.results.slice(-this.options.cacheLimit);
		return result;
	}

	compareRecords(a, b) {
		const symbolA = (a.baseSymbol || a.symbol || "").localeCompare(b.baseSymbol || b.symbol || "");
		if (symbolA !== 0) return symbolA;
		const timeA = this.getTimestampMs(a);
		const timeB = this.getTimestampMs(b);
		if (timeA !== timeB) return timeA - timeB;
		return 0;
	}

	getTimestampMs(record) {
		const raw = record.timestamp || record.createdAt || record.windowStart || record.time;
		if (!raw) return 0;
		const parsed = typeof raw === "number" ? raw : new Date(raw).getTime();
		return Number.isFinite(parsed) ? parsed : 0;
	}

	normalizeRecord(record = {}) {
		const summary = record.summary ? { ...record.summary } : {};
		summary.moveCount = summary.moveCount ?? record.moveCount ?? 0;
		summary.cancelCount = summary.cancelCount ?? record.cancelCount ?? 0;
		summary.buyFillCount = summary.buyFillCount ?? record.buyFillCount ?? 0;
		summary.buyAbsorbCount = summary.buyAbsorbCount ?? record.buyAbsorbCount ?? 0;
		summary.sellFillCount = summary.sellFillCount ?? record.sellFillCount ?? 0;
		summary.sellAbsorbCount = summary.sellAbsorbCount ?? record.sellAbsorbCount ?? 0;
		summary.buyQuickCancelCount = summary.buyQuickCancelCount ?? record.buyQuickCancelCount ?? 0;
		summary.sellQuickCancelCount = summary.sellQuickCancelCount ?? record.sellQuickCancelCount ?? 0;
		summary.buyStalking = summary.buyStalking ?? record.buyStalking ?? 0;
		summary.sellStalking = summary.sellStalking ?? record.sellStalking ?? 0;
		summary.buyRetreating = summary.buyRetreating ?? record.buyRetreating ?? 0;
		summary.sellRetreating = summary.sellRetreating ?? record.sellRetreating ?? 0;
		summary.tradeCount = summary.tradeCount ?? record.tradeCount ?? 0;

		// Ensure timingMetrics exists for scoring (constructed from top-level fields for DB replay)
		if (!summary.timingMetrics) {
			const tm = record.timingMetrics || {};
			summary.timingMetrics = {
				liveAgedNearDelta: Number(tm.liveAgedNearDelta ?? record.liveAgedNearDelta) || 0,
				liveAgedBuyNear: Number(tm.liveAgedBuyNear ?? record.liveAgedBuyNear) || 0,
				liveAgedSellNear: Number(tm.liveAgedSellNear ?? record.liveAgedSellNear) || 0,
				persistBuyNear: Number(tm.persistBuyNear ?? record.persistBuyNear) || 0,
				persistSellNear: Number(tm.persistSellNear ?? record.persistSellNear) || 0,
				persistNearDelta: Number(tm.persistNearDelta ?? record.persistNearDelta) || 0,
				flashBuyNear: Number(tm.flashBuyNear ?? record.flashBuyNear) || 0,
				flashSellNear: Number(tm.flashSellNear ?? record.flashSellNear) || 0,
				flashNearDelta: Number(tm.flashNearDelta ?? record.flashNearDelta) || 0,
			};
		}

		const baseSymbol = record.baseSymbol || record.symbol || "UNKNOWN";
		const frontMonth = record.frontMonth || record.symbol || baseSymbol;
		const timestampMs = this.getTimestampMs(record);
		const context = record.context ? { ...record.context } : {};
		return {
			raw: record,
			baseSymbol,
			frontMonth,
			windowSeconds: Number(record.windowSeconds ?? record.windowSec ?? 10),
			lastPrice: record.lastPrice,
			depthEventCount: record.depthEventCount ?? 0,
			quoteChurnRatio: record.quoteChurnRatio ?? record.churn ?? 0,
			wallDriftTowardPrice: record.wallDriftTowardPrice ?? record.drift ?? 0,
			tradeCount: record.tradeCount ?? summary.tradeCount ?? 0,
			tradeCountRatio: record.tradeCountRatio ?? 0,
			buyNet: record.buyNet ?? 0,
			sellNet: record.sellNet ?? 0,
			replenishmentRatio: record.replenishmentRatio ?? record.repl ?? 0,
			churnRegime: normalizeChurnRegime(record.churnRegime),
			context: {
				tickSize: context.tickSize ?? 0,
				priceDeltaFromPrev: context.priceDeltaFromPrev ?? 0,
			},
			timestampMs,
			timestampLabel: timestampMs ? new Date(timestampMs).toLocaleTimeString() : null,
			summary,
		};
	}

	buildAlertContext(record) {
		const o = this.options;
		const reasons = [];
		if (record.depthEventCount >= o.depthAlertMinDepthEvents) reasons.push(`depth=${record.depthEventCount}`);
		if (record.quoteChurnRatio >= o.depthAlertMinChurnRatio) reasons.push(`churn=${record.quoteChurnRatio.toFixed(2)}`);
		if (Math.abs(record.wallDriftTowardPrice) >= o.depthAlertMinWallDriftTicks) {
			reasons.push(`drift=${record.wallDriftTowardPrice.toFixed(1)}t`);
		}
		return { alert: reasons.length > 0, reasons };
	}

	colorize(color, text) {
		if (!this.options.enableAnsi) return text;
		return `${color}${text}\x1b[0m`;
	}

	buildTradeSignalPayload(record, narrative, windowScore, signalResult) {
		return {
			symbol: record.baseSymbol,
			frontMonth: record.frontMonth,
			direction: signalResult.direction,
			signalType: signalResult.emitType || "continuation",
			cumulative: signalResult.cumulative,
			consecutive: signalResult.consecutive,
			windowScore,
			narrative,
			lastPrice: record.lastPrice,
			timestamp: record.timestampMs || Date.now(),
		};
	}

	buildDepthNarrative({ tradeCountRatio, tradeCount, buyNet, sellNet, wallDriftTowardPrice, replenishmentRatio, depthEventCount, churnRegime, summary, context }) {
		const o = this.options;
		const parts = [];
		const R = "\x1b[31m";
		const G = "\x1b[32m";
		const Y = "\x1b[33m";
		const C = "\x1b[36m";

		if (tradeCountRatio >= o.heavyVolThreshold) parts.push(this.colorize(Y, "Heavy vol"));
		else if (tradeCountRatio >= o.activeVolThreshold) parts.push(this.colorize(Y, "Active"));
		else if (tradeCountRatio <= o.veryQuietThreshold) parts.push(this.colorize(C, "Very quiet"));
		else if (tradeCountRatio <= o.slowThreshold) parts.push(this.colorize(C, "Slow"));

		if (churnRegime === "extreme") parts.push(this.colorize(Y, "extreme repositioning"));
		else if (churnRegime === "elevated") parts.push(this.colorize(Y, "heavy repositioning"));

		const imbalance = Math.abs(sellNet - buyNet);
		const significant = imbalance > Math.max(o.significantImbalanceMin, Math.min(depthEventCount * o.significantImbalancePct, o.significantImbalanceCap));
		const tickSize = context?.tickSize || 0;
		const priceDelta = context?.priceDeltaFromPrev || 0;
		const priceDeltaTicks = tickSize > 0 ? priceDelta / tickSize : 0;
		const fastPriceMove = Math.abs(priceDeltaTicks) >= o.fastPriceMoveTicks;

		if (significant) {
			const sellWinning = sellNet > buyNet;
			const domSide = sellWinning ? "sell" : "buy";
			const weakSide = sellWinning ? "buy" : "sell";
			const domNet = sellWinning ? sellNet : buyNet;
			const weakNet = sellWinning ? buyNet : sellNet;

			if (domNet > 0 && fastPriceMove && ((domSide === "buy" && priceDeltaTicks > 0) || (domSide === "sell" && priceDeltaTicks < 0))) {
				parts.push(domSide === "buy" ? `upside momentum ${priceDeltaTicks.toFixed(1)}t` : `downside sweep ${Math.abs(priceDeltaTicks).toFixed(1)}t`);
			}

			if (domNet > 0 && weakNet < 0) {
				parts.push(`${domSide} pressure +${domNet}, ${weakSide} draining ${weakNet}`);
			} else if (domNet > 0) {
				parts.push(`${domSide} dominant +${domNet}, ${weakSide} +${weakNet}`);
			}
		} else if (buyNet > o.bothSidesBuildThreshold && sellNet > o.bothSidesBuildThreshold) {
			parts.push(`both sides building ${buyNet}/${sellNet}`);
		} else if (buyNet < o.bothSidesDrainThreshold && sellNet < o.bothSidesDrainThreshold) {
			parts.push("liquidity draining both sides");
		}

		if (Math.abs(wallDriftTowardPrice) >= o.wallNarrativeThreshold) parts.push(wallDriftTowardPrice > 0 ? "walls tightening" : "walls pulling back");

		const cancelToMoveRatio = summary.moveCount > 0 ? summary.cancelCount / summary.moveCount : summary.cancelCount;
		const bothDraining = buyNet < o.bothDrainingThreshold && sellNet < o.bothDrainingThreshold;
		const oneSideDraining = (buyNet < o.oneSideDrainingThreshold && sellNet > 0) || (sellNet < o.oneSideDrainingThreshold && buyNet > 0);
		if (replenishmentRatio < o.bookVacuumThreshold || (replenishmentRatio < o.bookVacuumWeakThreshold && bothDraining)) parts.push(`book vacuum repl=${replenishmentRatio.toFixed(2)}`);
		else if (replenishmentRatio < o.bookVacuumWeakThreshold && cancelToMoveRatio > o.bookTearingCancelToMoveRatio) parts.push(`book tearing repl=${replenishmentRatio.toFixed(2)}`);
		else if (replenishmentRatio < o.bookThinThreshold) parts.push("book thinning");
		else if (oneSideDraining && replenishmentRatio < o.bookStripThreshold) parts.push("one side stripped");
		else if (replenishmentRatio > o.bookThickThreshold && depthEventCount >= o.bookThickMinDepthEvents) parts.push("book thickening");

		const totalBuyAbsorb = (summary.buyFillCount || 0) + (summary.buyAbsorbCount || 0);
		const totalSellAbsorb = (summary.sellFillCount || 0) + (summary.sellAbsorbCount || 0);
		if (totalBuyAbsorb > o.absorbCountThreshold && totalBuyAbsorb > totalSellAbsorb * o.absorbDominanceRatio) parts.push(`buy absorbing ${totalBuyAbsorb}`);
		else if (totalSellAbsorb > o.absorbCountThreshold && totalSellAbsorb > totalBuyAbsorb * o.absorbDominanceRatio) parts.push(`sell absorbing ${totalSellAbsorb}`);

		const buySpoof = summary.buyQuickCancelCount || 0;
		const sellSpoof = summary.sellQuickCancelCount || 0;
		const flashNearCancels = (summary.quickCancelDurationBuckets?.near?.lt250 || 0) + (summary.quickCancelDurationBuckets?.uberNear?.lt250 || 0);
		const spoofThreshold = Math.max(o.spoofBaseThreshold, Math.floor(depthEventCount * o.spoofDepthEventPct));
		if (buySpoof > spoofThreshold || sellSpoof > spoofThreshold) parts.push("spoofing");
		if (flashNearCancels >= o.flashNearCancelThreshold) parts.push("flash liquidity");

		const buyStalking = summary.buyStalking || 0;
		const sellStalking = summary.sellStalking || 0;
		const buyRetreating = summary.buyRetreating || 0;
		const sellRetreating = summary.sellRetreating || 0;
		if (buyStalking > o.stalkingThreshold && buyStalking > buyRetreating * o.stalkingDominanceRatio) parts.push(`buys stalking ${buyStalking}`);
		else if (sellStalking > o.stalkingThreshold && sellStalking > sellRetreating * o.stalkingDominanceRatio) parts.push(`sells stalking ${sellStalking}`);
		if (buyRetreating > o.retreatingThreshold && buyRetreating > buyStalking * o.retreatingDominanceRatio) parts.push(`buys retreating ${buyRetreating}`);
		else if (sellRetreating > o.retreatingThreshold && sellRetreating > sellStalking * o.retreatingDominanceRatio) parts.push(`sells retreating ${sellRetreating}`);

		return parts.length ? parts.join(", ") : "balanced";
	}

	scoreDepthWindow({ buyNet, sellNet, depthEventCount, summary, tradeCountRatio, context }) {
		const o = this.options;
		const imbalance = Math.abs(sellNet - buyNet);
		const significant = imbalance > Math.max(o.significantImbalanceMin, Math.min(depthEventCount * o.significantImbalancePct, o.significantImbalanceCap));
		if (!significant) return 0;

		const sellWinning = sellNet > buyNet;
		const dir = sellWinning ? -1 : 1;
		const weakNet = sellWinning ? buyNet : sellNet;

		// Base: 3 (weak side draining) or 2 (both building, one dominant)
		let score = weakNet < 0 ? 3 : 2;

		// Volume: +1.5 heavy, +0.5 active
		if (tradeCountRatio >= o.heavyVolThreshold) score += 1.5;
		else if (tradeCountRatio >= o.activeVolThreshold) score += 0.5;

		// Book control (liveAged)
		const timingMetrics = summary.timingMetrics || {};
		const liveAgedNearDelta = timingMetrics.liveAgedNearDelta || 0;
		const domLiveAgedAdvantage = dir > 0 ? liveAgedNearDelta : -liveAgedNearDelta;
		if (domLiveAgedAdvantage >= o.bookControlStrongThreshold) score += 2;
		else if (domLiveAgedAdvantage >= o.bookControlModerateThreshold) score += 1;
		if (domLiveAgedAdvantage <= -o.bookControlStrongThreshold) score -= 2;
		else if (domLiveAgedAdvantage <= -o.bookControlModerateThreshold) score -= 1;

		// Price alignment
		const tickSize = context?.tickSize || 0;
		const priceDeltaTicks = tickSize > 0 ? (context?.priceDeltaFromPrev || 0) / tickSize : 0;
		const alignsWithPriceMove = (dir > 0 && priceDeltaTicks > 0) || (dir < 0 && priceDeltaTicks < 0);
		const fadesPriceMove = (dir > 0 && priceDeltaTicks < 0) || (dir < 0 && priceDeltaTicks > 0);
		if (alignsWithPriceMove && Math.abs(priceDeltaTicks) >= o.priceAlignTicksThreshold) score += 1;
		if (fadesPriceMove && Math.abs(priceDeltaTicks) >= o.priceAlignTicksThreshold) score += o.priceFadePenalty;

		// Dampen: x0.5 if both sides draining
		if (buyNet < o.scoreBothSidesDrainingThreshold && sellNet < o.scoreBothSidesDrainingThreshold) score *= o.scoreBothSidesDrainingMultiplier;

		return Math.min(score, o.scoreCap) * dir;
	}

	updateCumulative(state, windowScore) {
		const o = this.options;
		state.scores.push(windowScore);
		state.scores = state.scores.slice(-o.historySize);

		let cumulative = 0;
		for (let i = state.scores.length - 1; i >= 0; i -= 1) {
			const age = state.scores.length - 1 - i;
			cumulative += state.scores[i] * Math.pow(o.decay, age);
		}
		state.cumulative = cumulative;

		const currentDir = windowScore > o.signalDirectionThreshold ? 1 : windowScore < -o.signalDirectionThreshold ? -1 : 0;
		if (currentDir !== 0 && currentDir === state.direction) state.consecutive += 1;
		else if (currentDir !== 0 && currentDir !== state.direction) {
			state.direction = currentDir;
			state.consecutive = 1;
		} else {
			state.direction = 0;
			state.consecutive = 0;
		}
	}

	evaluateSignal(state, windowScore, record) {
		const o = this.options;
		const now = record.timestampMs || Date.now();
		const cumDir = state.cumulative > 0 ? 1 : state.cumulative < 0 ? -1 : 0;
		const windowDir = windowScore > 0 ? 1 : windowScore < 0 ? -1 : 0;
		const absWindow = Math.abs(windowScore);
		const absCum = Math.abs(state.cumulative);

		const base = {
			cumulative: state.cumulative,
			consecutive: state.consecutive,
			direction: state.direction,
			shouldEmit: false,
			emitType: null,
		};

		// Swing: regime flip (catches turns)
		if (absWindow >= o.swingWindowThreshold && windowDir !== 0 && cumDir !== 0 && windowDir !== cumDir && absCum >= o.swingCumulativeMin) {
			if (now - state.lastSwingTime >= o.swingCooldownMs) {
				state.lastSwingTime = now;
				// Halve cumulative memory on emit (reset for new regime)
				state.scores = state.scores.map((s) => s * 0.5);
				state.cumulative *= 0.5;
				base.cumulative = state.cumulative;
				return { ...base, shouldEmit: true, emitType: "swing" };
			}
		}

		// Continuation: established trend continues
		if (absWindow >= o.continuationWindowThreshold && windowDir !== 0 && windowDir === cumDir && absCum >= o.continuationCumulativeMin) {
			if (now - state.lastContinuationTime >= o.continuationCooldownMs) {
				state.lastContinuationTime = now;
				return { ...base, shouldEmit: true, emitType: "continuation" };
			}
		}

		return base;
	}

	buildLogLines(record, alertContext, narrative, windowScore, signalResult) {
		const logs = [];
		if (alertContext.alert) {
			const driftFmt = `${record.wallDriftTowardPrice > 0 ? "+" : ""}${record.wallDriftTowardPrice.toFixed(1)}t`;
			const tradeFmt = `trade=${record.tradeCount}(${record.tradeCountRatio.toFixed(1)}x)`;
			const buyFmt = `buy:${record.buyNet >= 0 ? "+" : ""}${record.buyNet}`;
			const sellFmt = `sell:${record.sellNet >= 0 ? "+" : ""}${record.sellNet}`;
			logs.push(`ALERT [${record.frontMonth}] ${record.windowSeconds.toFixed(1)}s | ${alertContext.reasons.join(", ")} | ${tradeFmt} ${buyFmt} ${sellFmt} | move=${record.summary.moveCount} drift=${driftFmt} repl=${record.replenishmentRatio.toFixed(2)}`);
		}

		if (alertContext.alert || narrative !== "balanced" || record.depthEventCount > 0 || record.tradeCount > 0) {
			const timeLabel = record.timestampLabel || new Date().toLocaleTimeString();
			logs.push(`${narrative} : ${timeLabel}`);
			const dirArrow = signalResult.direction > 0 ? "\u25B2" : signalResult.direction < 0 ? "\u25BC" : "\u25CF";
			const scoreSign = windowScore >= 0 ? "+" : "";
			const cumSign = signalResult.cumulative >= 0 ? "+" : "";
			const emitLabel = signalResult.emitType === "swing" ? "swing" : "cont";
			logs.push(`signal ${emitLabel} ${dirArrow}${scoreSign}${windowScore.toFixed(1)} -> ${dirArrow}cum:${cumSign}${signalResult.cumulative.toFixed(1)} (${signalResult.consecutive}w)`);
		}

		if (signalResult.shouldEmit) {
			const socketPayload = this.buildTradeSignalPayload(record, narrative, windowScore, signalResult);
			const emitArrow = signalResult.direction > 0 ? "\u25B2" : "\u25BC";
			const emitKind = signalResult.emitType === "swing" ? "SWING" : "CONT";
			logs.push(`socket depthTradeSignal payload: ${JSON.stringify(socketPayload)}`);
			logs.push(`EMIT depthTradeSignal-${record.baseSymbol} ${emitKind} ${emitArrow} cum:${signalResult.cumulative.toFixed(1)} (${signalResult.consecutive}w) @ ${record.lastPrice}`);
		}

		return logs;
	}
}

module.exports = {
	CHURN_REGIME,
	DEFAULT_TUNING_OPTIONS,
	TUNING_GROUPS,
	TUNING_FIELD_META,
	DepthSignalAnalyzer,
};
