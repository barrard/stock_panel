import { Graphics, Container } from "pixi.js";
import { makeEMA } from "../../../indicators/indicatorHelpers/MovingAverage.js";

export default class DrawMovingAverages {
    constructor(ohlcData, pixiDataRef, periods = [20, 50, 200], layer = 0) {
        this.ohlcData = ohlcData; // Full OHLC data
        this.pixiDataRef = pixiDataRef;
        this.periods = periods; // Array of MA periods to calculate
        this.layer = layer;
        this.hasInit = false;
        this.fullMAData = {}; // Pre-calculated MA values for ALL data (calculated once)

        // Color mapping for different MA periods
        this.colors = {
            20: 0x00ff00,   // Green for 20-period MA
            50: 0xffaa00,   // Orange for 50-period MA
            200: 0xff0000,  // Red for 200-period MA
        };

        this.lineWidth = 2;

        this.init();
    }

    init() {
        if (this.hasInit) return;
        this.hasInit = true;
        this.initContainer();
        this.xScale = this.pixiDataRef.current.xScale;
        this.priceScale = this.pixiDataRef.current.priceScale;

        // Pre-calculate ALL MAs once during initialization
        this.calculateAllMAs();
    }

    initContainer() {
        this.maContainer = new Container();
        this.pixiDataRef.current.addToLayer(this.layer, this.maContainer);
    }

    cleanup() {
        if (this.maContainer) {
            this.pixiDataRef.current.removeFromLayer(this.layer, this.maContainer);
            this.maContainer.destroy({ children: true });
            this.maContainer = null;
        }
    }

    /**
     * Calculate all MAs ONCE on the full dataset
     * This is called during initialization only
     */
    calculateAllMAs() {
        if (!this.ohlcData || this.ohlcData.length === 0) {
            return;
        }

        this.fullMAData = {};

        this.periods.forEach(period => {
            // Use the existing makeEMA utility to calculate EMA on full dataset
            // makeEMA returns array of {x: timestamp, y: emaValue}
            const fullEMA = makeEMA(this.ohlcData, period);

            if (!fullEMA || fullEMA.length === 0) {
                this.fullMAData[period] = [];
                return;
            }

            // Store the full EMA data
            this.fullMAData[period] = fullEMA;
        });
    }

    /**
     * Draw a single MA line using pre-calculated data
     */
    drawMALine(period) {
        const slicedData = this.pixiDataRef.current.slicedData;
        const sliceStart = this.pixiDataRef.current.sliceStart;
        const fullMAValues = this.fullMAData[period];

        if (!slicedData || slicedData.length === 0 || !fullMAValues || fullMAValues.length === 0) {
            return;
        }

        const gfx = new Graphics();
        gfx.lineStyle(this.lineWidth, this.colors[period] || 0xffffff, 1);

        let firstPoint = true;
        const emaStartIndex = period - 1; // First valid EMA index in original data

        // Loop through the visible sliced data
        for (let i = 0; i < slicedData.length; i++) {
            // Absolute index in the full dataset
            const absoluteIndex = sliceStart + i;

            // Skip bars that don't have enough history for this EMA period
            if (absoluteIndex < emaStartIndex) {
                continue;
            }

            // The index in the fullMAData array
            // makeEMA starts returning values at index 0, which corresponds to bar (period-1) in ohlcData
            const maIndex = absoluteIndex - emaStartIndex;

            if (maIndex < 0 || maIndex >= fullMAValues.length) {
                continue;
            }

            const maValue = fullMAValues[maIndex]?.y;

            // Skip null/undefined values
            if (maValue === null || maValue === undefined) {
                firstPoint = true;
                continue;
            }

            // Use the relative index (i) for xScale, not the absolute index
            const x = this.xScale(i);
            const y = this.priceScale(maValue);

            if (firstPoint) {
                gfx.moveTo(x, y);
                firstPoint = false;
            } else {
                gfx.lineTo(x, y);
            }
        }

        this.maContainer.addChild(gfx);
    }

    /**
     * Main draw function - draws all MA lines using pre-calculated data
     * This is called on every pan/zoom
     */
    drawAll() {
        if (!this.maContainer) {
            return;
        }

        // Clear previous drawings
        this.maContainer.removeChildren().forEach((child) => child.destroy());

        // Update scales in case they changed
        this.xScale = this.pixiDataRef.current.xScale;
        this.priceScale = this.pixiDataRef.current.priceScale;

        // Draw each MA line using pre-calculated data
        this.periods.forEach(period => {
            this.drawMALine(period);
        });
    }
}
