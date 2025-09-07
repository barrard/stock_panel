// GenericDataHandler.js
// A generic data handler for Pixi.js-based charts
import { extent, scaleLinear, select, zoom, zoomTransform, mouse, interpolateNumber, interpolateLab } from "d3";
import { Graphics, Container, Rectangle, Text, TextMetrics, TextStyle, utils } from "pixi.js";
import Indicator from "./pixiChart/components/Indicator";
import { drawVolume, drawLine } from "./pixiChart/components/drawFns.js";
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

        //bind functions by default??
        // this.drawLine = drawLine.bind(this);

        this.init();
    }

    setNewBar(bar) {
        const lastBar = this.ohlcDatas.slice(-1)[0];
        const lastSlicedData = this.slicedData.slice(-1)[0];
        let shouldAddToSlicedData = false;
        if (lastSlicedData.datetime === lastBar.datetime) {
            shouldAddToSlicedData = true;
        }
        if (!lastBar.symbol) {
            bar.symbol = this.symbol;
            this.ohlcDatas[this.ohlcDatas.length - 1] = bar;
            this.currentBar = null;
            if (shouldAddToSlicedData) {
                this.sliceEnd = this.ohlcDatas.length + 1;
                this.slicedData[this.slicedData.length - 1] = bar;
            }
        } else {
            this.currentBar = null;

            this.ohlcDatas.push(bar);
            if (shouldAddToSlicedData) {
                // this.slicedData.push(bar);
                this.sliceEnd++;
            }
        }
        this.draw();
    }

    newTick(tick) {
        if (!tick) return;
        if (!this.lastTick) {
            this.lastTick = tick;
        }

        const lastVol = this.lastTick.totalVol || this.lastTick.volume || tick.totalVol;

        const totalNewVol = tick.totalVol - lastVol;
        // add this tick to the "currentBar"
        if (!this.currentBar) {
            //mock a new candlestick
            this.currentBar = {
                datetime: new Date().getTime(),
                open: tick.lastPrice,
                close: tick.lastPrice,
                low: tick.lastPrice,
                high: tick.lastPrice,
                volume: totalNewVol,
            };
            this.ohlcDatas.push(this.currentBar);
            this.lastTick = tick;
            this.sliceEnd++;
        } else {
            const lastBar = this.ohlcDatas.slice(-1)[0];

            if (!lastBar.open) {
                lastBar.open = tick.lastPrice;
            }

            lastBar.close = tick.lastPrice;
            if (lastBar.high < tick.lastPrice) {
                lastBar.high = tick.lastPrice;
            }

            if (lastBar.low > tick.lastPrice) {
                lastBar.low = tick.lastPrice;
            }
            const lastVol = this.lastTick.totalVol || this.lastTick.volume || 0;

            lastBar.volume += totalNewVol;

            this.updateCurrentPriceLabel(tick.lastPrice);

            this.draw();
            this.lastTick = tick;
        }
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

    updateY____Label({ yLabel, gfx, txt, color }) {
        txt.text = yLabel;
        let { width, height } = TextMetrics.measureText(yLabel, this.darkTextStyle);
        try {
            gfx.clear();
        } catch (e) {
            console.log(e);
        }
        gfx.beginFill(color || 0x00ff00); // green

        gfx.lineStyle(1, 0x333333, 1);
        const padding = 10;
        const x = this.width + padding - (this.margin.left + this.margin.right);
        txt.x = x;
        gfx.position.x = x;

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
        this.priceScale = scaleLinear().range([this.mainChartContainerHeight - (this.margin.top + this.margin.bottom), 0]);
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

        this.xAxis = new PixiAxis({
            chart: this,
            type: "x",
            scale: this.xScale,
            maxTicks: 5,
            valueAccessor: this.getTime.bind(this),
            valueFinder: timeScaleValues,
        });
    }

    setupPriceScales() {
        const { allTicks, ohlcDatas, currentMinute } = this;
        if (!ohlcDatas.length) {
            return;
        }

        this.slicedData = ohlcDatas.slice(this.sliceStart, this.sliceEnd);

        const sd = this.slicedData;

        this.highs = sd.map(({ high }) => high);
        this.lows = sd.map(({ low }) => low);
        this.vols = sd.map(({ volume }) => volume);
        this.timestamps = sd.map(({ timestamp, datetime }) => timestamp || datetime);

        //DOMAIN
        this.xScale.domain([0, sd.length]);

        let [lowest] = extent(this.lows);
        let [_, highest] = extent(this.highs);
        let priceScalePadding = 2;

        if (this.options.chartType === "line") {
            let lastPrices = sd.map((ohlc) => ohlc[this.options.lineKey]);

            [lowest, highest] = extent(lastPrices);
        }

        lowest = roundTick(lowest - this.tickSize * priceScalePadding, this.tickSize);
        highest = roundTick(highest + this.tickSize * priceScalePadding, this.tickSize);
        this.priceScale.domain([lowest, highest]);

        //find the price ticks
        this.yAxis.render({ highest, lowest });
        this.xAxis.render({
            values: this.timestamps,
            // highest: this.xScale.range()[1],
            // lowest: this.xScale.range()[0],
        });
        //this essentially draws te indicator, but
        // that contract has yet to be decided
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
        this.lowerIndicatorsData = {
            // volume1: new Indicator({
            //     name: "volume",
            //     height: 200,
            //     data: [],
            //     drawFn: drawVolume,
            //     chart: this,
            //     accessors: "volume",
            // }),
            volume: new Indicator({
                name: "volume",
                height: this.indicatorHeight,
                data: [],
                drawFn: drawVolume,
                chart: this,
                accessors: "volume",
            }),

            // test: new Indicator({
            //     name: "test",
            //     height: indicatorHeight,
            //     data: [],
            //     drawFn: drawVolume,
            //     chart: this,
            //     accessors: "test",
            // }),
        };
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
                        : indicator.type == "line"
                        ? drawLine
                        : /**
						 * drawLine({
                lineColor: 0x3b82f6,
                lineWidth: 2,
                yField: "last",
                xScale: this.xScale,
                yScale: this.priceScale,
                data: this.slicedData,
                chartData: this,
                gfx: this.candleStickGfx,
            });
			 */
                          drawVolume,
                    chart: this,
                    accessors: indicator.accessors || indicator.name,
                });
            });
        }
        this.chartContainerOrder = [
            ...Object.keys(this.lowerIndicatorsData),
            // "volume",
            // "volume1",
            // "test",//shown as example
        ];
    }

    //layer is a number
    addToLayer(layerNumber, gfx) {
        const layerContainer = this.layers[layerNumber];
        layerContainer.addChild(gfx);
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

        this.mainChartContainer.addChild(this.layer0Container);
        this.mainChartContainer.addChild(this.layer1Container);
        this.mainChartContainer.addChild(this.layer2Container);
        this.mainChartContainer.addChild(this.layer3Container);
        this.mainChartContainer.addChild(this.layer4Container);

        this.layers = {
            0: this.layer0Container,
            1: this.layer1Container,
            2: this.layer2Container,
            3: this.layer3Container,
            4: this.layer4Container,
        };

        //  this.mainChartContainer.addChild(this.liquidityContainer);
        //setHitArea
        // const { left, right, top, bottom } = this.margin;

        // //add hit area for pointer events

        // this.mainChartContainer.interactive = true;
        // debugger;
        // // this.mainChartContainer.interactiveMousewheel = true
        // this.hitArea = new Rectangle(0, 0, this.width - (left + right), this.height - (top + bottom));
        // this.mainChartContainer.hitArea = this.hitArea;
        // this.mainChartContainer.addChild(this.xAxis.tickLinesGfx);
        // this.mainChartContainer.addChild(this.yAxis.tickLinesGfx);

        this.addToLayer(1, this.candleStickWickGfx);
        this.addToLayer(1, this.candleStickGfx);
        this.addToLayer(1, this.priceGfx);
        this.addToLayer(1, this.borderGfx);

        this.addToLayer(2, this.currentPriceLabelAppendGfx);
        this.addToLayer(2, this.currentPriceTxtLabel);
        this.addToLayer(1, this.volGfx);

        this.addToLayer(2, this.volProfileGfx);
        this.pixiApp.stage.addChild(this.indicatorContainer);
        this.pixiApp.stage.addChild(this.mainChartContainer);
        this.updateCurrentPriceLabel(this.ohlcDatas.slice(-1)[0]?.close);
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

        this.TW_symbol = new Text(this.fullSymbol?.current?.fullSymbol, this.darkTextStyle);
        this.TW_exchange = new Text(this.symbol.exchange, this.darkTextStyle);
        this.TW_exchange.resolution = 10;
        this.TW_value = new Text("", this.darkTextStyle);
        this.TW_BUY = new Text("BUY", this.darkTextStyle);
        this.TW_BUY.interactive = true;
        this.TW_BUY.on("click", this.BuyButtonClick);
        this.TW_SELL = new Text("SELL", this.darkTextStyle);
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
        this.darkTextStyle = new TextStyle({
            fontFamily: "Arial",
            fontSize: 20,
            fontWeight: "bold",
            fill: 0x333333,
            align: "center",
            userEvents: "none",
        });

        this.dateTxtLabel = new Text("", this.darkTextStyle);
        this.dateTxtLabel.anchor.x = 0.5;
        this.priceTxtLabel = new Text("", this.darkTextStyle);
        this.priceTxtLabel.anchor.y = 0.5;
        this.currentPriceTxtLabel = new Text("", this.darkTextStyle);
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
            if (this.drag && !this.gesture) {
                // this.hideCrosshair();
                if (!this.prevMouseX) {
                    this.prevMouseX = this.mouseX;
                    return;
                } else {
                    this.deltaDrag = this.mouseX - this.prevMouseX;
                    if (Math.abs(this.deltaDrag) < 5 || Math.abs(this.deltaDrag) < this.candleWidth) return;
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
            let yLabel, yScale;
            if (this.crossHairYScale) {
                yScale = this.crossHairYScale;
                yLabel = Math.floor(yScale.invert(this.mouseY - this.yMouseOffset + this.margin.top)).toString();
            } else {
                yScale = this.priceScale;
                yLabel = currencyFormatter.format(roundTick(yScale.invert(this.mouseY), this.tickSize));
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
                let { width, height } = TextMetrics.measureText(this.dateLabel, this.darkTextStyle);
                //X Date Label
                this.dateLabelAppendGfx.clear();
                this.dateLabelAppendGfx.beginFill(0x00ff00); // green

                this.dateLabelAppendGfx.lineStyle(1, 0x333333, 1);

                const padding = 5;
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

                const yPos = this.mainChartContainerHeight - this.margin.bottom + this.getIndicatorTopPos(index);
                //place the container at some place
                container.position.x = this.margin.left;
                container.position.y = yPos;

                //TEXT draw
                // gfx.beginFill(0xff0000);

                // gfx.drawRect(0, 0, this.innerWidth(), this.indicatorHeight);
                // container.addChild(gfx);

                //new canvas height
                this.height = yPos + height + this.margin.bottom;
                //resize the canvas
                this.pixiApp.renderer.resize(this.width, this.height);
                //add indicator container to the chart
                this.indicatorContainer.addChild(container);
                // this.addToLayer(1, container);

                //adjust xAxis position
                // console.log("adjust xAxis position");
                // this.xAxis.container.position.y = this.height - this.margin.bottom;
            } else {
                //setup the scales
                indicator.setupScales();

                //add axis
            }
        });
    }

    setHitArea() {
        const { left, right, top, bottom } = this.margin;

        //add hit area for pointer events
        this.mainChartContainer.interactive = true;
        // this.mainChartContainer.interactiveMousewheel = true
        this.hitArea = new Rectangle(0, 0, this.width - (left + right), this.mainChartContainerHeight - (top + bottom));
        this.mainChartContainer.hitArea = this.hitArea;
        console.log("setting hit area");
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
                // console.log("pointerdown");
                this.onMouseMove(e);
                this.onDragStart();
            })
            .on("pointerup", (e) => {
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
                this.onMouseMove(e);
            });

        //yAxis
        this.yAxis.container.position.x = this.width - this.margin.right;
        this.yAxis.container.position.y = 0;
        this.addToLayer(1, this.yAxis.container);
        //yAxis
        this.xAxis.container.position.x = this.margin.left;
        this.xAxis.container.position.y = this.innerHeight();
        this.addToLayer(1, this.xAxis.container);
    }

    //Drag and zoom mouse events
    onDragStart() {
        // console.log("onDragStart");
        // console.log(this.mouseX);
        this.hideCrosshair();

        this.drag = this.mouseX;
    }

    onDragEnd() {
        // console.log("onDragEnd");
        // console.log(this.mouseX);
        this.showCrosshair();
        this.drag = false;
        this.prevMouseX = false;
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
        this.crossHairYGfx.position.x = this.mouseX;
        this.crossHairXGfx.position.y = this.mouseY;
        this.priceLabelAppendGfx.position.y = this.mouseY;
        this.dateLabelAppendGfx.position.x = this.mouseX;
        this.dateTxtLabel.x = this.mouseX;
        this.priceTxtLabel.y = this.mouseY;
    }

    onMouseMove(e) {
        this.setMouse(e);
        if (!this.crosshair && !this.drag) return;

        // const price = this.priceScale.invert(this.mouseY);

        this.updateDateCrossHairLabel();
        this.updatePriceCrossHairLabel();
        if (this.openTradeWindow) {
            this.showTradeWindow(this.openTradeWindow);
        }
        if (this.drag && !this.gesture) {
            // this.hideCrosshair();
            if (!this.prevMouseX) {
                this.prevMouseX = this.mouseX;
                return;
            } else {
                this.deltaDrag = this.mouseX - this.prevMouseX;
                if (Math.abs(this.deltaDrag) < 5 || Math.abs(this.deltaDrag) < this.candleWidth) return;
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
        const candleCount = Math.ceil((this.deltaDrag * -1) / this.candleWidth);
        // console.log(`Move ${candleCount} candles`);
        this.sliceStart = this.sliceStart + candleCount;
        if (this.sliceEnd == this.ohlcDatas.length) {
        } else {
            this.sliceEnd = this.sliceEnd + candleCount;
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

        this.sliceStart = this.sliceStart - Math.ceil(takeFromLeft * amountToZoom);
        this.sliceEnd = this.sliceEnd + Math.ceil(takeFromRight * amountToZoom);

        if (this.sliceStart < 0) this.sliceStart = 0;
        if (this.sliceEnd > this.ohlcDatas.length) this.sliceEnd = this.ohlcDatas.length;
        this.draw();
    }

    calcZoom(zoomType) {
        // zoomType = "scroll";
        this.fixSliceValues();

        const zoomedLeft = this.sliceStart;
        const zoomedRight = this.ohlcDatas.length - this.sliceEnd;
        const totalZoomedAmount = zoomedLeft + zoomedRight;
        let amountToZoom, centered;

        if (zoomType === "scroll") {
            const zoomPerc = 0.1;
            amountToZoom = (this.ohlcDatas.length - totalZoomedAmount) * zoomPerc;
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
            this.candleStickGfx.beginFill(isUp ? 0x00ff00 : 0xff0000);

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
        this.fixSliceValues();

        this.setupPriceScales();
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
                lineColor: 0x3b82f6,
                lineWidth: 2,
                yField: "last",
                xScale: this.xScale,
                yScale: this.priceScale,
                data: this.slicedData,
                chartData: this,
                gfx: this.candleStickGfx,
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
    }

    fixSliceValues() {
        if (isNaN(this.sliceStart)) {
            this.sliceStart = 0;
        }
        if (isNaN(this.sliceEnd)) {
            this.sliceEnd = this.ohlcDatas.length;
        }
        if (this.sliceStart < 0) {
            this.sliceStart = 0;
        }
        if (this.sliceEnd > this.ohlcDatas.length) {
            this.sliceEnd = this.ohlcDatas.length;
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
        this.addToLayer(3, this.priceLabelAppendGfx);
        //TEXT
        this.addToLayer(3, this.dateTxtLabel);
        this.addToLayer(3, this.priceTxtLabel);
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
