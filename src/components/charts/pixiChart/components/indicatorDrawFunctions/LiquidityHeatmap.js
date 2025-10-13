import { extent, scaleLinear, interpolateLab } from "d3";
import { Graphics, Container, Color, Texture, Sprite, BaseTexture, SCALE_MODES, BufferResource } from "pixi.js";

export default class LiquidityHeatmap {
    constructor(chart, options = {}) {
        this.chart = chart;
        this.container = new Container();

        // Texture-based rendering - now supports multiple tiles
        this.tiles = []; // Array of {pixelBuffer, baseTexture, texture, sprite, startIndex, endIndex}
        this.maxTextureSize = null; // Will be queried from WebGL
        this.tileWidth = 4096; // Default, will be updated based on GPU capabilities

        // Timeframe for datetime alignment (e.g., '1m', '5m', 'tick')
        this.timeframe = options.timeframe || "1m";

        this.liquidityHistory = []; // Array of {datetime, liquidity: {price: {volume, orders}}} - compiled per bar
        this.currentBarSnapshots = []; // Array of snapshots for the current bar (to average)
        this.currentBarDatetime = null; // Datetime of the current bar being built

        this.maxHistoryLength = 500000; // Max bars to keep in history (increased to support more data)

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

        // Auto-draw mechanism
        this.autoDrawInterval = null;
        this.autoDrawIntervalMs = 2000; // Check every 2 seconds if draw is needed
        this.hasDrawnInitial = false; // Track if we've drawn at least once
    }

    init() {
        if (this.initialized) return;

        // Ensure container exists (in case it was destroyed during cleanup)
        if (!this.container || this.container._destroyed) {
            this.container = new Container();
        }

        // Query max texture size from WebGL
        this.getMaxTextureSize();

        // Add container to the chart at layer 0 (background)
        this.chart.addToLayer(0, this.container);

        // Set up auto-draw interval
        this.startAutoDrawInterval();

        this.initialized = true;
    }

    /**
     * Start auto-draw interval to periodically check if drawing is needed
     */
    startAutoDrawInterval() {
        // Clear any existing interval
        this.stopAutoDrawInterval();

        // Set up new interval
        this.autoDrawInterval = setInterval(() => {
            this.checkAndDraw();
        }, this.autoDrawIntervalMs);

        console.log(`[LiquidityHeatmap] Auto-draw interval started (every ${this.autoDrawIntervalMs}ms)`);
    }

    /**
     * Stop auto-draw interval
     */
    stopAutoDrawInterval() {
        if (this.autoDrawInterval) {
            clearInterval(this.autoDrawInterval);
            this.autoDrawInterval = null;
        }
    }

    /**
     * Query the maximum texture size supported by the GPU
     */
    getMaxTextureSize() {
        if (this.maxTextureSize) return this.maxTextureSize;

        try {
            // Try to get WebGL context from the chart's renderer
            const renderer = this.chart.app?.renderer || this.chart.renderer;
            if (renderer && renderer.gl) {
                this.maxTextureSize = renderer.gl.getParameter(renderer.gl.MAX_TEXTURE_SIZE);
            } else {
                // Fallback: create a temporary canvas to query
                const canvas = document.createElement('canvas');
                const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                if (gl) {
                    this.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
                }
            }
        } catch (e) {
            console.warn('[LiquidityHeatmap] Could not query MAX_TEXTURE_SIZE:', e);
        }

        // Safe default if we couldn't query
        if (!this.maxTextureSize) {
            this.maxTextureSize = 4096;
        }

        // Use a conservative tile width (leave some headroom)
        this.tileWidth = Math.floor(this.maxTextureSize * 0.9);

        console.log(`[LiquidityHeatmap] Max texture size: ${this.maxTextureSize}, using tile width: ${this.tileWidth}`);

        return this.maxTextureSize;
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
        this.destroyTextures();
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
     * Get RGBA color values for a given liquidity value
     * @returns {Object} {r, g, b, a} values (0-255)
     */
    getColorRGBA(value, colorFns, thresholdData) {
        // Cache key for this value (rounded to reduce cache misses)
        const cacheKey = Math.round(value * 10) / 10;

        // Check cache
        if (!this.colorCache) {
            this.colorCache = new Map();
        }

        if (this.colorCache.has(cacheKey)) {
            return this.colorCache.get(cacheKey);
        }

        const { value: colorValue, index } = this.getThresholdInfo(value, thresholdData);

        let colorFnIndex = index;
        if (colorFnIndex >= colorFns.length) {
            colorFnIndex = colorFns.length - 1;
        }

        const colorFn = colorFns[colorFnIndex];
        if (!colorFn) {
            const defaultColor = { r: 0, g: 0, b: 0, a: 128 };
            this.colorCache.set(cacheKey, defaultColor);
            return defaultColor;
        }

        let colorStr = colorFn(colorValue);

        // Convert RGB string to RGBA values - optimized parsing
        const rgbStart = colorStr.indexOf('(') + 1;
        const rgbEnd = colorStr.indexOf(')');
        const rgbStr = colorStr.substring(rgbStart, rgbEnd);
        const parts = rgbStr.split(',');

        const color = {
            r: Math.round(parseFloat(parts[0])),
            g: Math.round(parseFloat(parts[1])),
            b: Math.round(parseFloat(parts[2])),
            a: 128 // 0.5 alpha (semi-transparent)
        };

        // Cache the result
        this.colorCache.set(cacheKey, color);

        return color;
    }

    /**
     * Calculate price range and pixel mapping
     */
    getPriceRange() {
        const { priceScale } = this.chart;
        const domain = priceScale.domain();

        return {
            minPrice: domain[0],
            maxPrice: domain[1],
            priceRange: domain[1] - domain[0]
        };
    }

    /**
     * Map price to pixel row in texture (0 = top, height-1 = bottom)
     */
    priceToPixelRow(price, minPrice, priceRange, textureHeight, liquidityHeight) {
        // Invert because texture rows go from top to bottom, but prices go bottom to top
        const normalizedPrice = (price - minPrice) / priceRange;
        const row = Math.round((1 - normalizedPrice) * textureHeight);
        return Math.max(0, Math.min(textureHeight - 1, row));
    }

    /**
     * Destroy all existing texture resources
     */
    destroyTextures() {
        this.tiles.forEach(tile => {
            if (tile.sprite) {
                this.container.removeChild(tile.sprite);
                tile.sprite.destroy();
            }
            if (tile.texture) {
                tile.texture.destroy(true);
            }
            if (tile.baseTexture) {
                tile.baseTexture.destroy();
            }
        });
        this.tiles = [];
    }

    /**
     * Check if a draw is needed and perform it
     * This is called every 2 seconds to ensure drawing happens even if events are missed
     */
    checkAndDraw() {
        const { slicedData, sliceStart, sliceEnd } = this.chart;

        if (!slicedData || !slicedData.length) {
            return;
        }

        // Detect pan/zoom changes by comparing sliceStart/sliceEnd
        if (this.lastSliceStart !== null && this.lastSliceEnd !== null) {
            if (this.lastSliceStart !== sliceStart || this.lastSliceEnd !== sliceEnd) {
                console.log('[LiquidityHeatmap] Auto-draw detected pan/zoom - setting needsFullRedraw flag');
                this.needsFullRedraw = true;
            }
        }

        // Check if we have data but haven't drawn yet
        if (!this.hasDrawnInitial && (this.liquidityHistory.length > 0 || this.currentBarSnapshots.length > 0)) {
            console.log('[LiquidityHeatmap] Auto-draw triggered - initial draw needed');
            this.draw(true);
            return;
        }

        // Check if pan/zoom detected and needs full redraw
        if (this.needsFullRedraw) {
            console.log('[LiquidityHeatmap] Auto-draw triggered - pan/zoom redraw needed');
            this.draw(false); // Let draw() method handle the needsFullRedraw flag
            return;
        }

        // Check if we have tiles but they're empty (data arrived but not drawn)
        if (this.tiles.length === 0 && this.liquidityHistory.length > 0) {
            console.log('[LiquidityHeatmap] Auto-draw triggered - no tiles but have data');
            this.draw(true);
            return;
        }

        // Check if current bar needs updating
        if (this.currentBarSnapshots.length > 0 && this.tiles.length > 0) {
            const lastBar = slicedData[slicedData.length - 1];
            const lastBarDatetime = lastBar.timestamp || lastBar.datetime;
            const alignedBarDatetime = this.getBarDatetime(lastBarDatetime);

            // If current bar matches last visible bar, draw it
            if (alignedBarDatetime === this.currentBarDatetime) {
                this.drawCurrentBarOnly();
            }
        }
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

        // Mark that we've drawn at least once
        this.hasDrawnInitial = true;

        const endTime = performance.now();
        const drawTime = (endTime - startTime).toFixed(2);
        // console.log(`[LiquidityHeatmap] Draw time: ${drawTime}ms`);
    }

    /**
     * Draw all visible bars including current bar data using tiled texture buffers
     */
    drawAllBars() {
        const startTotal = performance.now();

        console.log(
            `[LiquidityHeatmap] drawAllBars called - history: ${this.liquidityHistory.length}, currentSnapshots: ${this.currentBarSnapshots.length}, slicedData: ${this.chart.slicedData?.length}`
        );

        const { slicedData, priceScale } = this.chart;
        if (!slicedData || !slicedData.length) return;

        // Ensure we have the max texture size
        if (!this.maxTextureSize) {
            this.getMaxTextureSize();
        }

        const liquidityHeight = this.calculateLiquidityHeight();
        const { minPrice, maxPrice, priceRange } = this.getPriceRange();

        // Calculate texture dimensions
        const totalWidth = slicedData.length;
        const height = Math.max(1, Math.ceil(priceRange / liquidityHeight));

        // Clamp height to max texture size
        const clampedHeight = Math.min(height, this.maxTextureSize);

        // Calculate number of tiles needed
        const numTiles = Math.ceil(totalWidth / this.tileWidth);

        console.log(`[LiquidityHeatmap] Total dimensions: ${totalWidth}x${height}, creating ${numTiles} tiles of max width ${this.tileWidth}`);

        // Destroy old tiles
        this.destroyTextures();

        // Calculate color functions based on FIXED thresholds
        const { colorFns, thresholdData } = this.getColorFunctions();

        // Track stats
        let drawnCount = 0;
        let missedCount = 0;

        const startBufferAlloc = performance.now();
        const startFillPixels = performance.now();

        // Pre-calculate current bar liquidity once if needed
        let currentBarLiquidity = null;
        if (this.currentBarSnapshots.length > 0) {
            currentBarLiquidity = this.averageSnapshots(this.currentBarSnapshots);
        }

        // Create tiles
        for (let tileIndex = 0; tileIndex < numTiles; tileIndex++) {
            const startIndex = tileIndex * this.tileWidth;
            const endIndex = Math.min(startIndex + this.tileWidth, totalWidth);
            const tileWidth = endIndex - startIndex;

            // Create pixel buffer for this tile
            const pixelBuffer = new Uint8Array(tileWidth * clampedHeight * 4);
            pixelBuffer.fill(0); // Transparent black

            // Fill this tile's pixel buffer
            for (let i = startIndex; i < endIndex; i++) {
                const bar = slicedData[i];
                const barDatetime = bar.timestamp || bar.datetime;
                const alignedBarDatetime = this.getBarDatetime(barDatetime);

                let liquiditySnapshot = null;

                // Check if this is the current bar being built
                if (currentBarLiquidity && alignedBarDatetime === this.currentBarDatetime) {
                    // Use live current bar data (pre-calculated)
                    liquiditySnapshot = {
                        datetime: this.currentBarDatetime,
                        liquidity: currentBarLiquidity,
                    };
                    drawnCount++;
                } else {
                    // Use historical finalized data
                    liquiditySnapshot = this.findLiquiditySnapshotForBar(barDatetime);
                    if (liquiditySnapshot) {
                        drawnCount++;
                    } else {
                        missedCount++;
                    }
                }

                if (liquiditySnapshot) {
                    const localIndex = i - startIndex; // Index within this tile
                    this.fillBarPixelsTile(liquiditySnapshot, localIndex, tileWidth, clampedHeight, pixelBuffer, minPrice, priceRange, liquidityHeight, colorFns, thresholdData);
                }
            }

            // Create tile object
            const tile = {
                pixelBuffer,
                width: tileWidth,
                height: clampedHeight,
                startIndex,
                endIndex,
                baseTexture: null,
                texture: null,
                sprite: null
            };

            this.tiles.push(tile);
        }

        const bufferAllocTime = performance.now() - startBufferAlloc;
        const fillPixelsTime = performance.now() - startFillPixels;

        console.log(`[LiquidityHeatmap] Filled ${drawnCount} bars, missed ${missedCount} bars out of ${slicedData.length} total`);

        // Create textures and sprites for all tiles
        const startTextureUpdate = performance.now();
        this.updateTextures();
        const textureUpdateTime = performance.now() - startTextureUpdate;

        const totalTime = performance.now() - startTotal;

        console.log(`[LiquidityHeatmap] Performance:
  - Buffer allocation: ${bufferAllocTime.toFixed(2)}ms
  - Fill pixels: ${fillPixelsTime.toFixed(2)}ms
  - Texture update: ${textureUpdateTime.toFixed(2)}ms
  - TOTAL: ${totalTime.toFixed(2)}ms`);
    }

    /**
     * Fill pixel buffer for a single bar's liquidity data (tile-based)
     */
    fillBarPixelsTile(liquiditySnapshot, localBarIndex, tileWidth, tileHeight, pixelBuffer, minPrice, priceRange, liquidityHeight, colorFns, thresholdData) {
        if (!liquiditySnapshot || !liquiditySnapshot.liquidity) return;

        const liquidityData = liquiditySnapshot.liquidity;
        const visualizationMode = this.visualizationMode;

        // Iterate through each price level in the liquidity data
        for (const priceStr in liquidityData) {
            const price = parseFloat(priceStr);
            const data = liquidityData[priceStr];

            // Extract value based on visualization mode
            let value;
            if (typeof data === "object") {
                if (visualizationMode === "volume") {
                    value = data.volume;
                } else if (visualizationMode === "orders") {
                    value = data.orders;
                } else if (visualizationMode === "ratio") {
                    value = data.ratio !== undefined ? data.ratio : (data.orders > 0 ? data.volume / data.orders : 0);
                } else {
                    value = data.volume;
                }
            } else {
                value = data;
            }

            // Map price to pixel row
            const normalizedPrice = (price - minPrice) / priceRange;
            const row = Math.max(0, Math.min(tileHeight - 1, Math.round((1 - normalizedPrice) * tileHeight)));

            // Get RGBA color for this value
            const color = this.getColorRGBA(value, colorFns, thresholdData);

            // Calculate pixel index in tile's buffer
            const pixelIndex = (row * tileWidth + localBarIndex) * 4;

            // Write RGBA values to buffer
            pixelBuffer[pixelIndex] = color.r;
            pixelBuffer[pixelIndex + 1] = color.g;
            pixelBuffer[pixelIndex + 2] = color.b;
            pixelBuffer[pixelIndex + 3] = color.a;
        }
    }

    /**
     * Create or update PIXI textures for all tiles
     */
    updateTextures() {
        const { priceScale, xScale, slicedData } = this.chart;

        // Get chart dimensions
        const { minPrice, maxPrice } = this.getPriceRange();
        const topY = priceScale(maxPrice);
        const bottomY = priceScale(minPrice);
        const chartHeight = Math.abs(bottomY - topY);

        this.tiles.forEach((tile, index) => {
            if (!tile.pixelBuffer || !tile.width || !tile.height) {
                console.warn(`[LiquidityHeatmap] Cannot update tile ${index} - no pixel buffer`);
                return;
            }

            // Create texture if needed
            if (!tile.baseTexture) {
                // Create BufferResource from pixel buffer
                const resource = new BufferResource(tile.pixelBuffer, {
                    width: tile.width,
                    height: tile.height,
                });

                tile.baseTexture = new BaseTexture(resource, {
                    scaleMode: SCALE_MODES.NEAREST, // Nearest neighbor for sharp pixels
                    width: tile.width,
                    height: tile.height,
                });

                tile.texture = new Texture(tile.baseTexture);
                tile.sprite = new Sprite(tile.texture);
                this.container.addChild(tile.sprite);

                console.log(`[LiquidityHeatmap] Created tile ${index}: ${tile.width}x${tile.height} (bars ${tile.startIndex}-${tile.endIndex})`);
            } else {
                // Update existing texture with new pixel data
                tile.baseTexture.resource.update();
            }

            // Position and scale sprite to match chart coordinates
            // X: Start at the tile's first bar position
            const firstBarX = xScale(tile.startIndex);
            const lastBarX = xScale(tile.endIndex - 1);
            const tileChartWidth = lastBarX - firstBarX + (this.chart.candleWidth || 10);

            tile.sprite.x = firstBarX;
            tile.sprite.y = topY;
            tile.sprite.width = tileChartWidth;
            tile.sprite.height = chartHeight;
        });
    }

    /**
     * Draw only the current bar (incremental update)
     */
    drawCurrentBarOnly() {
        const startTotal = performance.now();

        if (this.currentBarSnapshots.length === 0) {
            return;
        }

        const { slicedData } = this.chart;
        if (!slicedData || !slicedData.length || this.tiles.length === 0) {
            // No texture yet, do full redraw
            console.log('[LiquidityHeatmap] No tiles yet, doing full redraw');
            this.drawAllBars();
            return;
        }

        // Find the current bar's position in slicedData (should be the last bar)
        const lastBar = slicedData[slicedData.length - 1];
        const lastBarDatetime = lastBar.timestamp || lastBar.datetime;

        // Check if current bar datetime matches the last visible bar
        if (this.getBarDatetime(lastBarDatetime) !== this.currentBarDatetime) {
            return;
        }

        const globalIndex = slicedData.length - 1;

        // Find which tile contains this bar
        const tile = this.tiles.find(t => globalIndex >= t.startIndex && globalIndex < t.endIndex);
        if (!tile) {
            console.warn(`[LiquidityHeatmap] Could not find tile for bar index ${globalIndex}`);
            return;
        }

        const localIndex = globalIndex - tile.startIndex;
        const liquidityHeight = this.calculateLiquidityHeight();
        const { minPrice, maxPrice, priceRange } = this.getPriceRange();

        // Clear the current bar column in the tile's pixel buffer (set to transparent)
        const startClear = performance.now();
        for (let row = 0; row < tile.height; row++) {
            const pixelIndex = (row * tile.width + localIndex) * 4;
            tile.pixelBuffer[pixelIndex] = 0;
            tile.pixelBuffer[pixelIndex + 1] = 0;
            tile.pixelBuffer[pixelIndex + 2] = 0;
            tile.pixelBuffer[pixelIndex + 3] = 0;
        }
        const clearTime = performance.now() - startClear;

        // Calculate averaged liquidity for current bar
        const startAverage = performance.now();
        const currentBarLiquidity = this.averageSnapshots(this.currentBarSnapshots);
        const currentSnapshot = {
            datetime: this.currentBarDatetime,
            liquidity: currentBarLiquidity,
        };
        const averageTime = performance.now() - startAverage;

        // Fill pixels for current bar
        const startFillPixels = performance.now();
        const { colorFns, thresholdData } = this.getColorFunctions();
        this.fillBarPixelsTile(currentSnapshot, localIndex, tile.width, tile.height, tile.pixelBuffer, minPrice, priceRange, liquidityHeight, colorFns, thresholdData);
        const fillPixelsTime = performance.now() - startFillPixels;

        // Update only this tile's texture
        const startTextureUpdate = performance.now();
        if (tile.baseTexture) {
            tile.baseTexture.resource.update();
        }
        const textureUpdateTime = performance.now() - startTextureUpdate;

        const totalTime = performance.now() - startTotal;

        console.log(`[LiquidityHeatmap] Incremental update performance:
  - Clear column: ${clearTime.toFixed(2)}ms
  - Average snapshots: ${averageTime.toFixed(2)}ms
  - Fill pixels: ${fillPixelsTime.toFixed(2)}ms
  - Texture update: ${textureUpdateTime.toFixed(2)}ms
  - TOTAL: ${totalTime.toFixed(2)}ms`);
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
            // Clear color cache since values will be different
            if (this.colorCache) {
                this.colorCache.clear();
            }
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
        // Stop auto-draw interval
        this.stopAutoDrawInterval();

        // Destroy texture resources
        this.destroyTextures();

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

        // Clear color cache
        if (this.colorCache) {
            this.colorCache.clear();
        }

        // Reset flags
        this.initialized = false;
        this.hasDrawnInitial = false;
    }
}
