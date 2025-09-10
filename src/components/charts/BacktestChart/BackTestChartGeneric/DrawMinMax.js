import { Graphics } from "pixi.js";

export default class DrawMinMax {
    constructor(weeklyTrendLines, pixiDataRef, layer = 0) {
        this.weeklyTrendLines = weeklyTrendLines;
        this.pixiDataRef = pixiDataRef;
        this.layer = layer;

        // Create graphics objects
        this.minMaxGfx = new Graphics();
        this.minMaxRegressionGfx = new Graphics();
        this.minMaxFibsGfx = new Graphics();

        // Add graphics to the chart layers
        this.pixiDataRef.current.addToLayer(this.layer, this.minMaxGfx);
        this.pixiDataRef.current.addToLayer(this.layer, this.minMaxRegressionGfx);
        this.pixiDataRef.current.addToLayer(this.layer, this.minMaxFibsGfx);
    }

    cleanup() {
        if (this.minMaxGfx) {
            this.minMaxGfx.clear();
            this.pixiDataRef.current.removeFromLayer(this.layer, this.minMaxGfx);
            this.minMaxGfx.destroy();
            this.minMaxGfx = null;
        }
        if (this.minMaxRegressionGfx) {
            this.minMaxRegressionGfx.clear();
            this.pixiDataRef.current.removeFromLayer(this.layer, this.minMaxRegressionGfx);
            this.minMaxRegressionGfx.destroy();
            this.minMaxRegressionGfx = null;
        }
        if (this.minMaxFibsGfx) {
            this.minMaxFibsGfx.clear();
            this.pixiDataRef.current.removeFromLayer(this.layer, this.minMaxFibsGfx);
            this.minMaxFibsGfx.destroy();
            this.minMaxFibsGfx = null;
        }
    }

    drawAll() {
        if (!this.weeklyTrendLines || !this.weeklyTrendLines.length || !this.pixiDataRef.current) {
            return;
        }
        debugger;

        this.xScale = this.pixiDataRef.current.xScale;
        this.priceScale = this.pixiDataRef.current.priceScale;

        this.minMaxGfx.clear();
        this.minMaxRegressionGfx.clear();
        this.minMaxFibsGfx.clear();

        const {
            fibsList,
            highNodes,
            lowNodes,
            swings,
            zigZagFibs,
            regressionZigZag: { regressionHighLines, regressionLowLines },
        } = this.weeklyTrendLines[0].minMax;

        // High/Low Nodes
        this.minMaxGfx.beginFill(0xff0000);
        highNodes?.forEach((node) => {
            const { highLow, index } = node;
            const x = index;
            const y = node[highLow];
            this.drawMarker(this.minMaxGfx, { x, y, r: 5 });
        });

        this.minMaxGfx.beginFill(0x00ff00);
        lowNodes?.forEach((node) => {
            const { highLow, index } = node;
            const x = index;
            const y = node[highLow];
            this.drawMarker(this.minMaxGfx, { x, y, r: 5 });
        });

        this.minMaxGfx.beginFill(0x0000ff);
        swings?.forEach((node) => {
            const {
                name,
                index,
                val: { y },
            } = node;
            const x = index;
            this.minMaxGfx.beginFill(name === "high" ? 0xff5000 : name === "low" ? 0x00ff00 : 0x0000ff);
            this.drawMarker(this.minMaxGfx, { x, y, r: 5 });
        });

        regressionHighLines?.forEach((line) => {
            this.minMaxRegressionGfx.lineStyle(2, 0xff0000, 0.6);
            this.drawLine(this.minMaxRegressionGfx, line);
        });

        regressionLowLines?.forEach((line) => {
            this.minMaxRegressionGfx.lineStyle(2, 0x00ff00, 0.6);
            this.drawLine(this.minMaxRegressionGfx, line);
        });

        debugger;
        // FIB REGRESSION ZIGZAGSS
        zigZagFibs?.forEach((line) => {
            const { color, opacity = 1 } = line;
            // const hexColor = parseInt(String(color).replace("#", "0x"));
            this.minMaxFibsGfx.lineStyle(2, color, opacity);
            this.drawLine(this.minMaxFibsGfx, line);
        });

        fibsList?.forEach((fibLine) => {
            const { firstPoint, secondPoint } = fibLine;
            const color = firstPoint.name === "low" ? 0xadff2f : 0xcd5c5c; // lawngreen / indianred
            this.minMaxFibsGfx.lineStyle(2, color, 0.4);
            const x1 = firstPoint.index;
            const x2 = secondPoint.index;
            const y1 = firstPoint.val.y;
            const y2 = secondPoint.val.y;
            this.drawLine(this.minMaxFibsGfx, { x1, x2, y1, y2 });
        });
    }

    drawMarker(gfx, data) {
        const { sliceStart, slicedData } = this.pixiDataRef.current;
        if (sliceStart === undefined || !slicedData) return;

        const relativeIndex = data.x - sliceStart;

        if (relativeIndex >= 0 && relativeIndex < slicedData.length) {
            gfx.drawCircle(this.xScale(relativeIndex), this.priceScale(data.y), data.r);
        }
    }

    drawLine(gfx, data) {
        const { sliceStart } = this.pixiDataRef.current;
        if (sliceStart === undefined) return;

        const relativeX1 = data.x1 - sliceStart;
        const relativeX2 = data.x2 - sliceStart;

        gfx.moveTo(this.xScale(relativeX1), this.priceScale(data.y1));
        gfx.lineTo(this.xScale(relativeX2), this.priceScale(data.y2));
    }
}
