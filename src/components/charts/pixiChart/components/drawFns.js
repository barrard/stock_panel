import { Graphics, Container, Rectangle, Text, TextMetrics, TextStyle } from "pixi.js";

export function drawLine(opts = {}) {
    const { lineColor = 0x3b82f6, lineWidth = 2, yField = "last", xScale, yScale, data, chartData, gfx } = opts;
    if (!data.length) {
        return;
    }
    // this.candleWidth = (this.width - (this.margin.left + this.margin.right)) / this.slicedData.length;

    if (!gfx) {
        return;
    }

    try {
        gfx.clear();
    } catch (err) {
        return err;
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
    // this.candleStickWickGfx.lineStyle(
    //     candleWidth * 0.1,
    //     0xffffff,
    //     0.9
    // );
    const candleMargin = candleWidth * 0.1;
    const doubleMargin = candleMargin * 2;
    const strokeWidth = candleWidth * 0.1;
    const halfStrokeWidth = strokeWidth / 2;
    indicator.gfx.lineStyle(strokeWidth, 0x111111, 0.9);

    let bottom = indicator.scale(0);

    indicator.data.forEach((vol, i) => {
        const x = chart.xScale(i);
        const start = indicator.scale(vol);
        const height = bottom - start;

        // let open = indicator.scale(vol);

        // const high = indicator.scale(candle.high);
        // const low = indicator.scale(candle.low);

        // const isUp = open >= close;
        indicator.gfx.beginFill(0x00ffff);

        // const height = Math.abs(open - close);
        // const start = isUp ? close : open;
        // const end = isUp ? open : close;
        indicator.gfx.drawRect(x + candleMargin - halfWidth, start + halfStrokeWidth, candleWidth - doubleMargin, height - strokeWidth);

        // this.candleStickWickGfx.moveTo(x, high);
        // this.candleStickWickGfx.lineTo(x, low);
    });
}
