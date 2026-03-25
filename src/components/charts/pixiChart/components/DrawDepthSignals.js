import { Container, Graphics, Text, TextStyle } from "pixi.js";

const DEFAULT_MAX_SIGNALS = 100;

const TOOLTIP_STYLE = new TextStyle({
    fontFamily: "Arial",
    fontSize: 11,
    fill: 0xffffff,
    wordWrap: true,
    wordWrapWidth: 260,
    lineHeight: 16,
});

function toTimestamp(value) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
        const parsed = new Date(value).getTime();
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function normalizeSignal(signal = {}) {
    const direction = signal.direction > 0 ? 1 : signal.direction < 0 ? -1 : 0;
    const lastPrice = Number(signal.lastPrice);
    const cumulative = Number(signal.cumulative);
    const consecutive = Number(signal.consecutive);
    const windowScore = Number(signal.windowScore);
    const timestamp =
        toTimestamp(signal.timestamp) ??
        toTimestamp(signal.timestampMs) ??
        toTimestamp(signal.receivedAt) ??
        Date.now();

    if (!direction || !Number.isFinite(lastPrice)) {
        return null;
    }

    return {
        ...signal,
        direction,
        lastPrice,
        cumulative: Number.isFinite(cumulative) ? cumulative : 0,
        consecutive: Number.isFinite(consecutive) ? consecutive : 0,
        windowScore: Number.isFinite(windowScore) ? windowScore : 0,
        timestamp,
    };
}

function stripAnsi(value = "") {
    return String(value).replace(/\u001b\[[0-9;]*m/g, "");
}

function formatSigned(value, digits = 1) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return "0.0";
    return `${numericValue >= 0 ? "+" : ""}${numericValue.toFixed(digits)}`;
}

function formatSignalTime(timestamp) {
    if (!Number.isFinite(timestamp)) return "Unknown time";
    return new Date(timestamp).toLocaleString();
}

function getScoreStrength(windowScore) {
    const normalizedScore = Number.isFinite(Number(windowScore)) ? Math.abs(Number(windowScore)) : 0;
    return Math.max(0, Math.min(1, normalizedScore / 6));
}

function getMarkerVisuals(consecutive, windowScore) {
    const normalizedSize = Number.isFinite(Number(consecutive)) ? Math.max(0, Number(consecutive)) : 0;
    const strength = getScoreStrength(windowScore);
    const baseSize = Math.max(4, Math.min(14, 4 + normalizedSize * 1.1));
    const markerSize = Math.max(3, baseSize * (0.6 + strength * 0.4));

    return {
        markerSize,
        lineAlpha: 0.2 + strength * 0.5,
        fillAlpha: 0.2 + strength * 0.65,
        strokeAlpha: 0.35 + strength * 0.6,
    };
}

function getSignalType(signal = {}) {
    return signal?.signalType || signal?.emitType || "primary";
}

function buildStarPoints(x, y, outerRadius, innerRadius, points = 4, rotation = 0) {
    const coords = [];
    const step = Math.PI / points;

    for (let index = 0; index < points * 2; index += 1) {
        const radius = index % 2 === 0 ? outerRadius : innerRadius;
        const angle = rotation + index * step - Math.PI / 2;
        coords.push(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
    }

    return coords;
}

export default class DrawDepthSignals {
    constructor(chart, options = {}) {
        this.chart = chart;
        this.maxSignals = options.maxSignals ?? DEFAULT_MAX_SIGNALS;
        this.signalLabel = options.signalLabel || "DEPTH";
        this.buyColor = options.buyColor ?? 0x00c853;
        this.sellColor = options.sellColor ?? 0xd50000;
        this.hoverHitboxPadding = options.hoverHitboxPadding ?? 8;
        this.signals = [];
        this.graphics = new Graphics();
        this.labelContainer = new Container();

        this.chart.addToLayer(6, this.graphics);
        this.chart.addToLayer(6, this.labelContainer);
    }

    clearLabels() {
        if (!this.labelContainer) return;
        this.labelContainer.removeChildren().forEach((child) => {
            child.destroy?.();
        });
    }

    clearSignals() {
        this.signals = [];
        this.draw();
    }

    setSignals(signals = []) {
        this.signals = signals.map(normalizeSignal).filter(Boolean).slice(-this.maxSignals);
        this.draw();
    }

    pushSignal(signal) {
        const normalized = normalizeSignal(signal);
        if (!normalized) return;

        this.signals.push(normalized);
        this.signals = this.signals.slice(-this.maxSignals);
        this.draw();
    }

    findSignalIndex(signal, data) {
        if (!Array.isArray(data) || !data.length) return -1;
        if (!signal?.timestamp) return data.length - 1;

        const firstTimestamp = data[0]?.timestamp ?? data[0]?.datetime;
        const lastTimestamp = data[data.length - 1]?.timestamp ?? data[data.length - 1]?.datetime;
        if (Number.isFinite(lastTimestamp) && signal.timestamp >= lastTimestamp) {
            return data.length - 1;
        }
        if (Number.isFinite(firstTimestamp) && signal.timestamp < firstTimestamp) {
            return -1;
        }

        let matchingIndex = -1;

        for (let index = 0; index < data.length; index += 1) {
            const bar = data[index];
            const barTimestamp = bar?.timestamp ?? bar?.datetime;
            if (!Number.isFinite(barTimestamp)) continue;

            if (barTimestamp <= signal.timestamp) {
                matchingIndex = index;
                continue;
            }

            break;
        }

        return matchingIndex;
    }

    drawTooltip(marker) {
        if (!marker?.signal) return;

        const { signal } = marker;
        const signalType = getSignalType(signal).toUpperCase();
        const title = `${this.signalLabel} ${signalType} ${signal.direction > 0 ? "BUY" : "SELL"}`;
        const narrative = stripAnsi(signal.narrative);
        const tooltipText = new Text(
            `${title}\nScore ${formatSigned(signal.windowScore)} | Cum ${formatSigned(signal.cumulative)} | ${Math.max(
                0,
                Math.round(signal.consecutive)
            )}w\n${signal.frontMonth || signal.symbol || ""} @ ${signal.lastPrice}\n${formatSignalTime(signal.timestamp)}\n${narrative}`,
            TOOLTIP_STYLE
        );

        const padding = 8;
        const chartWidth = this.chart.width - (this.chart.margin.left + this.chart.margin.right);
        const tooltipWidth = tooltipText.width + padding * 2;
        const tooltipHeight = tooltipText.height + padding * 2;
        const defaultX = marker.x + 14;
        const maxX = Math.max(0, chartWidth - tooltipWidth - 8);
        const tooltipX = Math.min(defaultX, maxX);
        const tooltipY = Math.max(8, Math.min(marker.y - tooltipHeight - 10, this.chart.mainChartContainerHeight - tooltipHeight - 8));

        this.graphics.beginFill(0x0b1020, 0.92);
        this.graphics.lineStyle(1, marker.color, 0.95);
        this.graphics.drawRoundedRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 6);
        this.graphics.endFill();

        tooltipText.x = tooltipX + padding;
        tooltipText.y = tooltipY + padding;
        this.labelContainer.addChild(tooltipText);
    }

    drawMarker({ x, y, direction, color, consecutive, windowScore, signalType }) {
        const { markerSize, fillAlpha, strokeAlpha } = getMarkerVisuals(consecutive, windowScore);

        const type = getSignalType({ signalType });
        const strokeWidth =
            type === "impulse" ? 2.5 :
            type === "transition" ? 2 :
            1.5;
        const size =
            type === "impulse" ? markerSize + 2 :
            type === "continuation" ? markerSize + 1 :
            markerSize;

        this.graphics.lineStyle(strokeWidth, color, strokeAlpha);
        this.graphics.beginFill(color, fillAlpha);

        if (type === "transition") {
            this.graphics.drawRect(x - size, y - size, size * 2, size * 2);
        } else if (type === "continuation") {
            this.graphics.drawCircle(x, y, size);
        } else if (type === "impulse") {
            this.graphics.drawPolygon(buildStarPoints(x, y, size, Math.max(3, size * 0.55), 4, direction > 0 ? 0 : Math.PI / 4));
        } else if (direction > 0) {
            this.graphics.drawPolygon([
                x,
                y - size,
                x - size,
                y + size,
                x + size,
                y + size,
            ]);
        } else {
            this.graphics.drawPolygon([
                x,
                y + size,
                x - size,
                y - size,
                x + size,
                y - size,
            ]);
        }
        this.graphics.endFill();

        return size;
    }

    draw() {
        if (!this.graphics || !this.chart?.slicedData?.length) return;

        try {
            this.graphics.clear();
        } catch (error) {
            return;
        }
        this.clearLabels();

        const { slicedData, xScale, priceScale, mainChartContainerHeight } = this.chart;
        const stackOffsets = new Map();
        const markers = [];

        this.signals.forEach((signal) => {
            const index = this.findSignalIndex(signal, slicedData);
            if (index < 0) return;

            const x = xScale(index);
            const y = priceScale(signal.lastPrice);
            if (!Number.isFinite(x) || !Number.isFinite(y)) return;

            const color = signal.direction > 0 ? this.buyColor : this.sellColor;
            const stackKey = `${index}:${signal.direction}`;
            const stackCount = stackOffsets.get(stackKey) || 0;
            stackOffsets.set(stackKey, stackCount + 1);

            const { markerSize, lineAlpha } = getMarkerVisuals(signal.consecutive, signal.windowScore);
            const offset = 24 + stackCount * 18;
            const markerY =
                signal.direction > 0
                    ? Math.max(markerSize + 2, y - offset)
                    : Math.min(mainChartContainerHeight - markerSize - 2, y + offset);

            this.graphics.lineStyle(1.25, color, lineAlpha);
            this.graphics.moveTo(x, y);
            this.graphics.lineTo(x, markerY);

            this.drawMarker({
                x,
                y: markerY,
                direction: signal.direction,
                color,
                consecutive: signal.consecutive,
                windowScore: signal.windowScore,
                signalType: getSignalType(signal),
            });

            markers.push({
                x,
                y: markerY,
                color,
                markerSize,
                signal,
            });
        });

        if (!this.chart.crosshair || !Number.isFinite(this.chart.mouseX) || !Number.isFinite(this.chart.mouseY)) {
            return;
        }

        const hoverMarker = markers.find((marker) => {
            const hitbox = Math.max(12, marker.markerSize + this.hoverHitboxPadding);
            return Math.abs(marker.x - this.chart.mouseX) <= hitbox && Math.abs(marker.y - this.chart.mouseY) <= hitbox;
        });

        if (hoverMarker) {
            this.drawTooltip(hoverMarker);
        }
    }

    cleanup() {
        this.chart?.removeFromLayer?.(6, this.graphics);
        this.chart?.removeFromLayer?.(6, this.labelContainer);
        this.clearLabels();
        try {
            this.graphics?.clear?.();
        } catch (error) {
            console.warn("[DrawDepthSignals] Failed to clear graphics during cleanup", error);
        }
        try {
            this.labelContainer?.removeChildren?.();
        } catch (error) {
            console.warn("[DrawDepthSignals] Failed to clear labels during cleanup", error);
        }
    }
}
