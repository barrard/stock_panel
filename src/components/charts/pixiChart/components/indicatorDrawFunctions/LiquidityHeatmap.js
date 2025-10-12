import { extent, scaleLinear, interpolateLab } from "d3";
import { Graphics, Container, Color } from "pixi.js";

export default class LiquidityHeatmap {
    constructor(chart, options = {}) {
        this.chart = chart;
        this.container = new Container();

        // Separate containers for historical and current bar (for incremental updates)
        this.historicalBarsContainer = new Container();
        this.currentBarContainer = new Container();

        // Timeframe for datetime alignment (e.g., '1m', '5m', 'tick')
        this.timeframe = options.timeframe || "1m";

        this.liquidityHistory = []; // Array of {datetime, liquidity: {price: {volume, orders}}} - compiled per bar
        this.currentBarSnapshots = []; // Array of snapshots for the current bar (to average)
        this.currentBarDatetime = null; // Datetime of the current bar being built

        this.maxHistoryLength = 5000; // Max bars to keep in history (increased to support more data)

        // Visualization mode: 'volume', 'orders', or 'ratio' (volume/orders = avg size per order)
        this.visualizationMode = "volume";
        // this.colors = ["black", "blue", "green", "yellow", "red", "pink"];

        // // Fixed thresholds for liquidity size (no forward-looking bias)
        // // Values represent order size at a price level
        // this.liquidityThresholds = [0, 10, 25, 75, 150, 500, 1000]; // Corresponds to colors array

        //   Option 1: Classic Heat (Blue → Red → White)
        // this.colors = ["black", "darkblue", "blue", "cyan", "yellow", "orange", "red", "white"];
        // this.liquidityThresholds = [0, 55, 100, 200, 300, 400, 500, 550];

        this.liquidityThresholds = [0, 15, 30, 60, 90, 120, 180, 250];
        //   This is the classic heatmap - dark to bright, cool to hot.

        //   Option 2: Bookmap-style (Dark → Vibrant)
        this.colors = ["#000033", "#000066", "#0000ff", "#00ff00", "#ffff00", "#ff8800", "#ff0000", "#ffffff"];
        //   this.liquidityThresholds = [0, 5, 10, 25, 50, 100, 200, 500];
        //   Deep blue → bright blue → green → yellow → orange → red → white

        //   Option 3: Perceptually Uniform (Viridis-inspired)
        // this.colors = ["#440154", "#31688e", "#35b779", "#fde724"];
        // this.liquidityThresholds = [0, 50, 250, 500];
        //   Purple → blue → green → yellow (scientifically designed for visual clarity)

        //   Option 4: Simple Intensity (Your current but reordered)
        // this.colors = ["black", "blue", "cyan", "green", "yellow", "orange", "red"];
        //   this.liquidityThresholds = [0, 10, 25, 50, 100, 200, 500];

        //   Option 5: High-contrast (Maximum visibility)
        //   this.colors = ["#000000", "#0066ff", "#00ff00", "#ffff00", "#ff6600", "#ff0000", "#ffffff"];
        //   this.liquidityThresholds = [0, 10, 25, 50, 100, 250, 500];

        this.initialized = false;
        this.lastSliceStart = null; // Track pan/zoom changes
        this.lastSliceEnd = null;
        this.needsFullRedraw = false; // Flag set when pan/zoom detected, cleared after full redraw
    }

    init() {
        if (this.initialized) return;

        // Ensure containers exist (in case they were destroyed during cleanup)
        if (!this.container || this.container._destroyed) {
            this.container = new Container();
            this.historicalBarsContainer = new Container();
            this.currentBarContainer = new Container();
        }

        // Add sub-containers to main container
        this.container.addChild(this.historicalBarsContainer);
        this.container.addChild(this.currentBarContainer);

        // Add container to the chart at layer 0 (background)
        this.chart.addToLayer(0, this.container);
        this.initialized = true;
    }

    /**
     * Add a new liquidity snapshot to the current bar buffer
     * This is called for real-time 2-second snapshots
     * @param {Object} snapshot - {datetime, liquidity: {price: volume}}
     */
    addLiquiditySnapshot(snapshot) {
        if (!snapshot || !snapshot.liquidity || !snapshot.datetime) {
            console.log(`[LiquidityHeatmap] Invalid snapshot received`, snapshot);
            return;
        }

        // Determine which bar this snapshot belongs to (align to bar boundary)
        const barDatetime = this.getBarDatetime(snapshot.datetime);

        // If this is a new bar, finalize the previous bar's data
        if (this.currentBarDatetime !== null && barDatetime !== this.currentBarDatetime) {
            console.log(`[LiquidityHeatmap] New bar detected - finalizing previous bar`);
            this.finalizeCurrentBar();
        }

        // Set current bar datetime
        this.currentBarDatetime = barDatetime;

        // Add snapshot to current bar buffer
        this.currentBarSnapshots.push(snapshot);
        // console.log(
        //     `[LiquidityHeatmap] Added snapshot - current buffer size: ${this.currentBarSnapshots.length}, price levels: ${
        //         Object.keys(snapshot.liquidity).length
        //     }`
        // );
    }

    /**
     * Finalize the current bar by averaging all snapshots and adding to history
     */
    finalizeCurrentBar() {
        if (this.currentBarSnapshots.length === 0) return;

        // Calculate average liquidity across all snapshots for this bar
        const averagedLiquidity = this.averageSnapshots(this.currentBarSnapshots);

        // Add to history
        const finalizedBar = {
            datetime: this.currentBarDatetime,
            liquidity: averagedLiquidity,
        };

        this.liquidityHistory.push(finalizedBar);

        // Prune old bars beyond max length
        if (this.liquidityHistory.length > this.maxHistoryLength) {
            this.liquidityHistory.shift();
        }

        // Clear current bar buffer
        this.currentBarSnapshots = [];
        this.currentBarDatetime = null;
    }

    /**
     * Average multiple snapshots into a single liquidity map
     * @param {Array} snapshots - Array of {datetime, liquidity}
     * @returns {Object} - Averaged liquidity map {price: {volume, orders}}
     */
    averageSnapshots(snapshots) {
        const priceVolumeSum = {}; // {price: totalVolume}
        const priceOrdersSum = {}; // {price: totalOrders}
        const priceCount = {}; // {price: count}

        snapshots.forEach((snapshot) => {
            Object.entries(snapshot.liquidity).forEach(([price, data]) => {
                if (!priceVolumeSum[price]) {
                    priceVolumeSum[price] = 0;
                    priceOrdersSum[price] = 0;
                    priceCount[price] = 0;
                }
                // Handle both old format (just number) and new format ({volume, orders})
                const volume = typeof data === "object" ? data.volume : data;
                const orders = typeof data === "object" ? data.orders : 0;

                priceVolumeSum[price] += volume;
                priceOrdersSum[price] += orders;
                priceCount[price]++;
            });
        });

        // Calculate averages
        const averagedLiquidity = {};
        Object.keys(priceVolumeSum).forEach((price) => {
            averagedLiquidity[price] = {
                volume: priceVolumeSum[price] / priceCount[price],
                orders: priceOrdersSum[price] / priceCount[price],
            };
        });

        return averagedLiquidity;
    }

    /**
     * Get the bar datetime for a given datetime (align to bar boundary)
     * Alignment depends on timeframe
     */
    getBarDatetime(datetime) {
        const date = new Date(datetime);

        // For tick bars, use the exact datetime (no rounding)
        if (this.timeframe === "tick") {
            return datetime;
        }

        // For minute-based bars, round down to the nearest minute
        date.setSeconds(0, 0);
        return date.getTime();
    }

    /**
     * Set entire liquidity history (for initial load)
     * @param {Array} historyArray - Array of {datetime, liquidity}
     */
    setLiquidityHistory(historyArray) {
        this.liquidityHistory = historyArray.slice(-this.maxHistoryLength);
    }

    /**
     * Clear liquidity history
     */
    clearHistory() {
        this.liquidityHistory = [];
        this.currentBarSnapshots = [];
        this.currentBarDatetime = null;
        this.historicalBarsContainer.removeChildren();
        this.currentBarContainer.removeChildren();
    }

    /**
     * Get color interpolation functions based on FIXED thresholds (no forward-looking bias)
     */
    getColorFunctions() {
        const colorFns = [];

        // Create interpolation functions between threshold ranges
        this.colors.forEach((color, i) => {
            if (i === 0) return;

            const colorScale = scaleLinear().range([0, 1]);
            colorScale.domain([this.liquidityThresholds[i - 1], this.liquidityThresholds[i]]);

            colorFns.push((value) => {
                return interpolateLab(this.colors[i - 1], this.colors[i])(colorScale(value));
            });
        });

        // Create threshold data for getColorForValue
        const thresholdData = this.liquidityThresholds.map((threshold, i) => ({
            threshold,
            index: i,
        }));

        return { colorFns, thresholdData };
    }

    /**
     * Get threshold info for a given value (which color range it falls into)
     */
    getThresholdInfo(value, thresholdData) {
        // If below minimum threshold, use first color range
        if (value <= thresholdData[0].threshold) {
            return { value, index: 0 };
        }

        // If above maximum threshold, use last color range
        if (value >= thresholdData[thresholdData.length - 1].threshold) {
            return { value, index: thresholdData.length - 2 };
        }

        // Find which threshold range the value falls into
        for (let i = 0; i < thresholdData.length - 1; i++) {
            if (value >= thresholdData[i].threshold && value < thresholdData[i + 1].threshold) {
                return { value, index: i };
            }
        }

        // Fallback to last range
        return { value, index: thresholdData.length - 2 };
    }

    /**
     * Main draw method - only called manually on data updates
     * @param {Boolean} forceFullRedraw - Force redraw all bars (for pan/zoom/options changes)
     */
    draw(forceFullRedraw = false) {
        // console.log(`[LiquidityHeatmap] draw() called - forceFullRedraw: ${forceFullRedraw}, initialized: ${this.initialized}`);
        const startTime = performance.now();

        if (!this.initialized) {
            console.log(`[LiquidityHeatmap] Initializing...`);
            this.init();
        }

        const { slicedData, xScale, priceScale, sliceStart, sliceEnd } = this.chart;

        if (!slicedData || !slicedData.length) {
            console.log(`[LiquidityHeatmap] No slicedData, skipping draw`);
            return;
        }

        // Detect pan/zoom changes by comparing sliceStart/sliceEnd
        if (this.lastSliceStart !== null && this.lastSliceEnd !== null) {
            if (this.lastSliceStart !== sliceStart || this.lastSliceEnd !== sliceEnd) {
                console.log(`[LiquidityHeatmap] Pan/zoom detected - setting needsFullRedraw flag`);
                console.log(`[LiquidityHeatmap] Previous: ${this.lastSliceStart}-${this.lastSliceEnd}, Current: ${sliceStart}-${sliceEnd}`);
                this.needsFullRedraw = true;
            }
        }

        // Store current slice values for next comparison
        this.lastSliceStart = sliceStart;
        this.lastSliceEnd = sliceEnd;

        if (forceFullRedraw || this.needsFullRedraw) {
            // Full redraw needed (pan/zoom/options change)
            // console.log(
            //     `[LiquidityHeatmap] Full redraw triggered - forceFullRedraw: ${forceFullRedraw}, needsFullRedraw: ${this.needsFullRedraw}`
            // );
            this.drawAllBars();
            // Clear the flag after full redraw
            this.needsFullRedraw = false;
        } else {
            // Incremental update: only redraw current bar (socket update)
            // console.log(`[LiquidityHeatmap] Incremental update: drawing current bar only`);
            this.drawCurrentBarOnly();
        }

        const endTime = performance.now();
        const drawTime = (endTime - startTime).toFixed(2);
        // console.log(`[LiquidityHeatmap] Draw time: ${drawTime}ms`);
    }

    /**
     * Draw all visible bars including current bar data
     */
    drawAllBars() {
        console.log(
            `[LiquidityHeatmap] drawAllBars called - history: ${this.liquidityHistory.length}, currentSnapshots: ${this.currentBarSnapshots.length}, slicedData: ${this.chart.slicedData?.length}`
        );

        // Clear both containers
        this.historicalBarsContainer.removeChildren();
        this.currentBarContainer.removeChildren();

        const { slicedData, xScale, priceScale } = this.chart;
        const barWidth = this.chart.candleWidth || this.chart.innerWidth() / slicedData.length;
        const liquidityHeight = this.calculateLiquidityHeight();

        const barHeight = Math.abs(priceScale(0) - priceScale(liquidityHeight));

        // Calculate color functions based on FIXED thresholds (no data needed)
        const globalColorScale = this.getColorFunctions();

        // Create SINGLE Graphics objects for historical and current data
        const historicalGfx = new Graphics();
        const currentGfx = new Graphics();

        // Track stats
        let drawnCount = 0;
        let missedCount = 0;

        // Draw all bars from history
        slicedData.forEach((bar, relativeIndex) => {
            const barDatetime = bar.timestamp || bar.datetime;

            // Check if this is the current bar being built
            const alignedBarDatetime = this.getBarDatetime(barDatetime);
            if (this.currentBarSnapshots.length > 0 && alignedBarDatetime === this.currentBarDatetime) {
                // Use live current bar data (averaged from snapshots)
                const currentBarLiquidity = this.averageSnapshots(this.currentBarSnapshots);
                const currentSnapshot = {
                    datetime: this.currentBarDatetime,
                    liquidity: currentBarLiquidity,
                };
                this.drawBarLiquidityBatched(currentSnapshot, relativeIndex, barWidth, barHeight, currentGfx, globalColorScale);
                drawnCount++;
            } else {
                // Use historical finalized data
                const liquiditySnapshot = this.findLiquiditySnapshotForBar(barDatetime);
                if (liquiditySnapshot) {
                    this.drawBarLiquidityBatched(liquiditySnapshot, relativeIndex, barWidth, barHeight, historicalGfx, globalColorScale);
                    drawnCount++;
                } else {
                    missedCount++;
                }
            }
        });

        console.log(`[LiquidityHeatmap] Drew ${drawnCount} bars, missed ${missedCount} bars out of ${slicedData.length} total`);

        // Add the graphics objects to their respective containers
        this.historicalBarsContainer.addChild(historicalGfx);
        this.currentBarContainer.addChild(currentGfx);
    }

    /**
     * Draw only the current bar (incremental update)
     */
    drawCurrentBarOnly() {
        this.drawCurrentBarOnlyWithColorScale(null);
    }

    /**
     * Draw current bar with optional pre-calculated color scale
     */
    drawCurrentBarOnlyWithColorScale(globalColorScale = null) {
        // console.log(
        //     `[LiquidityHeatmap] drawCurrentBarOnly called - snapshots: ${this.currentBarSnapshots.length}, currentBarDatetime: ${this.currentBarDatetime}`
        // );

        // Clear current bar container
        this.currentBarContainer.removeChildren();

        if (this.currentBarSnapshots.length === 0) {
            console.log(`[LiquidityHeatmap] No snapshots to draw for current bar`);
            return;
        }

        const { slicedData, xScale } = this.chart;
        if (!slicedData || !slicedData.length) {
            console.log(`[LiquidityHeatmap] No slicedData available`);
            return;
        }

        // Calculate averaged liquidity for current bar
        const currentBarLiquidity = this.averageSnapshots(this.currentBarSnapshots);

        // Find the current bar's position in slicedData (should be the last bar)
        const lastBar = slicedData[slicedData.length - 1];
        const lastBarDatetime = lastBar.timestamp || lastBar.datetime;

        // console.log(
        //     `[LiquidityHeatmap] Last bar datetime: ${new Date(lastBarDatetime).toLocaleTimeString()}, current bar datetime: ${new Date(
        //         this.currentBarDatetime
        //     ).toLocaleTimeString()}, match: ${this.getBarDatetime(lastBarDatetime) === this.currentBarDatetime}`
        // );

        // Check if current bar datetime matches the last visible bar
        if (this.getBarDatetime(lastBarDatetime) === this.currentBarDatetime) {
            const relativeIndex = slicedData.length - 1;
            const barWidth = this.chart.candleWidth || this.chart.innerWidth() / slicedData.length;
            const liquidityHeight = this.calculateLiquidityHeight();

            const currentSnapshot = {
                datetime: this.currentBarDatetime,
                liquidity: currentBarLiquidity,
            };

            // Create a SINGLE Graphics object for current bar
            const currentGfx = new Graphics();
            this.drawBarLiquidityBatched(currentSnapshot, relativeIndex, barWidth, liquidityHeight, currentGfx, globalColorScale);
            this.currentBarContainer.addChild(currentGfx);

            // console.log(
            //     `[LiquidityHeatmap] Drew current bar - price levels: ${Object.keys(currentBarLiquidity).length}, position: ${relativeIndex}`
            // );
        } else {
            // console.log(
            //     `[LiquidityHeatmap] Current bar datetime mismatch - chart: ${lastBarDatetime}, heatmap: ${this.currentBarDatetime}`
            // );
        }
    }

    /**
     * Draw liquidity data for a single bar into a batched Graphics object
     * @param {Object} liquiditySnapshot - {datetime, liquidity}
     * @param {Number} relativeIndex - Index in slicedData
     * @param {Number} barWidth - Width of the bar
     * @param {Number} liquidityHeight - Height of each price level
     * @param {Graphics} gfx - Single Graphics object to batch all rectangles into
     * @param {Object} globalColorScale - Pre-calculated color scale (optional, will calculate per-bar if null)
     */
    drawBarLiquidityBatched(liquiditySnapshot, relativeIndex, barWidth, barHeight, gfx, globalColorScale = null) {
        const { xScale, priceScale } = this.chart;

        if (!liquiditySnapshot || !liquiditySnapshot.liquidity) return;

        const liquidityData = liquiditySnapshot.liquidity;
        const priceLevelCount = Object.keys(liquidityData).length;

        if (!priceLevelCount) return;

        // Use global color scale if provided, otherwise calculate (fixed thresholds, fast either way)
        const { colorFns, thresholdData } = globalColorScale || this.getColorFunctions();

        // Calculate x position for this bar
        const x = xScale(relativeIndex);

        // Log first bar details for debugging
        if (relativeIndex === 0) {
            console.log(
                `[LiquidityHeatmap] First bar - price levels: ${priceLevelCount}, barWidth: ${barWidth.toFixed(
                    2
                )}, barHeight: ${barHeight.toFixed(2)}, x: ${x.toFixed(2)}`
            );
        }

        // Draw each price level into the SAME Graphics object
        Object.keys(liquidityData).forEach((priceStr) => {
            const price = parseFloat(priceStr);
            const data = liquidityData[priceStr];

            // Extract value based on visualization mode
            let value = 0;
            if (typeof data === "object") {
                // New format: {volume, orders}
                switch (this.visualizationMode) {
                    case "volume":
                        value = data.volume;
                        break;
                    case "orders":
                        value = data.orders;
                        break;
                    case "ratio":
                        // Average size per order (volume/orders)
                        if (data.ratio != undefined) {
                            value = data.ratio;
                        } else {
                            value = data.ratio = data.orders > 0 ? data.volume / data.orders : 0;
                        }
                        break;
                    default:
                        value = data.volume;
                }
            } else {
                // Old format: just a number (volume)
                value = data;
            }

            // Calculate y position and height
            const yBottom = priceScale(price);
            const yTop = yBottom - barHeight;
            // const barHeight = Math.abs(priceScale(0) - priceScale(liquidityHeight));

            // Get threshold info for color (which range does this value fall into)
            const { value: colorValue, index } = this.getThresholdInfo(value, thresholdData);

            let colorFnIndex = index;
            if (colorFnIndex >= colorFns.length) {
                colorFnIndex = colorFns.length - 1;
            }

            const colorFn = colorFns[colorFnIndex];
            if (!colorFn) return;

            let colorStr = colorFn(colorValue);

            // Convert RGB string to hex using Color class
            colorStr = colorStr.replace("rgb(", "").replace(")", "");
            const [r, g, b] = colorStr.split(",").map((v) => parseFloat(v.trim()));
            const color = new Color([r / 255, g / 255, b / 255]).toNumber();

            // Log first price level of first bar for debugging
            if (relativeIndex === 0 && price === parseFloat(Object.keys(liquidityData)[0])) {
                console.log(
                    `[LiquidityHeatmap] First price level - price: ${price}, value: ${value}, yTop: ${yTop.toFixed(
                        2
                    )}, yBottom: ${yBottom.toFixed(2)}, color: #${color.toString(16)}`
                );
            }

            // Batch draw into single Graphics object
            gfx.beginFill(color, 0.5); // alpha in beginFill, not separate property
            gfx.drawRect(x, yTop, barWidth, barHeight);
            gfx.endFill();
        });
    }

    /**
     * Calculate the height (in price units) of each liquidity level
     */
    calculateLiquidityHeight() {
        // Default to tick size if we can't determine from data
        if (!this.liquidityHistory.length) {
            return this.chart.tickSize || 0.25;
        }

        // Find the minimum price difference between consecutive levels
        let minDiff = Infinity;

        this.liquidityHistory.forEach((snapshot) => {
            const prices = Object.keys(snapshot.liquidity)
                .map((p) => parseFloat(p))
                .sort((a, b) => a - b);

            for (let i = 1; i < prices.length; i++) {
                const diff = Math.abs(prices[i] - prices[i - 1]);
                if (diff > 0 && diff < minDiff) {
                    minDiff = diff;
                }
            }
        });

        return minDiff === Infinity ? this.chart.tickSize : minDiff;
    }

    /**
     * Find the liquidity snapshot closest to a given bar datetime
     */
    findLiquiditySnapshotForBar(barDatetime) {
        if (!this.liquidityHistory.length) return null;

        // Find the snapshot with datetime closest to (but not after) the bar datetime
        let closestSnapshot = null;
        let closestDiff = Infinity;

        for (const snapshot of this.liquidityHistory) {
            const diff = Math.abs(snapshot.datetime - barDatetime);

            // Prefer snapshots before or at the bar time
            if (snapshot.datetime <= barDatetime && diff < closestDiff) {
                closestDiff = diff;
                closestSnapshot = snapshot;
            }
        }

        // If no snapshot found before the bar, use the closest one after
        if (!closestSnapshot && this.liquidityHistory.length > 0) {
            closestSnapshot = this.liquidityHistory.reduce((closest, current) => {
                const currentDiff = Math.abs(current.datetime - barDatetime);
                const closestDiff = Math.abs(closest.datetime - barDatetime);
                return currentDiff < closestDiff ? current : closest;
            });
        }

        return closestSnapshot;
    }

    /**
     * Set visualization mode and redraw
     * @param {String} mode - 'volume', 'orders', or 'ratio'
     */
    setVisualizationMode(mode) {
        if (["volume", "orders", "ratio"].includes(mode)) {
            this.visualizationMode = mode;
            console.log(`[LiquidityHeatmap] Visualization mode set to: ${mode}`);
            // Trigger full redraw with new visualization mode
            this.draw(true);
        } else {
            console.warn(`[LiquidityHeatmap] Invalid visualization mode: ${mode}`);
        }
    }

    /**
     * Cleanup method
     */
    cleanup() {
        // Remove from parent before destroying
        if (this.container && this.container.parent) {
            this.container.parent.removeChild(this.container);
        }

        // Destroy container
        if (this.container && !this.container._destroyed) {
            this.container.destroy({ children: true });
        }

        // Clear data
        this.liquidityHistory = [];
        this.currentBarSnapshots = [];
        this.currentBarDatetime = null;

        // Reset initialization flag so it can be re-initialized
        this.initialized = false;
    }
}
