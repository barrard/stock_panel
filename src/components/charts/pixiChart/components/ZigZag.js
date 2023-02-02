import {
    Graphics,
    Container,
    Rectangle,
    Text,
    TextMetrics,
    TextStyle,
    utils,
    CLEAR_MODES,
} from "pixi.js";
import {
    MinMax,
    // PriceLevels,
    // CalcVolProfile,
} from "../../../StratBuilder/components/chartComponents/classes";

export default class ZigZag {
    constructor(dataHandler) {
        this.data = dataHandler;
        this.container = new Container();
        this.zigZagContainer = new Container();
        this.zigZagGfx = new Graphics();

        this.zigZagContainer.addChild(this.zigZagGfx);
    }

    init() {
        this.minMax = new MinMax(
            this.data.ohlcDatas,
            10, //parseFloat(minMaxTolerance),
            0.005, //parseFloat(zigZagTolerance),
            20, //parseFloat(zigZagRegressionErrorLimit),
            false //toggleZigzagDynamic
        );

        this.container.addChild(this.zigZagContainer);
    }

    draw() {
        if (!this.zigZagGfx?._geometry) {
            return;
        }

        this.zigZagGfx.clear();

        let dataCounter = 0;
        this.minMax.zigZag.swings.forEach((swing) => {
            const y = this.data.priceScale(swing.val.y);
            const radius = 6;
            this.zigZagGfx.lineStyle(3, 0xffffff, 0.9);

            let x;
            for (let _x = dataCounter; _x < this.data.ohlcDatas.length; _x++) {
                const ohlcData = this.data.ohlcDatas[_x];

                if (!ohlcData) {
                    debugger;
                }
                if (ohlcData.timestamp === swing.datetime) {
                    debugger;
                    dataCounter = _x;
                    x = this.data.xScale(_x);
                    break;
                }
            }

            // this.zigZagGfx.moveTo(x, minY);
            // this.zigZagGfx.lineTo(x, maxY);

            debugger;
            this.zigZagGfx.drawCircle(x, y, radius);
        });
    }
}
