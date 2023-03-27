import { Graphics, Container } from "pixi.js";
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
            2.0, //parseFloat(zigZagRegressionErrorLimit),
            false //toggleZigzagDynamic
        );

        this.container.addChild(this.zigZagContainer);
    }

    draw() {
        if (!this?.zigZagGfx?._geometry) {
            return;
        }

        this.zigZagGfx.clear();

        const sliceStart = this.data.slicedData?.[0]?.timestamp;
        const sliceEnd = this.data.slicedData.slice(-1)?.[0]?.timestamp;
        let dataCounter = 0;

        if (!this.minMax?.zigZag?.swings) return;
        this.minMax.zigZag.swings.forEach((swing) => {
            if (!swing) return;
            if (swing.datetime < sliceStart) return;
            if (swing.datetime > sliceEnd) return;
            const y = this.data.priceScale(swing.val.y);
            const color = swing.name === "low" ? 0x00ff00 : 0xff0000;
            const radius = 6;
            this.zigZagGfx.beginFill(color, 0.9);

            let x;
            for (let _x = dataCounter; _x < this.data.slicedData.length; _x++) {
                const ohlcData = this.data.slicedData[_x];

                if (ohlcData < 0) {
                    debugger;
                }
                if (ohlcData.timestamp === swing.datetime) {
                    dataCounter = _x;
                    x = this.data.xScale(_x);
                    break;
                }
            }

            // this.zigZagGfx.moveTo(x, minY);
            // this.zigZagGfx.lineTo(x, maxY);

            this.zigZagGfx.drawCircle(x, y, radius);
        });

        //draw regressions

        this.dataCounter = 0;

        this.firstTime = this.data.slicedData[0].timestamp;
        this.lastTime = this.data.slicedData.slice(-1)[0].timestamp;

        const THICK = 3;
        this.zigZagGfx.lineStyle(THICK, 0xff0000, 1);
        this.dataCounter = 0;

        this.minMax.regressionZigZag?.regressionHighLines?.forEach((line) =>
            this.drawRegressionLine(line)
        );

        this.zigZagGfx.lineStyle(THICK, 0x00ff00, 1);

        this.dataCounter = 0;
        this.minMax.regressionZigZag?.regressionLowLines?.forEach((line) =>
            this.drawRegressionLine(line)
        );
    }

    drawRegressionLine(line) {
        if (!this) return;
        let x1; //= (line.x1);
        let x2; //= (line.x2);
        let y1 = line.y1;
        let y2 = line.y2;

        if (line.t2 < this.firstTime) return;

        for (
            let _x = this.dataCounter;
            _x < this.data.slicedData.length;
            _x++
        ) {
            const ohlcData = this.data.slicedData[_x];

            if (!ohlcData) return;

            if (ohlcData.timestamp === line.t1) {
                // dataCounter = _x;
                x1 = _x;
            }
            if (ohlcData.timestamp === line.t2) {
                this.dataCounter = _x;
                x2 = _x;
                break;
            }
        }
        if (x1 === undefined && !x2) return;
        if (x1 === undefined && x2) {
            //what index is x2?
            //and how far left can we go? 0? what is y1 here?
            x1 = line.x2 - x2;

            y1 = x1 * line.m + line.b;
            x1 = 0;
        }
        if (!x2) {
            x2 = line.x1 + (this.data.slicedData.length - 1 - x1);
            y2 = x2 * line.m + line.b;

            x2 = this.data.slicedData.length - 1;
        }
        this.zigZagGfx.moveTo(this.data.xScale(x1), this.data.priceScale(y1));
        this.zigZagGfx.lineTo(this.data.xScale(x2), this.data.priceScale(y2));
    }
}
