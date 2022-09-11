import { axisBottom, axisRight, axisLeft, axisTop } from "d3-axis";
// import { scaleLinear, scaleTime, scaleBand } from "d3-scale";
import { extent, scaleLinear, select, zoom, zoomTransform, mouse } from "d3";
import { Graphics, Container, Rectangle } from "pixi.js";
import { TimeScale } from "chart.js";

export default class PixiData {
    constructor({ ohlcDatas, viewPort, pixiApp, width, height, volHeight }) {
        this.viewPort = viewPort;
        this.pixiApp = pixiApp;
        this.height = height;
        this.width = width;
        this.ohlcDatas = ohlcDatas;
        this.allTicks = [];

        this.sliceStart = 0;
        this.sliceEnd = ohlcDatas.length;
        this.xScale = scaleLinear().range([0, width]);
        this.priceScale = scaleLinear().range([height, 0]);
        this.volScale = scaleLinear().range([height, volHeight]);
        this.volProfileScale = scaleLinear().range([width / 2, width]);

        //Containers
        this.mainChartContainer = new Container();

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
    }

    init() {
        const { allTicks, ohlcDatas, volProfileData, pixiApp } = this;

        this.drawCrossHair();

        ohlcDatas.forEach((ohlc) => {
            ohlc.dateTime = new Date(ohlc.dateTime).getTime();
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

        this.setupPriceScales();

        this.setupVolumeScales();
        // mainChartContainer

        this.mainChartContainer.addChild(this.candleStickWickGfx);
        this.mainChartContainer.addChild(this.candleStickGfx);
        this.mainChartContainer.addChild(this.priceGfx);

        this.mainChartContainer.addChild(this.volGfx);

        this.mainChartContainer.addChild(this.volProfileGfx);
        this.pixiApp.stage.addChild(this.mainChartContainer);
    }

    setupPriceScales() {
        const { allTicks, ohlcDatas } = this;

        this.slicedData = ohlcDatas.slice(this.sliceStart, this.sliceEnd);

        this.highs = this.slicedData.map(({ high }) => high);
        this.lows = this.slicedData.map(({ low }) => low);
        this.vols = this.slicedData.map(({ volume }) => volume);

        if (!this.slicedData[0]) {
            console.log("this.slicedData[0]");
            debugger;
        }
        const first = this.slicedData[0].ticks
            ? this.slicedData[0].ticks[0].datetime
            : this.slicedData[0].dateTime;

        const last = this.slicedData[this.slicedData.length - 1].ticks
            ? this.slicedData[this.slicedData.length - 1].ticks.slice(-1)[0]
                  .datetime
            : this.slicedData[this.slicedData.length - 1].dateTime;
        //DOMAIN
        this.xScale.domain([first, last]);

        const [lowest] = extent(this.lows);
        const [_, hightest] = extent(this.highs);
        this.priceScale.domain([lowest, hightest]);
    }

    setupVolumeScales() {
        const { slicedData, volProfileData } = this;

        let max = -Infinity;
        slicedData.forEach((ohlc) => {
            const _max = Math.max(...Object.values(ohlc.volData));
            if (_max > max) {
                max = _max;
            }
        });

        this.volScale.domain([0, max]);
    }

    onDragStart() {
        console.log("onDragStart");
        this.drag = this.mouseX;
        console.log(this.mouseX);
    }

    onDragEnd() {
        console.log("onDragEnd");
        console.log(this.mouseX);
        this.drag = false;
        this.prevMouseX = false;
    }

    onMouseMove(e) {
        this.mouseX = e.data.global.x;
        this.mouseY = e.data.global.y;
        this.crossHairYGfx.position.x = this.mouseX;
        this.crossHairXGfx.position.y = this.mouseY;

        const price = this.priceScale.invert(this.mouseY);
        const time = Math.floor(this.xScale.invert(this.mouseX));

        if (this.drag) {
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
        //try to sub from left, and add to right
        const candleCount = Math.ceil((this.deltaDrag * -1) / this.candleWidth);
        console.log(`Move ${candleCount} candles`);
        this.sliceStart = this.sliceStart + candleCount;
        if (this.sliceEnd == this.ohlcDatas.length) {
        } else {
            this.sliceEnd = this.sliceEnd + candleCount;
        }

        this.draw();
    }

    dragRight() {
        //try to sub from left, and add to left
        const candleCount = Math.ceil(this.deltaDrag / this.candleWidth);

        console.log(`Move ${candleCount} candles`);

        this.sliceEnd = this.sliceEnd - candleCount;
        if (this.sliceStart == 0) {
        } else {
            this.sliceStart = this.sliceStart - candleCount;
        }

        this.draw();
    }

    zoomIn(delta) {
        const { takeFromLeft, takeFromRight, amountToZoom } = this.calcZoom();

        this.sliceStart =
            this.sliceStart + Math.ceil(takeFromLeft * amountToZoom);
        this.sliceEnd = this.sliceEnd - Math.ceil(takeFromRight * amountToZoom);

        this.draw();
    }
    zoomOut(delta) {
        const { takeFromLeft, takeFromRight, amountToZoom } = this.calcZoom();

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

        this.setupVolumeScales();
        this.drawPriceLine();
        this.drawVolumeLine();
        this.drawAllCandles();
    }

    calcZoom() {
        const zoomPerc = 0.1;

        this.fixSliceValues();

        const zoomedLeft = this.sliceStart;
        const zoomedRight = this.ohlcDatas.length - this.sliceEnd;
        const totalZoomedAmount = zoomedLeft + zoomedRight;
        const amountToZoom =
            (this.ohlcDatas.length - totalZoomedAmount) * zoomPerc;

        //determine how "centered" we are
        let centered = this.mouseX / this.width;

        if (isNaN(centered)) {
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
        this.crossHairYGfx.clear();
        this.crossHairYGfx.lineStyle(1, 0xffffff, 1);
        this.crossHairYGfx.moveTo(0, 0);
        this.crossHairYGfx.lineTo(0, this.height);

        this.crossHairXGfx.clear();
        this.crossHairXGfx.lineStyle(1, 0xffff00, 1);
        this.crossHairXGfx.moveTo(0, 0);
        this.crossHairXGfx.lineTo(this.width, 0);

        //add hit area for pointer events

        this.mainChartContainer.interactive = true;
        this.hitArea = new Rectangle(0, 0, this.width, this.height);
        this.mainChartContainer.hitArea = this.hitArea;

        this.mainChartContainer
            .on("pointerdown", () => this.onDragStart())
            .on("pointerup", () => this.onDragEnd())
            .on("pointerupoutside", () => this.onDragEnd())

            .on("pointermove", (e) => {
                this.onMouseMove(e);
            });
    }

    drawAllCandles() {
        this.candleStickGfx.clear();
        this.candleStickWickGfx.clear();

        this.candleWidth = this.width / this.slicedData.length;
        const halfWidth = this.candleWidth / 2;
        this.candleStickWickGfx.lineStyle(1, 0xffffff, 1);

        this.slicedData.forEach((candle, i) => {
            const x = this.xScale(candle.dateTime);

            let open = this.priceScale(candle.open);
            let close = this.priceScale(candle.close);

            const high = this.priceScale(candle.high);
            const low = this.priceScale(candle.low);

            const isUp = open >= close;
            this.candleStickGfx.beginFill(isUp ? 0x00ff00 : 0xff0000);

            const height = Math.abs(open - close);
            const start = isUp ? close : open;
            // const end = isUp ? open : close;
            this.candleStickGfx.drawRect(x, start, this.candleWidth, height);

            this.candleStickWickGfx.moveTo(x + halfWidth, high);
            this.candleStickWickGfx.lineTo(x + halfWidth, low);
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

    drawVolumeLine() {
        this.volGfx.clear();
        this.volGfx.lineStyle(1, 0xff0000, 1);

        this.slicedData.forEach((candle) => {
            Object.keys(candle.volData).forEach((datetime, i) => {
                const vol = candle.volData[datetime];
                if (i === 0) {
                    const x = this.xScale(datetime);
                    const y = this.volScale(0);
                    this.volGfx.moveTo(x, y);
                }
                const x = this.xScale(datetime);
                const y = this.volScale(vol);
                this.volGfx.lineTo(x, y);
            });
        });
    }

    drawVolProfile() {
        this.volProfileGfx.clear();
        this.volProfileGfx.lineStyle(2, 0x0000ff, 1);

        this.volProfileGfx.beginFill(0xde3249);

        const tickHeight = this.priceScale(0.25) - this.priceScale(0);

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
        // console.log("showCrosshairs");
        if (!this.pixiApp?.stage) return console.log("no stage");

        this.pixiApp.stage.addChild(this.crossHairXGfx);
        this.pixiApp.stage.addChild(this.crossHairYGfx);
    }

    hideCrosshair() {
        console.log("hideCrosshairs");
        if (!this.pixiApp?.stage) return console.log("no stage");

        // this.pixiApp.stage.off("pointermove", this.onMouseMove);
        this.pixiApp.stage.removeChild(this.crossHairXGfx);
        this.pixiApp.stage.removeChild(this.crossHairYGfx);
    }
}
