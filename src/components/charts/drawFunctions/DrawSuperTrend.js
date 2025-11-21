import { Graphics, Container } from "pixi.js";
import { makeSuperTrendData, makeNewSuperTrendData } from "../../../indicators/superTrend.js";
import { calcTradingRange, addNewTradingRange } from "../../../indicators/ATR.js";

export default class DrawSuperTrend {
    constructor(ohlcData, pixiDataRef, layer = 0) {
        this.ohlcData = ohlcData;
        this.pixiDataRef = pixiDataRef;
        this.layer = layer;
        this.hasInit = false;
        this.hasCalculated = false;

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

        // Calculate indicators if not present
        this.ensureIndicatorsCalculated();
    }

    initContainer() {
        this.superTrendContainer = new Container();
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
     * Ensure tradingRange and superTrend are calculated on the data
     * Only runs once on first draw
     */
    ensureIndicatorsCalculated() {
        if (this.hasCalculated || !this.ohlcData || this.ohlcData.length === 0) {
            return;
        }

        // Check if superTrend is already on the data
        const lastBar = this.ohlcData[this.ohlcData.length - 1];
        if (lastBar.superTrend && lastBar.superTrend.superTrend) {
            this.hasCalculated = true;
            return;
        }

        // Check if tradingRange exists, if not calculate it
        if (!lastBar.tradingRange) {
            calcTradingRange(this.ohlcData);
        }

        // Calculate superTrend for all data
        makeSuperTrendData(this.ohlcData);
        this.hasCalculated = true;
    }

    /**
     * Call this when a new bar is added to update indicators for just that bar
     * Should be called from parent component when new data arrives
     */
    updateForNewBar() {
        if (!this.ohlcData || this.ohlcData.length < 2) return;

        // Add tradingRange to the new bar
        addNewTradingRange(this.ohlcData);

        // Calculate superTrend for the new bar
        makeNewSuperTrendData(this.ohlcData);
    }

    /**
     * Main draw function - draws the colored superTrend line
     */
    drawAll() {
        if (!this.superTrendContainer) {
            return;
        }

        // Clear previous drawings
        this.superTrendContainer.removeChildren().forEach((child) => child.destroy());

        // Update scales
        this.xScale = this.pixiDataRef.current.xScale;
        this.priceScale = this.pixiDataRef.current.priceScale;

        const slicedData = this.pixiDataRef.current.slicedData;
        const sliceStart = this.pixiDataRef.current.sliceStart;

        if (!slicedData || slicedData.length === 0) {
            return;
        }

        // Draw the superTrend line with color based on trend
        this.drawColoredSuperTrendLine(slicedData, sliceStart);
    }

    /**
     * Draw superTrend line that changes color based on price position
     */
    drawColoredSuperTrendLine(slicedData, sliceStart) {
        const gfx = new Graphics();

        let currentColor = null;
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
                gfx.lineStyle(this.lineWidth, color, 1);
                gfx.moveTo(prevX, prevY);
                gfx.lineTo(x, y);
            }

            prevX = x;
            prevY = y;
            currentColor = color;
        }

        this.superTrendContainer.addChild(gfx);
    }
}
