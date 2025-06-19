import { Graphics, Container, Rectangle, Text, TextMetrics, TextStyle, utils } from "pixi.js";

class MonteCarloCone {
    constructor(pixiDataRef) {
        this.pixiDataRef = pixiDataRef;
        this.coneGfx = null;

        // Simulation parameters
        this.lookbackPeriods = 40; // Last 20 candles for returns
        this.simulationSteps = 20; // Simulate 30 periods forward
        this.numSimulations = 3000; // Run 100 simulations
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
    // calculateReturns(prices) {
    //     const returns = [];
    //     for (let i = 1; i < prices.length; i++) {
    //         const returnPct = (prices[i] - prices[i - 1]) / prices[i - 1];
    //         returns.push(returnPct);
    //     }
    //     return returns;
    // }

    // Add these methods to your MonteCarloCone class

    // Create histogram bins from all final returns
    createReturnsHistogram(numBins = 20) {
        const simulationResults = this.updateSimulation();
        if (!simulationResults) return null;

        // Get all final prices and convert to returns
        const allFinalPrices = simulationResults.allSimulations.map((sim) => sim[sim.length - 1]);
        const startPrice = simulationResults.startPrice;
        const allReturns = allFinalPrices.map((price) => (price - startPrice) / startPrice);

        // Find min and max returns
        const minReturn = Math.min(...allReturns);
        const maxReturn = Math.max(...allReturns);
        const range = maxReturn - minReturn;
        const binWidth = range / numBins;

        // Create bins
        const bins = [];
        for (let i = 0; i < numBins; i++) {
            const binStart = minReturn + i * binWidth;
            const binEnd = binStart + binWidth;
            const binCenter = binStart + binWidth / 2;

            bins.push({
                start: binStart,
                end: binEnd,
                center: binCenter,
                count: 0,
                percentage: 0,
                returns: [],
            });
        }

        // Populate bins
        allReturns.forEach((returnValue) => {
            // Find which bin this return belongs to
            let binIndex = Math.floor((returnValue - minReturn) / binWidth);
            // Handle edge case for maximum value
            if (binIndex >= numBins) binIndex = numBins - 1;

            bins[binIndex].count++;
            bins[binIndex].returns.push(returnValue);
        });

        // Calculate percentages
        bins.forEach((bin) => {
            bin.percentage = (bin.count / allReturns.length) * 100;
        });

        // Calculate cumulative probabilities
        let cumulativeCount = 0;
        bins.forEach((bin) => {
            cumulativeCount += bin.count;
            bin.cumulativePercentage = (cumulativeCount / allReturns.length) * 100;
        });

        return {
            bins,
            totalSimulations: allReturns.length,
            minReturn,
            maxReturn,
            meanReturn: allReturns.reduce((sum, r) => sum + r, 0) / allReturns.length,
            medianReturn: allReturns.sort((a, b) => a - b)[Math.floor(allReturns.length / 2)],
            statistics: this.calculateHistogramStats(bins, allReturns),
        };
    }

    // Calculate key statistics from histogram
    calculateHistogramStats(bins, allReturns) {
        const sortedReturns = [...allReturns].sort((a, b) => a - b);
        const total = sortedReturns.length;

        return {
            percentile_10: sortedReturns[Math.floor(0.1 * total)],
            percentile_25: sortedReturns[Math.floor(0.25 * total)],
            percentile_50: sortedReturns[Math.floor(0.5 * total)],
            percentile_75: sortedReturns[Math.floor(0.75 * total)],
            percentile_90: sortedReturns[Math.floor(0.9 * total)],
            probabilityOfGain: ((sortedReturns.filter((r) => r > 0).length / total) * 100).toFixed(1),
            probabilityOfLoss: ((sortedReturns.filter((r) => r < 0).length / total) * 100).toFixed(1),
            standardDeviation: this.calculateStandardDeviation(sortedReturns),
        };
    }

    calculateStandardDeviation(returns) {
        const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const squaredDifferences = returns.map((r) => Math.pow(r - mean, 2));
        const variance = squaredDifferences.reduce((sum, sq) => sum + sq, 0) / returns.length;
        return Math.sqrt(variance);
    }

    // Find the most likely return range
    findMostLikelyRange(histogram) {
        // Find the bin with highest frequency
        const maxBin = histogram.bins.reduce((max, bin) => (bin.percentage > max.percentage ? bin : max));

        return `${(maxBin.start * 100).toFixed(1)}% to ${(maxBin.end * 100).toFixed(1)}% (${maxBin.percentage.toFixed(1)}% chance)`;
    }

    // Draw histogram visualization on the chart
    drawReturnsHistogram() {
        const histogram = this.createReturnsHistogram(15); // 15 bins for good resolution
        if (!histogram) return;

        if (!this.coneGfx) {
            this.initializeGraphics();
            if (!this.coneGfx) return;
        }

        try {
            // Clear existing graphics
            this.coneGfx.clear();
            this.coneGfx.removeChildren().forEach((child) => child.destroy());

            // Position histogram in top-right corner of chart
            const chartWidth = this.pixiDataRef.current.width;
            const chartHeight = this.pixiDataRef.current.height;
            const histogramWidth = 200;
            const histogramHeight = 150;
            const histogramX = chartWidth - histogramWidth - 20;
            const histogramY = 20;

            // Draw background
            this.coneGfx.beginFill(0x000000, 0.8);
            this.coneGfx.drawRoundedRect(histogramX - 10, histogramY - 10, histogramWidth + 20, histogramHeight + 60, 8);
            this.coneGfx.endFill();

            // Find max count for scaling
            const maxCount = Math.max(...histogram.bins.map((bin) => bin.count));
            const barWidth = histogramWidth / histogram.bins.length;
            const maxBarHeight = histogramHeight - 40; // Leave space for labels

            // Draw bars
            histogram.bins.forEach((bin, index) => {
                const barHeight = (bin.count / maxCount) * maxBarHeight;
                const x = histogramX + index * barWidth;
                const y = histogramY + histogramHeight - barHeight - 20;

                // Color bars based on FREQUENCY/PROBABILITY (how likely each outcome is)
                const frequency = bin.percentage; // Percentage of simulations in this bin
                let barColor;

                if (frequency >= 8) {
                    barColor = 0x00ff00; // Bright green: Very likely outcomes (≥8% of simulations)
                } else if (frequency >= 5) {
                    barColor = 0x90ee90; // Light green: Likely outcomes (5-8%)
                } else if (frequency >= 3) {
                    barColor = 0xffff00; // Yellow: Moderately likely (3-5%)
                } else if (frequency >= 1.5) {
                    barColor = 0xffa500; // Orange: Less likely (1.5-3%)
                } else if (frequency >= 0.5) {
                    barColor = 0xff6347; // Light red: Unlikely (0.5-1.5%)
                } else {
                    barColor = 0xff0000; // Red: Very unlikely (<0.5%)
                }

                this.coneGfx.beginFill(barColor, 0.8);
                this.coneGfx.drawRect(x, y, barWidth - 1, barHeight);
                this.coneGfx.endFill();

                // Draw bar outline
                this.coneGfx.lineStyle(1, 0xffffff, 0.3);
                this.coneGfx.drawRect(x, y, barWidth - 1, barHeight);
            });

            // Add title
            const titleStyle = new TextStyle({
                fontFamily: "Arial",
                fontSize: 12,
                fill: 0xffffff,
                fontWeight: "bold",
            });
            const title = new Text("Return Distribution", titleStyle);
            title.x = histogramX + 10;
            title.y = histogramY - 5;
            this.coneGfx.addChild(title);

            // Add statistics text with frequency explanation
            const statsStyle = new TextStyle({
                fontFamily: "Arial",
                fontSize: 9,
                fill: 0xffffff,
                lineHeight: 12,
            });

            const stats = histogram.statistics;
            const statsText = [
                `Total Simulations: ${histogram.totalSimulations}`,
                `Most Likely Range: ${this.findMostLikelyRange(histogram)}`,
                `Median Return: ${(stats.percentile_50 * 100).toFixed(1)}%`,
                `Gain Probability: ${stats.probabilityOfGain}%`,
                `90th Percentile: ${(stats.percentile_90 * 100).toFixed(1)}%`,
                `10th Percentile: ${(stats.percentile_10 * 100).toFixed(1)}%`,
            ].join("\n");

            const statsLabel = new Text(statsText, statsStyle);
            statsLabel.x = histogramX + 10;
            statsLabel.y = histogramY + histogramHeight + 5;
            this.coneGfx.addChild(statsLabel);

            // Add legend for color coding
            const legendStyle = new TextStyle({
                fontFamily: "Arial",
                fontSize: 8,
                fill: 0xcccccc,
            });

            const legend = new Text("Green = Most Likely\nRed = Least Likely", legendStyle);
            legend.x = histogramX + histogramWidth - 70;
            legend.y = histogramY + 5;
            this.coneGfx.addChild(legend);

            // Add x-axis labels (return percentages)
            const labelStyle = new TextStyle({
                fontFamily: "Arial",
                fontSize: 8,
                fill: 0xcccccc,
            });

            // Show labels for first, middle, and last bins
            const labelIndices = [0, Math.floor(histogram.bins.length / 2), histogram.bins.length - 1];
            labelIndices.forEach((i) => {
                const bin = histogram.bins[i];
                const label = new Text(`${(bin.center * 100).toFixed(0)}%`, labelStyle);
                label.x = histogramX + i * barWidth + barWidth / 2 - 8;
                label.y = histogramY + histogramHeight - 15;
                this.coneGfx.addChild(label);
            });

            console.log("Returns histogram drawn with statistics:", stats);

            // Return the histogram data for further analysis
            return histogram;
        } catch (error) {
            console.error("Error drawing returns histogram:", error);
        }
    }

    // Method to log detailed histogram analysis
    logHistogramAnalysis() {
        const histogram = this.createReturnsHistogram(20);
        if (!histogram) return;

        console.log("=== MONTE CARLO RETURNS ANALYSIS ===");
        console.log(`Total simulations: ${histogram.totalSimulations}`);
        console.log(`Return range: ${(histogram.minReturn * 100).toFixed(2)}% to ${(histogram.maxReturn * 100).toFixed(2)}%`);
        console.log("\n--- KEY STATISTICS ---");
        console.log(`Probability of gain: ${histogram.statistics.probabilityOfGain}%`);
        console.log(`Probability of loss: ${histogram.statistics.probabilityOfLoss}%`);
        console.log(`Expected return (median): ${(histogram.statistics.percentile_50 * 100).toFixed(2)}%`);
        console.log(`Standard deviation: ${(histogram.statistics.standardDeviation * 100).toFixed(2)}%`);

        console.log("\n--- PERCENTILES ---");
        console.log(`10th percentile: ${(histogram.statistics.percentile_10 * 100).toFixed(2)}%`);
        console.log(`25th percentile: ${(histogram.statistics.percentile_25 * 100).toFixed(2)}%`);
        console.log(`75th percentile: ${(histogram.statistics.percentile_75 * 100).toFixed(2)}%`);
        console.log(`90th percentile: ${(histogram.statistics.percentile_90 * 100).toFixed(2)}%`);

        console.log("\n--- HISTOGRAM BINS ---");
        histogram.bins.forEach((bin, i) => {
            console.log(
                `Bin ${i + 1}: ${(bin.start * 100).toFixed(1)}% to ${(bin.end * 100).toFixed(1)}% | Count: ${
                    bin.count
                } (${bin.percentage.toFixed(1)}%)`
            );
        });
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
        // if (!this.needsNewSimulation()) {
        //     console.log("Using cached simulation results");
        //     return this.simulationResults;
        // }

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

        const returnAnalysis = this.analyzeReturnDistribution(allSimulations, startPrice);

        console.log("\n🎯 MONTE CARLO RESULTS:");
        console.log(
            `Most likely outcome: ${returnAnalysis.mostCommonBin.startPercent.toFixed(
                1
            )}% to ${returnAnalysis.mostCommonBin.endPercent.toFixed(1)}%`
        );
        console.log(`Probability of gain: ${returnAnalysis.gainProbability}%`);
        console.log(`Average expected return: ${(returnAnalysis.averageReturn * 100).toFixed(2)}%`);

        this.distributionAnalysis = returnAnalysis;

        return {
            returnAnalysis,
            allSimulations,
            returnStats,
            startPrice,
            startIndex,
            // Simple summary for quick access
            summary: {
                mostLikelyRange: `${returnAnalysis.mostCommonBin.startPercent.toFixed(
                    1
                )}% to ${returnAnalysis.mostCommonBin.endPercent.toFixed(1)}%`,
                probability: `${returnAnalysis.mostCommonBin.percentage.toFixed(1)}%`,
                gainChance: `${returnAnalysis.gainProbability}%`,
                expectedReturn: `${(returnAnalysis.averageReturn * 100).toFixed(2)}%`,
            },
        };
    }

    analyzeReturnDistribution(allSimulations, startPrice) {
        // Get all final returns (where each simulation ended up)
        const finalPrices = allSimulations.map((sim) => sim[sim.length - 1]);
        // const finalReturns = finalPrices.map((price) => (price - startPrice) / startPrice);

        console.log(`\n=== RETURN ANALYSIS ===`);
        console.log(`Starting price: $${startPrice}`);
        console.log(`Total simulations: ${finalPrices.length}`);

        // Create bins for returns
        const numBins = 20;
        const minReturn = Math.min(...finalPrices);
        const maxReturn = Math.max(...finalPrices);
        const range = maxReturn - minReturn;
        const binSize = range / numBins;

        console.log(`Return range: ${minReturn.toFixed(2)} to ${maxReturn.toFixed(2)}`);
        console.log(`Bin size: ${binSize.toFixed(2)}`);

        // Create bins
        const bins = [];
        for (let i = 0; i < numBins; i++) {
            const binStart = minReturn + i * binSize;
            const binEnd = binStart + binSize;

            bins.push({
                id: i,
                start: binStart,
                end: binEnd,
                center: binStart + binSize / 2,
                count: 0,
                percentage: 0,
                returns: [],
                startPercent: binStart,
                endPercent: binEnd,
                centerPercent: binStart + binSize / 2,
            });
        }

        // Count returns in each bin
        finalPrices.forEach((returnValue) => {
            // Find which bin this return belongs to
            let binIndex = Math.floor((returnValue - minReturn) / binSize);
            if (binIndex >= numBins) binIndex = numBins - 1; // Handle edge case

            bins[binIndex].count++;
            bins[binIndex].returns.push(returnValue);
        });

        // Calculate percentages
        bins.forEach((bin) => {
            bin.percentage = bin.count / finalPrices.length;
        });

        // Sort bins by count (most common first)
        const sortedBins = [...bins].sort((a, b) => b.count - a.count);

        console.log(`\n=== HISTOGRAM RESULTS ===`);
        console.log(`Bins sorted by frequency:`);

        sortedBins.forEach((bin, index) => {
            if (bin.count > 0) {
                console.log(
                    `${index + 1}. Return range: ${bin.startPercent.toFixed(1)} to ${bin.endPercent.toFixed(1)}% | Count: ${
                        bin.count
                    } (${bin.percentage.toFixed(1)}%)`
                );
            }
        });

        // Find most common outcome
        const mostCommonBin = sortedBins[0];
        console.log(`\n=== KEY FINDINGS ===`);
        console.log(
            `Most common outcome: ${mostCommonBin.startPercent.toFixed(1)}% to ${mostCommonBin.endPercent.toFixed(
                1
            )}% (${mostCommonBin.percentage.toFixed(1)}% of simulations)`
        );

        // Count gains vs losses
        const gains = finalPrices.filter((r) => r > 0);
        const losses = finalPrices.filter((r) => r < 0);
        const neutral = finalPrices.filter((r) => r === 0);

        console.log(`Gains: ${gains.length} (${(gains.length / finalPrices.length).toFixed(1)}%)`);
        console.log(`Losses: ${losses.length} (${(losses.length / finalPrices.length).toFixed(1)}%)`);
        console.log(`Neutral: ${neutral.length} (${(neutral.length / finalPrices.length).toFixed(1)}%)`);

        // Calculate average return
        const avgReturn = finalPrices.reduce((sum, r) => sum + r, 0) / finalPrices.length;
        console.log(`Average return: ${avgReturn.toFixed(2)}%`);

        return {
            bins,
            sortedBins,
            mostCommonBin,
            totalSimulations: finalPrices.length,
            gainProbability: (gains.length / finalPrices.length).toFixed(1),
            lossProbability: (losses.length / finalPrices.length).toFixed(1),
            averageReturn: avgReturn,
            minReturn,
            maxReturn,
            finalPrices,
        };
    }

    //////////////////////   Drawing functions   //////////////////////
    // Create 20-color gradient from green (high frequency) to red (low frequency)
    createFrequencyColorGradient() {
        // 20 colors from green to yellow to red
        return [
            0x00ff00, // Bright green - highest frequency
            0x33ff00,
            0x66ff00,
            0x99ff00,
            0xccff00,
            0xffff00, // Yellow - medium-high frequency
            0xffcc00,
            0xff9900,
            0xff6600,
            0xff3300,
            0xff0000, // Red - medium frequency
            0xff0033,
            0xff0066,
            0xff0099,
            0xff00cc,
            0xff00ff, // Magenta - low frequency
            0xcc00ff,
            0x9900ff,
            0x6600ff,
            0x3300ff, // Blue-violet - lowest frequency
        ];
    }

    // Map each bin to a color based on its frequency rank
    assignColorsToHistogramBins(histogramData) {
        // Sort bins by count (highest to lowest)
        const sortedBins = [...histogramData].sort((a, b) => b.count - a.count);

        // Get the color gradient
        const colors = this.createFrequencyColorGradient();

        // Assign colors based on frequency rank
        const colorMap = {};

        sortedBins.forEach((bin, index) => {
            // Map rank to color index (0-19)
            const colorIndex = Math.min(index, colors.length - 1);
            colorMap[bin.id] = {
                color: colors[colorIndex],
                rank: index + 1,
                frequency: bin.percentage,
                count: bin.count,
            };
        });

        return colorMap;
    }

    // Draw the histogram heatmap on your PIXI chart
    drawHistogramHeatmap() {
        if (!this.pixiDataRef.current || !this.pixiDataRef.current.ohlcDatas) {
            console.error("No PIXI data available");
            return;
        }
        if (!this.distributionAnalysis?.sortedBins) {
            console.error("No distribution analysis available");
            return;
        }

        // Clear existing graphics
        if (this.coneGfx) {
            this.coneGfx.clear();
            this.coneGfx.removeChildren().forEach((child) => child.destroy());
        } else {
            this.initializeGraphics();
        }

        const histogramData = this.distributionAnalysis.sortedBins;
        // Get color mapping
        const colorMap = this.assignColorsToHistogramBins(histogramData);

        // console.log("Color mapping:", colorMap);

        // Get chart dimensions
        const currentSliceLength = this.pixiDataRef.current.slicedData.length;
        const lastVisibleIndex = currentSliceLength - 1;
        const heatmapWidth = 5; // 5 candle widths

        // Draw heatmap bands for each bin
        for (let i = 0; i < heatmapWidth; i++) {
            const xIndex = lastVisibleIndex - heatmapWidth + i;
            const alpha = ((i + 1) / heatmapWidth) * 0.6; // Fade in effect

            this.drawHistogramBands(xIndex, histogramData, colorMap, alpha);
        }

        // Draw labels
        this.drawHistogramLabels(histogramData, colorMap, this.pixiDataRef);

        // console.log("✅ Histogram heatmap visualization complete!");
    }

    // Draw vertical bands for each price range
    drawHistogramBands(xIndex, histogramData, colorMap, alpha) {
        const x = this.pixiDataRef.current.xScale(xIndex);
        const candleWidth = this.pixiDataRef.current.candleWidth || 8;

        // Draw each bin as a colored rectangle
        histogramData.forEach((bin) => {
            if (bin.count === 0) return; // Skip empty bins

            // Get color for this bin
            const binColorInfo = colorMap[bin.id];
            const color = binColorInfo.color;

            // Convert price range to screen coordinates
            const topY = this.pixiDataRef.current.priceScale(bin.end);
            const bottomY = this.pixiDataRef.current.priceScale(bin.start);
            const height = bottomY - topY;

            if (height < 0.5) return; // Skip if too small to see

            // Draw the colored rectangle
            this.coneGfx.beginFill(color, alpha);
            this.coneGfx.drawRect(x, topY, candleWidth, height);
            this.coneGfx.endFill();

            // Optional: Add thin border for clarity
            this.coneGfx.lineStyle(0.5, 0xffffff, alpha * 0.3);
            this.coneGfx.drawRect(x, topY, candleWidth, height);
            this.coneGfx.lineStyle(0); // Reset line style
        });
    }

    // Draw labels showing key information
    drawHistogramLabels(histogramData, colorMap) {
        const currentSliceLength = this.pixiDataRef.current.slicedData.length;
        const lastVisibleIndex = currentSliceLength - 1;
        const x = this.pixiDataRef.current.xScale(lastVisibleIndex);
        const candleWidth = this.pixiDataRef.current.candleWidth || 8;

        // Text style
        const textStyle = new TextStyle({
            fontFamily: "Arial",
            fontSize: 9,
            fill: 0xffffff,
            stroke: 0x000000,
            strokeThickness: 1,
            align: "left",
        });

        // Find the top 3 most frequent bins
        const topBins = [...histogramData]
            .filter((bin) => bin.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);

        let labelY = 20;
        const labelSpacing = 15;

        // Label the most frequent bins
        topBins.forEach((bin, index) => {
            const binColorInfo = colorMap[bin.id];
            const priceRange = `$${bin.start.toFixed(2)} - $${bin.end.toFixed(2)}`;
            const frequency = `${bin.percentage.toFixed(1)}%`;

            let label;
            if (index === 0) {
                label = `Most Likely: ${priceRange} (${frequency})`;
            } else {
                label = `#${index + 1}: ${priceRange} (${frequency})`;
            }

            // Create text with color matching the bin
            const labelStyle = new TextStyle({
                ...textStyle,
                fill: binColorInfo.color,
                fontWeight: index === 0 ? "bold" : "normal",
            });

            const textLabel = new Text(label, labelStyle);
            textLabel.x = x + candleWidth + 5;
            textLabel.y = labelY;

            this.coneGfx.addChild(textLabel);
            labelY += labelSpacing;
        });

        // Add legend
        const legendStyle = new TextStyle({
            fontFamily: "Arial",
            fontSize: 8,
            fill: 0xcccccc,
        });

        const legend = new Text("Green = Most Likely\nRed = Least Likely", legendStyle);
        legend.x = x + candleWidth + 5;
        legend.y = labelY + 10;
        this.coneGfx.addChild(legend);
    }

    // Analysis function to understand your data
    // analyzeHistogramData(histogramData) {
    //     console.log("\n=== HISTOGRAM ANALYSIS ===");

    //     // Sort by frequency
    //     const sortedBins = [...histogramData].sort((a, b) => b.count - a.count);

    //     console.log("Top 5 most likely price ranges:");
    //     sortedBins.slice(0, 5).forEach((bin, index) => {
    //         console.log(
    //             `${index + 1}. $${bin.start.toFixed(2)} - $${bin.end.toFixed(2)}: ${bin.count} simulations (${bin.percentage.toFixed(1)}%)`
    //         );
    //     });

    //     // Calculate concentration
    //     const top3Count = sortedBins.slice(0, 3).reduce((sum, bin) => sum + bin.count, 0);
    //     const top5Count = sortedBins.slice(0, 5).reduce((sum, bin) => sum + bin.count, 0);
    //     const totalCount = histogramData.reduce((sum, bin) => sum + bin.count, 0);

    //     console.log(`\nConcentration Analysis:`);
    //     console.log(`Top 3 bins contain: ${((top3Count / totalCount) * 100).toFixed(1)}% of simulations`);
    //     console.log(`Top 5 bins contain: ${((top5Count / totalCount) * 100).toFixed(1)}% of simulations`);

    //     // Find the current price position
    //     const currentPrice = 596.95; // From your data
    //     const containingBin = histogramData.find((bin) => currentPrice >= bin.start && currentPrice <= bin.end);

    //     if (containingBin) {
    //         console.log(
    //             `Current price $${currentPrice} is in bin with ${containingBin.count} simulations (${containingBin.percentage.toFixed(1)}%)`
    //         );
    //     }

    //     return {
    //         mostLikely: sortedBins[0],
    //         top3Concentration: (top3Count / totalCount) * 100,
    //         top5Concentration: (top5Count / totalCount) * 100,
    //         currentPriceBin: containingBin,
    //     };
    // }

    drawHistogramVisualization(histogramData) {
        if (!this.pixiDataRef.current) return;

        if (!this.coneGfx) {
            this.initializeGraphics();
        }

        this.coneGfx.clear();
        this.coneGfx.removeChildren().forEach((child) => child.destroy());

        const colorMap = this.assignColorsToHistogramBins(histogramData);
        const currentSliceLength = this.pixiDataRef.current.slicedData.length;
        const lastVisibleIndex = currentSliceLength - 1;
        const heatmapWidth = 5;

        for (let i = 0; i < heatmapWidth; i++) {
            const xIndex = lastVisibleIndex - heatmapWidth + i;
            const alpha = ((i + 1) / heatmapWidth) * 0.6;
            this.drawHistogramBands(xIndex, histogramData, colorMap, alpha);
        }

        this.drawHistogramLabels(histogramData, colorMap);
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
