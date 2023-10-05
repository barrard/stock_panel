import { Graphics, Container, Rectangle, Text, TextMetrics, TextStyle, Application } from "pixi.js";
import { Viewport } from "pixi-viewport";

import { extent, scaleLinear, select, zoom, zoomTransform, mouse } from "d3";

import PixiAxis from "../../pixiChart/components/PixiAxis";
import { timeScaleValues, priceScaleValues } from "../../pixiChart/components/utils.js";
import { slopeAndIntercept, xOfY, findTheBreakAndHolds } from "../../../../indicators/indicatorHelpers/utils";

export default class Chart {
    constructor(data, options) {
        const { width, height, margin, tickSize } = options;
        const { left, top, right, bottom } = margin;
        this.options = options;
        this.tickSize = tickSize;
        // Create a new application
        this.app = new Application({
            width: options.width || 200,
            height: options.height || 200,
            antialias: true,
            transparent: false,
            resolution: 1,
        });
        this.chartWidth = width - (left + right);
        this.width = width;
        this.height = height;
        this.margin = margin;

        this.visibleDataIndices = [];
        this.lastDragX = 0;
        this.lastDragY = 0;
        this.lastXRangeScale = 0;

        this.viewport = new Viewport({
            // screenWidth: width - (left + right),
            // screenHeight: height - (top + bottom),
            // worldWidth: width - (left + right),
            // worldHeight: height - (top + bottom),
            events: this.app.renderer.events,
            interaction: this.app.renderer.plugins.interaction, // the interaction module is important for wheel to work properly when renderer.view is placed or scaled
        });

        this.data = data;

        //SCALES
        this.priceScale = scaleLinear().range([this.options.height - (margin.top + margin.bottom), 0]);
        this.volumeScale = scaleLinear().range([this.options.height - (margin.top + margin.bottom), (this.options.height - (margin.top + margin.bottom)) / 2]);
        this.xScale = scaleLinear().range([0, this.options.width - (margin.left + margin.right)]);

        //Containers
        this.mainChartContainer = new Container();
        // this.mainChartContainer.width = width;
        // this.mainChartContainer.height = height;
        this.app.stage.addChild(this.mainChartContainer);
        this.mainChartContainer.position.set(left, top);
        //chart border
        const borderGfx = new Graphics();
        this.mainChartContainer.addChild(borderGfx);
        borderGfx.lineStyle(1, 0xffffff, 3);
        borderGfx.drawRect(0, 0, width - (left + right), height - (top + bottom));

        // this.logE = (e, name) => {
        //     console.log(name);
        //     console.log(e);
        //     const data = {};
        //     if (e instanceof Viewport) {
        //         console.log("instanceof Viewport");
        //         // console.log("e.x");
        //         // console.log(e.x);
        //         // console.log("e.y");
        //         // console.log(e.y);
        //         // console.log("e.scale");
        //         // console.log(e.scale);
        //         data.x = e.x;
        //         data.y = e.y;
        //         data.scale = e.scale;
        //     }

        //     if (e.world) {
        //         data.world = {};
        //         data.world.x = e.world.x;
        //         data.world.y = e.world.y;
        //         data.world.scale = e.world.scale;

        //         console.log("WORLD");
        //         // console.log("e.world.x");
        //         // console.log(e.world.x);
        //         // console.log("e.world.y");
        //         // console.log(e.world.y);
        //     }
        //     if (e.viewport) {
        //         console.log("VIEWPORT");
        //         data.viewport = {};
        //         data.viewport.x = e.viewport.x;
        //         data.viewport.y = e.viewport.y;
        //         data.viewport.scale = e.viewport.scale;
        //     }
        //     if (e.screen) {
        //         console.log("screen");
        //         data.screen = {};
        //         data.screen.x = e.screen.x;
        //         data.screen.y = e.screen.y;
        //     }
        //     this.options.setEventsData((eventsData) => {
        //         return { ...eventsData, [name]: data };
        //     });
        // };
        // activate plugins
        // this.viewport.drag({ direction: "x" }).pinch({ axis: "x" }).wheel({ axis: "x" }).decelerate({ friction: 0.9 });
        this.viewport.drag().pinch({ axis: "x" }).wheel({ axis: "x" }).decelerate({ friction: 0.9 });

        // this.options.events.forEach((eventName) => {
        //     this.viewport.on(eventName, (e) => {
        //         this.logE(e, eventName);
        //     });
        // });
        this.viewport.on("zoomed-end", (e) => {
            // this.logE(e, "Zoomed");
            // Calculate the new scale based on the zoom factor

            var domainCenter = this.mouseX / this.chartWidth;
            const newScale = 1 - this.viewport.scaled;

            const domainDiff = this.data.length * newScale;
            const xDomainDiff = domainDiff * domainCenter;
            const yDomainDiff = domainDiff - xDomainDiff;
            const newDomainX = 0 - xDomainDiff;
            const newDomainY = this.data.length + yDomainDiff;

            this.xScale.domain([newDomainX, newDomainY]);
            this.xAxis.render();
        });
        this.viewport.on("drag-end", (e) => {
            // this.logE(e, "drag-end");
            // Calculate the new scale based on the zoom factor
            const newScale = this.viewport.scaled;

            // Calculate the change in viewport position during dragging
            const dragDeltaX = this.viewport.x - this.lastDragX;
            const dragDeltaY = this.viewport.y - this.lastDragY;

            // Update the viewport's X position based on the drag
            const newViewportX = this.viewport.x + dragDeltaX;
            const newViewportY = this.viewport.y + dragDeltaY;

            this.xScale.range([this.xScale.range()[0] + dragDeltaX, this.xScale.range()[1] + dragDeltaX]);
            this.xAxis.render();

            this.priceScale.range([this.priceScale.range()[0] + dragDeltaY, this.priceScale.range()[1] + dragDeltaY]);
            this.yAxis.render();

            this.lastDragX = this.viewport.x;
            this.lastDragY = this.viewport.y;
            this.lastXRangeScale = Math.abs(this.xScale.range()[0] - this.xScale.range()[1]);
        });
        this.mainChartContainer.addChild(this.viewport);

        this.textStyle = new TextStyle({
            fontFamily: "Arial",
            fontSize: 16,
            fontWeight: "bold",
            fill: 0x333333,
            align: "center",
        });

        //GRAPHICS
        this.chartMask = new Graphics();
        this.app.stage.addChild(this.chartMask);
        //price / candles
        this.priceGfx = new Graphics();
        this.candleStickGfx = new Graphics();
        this.candleStickWickGfx = new Graphics();

        //crosshair
        this.crossHairYGfx = new Graphics();
        this.crossHairXGfx = new Graphics();
        this.dateLabelAppendGfx = new Graphics();
        this.priceLabelAppendGfx = new Graphics();
        this.currentPriceLabelAppendGfx = new Graphics();

        //add minMax Gfx
        this.combinedKeyLevelsGfx = new Graphics();
        this.minMaxGfx = new Graphics();
        this.minMaxFibsGfx = new Graphics();
        this.minMaxRegressionGfx = new Graphics();
        this.minMaxSwingsGfx = new Graphics();
        this.trendLinesGfx = new Graphics();

        this.volumeGfx = new Graphics();
        this.pivotsGfx = new Graphics();
        this.testGfx = new Graphics();

        //ZigZag trend lines swings fibs

        //text
        this.currentPriceTxtLabel = new Text("", this.textStyle);
        this.dateTxtLabel = new Text("", this.textStyle);
        this.priceTxtLabel = new Text("", this.textStyle);

        this.dateTxtLabel.anchor.x = 0.5;
        this.priceTxtLabel.anchor.y = 0.5;
        this.currentPriceTxtLabel.anchor.y = 0.5;

        this.chartMask.beginFill(1);
        this.chartMask.drawRect(left, top, width - (left + right), height - (top + bottom));
        // this.chartMask.moveTo(10, 10);
        // this.chartMask.lineTo(100, 10);
        // this.chartMask.lineTo(100, 100);
        // this.chartMask.lineTo(10, 100);

        this.viewport.mask = this.chartMask;

        this.viewport.addChild(this.volumeGfx);
        this.viewport.addChild(this.candleStickWickGfx);
        this.viewport.addChild(this.candleStickGfx);
        this.viewport.addChild(this.priceGfx);
        this.viewport.addChild(this.trendLinesGfx);
        this.viewport.addChild(this.combinedKeyLevelsGfx);

        this.viewport.addChild(this.minMaxGfx);
        this.viewport.addChild(this.minMaxFibsGfx);
        this.viewport.addChild(this.minMaxRegressionGfx);
        this.viewport.addChild(this.minMaxSwingsGfx);

        this.viewport.addChild(this.pivotsGfx);

        this.app.stage.addChild(this.testGfx);

        this.testGfx.lineStyle(2, 0xffffff, 0.9);

        this.testGfx.drawRect(0, 0, 30, 30);

        this.yAxis = new PixiAxis({
            chart: this,
            type: "y",
            scale: this.priceScale,
            valueFinder: priceScaleValues,
            maxTicks: 15,
            tickSize: this.tickSize,
            // dragScale: true,
        });

        this.xAxis = new PixiAxis({
            chart: this,
            type: "x",
            scale: this.xScale,
            valueAccessor: this.getTime.bind(this),
            valueFinder: timeScaleValues,
        });
    }

    getTime(dateIndex) {
        // const dateIndex = Math.floor(this.xScale.invert(x));
        let date = this.data[dateIndex]
            ? new Date(this.data[dateIndex].timestamp || this.data[dateIndex].datetime).toLocaleString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
              })
            : null;
        return date;
    }

    showCrosshair() {
        if (!this.app?.stage) return console.log("no stage");
        this.crosshair = true;

        this.app.stage.addChild(this.crossHairXGfx);
        this.app.stage.addChild(this.crossHairYGfx);
        //LABELS
        this.app.stage.addChild(this.dateLabelAppendGfx);
        this.app.stage.addChild(this.priceLabelAppendGfx);
        //TEXT
        this.app.stage.addChild(this.dateTxtLabel);
        this.app.stage.addChild(this.priceTxtLabel);
    }

    hideCrosshair() {
        if (!this.app?.stage) return console.log("no stage");
        this.crosshair = false;
        this.app.stage.removeChild(this.crossHairXGfx);
        this.app.stage.removeChild(this.crossHairYGfx);
        //LABELS
        this.app.stage.removeChild(this.dateLabelAppendGfx);
        this.app.stage.removeChild(this.priceLabelAppendGfx);
        //TEXT
        this.app.stage.removeChild(this.dateTxtLabel);
        this.app.stage.removeChild(this.priceTxtLabel);
    }

    setData(data) {
        console.log(data);
        console.log("setting data");
        debugger;
        this.data = this.processData(data?.bars);
        this.weeklyTrendLines = data.weeklyTrendLines;
        this.lastTwoDaysCompiled = data.lastTwoDaysCompiled;
        this.combinedKeyLevels = data.combinedKeyLevels;
        console.log(this.weeklyTrendLines);
    }

    setupChart() {
        console.log("setupChart");

        this.options.PixiChartRef.current.appendChild(this.app.view);

        //make some scales

        this.makePriceScale();
        this.makeTimeScale();
        this.makeVolumeScale();

        // this.drawPriceLine();
        this.drawVolume();
        this.drawAllCandles();
        debugger;
        this.drawMinMax();
        this.drawPivots();
        this.drawCombinedKeyLevels();
        this.lastDragX = this.viewport.x; //this should be up at the top i think its always 0 to begin
        this.lastDragY = this.viewport.y; //this should be up at the top i think its always 0 to begin
        this.lastXRangeScale = Math.abs(this.xScale.range()[0] - this.xScale.range()[1]);
        this.lastScaleX = this.viewport.scaled;

        // this.viewport.addChild(this.liquidityContainer);
        this.app.stage.addChild(this.xAxis.tickLinesGfx);
        this.app.stage.addChild(this.yAxis.tickLinesGfx);

        // this.yAxis.container.position.x = this.width - this.margin.right;
        // this.yAxis.container.position.y = 0;
        // this.app.stage.addChild(this.yAxis.container);
        this.app.stage.addChild(this.currentPriceLabelAppendGfx);
        this.app.stage.addChild(this.currentPriceTxtLabel);
        this.drawCrossHair();
        this.setHitArea();
    }

    drawCrossHair() {
        const { margin, width, height } = this.options;
        const { left, right, top, bottom } = margin;
        //Y Crosshair
        this.crossHairYGfx.clear();
        this.crossHairYGfx.lineStyle(1, 0xffffff, 1);
        this.crossHairYGfx.moveTo(left, top);
        this.crossHairYGfx.lineTo(left, height - bottom);

        //X Crosshair
        this.crossHairXGfx.clear();
        this.crossHairXGfx.lineStyle(1, 0xffff00, 1);
        this.crossHairXGfx.moveTo(left, top);
        this.crossHairXGfx.lineTo(width - right, top);

        this.app.stage
            // .on("mousewheel", (e) => {
            //     console.log(e);
            // })
            .on("pointerdown", (e) => {
                // console.log("pointerdown");
                this.onMouseMove(e);
                this.onDragStart();
            })
            .on("pointerup", () => {
                // console.log("pointerup");
                this.onDragEnd();
            })
            .on("pointerupoutside", () => this.onDragEnd())

            .on("pointermove", (e) => {
                this.onMouseMove(e);
            });

        //yAxis
        this.yAxis.container.position.x = width - right;
        this.yAxis.container.position.y = top;
        this.app.stage.addChild(this.yAxis.container);
        //yAxis
        if (this?.xAxis?.container?.position?.x === undefined) return;
        this.xAxis.container.position.x = left;
        this.xAxis.container.position.y = height - bottom;
        this.app.stage.addChild(this.xAxis.container);
    }

    makePriceScale() {
        this.getMinMaxPrice();

        this.priceScale.domain([this.lowPrice, this.highPrice]);
        this.yAxis.render({ highest: this.highPrice, lowest: this.lowPrice });
    }

    makeTimeScale() {
        this.getMinMaxTime();
        this.timestamps = this.data.map(({ datetime }) => datetime);

        this.xScale.domain([0, this.data.length]);
        this.xAxis.render({
            values: this.timestamps,
            // highest: this.xScale.range()[1],
            // lowest: this.xScale.range()[0],
        });
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
        const [_, high] = extent(this.data, (tick) => tick.high);
        const [low, __] = extent(this.data, (tick) => tick.low);
        this.lowPrice = low;
        this.highPrice = high;
    }

    getMinMaxTime() {
        const [minTime, maxTime] = extent(this.data, (tick) => tick.datetime);
        this.minTime = minTime;
        this.maxTime = maxTime;
    }

    drawVolume() {
        this.volumeGfx.clear();

        console.log(`drawVolume with ${this.data.length} points`);

        this.volumeGfx.lineStyle(1, 0x333333, 1);

        const startingY = this.volumeScale(0);

        this.data.forEach((d, i) => {
            const x = this.xScale(i);
            const y = this.volumeScale(d.volume);
            // if (i === 0) {
            this.volumeGfx.moveTo(x, startingY);
            // } else {
            this.volumeGfx.lineTo(x, y);
            // }
        });
    }

    drawPivots() {
        if (!this.pivotsGfx || !this.lastTwoDaysCompiled) {
            return;
        }

        try {
            this.pivotsGfx.clear();
        } catch (err) {
            // console.log("CLEAR() Error?");
            // console.log(err);
            return err;
        }

        Object.keys(this.lastTwoDaysCompiled).forEach((day) => {
            const { RTH_OHLC = {}, closeTime, pivot = {} } = this.lastTwoDaysCompiled[day];
            const { open, high, low, close, datetime } = RTH_OHLC;
            let index = 0;
            let foundStartingPoint = false;
            while (!foundStartingPoint) {
                const datetime = this.data[index]?.datetime;

                let bool = datetime > closeTime;
                if (bool || !datetime) {
                    foundStartingPoint = true;
                    // index = bool;
                    break;
                }
                index++;
            }

            const x1 = index - 1;
            const x2 = x1 + 400;
            let y1 = pivot.p;
            let y2 = pivot.p;
            let line = { x1, x2, y1, y2 };
            this.pivotsGfx.lineStyle(2, 0x0000ff, 1);

            this.drawLine(this.pivotsGfx, line);

            //SUPPORT
            y1 = pivot.s1;
            y2 = pivot.s1;
            line = { x1, x2, y1, y2 };
            this.pivotsGfx.lineStyle(2, 0x00ff00, 1);

            this.drawLine(this.pivotsGfx, line);
            y1 = pivot.s2;
            y2 = pivot.s2;
            line = { x1, x2, y1, y2 };
            this.pivotsGfx.lineStyle(2, 0x00ff00, 0.7);

            this.drawLine(this.pivotsGfx, line);

            //RESISTANCE
            y1 = pivot.r1;
            y2 = pivot.r1;
            line = { x1, x2, y1, y2 };
            this.pivotsGfx.lineStyle(2, 0xff0000, 1);

            this.drawLine(this.pivotsGfx, line);
            y1 = pivot.r2;
            y2 = pivot.r2;
            line = { x1, x2, y1, y2 };
            this.pivotsGfx.lineStyle(2, 0xff0000, 0.7);

            this.drawLine(this.pivotsGfx, line);
        });
    }

    drawCombinedKeyLevels() {
        debugger;
        if (!this.combinedKeyLevelsGfx || !this.combinedKeyLevels?.length) {
            return;
        }

        try {
            this.combinedKeyLevelsGfx.clear();
        } catch (err) {
            // console.log("CLEAR() Error?");
            // console.log(err);
            return err;
        }

        const x1 = this.data.length - 20;
        const x2 = this.data.length + 20;
        this.combinedKeyLevels.forEach((level) => {
            // const x1 =
            // const x2 =
            const y1 = level.price;
            const y2 = y1;
            this.combinedKeyLevelsGfx.lineStyle(level.weight / 4, 0xffaa00, 0.7);

            this.drawLine(this.combinedKeyLevelsGfx, { x1, x2, y1, y2 });
        });
    }

    drawMinMax() {
        const TYPE = "closeLine";
        if (!this.minMaxGfx || !this.weeklyTrendLines?.length) {
            return;
        }

        try {
            this.minMaxGfx.clear();
        } catch (err) {
            // console.log("CLEAR() Error?");
            // console.log(err);
            return err;
        }

        // console.log(this.weeklyTrendLines);
        const {
            fibsList,
            highNodes,
            lowNodes,
            swings,
            zigZagFibs,
            zigZag,
            regressionZigZag: { regressionHighLines, regressionLowLines },
        } = this.weeklyTrendLines[0].minMax;
        debugger;
        //High/Low Nodes
        this.minMaxGfx.beginFill(0xff0000);
        highNodes.forEach((node) => {
            const { highLow, index } = node;
            const x = index;
            const y = node[highLow];
            this.drawMarker(this.minMaxGfx, { x, y, r: 5 });
        });

        this.minMaxGfx.beginFill(0x00ff00);
        lowNodes.forEach((node) => {
            const { highLow, index } = node;
            const x = index;
            const y = node[highLow];
            this.drawMarker(this.minMaxGfx, { x, y, r: 5 });
        });

        this.minMaxGfx.beginFill(0x0000ff);
        swings.forEach((node) => {
            const {
                name,
                index,
                val: { y },
            } = node;
            const x = index;
            // const y = node[highLow];
            this.drawMarker(this.minMaxGfx, { x, y, r: 5 });
        });

        regressionHighLines.forEach((line) => {
            this.minMaxRegressionGfx.lineStyle(2, 0xff0000, 0.6);
            this.drawLine(this.minMaxRegressionGfx, line);
        });

        regressionLowLines.forEach((line) => {
            this.minMaxRegressionGfx.lineStyle(2, 0x00ff00, 0.6);
            this.drawLine(this.minMaxRegressionGfx, line);
        });

        //FIB REGRESSION ZIGZAGSS
        zigZagFibs.forEach((line) => {
            const { color, opacity = 1 } = line;
            // this.minMaxFibsGfx.beginFill(color);
            this.minMaxFibsGfx.lineStyle(2, color, opacity);

            this.drawLine(this.minMaxFibsGfx, line);
        });

        fibsList.forEach((fibLine, i) => {
            // console.log(fibLine);
            const { firstPoint, secondPoint } = fibLine;
            const color = firstPoint.name === "low" ? "lawngreen" : "indianred";
            // this.minMaxFibsGfx.beginFill(color);
            this.minMaxFibsGfx.lineStyle(2, color, 0.4);
            const x1 = firstPoint.index;
            const x2 = secondPoint.index;

            const y1 = firstPoint.val.y;
            const y2 = secondPoint.val.y;

            this.drawLine(this.minMaxFibsGfx, { x1, x2, y1, y2 });
        });
    }

    drawMarker(gfx, data) {
        gfx.drawCircle(this.xScale(data.x), this.priceScale(data.y), data.r);
    }

    drawLine(gfx, data) {
        gfx.moveTo(this.xScale(data.x1), this.priceScale(data.y1));
        gfx.lineTo(this.xScale(data.x2), this.priceScale(data.y2));
    }

    drawAllCandles() {
        // if (!this.slicedData.length) {
        //     return;
        // }
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
        const { margin, width, height } = this.options;
        this.candleWidth = (width - (margin.left + margin.right)) / this.data.length;
        const halfWidth = this.candleWidth / 2;
        this.candleStickWickGfx.lineStyle(this.candleWidth * 0.1, 0xffffff, 0.9);
        const candleMargin = this.candleWidth * 0.1;
        const doubleMargin = candleMargin * 2;
        const strokeWidth = this.candleWidth * 0.1 > 2 ? 2 : this.candleWidth * 0.1;
        const halfStrokeWidth = strokeWidth / 2;
        const doubleStrokeWidth = strokeWidth * 2;
        this.candleStickGfx.lineStyle(strokeWidth, 0x111111, 0.9);

        this.data.forEach((candle, i) => {
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
        let prevY;

        console.log(`Draw line with ${this.data.length} points`);
        //Tick line
        this.priceGfx.lineStyle(1, 0xffffff, 1);
        this.data.forEach((d, i) => {
            const x = this.xScale(d.datetime);
            const y = this.priceScale(d.close);

            if (y < prevY) {
                this.priceGfx.lineStyle(1, 0xff0000, 1);
            } else if (y > prevY) {
                this.priceGfx.lineStyle(1, 0x00ff00, 1);
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

    onMouseMove(e) {
        // console.log("object");
        this.setMouse(e);
        if (!this.crosshair && !this.drag) return;

        // const price = this.priceScale.invert(this.mouseY);

        this.updateDateCrossHairLabel();
        this.updatePriceCrossHairLabel();

        // if (this.drag && !this.gesture) {
        if (this.drag) {
            // this.hideCrosshair();
            if (this.prevMouseX === undefined) {
                this.prevMouseX = this.mouseX;
                this.prevMouseY = this.mouseY;
                return;
            } else {
                if (this.mouseX > this.chartWidth) {
                    //DRAG DOWN / UP
                    this.deltaDragY = this.mouseY - this.prevMouseY;
                    if (Math.abs(this.deltaDragY) < 5 || Math.abs(this.deltaDragY) < 5) return;

                    if (this.deltaDragY > 0) {
                        debugger;
                        this.dragDown();
                    } else if (this.deltaDragY < 0) {
                        debugger;
                        this.dragUp();
                    }
                    this.prevMouseX = this.mouseX;
                    this.prevMouseY = this.mouseY;
                } else {
                    //DRAG LEFT / RIGHT
                    // this.deltaDragX = this.mouseX - this.prevMouseX;
                    // if (Math.abs(this.deltaDragX) < 5 || Math.abs(this.deltaDragX) < this.candleWidth) return;
                    // if (this.deltaDragX > 0) {
                    //     this.dragRight();
                    // } else if (this.deltaDragX < 0) {
                    //     this.dragLeft();
                    // }
                    this.prevMouseX = this.mouseX;
                    this.prevMouseY = this.mouseY;
                }
            }
        }
    }

    onDragStart() {
        // console.log("onDragStart");
        // console.log(this.mouseX);
        this.hideCrosshair();

        this.drag = true;
        this.prevMouseX = this.mouseX;
        this.prevMouseY = this.mouseY;
    }

    onDragEnd() {
        // console.log("onDragEnd");
        // console.log(this.mouseX);
        this.showCrosshair();
        this.drag = false;
        this.prevMouseX = false;
        this.prevMouseY = false;
    }

    dragLeft() {
        return;
        if (this.longPress) return;
        //try to sub from left, and add to right
        const candleCount = Math.ceil((this.deltaDragX * -1) / this.candleWidth);
        // console.log(`Move ${candleCount} candles`);
        this.sliceStart = this.sliceStart + candleCount;
        if (this.sliceEnd == this.ohlcDatas.length) {
        } else {
            this.sliceEnd = this.sliceEnd + candleCount;
        }

        // this.draw();
    }

    dragRight() {
        return;
        if (this.longPress) return;

        //try to sub from left, and add to left
        const candleCount = Math.ceil(this.deltaDragX / this.candleWidth);

        // console.log(`Move ${candleCount} candles`);
        this.sliceEnd = this.sliceEnd - candleCount;
        if (this.sliceStart == 0) {
            if (this.sliceStart === 0) {
                //load more data starting from 0 index of ohlc
                // this.loadMoreData();
            }
        } else {
            this.sliceStart = this.sliceStart - candleCount;
        }

        // this.draw();
    }

    dragUp() {
        console.log("drag up ");
        debugger;
        const prevPriceRange = this.priceScale.range()[0] - this.priceScale.range()[1];

        this.priceScale.range([this.priceScale.range()[0] + this.deltaDragY, this.priceScale.range()[1] - this.deltaDragY]);
        this.yAxis.render();
        const newPriceRange = this.priceScale.range()[0] - this.priceScale.range()[1];
        const diff = newPriceRange - prevPriceRange;
        const yScale = diff / newPriceRange;
        // this.makePriceScale();
        this.viewport.scale.y += yScale;
        this.viewport.y -= diff / 2;
    }

    dragDown() {
        debugger;
        const prevPriceRange = this.priceScale.range()[0] - this.priceScale.range()[1];

        console.log("drag down ");
        this.priceScale.range([this.priceScale.range()[0] + this.deltaDragY, this.priceScale.range()[1] - this.deltaDragY]);
        this.yAxis.render();
        const newPriceRange = this.priceScale.range()[0] - this.priceScale.range()[1];
        const diff = newPriceRange - prevPriceRange;
        const yScale = diff / newPriceRange;

        this.viewport.scale.y += yScale;
        this.viewport.y -= diff / 2;
        // this.viewport.scaleX++;
        // this.viewport.scaled += 0.1;
        console.log(this.viewport.scaleY);
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
            const y = this.options.height - (this.options.margin.bottom - padding);
            this.dateTxtLabel.position.y = y + padding;

            const coords = bottomAxisMarkerTagLine({
                x: this.options.margin.left,
                y: y,
                w: width,
                h: height,
                padding,
            });

            this.dateLabelAppendGfx.drawPolygon(coords);

            this.dateLabelAppendGfx.endFill();
        }
    }

    updatePriceCrossHairLabel() {
        if (!this.crosshair) return;
        let yLabel, yScale;
        if (this.crossHairYScale) {
            yScale = this.crossHairYScale;
            yLabel = Math.floor(yScale.invert(this.mouseY - this.yMouseOffset + this.options.margin.top)).toString();
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
        const x = this.options.width + padding - this.options.margin.right;
        txt.x = x;
        gfx.position.x = x;

        const coords = rightAxisMarkerTagLine({
            x,
            y: 0 + this.options.margin.top,
            w: width + padding,
            h: height + padding,
            padding,
        });

        gfx.drawPolygon(coords);

        gfx.endFill();
    }

    getDate(x) {
        const dateIndex = Math.floor(this.xScale.invert(x));
        let date = this.data[dateIndex]
            ? new Date(this.data[dateIndex].timestamp || this.data[dateIndex].datetime).toLocaleString("en-US", {
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
              })
            : null;
        return date;
    }

    setMouse(e) {
        const { margin, width, height } = this.options;
        const { left, right, top, bottom } = margin;
        if (e?.data?.global?.x) {
            this.mouseX = e.data.global.x;
            this.mouseY = e.data.global.y;
        } else if (e?.touches?.[0]?.screenX) {
            this.mouseX = e.touches[0].screenX;
            this.mouseY = e.touches[0].screenY;
        }
        this.mouseX = this.mouseX - left;
        this.mouseY = this.mouseY - top;

        if ((this.crosshair && (this.mouseX < 0 || this.mouseX > width - (right + left))) || this.mouseY < 0 || this.mouseY > height - (top + bottom)) {
            this.hideCrosshair();
        } else if (!this.crosshair && this.mouseX > 0 && this.mouseX < width - (right + left)) {
            this.showCrosshair();
        }
        this.crossHairYGfx.position.x = this.mouseX;
        this.crossHairXGfx.position.y = this.mouseY;
        this.priceLabelAppendGfx.position.y = this.mouseY;
        this.dateLabelAppendGfx.position.x = this.mouseX;
        this.dateTxtLabel.x = this.mouseX + this.options.margin.left;
        this.priceTxtLabel.y = this.mouseY + this.options.margin.top;
    }

    processData(data = []) {
        console.log("Processing data");

        data = Object.values(data).sort((a, b) => a.datetime - b.datetime);

        return data;
    }

    setHitArea() {
        const { margin, height, width } = this.options;
        const { left, right, top, bottom } = margin;

        //add hit area for pointer events

        this.app.stage.interactive = true;
        // this.mainChartContainer.interactiveMousewheel = true
        this.hitArea = new Rectangle(0, 0, width, height);
        this.app.stage.hitArea = this.hitArea;

        //right axis hit area
        // this.xAxis.hitArea = new Rectangle(width - right, top, right, height - (top + bottom));
        // this.xAxis.container.interactive = true;
        // this.xAxis.container.hitArea = this.xAxis.hitArea;
    }

    destroy() {
        this.app.destroy(true, true);
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
