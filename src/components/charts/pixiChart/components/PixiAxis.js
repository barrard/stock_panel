import {
    Graphics,
    Container,
    Rectangle,
    Text,
    TextMetrics,
    TextStyle,
} from "pixi.js";

export default class PixiAxis {
    constructor({
        chart,
        type,
        scale,
        values,
        valueAccessor = (v) => v,
        valueFinder,
        maxTicks,
        tickSize,
    }) {
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
        for (let x = 0; x < this.maxTicks; x++) {
            const priceTxtLabel = new Text("", this.textStyle);
            priceTxtLabel.anchor[this.type] = 0.5;

            // this.chart.pixiApp.stage.addChild(priceTxtLabel);

            this.container.addChild(priceTxtLabel);

            this.tickLabels.push(priceTxtLabel);
        }

        return this;
    }

    render({ highest, lowest, values }) {
        // let ticks = 60;

        // if (values) {
        //     lowest = values[0];
        //     highest = values[1];
        // }
        // let sixths = Math.ceil((highest - lowest) / ticks);
        // if (sixths === 2) {
        //     ticks = 3;
        //     sixths = Math.ceil((highest - lowest) / ticks);
        // }
        // if (sixths === 1) {
        //     // sixths = 0.5;
        //     ticks = 4;
        // }

        try {
            if (this.tickLinesGfx?._geometry) this.tickLinesGfx?.clear();
        } catch (error) {
            return console.log("catching a buzz");
        }

        let customValues, textValues;
        if (this.valueFinder) {
            customValues = this.valueFinder({ highest, lowest, values });
            // ticks = customValues.length;
            // console.log("customValues.length", customValues.length);
            // if (customValues.length > 6) {
            //     debugger;
            //     textValues = reduceValues(customValues);
            //     while (Object.keys(textValues).length > 6) {
            //         textValues = reduceValues(Object.values(textValues));
            //     }
            //     console.log(Object.keys(textValues).length);

            //     function reduceValues(values) {
            //         return values
            //             .filter((el, i) => i % 2 !== 0)
            //             .reduce((acc, val) => {
            //                 acc[val] = true;
            //                 return acc;
            //             }, {});
            //     }
            // }
        }

        const oppositeAxis = this.type === "x" ? "y" : "x";
        const start = Math.floor(highest);
        for (let count = 0; count < this.maxTicks; count++) {
            let value; //= start - sixths * count;
            const priceTxtLabel = this.tickLabels[count];

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
        if (!this.chart.margin) {
            alert("No margin??");
            return;
        }
        if (!this.tickLinesGfx?.lineStyle || !this.tickLinesGfx?._lineStyle) {
            return;
        }
        const { left, right, top, bottom } = this.chart.margin;
        this.tickLinesGfx.lineStyle(1, 0xffffff, 0.3);

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
