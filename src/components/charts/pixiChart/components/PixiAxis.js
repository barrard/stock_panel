import { Graphics, Container, Rectangle, Text, TextMetrics, TextStyle } from "pixi.js";

export default class PixiAxis {
    constructor({ chart, type, scale, values, valueAccessor = (v) => v, valueFinder, maxTicks, tickSize, dragScale = false }) {
        this.chart = chart;
        this.tickSize = tickSize;
        // this.textStyle = PixiChart.textStyle;
        this.type = type;
        this.scale = scale;
        this.values = values;
        this.maxTicks = maxTicks || 40;

        this.valueFinder = valueFinder;
        this.valueAccessor = valueAccessor.bind(this);
        this.textStyle = new TextStyle({
            fontFamily: "Arial",
            fontSize: 16,
            fontWeight: "bold",
            fill: 0xffffff,
            align: "center",
        });
        this.tickLabels = [];

        this.dragScale = dragScale;

        return this.init();
    }

    init() {
        const { margin, height, width } = this.chart;
        // const { margin, height, width } = this.chart.options || this.chart;
        const { left, right, top, bottom } = margin;
        this.container = new Container();

        if (this.dragScale || true) {
            this.container.interactive = true;
            console.log("adddd eveentss");
            this.setHitArea();
            this.backgroundGfx
                .on("mousewheel", (e) => {
                    console.log("wheeeel");
                })
                .on("scroll", (e) => {
                    console.log("wheeeel");
                })

                .on("mousedown", (e) => {
                    // this.onMouseMove(e);
                    // this.dragScaleStart();
                    console.log("mousedown");
                })
                .on("pointerup", () => {
                    // this.dragScaleEnd();
                    console.log("pointerup");
                })
                .on("pointerupoutside", () => {
                    //this.dragScaleEnd()
                    console.log("pointerupoutside");
                })

                .on("pointermove", (e) => {
                    // this.onMouseMove(e);
                    console.log("pointermove");
                });
        }
        this.tickLinesGfx = new Graphics();
        // this.testGfx = new Graphics();
        this.tickLinesGfx.lineStyle(1, 0xffffff, 1);
        // this.testGfx.lineStyle(1, 0xffffff, 1);
        this.container.addChild(this.tickLinesGfx);

        //make 6 ticks, could be configured?
        for (let x = 0; x < this.maxTicks; x++) {
            const priceTxtLabel = new Text("", this.textStyle);
            priceTxtLabel.anchor[this.type] = 0.5;

            // this.chart.pixiApp.stage.addChild(priceTxtLabel);

            this.container.addChild(priceTxtLabel);

            this.tickLabels.push(priceTxtLabel);
        }

        return this;
    }

    render(opts = {}) {
        let { highest, lowest, values } = opts;
        if (highest) this.highest = highest;
        if (!highest && this.highest) highest = this.highest;
        if (lowest) this.lowest = lowest;
        if (!lowest && this.lowest) lowest = this.lowest;
        if (values) this.values = values;
        if (!values && this.values) values = this.values;

        try {
            if (this.tickLinesGfx?._geometry) this.tickLinesGfx?.clear();
            if (!this.container) return;
        } catch (error) {
            return console.log("catching a buzz");
        }

        let customValues, textValues;
        if (this.valueFinder) {
            customValues = this.valueFinder({ highest, lowest, values });
        }

        const oppositeAxis = this.type === "x" ? "y" : "x";
        // const start = Math.floor(highest);
        for (let count = 0; count < this.maxTicks; count++) {
            let value; //= start - sixths * count;
            const priceTxtLabel = this.tickLabels[count];

            if (!this?.container?.removeChild) return;
            this.container.removeChild(priceTxtLabel);

            if (customValues) {
                value = customValues[count];
            }
            if (!value) {
                continue;
            }
            if (!priceTxtLabel || !priceTxtLabel.transform) {
                continue;
            }

            //TEXT LABEL POSITION
            // if (this.valueAccessor) {
            //     priceTxtLabel[this.type] = value;
            //     this.addTickLine(value);
            // } else {
            const _val = this.scale(value);
            priceTxtLabel[this.type] = _val;
            this.addTickLine(_val);

            // }

            let printLabel = false;
            if (textValues) {
                if (textValues[value]) {
                    printLabel = true;
                }
            } else {
                printLabel = true;
            }

            if (printLabel) {
                //LABEL PRINTED VALUE
                value = this.valueAccessor(value);
                priceTxtLabel.text = value;
                priceTxtLabel[oppositeAxis] = 10;
                this.container.addChild(priceTxtLabel);
            }
        }
    }

    addTickLine(value) {
        // console.log(`draw line at ${value}`);
        if (!this.chart.margin && !this.chart.options.margin) {
            alert("No margin??");
            return;
        }
        if (!this.tickLinesGfx?.lineStyle || !this.tickLinesGfx?._lineStyle) {
            return;
        }
        const { left, right, top, bottom } = this.chart.options?.margin || this.chart.margin;
        this.tickLinesGfx.lineStyle(1, 0xffffff, 0.3);
        if (this.type === "x") {
            this.tickLinesGfx.moveTo(value, -this.chart.innerHeight());
            this.tickLinesGfx.lineTo(value, 0);
        } else if (this.type === "y") {
            this.tickLinesGfx.moveTo(-this.chart.innerWidth(), value);
            this.tickLinesGfx.lineTo(0, value);
        } else {
            alert("HUH?");
        }
    }

    setHitArea() {
        const { margin, height, width } = this.chart || !this.chart.options;
        const { left, right, top, bottom } = margin;
        if (!this?.container) return;
        this.backgroundGfx = new Graphics();
        this.container.addChild(this.backgroundGfx);

        //add hit area for pointer events

        this.backgroundGfx.interactive = true;
        this.container.interactiveMousewheel = true;
        this.backgroundGfx.beginFill(0x365456);

        if (this.type === "y") {
            this.backgroundGfx.drawRect(0, 0, right, height - (top + bottom));
            // this.hitArea = new Rectangle(width - right, top, right, height - (top + bottom));
        } else if (this.type === "x") {
            this.backgroundGfx.drawRect(0, 0, width - (left + right), bottom);
            // this.hitArea = new Rectangle(0, 0, width - (left + right), bottom);
        }
        // this.container.hitArea = this.hitArea;

        this.backgroundGfx.endFill();
        console.log("setting hit area axis");
    }
}
