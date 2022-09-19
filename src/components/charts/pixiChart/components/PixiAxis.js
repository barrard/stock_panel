import {
    Graphics,
    Container,
    Rectangle,
    Text,
    TextMetrics,
    TextStyle,
} from "pixi.js";

export default class PixiAxis {
    constructor({ chart, type, scale, values, valueAccessor }) {
        this.chart = chart;
        // this.textStyle = PixiChart.textStyle;
        this.type = type;
        this.scale = scale;
        this.values = values;
        this.valueAccessor = valueAccessor;
        this.textStyle = new TextStyle({
            fontFamily: "Arial",
            fontSize: 16,
            fontWeight: "bold",
            fill: 0xffffff,
            align: "center",
        });
        this.tickLabels = [];

        this.rand = 10;

        return this.init();
    }

    init() {
        this.container = new Container();

        this.tickLinesGfx = new Graphics();
        this.testGfx = new Graphics();
        this.tickLinesGfx.lineStyle(1, 0xffffff, 1);
        this.testGfx.lineStyle(1, 0xffffff, 1);

        //make 6 ticks, could be configured?

        for (let x = 0; x < 6; x++) {
            const priceTxtLabel = new Text("", this.textStyle);
            priceTxtLabel.anchor[this.type] = 0.5;

            // this.chart.pixiApp.stage.addChild(priceTxtLabel);

            this.container.addChild(priceTxtLabel);

            this.tickLabels.push(priceTxtLabel);
        }

        return this;
    }

    render({ highest, lowest, values }) {
        let ticks = 6;
        if (values) {
            lowest = values[0];
            highest = values[1];
        }
        let sixths = Math.ceil((highest - lowest) / ticks);
        if (sixths === 2) {
            ticks = 3;
            sixths = Math.ceil((highest - lowest) / ticks);
        }
        if (sixths === 1) {
            // sixths = 0.5;
            ticks = 4;
        }
        console.log("CLEAR");

        this.tickLinesGfx.clear();
        // this.testGfx.clear();
        // this.testGfx.moveTo(0, 400);
        // this.testGfx.lineTo(500, 500);

        const oppositeAxis = this.type === "x" ? "y" : "x";
        const start = Math.floor(highest);
        for (let count = 1; count < ticks; count++) {
            let value = start - sixths * count;
            const priceTxtLabel = this.tickLabels[count];

            debugger;
            //TEXT LABEL POSITION
            if (this.valueAccessor) {
                priceTxtLabel[this.type] = value;
                this.addTickLine(value);
            } else {
                debugger;
                const _val = this.scale(value);
                priceTxtLabel[this.type] = _val;
                this.addTickLine(_val);
            }

            //LABEL PRINTED VALUE
            if (this.valueAccessor) {
                value = this.valueAccessor(value);
            }

            priceTxtLabel.text = value;

            priceTxtLabel[oppositeAxis] = 10;
        }
    }

    addTickLine(value) {
        console.log(`draw line at ${value}`);
        const { left, right, top, bottom } = this.chart.margin;
        this.tickLinesGfx.lineStyle(1, 0xffffff, 1);

        if (this.type === "x") {
            this.tickLinesGfx.moveTo(value, 0);
            this.tickLinesGfx.lineTo(value, this.chart.innerHeight());
        } else if (this.type === "y") {
            this.tickLinesGfx.moveTo(0, value);
            this.tickLinesGfx.lineTo(this.chart.innerWidth(), value);
        } else {
            alert("HUH?");
        }
    }
}
