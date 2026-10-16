import { useEffect, useRef } from "react";
import API from "../../API";
import { MAX_DEPTH_CUES } from "../pixiChart/components/DrawDepthCues";

// Saved depth audio cues (DepthMetrics windows, /API/rapi/depth-cues) for the loaded bars, merged with the live
// depthFlowMarker cues the chart holds in pendingRef and handed to the DrawDepthCues instance in drawRef.
// Loads from the first bar to now, then further back as older history loads (like useDepthSummaryBars).

// Joined tick bars carry firstDatetime; their datetime is the last sub-bar's
const tickBarStart = (bar) => {
    const time = Number(bar?.firstDatetime ?? bar?.timestamp ?? bar?.datetime);
    return Number.isFinite(time) ? time : null;
};

const cueKey = (cue) => `${cue.timestamp}:${cue.type}`;

// A live cue and its saved copy are the same payload, so they share a key
export const mergeDepthCues = (...lists) => {
    const byKey = new Map();
    for (const list of lists) for (const cue of list || []) if (cue && Number.isFinite(Number(cue.timestamp))) byKey.set(cueKey(cue), cue);
    return [...byKey.values()].sort((a, b) => a.timestamp - b.timestamp).slice(-MAX_DEPTH_CUES);
};

/**
 * @param {Object} params
 * @param {string} params.symbol - Base symbol (e.g. "ES")
 * @param {string} params.resetKey - Changes when the chart drops its cues (symbol, timeframe), to load them again
 * @param {Array} params.ohlcData - Bars passed to the chart (the first one sets how far back to load)
 * @param {Object} params.pendingRef - The chart's cue list (live cues are appended to it)
 * @param {Object} params.drawRef - Ref to the DrawDepthCues instance, if one is drawing
 * @param {Function} params.getBarStart - When a bar opened (default: tick bars, firstDatetime ?? datetime)
 * @param {boolean} params.enabled
 */
export const useDepthCueHistory = ({ symbol, resetKey = symbol, ohlcData, pendingRef, drawRef, getBarStart = tickBarStart, enabled = true }) => {
    const fetchedStartRef = useRef(null); // cues are loaded from here to the time the first fetch ran
    const fetchingRef = useRef(false);
    const contextRef = useRef(resetKey);

    useEffect(() => {
        contextRef.current = resetKey;
        fetchedStartRef.current = null;
        fetchingRef.current = false;
    }, [resetKey]);

    const firstBarStart = ohlcData?.length ? getBarStart(ohlcData[0]) : null;
    useEffect(() => {
        if (!enabled || !symbol || !Number.isFinite(firstBarStart) || fetchingRef.current) return;
        const fetchedStart = fetchedStartRef.current;
        if (fetchedStart !== null && firstBarStart >= fetchedStart) return;

        const requestContext = resetKey;
        const start = firstBarStart;
        const end = fetchedStart ?? Date.now();
        fetchingRef.current = true;

        (async () => {
            try {
                const response = await API.getDepthCues({ symbol, start, end });
                if (contextRef.current !== requestContext) return;
                const history = Array.isArray(response?.cues) ? response.cues : [];
                fetchedStartRef.current = start;
                pendingRef.current = mergeDepthCues(history, pendingRef.current);
                drawRef.current?.setCues(pendingRef.current);
                console.log(`[useDepthCueHistory] ${symbol} loaded ${history.length} depth cues from ${new Date(start).toLocaleString()}`);
            } catch (error) {
                console.error("[useDepthCueHistory] Failed to load depth cues:", error);
            } finally {
                if (contextRef.current === requestContext) fetchingRef.current = false;
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, symbol, firstBarStart, resetKey]);
};
