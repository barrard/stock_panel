import { axisBottom, axisRight, axisLeft, axisTop } from "d3-axis";
// import { scaleLinear, scaleTime, scaleBand } from "d3-scale";
import { extent, scaleLinear, select, zoom, zoomTransform, mouse } from "d3";
import {
    Graphics,
    Container,
    Rectangle,
    Text,
    TextMetrics,
    TextStyle,
} from "pixi.js";
import { TimeScale } from "chart.js";
import PixiAxis from "./PixiAxis";
import { timeScaleValues, priceScaleValues } from "./utils.js";
import { drawVolume } from "./drawFns.js";
import Indicator from "./Indicator";

export default class PixiData {
    constructor({
        ohlcDatas = [],
        viewPort,
        pixiApp,
        width,
        // height,
        indicatorHeight = 250,
        loadData,
        margin,
        tickSize,
    }) {
        this.allTicks = [];
        this.crossHairYScale = false;
        this.currentMinute = false;
        this.dateLabel = false;
        this.gesture = false;
        this.height = 600;
        this.indicatorHeight = indicatorHeight;
        this.initRun = false;
        this.loadData = loadData;
        this.mainChartContainerHeight = 600;
        this.margin = margin;
        this.mouseX = 0;
        this.ohlcDatas = [...ohlcDatas];
        this.pixiApp = pixiApp;
        this.priceScale = scaleLinear().range([
            this.mainChartContainerHeight - (margin.top + margin.bottom),
            0,
        ]);
        this.slicedData = [];
        this.sliceEnd = ohlcDatas.length;
        this.sliceStart = 0;
        this.tickSize = tickSize;
        this.touches = 0;
        this.viewPort = viewPort;
        this.volProfileScale = scaleLinear().range([width / 2, width]);
        this.width = width;
        this.xScale = scaleLinear().range([
            0,
            width - (margin.left + margin.right),
        ]);
        this.yLabel = false;
        //Containers
        this.mainChartContainer = new Container();
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
        //LABELS
        this.dateLabelAppendGfx = new Graphics();
        this.priceLabelAppendGfx = new Graphics();

        this.textStyle = new TextStyle({
            fontFamily: "Arial",
            fontSize: 16,
            fontWeight: "bold",
            fill: 0x333333,
            align: "center",
        });

        this.dateTxtLabel = new Text("", this.textStyle);

        this.priceTxtLabel = new Text("", this.textStyle);

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
        this.init(ohlcDatas);
    }

    init(ohlcDatas) {
        const { volProfileData, pixiApp } = this;

        if (!this.initRun) {
            //add the tick lines kinda first //TODO more background graphics
            this.mainChartContainer.addChild(this.xAxis.tickLinesGfx);
            this.mainChartContainer.addChild(this.yAxis.tickLinesGfx);
            this.yAxis.container.position.x =
                this.width - this.margin.right - this.margin.left;
            this.yAxis.container.position.y = 0;
            this.mainChartContainer.addChild(this.yAxis.container);
        }

        if (!this.initRun || !this.ohlcDatas.length) {
            this.initRun = true;
            this.ohlcDatas = ohlcDatas;
            //initial load
            this.sliceStart = 0;
            this.sliceEnd = ohlcDatas.length;

            ohlcDatas.forEach((ohlc) => {
                if (!ohlc.ticks) {
                    ohlc.ticks = [];
                }
                ohlc.volData = {};

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

            this.volProfileScale.domain([
                extent(Object.values(volProfileData))[1],
                0,
            ]);

            this.sliceEnd = ohlcDatas.length;

            // this.setupTickVolumeScales(volumeContainer);
            // mainChartContainer
            this.setHitArea();
            this.drawCrossHair();
            this.setupPriceScales();

            this.mainChartContainer.addChild(this.candleStickWickGfx);
            this.mainChartContainer.addChild(this.candleStickGfx);
            this.mainChartContainer.addChild(this.priceGfx);
            this.mainChartContainer.addChild(this.borderGfx);

            this.mainChartContainer.addChild(this.volGfx);

            this.mainChartContainer.addChild(this.volProfileGfx);
            this.pixiApp.stage.addChild(this.mainChartContainer);
        } else {
            this.sliceStart += ohlcDatas.length;
            this.sliceEnd += ohlcDatas.length;
            this.ohlcDatas = ohlcDatas.concat(this.ohlcDatas);
            console.log("HERE???");
            this.draw();
        }
        this.loadingMoreData = false;
    }

    prependData(data) {
        this.ohlcDatas = this.ohlcDatas.concat([data]);
        this.sliceEnd++;
        this.draw();
    }

    replaceLast(data) {
        this.ohlcDatas[this.ohlcDatas.length - 1] = data;
        debugger;
        this.draw();
    }
    setHitArea() {
        const { left, right, top, bottom } = this.margin;

        //add hit area for pointer events

        this.mainChartContainer.interactive = true;
        // this.mainChartContainer.interactiveMousewheel = true
        this.hitArea = new Rectangle(
            0,
            0,
            this.width - (left + right),
            this.height - (top + bottom)
        );
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
                let { container, name, scale, gfx, initialized, height } =
                    indicator;

                const yPos =
                    this.mainChartContainerHeight -
                    this.margin.bottom +
                    this.getIndicatorTopPos(index);
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
                this.xAxis.container.position.y =
                    this.height - this.margin.bottom;
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
        highest = roundTick(
            highest + priceScalePadding * highest,
            this.tickSize
        );
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
            (this.crosshair &&
                (this.mouseX < 0 ||
                    this.mouseX > this.width - (right + left))) ||
            this.mouseY < 0 ||
            this.mouseY > this.height - (top + bottom)
        ) {
            this.hideCrosshair();
        } else if (
            !this.crosshair &&
            this.mouseX > 0 &&
            this.mouseX < this.width - (right + left)
        ) {
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

        this.updateDateLabel();
        this.updateYLabel();

        if (this.drag && !this.gesture) {
            // this.hideCrosshair();
            if (!this.prevMouseX) {
                this.prevMouseX = this.mouseX;
                return;
            } else {
                this.deltaDrag = this.mouseX - this.prevMouseX;
                if (
                    Math.abs(this.deltaDrag) < 5 ||
                    Math.abs(this.deltaDrag) < this.candleWidth
                )
                    return;
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
        const { takeFromLeft, takeFromRight, amountToZoom } =
            this.calcZoom(delta);

        this.sliceStart =
            this.sliceStart + Math.ceil(takeFromLeft * amountToZoom);
        this.sliceEnd = this.sliceEnd - Math.ceil(takeFromRight * amountToZoom);

        this.draw();
    }
    zoomOut(delta) {
        const { takeFromLeft, takeFromRight, amountToZoom } =
            this.calcZoom(delta);

        this.sliceStart =
            this.sliceStart - Math.ceil(takeFromLeft * amountToZoom);
        this.sliceEnd = this.sliceEnd + Math.ceil(takeFromRight * amountToZoom);

        if (this.sliceStart < 0) this.sliceStart = 0;
        if (this.sliceEnd > this.ohlcDatas.length)
            this.sliceEnd = this.ohlcDatas.length;
        this.draw();
    }

    draw() {
        this.fixSliceValues();

        this.setupPriceScales();

        // this.setupTickVolumeScales();
        // this.drawPriceLine();
        // this.drawTickVolumeLine();

        this.drawAllCandles();
    }

    updateYLabel() {
        if (!this.crosshair) return;
        let yLabel, yScale;
        if (this.crossHairYScale) {
            yScale = this.crossHairYScale;
            yLabel = Math.floor(
                yScale.invert(this.mouseY - this.yMouseOffset + this.margin.top)
            ).toString();
        } else {
            yScale = this.priceScale;
            yLabel = formatter.format(
                roundTick(yScale.invert(this.mouseY), this.tickSize)
            );
        }

        if (!yLabel) return;
        if (yLabel === this.yLabel) {
            return;
        } else {
            this.yLabel = yLabel;

            this.priceTxtLabel.text = this.yLabel;
            let { width, height } = new TextMetrics.measureText(
                this.yLabel,
                this.textStyle
            );
            //X Date Label
            this.priceLabelAppendGfx.clear();
            this.priceLabelAppendGfx.beginFill(0x00ff00); // green

            this.priceLabelAppendGfx.lineStyle(1, 0x333333, 1);

            const padding = 10;
            const x =
                this.width + padding - (this.margin.left + this.margin.right);
            this.priceTxtLabel.x = x;
            this.priceLabelAppendGfx.position.x = x - padding / 2;
            //Price label
            const coords = rightAxisMarkerTagLine({
                x,
                y: 0,
                w: width + padding,
                h: height + padding,
                padding,
            });

            this.priceLabelAppendGfx.drawPolygon(coords);

            this.priceLabelAppendGfx.endFill();
        }
    }

    getDate(x) {
        const dateIndex = Math.floor(this.xScale.invert(x));
        let date = this.slicedData[dateIndex]
            ? new Date(
                  this.slicedData[dateIndex].timestamp ||
                      this.slicedData[dateIndex].datetime
              ).toLocaleString("en-US", {
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
            ? new Date(
                  this.slicedData[dateIndex].timestamp ||
                      this.slicedData[dateIndex].datetime
              ).toLocaleString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
              })
            : null;
        return date;
    }

    updateDateLabel() {
        if (!this.crosshair) return;
        let date = this.getDate(this.mouseX);

        if (!date) return;
        if (date === this.dateLabel) {
            return;
        } else {
            this.dateLabel = date;
            this.dateTxtLabel.text = this.dateLabel;
            let { width, height } = new TextMetrics.measureText(
                this.dateLabel,
                this.textStyle
            );
            //X Date Label
            this.dateLabelAppendGfx.clear();
            this.dateLabelAppendGfx.beginFill(0x00ff00); // green

            this.dateLabelAppendGfx.lineStyle(1, 0x333333, 1);

            const padding = 5;
            const y =
                this.height - (this.margin.bottom + this.margin.top - padding);
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

    loadMoreData() {
        if (!this.loadingMoreData) {
            this.loadingMoreData = true;
            console.log("load more data");
            const startDate = this.ohlcDatas.length
                ? this.ohlcDatas[0].timestamp
                : new Date().getTime();
            console.log(startDate);
            this.loadData({ startDate, withTicks: false });
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
            amountToZoom =
                (this.ohlcDatas.length - totalZoomedAmount) * zoomPerc;
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
            .on("pointerup", () => {
                this.onDragEnd();
            })
            .on("pointerupoutside", () => this.onDragEnd())

            .on("pointermove", (e) => {
                this.onMouseMove(e);
            });

        //yAxis
        // this.yAxis.container.position.x = this.width - this.margin.right;
        // this.yAxis.container.position.y = this.margin.top;
        // this.pixiApp.stage.addChild(this.yAxis.container);
        //yAxis
        this.xAxis.container.position.x = this.margin.left;
        this.xAxis.container.position.y = this.height - this.margin.bottom;
        this.pixiApp.stage.addChild(this.xAxis.container);
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

        this.candleWidth =
            (this.width - (this.margin.left + this.margin.right)) /
            this.slicedData.length;
        const halfWidth = this.candleWidth / 2;
        this.candleStickWickGfx.lineStyle(
            this.candleWidth * 0.1,
            0xffffff,
            0.9
        );
        const candleMargin = this.candleWidth * 0.1;
        const doubleMargin = candleMargin * 2;
        const strokeWidth =
            this.candleWidth * 0.1 > 2 ? 2 : this.candleWidth * 0.1;
        const halfStrokeWidth = strokeWidth / 2;
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

            const height = Math.abs(open - close);
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
            this.volProfileGfx.drawRect(
                x,
                y - tickHeight / 2,
                barWidth,
                tickHeight
            );
            this.volProfileGfx.endFill();
        });
    }

    showCrosshair() {
        if (!this.pixiApp?.stage) return console.log("no stage");
        this.crosshair = true;

        this.mainChartContainer.addChild(this.crossHairXGfx);
        this.mainChartContainer.addChild(this.crossHairYGfx);
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