import { Graphics, Container } from "pixi.js";

export default class PivotPoints {
    constructor(dataHandler) {
        this.data = dataHandler;
        this.container = new Container();

        this.pivotPointGfx = new Graphics();

        this.container.addChild(this.pivotPointGfx);
        this.data.mainChartContainer.addChild(this.container);
    }

    draw() {
        if (!this.data?.lastTwoDaysCompiled?.length) return;
        if (!this?.pivotPointGfx?._geometry) {
            return;
        }
        if (!this.data.slicedData.length) return;

        this.pivotPointGfx.clear();

        //just one day first
        this.drawOHLC(this.data.lastTwoDaysCompiled[0]);
        this.drawValueArea(this.data.lastTwoDaysCompiled[0]);
        //day before
        this.drawOHLC(this.data.lastTwoDaysCompiled[1]);
        this.drawValueArea(this.data.lastTwoDaysCompiled[1]);

        //Last Week
        this.drawLastWeek();
    }

    drawLastWeek() {
        this.data.lastWeeklyData.forEach((week) => {
            this.drawOHLC(week);
            this.drawValueArea(week);
        });
    }

    drawValueArea(day) {
        const { RTHProfile, RTH_OHLC, overnightOHLC, overnightProfile } = day;

        const THICK = 3;
        //draw Open - green
        let x1; //= (line.x1);
        let x2; //= (line.x2);
        let y1;
        let y2;

        if (RTH_OHLC.timeOpen > this.data?.slicedData?.slice(-1)?.[0]?.datetime)
            return;
        x1 = this.data.slicedData.findIndex((d) => {
            return (
                !d ||
                d?.datetime === RTH_OHLC.timeOpen ||
                d?.datetime > RTH_OHLC.timeOpen
            );
        });
        // if (x1 < 0) return;
        x2 = this.data.slicedData.length - 1;

        y1 = y2 = RTHProfile.valueArea[0];
        let color = 0xffff00;
        // this.drawLine({ color, THICK, x1, x2, y1, y2 });

        RTHProfile.HVNs.forEach((hvn) => {
            y1 = y2 = hvn;
            let color = 0xffaa00;
            this.drawLine({ color, THICK, x1, x2, y1, y2, opacity: 0.3 });
        });

        RTHProfile.LVNs.forEach((lvn) => {
            y1 = y2 = lvn;
            let color = 0x00aaff;
            this.drawLine({ color, THICK, x1, x2, y1, y2, opacity: 0.3 });
        });

        y1 = y2 = RTHProfile.valueArea[1];

        // this.drawLine({ color, THICK, x1, x2, y1, y2 });
    }

    drawOHLC(day) {
        const { RTHProfile, RTH_OHLC, overnightOHLC, overnightProfile } = day;

        const THICK = 3;
        //draw Open - green
        let x1; //= (line.x1);
        let x2; //= (line.x2);
        let y1;
        let y2;
        if (RTH_OHLC.timeOpen > this.data?.slicedData?.slice(-1)?.[0]?.datetime)
            return;
        x1 = this.data.slicedData.findIndex((d) => {
            return (
                !d ||
                d?.datetime === RTH_OHLC.timeOpen ||
                d?.datetime > RTH_OHLC.timeOpen
            );
        });
        // if (x1 < 0) return;
        x2 = this.data.slicedData.length - 1;

        //OPEN
        y1 = y2 = RTH_OHLC.open;
        let color = 0x00ff00;
        this.drawLine({ color, THICK, x1, x2, y1, y2 });

        //CLOSE
        y1 = y2 = RTH_OHLC.close;
        color = 0xff0000;
        this.drawLine({ color, THICK, x1, x2, y1, y2 });

        //HIGH
        y1 = y2 = RTH_OHLC.high;
        color = 0xff00aa;
        this.drawLine({ color, THICK, x1, x2, y1, y2 });

        //LOW
        y1 = y2 = RTH_OHLC.low;
        color = 0x00ffaa;
        this.drawLine({ color, THICK, x1, x2, y1, y2 });
    }

    drawLine({ color, THICK, x1, x2, y1, y2, opacity = 1 }) {
        this.pivotPointGfx.lineStyle(THICK, color, opacity);

        this.pivotPointGfx.moveTo(
            this.data.xScale(x1),
            this.data.priceScale(y1)
        );
        this.pivotPointGfx.lineTo(
            this.data.xScale(x2),
            this.data.priceScale(y2)
        );
    }
}
