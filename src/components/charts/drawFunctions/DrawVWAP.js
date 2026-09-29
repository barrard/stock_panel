import { Graphics, Container } from "pixi.js";
import { eastCoastTime } from "../../../indicators/indicatorHelpers/IsMarketOpen.js";

// Regular trading hours open, in minutes past east-coast midnight.
const RTH_OPEN_MINUTES = 9 * 60 + 30;

/**
 * Session-anchored VWAP overlay.
 *
 * The cumulative sums reset at the 9:30 ET open, so the line is anchored where
 * traders read it from. Pre-market bars accumulate into their own segment that
 * ends at the open; the post-market tail keeps accumulating into the regular
 * session rather than starting over at 4pm.
 */
export default class DrawVWAP {
    constructor(ohlcData, pixiDataRef, layer = 2) {
        this.ohlcData = ohlcData;
        this.pixiDataRef = pixiDataRef;
        this.layer = layer;
        this.hasInit = false;
        this.vwapValues = []; // Parallel to ohlcData; null where a value can't be computed
        this.sessionStarts = new Set(); // Absolute indices where a new session begins
        // Running sums and session key per bar, so the tail can be recomputed on its own
        this.cumPriceVol = [];
        this.cumVol = [];
        this.sessionKeys = [];
        this.lastDataLength = 0;
        this.lastBarSignature = null;
        this.firstBarTime = null;

        this.color = 0x00bcd4;
        this.lineWidth = 2;

        this.init();
    }

    init() {
        if (this.hasInit) return;
        this.hasInit = true;
        this.initContainer();
        this.calculateVWAP();
    }

    initContainer() {
        this.container = new Container();
        this.gfx = new Graphics();
        this.container.addChild(this.gfx);
        this.pixiDataRef.current.addToLayer(this.layer, this.container);
    }

    cleanup() {
        if (this.container) {
            this.pixiDataRef?.current?.removeFromLayer?.(this.layer, this.container);
            this.container.destroy({ children: true });
            this.container = null;
            this.gfx = null;
        }
    }

    /**
     * Epoch ms for a bar. `datetime` is the only field that is reliably numeric -
     * live bars off the socket carry a formatted east-coast string in `timestamp`
     * (see parseChartEquity), so it is only trusted when it is already a number.
     */
    static getBarTime(bar) {
        const datetime = Number(bar?.datetime);
        if (Number.isFinite(datetime)) return datetime;

        const timestamp = bar?.timestamp;
        if (typeof timestamp === "number" && Number.isFinite(timestamp)) return timestamp;
        if (typeof timestamp === "string") {
            const parsed = Date.parse(timestamp);
            if (Number.isFinite(parsed)) return parsed;
        }
        return null;
    }

    static getSessionKey(bar) {
        const time = DrawVWAP.getBarTime(bar);
        if (time === null) return null;
        const { year, month, date, hour, minute } = eastCoastTime(time);
        // Pre-market gets its own segment so the regular session anchors at 9:30.
        const phase = hour * 60 + minute < RTH_OPEN_MINUTES ? "pre" : "rth";
        return `${year}-${month}-${date}-${phase}`;
    }

    resetState() {
        this.vwapValues = [];
        this.sessionStarts = new Set();
        this.cumPriceVol = [];
        this.cumVol = [];
        this.sessionKeys = [];
        this.lastDataLength = 0;
        this.lastBarSignature = null;
        this.firstBarTime = null;
    }

    /**
     * Recompute from `fromIndex` on, carrying the running sums forward from the bar
     * before it. Live ticks only ever mutate the last bar, and a full pass costs a
     * timezone conversion per bar, so the common case recomputes one or two bars.
     */
    calculateVWAP(fromIndex = 0) {
        // GenericDataHandler may have swapped the array out from under us
        if (this.pixiDataRef?.current?.ohlcDatas && this.ohlcData !== this.pixiDataRef.current.ohlcDatas) {
            this.ohlcData = this.pixiDataRef.current.ohlcDatas;
            fromIndex = 0;
        }

        const length = this.ohlcData?.length || 0;
        if (length === 0) {
            this.resetState();
            return;
        }

        const start = Math.max(0, Math.min(fromIndex, length - 1));

        if (start === 0) {
            this.vwapValues = new Array(length).fill(null);
            this.cumPriceVol = new Array(length).fill(0);
            this.cumVol = new Array(length).fill(0);
            this.sessionKeys = new Array(length).fill(null);
            this.sessionStarts = new Set();
        } else {
            this.vwapValues.length = length;
            this.cumPriceVol.length = length;
            this.cumVol.length = length;
            this.sessionKeys.length = length;
            for (let i = start; i < length; i++) this.sessionStarts.delete(i);
        }

        let cumulativePriceVol = start > 0 ? this.cumPriceVol[start - 1] : 0;
        let cumulativeVol = start > 0 ? this.cumVol[start - 1] : 0;
        let currentSessionKey = start > 0 ? this.sessionKeys[start - 1] : null;

        for (let i = start; i < length; i++) {
            const bar = this.ohlcData[i];

            // A bar whose time can't be resolved stays in the running session rather
            // than being read as a new one, which would break the line at that bar.
            const sessionKey = DrawVWAP.getSessionKey(bar) ?? currentSessionKey;

            // Reset the accumulation at each new session
            if (sessionKey !== currentSessionKey) {
                currentSessionKey = sessionKey;
                cumulativePriceVol = 0;
                cumulativeVol = 0;
                this.sessionStarts.add(i);
            }
            this.sessionKeys[i] = currentSessionKey;

            const high = Number(bar?.high);
            const low = Number(bar?.low);
            const close = Number(bar?.close);
            const volume = Number(bar?.volume);

            if (Number.isFinite(high) && Number.isFinite(low) && Number.isFinite(close)) {
                const typicalPrice = (high + low + close) / 3;
                // Fall back to an unweighted average when a feed gives no volume,
                // otherwise cumulativeVol stays 0 and every value is NaN.
                const barVolume = Number.isFinite(volume) && volume > 0 ? volume : 1;

                cumulativePriceVol += typicalPrice * barVolume;
                cumulativeVol += barVolume;
            }

            this.cumPriceVol[i] = cumulativePriceVol;
            this.cumVol[i] = cumulativeVol;
            this.vwapValues[i] = cumulativeVol > 0 ? cumulativePriceVol / cumulativeVol : null;
        }

        this.lastDataLength = length;
        this.lastBarSignature = DrawVWAP.getBarSignature(this.ohlcData[length - 1]);
        this.firstBarTime = DrawVWAP.getBarTime(this.ohlcData[0]);
    }

    /**
     * setCompleteBar swaps the temporary bar for the authoritative one in place, so
     * the array length alone doesn't tell us the tail moved - watch its OHLCV too.
     */
    static getBarSignature(bar) {
        if (!bar) return null;
        return `${DrawVWAP.getBarTime(bar)}|${bar.volume}|${bar.high}|${bar.low}|${bar.close}`;
    }

    /** Bring the cached values in line with the current bars, doing the least work. */
    syncToData() {
        const length = this.ohlcData?.length || 0;
        if (length === 0 || this.lastDataLength === 0) return this.calculateVWAP(0);

        // Bars prepended by a history load shift every index - start over.
        if (DrawVWAP.getBarTime(this.ohlcData[0]) !== this.firstBarTime) return this.calculateVWAP(0);
        if (length < this.lastDataLength) return this.calculateVWAP(0);

        if (length === this.lastDataLength && DrawVWAP.getBarSignature(this.ohlcData[length - 1]) === this.lastBarSignature) {
            return;
        }

        // Only the tail moved: redo the previously-last bar (it may have been
        // finalized by setCompleteBar) and anything appended after it.
        this.calculateVWAP(this.lastDataLength - 1);
    }

    drawAll() {
        if (!this.container || !this.gfx) return;

        if (this.pixiDataRef?.current?.ohlcDatas && this.ohlcData !== this.pixiDataRef.current.ohlcDatas) {
            this.ohlcData = this.pixiDataRef.current.ohlcDatas;
        }

        this.syncToData();

        this.gfx.clear();

        const chart = this.pixiDataRef.current;
        const slicedData = chart.slicedData;
        if (!slicedData || slicedData.length === 0) return;

        const sliceStart = chart.sliceStart || 0;
        this.xScale = chart.xScale;
        this.priceScale = chart.priceScale;

        this.gfx.lineStyle(this.lineWidth, this.color, 1);

        let firstPoint = true;
        for (let i = 0; i < slicedData.length; i++) {
            const absoluteIndex = sliceStart + i;
            const value = this.vwapValues[absoluteIndex];

            // Break the line at session boundaries and at gaps
            if (value === null || value === undefined || (i > 0 && this.sessionStarts.has(absoluteIndex))) {
                firstPoint = true;
                if (value === null || value === undefined) continue;
            }

            const x = this.xScale(i);
            const y = this.priceScale(value);

            if (firstPoint) {
                this.gfx.moveTo(x, y);
                firstPoint = false;
            } else {
                this.gfx.lineTo(x, y);
            }
        }
    }
}
