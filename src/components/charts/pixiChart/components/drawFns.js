import { Graphics, Container, Rectangle, Text, TextMetrics, TextStyle } from "pixi.js";

// Calculate moving average for volume
export function calculateMovingAverage(data, period = 20, field = "volume") {
    const result = [];
    console.time("[calculateMovingAverage]");
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            result.push(null); // Not enough data points
        } else {
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += data[i - j][field] || 0;
            }
            result.push(sum / period);
        }
    }
    console.timeEnd("[calculateMovingAverage]");
    return result;
}

export function drawVolumeLines(opts = {}) {
    const {
        volumeColor = 0x00ffff,
        avgVolumeColor = 0xff6600,
        lineWidth = 1.5,
        avgPeriod = 20,
        xScale,
        yScale,
        data,
        chartData,
        volumeGfx,
        avgVolumeGfx,
    } = opts;

    if (!data.length || !volumeGfx || !avgVolumeGfx) {
        return;
    }

    try {
        volumeGfx.clear();
        avgVolumeGfx.clear();
    } catch (err) {
        return err;
    }

    // Calculate average volume
    const avgVolumes = calculateMovingAverage(data, avgPeriod, "volume");

    // Draw actual volume line
    volumeGfx.lineStyle(lineWidth, volumeColor, 0.6);
    let firstPoint = true;
    data.forEach((candle, i) => {
        const x = xScale(i);
        const volume = candle.volume || 0;
        const y = yScale(volume);

        if (firstPoint) {
            volumeGfx.moveTo(x, y);
            firstPoint = false;
        } else {
            volumeGfx.lineTo(x, y);
        }
    });

    // Draw average volume line
    avgVolumeGfx.lineStyle(lineWidth, avgVolumeColor, 0.8);
    firstPoint = true;
    avgVolumes.forEach((avgVol, i) => {
        if (avgVol === null) return;

        const x = xScale(i);
        const y = yScale(avgVol);

        if (firstPoint) {
            avgVolumeGfx.moveTo(x, y);
            firstPoint = false;
        } else {
            avgVolumeGfx.lineTo(x, y);
        }
    });
}

export function drawLine(opts = {}) {
    const { lineColor = 0x3b82f6, lineWidth = 2, yField = "last", xScale, yScale, data, chartData, gfx, skipClear = false } = opts;
    if (!data.length) {
        return;
    }
    // this.candleWidth = (this.width - (this.margin.left + this.margin.right)) / this.slicedData.length;

    if (!gfx) {
        return;
    }

    // Only clear if not drawing multiple lines on the same graphics context
    if (!skipClear) {
        try {
            gfx.clear();
        } catch (err) {
            return err;
        }
    }

    // Nice blue color for the main price line
    // const lineColor = color; // Modern blue
    // const lineWidth = THICK;

    gfx.lineStyle(lineWidth, lineColor, 0.9);

    let firstPoint = true;

    data.forEach((candle, i) => {
        const x = xScale(i);
        const y = yScale(candle[yField]) || 0;

        if (firstPoint) {
            gfx.moveTo(x, y);
            firstPoint = false;
        } else {
            gfx.lineTo(x, y);
        }
    });
}
export function drawVolume(indicator) {
    const { chart } = indicator;

    if (!chart.slicedData.length) {
        return;
    }
    if (!indicator.gfx) {
        return;
    }
    try {
        if (!indicator.gfx?._geometry) {
            return;
        }
        indicator.gfx.clear();
    } catch (err) {
        console.log("CLEAR() Error?");
        console.log(err);
        return err;
    }

    const candleWidth = (chart.width - (chart.margin.left + chart.margin.right)) / indicator.data.length;
    const halfWidth = candleWidth / 2;
    const candleMargin = candleWidth * 0.1;
    const doubleMargin = candleMargin * 2;
    const strokeWidth = candleWidth * 0.1;
    const halfStrokeWidth = strokeWidth / 2;
    indicator.gfx.lineStyle(strokeWidth, 0x111111, 0.9);

    let bottom = indicator.scale(0);

    // Draw volume bars
    indicator.data.forEach((vol, i) => {
        const x = chart.xScale(i);
        const start = indicator.scale(vol);
        const height = bottom - start;

        indicator.gfx.beginFill(0x00ffff);
        indicator.gfx.drawRect(x + candleMargin - halfWidth, start + halfStrokeWidth, candleWidth - doubleMargin, height - strokeWidth);
    });

    // End fill before drawing the line
    indicator.gfx.endFill();

    // Draw 20-period moving average line - read pre-calculated values from data
    indicator.gfx.lineStyle(2, 0xff6600, 0.9); // Orange line
    let firstPoint = true;

    chart.slicedData.forEach((bar, i) => {
        const avgVol = bar.volumeAvg20;
        if (avgVol === null || avgVol === undefined) return;

        const x = chart.xScale(i);
        const y = indicator.scale(avgVol);

        if (firstPoint) {
            indicator.gfx.moveTo(x, y);
            firstPoint = false;
        } else {
            indicator.gfx.lineTo(x, y);
        }
    });

    // Store the current (last) 20-period average for percentage calculations
    const lastBar = chart.slicedData[chart.slicedData.length - 1];
    indicator.currentAverage = lastBar?.volumeAvg20 || 0;
}

export function drawOHLC(opts = {}) {
    const { chart, gfx, wickGfx } = opts;

    if (!chart.slicedData.length) {
        return;
    }
    if (!gfx || !wickGfx) {
        return;
    }

    try {
        gfx.clear();
        wickGfx.clear();
    } catch (err) {
        return err;
    }

    chart.candleWidth = (chart.width - (chart.margin.left + chart.margin.right)) / chart.slicedData.length;
    const halfWidth = chart.candleWidth / 2;
    const tickWidth = Math.min(halfWidth * 0.8, 10); // Width of the open/close ticks
    const lineWidth = Math.max(1, chart.candleWidth * 0.1);

    // Line style for the main vertical line (high to low)
    wickGfx.lineStyle(lineWidth, 0xffffff, 0.9);

    chart.slicedData.forEach((candle, i) => {
        const x = chart.xScale(i);

        const open = chart.priceScale(candle.open);
        const close = chart.priceScale(candle.close);
        const high = chart.priceScale(candle.high);
        const low = chart.priceScale(candle.low);

        const isUp = candle.close >= candle.open;
        const color = candle.isFake ? 0x555555 : isUp ? 0x00ff00 : 0xff0000;

        // Draw vertical line from low to high
        wickGfx.moveTo(x, high);
        wickGfx.lineStyle(lineWidth, color, 0.9);
        wickGfx.lineTo(x, low);

        // Draw horizontal tick for open (on the left)
        gfx.lineStyle(lineWidth, color, 0.9);
        gfx.moveTo(x - tickWidth, open);
        gfx.lineTo(x, open);

        // Draw horizontal tick for close (on the right)
        gfx.moveTo(x, close);
        gfx.lineTo(x + tickWidth, close);
    });
}
