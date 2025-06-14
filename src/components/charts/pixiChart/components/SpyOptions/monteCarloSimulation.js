import { Graphics, Container, Rectangle, Text, TextMetrics, TextStyle, utils } from "pixi.js";

class MonteCarloCone {
    constructor(pixiDataRef) {
        this.pixiDataRef = pixiDataRef;
        this.coneGfx = null;

        // Simulation parameters
        this.lookbackPeriods = 20; // Last 20 candles for returns
        this.simulationSteps = 10; // Simulate 30 periods forward
        this.numSimulations = 1000; // Run 100 simulations
        this.percentiles = [10, 25, 50, 75, 90]; // Probability bands

        // Cached simulation results
        this.simulationResults = null;
        this.lastSimulationHash = null;

        this.initializeGraphics();
    }

    initializeGraphics() {
        try {
            if (this.pixiDataRef.current && this.pixiDataRef.current.mainChartContainer) {
                this.coneGfx = new Graphics();
                this.pixiDataRef.current.mainChartContainer.addChild(this.coneGfx);
            }
        } catch (error) {
            console.error("Failed to initialize Monte Carlo graphics:", error);
        }
    }

    // Calculate returns from price data
    calculateReturns(prices) {
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            const returnPct = (prices[i] - prices[i - 1]) / prices[i - 1];
            returns.push(returnPct);
        }
        return returns;
    }

    // Calculate enhanced returns using OHLC data
    calculateEnhancedReturns(candles) {
        const closeReturns = [];
        const trueRanges = [];

        for (let i = 1; i < candles.length; i++) {
            // Close-to-close return for direction/trend
            const closeReturn = (candles[i].close - candles[i - 1].close) / candles[i - 1].close;
            closeReturns.push(closeReturn);

            // True Range for volatility adjustment
            const high = candles[i].high;
            const low = candles[i].low;
            const prevClose = candles[i - 1].close;

            const trueRange =
                Math.max(
                    high - low, // Current bar range
                    Math.abs(high - prevClose), // Gap up
                    Math.abs(low - prevClose) // Gap down
                ) / prevClose;

            trueRanges.push(trueRange);
        }

        return { closeReturns, trueRanges };
    }

    // Get enhanced statistics from OHLC candles
    getEnhancedReturnStats(candles) {
        const { closeReturns, trueRanges } = this.calculateEnhancedReturns(candles);

        const meanReturn = closeReturns.reduce((sum, r) => sum + r, 0) / closeReturns.length;
        const meanTrueRange = trueRanges.reduce((sum, tr) => sum + tr, 0) / trueRanges.length;

        // Use close returns for direction, but true range for volatility
        const returnStdDev = Math.sqrt(closeReturns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / closeReturns.length);

        // Enhanced volatility that considers intraday moves
        const enhancedVolatility = Math.max(returnStdDev, meanTrueRange * 0.5);

        return {
            mean: meanReturn,
            stdDev: enhancedVolatility,
        };
    }

    // Generate random return using normal distribution (Box-Muller transform)
    generateRandomReturn(mean, stdDev) {
        // Box-Muller transform for normal distribution
        let u = 0,
            v = 0;
        while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
        while (v === 0) v = Math.random();

        const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        return mean + stdDev * z;
    }

    // Run a single price simulation
    runSingleSimulation(startPrice, returnStats) {
        const simulation = [startPrice];
        let currentPrice = startPrice;

        for (let step = 0; step < this.simulationSteps; step++) {
            const randomReturn = this.generateRandomReturn(returnStats.mean, returnStats.stdDev);
            currentPrice = currentPrice * (1 + randomReturn);
            simulation.push(currentPrice);
        }

        return simulation;
    }

    // Generate a hash to detect if we need to re-run simulation
    generateDataHash() {
        const recentCandles = this.pixiDataRef.current.ohlcDatas.slice(-this.lookbackPeriods);
        if (!recentCandles || recentCandles.length === 0) return null;

        // Create hash from recent prices and times
        const hashData = recentCandles.map((c) => `${c.time}_${c.close}_${c.high}_${c.low}`).join("|");
        return hashData;
    }

    // Check if simulation needs to be re-run
    needsNewSimulation() {
        const currentHash = this.generateDataHash();
        return !this.simulationResults || currentHash !== this.lastSimulationHash;
    }

    // Run simulation only when needed
    updateSimulation() {
        if (!this.needsNewSimulation()) {
            console.log("Using cached simulation results");
            return this.simulationResults;
        }

        console.log("Running new Monte Carlo simulation...");
        this.simulationResults = this.runMonteCarloSimulation();
        this.lastSimulationHash = this.generateDataHash();

        return this.simulationResults;
    }

    // Run all simulations and calculate percentiles (now private)
    runMonteCarloSimulation() {
        // Get the last N candles for historical returns
        const allData = this.pixiDataRef.current.ohlcDatas;
        const slicedData = this.pixiDataRef.current.slicedData; // Current visible slice
        const recentCandles = allData.slice(-this.lookbackPeriods);

        if (!recentCandles || recentCandles.length < this.lookbackPeriods) {
            console.warn("Not enough candle data for simulation");
            return null;
        }

        // Calculate enhanced return statistics
        const returnStats = this.getEnhancedReturnStats(recentCandles);

        console.log(
            `Enhanced Return Stats - Mean: ${(returnStats.mean * 100).toFixed(4)}%, Enhanced Volatility: ${(
                returnStats.stdDev * 100
            ).toFixed(4)}%`
        );

        // Starting price and index
        const startPrice = recentCandles[recentCandles.length - 1].close;
        const startIndex = slicedData.length - 1; // Last visible bar index

        // Run all simulations
        const allSimulations = [];
        for (let sim = 0; sim < this.numSimulations; sim++) {
            const simulation = this.runSingleSimulation(startPrice, returnStats);
            allSimulations.push(simulation);
        }

        // Calculate percentiles for each time step
        const percentileData = [];
        for (let step = 0; step <= this.simulationSteps; step++) {
            const pricesAtStep = allSimulations.map((sim) => sim[step]);
            pricesAtStep.sort((a, b) => a - b);

            const percentileValues = {};
            this.percentiles.forEach((p) => {
                const index = Math.floor((p / 100) * (pricesAtStep.length - 1));
                percentileValues[p] = pricesAtStep[index];
            });

            percentileData.push({
                index: startIndex + step, // Use index instead of time
                percentiles: percentileValues,
                median: percentileValues[50],
            });
        }
        debugger;
        return {
            percentileData,
            allSimulations,
            returnStats,
            startPrice,
            startIndex,
        };
    }

    // Updated drawVerticalProbabilityBand method with price labels and fixed percentile bands
    drawVerticalProbabilityBand(xIndex, percentileData, alpha) {
        const x = this.pixiDataRef.current.xScale(xIndex);
        const candleWidth = this.pixiDataRef.current.candleWidth || 8;

        // Fixed bands array - now includes the bottom 10th percentile section
        const bands = [
            { top: 90, bottom: 75, color: 0xff0000, label: "75-90%" }, // Red: 75-90th percentile
            { top: 75, bottom: 50, color: 0xffa500, label: "50-75%" }, // Orange: 50-75th percentile
            { top: 50, bottom: 25, color: 0x00ff00, label: "25-50%" }, // Green: 25-50th percentile
            { top: 25, bottom: 10, color: 0xffa500, label: "10-25%" }, // Orange: 10-25th percentile
            { top: 10, bottom: 0, color: 0xff0000, label: "0-10%" }, // Red: 0-10th percentile (ADDED)
        ];

        // Get the minimum price for the bottom band (we'll use a reasonable floor)
        const minPrice = Math.min(...Object.values(percentileData.percentiles)) * 0.8; // 20% below minimum percentile

        bands.forEach((band) => {
            let topPrice, bottomPrice;

            if (band.bottom === 0) {
                // Special case for bottom band - use calculated minimum
                topPrice = percentileData.percentiles[band.top];
                bottomPrice = minPrice;
            } else {
                topPrice = percentileData.percentiles[band.top];
                bottomPrice = percentileData.percentiles[band.bottom];
            }

            const topY = this.pixiDataRef.current.priceScale(topPrice);
            const bottomY = this.pixiDataRef.current.priceScale(bottomPrice);
            const height = bottomY - topY;

            // Draw the probability band
            this.coneGfx.beginFill(band.color, alpha);
            this.coneGfx.drawRect(x, topY, candleWidth, height);
            this.coneGfx.endFill();
        });

        // Draw median line
        const medianY = this.pixiDataRef.current.priceScale(percentileData.median);
        this.coneGfx.lineStyle(1, 0xffffff, alpha * 2);
        this.coneGfx.moveTo(x, medianY);
        this.coneGfx.lineTo(x + candleWidth, medianY);
    }

    // Add this new method to draw price labels on the rightmost heatmap column
    drawPriceLabels() {
        if (!this.pixiDataRef.current || !this.pixiDataRef.current.ohlcDatas) {
            return;
        }

        const simulationResults = this.updateSimulation();
        if (!simulationResults) return;

        const { percentileData } = simulationResults;
        const finalStep = percentileData[percentileData.length - 1];
        const currentSliceLength = this.pixiDataRef.current.slicedData.length;
        const lastVisibleIndex = currentSliceLength - 1;
        const x = this.pixiDataRef.current.xScale(lastVisibleIndex);
        const candleWidth = this.pixiDataRef.current.candleWidth || 8;

        // Text style for price labels
        const textStyle = new TextStyle({
            fontFamily: "Arial",
            fontSize: 10,
            fill: 0xffffff,
            stroke: 0x000000,
            strokeThickness: 1,
            align: "left",
        });

        // Draw labels for key percentiles
        const labelPercentiles = [90, 75, 50, 25, 10];

        labelPercentiles.forEach((percentile) => {
            const price = finalStep.percentiles[percentile];
            const y = this.pixiDataRef.current.priceScale(price);

            // Format price to appropriate decimal places
            const formattedPrice = price.toFixed(price < 1 ? 6 : 2);
            const labelText = `${percentile}%: $${formattedPrice}`;

            const label = new Text(labelText, textStyle);
            label.x = x + candleWidth + 5; // Position to the right of the heatmap
            label.y = y - 6; // Center vertically on the price level

            this.coneGfx.addChild(label);
        });

        // Add median label with different styling
        const medianStyle = new TextStyle({
            fontFamily: "Arial",
            fontSize: 11,
            fill: 0x00ffff, // Cyan for median
            stroke: 0x000000,
            strokeThickness: 1,
            fontWeight: "bold",
            align: "left",
        });

        const medianPrice = finalStep.median;
        const medianY = this.pixiDataRef.current.priceScale(medianPrice);
        const medianFormattedPrice = medianPrice.toFixed(medianPrice < 1 ? 6 : 2);
        const medianLabel = new Text(`Median: $${medianFormattedPrice}`, medianStyle);
        medianLabel.x = x + candleWidth + 5;
        medianLabel.y = medianY - 6;

        this.coneGfx.addChild(medianLabel);
    }

    // Updated drawProbabilityHeatmap method to include price labels
    drawProbabilityHeatmap() {
        if (!this.pixiDataRef.current || !this.pixiDataRef.current.ohlcDatas) {
            return;
        }

        if (!this.coneGfx) {
            this.initializeGraphics();
            if (!this.coneGfx) return;
        }

        const simulationResults = this.updateSimulation();
        if (!simulationResults) return;

        try {
            this.coneGfx.clear();
            this.coneGfx.removeChildren().forEach((child) => child.destroy());

            const { percentileData } = simulationResults;
            const finalStep = percentileData[percentileData.length - 1];
            const currentSliceLength = this.pixiDataRef.current.slicedData.length;
            const lastVisibleIndex = currentSliceLength - 1;

            // Draw heatmap bands from index-5 to index
            const heatmapWidth = 5;

            for (let i = 0; i < heatmapWidth; i++) {
                const xIndex = lastVisibleIndex - heatmapWidth + i;
                const alpha = ((i + 1) / heatmapWidth) * 0.3;

                this.drawVerticalProbabilityBand(xIndex, finalStep, alpha);
            }

            // Draw price labels on the rightmost column
            this.drawPriceLabels();

            console.log("Probability heatmap with price labels drawn");
        } catch (error) {
            console.error("Error drawing probability heatmap:", error);
        }
    }

    // Draw a probability band between two percentiles
    drawProbabilityBand(percentileData, lowerPercentile, upperPercentile, color, alpha) {
        if (percentileData.length < 2) return;

        this.coneGfx.beginFill(color, alpha);

        // Start the polygon
        const firstPoint = percentileData[0];
        const firstLowerY = this.pixiDataRef.current.priceScale(firstPoint.percentiles[lowerPercentile]);
        const firstX = this.pixiDataRef.current.xScale(firstPoint.index);

        this.coneGfx.moveTo(firstX, firstLowerY);

        // Draw upper boundary (forward)
        for (let i = 0; i < percentileData.length; i++) {
            const point = percentileData[i];
            const x = this.pixiDataRef.current.xScale(point.index);
            const upperY = this.pixiDataRef.current.priceScale(point.percentiles[upperPercentile]);

            // Only draw if the index is within the extended domain
            if (x >= 0 && x <= this.pixiDataRef.current.width) {
                this.coneGfx.lineTo(x, upperY);
            }
        }

        // Draw lower boundary (backward)
        for (let i = percentileData.length - 1; i >= 0; i--) {
            const point = percentileData[i];
            const x = this.pixiDataRef.current.xScale(point.index);
            const lowerY = this.pixiDataRef.current.priceScale(point.percentiles[lowerPercentile]);

            // Only draw if the index is within the extended domain
            if (x >= 0 && x <= this.pixiDataRef.current.width) {
                this.coneGfx.lineTo(x, lowerY);
            }
        }

        this.coneGfx.endFill();
    }

    // Draw the median projection line
    drawMedianLine(percentileData, color, alpha) {
        this.coneGfx.lineStyle(2, color, alpha);

        for (let i = 0; i < percentileData.length; i++) {
            const point = percentileData[i];
            const x = this.pixiDataRef.current.xScale(point.time);
            const y = this.pixiDataRef.current.priceScale(point.median);

            if (i === 0) {
                this.coneGfx.moveTo(x, y);
            } else {
                this.coneGfx.lineTo(x, y);
            }
        }
    }

    // Clean up
    cleanup() {
        try {
            if (this.coneGfx && this.pixiDataRef.current && this.pixiDataRef.current.mainChartContainer) {
                this.pixiDataRef.current.mainChartContainer.removeChild(this.coneGfx);
                this.coneGfx.destroy();
                this.coneGfx = null;
            }
        } catch (error) {
            console.error("Error during cleanup:", error);
        }
    }
}

// Usage example:
// const monteCarlo = new MonteCarloCone(pixiDataRef);
//
// // Run simulation when data changes (e.g., in useEffect)
// monteCarlo.updateSimulation();
//
// // Draw independently (e.g., on chart redraws)
// monteCarlo.drawProbabilityCone();

export default MonteCarloCone;
