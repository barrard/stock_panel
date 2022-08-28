import { axisBottom, axisRight, axisLeft, axisTop } from "d3-axis";
// import { scaleLinear, scaleTime, scaleBand } from "d3-scale";
import { extent, scaleLinear, select, zoom, zoomTransform, mouse } from "d3";
import { Graphics, Container } from "pixi.js";

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

        this.priceGfx = new Graphics();
        this.volGfx = new Graphics();
        this.volProfileGfx = new Graphics();
        this.crossHairYGfx = new Graphics();
        this.crossHairXGfx = new Graphics();
    }

    init() {
        const { allTicks, ohlcDatas, volProfileData, pixiApp } = this;

        this.drawCrossHair();
        this.sliceEnd = ohlcDatas.length;

        this.setupPriceScales();

        this.setupVolumeScales();
        this.pixiApp.stage.addChild(this.priceGfx);

        this.pixiApp.stage.addChild(this.volGfx);

        this.pixiApp.stage.addChild(this.volProfileGfx);
    }

    setupPriceScales() {
        const { allTicks, ohlcDatas } = this;
        allTicks.length = 0;
        const slicedData = ohlcDatas.slice(this.sliceStart, this.sliceEnd);
        slicedData.forEach(({ ticks }) => {
            if (ticks) {
                allTicks.push(...ticks);
            }
        });

        this.highs = slicedData.map(({ high }) => high);
        this.lows = slicedData.map(({ low }) => low);
        this.vols = slicedData.map(({ volume }) => volume);

        if (!allTicks.length) {
            return alert("Dis'Broke");
        }
        //DOMAIN
        this.xScale.domain([
            allTicks[0].datetime,
            allTicks[allTicks.length - 1].datetime,
        ]);

        const [lowest] = extent(this.lows);
        const [_, hightest] = extent(this.highs);
        console.log({ lowest, hightest });
        this.priceScale.domain([lowest, hightest]);
    }

    setupVolumeScales() {
        const { allTicks, volProfileData } = this;

        this.volData = allTicks.reduce((acc, tick) => {
            const { datetime, volume, close } = tick;
            if (!acc[datetime]) {
                acc[datetime] = 0;
            }
            if (!volProfileData[close]) {
                volProfileData[close] = 0;
            }
            volProfileData[close] += volume;
            acc[datetime] += volume;
            return acc;
        }, {});

        this.volScale.domain([0, extent(Object.values(this.volData))[1]]);

        this.volProfileScale.domain([
            extent(Object.values(volProfileData))[1],
            0,
        ]);
    }

    onDragStart() {
        console.log("onDragStart");
    }
    onDragEnd() {
        console.log("onDragEnd");
    }
    onDragEnd() {
        console.log("onDragEnd");
    }
    onMouseMove(e) {
        // console.log("onMouseMove");
        // console.log(`X: ${e.data.global.x}, Y: ${e.data.global.y}`);

        this.mouseX = e.data.global.x;
        this.mouseY = e.data.global.y;
        this.crossHairYGfx.position.x = this.mouseX;
        this.crossHairXGfx.position.y = this.mouseY;

        const price = this.priceScale.invert(this.mouseY);
        const time = Math.floor(this.xScale.invert(this.mouseX));
        // console.log({
        //     time: new Date(time).toLocaleTimeString(),
        //     price: price.toFixed(2),
        // });
    }

    zoomIn(delta) {
        const { takeFromLeft, takeFromRight, amountToZoom } = this.calcZoom();

        this.sliceStart =
            this.sliceStart + Math.floor(takeFromLeft * amountToZoom);
        this.sliceEnd =
            this.sliceEnd - Math.floor(takeFromRight * amountToZoom);

        this.setupPriceScales();

        this.setupVolumeScales();
        this.drawPriceLine();
    }
    zoomOut(delta) {
        const { takeFromLeft, takeFromRight, amountToZoom } = this.calcZoom();

        this.sliceStart =
            this.sliceStart - Math.floor(takeFromLeft * amountToZoom);
        this.sliceEnd =
            this.sliceEnd + Math.floor(takeFromRight * amountToZoom);

        if (this.sliceStart < 0) this.sliceStart = 0;
        if (this.sliceEnd > this.ohlcDatas.length)
            this.sliceEnd = this.ohlcDatas.length;
        this.setupPriceScales();

        this.setupVolumeScales();
        this.drawPriceLine();
    }

    calcZoom() {
        const zoomPerc = 0.1;

        const zoomedLeft = this.sliceStart;
        const zoomedRight = this.ohlcDatas.length - this.sliceEnd;
        const totalZoomedAmount = zoomedLeft + zoomedRight;
        const amountToZoom =
            (this.ohlcDatas.length - totalZoomedAmount) * zoomPerc;

        //determine how "centered" we are
        const centered = this.mouseX / this.width;

        const takeFromRight = 1 - centered;
        const takeFromLeft = 1 - takeFromRight;
        console.log({ takeFromLeft, takeFromRight });
        return { takeFromLeft, takeFromRight, amountToZoom };
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
    }

    drawPriceLine() {
        this.priceGfx.clear();

        //Tick line
        this.priceGfx.lineStyle(1, 0xffffff, 1);
        this.allTicks.forEach((tick, i) => {
            const x = this.xScale(tick.datetime);
            const y = this.priceScale(tick.close);
            if (i === 0) {
                this.priceGfx.moveTo(x, y);
            } else {
                this.priceGfx.lineTo(x, y);
            }
        });
    }

    drawVolumeLine() {
        this.volGfx.clear();
        this.volGfx.lineStyle(1, 0xff0000, 1);

        Object.keys(this.volData).forEach((datetime, i) => {
            const vol = this.volData[datetime];
            if (i === 0) {
                const x = this.xScale(datetime);
                const y = this.volScale(0);
                this.volGfx.moveTo(x, y);
            }
            const x = this.xScale(datetime);
            const y = this.volScale(vol);
            this.volGfx.lineTo(x, y);
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
        console.log("showCrosshairs");
        if (!this.pixiApp?.stage) return console.log("no stage");
        this.pixiApp.stage
            // .on("pointerdown", this.onDragStart)
            // .on("pointerup", this.onDragEnd)
            // .on("pointerupoutside", this.onDragEnd)
            .on("pointermove", (e) => {
                this.onMouseMove(e);
            });
        this.pixiApp.stage.addChild(this.crossHairXGfx);
        this.pixiApp.stage.addChild(this.crossHairYGfx);
    }
    hideCrosshair() {
        console.log("hideCrosshairs");
        if (!this.pixiApp?.stage) return console.log("no stage");

        this.pixiApp.stage
            // .on("pointerdown", this.onDragStart)
            // .on("pointerup", this.onDragEnd)
            // .on("pointerupoutside", this.onDragEnd)
            .off("pointermove", this.onMouseMove);
        this.pixiApp.stage.removeChild(this.crossHairXGfx);
        this.pixiApp.stage.removeChild(this.crossHairYGfx);
    }
}
