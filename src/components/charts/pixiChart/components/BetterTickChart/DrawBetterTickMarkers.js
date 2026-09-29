import { Container, Graphics, Text, TextStyle } from "pixi.js";

const LABEL_STYLE = new TextStyle({
    fontFamily: "Arial",
    fontSize: 9,
    fontWeight: "bold",
    fill: 0x050505,
    align: "center",
});

const TOOLTIP_STYLE = new TextStyle({
    fontFamily: "Arial",
    fontSize: 11,
    fill: 0xffffff,
    wordWrap: true,
    wordWrapWidth: 240,
    lineHeight: 15,
});

const MARKER_PRIORITY = {
    buyExhaustion: 4,
    sellExhaustion: 4,
    pro: 2,
    am: 1,
};

const MARKER_LABEL = {
    buyExhaustion: "Buy exhaustion",
    sellExhaustion: "Sell exhaustion",
    pro: "PRO",
    am: "AM",
};

export default class DrawBetterTickMarkers {
    constructor(chart, options = {}) {
        this.chart = chart;
        this.layer = options.layer ?? 5;
        this.disposed = false;
        this.graphics = new Graphics();
        this.labelContainer = new Container();
        this.hoverHitboxPadding = options.hoverHitboxPadding ?? 8;
        this.clusterGapPx = options.clusterGapPx ?? 18;

        this.chart.addToLayer(this.layer, this.graphics);
        this.chart.addToLayer(this.layer, this.labelContainer);
    }

    safeClearGraphics() {
        if (!this.graphics || this.graphics.destroyed || this.disposed) return false;
        try {
            this.graphics.clear();
            return true;
        } catch (error) {
            return false;
        }
    }

    clearLabels() {
        if (!this.labelContainer || this.labelContainer.destroyed || this.disposed) return;
        this.labelContainer?.removeChildren?.().forEach((child) => child.destroy?.());
    }

    drawMarker(x, y, marker, stackIndex) {
        if (!this.graphics || this.graphics.destroyed || !this.labelContainer || this.labelContainer.destroyed || this.disposed) return;

        const size = marker.size || 6;
        const color = marker.color || 0xffffff;
        const direction = marker.direction >= 0 ? 1 : -1;
        const markerY = y + direction * (14 + stackIndex * 14);

        this.graphics.lineStyle(1, color, 0.55);
        this.graphics.moveTo(x, y);
        this.graphics.lineTo(x, markerY);
        this.graphics.lineStyle(1, 0x050505, 0.9);
        this.graphics.beginFill(color, 0.95);

        if (marker.shape === "diamond") {
            this.graphics.drawPolygon([x, markerY - size, x + size, markerY, x, markerY + size, x - size, markerY]);
        } else if (marker.shape === "square") {
            this.graphics.drawRoundedRect(x - size, markerY - size, size * 2, size * 2, 2);
        } else if (direction > 0) {
            this.graphics.drawPolygon([x, markerY + size, x - size, markerY - size, x + size, markerY - size]);
        } else {
            this.graphics.drawPolygon([x, markerY - size, x - size, markerY + size, x + size, markerY + size]);
        }

        this.graphics.endFill();

        const label = marker.compactLabel ?? marker.label;
        if (!label) return;

        const text = new Text(label, LABEL_STYLE);
        text.anchor.set(0.5);
        text.x = x;
        text.y = markerY - text.height / 2;
        this.labelContainer.addChild(text);
    }

    markerPriority(marker) {
        return MARKER_PRIORITY[marker?.type] || 0;
    }

    createCluster(markers) {
        const primary = markers.reduce((best, marker) => {
            if (!best) return marker;
            return this.markerPriority(marker) > this.markerPriority(best) ? marker : best;
        }, null);

        const x = markers.reduce((sum, marker) => sum + marker.x, 0) / markers.length;
        const y = markers.reduce((sum, marker) => sum + marker.y, 0) / markers.length;
        const proCount = markers.filter((marker) => marker.type === "pro").length;
        const amCount = markers.filter((marker) => marker.type === "am").length;
        const buyExhaustionCount = markers.filter((marker) => marker.type === "buyExhaustion").length;
        const sellExhaustionCount = markers.filter((marker) => marker.type === "sellExhaustion").length;
        const label =
            buyExhaustionCount || sellExhaustionCount
                ? primary.label
                : markers.length > 1
                ? String(markers.length)
                : primary.compactLabel ?? "";

        return {
            ...primary,
            x,
            y,
            size: Math.min(9, (primary.size || 6) + Math.max(0, markers.length - 1) * 0.6),
            compactLabel: label,
            markerCount: markers.length,
            tooltipLines: [
                markers.length > 1 ? `${markers.length} nearby ${MARKER_LABEL[primary.type] || primary.label} markers` : primary.label,
                proCount ? `PRO: ${proCount}` : null,
                amCount ? `AM: ${amCount}` : null,
                buyExhaustionCount ? `Buy exhaustion: ${buyExhaustionCount}` : null,
                sellExhaustionCount ? `Sell exhaustion: ${sellExhaustionCount}` : null,
                ...markers.slice(0, 4).flatMap((marker) => marker.tooltipLines || [marker.label]).slice(0, 12),
            ].filter(Boolean),
        };
    }

    clusterMarkers(markers) {
        const clusters = [];
        const sortedMarkers = [...markers].sort((a, b) => a.x - b.x);

        sortedMarkers.forEach((marker) => {
            const lastCluster = clusters[clusters.length - 1];
            if (
                lastCluster &&
                lastCluster.type === marker.type &&
                lastCluster.direction === marker.direction &&
                Math.abs(lastCluster.markers[lastCluster.markers.length - 1].x - marker.x) <= this.clusterGapPx
            ) {
                lastCluster.markers.push(marker);
                return;
            }

            clusters.push({
                type: marker.type,
                direction: marker.direction,
                markers: [marker],
            });
        });

        return clusters.map((cluster) => this.createCluster(cluster.markers));
    }

    drawTooltip(marker) {
        if (!marker?.tooltipLines?.length || !this.graphics || !this.labelContainer) return;

        const tooltipText = new Text(marker.tooltipLines.join("\n"), TOOLTIP_STYLE);
        const padding = 8;
        const chartWidth = this.chart.width - (this.chart.margin.left + this.chart.margin.right);
        const tooltipWidth = tooltipText.width + padding * 2;
        const tooltipHeight = tooltipText.height + padding * 2;
        const tooltipX = Math.min(marker.x + 12, Math.max(0, chartWidth - tooltipWidth - 8));
        const tooltipY = Math.max(8, Math.min(marker.renderY - tooltipHeight - 10, this.chart.mainChartContainerHeight - tooltipHeight - 8));

        this.graphics.beginFill(0x0b1020, 0.94);
        this.graphics.lineStyle(1, marker.color || 0xffffff, 0.95);
        this.graphics.drawRoundedRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 6);
        this.graphics.endFill();

        tooltipText.x = tooltipX + padding;
        tooltipText.y = tooltipY + padding;
        this.labelContainer.addChild(tooltipText);
    }

    draw() {
        if (this.disposed || !this.graphics || this.graphics.destroyed || !this.chart?.slicedData?.length) return;

        if (!this.safeClearGraphics()) return;
        this.clearLabels();

        const { slicedData, xScale, priceScale, mainChartContainerHeight } = this.chart;
        const stackCounts = new Map();
        const drawableMarkers = [];

        slicedData.forEach((bar, index) => {
            if (!Array.isArray(bar.betterTickMarkers) || !bar.betterTickMarkers.length) return;

            const x = xScale(index);
            if (!Number.isFinite(x)) return;

            bar.betterTickMarkers.forEach((marker) => {
                const price = Number(marker.price);
                if (!Number.isFinite(price)) return;

                const y = priceScale(price);
                if (!Number.isFinite(y)) return;

                const direction = marker.direction >= 0 ? 1 : -1;
                const clampedY = Math.max(8, Math.min(mainChartContainerHeight - 8, y));
                drawableMarkers.push({ ...marker, x, y: clampedY, direction });
            });
        });

        const renderedMarkers = [];
        this.clusterMarkers(drawableMarkers).forEach((marker) => {
            const stackKey = `${Math.round(marker.x / this.clusterGapPx)}:${marker.direction}`;
            const stackIndex = stackCounts.get(stackKey) || 0;
            stackCounts.set(stackKey, stackIndex + 1);

            const renderY = marker.y + marker.direction * (14 + stackIndex * 14);
            this.drawMarker(marker.x, marker.y, marker, stackIndex);
            renderedMarkers.push({
                ...marker,
                renderY,
            });
        });

        if (!this.chart.crosshair || !Number.isFinite(this.chart.mouseX) || !Number.isFinite(this.chart.mouseY)) {
            return;
        }

        const hoveredMarker = renderedMarkers.find((marker) => {
            const hitbox = Math.max(12, (marker.size || 6) + this.hoverHitboxPadding);
            return Math.abs(marker.x - this.chart.mouseX) <= hitbox && Math.abs(marker.renderY - this.chart.mouseY) <= hitbox;
        });

        if (hoveredMarker) {
            this.drawTooltip(hoveredMarker);
        }
    }

    cleanup() {
        this.disposed = true;
        this.chart?.removeFromLayer?.(this.layer, this.graphics);
        this.chart?.removeFromLayer?.(this.layer, this.labelContainer);
        if (this.labelContainer && !this.labelContainer.destroyed) {
            this.labelContainer.removeChildren?.().forEach((child) => child.destroy?.());
        }
        if (this.graphics && !this.graphics.destroyed) {
            try {
                this.graphics.clear();
            } catch (error) {
                // Pixi may have already torn down the Graphics internals during chart remount.
            }
        }
        this.chart = null;
        this.graphics = null;
        this.labelContainer = null;
    }
}
