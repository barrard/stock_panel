import { Graphics, Container } from "pixi.js";
import { makeSuperTrendData } from "../../../indicators/superTrend.js";
import { calcTradingRange } from "../../../indicators/ATR.js";

export default class DrawSuperTrend {
    constructor(ohlcData, pixiDataRef, layer = 0) {
        this.ohlcData = ohlcData;
        this.pixiDataRef = pixiDataRef;
        this.layer = layer;
        this.hasInit = false;
        this.lastDataLength = 0; // Track data length for change detection

        // Line styling
        this.bullishColor = 0x00ff00; // Green when price above superTrend
        this.bearishColor = 0xff0000; // Red when price below superTrend
        this.lineWidth = 3;

        this.init();
    }

    init() {
        if (this.hasInit) return;
        this.hasInit = true;
        this.initContainer();
        this.xScale = this.pixiDataRef.current.xScale;
        this.priceScale = this.pixiDataRef.current.priceScale;

        // Calculate indicators on init
        this.recalculateIndicators();
    }

    initContainer() {
        this.superTrendContainer = new Container();
        this.gfx = new Graphics(); // Create once, reuse on each draw
        this.superTrendContainer.addChild(this.gfx);
        this.pixiDataRef.current.addToLayer(this.layer, this.superTrendContainer);
    }

    cleanup() {
        if (this.superTrendContainer) {
            this.pixiDataRef.current.removeFromLayer(this.layer, this.superTrendContainer);
            this.superTrendContainer.destroy({ children: true });
            this.superTrendContainer = null;
        }
    }

    /**
     * Recalculate tradingRange and superTrend for all data
     * Called on init and whenever data length changes
     */
    recalculateIndicators() {
        if (!this.ohlcData || this.ohlcData.length === 0) {
            this.lastDataLength = 0;
            return;
        }

        // Calculate tradingRange for all bars
        calcTradingRange(this.ohlcData);

        // Calculate superTrend for all bars
        makeSuperTrendData(this.ohlcData);

        // Update tracked length
        this.lastDataLength = this.ohlcData.length;
    }

    /**
     * Main draw function - draws the colored superTrend line
     */
    drawAll() {
        if (!this.superTrendContainer || !this.gfx) {
            return;
        }

        // Check if data length changed (new bars or historical data loaded)
        if (this.ohlcData && this.ohlcData.length !== this.lastDataLength) {
            this.recalculateIndicators();
        }

        // Clear previous drawings (reuse Graphics object, don't destroy)
        this.gfx.clear();

        // Update scales
        this.xScale = this.pixiDataRef.current.xScale;
        this.priceScale = this.pixiDataRef.current.priceScale;

        const slicedData = this.pixiDataRef.current.slicedData;

        if (!slicedData || slicedData.length === 0) {
            return;
        }

        // Draw the superTrend line with color based on trend
        this.drawColoredSuperTrendLine(slicedData);
    }

    /**
     * Draw superTrend line that changes color based on price position
     */
    drawColoredSuperTrendLine(slicedData) {
        let prevX = null;
        let prevY = null;

        for (let i = 0; i < slicedData.length; i++) {
            const bar = slicedData[i];

            // Skip bars without superTrend data
            if (!bar.superTrend || !bar.superTrend.superTrend) {
                prevX = null;
                prevY = null;
                continue;
            }

            const superTrendValue = bar.superTrend.superTrend;
            const isBullish = bar.close > superTrendValue;
            const color = isBullish ? this.bullishColor : this.bearishColor;

            const x = this.xScale(i);
            const y = this.priceScale(superTrendValue);

            if (prevX !== null && prevY !== null) {
                // Draw line segment from previous point to current
                this.gfx.lineStyle(this.lineWidth, color, 1);
                this.gfx.moveTo(prevX, prevY);
                this.gfx.lineTo(x, y);
            }

            prevX = x;
            prevY = y;
        }
    }
}
