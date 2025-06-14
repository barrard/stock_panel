import { Graphics, Container, Rectangle, Text, TextMetrics, TextStyle, utils } from "pixi.js";

class MonteCarloCone {
    constructor(pixiDataRef) {
        this.pixiDataRef = pixiDataRef;
        this.coneGfx = new Graphics();
        this.pixiDataRef.current.mainChartContainer.addChild(this.coneGfx);

        // Simulation parameters
        this.lookbackPeriods = 20; // Last 20 candles for returns
        this.simulationSteps = 30; // Simulate 30 periods forward
        this.numSimulations = 100; // Run 100 simulations
        this.percentiles = [10, 25, 50, 75, 90]; // Probability bands

        // Cached simulation results
        this.simulationResults = null;
        this.lastSimulationHash = null;
    }

    // Calculate returns using close prices, but adjust volatility using high-low range
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

    // Calculate returns from price data
    calculateReturns(prices) {
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            const returnPct = (prices[i] - prices[i - 1]) / prices[i - 1];
            returns.push(returnPct);
        }
        return returns;
    }

    // Get statistics from historical returns
    getReturnStats(returns) {
        const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        const stdDev = Math.sqrt(variance);

        return { mean, stdDev };
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
        const recentCandles = this.pixiDataRef.current.ohlcDatas.slice(-this.lookbackPeriods);

        if (!recentCandles || recentCandles.length < this.lookbackPeriods) {
            console.warn("Not enough candle data for simulation");
            return null;
        }

        // Calculate enhanced return statistics (using both close returns and true range)
        const returnStats = this.getEnhancedReturnStats(recentCandles);

        console.log(
            `Enhanced Return Stats - Mean: ${(returnStats.mean * 100).toFixed(4)}%, Enhanced Volatility: ${(
                returnStats.stdDev * 100
            ).toFixed(4)}%`
        );

        // Starting price (last close)
        const startPrice = recentCandles[recentCandles.length - 1].close;
        const startTime = recentCandles[recentCandles.length - 1].time;

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
                time: startTime + step * 60000, // Assuming 1-minute candles
                percentiles: percentileValues,
                median: percentileValues[50],
            });
        }

        return {
            percentileData,
            allSimulations,
            returnStats,
            startPrice,
            startTime,
        };
    }

    // Draw the probability cone (can be called independently)
    drawProbabilityCone() {
        if (!this.pixiDataRef.current || !this.pixiDataRef.current.ohlcDatas) {
            console.log("No chart data available for drawing");
            return;
        }

        // Update simulation if needed
        const simulationResults = this.updateSimulation();
        if (!simulationResults) {
            console.log("No simulation results to draw");
            return;
        }

        this.coneGfx.clear();

        const { percentileData } = simulationResults;

        // Colors for different probability bands
        const colors = {
            10: 0xff0000, // Red for extreme (10th percentile)
            25: 0xff8800, // Orange for 25th percentile
            50: 0x00ff00, // Green for median
            75: 0xff8800, // Orange for 75th percentile
            90: 0xff0000, // Red for extreme (90th percentile)
        };

        const alphas = {
            10: 0.1,
            25: 0.15,
            50: 0.3,
            75: 0.15,
            90: 0.1,
        };

        // Draw probability bands (from outside to inside)
        this.drawProbabilityBand(percentileData, 10, 90, colors[10], alphas[10]);
        this.drawProbabilityBand(percentileData, 25, 75, colors[25], alphas[25]);

        // Draw median line
        this.drawMedianLine(percentileData, colors[50], 0.8);

        console.log("Probability cone drawn with", percentileData.length, "data points");
    }

    // Draw a probability band between two percentiles
    drawProbabilityBand(percentileData, lowerPercentile, upperPercentile, color, alpha) {
        if (percentileData.length < 2) return;

        this.coneGfx.beginFill(color, alpha);

        // Start the polygon
        const firstPoint = percentileData[0];
        const firstLowerY = this.pixiDataRef.current.priceScale(firstPoint.percentiles[lowerPercentile]);
        const firstX = this.pixiDataRef.current.xScale(firstPoint.time);

        this.coneGfx.moveTo(firstX, firstLowerY);

        // Draw upper boundary (forward)
        for (let i = 0; i < percentileData.length; i++) {
            const point = percentileData[i];
            const x = this.pixiDataRef.current.xScale(point.time);
            const upperY = this.pixiDataRef.current.priceScale(point.percentiles[upperPercentile]);
            this.coneGfx.lineTo(x, upperY);
        }

        // Draw lower boundary (backward)
        for (let i = percentileData.length - 1; i >= 0; i--) {
            const point = percentileData[i];
            const x = this.pixiDataRef.current.xScale(point.time);
            const lowerY = this.pixiDataRef.current.priceScale(point.percentiles[lowerPercentile]);
            this.coneGfx.lineTo(x, lowerY);
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
        if (this.coneGfx && this.pixiDataRef.current) {
            this.pixiDataRef.current.mainChartContainer.removeChild(this.coneGfx);
            this.coneGfx.destroy();
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
