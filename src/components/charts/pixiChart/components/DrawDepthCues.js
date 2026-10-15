import { Container, Graphics, Text, TextStyle } from "pixi.js";

// Real-time depth cues (server DepthFlowSonifier, 250ms) drawn at the price they fired.
// Bullish cues (bid support, ask pulled) sit below price, bearish (ask pressure, bid pulled) above.
// Support = filled dot, pull = ring. Size grows with level (L1-L3).

const DEFAULT_MAX_CUES = 300;

const CUE_STYLE = {
	depth_bid_support: { label: "Bid support", direction: 1, color: 0x00c853, filled: true },
	depth_pull_ask: { label: "Ask pulled", direction: 1, color: 0x69f0ae, filled: false },
	depth_ask_pressure: { label: "Ask pressure", direction: -1, color: 0xd50000, filled: true },
	depth_pull_bid: { label: "Bid pulled", direction: -1, color: 0xff8a80, filled: false },
};

const TOOLTIP_STYLE = new TextStyle({
	fontFamily: "Arial",
	fontSize: 11,
	fill: 0xffffff,
	lineHeight: 16,
});

function normalizeCue(cue = {}) {
	const style = CUE_STYLE[cue.type];
	const price = Number(cue.price);
	const timestamp = Number(cue.timestamp);
	const strength = Math.max(1, Math.min(3, Number(cue.strength) || 1));
	if (!style || !Number.isFinite(price) || !Number.isFinite(timestamp)) return null;
	return { ...cue, price, timestamp, strength, style };
}

export default class DrawDepthCues {
	constructor(chart, options = {}) {
		this.chart = chart;
		this.maxCues = options.maxCues ?? DEFAULT_MAX_CUES;
		this.minStrength = options.minStrength ?? 1;
		this.cues = [];
		this.graphics = new Graphics();
		this.labelContainer = new Container();

		this.chart.addToLayer(6, this.graphics);
		this.chart.addToLayer(6, this.labelContainer);
	}

	setMinStrength(minStrength) {
		this.minStrength = minStrength;
		this.draw();
	}

	setCues(cues = []) {
		this.cues = cues.map(normalizeCue).filter(Boolean).slice(-this.maxCues);
		this.draw();
	}

	pushCue(cue) {
		const normalized = normalizeCue(cue);
		if (!normalized) return;
		this.cues.push(normalized);
		if (this.cues.length > this.maxCues) this.cues.splice(0, this.cues.length - this.maxCues);
		this.draw();
	}

	clearCues() {
		this.cues = [];
		this.draw();
	}

	clearLabels() {
		this.labelContainer?.removeChildren().forEach((child) => child.destroy?.());
	}

	// Last bar starting at or before the cue (data is time-sorted)
	findBarIndex(timestamp, data) {
		let lo = 0;
		let hi = data.length - 1;
		let found = -1;
		while (lo <= hi) {
			const mid = (lo + hi) >> 1;
			const barTimestamp = data[mid]?.timestamp ?? data[mid]?.datetime;
			if (barTimestamp <= timestamp) {
				found = mid;
				lo = mid + 1;
			} else {
				hi = mid - 1;
			}
		}
		return found;
	}

	drawTooltip(marker) {
		const { cue } = marker;
		const ratio = Number.isFinite(Number(cue.ratio)) ? ` (${Number(cue.ratio).toFixed(1)}x normal)` : "";
		const text = new Text(
			`${cue.style.label} L${cue.strength}${ratio}\n@ ${cue.price}\n${new Date(cue.timestamp).toLocaleTimeString()}`,
			TOOLTIP_STYLE,
		);
		const padding = 6;
		const width = text.width + padding * 2;
		const height = text.height + padding * 2;
		const chartWidth = this.chart.width - (this.chart.margin.left + this.chart.margin.right);
		const x = Math.min(marker.x + 12, Math.max(0, chartWidth - width - 8));
		const y = Math.max(8, Math.min(marker.y - height - 8, this.chart.mainChartContainerHeight - height - 8));

		this.graphics.lineStyle(1, cue.style.color, 0.95);
		this.graphics.beginFill(0x0b1020, 0.92);
		this.graphics.drawRoundedRect(x, y, width, height, 5);
		this.graphics.endFill();
		text.x = x + padding;
		text.y = y + padding;
		this.labelContainer.addChild(text);
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
		const firstTimestamp = slicedData[0]?.timestamp ?? slicedData[0]?.datetime;
		const stackOffsets = new Map();
		const markers = [];

		for (const cue of this.cues) {
			if (cue.strength < this.minStrength) continue;
			if (Number.isFinite(firstTimestamp) && cue.timestamp < firstTimestamp) continue;
			const index = this.findBarIndex(cue.timestamp, slicedData);
			if (index < 0) continue;

			const x = xScale(index);
			const y = priceScale(cue.price);
			if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

			const { direction, color, filled } = cue.style;
			const radius = 2 + cue.strength * 1.5;
			const stackKey = `${index}:${direction}`;
			const stackCount = stackOffsets.get(stackKey) || 0;
			stackOffsets.set(stackKey, stackCount + 1);
			const offset = 8 + stackCount * (radius * 2 + 2);
			const markerY =
				direction > 0 ? Math.min(mainChartContainerHeight - radius, y + offset) : Math.max(radius, y - offset);

			const alpha = 0.45 + cue.strength * 0.18;
			if (filled) {
				this.graphics.lineStyle(0);
				this.graphics.beginFill(color, alpha);
				this.graphics.drawCircle(x, markerY, radius);
				this.graphics.endFill();
			} else {
				this.graphics.lineStyle(1.5, color, alpha);
				this.graphics.drawCircle(x, markerY, radius);
			}
			markers.push({ x, y: markerY, radius, cue });
		}

		if (!this.chart.crosshair || !Number.isFinite(this.chart.mouseX) || !Number.isFinite(this.chart.mouseY)) return;
		const hover = markers.find(
			(marker) => Math.abs(marker.x - this.chart.mouseX) <= marker.radius + 4 && Math.abs(marker.y - this.chart.mouseY) <= marker.radius + 4,
		);
		if (hover) this.drawTooltip(hover);
	}

	cleanup() {
		this.chart?.removeFromLayer?.(6, this.graphics);
		this.chart?.removeFromLayer?.(6, this.labelContainer);
		this.clearLabels();
		try {
			this.graphics?.clear?.();
		} catch (error) {
			console.warn("[DrawDepthCues] Failed to clear graphics during cleanup", error);
		}
	}
}
