import { useCallback, useEffect, useRef } from "react";
import API from "../../API";

// Depth summary windows (~10 s order-book windows from MarketDataManager) merged onto chart bars. Live from
// depthWindow-{symbol}. History for tick bars is the saved DepthMetrics rows; time charts pass bucketMs and get them
// rolled up per bar by the server (/API/rapi/depth-metrics/buckets), since a 5m chart spans ~100k windows.
// The same history fetch hands the saved depth trade signals (signalShouldEmit rows) to onHistorySignals, since
// depthTradeSignal-{symbol} is live only.
// A bar takes the cumulative of the last window that closed before the next bar opened (carried forward, so a fast
// stretch of short bars keeps its level): the cumulative is a level known only once a window closes, so it's plotted
// at the close, like the signal markers. windowScore measures the activity across the window, so it is summed into
// the bar holding each window's midpoint (the liquidity counts' rule): a window closing just after a bar opens
// mostly describes the bar before it.

const PAGE_LIMIT = 20000;
const MAX_PAGES = 10;
const MAX_CARRY_MS = 30_000; // past this, a bar with no window of its own shows a gap rather than a stale level
const MAX_SUMMARIES = 100_000;
const DEFAULT_WINDOW_SECONDS = 10; // RequestMarketDataUpdate depthSummaryWindowMs
const LIVE_REMERGE_BARS = 50;
const HISTORY_FIELDS = [
    "cumulative",
    "windowScore",
    "windowSeconds",
    "signalDirection",
    "signalConsecutive",
    "signalShouldEmit",
    "signalType",
    "lastPrice",
    "frontMonth",
];

const toNumber = (value) => {
    if (value === null || value === undefined) return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
};

// Joined bars carry firstDatetime; their datetime is the last sub-bar's
const tickBarStart = (bar) => toNumber(bar?.firstDatetime ?? bar?.timestamp ?? bar?.datetime);

const toSummary = ({ timestamp, windowSeconds, cumulative, windowScore, direction, consecutive }) => {
    const time = toNumber(timestamp);
    if (time === null) return null;
    return {
        timestamp: time,
        midpoint: time - ((toNumber(windowSeconds) ?? DEFAULT_WINDOW_SECONDS) * 1000) / 2,
        cumulative: toNumber(cumulative),
        windowScore: toNumber(windowScore) ?? 0,
        direction: toNumber(direction),
        consecutive: toNumber(consecutive),
    };
};

const fromHistoryRow = (row) =>
    toSummary({
        timestamp: new Date(row?.createdAt).getTime(),
        windowSeconds: row?.windowSeconds,
        cumulative: row?.cumulative,
        windowScore: row?.windowScore,
        direction: row?.signalDirection,
        consecutive: row?.signalConsecutive,
    });

const fromLiveWindow = (msg) =>
    toSummary({
        timestamp: msg?.timestamp,
        windowSeconds: msg?.windowSeconds,
        cumulative: msg?.signalCumulative,
        windowScore: msg?.windowScore,
        direction: msg?.signalDirection,
        consecutive: msg?.signalConsecutive,
    });

// A server bucket as one summary: its score sits at the bucket start (every window in it had its midpoint there),
// its level at the close of its last window
const fromBucket = (bucket) => {
    const start = toNumber(bucket?.start);
    if (start === null) return null;
    return {
        timestamp: toNumber(bucket.lastClose) ?? start,
        midpoint: start,
        cumulative: toNumber(bucket.cumulative),
        windowScore: toNumber(bucket.windowScore) ?? 0,
        direction: toNumber(bucket.direction),
        consecutive: toNumber(bucket.consecutive),
    };
};

// Same shape as the live depthTradeSignal payload (DepthSignalAnalyzer.buildTradeSignalPayload), minus the narrative
const toHistorySignal = (row, symbol) => ({
    symbol,
    frontMonth: row.frontMonth,
    direction: row.signalDirection,
    signalType: row.signalType || "continuation",
    cumulative: row.cumulative,
    consecutive: row.signalConsecutive,
    windowScore: row.windowScore,
    lastPrice: row.lastPrice,
    timestamp: new Date(row.createdAt).getTime(),
});

// First index whose `field` (timestamp or midpoint; both ascend with the window order) is >= time
const lowerBound = (summaries, time, field = "timestamp") => {
    let lo = 0;
    let hi = summaries.length;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (summaries[mid][field] < time) lo = mid + 1;
        else hi = mid;
    }
    return lo;
};

// Sorted merge by timestamp; a window already held (same timestamp) is kept once. Midpoints must ascend too (the
// score pass walks them in order); raw windows already do, and a live window straddling the end of a history bucket
// is the only exception, so it is nudged into that bucket.
const mergeSummaries = (a, b) => {
    const merged = [];
    let i = 0;
    let j = 0;
    while (i < a.length || j < b.length) {
        const next = j >= b.length || (i < a.length && a[i].timestamp <= b[j].timestamp) ? a[i++] : b[j++];
        const previous = merged[merged.length - 1];
        if (previous && previous.timestamp === next.timestamp) continue;
        if (previous && next.midpoint < previous.midpoint) next.midpoint = previous.midpoint;
        merged.push(next);
    }
    return merged.length > MAX_SUMMARIES ? merged.slice(-MAX_SUMMARIES) : merged;
};

const assignIfDifferent = (bar, field, value) => {
    if (bar[field] === value) return false;
    bar[field] = value;
    return true;
};

// Mutates bars[fromIndex..] in place (same as useLiquidityRatios); returns true if any bar changed
export const mergeDepthSummariesIntoBars = (bars, summaries, fromIndex = 0, barStart = tickBarStart) => {
    if (!Array.isArray(bars) || !bars.length || !summaries?.length) return false;

    let changed = false;
    const firstStart = barStart(bars[fromIndex]);
    let j = firstStart === null ? 0 : lowerBound(summaries, firstStart);
    let k = firstStart === null ? 0 : lowerBound(summaries, firstStart, "midpoint");
    let carry = j > 0 ? summaries[j - 1] : null;

    for (let i = fromIndex; i < bars.length; i++) {
        const bar = bars[i];
        const start = barStart(bar);
        const nextStart = i + 1 < bars.length ? barStart(bars[i + 1]) : Infinity;
        if (start === null || nextStart === null) continue;

        let inBar = false;
        while (j < summaries.length && summaries[j].timestamp < nextStart) {
            // a bucket whose windows all closed in the next one carries a score but no level
            if (summaries[j].cumulative !== null) {
                carry = summaries[j];
                inBar = true;
            }
            j++;
        }

        let score = 0;
        let scored = false;
        while (k < summaries.length && summaries[k].midpoint < nextStart) {
            score += summaries[k].windowScore;
            scored = true;
            k++;
        }

        const live = carry && (inBar || carry.timestamp >= start - MAX_CARRY_MS) ? carry : null;
        changed = assignIfDifferent(bar, "depthSignalCumulative", live?.cumulative ?? null) || changed;
        changed = assignIfDifferent(bar, "depthSignalWindowScore", live || scored ? score : null) || changed;
        changed = assignIfDifferent(bar, "depthSignalDirection", live?.direction ?? null) || changed;
        changed = assignIfDifferent(bar, "depthSignalConsecutive", live?.consecutive ?? null) || changed;
        if (live) bar.depthSignalZero = 0;
    }

    return changed;
};

/**
 * Keeps depthSignalCumulative / depthSignalWindowScore / depthSignalDirection / depthSignalConsecutive on the chart's
 * bars (pixiDataRef.current.ohlcDatas) for the "Depth Cumulative" lower panel.
 *
 * @param {Object} params
 * @param {string} params.symbol - Base symbol (e.g. "ES")
 * @param {Object} params.Socket - Socket wrapper
 * @param {Object} params.pixiDataRef - Ref to GenericDataHandler
 * @param {Array} params.ohlcData - Bars passed to the chart (drives history fetch and re-merge)
 * @param {boolean} params.enabled
 * @param {Function} params.onHistorySignals - Receives saved depth trade signals for newly loaded history (raw mode)
 * @param {number} params.bucketMs - Time charts: bar size; history comes rolled up per bar from the server
 * @param {Function} params.getBarStart - When each bar opened (default: tick bars, firstDatetime ?? datetime)
 */
export const useDepthSummaryBars = ({
    symbol,
    Socket,
    pixiDataRef,
    ohlcData,
    enabled = true,
    onHistorySignals,
    bucketMs,
    getBarStart = tickBarStart,
}) => {
    const summariesRef = useRef([]);
    const fetchedStartRef = useRef(null); // history is loaded from here to the time the first fetch ran
    const fetchingRef = useRef(false);
    const contextKey = `${symbol}:${bucketMs ?? "raw"}`;
    const contextRef = useRef(contextKey);
    const onHistorySignalsRef = useRef(onHistorySignals);
    onHistorySignalsRef.current = onHistorySignals;
    const getBarStartRef = useRef(getBarStart);
    getBarStartRef.current = getBarStart;

    const applyToBars = useCallback(
        (fromIndex = 0) => {
            const bars = pixiDataRef.current?.ohlcDatas;
            if (!bars?.length) return false;
            const changed = mergeDepthSummariesIntoBars(
                bars,
                summariesRef.current,
                Math.max(0, Math.min(fromIndex, bars.length - 1)),
                getBarStartRef.current
            );
            if (changed) pixiDataRef.current?.draw?.();
            return changed;
        },
        [pixiDataRef]
    );

    // Summaries are per symbol, and server buckets per bar size
    useEffect(() => {
        contextRef.current = contextKey;
        summariesRef.current = [];
        fetchedStartRef.current = null;
        fetchingRef.current = false;
    }, [contextKey]);

    // New bar objects (initial load, join change, history scroll): merge what we hold onto them
    useEffect(() => {
        if (enabled) applyToBars();
    }, [enabled, ohlcData, applyToBars]);

    // History for any bars earlier than what's loaded
    const firstBarStart = ohlcData?.length ? getBarStart(ohlcData[0]) : null;
    useEffect(() => {
        if (!enabled || !symbol || firstBarStart === null || fetchingRef.current) return;
        const fetchedStart = fetchedStartRef.current;
        if (fetchedStart !== null && firstBarStart >= fetchedStart) return;

        const requestSymbol = symbol;
        const requestContext = contextKey;
        const start = bucketMs ? firstBarStart : firstBarStart - MAX_CARRY_MS;
        const end = fetchedStart ?? Date.now();
        fetchingRef.current = true;

        // History covers every window that closed before `end`; a live one already held for that span would count twice
        const mergeHistory = (history) => {
            const live = fetchedStart === null ? summariesRef.current.filter((summary) => summary.timestamp >= end) : summariesRef.current;
            summariesRef.current = mergeSummaries(history, live);
            fetchedStartRef.current = start;
        };

        (async () => {
            try {
                if (bucketMs) {
                    const response = await API.getDepthMetricBuckets({ symbol: requestSymbol, start, end, bucketMs });
                    if (contextRef.current !== requestContext) return;
                    const history = (Array.isArray(response?.buckets) ? response.buckets : []).map(fromBucket).filter(Boolean);
                    mergeHistory(history);
                    console.log(
                        `[useDepthSummaryBars] ${requestSymbol} loaded ${history.length} depth buckets (${response?.windows ?? 0} windows) from ${new Date(start).toLocaleString()}`
                    );
                    applyToBars();
                    return;
                }

                let rows = [];
                let pageStart = start;
                for (let page = 0; page < MAX_PAGES; page++) {
                    const response = await API.getDepthMetrics({
                        symbol: requestSymbol,
                        start: pageStart,
                        end,
                        limit: PAGE_LIMIT,
                        fields: HISTORY_FIELDS,
                    });
                    const pageRows = Array.isArray(response?.rows) ? response.rows : [];
                    rows = rows.concat(pageRows);
                    if (pageRows.length < PAGE_LIMIT) break;
                    pageStart = new Date(pageRows[pageRows.length - 1].createdAt).getTime() + 1;
                }
                if (contextRef.current !== requestContext) return;

                const history = rows.map(fromHistoryRow).filter(Boolean);
                mergeHistory(history);
                console.log(`[useDepthSummaryBars] ${requestSymbol} loaded ${history.length} depth windows from ${new Date(start).toLocaleString()}`);
                applyToBars();

                const signals = rows.filter((row) => row.signalShouldEmit).map((row) => toHistorySignal(row, requestSymbol));
                if (signals.length) onHistorySignalsRef.current?.(signals);
            } catch (error) {
                console.error("[useDepthSummaryBars] Failed to load depth metrics history:", error);
            } finally {
                if (contextRef.current === requestContext) fetchingRef.current = false;
            }
        })();
    }, [enabled, symbol, firstBarStart, applyToBars, bucketMs, contextKey]);

    // Live windows land on the last few bars; re-merging a short tail also covers bars appended since the last window
    useEffect(() => {
        if (!enabled || !Socket || !symbol) return;

        const eventName = `depthWindow-${symbol}`;
        const handleDepthWindow = (msg) => {
            if (msg?.symbol && `${msg.symbol}`.toUpperCase() !== `${symbol}`.toUpperCase()) return;
            const summary = fromLiveWindow(msg);
            if (!summary) return;
            summariesRef.current = mergeSummaries(summariesRef.current, [summary]);
            const bars = pixiDataRef.current?.ohlcDatas;
            if (bars?.length) applyToBars(bars.length - LIVE_REMERGE_BARS);
        };

        Socket.on(eventName, handleDepthWindow);
        const release = Socket.subscribe("depthSummary", { symbol });
        return () => {
            Socket.off(eventName, handleDepthWindow);
            release();
        };
    }, [enabled, Socket, symbol, pixiDataRef, applyToBars]);

    return { applyToBars };
};
