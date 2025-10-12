// GenericDataHandler.js
// A generic data handler for Pixi.js-based charts
import { extent, scaleLinear, select, zoom, zoomTransform, mouse, interpolateNumber, interpolateLab } from "d3";
import { Graphics, Container, Rectangle, Text, TextMetrics, TextStyle, utils } from "pixi.js";
import Indicator from "./pixiChart/components/Indicator";
import { drawVolume, drawLine, drawVolumeLines, calculateMovingAverage, drawOHLC } from "./pixiChart/components/drawFns.js";
import PixiAxis from "./pixiChart/components/PixiAxis";
import { timeScaleValues, priceScaleValues, compileOrders, currencyFormatter } from "./pixiChart/components/utils.js";

export default class GenericDataHandler {
    constructor({
        loadMoreData = () => {},
        ohlcDatas = [],
        pixiApp = null,
        width,
        height,
        mainChartContainerHeight,
        symbol = null,
        margin = {},
        tickSize,
        //chartType: "line", lineKey: "last", xKey: "timestamp"
        options = { chartType: "candlestick" },
        lowerIndicators = [],
    }) {
        if (symbol == "$SPX") {
            console.log(ohlcDatas);
            // debugger;
        }
        this.lowerIndicators = lowerIndicators;
        this.options = options;
        this.loadMoreData = loadMoreData;
        this.ohlcDatas = ohlcDatas;
        this.pixiApp = pixiApp;
        // this.loadData = loadData;
        this.width = width;
        this.height = height;
        this.symbol = symbol;
        this.margin = margin;
        this.initialized = false;
        this.mainChartContainerHeight = mainChartContainerHeight;
        this.tickSize = tickSize;
        this.indicatorHeight = 50;
        this.currentBar = null;

        this.customDrawFns = {};

        // Domain caching properties
        this.slicedHighest = null;
        this.slicedLowest = null;
        this.slicedHighestIdx = null;
        this.slicedLowestIdx = null;

        // Manual scale override flags
        this.manualYScale = false;
        this.onManualScaleChange = null; // Callback for React state updates

        // Vertical panning state
        this.verticalPanning = false;
        this.lastPanY = null;
        this.panSensitivity = 0.002;
        this.prevMouseY = null;

        // Horizontal panning state (when manualYScale is active)
        this.horizontalPanOffset = 0; // Number of bars to offset from the right
        this.maxHorizontalPanOffset = 50000000000; // Maximum bars that can be panned
        this.fakeBars = []; // Generated fake bars for padding

        this.init();
    }

    setIsVerticalZooming(value) {
        this.isVerticalZooming = value;
    }

    calculateVolumeMovingAverage(period = 20) {
        // Calculate moving average for the entire dataset and store on each bar
        for (let i = 0; i < this.ohlcDatas.length; i++) {
            if (i < period - 1) {
                this.ohlcDatas[i].volumeAvg20 = null; // Not enough data points
            } else {
                let sum = 0;
                for (let j = 0; j < period; j++) {
                    sum += this.ohlcDatas[i - j].volume || 0;
                }
                this.ohlcDatas[i].volumeAvg20 = sum / period;
            }
        }
    }

    calculateCrosshairFontSize() {
        // Scale font size based on average of right and bottom margins
        const rightMargin = this.margin.right || 100;
        const bottomMargin = this.margin.bottom || 40;

        // Average the scaling factors from both margins
        const rightScale = rightMargin / 100; // base 100 -> 1.0
        const bottomScale = bottomMargin / 40; // base 40 -> 1.0
        const avgScale = (rightScale + bottomScale) / 2;

        // Base font size is 14, scale it
        const scaledSize = 14 * avgScale;

        // Clamp between 10 and 16
        return Math.max(10, Math.min(16, scaledSize));
    }

    calculateLabelPadding() {
        // Scale padding based on margins
        const rightMargin = this.margin.right || 100;
        const bottomMargin = this.margin.bottom || 40;
        const avgMargin = (rightMargin + bottomMargin) / 1.5;

        // Base padding is 5-10, scale it
        const scaledPadding = (avgMargin / 70) * 5; // base (100+40)/2=70 -> 5px

        // Clamp between 2 and 10
        return Math.max(2, Math.min(10, scaledPadding));
    }

    setManualYScale(value) {
        // console.log(`setManualYScale called with value: ${value}`);
        this.manualYScale = value;

        // Reset horizontal pan offset when switching to automatic mode
        if (!value) {
            this.horizontalPanOffset = 0;
            this.fakeBars = [];
        }

        if (this.onManualScaleChange) {
            this.onManualScaleChange(value);
        }
        console.log(`manualYScale is now: ${this.manualYScale}`);
    }

    generateFakeBars(count) {
        if (count <= 0 || !this.ohlcDatas.length) return;

        // Determine the base bar (last real bar or last fake bar)
        const lastRealBar = this.ohlcDatas[this.ohlcDatas.length - 1];
        const lastBar = this.fakeBars.length > 0 ? this.fakeBars[this.fakeBars.length - 1] : lastRealBar;
        const lastPrice = lastBar.close || lastBar.high || lastBar.low || 0;

        // Determine time increment based on existing data
        let timeIncrement = 60000; // Default 1 minute
        if (this.ohlcDatas.length >= 2) {
            const secondLast = this.ohlcDatas[this.ohlcDatas.length - 2];
            timeIncrement = (lastRealBar.timestamp || lastRealBar.datetime) - (secondLast.timestamp || secondLast.datetime);
        }

        // Append new fake bars to existing array
        for (let i = 1; i <= count; i++) {
            const fakeBar = {
                timestamp: (lastBar.timestamp || lastBar.datetime) + timeIncrement * i,
                datetime: (lastBar.timestamp || lastBar.datetime) + timeIncrement * i,
                open: lastPrice,
                high: lastPrice,
                low: lastPrice,
                close: lastPrice,
                volume: 0,
                isFake: true, // Mark as fake for styling/rendering
            };
            this.fakeBars.push(fakeBar);
        }
    }

    setNewBar(bar) {
        const lastBar = this.ohlcDatas.slice(-1)[0];
        const lastSlicedData = this.slicedData.slice(-1)[0];
        let shouldAddToSlicedData = false;
        if (lastSlicedData.datetime === lastBar.datetime) {
            shouldAddToSlicedData = true;
        }
        //i guess this means it came from rithmic? this is not great but oh well
        if (!lastBar?.symbol) {
            bar.symbol = this.symbol;
            // this.ohlcDatas[this.ohlcDatas.length - 1] = bar;
            this.ohlcDatas.push(bar);
            this.currentBar = null;
            if (shouldAddToSlicedData) {
                this.sliceEnd = this.ohlcDatas.length + 1;
                // this.slicedData[this.slicedData.length - 1] = bar;
                this.slicedData.push(bar);
            }
        } else {
            //else it's from Schwab, it's all about datetime start or end of bar
            this.currentBar = null;
            this.ohlcDatas.push(bar);
            const newBarIndex = this.ohlcDatas.length - 1;

            if (shouldAddToSlicedData) {
                this.sliceEnd++;
                // New bar is visible, so do incremental update
                if (this.slicedHighest === null || bar.high > this.slicedHighest) {
                    this.slicedHighest = bar.high;
                    this.slicedHighestIdx = newBarIndex;
                }
                if (this.slicedLowest === null || bar.low < this.slicedLowest) {
                    this.slicedLowest = bar.low;
                    this.slicedLowestIdx = newBarIndex;
                }
            }
        }

        // Recalculate volume moving average for new bar
        this.calculateVolumeMovingAverage();

        this.draw();
    }

    newTick(tick) {
        if (!tick) return;
        // if (!this.lastTick) {
        //     this.lastTick = tick;
        // }

        const volume = tick.totalVol || tick.volume?.low || tick.volume || 0;
        // const totalVol = tick.totalVol || tick.volume?.low || tick.volume || 0;
        // const totalNewVol = totalVol - volume;
        // add this tick to the "currentBar"
        if (!this.currentBar) {
            if (tick.datetime < new Date().getTime()) {
                this.currentBar = this.ohlcDatas.slice(-1)[0];
            } else {
                let newDateTime;
                if (new Date().getTime() < tick.datetime) {
                    const bar1 = this.ohlcDatas.slice(-1)[0];
                    const bar2 = this.ohlcDatas.slice(-2)[0];
                    newDateTime = bar1.datetime + (bar2.datetime - bar1.datetime);
                } else {
                    newDateTime = new Date().getTime();
                }
                //mock a new candlestick
                this.currentBar = {
                    datetime: newDateTime,
                    open: tick.lastPrice || tick.open,
                    close: tick.lastPrice || tick.close,
                    low: tick.lastPrice || tick.low,
                    high: tick.lastPrice || tick.high,
                    volume: volume || 0,
                };
                this.ohlcDatas.push(this.currentBar);
                this.lastTick = tick;
                this.sliceEnd++;
            }
        }
        // else {
        const lastBar = this.ohlcDatas.slice(-1)[0];
        const lastBarIndex = this.ohlcDatas.length - 1;

        if (!lastBar.open) {
            lastBar.open = tick.lastPrice || tick.open || tick.close || tick.lastPrice;
        }

        lastBar.close = tick.lastPrice || tick.close;
        if (lastBar.high < (tick.lastPrice || tick.high)) {
            lastBar.high = tick.lastPrice || tick.high;
        }

        if (lastBar.low > (tick.lastPrice || tick.low)) {
            lastBar.low = tick.lastPrice || tick.low;
        }
        // const volume = this.lastTick.totalVol || this.lastTick.volume || 0;

        lastBar.volume += volume;

        // Incremental domain update
        if (lastBar.high > this.slicedHighest) {
            this.slicedHighest = lastBar.high;
            this.slicedHighestIdx = lastBarIndex;
        } else if (lastBarIndex === this.slicedHighestIdx && lastBar.high < this.slicedHighest) {
            // The highest bar was modified to be lower, so we must rescan.
            this.slicedHighestIdx = null; // Invalidate cache
        }

        if (lastBar.low < this.slicedLowest) {
            this.slicedLowest = lastBar.low;
            this.slicedLowestIdx = lastBarIndex;
        } else if (lastBarIndex === this.slicedLowestIdx && lastBar.low > this.slicedLowest) {
            // The lowest bar was modified to be higher, so we must rescan.
            this.slicedLowestIdx = null; // Invalidate cache
        }

        this.updateCurrentPriceLabel(tick.lastPrice || tick.close);

        this.draw();
        this.lastTick = tick;
        // }
    }

    //Methods
    getTime(dateIndex) {
        // const dateIndex = Math.floor(this.xScale.invert(x));
        let date = this.slicedData[dateIndex]
            ? new Date(this.slicedData[dateIndex].timestamp || this.slicedData[dateIndex].datetime).toLocaleString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
              })
            : null;
        return date;
    }

    getIndicatorTopPos(index) {
        let totalHeight = 0;
        for (let x = 0; x < this.chartContainerOrder.length; x++) {
            let containerName = this.chartContainerOrder[x];
            const { name, height } = this.lowerIndicatorsData[containerName];
            if (x === index) break;
            totalHeight += height;
        }
        return totalHeight;
    }

    calcPriceDiff(currentPrice, crossHairPrice) {
        if (!currentPrice || !crossHairPrice) return {};

        const diff = crossHairPrice - currentPrice;
        const percent = (diff / currentPrice) * 100;

        return {
            difference: diff,
            percent: percent, // raw percent
            formatted: `${percent.toFixed(2)}%`, // nice string
        };
    }

    updateY____Label({ yLabel, yPercentLabel, gfx, txt, percentTxt, color }) {
        txt.text = yLabel;

        let { width, height } = TextMetrics.measureText(yLabel, this.darkTextStyle());
        try {
            gfx.clear();
        } catch (e) {
            console.log(e);
        }
        gfx.beginFill(color || 0x00ff00); // green

        gfx.lineStyle(1, 0x333333, 1);
        const padding = this.calculateLabelPadding();
        const x = this.width + padding - (this.margin.left + this.margin.right);
        txt.x = x;
        gfx.position.x = x;

        if (percentTxt) {
            percentTxt.text = yPercentLabel;
            percentTxt.x = x;
        }

        const coords = rightAxisMarkerTagLine({
            x,
            y: 0,
            w: width + padding,
            h: height + padding,
            padding,
        });

        gfx.drawPolygon(coords);

        gfx.endFill();
    }

    initXScale() {
        this.xScale = scaleLinear().range([0, this.width - (this.margin.left + this.margin.right)]);
    }
    initYScale() {
        this.priceScale = scaleLinear().range([this.mainChartContainerHeight, 0]);

        // Initialize volume scale for overlay (if volumeOverlay option is enabled)
        if (this.options.volumeOverlay) {
            this.volumeScale = scaleLinear().range([this.mainChartContainerHeight, 0]);
        }
    }
    initAxis() {
        this.yAxis = new PixiAxis({
            chart: this,
            type: "y",
            scale: this.priceScale,
            valueFinder: priceScaleValues,
            maxTicks: 5,
            tickSize: this.tickSize,
        });
        this.yAxis.container.position.x = this.width - this.margin.right;
        this.yAxis.container.position.y = 0;

        this.xAxis = new PixiAxis({
            chart: this,
            type: "x",
            scale: this.xScale,
            maxTicks: 5,
            valueAccessor: this.getTime.bind(this),
            valueFinder: timeScaleValues,
        });
        this.xAxis.container.position.x = this.margin.left;
        this.xAxis.container.position.y = this.innerHeight();
    }

    setupPriceScales() {
        const { ohlcDatas } = this;
        if (!ohlcDatas.length) {
            return;
        }

        // Create combined data array (real + fake bars)
        const combinedData = this.fakeBars.length > 0 ? [...ohlcDatas, ...this.fakeBars] : ohlcDatas;

        this.slicedData = combinedData.slice(this.sliceStart, this.sliceEnd);
        const sd = this.slicedData;
        if (sd.length === 0) return;

        // Only update Y scale domain if not manually overridden
        let lowest = this.slicedLowest;
        let highest = this.slicedHighest;
        this._scanLoops = 0;

        if (!this.manualYScale) {
            // Check if the cached min/max indices are outside the current visible slice.
            const isCacheInvalid =
                this.slicedHighestIdx === null ||
                this.slicedLowestIdx === null ||
                this.slicedHighestIdx < this.sliceStart ||
                this.slicedHighestIdx >= this.sliceEnd ||
                this.slicedLowestIdx < this.sliceStart ||
                this.slicedLowestIdx >= this.sliceEnd;

            if (isCacheInvalid) {
                let lowestIdx = -1,
                    highestIdx = -1;

                if (this.options.chartType === "line") {
                    const lineKey = this.options.lineKey;
                    highest = -Infinity;
                    lowest = Infinity;
                    for (let i = 0; i < sd.length; i++) {
                        const val = sd[i][lineKey];
                        if (val > highest) {
                            highest = val;
                            highestIdx = i;
                        }
                        if (val < lowest) {
                            lowest = val;
                            lowestIdx = i;
                        }
                        this._scanLoops++;
                    }
                } else {
                    // Candlestick
                    highest = -Infinity;
                    lowest = Infinity;
                    for (let i = 0; i < sd.length; i++) {
                        if (sd[i].high > highest) {
                            highest = sd[i].high;
                            highestIdx = i;
                        }
                        if (sd[i].low < lowest) {
                            lowest = sd[i].low;
                            lowestIdx = i;
                        }
                        this._scanLoops++;
                    }
                }

                // Update cache with new values and their absolute indices
                this.slicedHighest = highest;
                this.slicedLowest = lowest;
                this.slicedHighestIdx = this.sliceStart + highestIdx;
                this.slicedLowestIdx = this.sliceStart + lowestIdx;
            }
        }

        this.timestamps = sd.map(({ timestamp, datetime }) => timestamp || datetime);

        //DOMAIN
        this.xScale.domain([0, sd.length]);

        // Only update Y scale domain if not manually overridden
        if (!this.manualYScale) {
            let priceScalePadding = 2;

            if (lowest === null || highest === null || lowest === Infinity || highest === -Infinity) {
                lowest = 0;
                highest = 1;
            }

            const paddedLowest = roundTick(lowest - this.tickSize * priceScalePadding, this.tickSize);
            const paddedHighest = roundTick(highest + this.tickSize * priceScalePadding, this.tickSize);
            this.priceScale.domain([paddedLowest, paddedHighest]);

            //find the price ticks
            this.yAxis.render({ highest: paddedHighest, lowest: paddedLowest });
        }

        this.xAxis.render({
            values: this.timestamps,
        });

        // Set up volume scale domain if volumeOverlay is enabled
        if (this.options.volumeOverlay && this.volumeScale) {
            // Find max volume in visible data
            let maxVolume = 0;
            for (let i = 0; i < sd.length; i++) {
                const vol = sd[i].volume || 0;
                if (vol > maxVolume) {
                    maxVolume = vol;
                }
            }
            // Set domain from 0 to max volume (with some padding)
            this.volumeScale.domain([0, maxVolume * 1.1]);
        }
    }

    initScales() {
        this.initXScale();
        this.initYScale();

        this.initAxis();
        this.setupPriceScales();
        this.setYScale = (yScale) => {
            this.crossHairYScale = yScale;
        };
    }

    initDataViewable() {
        // this initializes for zoom and display purposes
        this.slicedData = [];
        this.sliceEnd = this.ohlcDatas.length;
        this.sliceStart = 0;
    }

    initIndicators() {
        this.lowerIndicatorsData = {};
        if (!this.options.withoutVolume) {
            this.lowerIndicatorsData = {
                volume: new Indicator({
                    name: "volume",
                    height: this.indicatorHeight,
                    data: [],
                    drawFn: drawVolume,
                    chart: this,
                    accessors: "volume",
                }),
            };
        }
        if (this.lowerIndicators.length) {
            this.lowerIndicators.forEach((indicator) => {
                this.lowerIndicatorsData[indicator.name] = new Indicator({
                    type: indicator.type,
                    name: indicator.name,
                    height: indicator.height || this.indicatorHeight,
                    lineColor: indicator.lineColor,
                    data: [],
                    drawFn: indicator.drawFn
                        ? indicator.drawFn
                        : indicator.type == "line" || indicator.type == "multi-line"
                        ? drawLine
                        : drawVolume,
                    chart: this,
                    accessors: indicator.accessors || indicator.name,
                    lines: indicator.lines || null, // Pass lines array for multi-line indicators
                });
            });
        }
        this.chartContainerOrder = [...Object.keys(this.lowerIndicatorsData)];
    }

    //layer is a number
    addToLayer(layerNumber, gfx) {
        const layerContainer = this.layers[layerNumber];
        if (layerContainer) {
            layerContainer.addChild(gfx);
        } else {
            console.error(`Layer ${layerNumber} does not exist.`);
        }
    }

    removeFromLayer(layerNumber, gfx) {
        const layerContainer = this.layers[layerNumber];
        if (gfx?.parent) {
            if (layerContainer && gfx.parent === layerContainer) {
                layerContainer.removeChild(gfx);
            } else {
                // Fallback if layer is wrong or gfx was moved
                gfx.parent.removeChild(gfx);
            }
        }
    }

    changeLayer(gfx, newLayerNumber) {
        if (gfx?.parent) {
            gfx.parent.removeChild(gfx);
        }
        this.addToLayer(newLayerNumber, gfx);
    }

    initContainers() {
        this.mainChartContainer = new Container();
        this.indicatorContainer = new Container();
        this.tradeWindowContainer = new Container();

        this.layer0Container = new Container();
        this.layer1Container = new Container();
        this.layer2Container = new Container();
        this.layer3Container = new Container();
        this.layer4Container = new Container();
        this.layer5Container = new Container(); //for text labels
        this.layer6Container = new Container(); //for text labels
        this.layer7Container = new Container(); //for text labels

        this.mainChartContainer.addChild(this.layer0Container);
        this.mainChartContainer.addChild(this.layer1Container);
        this.mainChartContainer.addChild(this.layer2Container);
        this.mainChartContainer.addChild(this.layer3Container);
        this.mainChartContainer.addChild(this.layer4Container);
        this.mainChartContainer.addChild(this.layer5Container);
        this.mainChartContainer.addChild(this.layer6Container);
        this.mainChartContainer.addChild(this.layer7Container);

        this.layers = {
            0: this.layer0Container,
            1: this.layer1Container,
            2: this.layer2Container,
            3: this.layer3Container,
            4: this.layer4Container,
            5: this.layer5Container,
            6: this.layer6Container,
            1000: this.layer7Container, //for text labels
        };

        this.addToLayer(1, this.candleStickWickGfx);
        this.addToLayer(1, this.candleStickGfx);
        this.addToLayer(1, this.priceGfx);
        this.addToLayer(3, this.borderGfx); // Layer 3 and 4 won't be masked

        this.addToLayer(4, this.currentPriceLabelAppendGfx);
        this.addToLayer(4, this.currentPriceTxtLabel);
        this.addToLayer(1, this.volGfx);

        this.addToLayer(2, this.volProfileGfx);

        // Add volume overlay graphics to layer 2 (above candlesticks but below crosshair)
        this.addToLayer(2, this.volumeLineGfx);
        this.addToLayer(2, this.avgVolumeLineGfx);

        // Add background text and position it in the center
        this.addToLayer(0, this.backgroundText);
        this.backgroundText.position.x = (this.width - (this.margin.left + this.margin.right)) / 2;
        this.backgroundText.position.y = this.mainChartContainerHeight / 2;
        this.pixiApp.stage.addChild(this.indicatorContainer);
        this.pixiApp.stage.addChild(this.mainChartContainer);
        const lastDataPoint = this.ohlcDatas.slice(-1)[0];
        if (lastDataPoint) {
            const price = this.options.chartType === "line" ? lastDataPoint[this.options.lineKey] : lastDataPoint.close;
            this.updateCurrentPriceLabel(price);
        }
    }
    initGraphics() {
        this.candleStickGfx = new Graphics();
        this.candleStickWickGfx = new Graphics();
        this.priceGfx = new Graphics();
        this.volGfx = new Graphics();
        this.volProfileGfx = new Graphics();
        this.crossHairYGfx = new Graphics();
        this.crossHairXGfx = new Graphics();
        this.borderGfx = new Graphics();

        // Volume overlay graphics (for drawing volume as lines on main chart)
        this.volumeLineGfx = new Graphics();
        this.avgVolumeLineGfx = new Graphics();

        // Background watermark text
        const watermarkText = this.symbol || "hello world";
        this.backgroundText = new Text(
            watermarkText,
            new TextStyle({
                fontFamily: "Arial",
                fontSize: this.mainChartContainerHeight / 2,
                fontWeight: "bold",
                fill: 0xfff5ff,
                align: "center",
            })
        );
        this.backgroundText.alpha = 0.2;

        this.backgroundText.anchor.set(0.5, 0.5);
    }
    initTradeWindow() {
        //TRADE WINDOW
        this.tradeWindowGfx = new Graphics();
        this.TW_BuyButtonGfx = new Graphics();
        this.TW_BuyButtonGfx.interactive = true;
        this.TW_BuyButtonGfx.buttonMode = true;
        this.BuyButtonClick = (e) => {
            // Add your click handler code here
            console.log(this.TW_BUY.text);
            console.log(e);

            const priceType = this.TW_BUY.text === "LIMIT" ? 1 : 4;

            this.sendOrder({ transactionType: 1, limitPrice: this.TW_Price, priceType, symbolData: this.fullSymbol?.current });
            // console.log(`Buy ${this.TW_BUY.text} Button clicked!`);
        };
        this.TW_BuyButtonGfx.on("click", this.BuyButtonClick);
        this.TW_SellButtonGfx = new Graphics();
        this.TW_SellButtonGfx.interactive = true;
        this.TW_SellButtonGfx.buttonMode = true;
        this.SellButtonClick = (e) => {
            // Add your click handler code here
            console.log(this);
            console.log(e);

            console.log(this.TW_SELL.text);
            const priceType = this.TW_SELL.text === "LIMIT" ? 1 : 4;

            // console.log(`Sell ${this.TW_SELL.text} Button clicked!`);
            this.sendOrder({ transactionType: 2, limitPrice: this.TW_Price, priceType, symbolData: this.fullSymbol?.current });
        };
        this.TW_SellButtonGfx.on("click", this.SellButtonClick);
        this.tradeWindowContainer.addChild(this.tradeWindowGfx);
        this.tradeWindowContainer.addChild(this.TW_BuyButtonGfx);
        this.tradeWindowContainer.addChild(this.TW_SellButtonGfx);

        this.TW_symbol = new Text(this.fullSymbol?.current?.fullSymbol, this.darkTextStyle());
        this.TW_exchange = new Text(this.symbol.exchange, this.darkTextStyle());
        this.TW_exchange.resolution = 10;
        this.TW_value = new Text("", this.darkTextStyle());
        this.TW_BUY = new Text("BUY", this.darkTextStyle());
        this.TW_BUY.interactive = true;
        this.TW_BUY.on("click", this.BuyButtonClick);
        this.TW_SELL = new Text("SELL", this.darkTextStyle());
        this.TW_SELL.interactive = true;
        this.TW_SELL.on("click", this.SellButtonClick);
        this.tradeWindowContainer.addChild(this.TW_symbol);
        this.tradeWindowContainer.addChild(this.TW_exchange);
        this.tradeWindowContainer.addChild(this.TW_value);
        this.tradeWindowContainer.addChild(this.TW_BUY);
        this.tradeWindowContainer.addChild(this.TW_SELL);
    }
    initCrossHair() {
        //LABELS
        this.dateLabelAppendGfx = new Graphics();
        this.priceLabelAppendGfx = new Graphics();
        this.currentPriceLabelAppendGfx = new Graphics();
        this.darkTextStyle = (opts = {}) => {
            const { fontFamily = "Arial", fontSize, fontWeight = "bold", fill = 0x333333, align = "center", userEvents = "none" } = opts;

            // Calculate default font size based on margins if not provided
            const defaultFontSize = fontSize || this.calculateCrosshairFontSize();

            return new TextStyle({
                fontFamily,
                fontSize: defaultFontSize,
                fontWeight,
                fill,
                align,
                userEvents,
            });
        };

        this.dateTxtLabel = new Text("", this.darkTextStyle());
        this.dateTxtLabel.anchor.x = 0.5;
        this.priceTxtLabel = new Text("", this.darkTextStyle());
        this.priceTxtLabel.anchor.y = 0.5;
        this.percentTxtLabel = new Text("", this.darkTextStyle());
        this.percentTxtLabel.anchor.y = 0.5;
        this.currentPriceTxtLabel = new Text("", this.darkTextStyle());
        this.currentPriceTxtLabel.anchor.y = 0.5;

        this.onMouseMove = (e) => {
            this.setMouse(e);
            if (!this.crosshair && !this.drag) return;

            // const price = this.priceScale.invert(this.mouseY);

            this.updateDateCrossHairLabel();
            this.updatePriceCrossHairLabel();
            if (this.openTradeWindow) {
                this.showTradeWindow(this.openTradeWindow);
            }
            if (this.drag && !this.gesture && !this.isVerticalZooming) {
                // console.log(`Drag detected in crosshair onMouseMove: drag=${this.drag}, manualYScale=${this.manualYScale}`);

                // Handle both horizontal and vertical dragging
                let horizontalDrag = false;

                // Handle horizontal (timeline) dragging
                if (!this.prevMouseX) {
                    this.prevMouseX = this.mouseX;
                } else {
                    this.deltaDrag = this.mouseX - this.prevMouseX;
                    if (Math.abs(this.deltaDrag) >= 5 && Math.abs(this.deltaDrag) >= this.candleWidth) {
                        horizontalDrag = true;
                    }
                }

                // Handle vertical (price) dragging when Y scale is manual
                if (this.manualYScale && this.prevMouseY !== null) {
                    const deltaY = this.mouseY - this.prevMouseY;
                    if (Math.abs(deltaY) >= 2) {
                        this.handleVerticalPan(deltaY);
                        this.prevMouseY = this.mouseY;
                    }
                }

                // Execute horizontal drag if detected
                if (horizontalDrag) {
                    // Manage fake bars BEFORE panning when in manual Y scale mode
                    if (this.manualYScale) {
                        this.manageFakeBars(this.deltaDrag);
                    }

                    // Always do normal panning
                    if (this.deltaDrag > 0) {
                        this.dragRight();
                    } else if (this.deltaDrag < 0) {
                        this.dragLeft();
                    }

                    this.prevMouseX = this.mouseX;
                }
            }
        };
        this.getDate = (x) => {
            const dateIndex = Math.floor(this.xScale.invert(x));
            let date = this.slicedData[dateIndex]
                ? new Date(this.slicedData[dateIndex].timestamp || this.slicedData[dateIndex].datetime).toLocaleString("en-US", {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                  })
                : null;
            return date;
        };
        this.updatePriceCrossHairLabel = () => {
            if (!this.crosshair) return;
            let yLabel, yScale, yPercentLabel;
            if (this.crossHairYScale) {
                yScale = this.crossHairYScale;
                const rawValue = yScale.invert(this.mouseY - this.yMouseOffset + this.margin.top);

                // Determine appropriate decimal places based on scale range
                const [domainMin, domainMax] = yScale.domain();
                const range = Math.abs(domainMax - domainMin);

                let decimalPlaces;
                if (range < 1) {
                    decimalPlaces = 3; // Small values like 0.3-0.6
                } else if (range < 10) {
                    decimalPlaces = 2; // Medium small values
                } else if (range < 100) {
                    decimalPlaces = 1; // Medium values
                } else {
                    decimalPlaces = 0; // Large values like volume or prices
                }

                const value = Number(rawValue.toFixed(decimalPlaces));
                yLabel = value.toLocaleString(undefined, {
                    minimumFractionDigits: decimalPlaces,
                    maximumFractionDigits: decimalPlaces,
                });

                // Check if this is the volume indicator and has a current average
                const volumeIndicator = this.lowerIndicatorsData?.volume;
                if (volumeIndicator && volumeIndicator.currentAverage && volumeIndicator.currentAverage > 0) {
                    const percentFromAvg = ((value - volumeIndicator.currentAverage) / volumeIndicator.currentAverage) * 100;
                    yPercentLabel = `${percentFromAvg.toFixed(1)}%`;
                }
            } else if (this.options.volumeOverlay && this.volumeScale) {
                // Check if mouse is in upper half (volume overlay) or lower half (price)
                const chartMidpoint = this.mainChartContainerHeight / 2;

                if (this.mouseY < chartMidpoint) {
                    // Upper half - show volume with percentage from 20-period average
                    yScale = this.volumeScale;
                    const volumeValue = Math.floor(yScale.invert(this.mouseY));
                    yLabel = volumeValue.toLocaleString(); // Format with commas

                    // Calculate 20-period average for last visible bar
                    const avgPeriod = this.options.volumeAvgPeriod || 20;
                    const avgVolumes = calculateMovingAverage(this.slicedData, avgPeriod, "volume");
                    const lastAvgVolume = avgVolumes[avgVolumes.length - 1];

                    if (lastAvgVolume && lastAvgVolume > 0) {
                        const percentFromAvg = ((volumeValue - lastAvgVolume) / lastAvgVolume) * 100;
                        yPercentLabel = `${percentFromAvg.toFixed(1)}%`;
                    }
                } else {
                    // Lower half - show price with percentage from current price
                    yScale = this.priceScale;
                    const value = roundTick(yScale.invert(this.mouseY), this.tickSize);
                    yLabel = currencyFormatter.format(value);
                    const { difference, percent, formatted } = this.calcPriceDiff(this.lastPrice, value);
                    yPercentLabel = formatted;
                }
            } else {
                yScale = this.priceScale;
                const value = roundTick(yScale.invert(this.mouseY), this.tickSize);
                yLabel = currencyFormatter.format(value);
                const { difference, percent, formatted } = this.calcPriceDiff(this.lastPrice, value);
                yPercentLabel = formatted;
            }

            if (!yLabel) return;
            if (yLabel === this.yLabel) {
                return;
            } else {
                this.yLabel = yLabel;

                this.updateY____Label({
                    yLabel: this.yLabel,
                    gfx: this.priceLabelAppendGfx,
                    txt: this.priceTxtLabel,
                    percentTxt: this.percentTxtLabel,
                    yPercentLabel,
                });
            }
        };
        this.updateDateCrossHairLabel = () => {
            if (!this.crosshair) return;
            let date = this.getDate(this.mouseX);

            if (!date) return;
            if (date === this.dateLabel) {
                return;
            } else {
                this.dateLabel = date;
                this.dateTxtLabel.text = this.dateLabel;
                let { width, height } = TextMetrics.measureText(this.dateLabel, this.darkTextStyle());
                //X Date Label
                this.dateLabelAppendGfx.clear();
                this.dateLabelAppendGfx.beginFill(0x00ff00); // green

                this.dateLabelAppendGfx.lineStyle(1, 0x333333, 1);

                const padding = this.calculateLabelPadding();
                const y = this.height - (this.margin.bottom + this.margin.top - padding);
                this.dateTxtLabel.position.y = y + padding;
                const coords = bottomAxisMarkerTagLine({
                    x: 0,
                    y: y,
                    w: width,
                    h: height,
                    padding,
                });

                this.dateLabelAppendGfx.drawPolygon(coords);

                this.dateLabelAppendGfx.endFill();
            }
        };
    }

    initLowerIndicators() {
        //add lower indicator containers
        this.chartContainerOrder.forEach((lowerIndicatorName, index) => {
            const indicator = this.lowerIndicatorsData[lowerIndicatorName];
            if (!indicator.initialized) {
                indicator.init();
                let { container, name, scale, gfx, initialized, height } = indicator;

                const yPos = this.mainChartContainerHeight + this.margin.top + this.getIndicatorTopPos(index);
                //place the container at some place
                container.position.x = this.margin.left;
                container.position.y = yPos;

                //new canvas height
                this.height = yPos + height + this.margin.bottom;
                //resize the canvas
                this.pixiApp.renderer.resize(this.width, this.height);
                //add indicator container to the chart
                this.indicatorContainer.addChild(container);
            } else {
                //setup the scales
                indicator.setupScales();

                //add axis
            }
        });

        // If there are no lower indicators, set the height to just the main chart + margins
        if (this.chartContainerOrder.length === 0) {
            this.height = this.mainChartContainerHeight + this.margin.top + this.margin.bottom;
            this.pixiApp.renderer.resize(this.width, this.height);
        }
    }

    setHitArea() {
        const { left, right, top, bottom } = this.margin;

        //add hit area for pointer events
        this.mainChartContainer.interactive = true;

        this.hitArea = new Rectangle(0, 0, this.width, this.mainChartContainerHeight);

        this.mainChartContainer.hitArea = this.hitArea;
        console.log("setting hit area");

        // Add mask to clip graphics within the main chart area (excluding margins and volume indicator)
        // Apply mask only to layers 0, 1, 2 (chart graphics), not to layer 1 (which has axes)
        const maskGfx = new Graphics();
        maskGfx.beginFill(0xffffff);
        maskGfx.drawRect(0, 0, this.width - (left + right), this.mainChartContainerHeight);
        maskGfx.endFill();

        // Add mask to a dedicated layer so it can be shared
        this.layer0Container.addChild(maskGfx);

        // Apply the same mask to layers that need clipping (not axes/crosshair layers)
        this.layer0Container.mask = maskGfx;
        this.layer1Container.mask = maskGfx;
        this.layer2Container.mask = maskGfx;
    }

    resize(width, height, mainChartContainerHeight) {
        this.width = width;
        this.height = height;
        if (mainChartContainerHeight) {
            this.mainChartContainerHeight = mainChartContainerHeight;
        }

        this.clearStage();

        this.init();
    }

    clearStage() {
        if (this.pixiApp && this.pixiApp.stage) {
            this.pixiApp.stage.removeChildren().forEach((child) => {
                if (child.destroy) {
                    child.destroy({ children: true, texture: true, baseTexture: true });
                }
            });
        }
    }

    init() {
        this.slicedHighest = null;
        this.slicedLowest = null;
        this.slicedHighestIdx = null;
        this.slicedLowestIdx = null;

        // Calculate volume moving average on initialization
        this.calculateVolumeMovingAverage();

        this.initDataViewable();
        this.initScales();
        // this.initCandlesticks();
        this.initIndicators();
        this.initCrossHair();
        this.initGraphics();
        this.initContainers();
        this.initTradeWindow();
        this.initLowerIndicators();
        this.setHitArea();
        this.drawCrossHair();

        // Initialize chart state, graphics, etc.
        this.initialized = true;
        // Example: this.graphics = new PIXI.Graphics();
        // if (this.pixiApp) this.pixiApp.stage.addChild(this.graphics);
        console.log("INITIALIZED");
        this.draw();
    }

    updateCurrentPriceLabel(price) {
        if (!price) return;

        if (
            !this.currentPriceLabelAppendGfx ||
            !this.currentPriceLabelAppendGfx?.transform ||
            !this.currentPriceLabelAppendGfx?.position ||
            !this.currentPriceTxtLabel
        )
            return;
        if (!this.lastPrice) {
            this.lastPrice = price;
        }
        const yScale = this.priceScale;
        const y = yScale(price);
        const currentPriceTxt = currencyFormatter.format(price, this.tickSize);

        const color = price > this.lastPrice ? 0x00ff00 : price < this.lastPrice ? 0xff0000 : 0xaaaaaa;

        this.currentPriceTxtLabel.y = y;
        this.currentPriceLabelAppendGfx.position.y = y;

        this.updateY____Label({
            yLabel: currentPriceTxt,
            gfx: this.currentPriceLabelAppendGfx,
            txt: this.currentPriceTxtLabel,
            color,
        });
        this.lastPrice = price;
    }

    drawCrossHair() {
        const { left, right, top, bottom } = this.margin;
        //Y Crosshair
        this.crossHairYGfx.clear();
        this.crossHairYGfx.lineStyle(1, 0xffffff, 1);
        this.crossHairYGfx.moveTo(0, 0);
        this.crossHairYGfx.lineTo(0, this.height - (bottom + top));

        //X Crosshair
        this.crossHairXGfx.clear();
        this.crossHairXGfx.lineStyle(1, 0xffff00, 1);
        this.crossHairXGfx.moveTo(0, 0);
        this.crossHairXGfx.lineTo(this.width - (right + left), 0);

        this.mainChartContainer.position.x = this.margin.left;
        this.mainChartContainer.position.y = this.margin.top;

        //Add chart borders
        this.borderGfx.clear();
        this.borderGfx.lineStyle(3, 0xaaaaaa, 1);

        const rightSide = this.width - (right + left);
        const bottomSide = this.height - (top + bottom);
        this.borderGfx.moveTo(0, 0);
        this.borderGfx.lineTo(rightSide, 0);
        this.borderGfx.lineTo(rightSide, bottomSide);
        this.borderGfx.lineTo(0, bottomSide);
        this.borderGfx.lineTo(0, 0);

        this.mainChartContainer
            // .on("mousewheel", (e) => {
            //     console.log(e);
            // })
            .on("pointerdown", (e) => {
                if (this.pointerdown) return;
                this.pointerdown = true;
                console.log("pointerdown event fired");
                this.onMouseMove(e);
                this.onDragStart();
            })
            .on("pointerup", (e) => {
                this.pointerdown = false;

                this.onDragEnd();
                // console.log(e.button);
                if (this.openTradeWindow && e.button !== 2) {
                    this.setTradeWindowPosition = true;
                } else {
                    this.setTradeWindowPosition = false;
                }
            })
            .on("pointerupoutside", () => this.onDragEnd())

            .on("pointermove", (e) => {
                // console.log("pointermove event fired, calling onMouseMove");
                try {
                    this.onMouseMove(e);
                } catch (error) {
                    console.error("Error in onMouseMove:", error);
                }
            });

        //yAxis
        // this.yAxis.container.position.x = this.width - this.margin.right;
        // this.yAxis.container.position.y = 0;
        this.addToLayer(3, this.yAxis.container); // Layer 3 won't be masked
        //xAxis
        // this.xAxis.container.position.x = this.margin.left;
        // this.xAxis.container.position.y = this.innerHeight();
        this.addToLayer(3, this.xAxis.container); // Layer 3 won't be masked
    }

    //Drag and zoom mouse events
    onDragStart() {
        // console.log("onDragStart");
        // console.log(this.mouseX);
        this.hideCrosshair();

        this.drag = this.mouseX;
        console.log(`onDragStart: Set drag to ${this.drag}`);

        // Always enable vertical panning when Y scale is manual
        if (this.manualYScale) {
            this.prevMouseY = this.mouseY;
            console.log(`Drag start: Set prevMouseY to ${this.prevMouseY} (manualYScale=${this.manualYScale})`);
        } else {
            console.log(`Drag start: manualYScale is false, not setting prevMouseY`);
        }
    }

    onDragEnd() {
        // console.log("onDragEnd");
        // console.log(this.mouseX);
        this.showCrosshair();
        this.drag = false;
        this.prevMouseX = false;

        // Reset vertical panning state
        this.prevMouseY = null;
    }

    setMouse(e) {
        const { left, right, top, bottom } = this.margin;
        if (e?.data?.global?.x) {
            this.mouseX = e.data.global.x;
            this.mouseY = e.data.global.y;
        } else if (e?.touches?.[0]?.screenX) {
            this.mouseX = e.touches[0].screenX;
            this.mouseY = e.touches[0].screenY;
        }
        this.mouseX = this.mouseX - left;
        this.mouseY = this.mouseY - top;
        if (
            (this.crosshair && (this.mouseX < 0 || this.mouseX > this.width - (right + left))) ||
            this.mouseY < 0 ||
            this.mouseY > this.height - (top + bottom)
        ) {
            this.hideCrosshair();
        } else if (!this.crosshair && this.mouseX > 0 && this.mouseX < this.width - (right + left)) {
            this.showCrosshair();
        }
        const spread = this.calculateLabelPadding();
        this.crossHairYGfx.position.x = this.mouseX;
        this.crossHairXGfx.position.y = this.mouseY;
        this.priceLabelAppendGfx.position.y = this.mouseY;
        this.dateLabelAppendGfx.position.x = this.mouseX;
        this.dateTxtLabel.x = this.mouseX;
        this.priceTxtLabel.y = this.mouseY - spread;
        this.percentTxtLabel.y = this.mouseY + spread;
    }

    onMouseMove(e) {
        console.log("onMouseMove: ENTRY");
        try {
            this.setMouse(e);
            console.log("onMouseMove: setMouse completed");
        } catch (error) {
            console.error("Error in setMouse:", error);
            return;
        }
        console.log(
            `onMouseMove: crosshair=${this.crosshair}, drag=${this.drag}, gesture=${this.gesture}, mouseX=${this.mouseX}, mouseY=${this.mouseY}`
        );
        if (!this.crosshair && !this.drag) {
            console.log("onMouseMove: returning early - no crosshair and no drag");
            return;
        }

        // const price = this.priceScale.invert(this.mouseY);

        this.updateDateCrossHairLabel();
        this.updatePriceCrossHairLabel();
        if (this.openTradeWindow) {
            this.showTradeWindow(this.openTradeWindow);
        }
        if (this.drag && !this.gesture) {
            console.log(`Drag detected: drag=${this.drag}, gesture=${this.gesture}, mouseX=${this.mouseX}, mouseY=${this.mouseY}`);
            // Handle both horizontal and vertical dragging
            let horizontalDrag = false;

            // Handle horizontal (timeline) dragging
            if (!this.prevMouseX) {
                this.prevMouseX = this.mouseX;
            } else {
                this.deltaDrag = this.mouseX - this.prevMouseX;
                if (Math.abs(this.deltaDrag) >= 5 && Math.abs(this.deltaDrag) >= this.candleWidth) {
                    horizontalDrag = true;
                }
            }

            // Handle vertical (price) dragging when Y scale is manual
            if (this.manualYScale && this.prevMouseY !== null) {
                const deltaY = this.mouseY - this.prevMouseY;
                if (Math.abs(deltaY) >= 2) {
                    this.handleVerticalPan(deltaY);
                    this.prevMouseY = this.mouseY;
                }
            }

            // Execute horizontal drag if detected
            if (horizontalDrag) {
                // Manage fake bars BEFORE panning when in manual Y scale mode
                if (this.manualYScale) {
                    this.manageFakeBars(this.deltaDrag);
                }

                // Always do normal panning
                if (this.deltaDrag > 0) {
                    this.dragRight();
                } else if (this.deltaDrag < 0) {
                    this.dragLeft();
                }

                this.prevMouseX = this.mouseX;
            }
        }
    }

    dragLeft() {
        if (this.longPress) return;
        //try to sub from left, and add to right
        const panAdjuster = this.slicedData.length / 1000 > 1 ? this.slicedData.length / 1000 : 1;
        const candleCount = Math.ceil((this.deltaDrag * (-1 * panAdjuster)) / this.candleWidth);
        const combinedLength = this.ohlcDatas.length + this.fakeBars.length;

        this.sliceStart = this.sliceStart + candleCount;
        // Always try to extend sliceEnd (it will be capped by draw/setupPriceScales if needed)
        this.sliceEnd = this.sliceEnd + candleCount;

        // Cap at combined length
        if (this.sliceEnd > combinedLength) {
            this.sliceEnd = combinedLength;
        }

        this.draw();
    }

    dragRight() {
        if (this.longPress) return;

        //try to sub from left, and add to left
        const candleCount = Math.ceil(this.deltaDrag / this.candleWidth);

        // console.log(`Move ${candleCount} candles`);
        this.sliceEnd = this.sliceEnd - candleCount;
        if (this.sliceStart == 0) {
            if (this.sliceStart === 0) {
                //load more data starting from 0 index of ohlc
                this.loadMoreData();
            }
        } else {
            this.sliceStart = this.sliceStart - candleCount;
        }
        this.draw();
    }

    zoomIn(delta) {
        const { takeFromLeft, takeFromRight, amountToZoom } = this.calcZoom(delta);

        this.sliceStart = this.sliceStart + Math.ceil(takeFromLeft * amountToZoom);
        this.sliceEnd = this.sliceEnd - Math.ceil(takeFromRight * amountToZoom);

        this.draw();
    }
    zoomOut(delta) {
        const { takeFromLeft, takeFromRight, amountToZoom } = this.calcZoom(delta);
        const combinedLength = this.ohlcDatas.length + this.fakeBars.length;

        this.sliceStart = this.sliceStart - Math.ceil(takeFromLeft * amountToZoom);
        this.sliceEnd = this.sliceEnd + Math.ceil(takeFromRight * amountToZoom);

        if (this.sliceStart < 0) this.sliceStart = 0;
        if (this.sliceEnd > combinedLength) this.sliceEnd = combinedLength;

        this.draw();
    }

    handleVerticalPan(deltaY) {
        // Get current domain
        const currentDomain = this.priceScale.domain();
        const [lowest, highest] = currentDomain;
        const range = highest - lowest;

        // console.log(`handleVerticalPan: deltaY=${deltaY}, current domain=[${lowest}, ${highest}], range=${range}`);

        // Calculate adjustment based on deltaY and sensitivity
        const adjustment = deltaY * this.panSensitivity * range;

        // Adjust the domain by moving both bounds (panning the view)
        const newLowest = lowest + adjustment;
        const newHighest = highest + adjustment;

        // console.log(`handleVerticalPan: adjustment=${adjustment}, new domain=[${newLowest}, ${newHighest}]`);

        // Update the price scale domain directly
        this.priceScale.domain([newLowest, newHighest]);

        // Re-render the axis with new domain
        this.yAxis.render({ highest: newHighest, lowest: newLowest });

        // Update current price label if it exists
        if (this.lastPrice) {
            this.updateCurrentPriceLabel(this.lastPrice);
        }
        this.draw();
    }

    manageFakeBars(deltaDrag) {
        const candleCount = Math.ceil(Math.abs(deltaDrag) / this.candleWidth);
        const combinedLength = this.ohlcDatas.length + this.fakeBars.length;

        if (deltaDrag < 0) {
            // Dragging left: check if at edge and add fake bars
            if (this.sliceEnd >= combinedLength) {
                this.generateFakeBars(candleCount);
            }
        } else {
            // Dragging right: remove fake bars if they exist
            if (this.fakeBars.length > 0) {
                const barsToRemove = Math.min(candleCount, this.fakeBars.length);
                this.fakeBars.splice(-barsToRemove, barsToRemove);
            }
        }

        // Note: No draw() call here - dragLeft/dragRight already call draw()
    }

    calcZoom(zoomType) {
        // zoomType = "scroll";
        this.fixSliceValues();

        const combinedLength = this.ohlcDatas.length + this.fakeBars.length;
        const zoomedLeft = this.sliceStart;
        const zoomedRight = combinedLength - this.sliceEnd;
        const totalZoomedAmount = zoomedLeft + zoomedRight;

        // Calculate visible window size
        const visibleWindowSize = this.sliceEnd - this.sliceStart;

        let amountToZoom, centered;

        if (zoomType === "scroll") {
            const zoomPerc = 0.1;
            // Use visible window size for zoom amount calculation
            amountToZoom = visibleWindowSize * zoomPerc;
            //determine how "centered" we are
            centered = this.mouseX / this.width;

            if (isNaN(centered)) {
                centered = 0.5;
            }
        } else {
            amountToZoom = Math.ceil(zoomType / this.candleWidth);
            //how many bars are in this many pixels?

            //determine how "centered" we are
            centered = 0.5;
        }

        const takeFromRight = 1 - centered;
        const takeFromLeft = 1 - takeFromRight;

        return { takeFromLeft, takeFromRight, amountToZoom };
    }

    drawAllCandles() {
        if (!this.slicedData.length) {
            return;
        }
        if (!this.candleStickGfx || !this.candleStickWickGfx) {
            return;
        }
        try {
            this.candleStickGfx.clear();
            this.candleStickWickGfx.clear();
        } catch (err) {
            // console.log("CLEAR() Error?");
            // console.log(err);
            return err;
        }

        this.candleWidth = (this.width - (this.margin.left + this.margin.right)) / this.slicedData.length;
        const halfWidth = this.candleWidth / 2;
        this.candleStickWickGfx.lineStyle(this.candleWidth * 0.1, 0xffffff, 0.9);
        const candleMargin = this.candleWidth * 0.1;
        const doubleMargin = candleMargin * 2;
        const strokeWidth = this.candleWidth * 0.1 > 2 ? 2 : this.candleWidth * 0.1;
        const halfStrokeWidth = strokeWidth / 2;
        const doubleStrokeWidth = strokeWidth * 2;
        this.candleStickGfx.lineStyle(strokeWidth, 0x111111, 0.9);

        this.slicedData.forEach((candle, i) => {
            // const x = this.xScale(candle.timestamp);
            const x = this.xScale(i);

            let open = this.priceScale(candle.open);
            let close = this.priceScale(candle.close);

            const high = this.priceScale(candle.high);
            const low = this.priceScale(candle.low);

            const isUp = open >= close;

            // Use different styling for fake bars
            if (candle.isFake) {
                this.candleStickGfx.beginFill(0x333333, 0.3); // Dark gray with transparency
            } else {
                this.candleStickGfx.beginFill(isUp ? 0x00ff00 : 0xff0000);
            }

            const height = Math.abs(open - close) || doubleStrokeWidth;
            const start = isUp ? close : open;
            // const end = isUp ? open : close;
            this.candleStickGfx.drawRect(
                x + candleMargin - halfWidth,
                start + halfStrokeWidth,
                this.candleWidth - doubleMargin,
                height - strokeWidth
            );

            this.candleStickWickGfx.moveTo(x, high);
            this.candleStickWickGfx.lineTo(x, low);
        });
    }

    registerDrawFn(name, drawFn) {
        this.customDrawFns[name] = drawFn;
    }

    unregisterDrawFn(name) {
        delete this.customDrawFns[name];
    }

    draw() {
        const drawStart = performance.now();
        let totalLoops = 0;

        this.fixSliceValues();

        const setupStart = performance.now();
        this.setupPriceScales();
        const setupEnd = performance.now();

        this.initLowerIndicators();

        // this.setupTickVolumeScales();
        // this.drawPriceLine();
        // this.drawTickVolumeLine();
        if (this.options.chartType === "candlestick") {
            this.drawAllCandles();
        } else if (this.options.chartType === "line") {
            //this candleWidth needs to exist for the drag/pan to work
            this.candleWidth = (this.width - (this.margin.left + this.margin.right)) / this.slicedData.length;

            drawLine({
                lineColor: this.options.lineColor || 0x3b82f6,
                lineWidth: 2,
                yField: this.options.lineKey || "last",
                xScale: this.xScale,
                yScale: this.priceScale,
                data: this.slicedData,
                chartData: this,
                gfx: this.candleStickGfx,
            });
        } else if (this.options.chartType === "OHLC") {
            drawOHLC({
                chart: this,
                gfx: this.candleStickGfx,
                wickGfx: this.candleStickWickGfx,
            });
        }

        // Draw volume overlay if enabled
        if (this.options.volumeOverlay && this.volumeScale) {
            drawVolumeLines({
                volumeColor: this.options.volumeColor || 0x00ffff,
                avgVolumeColor: this.options.avgVolumeColor || 0xff6600,
                lineWidth: this.options.volumeLineWidth || 1.5,
                avgPeriod: this.options.volumeAvgPeriod || 20,
                xScale: this.xScale,
                yScale: this.volumeScale,
                data: this.slicedData,
                chartData: this,
                volumeGfx: this.volumeLineGfx,
                avgVolumeGfx: this.avgVolumeLineGfx,
            });
        }

        Object.keys(this.customDrawFns).forEach((name) => {
            const drawFn = this.customDrawFns[name];
            drawFn();
        });

        // if (this.isDrawOrders) {
        //     this.drawOrders.draw(this.orders);
        // }
        // if (this.isDrawProfile) {
        //     this.marketProfile.draw();
        // }
        // if (this.isDrawZigZag) {
        //     this.zigZag.draw();
        // }
        // if (this.isDrawSupplyDemandZones) {
        //     this.supplyDemandZones.draw();
        // }
        // if (this.isDrawPivotPoints) {
        //     this.drawPivotPoints?.draw();
        // }

        // Performance logging
        const drawEnd = performance.now();
        const drawTime = (drawEnd - drawStart).toFixed(2);
        const setupTime = (setupEnd - setupStart).toFixed(2);

        if (this._perfLogCount === undefined) this._perfLogCount = 0;
        this._perfLogCount++;

        // Log every 30 frames (~0.5s at 60fps)
        if (this._perfLogCount % 30 === 0) {
            const scanInfo = this._scanLoops > 0 ? `| Scanned: ${this._scanLoops} loops` : "";
            console.log(
                `[PERF] Draw: ${drawTime}ms | Setup: ${setupTime}ms | Manual Y: ${this.manualYScale} | Slice: ${
                    this.sliceEnd - this.sliceStart
                } bars ${scanInfo}`
            );
        }
    }

    fixSliceValues() {
        const combinedLength = this.ohlcDatas.length + this.fakeBars.length;

        if (isNaN(this.sliceStart)) {
            this.sliceStart = 0;
        }
        if (isNaN(this.sliceEnd)) {
            this.sliceEnd = this.ohlcDatas.length;
        }
        if (this.sliceStart < 0) {
            this.sliceStart = 0;
        }
        if (this.sliceEnd > combinedLength) {
            this.sliceEnd = combinedLength;
        }
        if (this.sliceStart === 0) {
            while (this.sliceEnd <= this.sliceStart) {
                this.sliceEnd++;
            }
        } else {
            while (this.sliceEnd <= this.sliceStart) {
                this.sliceStart--;
            }
        }
    }

    updateData(newData) {
        this.ohlcDatas = newData;
        this.slicedHighestIdx = null; // Invalidate cache
        this.draw();
    }

    showCrosshair() {
        if (!this.pixiApp?.stage) return console.log("no stage");
        this.crosshair = true;

        this.addToLayer(3, this.crossHairXGfx);
        this.addToLayer(3, this.crossHairYGfx);
        this.addToLayer(3, this.tradeWindowContainer);
        //LABELS
        this.addToLayer(3, this.dateLabelAppendGfx);
        this.addToLayer(4, this.priceLabelAppendGfx);
        //TEXT
        this.addToLayer(3, this.dateTxtLabel);
        this.addToLayer(4, this.priceTxtLabel);
        this.addToLayer(4, this.percentTxtLabel);
    }

    hideCrosshair() {
        if (!this.pixiApp?.stage) return console.log("no stage");
        this.crosshair = false;
        this.crossHairXGfx.parent?.removeChild(this.crossHairXGfx);
        this.crossHairYGfx.parent?.removeChild(this.crossHairYGfx);
        //LABELS
        this.dateLabelAppendGfx.parent?.removeChild(this.dateLabelAppendGfx);
        this.priceLabelAppendGfx.parent?.removeChild(this.priceLabelAppendGfx);
        //TEXT
        this.dateTxtLabel.parent?.removeChild(this.dateTxtLabel);
        this.priceTxtLabel.parent?.removeChild(this.priceTxtLabel);
        this.percentTxtLabel.parent?.removeChild(this.percentTxtLabel);
    }

    destroy() {
        console.log("destroy");
        // this.ohlcDatas.length = 0;
        this.initialized = false;
    }

    innerWidth() {
        return this.width - (this.margin.right + this.margin.left);
    }

    innerHeight() {
        return this.height - (this.margin.top + this.margin.bottom);
    }
}

const bottomAxisMarkerTagLine = ({ x, y, w, h, padding }) => [
    { x: x + 0, y: 0 + y - padding },
    { x: x - (w / 2 + padding), y: y },
    { x: x - (w / 2 + padding), y: padding + h + y + padding },

    { x: x + (w / 2 + padding), y: padding + h + y + padding },
    { x: x + (w / 2 + padding), y: y },
    { x: x + 0, y: 0 + y - padding },
];

const rightAxisMarkerTagLine = ({ x, y, w, h, padding }) => [
    { x: 0 - padding, y: 0 + y },
    { x: 0, y: -h / 2 + y },
    { x: w, y: -h / 2 + y },
    { x: w, y: h / 2 + y },
    { x: 0, y: h / 2 + y },
    { x: 0 - padding, y: 0 + y },
];

function roundTick(number, tick) {
    const ticks = 1 / tick;
    return (Math.round(number * ticks) / ticks).toFixed(2);
}
