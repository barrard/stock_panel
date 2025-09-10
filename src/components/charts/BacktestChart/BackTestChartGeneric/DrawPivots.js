import { Graphics } from "pixi.js";

export default class DrawPivots {
    constructor(pivotData, ohlcData, pixiDataRef, layer = 0) {
        this.pivotData = pivotData;
        this.ohlcData = ohlcData;
        this.pixiDataRef = pixiDataRef;
        this.layer = layer;
        this.hasInit = false;
        this.pivotsGfx = new Graphics();
        this.init();
    }

    init() {
        if (this.hasInit) return;
        this.hasInit = true;
        this.pixiDataRef.current.addToLayer(this.layer, this.pivotsGfx);
        this.xScale = this.pixiDataRef.current.xScale;
        this.priceScale = this.pixiDataRef.current.priceScale;
    }

    cleanup() {
        if (this.pivotsGfx) {
            this.pixiDataRef.current.removeFromLayer(this.layer, this.pivotsGfx);
            this.pivotsGfx.destroy({ children: true });
            this.pivotsGfx = null;
        }
    }

    drawLine(gfx, data) {
        gfx.moveTo(this.xScale(data.x1), this.priceScale(data.y1));
        gfx.lineTo(this.xScale(data.x2), this.priceScale(data.y2));
    }

    drawAllPivots() {
        if (!this.pivotsGfx || !this.pivotData || !this.ohlcData?.length) {
            return;
        }
        this.pivotsGfx.clear();

        Object.keys(this.pivotData).forEach((day) => {
            const { closeTime, pivot = {} } = this.pivotData[day];
            if (!pivot || !closeTime) return;
            const ohlcData = this.pixiDataRef.current.slicedData || this.ohlcData;
            let index = ohlcData.findIndex((bar) => bar.datetime > closeTime);
            if (index === -1) {
                return;
            }
            const lineEndTime = new Date(closeTime + 1000 * 60 * 60 * 24);
            let endIndex = ohlcData.findIndex((bar) => bar.datetime > lineEndTime);
            if (endIndex === -1) {
                endIndex = ohlcData.length;
            }

            const x1 = index;
            const x2 = endIndex;

            // Pivot
            if (pivot.p) {
                this.pivotsGfx.lineStyle(2, 0x0000ff, 1);
                this.drawLine(this.pivotsGfx, { x1, x2, y1: pivot.p, y2: pivot.p });
            }

            // Support
            if (pivot.s1) {
                this.pivotsGfx.lineStyle(2, 0x00ff00, 1);
                this.drawLine(this.pivotsGfx, { x1, x2, y1: pivot.s1, y2: pivot.s1 });
            }
            if (pivot.s2) {
                this.pivotsGfx.lineStyle(2, 0x00ff00, 0.7);
                this.drawLine(this.pivotsGfx, { x1, x2, y1: pivot.s2, y2: pivot.s2 });
            }

            // Resistance
            if (pivot.r1) {
                this.pivotsGfx.lineStyle(2, 0xff0000, 1);
                this.drawLine(this.pivotsGfx, { x1, x2, y1: pivot.r1, y2: pivot.r1 });
            }
            if (pivot.r2) {
                this.pivotsGfx.lineStyle(2, 0xff0000, 0.7);
                this.drawLine(this.pivotsGfx, { x1, x2, y1: pivot.r2, y2: pivot.r2 });
            }
        });
    }
}
