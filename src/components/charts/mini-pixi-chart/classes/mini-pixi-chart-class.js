import {
    Graphics,
    Container,
    Rectangle,
    Text,
    TextMetrics,
    TextStyle,
    Application,
} from "pixi.js";
import { Viewport } from "pixi-viewport";

import { extent, scaleLinear, select, zoom, zoomTransform, mouse } from "d3";

export default class Chart {
    constructor(data, options) {
        const { width, height, margin } = options;
        const { left, top, right, bottom } = margin;
        this.options = options;
        // Create a new application
        this.app = new Application({
            width: options.width || 200,
            height: options.height || 200,
            antialias: true,
            transparent: false,
            resolution: 1,
        });

        const viewport = new Viewport({
            // screenWidth: width,
            // screenHeight: height,
            // worldWidth: width - (left + right),
            // worldHeight: height - (top + bottom),
            events: this.app.renderer.events,
            interaction: this.app.renderer.plugins.interaction, // the interaction module is important for wheel to work properly when renderer.view is placed or scaled
        });

        this.data = data;

        //SCALES
        this.priceScale = scaleLinear().range([
            this.options.height - (margin.top + margin.bottom),
            0,
        ]);

        this.volumeScale = scaleLinear().range([
            this.options.height - (margin.top + margin.bottom),
            0,
        ]);

        this.xScale = scaleLinear().range([
            0,
            this.options.width - (margin.left + margin.right),
        ]);

        //Containers
        this.mainChartContainer = new Container();
        this.app.stage.addChild(this.mainChartContainer);
        this.mainChartContainer.position.set(left, top);
        //chart border
        const borderGfx = new Graphics();
        this.mainChartContainer.addChild(borderGfx);
        borderGfx.lineStyle(1, 0xffffff, 3);
        borderGfx.drawRect(
            0,
            0,
            width - (left + right),
            height - (top + bottom)
        );

        // activate plugins
        viewport
            .drag({ direction: "x" })
            .pinch({ axis: "x" })
            .wheel({ axis: "x" })
            .decelerate({ friction: 0.9 });

        // viewport.on("zoomed", (e) => {
        //     logE(e, "Zoomed");
        // });
        // viewport.on("drag-end", (e) => {
        //     logE(e, "drag-end");
        // });
        this.mainChartContainer.addChild(viewport);

        //GRAPHICS
        this.chartMask = new Graphics();
        this.app.stage.addChild(this.chartMask);
        this.priceGfx = new Graphics();
        this.volumeGfx = new Graphics();
        this.testGfx = new Graphics();

        this.chartMask.beginFill(1);
        this.chartMask.drawRect(
            left,
            top,
            width - (left + right),
            height - (top + bottom)
        );
        // this.chartMask.moveTo(10, 10);
        // this.chartMask.lineTo(100, 10);
        // this.chartMask.lineTo(100, 100);
        // this.chartMask.lineTo(10, 100);

        viewport.mask = this.chartMask;

        viewport.addChild(this.priceGfx);
        viewport.addChild(this.volumeGfx);
        // this.app.stage.addChild(this.testGfx);

        // this.testGfx.lineStyle(2, 0xffffff, 0.9);

        // this.testGfx.drawRect(0, 0, 30, 30);
    }

    setData(data) {
        // console.log("setting data");

        // data = this.processData(data);
        this.data = data;
    }

    setupChart() {
        // console.log("setupChart");

        this.options.PixiChartRef.current.appendChild(this.app.view);

        //make some scales
        this.makePriceScale();
        this.makeTimeScale();
        this.makeVolumeScale();

        this.drawPriceLine();
        // this.drawVolume();
    }

    makePriceScale() {
        this.getMinMaxPrice();

        this.priceScale.domain([this.lowValue - 0.2, this.highValue + 0.2]);
    }

    makeTimeScale() {
        this.getMinMaxTime();

        this.xScale.domain([this.minTime, this.maxTime]);
    }

    makeVolumeScale() {
        this.getMinMaxVolume();
        this.volumeScale.domain([0, this.maxVolume]);
    }

    getMinMaxVolume() {
        const [low, high] = extent(this.data, (tick) => tick.volume);
        this.maxVolume = high;
    }

    getMinMaxPrice() {
        const [low, high] = extent(this.data, (value) => value);
        this.lowValue = low;
        this.highValue = high;
    }

    getMinMaxTime() {
        // const [minTime, maxTime] = extent(this.data, (tick) => tick.datetime);
        this.minTime = 0;
        this.maxTime = this.data.length;
    }

    drawVolume() {
        this.volumeGfx.clear();

        console.log(`drawVolume with ${this.data.length} points`);

        this.volumeGfx.lineStyle(1, 0x00ff00, 1);

        const startingY = this.volumeScale(0);

        this.data.forEach((d, i) => {
            const x = this.xScale(i);
            const y = this.volumeScale(d);
            // if (i === 0) {
            this.volumeGfx.moveTo(x, startingY);
            // } else {
            this.volumeGfx.lineTo(x, y);
            // }
        });
    }
    drawPriceLine() {
        this.priceGfx.clear();
        let prevY;

        console.log(`Draw line with ${this.data.length} points`);
        //Tick line
        this.priceGfx.lineStyle(1, 0x0000ff, 1);
        this.data.forEach((d, i) => {
            const x = this.xScale(i);
            const y = this.priceScale(d);

            if (y > prevY) {
                this.priceGfx.lineStyle(1, 0xff0000, 1);
            } else if (y < prevY) {
                this.priceGfx.lineStyle(1, 0x00ff10, 1);
            } else {
                this.priceGfx.lineStyle(1, 0xffffff, 1);
            }
            if (i === 0) {
                this.priceGfx.moveTo(x, y);
            } else {
                this.priceGfx.lineTo(x, y);
            }
            prevY = y;
        });
    }

    processData(data) {
        // console.log("Processing data");
        // console.log(data.length);
        // data = data.reduce((acc, d) => {
        //     const { close, datetime, volume } = d;

        //     if (!acc[datetime]) {
        //         acc[datetime] = { close, datetime, volume: 0 };
        //     }
        //     acc[datetime].volume += volume;
        //     return acc;
        // }, {});
        // data = Object.values(data).sort((a, b) => b.datetime - a.datetime);
        // console.log(data.length);

        return data;
    }

    destroy() {
        this.app.destroy(true, true);
    }
}
