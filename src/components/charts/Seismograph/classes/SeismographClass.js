import { Graphics, Container, Rectangle, Text, TextMetrics, TextStyle, Application } from "pixi.js";
import * as PIXI from "pixi.js";

import { Viewport } from "pixi-viewport";
import { gsap } from "gsap";
import { PixiPlugin } from "gsap/PixiPlugin";
import { extent, scaleLinear, select, zoom, zoomTransform, mouse } from "d3";
import { makeEMA } from "../../../charts/chartHelpers/MA-lines";

gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI);

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

        this.data = [];
        this.dataAvg = {
            3: [],
            10: [],
            20: [],
            // 50: [],
            // 100: [],
        };
        this.ma = {};
        this.maGfx = {};
        this.maColors = {
            3: 0x00ffff,
            10: 0x0f00ff,
            20: 0xf0ff00,
            // 50: 0xffff,
            // 100: 0xffff,
        };
        this.pathPoints = [];
        this.timeSpan = 0;
        this.dataCutoff = -500;
        const x1 = 0;

        this.y1 = 0;

        this.y2 = 0;
        this.x2 = Math.sqrt(this.needleLen ** 2 - this.y2 ** 2);
        this.prevY2 = this.y2;

        //SCALES
        this.yScale = scaleLinear().range([this.options.height - (margin.top + margin.bottom), 0]);

        this.xScale = scaleLinear().range([0, this.options.width - (margin.left + margin.right)]);

        //Containers
        this.mainChartContainer = new Container();
        this.app.stage.addChild(this.mainChartContainer);
        this.mainChartContainer.position.set(left, top);
        //chart border
        const borderGfx = new Graphics();
        this.mainChartContainer.addChild(borderGfx);
        borderGfx.lineStyle(1, 0xffffff, 3);
        borderGfx.drawRect(0, 0, width - (left + right), height - (top + bottom));

        //GRAPHICS
        this.chartMask = new Graphics();
        this.app.stage.addChild(this.chartMask);
        this.needleGfx = new Graphics();
        this.lineGfx = new Graphics();
        this.centerLineGfx = new Graphics();

        this.chartMask.beginFill(1);
        this.chartMask.drawRect(left, top, width - (left + right), height - (top + bottom));
        // this.chartMask.moveTo(10, 10);
        // this.chartMask.lineTo(100, 10);
        // this.chartMask.lineTo(100, 100);
        // this.chartMask.lineTo(10, 100);

        this.mainChartContainer.mask = this.chartMask;

        this.mainChartContainer.addChild(this.needleGfx);
        this.mainChartContainer.addChild(this.lineGfx);
        this.mainChartContainer.addChild(this.centerLineGfx);

        Object.keys(this.maColors).forEach((ma) => {
            const color = this.maColors[ma];
            this.maGfx[ma] = new Graphics();
            this.mainChartContainer.addChild(this.maGfx[ma]);
        });

        this.setupChart();

        this.needleGfx.lineStyle(4, 0xffff, 1);

        this.needleGfx.moveTo(this.xScale(this.maxTime), this.yScale(0));
        this.needleGfx.lineTo(this.xScale(this.maxTime) - (this.yScale(0) - this.yScale(this.highValue)), this.yScale(0));

        this.needleLen = this.yScale(0) - this.yScale(this.highValue);
    }

    setValue(value) {
        this.data.push(value);
        this.makeYScale();

        this.drawCenterLine();

        this.pathPoints = this.pathPoints.slice(this.dataCutoff * 60);
        this.updateAvg();
        this.updateNeedle(value);
    }

    updateAvg() {
        Object.keys(this.dataAvg).forEach((avg) => {
            const MA = makeEMA(avg, this.data);

            this.ma[avg] = MA.map((m) => m.y);
        });
        console.log(this.ma);
    }

    updatePath({ x, y }) {
        this.pathPoints.push({ x, y });
        this.lineGfx.clear();
        this.lineGfx.lineStyle(0.5, 0xff0000);
        const multiplier = 50;
        const offset = this.pathPoints.length / multiplier;
        this.lineGfx.moveTo(this.pathPoints[0].x - offset, this.pathPoints[0].y);

        Object.keys(this.ma).forEach((ma) => {
            const val = this.ma[ma][0];
            const color = this.maColors[ma];
            const maGfx = this.maGfx[ma];
            maGfx.clear();
            maGfx.lineStyle(0.5, color);
            maGfx.moveTo(this.pathPoints[0].x - offset, this.yScale(val));
        });

        // Draw the path by connecting the points
        let maCount = 0;
        for (let i = 1; i < this.pathPoints.length; i++) {
            const offset = (this.pathPoints.length - i) / multiplier;
            this.lineGfx.lineTo(this.pathPoints[i].x - offset, this.pathPoints[i].y);
            if (i % 60 === 0) {
                debugger;
                Object.keys(this.ma).forEach((ma) => {
                    debugger;
                    const val = this.ma[ma][maCount - ma] || 0;
                    const color = this.maColors[ma];
                    const maGfx = this.maGfx[ma];
                    maGfx.lineTo(this.pathPoints[i].x - offset, this.yScale(val));
                });
                maCount++;
            }
        }
    }

    updateNeedle(value) {
        const timeline = gsap.timeline();
        this.y2 = value;
        if (this.y2 === this.prevY2) {
            this.y2 += 1;
        }
        const newY2 = { y2: this.prevY2 };

        timeline.to(newY2, {
            duration: 0.9,
            y2: this.y2,
            onUpdate: () => {
                this.needleGfx.clear();

                this.x2 = Math.sqrt(this.needleLen ** 2 - (this.yScale(0) - this.yScale(newY2.y2)) ** 2);
                this.needleGfx.lineStyle(4, 0xffff, 1);

                const x = this.xScale(this.maxTime) - this.x2 / 100;
                const y = this.yScale(newY2.y2);
                this.needleGfx.moveTo(this.xScale(this.maxTime), this.yScale(this.y1));
                this.needleGfx.lineTo(x, y);
                // console.log({ x2: this.x2, y2: newY2.y2 });
                this.updatePath({ x, y });
            },
            onComplete: () => {
                this.prevY2 = this.y2;
            },
        });
    }

    setupChart() {
        this.options.PixiChartRef.current.appendChild(this.app.view);

        //make some scales
        this.makeYScale();
        this.makeXScale();

        this.drawCenterLine();
    }

    drawCenterLine() {
        this.centerLineGfx.clear();

        this.centerLineGfx.lineStyle(2, 0xffffff, 1);

        this.centerLineGfx.moveTo(this.xScale(this.maxTime), this.yScale(0));
        this.centerLineGfx.lineTo(this.xScale(this.minTime), this.yScale(0));
    }

    makeYScale() {
        this.getMinMaxPrice();

        this.yScale.domain([this.lowValue - 0.2, this.highValue + 0.2]);
    }

    makeXScale() {
        this.getMinMaxTime();

        this.xScale.domain([this.minTime, this.maxTime]);
    }

    getMinMaxPrice() {
        this.data = this.data.slice(this.dataCutoff);
        const [low, high] = extent(this.data, (value) => value);
        this.lowValue = low || -10; // -10;
        this.highValue = high || 10; //10;
    }

    getMinMaxTime() {
        // const [minTime, maxTime] = extent(this.data, (tick) => tick.datetime);
        this.minTime = 0;
        this.maxTime = 60 * 10;
    }

    drawVolume() {
        this.lineGfx.clear();

        console.log(`drawVolume with ${this.data.length} points`);

        this.lineGfx.lineStyle(1, 0x00ff00, 1);

        const startingY = this.yScale(0);

        this.data.forEach((d, i) => {
            const x = this.xScale(i);
            const y = this.yScale(d);
            // if (i === 0) {
            this.lineGfx.moveTo(x, startingY);
            // } else {
            this.lineGfx.lineTo(x, y);
            // }
        });
    }

    destroy() {
        clearInterval(this.updateTimer);
        this.app.destroy(true, true);
    }
}
