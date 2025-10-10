import { Graphics, Container, Rectangle, Text, TextMetrics, TextStyle } from "pixi.js";
import { extent, scaleLinear, select, zoom, zoomTransform, mouse } from "d3";
import PixiAxis from "./PixiAxis";
import { priceScaleValues } from "./utils.js";

export default class Indicator {
    constructor({ name, height, data, drawFn, chart, accessors, type, lineColor = 0x3b82f6 }) {
        this.accessors = accessors;
        this.chart = chart;
        this.data = [];
        this.drawFn = drawFn;
        this.height = height;
        this.initialized = false;
        this.name = name;
        this.pointerOver = false;
        this.type = type;
        this.lineColor = lineColor;

        // console.log(this.name);
    }

    init() {
        this.initialized = true;
        this.container = new Container();

        this.container.interactive = true;
        // this.container.eventMode = "static"; // or 'dynamic'
        // this.container.cursor = "pointer"; // Optional: change cursor on hover

        const { width, margin } = this.chart;
        const { left, right, bottom, top } = margin;
        this.hitArea = new Rectangle(0, 0, width - (left + right), this.height);
        this.container.hitArea = this.hitArea;

        // // Debug: visualize the hit area
        // const debugGraphics = new Graphics();
        // debugGraphics.beginFill(0xff0000, 0.3); // Semi-transparent red
        // debugGraphics.drawRect(0, 0, width - (left + right), this.height / 2);
        // debugGraphics.endFill();
        // this.container.addChild(debugGraphics); // Remove this after debugging

        this.scale = scaleLinear().range([this.height, 0]); //.range([height, indicatorHeight]);
        this.gfx = new Graphics();
        this.borderGfx = new Graphics();
        const style = new TextStyle({
            fontFamily: "Arial, sans-serif",
            fontSize: 10,
            fontWeight: "bold",
            fill: "#ffffff",
            // stroke: "#2c3e50",
            // strokeThickness: 3,
            // dropShadow: true,
            // dropShadowColor: "#000000",
            // dropShadowBlur: 4,
            // dropShadowAngle: Math.PI / 6,
            // dropShadowDistance: 1,
        });

        this.nameText = new Text(this.name, style);

        this.hitArea = new Rectangle(0, 0, width - (left + right), this.height);

        this.yAxis = new PixiAxis({
            chart: this.chart,
            type: "y",
            scale: this.scale,
            valueFinder: priceScaleValues,
            maxTicks: 5,
            tickSize: 1,
        });

        this.chart.height += this.height;
        this.chart.drawCrossHair();

        this.container.addChild(this.gfx);
        this.container.addChild(this.borderGfx);
        this.container.addChild(this.yAxis.tickLinesGfx);

        this.container.addChild(this.yAxis.container);
        this.container.addChild(this.nameText);

        this.container.hitArea = this.hitArea;
        this.container
            .on("pointerover", (e) => {
                this.pointerOver = true;
                //tell the cross hair to use this scale....
                console.log(`Pointer over ${this.name}, container.position.y: ${this.container.position.y}, hitArea:`, this.hitArea);

                this.chart.setYScale(this.scale);
                this.chart.yMouseOffset = this.container.position.y;
            })
            .on("pointerout", (e) => {
                this.pointerOver = false;

                this.chart.setYScale(false);
            })

            .on("pointermove", (e) => {
                if (!this.pointerOver) return;
                this.chart.onMouseMove(e);
            })
            .on("pointerdown", (e) => {
                this.chart.onMouseMove(e);
                this.chart.onDragStart();
            })
            .on("pointerup", () => {
                this.chart.onDragEnd();
            })
            .on("pointerupoutside", () => this.chart.onDragEnd());

        this.yAxis.container.position.x = width - (right + left);
        this.yAxis.container.position.y = 0;

        this.borderGfx.clear();
        this.borderGfx.lineStyle(3, 0xffffff, 1);

        const rightSide = width - (left + right);

        // Draw top dividing line
        this.borderGfx.moveTo(0, 0);
        this.borderGfx.lineTo(rightSide, 0);

        // Draw left side
        this.borderGfx.moveTo(0, 0);
        this.borderGfx.lineTo(0, this.height);

        // Draw bottom
        this.borderGfx.lineTo(rightSide, this.height);

        // Draw right side
        this.borderGfx.lineTo(rightSide, 0);
    }

    setupScales() {
        //data accessor
        this.data = this.chart.slicedData.map((ohlc) => ohlc[this.accessors]);

        let [low, highest] = extent(this.data);

        this.scale.domain([0, highest]);

        this.yAxis.render({ highest, lowest: 0 });
        //draw shit
        if (this.type === "line") {
            this.drawFn({
                lineColor: this.lineColor,
                lineWidth: 2,
                yField: this.accessors,
                xScale: this.chart.xScale,
                yScale: this.scale,
                data: this.chart.slicedData,
                chartData: this,
                gfx: this.gfx,
            });
        } else {
            this.drawFn(this);
        }
    }
}
