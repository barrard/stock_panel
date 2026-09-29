import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { mean, min } from "d3-array";
import extrema from "../../../indicators/indicatorHelpers/extrema.js";
import {
    findTheBreakAndHolds,
    slopeAndIntercept,
    xOfY,
} from "../../../indicators/indicatorHelpers/utils.js";
import { DEFAULT_OPTIONS_BY_MODE } from "./extremaAnalysisConfig.js";

// Only these fields feed each mode's calculation - used to build the calc cache key
// and to decide whether a settings change should force a recalculation.
const RELEVANT_CALC_FIELDS_BY_MODE = {
    priceLevels: ["minMaxBars", "priceLevelSensitivity"],
    fibonacci: ["minMaxBars"],
    trendlines: ["minMaxBars", "trendlineErrorLimit"],
    zigZag: ["minMaxBars"],
};

const COLORS = {
    priceLevels: 0xffc857,
    supportFib: 0x36d399,
    resistanceFib: 0xf87171,
    highTrend: 0xff5c7a,
    lowTrend: 0x41d67a,
    zigZag: 0x8ab4ff,
    maxPoint: 0xff5c7a,
    minPoint: 0x41d67a,
};

function toNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function getBarTime(bar) {
    return toNumber(bar?.timestamp ?? bar?.datetime);
}

function normalizeOptions(mode, options = {}) {
    const defaults = DEFAULT_OPTIONS_BY_MODE[mode] || {};
    const merged = { ...defaults, ...options };
    const normalized = { showLabels: merged.showLabels ?? defaults.showLabels ?? true };

    // Only normalize/carry fields this mode's defaults actually declare -
    // e.g. zigZag/fibonacci never get a stray trendlineErrorLimit or priceLevelSensitivity.
    if ("minMaxBars" in defaults) {
        normalized.minMaxBars = Math.max(1, Math.floor(toNumber(merged.minMaxBars) ?? defaults.minMaxBars));
    }
    if ("priceLevelSensitivity" in defaults) {
        normalized.priceLevelSensitivity = Math.max(0.1, toNumber(merged.priceLevelSensitivity) ?? defaults.priceLevelSensitivity);
    }
    if ("trendlineErrorLimit" in defaults) {
        normalized.trendlineErrorLimit = Math.max(0.1, toNumber(merged.trendlineErrorLimit) ?? defaults.trendlineErrorLimit);
    }
    return normalized;
}

function buildSeries(data = []) {
    const bars = data
        .map((bar, index) => ({
            ...bar,
            _analysisIndex: index,
            _analysisTime: getBarTime(bar),
        }))
        .filter((bar) => Number.isFinite(bar._analysisTime));

    return {
        bars,
        timestamps: bars.map((bar) => bar._analysisTime),
        highs: bars.map((bar) => toNumber(bar.high)),
        lows: bars.map((bar) => toNumber(bar.low)),
        closes: bars.map((bar) => toNumber(bar.close)),
    };
}

function getAnalysisBarSignature(data = []) {
    if (!data.length) return "empty";

    const firstBar = data[0];
    const completedIndex = Math.max(0, data.length - 2);
    const completedBar = data[completedIndex];

    return [
        data.length,
        getBarTime(firstBar),
        firstBar?.open,
        firstBar?.high,
        firstBar?.low,
        firstBar?.close,
        getBarTime(completedBar),
        completedBar?.open,
        completedBar?.high,
        completedBar?.low,
        completedBar?.close,
    ].join(":");
}

function withIndex(points = [], timeIndexMap) {
    return points
        .map((point) => ({
            ...point,
            index: timeIndexMap.get(point.x),
        }))
        .filter((point) => Number.isFinite(point.index) && Number.isFinite(point.y));
}

function dedupeSwingPoints(points = []) {
    const byIndex = new Map();
    points.forEach((point) => {
        const existing = byIndex.get(point.index);
        if (!existing || point.kind !== existing.kind) {
            byIndex.set(point.index, point);
        }
    });
    return [...byIndex.values()].sort((a, b) => a.index - b.index);
}

function buildZigZagPoints(minPoints = [], maxPoints = []) {
    const points = dedupeSwingPoints([
        ...minPoints.map((point) => ({ ...point, kind: "min" })),
        ...maxPoints.map((point) => ({ ...point, kind: "max" })),
    ]);
    const swings = [];

    points.forEach((point) => {
        const previous = swings[swings.length - 1];
        if (!previous) {
            swings.push(point);
            return;
        }

        if (previous.kind !== point.kind) {
            swings.push(point);
            return;
        }

        const isMoreExtreme = point.kind === "max" ? point.y > previous.y : point.y < previous.y;
        if (isMoreExtreme) {
            swings[swings.length - 1] = point;
        }
    });

    return swings;
}

function toFibPoint(point) {
    return {
        name: point.kind === "max" ? "high" : "low",
        val: { y: point.y },
        index: point.index,
        datetime: point.x,
    };
}

function buildZigZagFibLevels(zigZagPoints = [], bars = []) {
    const fibsList = [];
    const fibLines = [];
    const trendLines = [];
    const arbitraryLimit = 0.001;

    zigZagPoints.forEach((point, pointIndex) => {
        if (pointIndex === zigZagPoints.length - 1) return;

        const firstPoint = toFibPoint(point);
        const secondPoint = toFibPoint(zigZagPoints[pointIndex + 1]);
        const lowToHigh = firstPoint.name === "low" && secondPoint.name === "high";
        const highToLow = firstPoint.name === "high" && secondPoint.name === "low";

        if (!lowToHigh && !highToLow) return;

        const diff = lowToHigh
            ? secondPoint.val.y - firstPoint.val.y
            : firstPoint.val.y - secondPoint.val.y;

        if (!Number.isFinite(diff) || diff <= Math.abs(firstPoint.val.y) * arbitraryLimit) return;

        const fib = lowToHigh
            ? {
                  firstPoint,
                  secondPoint,
                  _38: secondPoint.val.y - diff * 0.38,
                  _50: secondPoint.val.y - diff / 2,
                  _62: secondPoint.val.y - diff * 0.62,
              }
            : {
                  firstPoint,
                  secondPoint,
                  _38: secondPoint.val.y + diff * 0.38,
                  _50: secondPoint.val.y + diff / 2,
                  _62: secondPoint.val.y + diff * 0.62,
              };

        fibsList.push(fib);
        trendLines.push({
            x1: firstPoint.index,
            x2: secondPoint.index,
            y1: firstPoint.val.y,
            y2: secondPoint.val.y,
            color: highToLow ? COLORS.resistanceFib : COLORS.supportFib,
        });
    });

    fibsList.forEach((fib) => {
        const { firstPoint, secondPoint } = fib;
        const x1 = firstPoint.index;
        const x2 = secondPoint.index;
        const y1 = firstPoint.val.y;
        const y2 = secondPoint.val.y;
        const { b, m } = slopeAndIntercept({ x1, x2, y1, y2 });

        if (!Number.isFinite(m) || m === 0 || !Number.isFinite(b)) return;

        [
            ["38", fib._38],
            ["50", fib._50],
            ["62", fib._62],
        ].forEach(([fibLabel, price]) => {
            const startX = Math.round(xOfY({ m, b, y: price }));
            if (!Number.isFinite(startX)) return;

            const breaksAndHold = findTheBreakAndHolds({ x2, y2: price, ohlc: bars, fibData: fib }) || [];
            const invalidation = breaksAndHold[breaksAndHold.length - 1];
            const endX = Number.isFinite(invalidation?.x)
                ? Math.min(invalidation.x, bars.length - 1)
                : bars.length - 1;

            if (endX < startX) return;

            fibLines.push({
                x1: startX,
                x2: endX,
                y1: price,
                y2: price,
                fib: fibLabel,
                color: firstPoint.name === "high" ? COLORS.resistanceFib : COLORS.supportFib,
                invalidated: breaksAndHold.length >= 3 && Number.isFinite(invalidation?.x) && invalidation.x < bars.length - 1,
            });
        });
    });

    return { fibsList, fibLines, trendLines };
}

const MIN_PRICE_LEVEL_TOUCHES = 3;

// Clusters swing points into price levels using each bucket's running average (not a fixed
// anchor), so the comparison price drifts as points join. Only buckets that end up with at
// least MIN_PRICE_LEVEL_TOUCHES points are considered a real, significant level.
function mergePriceLevelsByRunningAverage(points = [], sensitivity) {
    const sorted = [...points].sort((a, b) => a.y - b.y);
    const buckets = [];

    sorted.forEach((point) => {
        const bucket = buckets.find((b) => Math.abs(point.y / b.avg - 1) < sensitivity / 10000);
        if (bucket) {
            bucket.points.push(point);
            bucket.avg = mean(bucket.points, (p) => p.y);
        } else {
            buckets.push({ avg: point.y, points: [point] });
        }
    });

    return buckets
        .filter((bucket) => bucket.points.length >= MIN_PRICE_LEVEL_TOUCHES)
        .map((bucket) => ({
            x: min(bucket.points, (p) => p.x),
            y: parseFloat(bucket.avg.toFixed(4)),
            points: bucket.points,
        }));
}

function scalePoint(chart, point) {
    const visibleIndex = point.index - chart.sliceStart;
    return {
        x: chart.xScale(visibleIndex),
        y: chart.priceScale(point.y),
        visibleIndex,
    };
}

export default class DrawExtremaAnalysis {
    constructor(chart, mode, options = {}, layer = 2) {
        this.chart = chart;
        this.mode = mode;
        this.options = normalizeOptions(mode, options);
        this.layer = layer;
        this.container = new Container();
        this.gfx = new Graphics();
        this.labelContainer = new Container();
        this.container.addChild(this.gfx);
        this.container.addChild(this.labelContainer);
        this.chart.addToLayer(this.layer, this.container);
        this.lastCalcKey = null;
        this.analysis = null;
        // Reused across draws instead of destroying/recreating Text objects every call.
        this.labelPool = [];
        this._labelIndex = 0;

        // Price levels: hovering a level's line reveals the min/max points merged into it.
        this.hoveredLevel = null;
        if (this.mode === "priceLevels") {
            this._handlePointerMove = this.handlePointerMove.bind(this);
            this._handlePointerOut = this.handlePointerOut.bind(this);
            this.chart.mainChartContainer?.on("pointermove", this._handlePointerMove);
            this.chart.mainChartContainer?.on("pointerout", this._handlePointerOut);
        }
    }

    handlePointerMove() {
        if (!this.analysis?.priceLevels?.length) return;
        const hitToleranceY = 4;
        const mouseY = this.chart.mouseY;
        const hovered = this.analysis.priceLevels.find((level) => Math.abs(this.chart.priceScale(level.y) - mouseY) <= hitToleranceY) || null;

        if (hovered !== this.hoveredLevel) {
            this.hoveredLevel = hovered;
            this.draw();
        }
    }

    handlePointerOut() {
        if (this.hoveredLevel) {
            this.hoveredLevel = null;
            this.draw();
        }
    }

    setOptions(options = {}) {
        const nextOptions = normalizeOptions(this.mode, { ...this.options, ...options });
        const relevantFields = RELEVANT_CALC_FIELDS_BY_MODE[this.mode] || [];
        const recalculationOptionChanged = relevantFields.some((key) => nextOptions[key] !== this.options[key]);

        this.options = nextOptions;
        if (recalculationOptionChanged) {
            this.lastCalcKey = null;
        }
        this.draw();
    }

    cleanup() {
        if (this._handlePointerMove) this.chart?.mainChartContainer?.off("pointermove", this._handlePointerMove);
        if (this._handlePointerOut) this.chart?.mainChartContainer?.off("pointerout", this._handlePointerOut);
        this.chart?.removeFromLayer?.(this.layer, this.container);
        this.container?.destroy?.({ children: true });
        this.container = null;
        // Null these out (not just the container) so a stray draw() call after cleanup -
        // e.g. a race during a timeframe switch - hits the guard below instead of calling
        // .clear() on an already-destroyed Graphics object (whose internals are nulled).
        this.gfx = null;
        this.labelContainer = null;
        this.labelPool = [];
    }

    draw() {
        if (!this.gfx || this.gfx.destroyed || !this.chart?.ohlcDatas?.length || !this.chart?.slicedData?.length) return;

        this.recalculateIfNeeded();
        this.gfx.clear();
        this._labelIndex = 0;

        if (this.analysis) {
            if (this.mode === "priceLevels") this.drawPriceLevels();
            if (this.mode === "fibonacci") this.drawFibonacci();
            if (this.mode === "trendlines") this.drawTrendlines();
            if (this.mode === "zigZag") this.drawZigZag();
        }

        this.hideUnusedLabels();
    }

    recalculateIfNeeded() {
        const relevantFields = RELEVANT_CALC_FIELDS_BY_MODE[this.mode] || [];
        const calcKey = [
            this.mode,
            getAnalysisBarSignature(this.chart.ohlcDatas),
            ...relevantFields.map((key) => this.options[key]),
        ].join(":");

        if (calcKey === this.lastCalcKey) return;

        this.lastCalcKey = calcKey;
        this.analysis = this.calculateAnalysis();
    }

    calculateAnalysis() {
        const { bars, timestamps, highs, lows, closes } = buildSeries(this.chart.ohlcDatas);
        if (bars.length < this.options.minMaxBars * 2 + 1) return null;

        const timeIndexMap = new Map(bars.map((bar) => [bar._analysisTime, bar._analysisIndex]));
        const highLowMinMax = () => {
            // Note: do NOT dedupe these by exact price - minMax() already returns properly
            // spaced genuine local extrema, and futures prices frequently revisit the same
            // exact tick value across unrelated swings. A price-based dedup here silently
            // erases real, distinct swing points whenever they coincide with an old price.
            const highMax = extrema.minMax(timestamps, highs, this.options.minMaxBars).maxValues || [];
            const lowMin = extrema.minMax(timestamps, lows, this.options.minMaxBars).minValues || [];
            return {
                highMax,
                lowMin,
                maxPoints: withIndex(highMax, timeIndexMap),
                minPoints: withIndex(lowMin, timeIndexMap),
            };
        };

        if (this.mode === "priceLevels") {
            const { highMax, lowMin } = highLowMinMax();
            const closeMinMax = extrema.minMax(timestamps, closes, this.options.minMaxBars);
            const closeMax = closeMinMax.maxValues || [];
            const closeMin = closeMinMax.minValues || [];
            const allPricePoints = [
                ...highMax.map((p) => ({ ...p, kind: "high" })),
                ...lowMin.map((p) => ({ ...p, kind: "low" })),
                ...closeMax.map((p) => ({ ...p, kind: "high" })),
                ...closeMin.map((p) => ({ ...p, kind: "low" })),
            ];
            const priceLevels = mergePriceLevelsByRunningAverage(allPricePoints, this.options.priceLevelSensitivity).map((level) => ({
                ...level,
                points: level.points?.map((point) => ({ ...point, index: timeIndexMap.get(point.x) })) || [],
            }));

            return { priceLevels };
        }

        if (this.mode === "fibonacci") {
            const { maxPoints, minPoints } = highLowMinMax();
            const zigZagPoints = buildZigZagPoints(minPoints, maxPoints);
            return {
                zigZagPoints,
                fibData: buildZigZagFibLevels(zigZagPoints, bars),
            };
        }

        const { maxPoints, minPoints } = highLowMinMax();

        if (this.mode === "zigZag") {
            return {
                maxPoints,
                minPoints,
                zigZagPoints: buildZigZagPoints(minPoints, maxPoints),
            };
        }

        if (this.mode === "trendlines") {
            const highRegressionPoints = maxPoints.map((point) => ({ ...point, x: point.index }));
            const lowRegressionPoints = minPoints.map((point) => ({ ...point, x: point.index }));

            return {
                maxPoints,
                minPoints,
                highTrendlines: extrema.regressionAnalysis(highRegressionPoints, this.options.trendlineErrorLimit, []) || [],
                lowTrendlines: extrema.regressionAnalysis(lowRegressionPoints, this.options.trendlineErrorLimit, []) || [],
            };
        }

        return null;
    }

    hideUnusedLabels() {
        for (let i = this._labelIndex; i < this.labelPool.length; i++) {
            this.labelPool[i].visible = false;
        }
    }

    drawLabel(text, x, y, color = "#d8dee9") {
        if (!this.options.showLabels) return;

        let label = this.labelPool[this._labelIndex];
        if (!label) {
            label = new Text(text, new TextStyle({ fill: color, fontFamily: "Arial", fontSize: 11 }));
            this.labelPool.push(label);
            this.labelContainer.addChild(label);
        } else {
            if (label.text !== text) label.text = text;
            if (label.style.fill !== color) label.style.fill = color;
            label.visible = true;
        }
        label.x = x;
        label.y = y - 7;
        this._labelIndex++;
    }

    drawHorizontalLine(price, color, alpha = 0.85, width = 1) {
        if (!Number.isFinite(price)) return;
        const y = this.chart.priceScale(price);
        const right = this.chart.width - (this.chart.margin.left + this.chart.margin.right);
        this.gfx.lineStyle(width, color, alpha);
        this.gfx.moveTo(0, y);
        this.gfx.lineTo(right, y);
    }

    drawPriceLevels() {
        const visibleStart = this.chart.sliceStart;
        const visibleEnd = this.chart.sliceEnd;
        this.analysis.priceLevels.forEach((level) => {
            const pointCount = level.points?.length || 0;
            const hasVisibleTouch = level.points?.some((point) => {
                return point.index >= visibleStart && point.index < visibleEnd;
            });
            const isHovered = level === this.hoveredLevel;
            const alpha = isHovered ? 1 : hasVisibleTouch ? 0.95 : 0.45;
            const width = isHovered ? Math.min(5, 2 + pointCount * 0.35) : Math.min(4, 1 + pointCount * 0.35);
            this.drawHorizontalLine(level.y, COLORS.priceLevels, alpha, width);
            this.drawLabel(`${level.y.toFixed(2)} (${pointCount})`, 6, this.chart.priceScale(level.y), "#ffd166");

            if (isHovered) this.drawLevelPoints(level.points);
        });
    }

    drawLevelPoints(points = []) {
        const visibleStart = this.chart.sliceStart;
        const visibleEnd = this.chart.sliceEnd;
        points.forEach((point) => {
            if (!Number.isFinite(point.index) || point.index < visibleStart || point.index >= visibleEnd) return;
            const scaled = scalePoint(this.chart, point);
            this.gfx.lineStyle(1, 0xffffff, 0.9);
            this.gfx.beginFill(point.kind === "high" ? COLORS.maxPoint : COLORS.minPoint, 0.95);
            this.gfx.drawCircle(scaled.x, scaled.y, 5);
            this.gfx.endFill();
        });
    }

    drawFibonacci() {
        const fibData = this.analysis.fibData || {};
        const trendLines = fibData.trendLines || [];
        const fibLines = fibData.fibLines || [];

        trendLines.forEach((line) => {
            this.drawIndexedLine(line, line.color, 0.65, 2);
        });

        fibLines.forEach((line) => {
            const alpha = line.invalidated ? 0.35 : 0.85;
            const visibleLine = this.drawIndexedLine(line, line.color, alpha, 1);
            if (!visibleLine) return;

            const labelX = Math.max(
                4,
                Math.min(
                    this.chart.width - this.chart.margin.left - this.chart.margin.right - 34,
                    this.chart.xScale(visibleLine.x2 - this.chart.sliceStart) + 4
                )
            );
            this.drawLabel(`${line.fib}%`, labelX, this.chart.priceScale(line.y1), line.color === COLORS.supportFib ? "#7ee787" : "#ff9aa2");
        });
    }

    drawIndexedLine(line, color, alpha = 0.85, width = 1) {
        if (
            !Number.isFinite(line.x1) ||
            !Number.isFinite(line.x2) ||
            !Number.isFinite(line.y1) ||
            !Number.isFinite(line.y2)
        ) {
            return null;
        }

        const visibleStart = this.chart.sliceStart;
        const visibleEnd = this.chart.sliceEnd - 1;
        const left = Math.max(Math.min(line.x1, line.x2), visibleStart);
        const right = Math.min(Math.max(line.x1, line.x2), visibleEnd);

        if (right < visibleStart || left > visibleEnd || right < left) return null;

        const span = line.x2 - line.x1;
        const yAt = (x) => {
            if (span === 0) return line.y1;
            const ratio = (x - line.x1) / span;
            return line.y1 + (line.y2 - line.y1) * ratio;
        };

        this.gfx.lineStyle(width, color, alpha);
        this.gfx.moveTo(this.chart.xScale(left - this.chart.sliceStart), this.chart.priceScale(yAt(left)));
        this.gfx.lineTo(this.chart.xScale(right - this.chart.sliceStart), this.chart.priceScale(yAt(right)));
        return { x1: left, x2: right };
    }

    drawTrendlines() {
        this.drawTrendlineSet(this.analysis.highTrendlines, COLORS.highTrend, "H");
        this.drawTrendlineSet(this.analysis.lowTrendlines, COLORS.lowTrend, "L");
        this.drawPointMarkers(this.analysis.maxPoints, COLORS.maxPoint);
        this.drawPointMarkers(this.analysis.minPoints, COLORS.minPoint);
    }

    drawTrendlineSet(lines = [], color, prefix) {
        lines.forEach((line, index) => {
            if (!Number.isFinite(line.x1) || !Number.isFinite(line.x2)) return;
            const startIndex = Math.max(line.x1, this.chart.sliceStart);
            const endIndex = Math.min(line.x2, this.chart.sliceEnd - 1);
            if (endIndex < this.chart.sliceStart || startIndex > this.chart.sliceEnd - 1) return;

            const y1 = line.m * startIndex + line.b;
            const y2 = line.m * endIndex + line.b;
            this.gfx.lineStyle(2, color, 0.85);
            this.gfx.moveTo(this.chart.xScale(startIndex - this.chart.sliceStart), this.chart.priceScale(y1));
            this.gfx.lineTo(this.chart.xScale(endIndex - this.chart.sliceStart), this.chart.priceScale(y2));
            this.drawLabel(`${prefix}${index + 1}`, this.chart.xScale(endIndex - this.chart.sliceStart) + 4, this.chart.priceScale(y2), "#d8dee9");
        });
    }

    drawPointMarkers(points = [], color) {
        points.forEach((point) => {
            if (point.index < this.chart.sliceStart || point.index >= this.chart.sliceEnd) return;
            const scaled = scalePoint(this.chart, point);
            this.gfx.beginFill(color, 0.85);
            this.gfx.drawCircle(scaled.x, scaled.y, 3);
            this.gfx.endFill();
        });
    }

    drawZigZag() {
        const points = this.analysis.zigZagPoints.filter((point) => point.index >= this.chart.sliceStart && point.index < this.chart.sliceEnd);
        if (!points.length) return;

        this.gfx.lineStyle(2, COLORS.zigZag, 0.95);
        points.forEach((point, index) => {
            const scaled = scalePoint(this.chart, point);
            if (index === 0) this.gfx.moveTo(scaled.x, scaled.y);
            else this.gfx.lineTo(scaled.x, scaled.y);
        });

        points.forEach((point) => {
            const scaled = scalePoint(this.chart, point);
            this.gfx.beginFill(point.kind === "max" ? COLORS.maxPoint : COLORS.minPoint, 0.95);
            this.gfx.drawCircle(scaled.x, scaled.y, 4);
            this.gfx.endFill();
        });
    }
}
