import {
    Graphics,
    Container,
    Rectangle,
    Text,
    TextMetrics,
    TextStyle,
} from "pixi.js";
import { extent, scaleLinear, select, zoom, zoomTransform, mouse } from "d3";
import PixiAxis from "./PixiAxis";
import { priceScaleValues } from "./utils.js";

export default class Indicator {
    constructor({ name, height, data, drawFn, chart, accessors }) {
        this.accessors = accessors;
        this.chart = chart;
        this.data = [];
        this.drawFn = drawFn;
        this.height = height;
        this.initialized = false;
        this.name = name;
        this.pointerOver = false;

        // console.log(this.name);
    }

    init() {
        this.initialized = true;
        this.container = new Container();

        this.container.interactive = true;
        const { width, margin } = this.chart;
        const { left, right, bottom, top } = margin;
        // this.hitArea = new Rectangle(0, 0, width - (left + right), this.height);
        // this.container.hitArea = this.hitArea;

        this.scale = scaleLinear().range([this.height, 0]); //.range([height, indicatorHeight]);
        this.gfx = new Graphics();
        this.borderGfx = new Graphics();

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

        this.container.hitArea = this.hitArea;
        this.container
            .on("pointerover", (e) => {
                this.pointerOver = true;
                //tell the cross hair to use this scale....

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

        this.borderGfx.lineStyle(3, 0xaaaaaa, 1);

        this.borderGfx.moveTo(0, 0);
        this.borderGfx.lineTo(width - (left + right), 0);
    }

    setupScales() {
        //data accessor
        this.data = this.chart.slicedData.map((ohlc) => ohlc[this.accessors]);

        let [low, highest] = extent(this.data);

        this.scale.domain([0, highest]);

        this.yAxis.render({ highest, lowest: 0 });
        //draw shit
        this.drawFn(this);
    }
}
