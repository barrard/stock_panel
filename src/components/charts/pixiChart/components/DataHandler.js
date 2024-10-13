import { axisBottom, axisRight, axisLeft, axisTop } from "d3-axis";
// import { scaleLinear, scaleTime, scaleBand } from "d3-scale";
import { extent, scaleLinear, select, zoom, zoomTransform, mouse, interpolateNumber, interpolateLab } from "d3";
import { Graphics, Container, Rectangle, Text, TextMetrics, TextStyle, utils } from "pixi.js";
import MarketProfile from "./MarketProfile";
import SupplyDemandZones from "./SupplyDemandZones";
import DrawOrders from "./DrawOrders";
import ZigZag from "./ZigZag";
import PivotPoints from "./PivotPoints";
import { TimeScale } from "chart.js";
import PixiAxis from "./PixiAxis";
import { timeScaleValues, priceScaleValues } from "./utils.js";
import { drawVolume } from "./drawFns.js";
import Indicator from "./Indicator";
import { eastCoastTime, isRTH } from "../../../../indicators/indicatorHelpers/IsMarketOpen";
import { TICKS } from "../../../../indicators/indicatorHelpers/TICKS";
import API from "../../../API";

export default class PixiData {
    constructor({
        ohlcDatas = [],
        viewPort,
        pixiApp,
        width,
        // height,
        indicatorHeight = 150,
        loadData,
        margin,
        // tickSize,
        // timeframe,
        symbol,
        fullSymbol = {},
        barType,
        barTypePeriod,
    }) {
        debugger;
        this.symbol = symbol;
        this.fullSymbol = fullSymbol;
        this.tickSize = TICKS()[symbol.value];
        this.barType = barType;
        this.barTypePeriod = barTypePeriod;
        this.allTicks = [];
        this.crossHairYScale = false;
        this.currentMinute = false;
        this.dateLabel = false;
        this.gesture = false;
        this.height = 600;
        this.indicatorHeight = indicatorHeight;
        this.initRun = false;
        this.loadData = loadData;
        this.mainChartContainerHeight = 400;
        this.margin = margin;
        this.mouseX = 0;
        this.ohlcDatas = [...ohlcDatas];
        this.pixiApp = pixiApp;
        this.priceScale = scaleLinear().range([this.mainChartContainerHeight - (margin.top + margin.bottom), 0]);
        this.slicedData = [];
        this.sliceEnd = ohlcDatas.length;
        this.sliceStart = 0;
        // this.timeframe = timeframe;
        this.touches = 0;
        this.viewPort = viewPort;
        this.volProfileScale = scaleLinear().range([width / 2, width]);
        this.width = width;
        this.xScale = scaleLinear().range([0, width - (margin.left + margin.right)]);
        this.yLabel = false;
        //Containers
        this.mainChartContainer = new Container();
        this.tradeWindowContainer = new Container();
        this.lowerIndicatorsData = {
            volume: new Indicator({
                name: "volume",
                height: indicatorHeight,
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

        this.chartContainerOrder = ["volume"];

        //vol data
        this.volProfileData = {};
        this.volData = {};

        this.candleStickGfx = new Graphics();
        this.candleStickWickGfx = new Graphics();
        this.priceGfx = new Graphics();
        this.volGfx = new Graphics();
        this.volProfileGfx = new Graphics();
        this.crossHairYGfx = new Graphics();
        this.crossHairXGfx = new Graphics();
        this.borderGfx = new Graphics();

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

            this.sendOrder({ transactionType: 1, limitPrice: this.TW_Price, priceType });
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
            this.sendOrder({ transactionType: 2, limitPrice: this.TW_Price, priceType });
        };
        this.TW_SellButtonGfx.on("click", this.SellButtonClick);
        this.tradeWindowContainer.addChild(this.tradeWindowGfx);
        this.tradeWindowContainer.addChild(this.TW_BuyButtonGfx);
        this.tradeWindowContainer.addChild(this.TW_SellButtonGfx);

        //Liquidity
        this.liquidityContainer = new Container();

        //LABELS
        this.dateLabelAppendGfx = new Graphics();
        this.priceLabelAppendGfx = new Graphics();
        this.currentPriceLabelAppendGfx = new Graphics();

        this.textStyle = new TextStyle({
            fontFamily: "Arial",
            fontSize: 20,
            fontWeight: "bold",
            fill: 0x333333,
            align: "center",
            userEvents: "none",
        });

        this.dateTxtLabel = new Text("", this.textStyle);

        this.priceTxtLabel = new Text("", this.textStyle);
        this.currentPriceTxtLabel = new Text("", this.textStyle);
        //TRADE WINDOW TEXT

        this.TW_symbol = new Text(this.fullSymbol?.current?.fullSymbol, this.textStyle);
        this.TW_exchange = new Text(this.symbol.exchange, this.textStyle);
        this.TW_exchange.resolution = 10;
        this.TW_value = new Text("", this.textStyle);
        this.TW_BUY = new Text("BUY", this.textStyle);
        this.TW_BUY.interactive = true;
        this.TW_BUY.on("click", this.BuyButtonClick);
        this.TW_SELL = new Text("SELL", this.textStyle);
        this.TW_SELL.interactive = true;
        this.TW_SELL.on("click", this.SellButtonClick);
        this.tradeWindowContainer.addChild(this.TW_symbol);
        this.tradeWindowContainer.addChild(this.TW_exchange);
        this.tradeWindowContainer.addChild(this.TW_value);
        this.tradeWindowContainer.addChild(this.TW_BUY);
        this.tradeWindowContainer.addChild(this.TW_SELL);

        this.yAxis = new PixiAxis({
            chart: this,
            type: "y",
            scale: this.priceScale,
            valueFinder: priceScaleValues,
            maxTicks: 15,
            tickSize: this.tickSize,
        });

        this.xAxis = new PixiAxis({
            chart: this,
            type: "x",
            scale: this.xScale,
            valueAccessor: this.getTime.bind(this),
            valueFinder: timeScaleValues,
        });

        this.dateTxtLabel.anchor.x = 0.5;
        this.priceTxtLabel.anchor.y = 0.5;
        this.currentPriceTxtLabel.anchor.y = 0.5;
        this.init(ohlcDatas);
    }

    init(ohlcDatas) {
        const { volProfileData, pixiApp } = this;

        if (!this.initRun) {
            //add the tick lines kinda first //TODO more background graphics
            this.mainChartContainer.addChild(this.liquidityContainer);
            this.mainChartContainer.addChild(this.xAxis.tickLinesGfx);
            this.mainChartContainer.addChild(this.yAxis.tickLinesGfx);

            // this.yAxis.container.position.x = this.width - this.margin.right;
            // this.yAxis.container.position.y = 0;
            // this.mainChartContainer.addChild(this.yAxis.container);
            this.mainChartContainer.addChild(this.currentPriceLabelAppendGfx);
            this.mainChartContainer.addChild(this.currentPriceTxtLabel);
        }

        if (!this.initRun || !this.ohlcDatas.length) {
            this.initRun = true;
            this.ohlcDatas = ohlcDatas;
            //initial load
            this.sliceStart = 0;
            this.sliceEnd = ohlcDatas.length;

            let firstTime = false;
            let lastTime;

            ohlcDatas.forEach((ohlc, index) => {
                if (!ohlc.ticks) {
                    ohlc.ticks = [];
                }
                ohlc.volData = {};

                //Volume Profile
                ohlc.ticks.forEach((tick) => {
                    const { datetime, volume, close } = tick;
                    if (!ohlc.volData[datetime]) {
                        ohlc.volData[datetime] = 0;
                    }
                    if (!volProfileData[close]) {
                        volProfileData[close] = 0;
                    }
                    volProfileData[close] += volume;
                    ohlc.volData[datetime] += volume;
                    // return acc;
                });
            });

            this.volProfileScale.domain([extent(Object.values(volProfileData))[1], 0]);

            this.sliceEnd = ohlcDatas.length;

            // this.setupTickVolumeScales(volumeContainer);
            // mainChartContainer
            this.setHitArea();
            this.drawCrossHair();
            this.setupPriceScales();
            //init market profile
            this.marketProfile = new MarketProfile(this);
            this.zigZag = new ZigZag(this);
            this.supplyDemandZones = new SupplyDemandZones(this);
            this.drawOrders = new DrawOrders(this);
            this.drawPivotPoints = new PivotPoints(this);

            this.mainChartContainer.addChild(this.candleStickWickGfx);
            this.mainChartContainer.addChild(this.candleStickGfx);
            this.mainChartContainer.addChild(this.priceGfx);
            this.mainChartContainer.addChild(this.borderGfx);

            this.mainChartContainer.addChild(this.volGfx);

            this.mainChartContainer.addChild(this.volProfileGfx);
            this.pixiApp.stage.addChild(this.mainChartContainer);
            this.updateCurrentPriceLabel(this.ohlcDatas.slice(-1)[0]?.close);
        } else {
            this.sliceStart += ohlcDatas.length;
            this.sliceEnd += ohlcDatas.length;
            this.ohlcDatas = ohlcDatas.concat(this.ohlcDatas);
            console.log("HERE???");

            this.marketProfile.init();
            this.zigZag.init();
            this.supplyDemandZones.init();

            this.draw();
        }
        this.loadingMoreData = false;
    }

    // setTimeframe(timeframe) {
    //     this.timeframe = timeframe;
    //     this.ohlcDatas.length = [];
    // }

    /**
     *
     * @param {transactionType} obj 1 == buy 2 == sell
     * priceType  1 == Limit 4 == stop market
     * limitPrice the price
     */
    async sendOrder({ transactionType, limitPrice, priceType }) {
        // alert(`${priceType} Sell ${limitPrice}`);
        debugger;
        let resp = await API.rapi_submitOrder({
            priceType,
            limitPrice,
            transactionType,
            symbol: this.fullSymbol?.current?.fullSymbol,
            exchange: this.symbol.exchange,
        });

        console.log(resp);
    }
    showTradeWindow(openTradeWindow) {
        //draw a window that follows the mouse
        this.openTradeWindow = openTradeWindow;
        if (this.setTradeWindowPosition) return;
        try {
            this.tradeWindowGfx.clear();
            if (!openTradeWindow) {
                // this.mainChartContainer.removeChild(this.tradeWindowContainer);
                this.tradeWindowContainer.position.set(-1000, -1000);
                return console.log("clear");
            }
        } catch (e) {
            console.log(e);
            return;
        }

        this.TW_symbol.text = this.fullSymbol?.current?.fullSymbol;
        console.log("this.showTradeWindow()");
        this.tradeWindowContainer.position.set(this.mouseX, this.mouseY);
        this.tradeWindowGfx.beginFill(0xcccccc);
        this.tradeWindowGfx.drawRect(0, 0, 200, 200);
        this.tradeWindowGfx.endFill();
        this.TW_Price = roundTick(this.priceScale.invert(this.mouseY), this.tickSize);
        this.TW_value.text = formatter.format(this.TW_Price);
        this.TW_value.position.set(25, 25);
        this.TW_symbol.position.set(25, 0);
        this.TW_exchange.position.set(125, 0);

        const buttonsY = 50;
        const leftBtnX = 25;
        const rightBtnX = 125;
        const buttonWidth = 50;
        const buttonHeight = 20;

        this.TW_SellButtonGfx.beginFill(0xff0000); // Fill color (green)
        this.TW_SellButtonGfx.drawRect(leftBtnX, buttonsY, buttonWidth, buttonHeight); // Button dimensions
        this.TW_SellButtonGfx.endFill();

        this.TW_BuyButtonGfx.beginFill(0x00ff00); // Fill color (green)
        this.TW_BuyButtonGfx.drawRect(rightBtnX, buttonsY, buttonWidth, buttonHeight); // Button dimensions
        this.TW_BuyButtonGfx.endFill();

        this.TW_BUY.position.set(rightBtnX, buttonsY);
        const BUY_TXT = !this.lastPrice ? "" : this.TW_Price > this.lastPrice ? "STOP" : "LIMIT";
        this.TW_BUY.text = BUY_TXT;

        this.TW_SELL.position.set(leftBtnX, buttonsY);
        const SELL_TXT = !this.lastPrice ? "" : this.TW_Price < this.lastPrice ? "STOP" : "LIMIT";
        this.TW_SELL.text = SELL_TXT;
    }

    disableIndicator(indicator, flag) {
        try {
            switch (indicator) {
                case "orderBook":
                    // if (!this.liquidityContainer._geometry) {
                    //     return alert("!this.liquidityContainer");
                    // }
                    this.isDrawOrderbook = flag;
                    if (!this.liquidityContainer?.transform) return;
                    if (!this.isDrawOrderbook) {
                        // console.log("remove");
                        this.mainChartContainer.removeChild(this.liquidityContainer);
                    } else {
                        // console.log("add");
                        this.mainChartContainer.addChild(this.liquidityContainer);
                        // this.marketProfile.init();
                    }
                    break;

                case "marketProfile":
                    // alert("marketProfile");

                    this.isDrawProfile = flag;
                    if (!this.marketProfile?.container?.transform) return;
                    if (!this.isDrawProfile) {
                        // console.log("remove");
                        this.mainChartContainer.removeChild(this.marketProfile.container);
                    } else {
                        // console.log("add");
                        this.mainChartContainer.addChild(this.marketProfile.container);
                        this.marketProfile.init();
                    }
                    break;

                case "supplyDemandZones":
                    this.isDrawSupplyDemandZones = flag;
                    if (!this.supplyDemandZones?.container?.transform) return;

                    if (!this.isDrawSupplyDemandZones) {
                        // console.log("remove");
                        this.mainChartContainer.removeChild(this.supplyDemandZones.container);
                    } else {
                        // console.log("add");
                        this.mainChartContainer.addChild(this.supplyDemandZones.container);
                        this.supplyDemandZones.init();
                    }
                    break;

                case "pivotLines":
                    this.isDrawPivotPoints = flag;
                    if (!this.drawPivotPoints?.container?.transform) return;

                    if (!this.isDrawPivotPoints) {
                        // console.log("remove");
                        this.mainChartContainer.removeChild(this.drawPivotPoints.container);
                    } else {
                        // console.log("add");
                        this.mainChartContainer.addChild(this.drawPivotPoints.container);
                        // this.zigZag.init();
                    }

                    break;

                case "zigZag":
                    this.isDrawZigZag = flag;
                    if (!this.zigZag?.container?.transform) return;

                    if (!this.isDrawZigZag) {
                        // console.log("remove");
                        this.mainChartContainer.removeChild(this.zigZag.container);
                    } else {
                        // console.log("add");
                        this.mainChartContainer.addChild(this.zigZag.container);
                        this.zigZag.init();
                    }

                    break;

                case "orders":
                    this.isDrawOrders = flag;
                    if (!this.drawOrders?.container?.transform) return;

                    if (!this.isDrawOrders) {
                        // console.log("remove");
                        this.mainChartContainer.removeChild(this.drawOrders.container);
                    } else {
                        // console.log("add");
                        this.mainChartContainer.addChild(this.drawOrders.container);
                        // this.drawOrders.init();
                    }

                    break;

                default:
                    alert(`implement ${indicator}`);
                    break;
            }
        } catch (error) {
            console.error(error);
        }
    }

    setLoadDataFn(fn) {
        this.loadData = fn;
    }
    setTimeframe({ barType, barTypePeriod }) {
        this.barType = barType;
        this.barTypePeriod = barTypePeriod;
    }
    setLiquidityData(data) {
        const { highLiquidity, bidSizeOrderRatio, askSizeOrderRatio, bidSizeToAskSizeRatio, bidOrderToAskOrderRatio, symbol } = data;
        if (symbol !== this.symbol.value) return;
        // console.log("set liquid data");
        this.liquidityData = highLiquidity;
        this.drawLiquidity();
    }
    prependData(data) {
        this.ohlcDatas = this.ohlcDatas.concat([data]);
        this.sliceEnd++;
        this.draw();
    }

    replaceLast(data, index) {
        if (index) {
            this.ohlcDatas[index] = data;
        } else {
            this.ohlcDatas[this.ohlcDatas.length - 1] = data;
        }
        this.draw();
    }
    setHitArea() {
        const { left, right, top, bottom } = this.margin;

        //add hit area for pointer events

        this.mainChartContainer.interactive = true;
        // this.mainChartContainer.interactiveMousewheel = true
        this.hitArea = new Rectangle(0, 0, this.width - (left + right), this.height - (top + bottom));
        this.mainChartContainer.hitArea = this.hitArea;
    }

    setYScale(yScale) {
        this.crossHairYScale = yScale;
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
                this.pixiApp.stage.addChild(container);

                //adjust xAxis position
                this.xAxis.container.position.y = this.height - this.margin.bottom;
            } else {
                //setup the scales
                indicator.setupScales();

                //add axis
            }
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
        this.timestamps = sd.map(({ timestamp }) => timestamp);

        //DOMAIN
        this.xScale.domain([0, sd.length]);

        let [lowest] = extent(this.lows);
        let [_, highest] = extent(this.highs);
        let priceScalePadding = 0.001;
        lowest = roundTick(lowest - priceScalePadding * lowest, this.tickSize);
        highest = roundTick(highest + priceScalePadding * highest, this.tickSize);
        this.priceScale.domain([lowest, highest]);

        //find the price ticks

        this.yAxis.render({ highest, lowest });

        this.xAxis.render({
            values: this.timestamps,
            // highest: this.xScale.range()[1],
            // lowest: this.xScale.range()[0],
        });

        this.initLowerIndicators();
    }

    setupTickVolumeScales(volumeContainer) {
        const { slicedData, volProfileData } = this;

        let max = -Infinity;
        slicedData.forEach((ohlc) => {
            const _max = Math.max(...Object.values(ohlc.volData));
            if (_max > max) {
                max = _max;
            }
        });

        this.tickVolScale.domain([0, max]);
    }

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

    draw() {
        this.fixSliceValues();

        this.setupPriceScales();

        // this.setupTickVolumeScales();
        // this.drawPriceLine();
        // this.drawTickVolumeLine();

        this.drawAllCandles();
        if (this.isDrawOrders) {
            this.drawOrders.draw(this.orders);
        }
        if (this.isDrawProfile) {
            this.marketProfile.draw();
        }
        if (this.isDrawZigZag) {
            this.zigZag.draw();
        }
        if (this.isDrawSupplyDemandZones) {
            this.supplyDemandZones.draw();
        }
        if (this.isDrawPivotPoints) {
            this.drawPivotPoints?.draw();
        }
    }

    setOrders(orders) {
        this.orders = orders;
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
        const currentPriceTxt = formatter.format(price, this.tickSize);

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

    updatePriceCrossHairLabel() {
        if (!this.crosshair) return;
        let yLabel, yScale;
        if (this.crossHairYScale) {
            yScale = this.crossHairYScale;
            yLabel = Math.floor(yScale.invert(this.mouseY - this.yMouseOffset + this.margin.top)).toString();
        } else {
            yScale = this.priceScale;
            yLabel = formatter.format(roundTick(yScale.invert(this.mouseY), this.tickSize));
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
    }

    updateY____Label({ yLabel, gfx, txt, color }) {
        txt.text = yLabel;
        let { width, height } = TextMetrics.measureText(yLabel, this.textStyle);
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

    getDate(x) {
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
    }

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

    updateDateCrossHairLabel() {
        if (!this.crosshair) return;
        let date = this.getDate(this.mouseX);

        if (!date) return;
        if (date === this.dateLabel) {
            return;
        } else {
            this.dateLabel = date;
            this.dateTxtLabel.text = this.dateLabel;
            let { width, height } = TextMetrics.measureText(this.dateLabel, this.textStyle);
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
    }

    setLastTwoDaysCompiled({ lastTwoDaysCompiled, lastWeeklyData, combinedKeyLevels }) {
        // console.log("setLastTwoDaysCompiled");
        this.lastTwoDaysCompiled = lastTwoDaysCompiled;
        this.lastWeeklyData = lastWeeklyData;
        this.combinedKeyLevels = combinedKeyLevels;
        // this.drawPivotPoints = new PivotPoints(this);
    }

    loadMoreData() {
        if (!this.loadingMoreData) {
            this.loadingMoreData = true;
            console.log("load more data");
            const finish = this.ohlcDatas.length ? this.ohlcDatas[0].timestamp : new Date().getTime();
            console.log({ finish: new Date(finish).toLocaleString() });

            this.loadData({
                barType: this.barType,
                barTypePeriod: this.barTypePeriod,
                // startIndex: new Date(finish - 1000 * 60 * 60 * 24).getTime(),
                finishIndex: new Date(finish).getTime(),
                symbol: this.symbol,
                // exchange :,
            });
        }
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
            //how pany bars are in this many pixels?

            //determine how "centered" we are
            centered = 0.5;
        }

        const takeFromRight = 1 - centered;
        const takeFromLeft = 1 - takeFromRight;

        return { takeFromLeft, takeFromRight, amountToZoom };
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
                this.onMouseMove(e);
                this.onDragStart();
            })
            .on("pointerup", (e) => {
                this.onDragEnd();
                console.log(e.button);
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
        this.yAxis.container.position.y = this.margin.top;
        this.pixiApp.stage.addChild(this.yAxis.container);
        //yAxis
        this.xAxis.container.position.x = this.margin.left;
        this.xAxis.container.position.y = this.height - this.margin.bottom;
        this.pixiApp.stage.addChild(this.xAxis.container);
    }

    drawLiquidity() {
        try {
            // console.log("draw liquid");
            // console.log(this.liquidityData);
            if (!this.isDrawOrderbook) return;
            const liquidityHeight = 1;
            const width = this.width;
            this.liquidityContainer.children.forEach((gfx) => {
                gfx.clear();
            });

            const colors = ["black", "blue", "green", "yellow", "red"];
            // const [min, max] = extent(this.liquidityData.map((l) => l.size));
            // const liquidValues = this.liquidityData.map((l) => l.size);

            //NEW STYLE
            function calculateQuartiles(data, key) {
                const sortedData = [...data].sort((a, b) => a[key] - b[key]);
                const len = sortedData.length;

                const q1 = sortedData[Math.floor(len * 0.25)][key];
                const q2 = sortedData[Math.floor(len * 0.5)][key];
                const q3 = sortedData[Math.floor(len * 0.75)][key];

                return { q1, q2, q3 };
            }

            function handleOutliers(data, key, method = "cap") {
                const { q1, q2, q3 } = calculateQuartiles(data, key);
                const iqr = q3 - q1;
                const lowerBound = q1 - 3 * iqr;
                const upperBound = q3 + 3 * iqr;

                return data
                    .map((item) => {
                        let value = item[key];
                        if (method === "cap") {
                            // if (value < lowerBound) value = lowerBound;
                            if (value > upperBound) value = upperBound;
                        } else if (method === "remove") {
                            if (value < lowerBound || value > upperBound) return null;
                        }
                        return { ...item, [key]: value };
                    })
                    .filter((item) => item !== null);
            }

            function calculatePercentiles(data, key, percentiles) {
                const values = data.map((item) => item[key]).sort((a, b) => a - b);
                const len = values.length;

                return percentiles.map((p) => ({
                    percentile: p,
                    value: values[Math.floor((p / 100) * (len - 1))],
                }));
            }

            function interpolate(x, x1, y1, x2, y2) {
                return y1 + ((x - x1) * (y2 - y1)) / (x2 - x1);
            }

            function getPercentileInfo(value, percentileData) {
                if (value <= percentileData[0].value) {
                    return { percentile: 0, index: 0 };
                }
                if (value >= percentileData[percentileData.length - 1].value) {
                    return { percentile: 100, index: percentileData.length - 1 };
                }

                for (let i = 0; i < percentileData.length - 1; i++) {
                    if (value >= percentileData[i].value && value <= percentileData[i + 1].value) {
                        const interpolatedPercentile = interpolate(
                            value,
                            percentileData[i].value,
                            percentileData[i].percentile,
                            percentileData[i + 1].value,
                            percentileData[i + 1].percentile
                        );
                        return {
                            percentile: interpolatedPercentile,
                            index: i,
                        };
                    }
                }
            }

            // Clean data by capping outliers
            const cleanedDataCapped = handleOutliers(this.liquidityData, "size", "cap");

            // Clean data by removing outliers
            // const cleanedDataRemoved = handleOutliers(this.liquidityData, 'size', 'remove');

            const percentiles = [0, 50, 75, 90, 100]; // Including 0 percentile for better interpolation
            // Calculate percentile data for 'size'
            const percentileData = calculatePercentiles(cleanedDataCapped, "size", percentiles);

            // Add continuous percentile and index information to original data
            const enrichedData = cleanedDataCapped.map((item) => {
                const { percentile, index } = getPercentileInfo(item.size, percentileData);
                return {
                    ...item,
                    sizePercentile: percentile,
                    sizePercentileIndex: index,
                };
            });

            //NEW STYLE

            const colorFns = [];
            colors.forEach((color, i) => {
                if (i === 0) return;
                // if (i === colors.length - 1) return;
                const colorScale = scaleLinear().range([0, 1]);
                colorScale.domain([percentileData[i - 1].percentile, percentileData[i].percentile]);
                colorFns.push((size) => {
                    return interpolateLab(colors[i - 1], colors[i])(colorScale(size));
                });
            });
            const height = this.priceScale(0) - this.priceScale(liquidityHeight);
            enrichedData.forEach((liquidity, i) => {
                const x = 0;
                const y = this.priceScale(liquidity.p) - height;
                // if (y < 0) return;
                // if (y > this.mainChartContainerHeight) return;
                let liquidityGfx = this.liquidityContainer.children[i];
                if (!liquidityGfx) {
                    liquidityGfx = new Graphics();
                    // liquidityGfx.interactive = true;
                    // liquidityGfx.on("mouseenter", function (e) {
                    //     // console.log(this);
                    //     console.log(
                    //         this.liquidity
                    //         // ` price ${this.liquidityPrice} orders ${this.liquidityOrders} size ${this.liquiditySize} ${this.} `
                    //     );
                    // });
                    this.liquidityContainer.addChild(liquidityGfx);
                } else {
                    liquidityGfx.clear();
                }
                let colorFnIndex = liquidity.sizePercentileIndex; // Math.floor((liquidity.size / percentileData).toFixed(2));
                if (colorFnIndex >= colorFns.length) {
                    colorFnIndex = colorFns.length - 1;
                }
                const colorFn = colorFns[colorFnIndex];
                let color = colorFn(liquidity.sizePercentile); // "rgb(142, 92, 109)"

                color = color.replace("rgb(", "");
                color = color.replace(")", "");
                const [r, g, b] = color.split(",");
                color = utils.rgb2hex([r / 255, g / 255, b / 255]);
                liquidityGfx.beginFill(color);
                liquidityGfx.alpha = 0.5;
                // liquidityGfx.lineStyle(2, 0xdddddd, 0.1);
                const rect = liquidityGfx.drawRect(x, y, width - (this.margin.left + this.margin.right), height);
                // rect.liquidityPrice = liquidity.p;
                // rect.liquiditySize = liquidity.size;
                // rect.liquidityOrders = liquidity.orders;
                rect.liquidity = liquidity;
            });
        } catch (err) {
            // console.log("CLEAR() Error?");
            console.error(err);
            return err;
        }
        // const testLiqGfx = new Graphics();
        // this.liquidityContainer.addChild(testLiqGfx);
        // testLiqGfx.beginFill("black");
        // testLiqGfx.alpha = 0.5;
        // // testLiqGfx.lineStyle(2, 0xdddddd, 0.1);

        // testLiqGfx.drawRect(20, 20, 100, 10);
        // testLiqGfx.beginFill("blue");

        // testLiqGfx.drawRect(20, 30, 100, 10);
        // testLiqGfx.beginFill("red");
        // testLiqGfx.drawRect(20, 40, 100, 10);

        // testLiqGfx.beginFill("green");

        // testLiqGfx.drawRect(20, 50, 100, 10);
        // testLiqGfx.beginFill("yellow");

        // testLiqGfx.drawRect(20, 60, 100, 10);
        // testLiqGfx.beginFill("white");

        // testLiqGfx.drawRect(20, 70, 100, 10);
        // testLiqGfx.beginFill("orange");

        // testLiqGfx.drawRect(20, 80, 100, 10);
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
            this.candleStickGfx.drawRect(x + candleMargin - halfWidth, start + halfStrokeWidth, this.candleWidth - doubleMargin, height - strokeWidth);

            this.candleStickWickGfx.moveTo(x, high);
            this.candleStickWickGfx.lineTo(x, low);
        });
    }

    drawPriceLine() {
        this.priceGfx.clear();

        console.log(`Draw line with ${this.allTicks.length} points`);
        //Tick line
        this.priceGfx.lineStyle(1, 0xffffff, 1);
        this.slicedData.forEach((candle) => {
            candle.ticks.forEach((tick, i) => {
                const x = this.xScale(tick.datetime);
                const y = this.priceScale(tick.close);
                if (i === 0) {
                    this.priceGfx.moveTo(x, y);
                } else {
                    this.priceGfx.lineTo(x, y);
                }
            });
        });
    }

    //tick volume
    drawTickVolumeLine() {
        this.volGfx.clear();
        this.volGfx.lineStyle(1, 0xff0000, 1);

        this.slicedData.forEach((candle) => {
            Object.keys(candle.volData).forEach((datetime, i) => {
                const vol = candle.volData[datetime];
                if (i === 0) {
                    const x = this.xScale(datetime);
                    const y = this.tickVolScale(0);
                    this.volGfx.moveTo(x, y);
                }
                const x = this.xScale(datetime);
                const y = this.tickVolScale(vol);
                this.volGfx.lineTo(x, y);
            });
        });
    }

    drawVolProfile() {
        this.volProfileGfx.clear();
        this.volProfileGfx.lineStyle(2, 0x0000ff, 1);

        this.volProfileGfx.beginFill(0xde3249);

        const tickHeight = this.priceScale(this.tickSize) - this.priceScale(0);

        Object.keys(this.volProfileData).forEach((price) => {
            const vol = this.volProfileData[price];
            const x = this.volProfileScale(vol);
            const y = this.priceScale(price);
            const barWidth = this.width - x;
            this.volProfileGfx.drawRect(x, y - tickHeight / 2, barWidth, tickHeight);
            this.volProfileGfx.endFill();
        });
    }

    showCrosshair() {
        if (!this.pixiApp?.stage) return console.log("no stage");
        this.crosshair = true;

        this.mainChartContainer.addChild(this.crossHairXGfx);
        this.mainChartContainer.addChild(this.crossHairYGfx);
        this.mainChartContainer.addChild(this.tradeWindowContainer);
        //LABELS
        this.mainChartContainer.addChild(this.dateLabelAppendGfx);
        this.mainChartContainer.addChild(this.priceLabelAppendGfx);
        //TEXT
        this.mainChartContainer.addChild(this.dateTxtLabel);
        this.mainChartContainer.addChild(this.priceTxtLabel);
    }

    hideCrosshair() {
        if (!this.pixiApp?.stage) return console.log("no stage");
        this.crosshair = false;
        this.mainChartContainer.removeChild(this.crossHairXGfx);
        this.mainChartContainer.removeChild(this.crossHairYGfx);
        //LABELS
        this.mainChartContainer.removeChild(this.dateLabelAppendGfx);
        this.mainChartContainer.removeChild(this.priceLabelAppendGfx);
        //TEXT
        this.mainChartContainer.removeChild(this.dateTxtLabel);
        this.mainChartContainer.removeChild(this.priceTxtLabel);
    }

    destroy() {
        console.log("destroy");
        this.ohlcDatas.length = 0;
        this.initRun = false;
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

var formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",

    // These options are needed to round to whole numbers if that's what you want.
    //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
    //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
});

function roundTick(number, tick) {
    const ticks = 1 / tick;
    return (Math.round(number * ticks) / ticks).toFixed(2);
}
