import { Graphics } from "pixi.js";

export default class DrawDailyTrendLines {
    constructor(pixiDataRef, dailyTrendlinesData, layer = 0) {
        debugger;
        this.pixiDataRef = pixiDataRef;
        this.dailyTrendlinesData = dailyTrendlinesData;
        this.layer = layer;
        this.gfx = new Graphics();
        this.pixiDataRef.current.addToLayer(this.layer, this.gfx);
        this.draw = this.draw.bind(this);
    }

    cleanup() {
        if (this.gfx) {
            this.gfx.clear();
            this.pixiDataRef.current.removeFromLayer(this.layer, this.gfx);
            this.gfx.destroy();
            this.gfx = null;
        }
    }

    draw() {
        if (!this.dailyTrendlinesData || !this.dailyTrendlinesData.length || !this.pixiDataRef.current) {
            return;
        }

        this.gfx.clear();

        this.dailyTrendlinesData.forEach((trendline) => {
            this.drawTrendlineSet(trendline.highLine, 0xff0000); // Red for high
            this.drawTrendlineSet(trendline.lowLine, 0x00ff00); // Green for low
            this.drawTrendlineSet(trendline.closeLine, 0x0000ff); // Blue for close
        });
    }

    drawTrendlineSet(lineSet, color) {
        if (!lineSet) return;

        // Draw bestFit line (solid)
        if (lineSet.bestFit) {
            this.gfx.lineStyle(2, color, 1);
            this.drawLine(this.gfx, lineSet.bestFit);
        }

        // Draw lower line using slope and intercept
        // if (lineSet.lower && lineSet.lower.optimizedSlope !== undefined && lineSet.lower.optimizedIntercept !== undefined) {
        //     this.gfx.lineStyle(1, color, 0.7);
        //     this.drawSlopeLine(this.gfx, lineSet.lower);
        // }
    }

    drawLine(gfx, data) {
        debugger;
        const { slicedData, xScale, priceScale } = this.pixiDataRef.current;
        if (!slicedData || slicedData.length === 0) return;

        const findClosestIndex = (targetDatetime) => {
            // If the targetDatetime is outside the range of slicedData, return -1 or handle as appropriate
            if (targetDatetime < slicedData[0].datetime || targetDatetime > slicedData[slicedData.length - 1].datetime) {
                // This might mean the line starts/ends outside the visible range,
                // or the data is just bad. For now, return undefined.
                return undefined;
            }

            // Binary search or linear search for the closest index
            // For simplicity, let's use a linear search for now.
            // If performance becomes an issue, this can be optimized.
            for (let i = 0; i < slicedData.length; i++) {
                if (slicedData[i].datetime === targetDatetime) {
                    return i;
                }
                // If targetDatetime is between two bars, use the earlier bar's index
                if (i < slicedData.length - 1 && slicedData[i].datetime < targetDatetime && slicedData[i + 1].datetime > targetDatetime) {
                    return i;
                }
            }
            return undefined; // Should not happen if targetDatetime is within range
        };

        const index1 = findClosestIndex(data.t1);
        const index2 = findClosestIndex(data.t2);

        if (index1 !== undefined && index2 !== undefined) {
            gfx.moveTo(xScale(index1), priceScale(data.y1));
            gfx.lineTo(xScale(index2), priceScale(data.y2));
        }
    }

    drawSlopeLine(gfx, data) {
        const { sliceStart, sliceEnd, slicedData, xScale, priceScale } = this.pixiDataRef.current;
        if (sliceStart === undefined || !slicedData || slicedData.length === 0) return;

        const m = data.optimizedSlope;
        const b = data.optimizedIntercept;

        const x1_abs = sliceStart;
        const x2_abs = sliceEnd - 1;

        const y1 = m * x1_abs + b;
        const y2 = m * x2_abs + b;

        const x1_rel = 0;
        const x2_rel = slicedData.length - 1;

        gfx.moveTo(xScale(x1_rel), priceScale(y1));
        gfx.lineTo(xScale(x2_rel), priceScale(y2));
    }
}
