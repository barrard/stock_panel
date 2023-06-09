import { Graphics, Container } from "pixi.js";

export default class PivotPoints {
    constructor(dataHandler) {
        this.data = dataHandler;
        this.container = new Container();
        this.container.interactive = true;

        // this.pivotPointGfx = new Graphics();

        // this.container.addChild(this.pivotPointGfx);
        // this.data.mainChartContainer.addChild(this.container);
        this.gfxArray = [];
        this.gfxCount = 0;
        this.lineHeight = this.data.priceScale(0) - this.data.priceScale(0.25);
        this.prices = [];
        this.pricesCombinedByWeight = [];
    }

    draw() {
        if (
            !this.data?.lastTwoDaysCompiled ||
            !Object.keys(this.data?.lastTwoDaysCompiled)?.length
        )
            return;

        if (!this.data.slicedData.length) return;

        //clean up before drawing
        // this.pivotPointGfx.clear();
        // this.gfxArray.forEach((gfx) => gfx.clear());
        this.gfxCount = 0;
        if (this.prices.length == 0) {
            this.collect = true;
        } else {
            this.collect = false;
        }

        if (this.collect) {
            //just one day first
            this.drawOHLC(this.data.lastTwoDaysCompiled[0], "yesterday");
            this.drawValueArea(this.data.lastTwoDaysCompiled[0], "yesterday");
            //day before
            this.drawOHLC(this.data.lastTwoDaysCompiled[1], "dayBefore");
            this.drawValueArea(this.data.lastTwoDaysCompiled[1], "dayBefore");

            //Last Week
            this.drawLastWeek();
        } else if (!this.pricesCombinedByWeight.length) {
            //try to combine these
            // console.log(this.prices);
            this.combinedPrices = [];
            this.sortingDistance = 0.25;
            this.pricesCombinedByWeight = this.prices
                .sort((a, b) => a - b)
                .map((price) => ({ price, weight: 1 }));

            while (this.sortingDistance < 4) {
                this.combinedPrices = [];

                for (let i = 0; i < this.pricesCombinedByWeight.length; i++) {
                    const price = this.pricesCombinedByWeight[i];
                    const nearData = this.findNear(i);
                    let nearPrices = nearData.nearPrices;
                    let index = nearData.index;
                    if (nearPrices.length) {
                        const sum = nearPrices.reduce(
                            (acc, b) => {
                                const price = b.price * b.weight;

                                acc.price += price;
                                acc.weight += b.weight;
                                return acc;
                            },
                            { price: 0, weight: 0 }
                        );
                        const average = sum.price / sum.weight || 0;
                        i = index;
                        this.combinedPrices.push({
                            price: average,
                            weight: sum.weight,
                        });
                    } else {
                        this.combinedPrices.push(nearData.price1);
                    }
                }

                this.sortingDistance += 0.25;
                this.pricesCombinedByWeight = this.combinedPrices;
            }
            this.container.removeChildren();
        } else {
            this.drawCombined();
        }
    }

    findNear(index, nearPrices = []) {
        let price1 = this.pricesCombinedByWeight[index];
        let price2 = this.pricesCombinedByWeight[index + 1];
        if (Math.abs(price1.price - price2?.price) <= this.sortingDistance) {
            nearPrices.push(price1);
            index++;
            const nearData = this.findNear(index, nearPrices);
            index = nearData.index;
            price1 = nearData.price1;
        } else if (nearPrices.length) {
            nearPrices.push(price1);
        }

        return { index, nearPrices, price1 };
    }

    drawLastWeek() {
        this.data.lastWeeklyData.forEach((week, i) => {
            this.drawOHLC(week, `week-${i}`);
            this.drawValueArea(week, `week-${i}`);
        });
    }

    drawValueArea(day, dayName) {
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
        let color = 0xffff99;
        this.drawLine({
            color,
            THICK,
            x1,
            x2,
            y1,
            y2,
            name: `${dayName}-valueAreaLow`,
        });

        y1 = y2 = RTHProfile.valueArea[1];

        this.drawLine({
            color,
            THICK,
            x1,
            x2,
            y1,
            y2,
            name: `${dayName}-valueAreaHigh`,
        });
        RTHProfile.HVNs.forEach((hvn) => {
            y1 = y2 = hvn;
            let color = 0xffaa00;
            this.drawLine({
                color,
                THICK,
                x1,
                x2,
                y1,
                y2,
                opacity: 0.3,
                name: `${dayName}-hvn`,
            });
        });

        RTHProfile.LVNs.forEach((lvn) => {
            y1 = y2 = lvn;
            let color = 0x00aaff;
            this.drawLine({
                color,
                THICK,
                x1,
                x2,
                y1,
                y2,
                opacity: 0.3,
                name: `${dayName}-lvn`,
            });
        });
    }

    drawCombined() {
        const THICK = 3;
        //draw Open - green
        let x1; //= (line.x1);
        let x2; //= (line.x2);
        let y1;
        let y2;

        x1 = this.data.slicedData[0];
        // if (x1 < 0) return;
        x2 = this.data.slicedData.length - 1;

        this.data.combinedKeyLevels.forEach((price) => {
            //OPEN
            y1 = y2 = price.price;
            let color = 0x00cc88;
            this.drawLine({
                color,
                THICK: price.weight,
                x1,
                x2,
                y1,
                y2,
                name: "combined",
            });
        });
    }

    drawOHLC(day, dayName) {
        const { RTHProfile, RTH_OHLC, overnightOHLC, overnightProfile } = day;

        const THICK = 3;
        //draw Open - green
        let x1; //= (line.x1);
        let x2; //= (line.x2);
        let y1;
        let y2;
        if (RTH_OHLC.datetime > this.data?.slicedData?.slice(-1)?.[0]?.datetime)
            return;
        x1 = this.data.slicedData.findIndex((d) => {
            return (
                !d ||
                d?.datetime === RTH_OHLC.datetime ||
                d?.datetime > RTH_OHLC.datetime
            );
        });
        // if (x1 < 0) return;
        x2 = this.data.slicedData.length - 1;

        //OPEN
        y1 = y2 = RTH_OHLC.open;
        let color = 0x00ff00;
        this.drawLine({
            color,
            THICK,
            x1,
            x2,
            y1,
            y2,
            name: `${dayName}-open`,
        });

        //CLOSE
        y1 = y2 = RTH_OHLC.close;
        color = 0xff0000;
        this.drawLine({
            color,
            THICK,
            x1,
            x2,
            y1,
            y2,
            name: `${dayName}-close`,
        });

        //HIGH
        y1 = y2 = RTH_OHLC.high;
        color = 0xff00aa;
        this.drawLine({
            color,
            THICK,
            x1,
            x2,
            y1,
            y2,
            name: `${dayName}-high`,
        });

        //LOW
        y1 = y2 = RTH_OHLC.low;
        color = 0x00ffaa;
        this.drawLine({ color, THICK, x1, x2, y1, y2, name: `${dayName}-low` });
    }

    drawLine({ color, THICK, x1, x2, y1, y2, opacity = 1, name = "" }) {
        if (this.collect) {
            this.prices.push(y1);
        }
        let pivotGfx = this.container.children[this.gfxCount];
        if (!pivotGfx) {
            // console.log("creating pivot line fx " + this.gfxCount);
            pivotGfx = new Graphics();
            pivotGfx.interactive = true;
            // pivotGfx.on("mouseenter", function (e) {
            //     console.log(this.gfxCount);
            //     console.log(`${name} `);
            // });
            this.container.addChild(pivotGfx);
            // this.gfxArray.push(pivotGfx);
        } else {
            pivotGfx.clear();
        }

        pivotGfx.interactive = true;
        pivotGfx.on("mouseover", function (e) {
            console.log(`${name} `);
        });

        // pivotGfx.lineStyle(THICK + 5, color, opacity);
        pivotGfx.beginFill(color);
        pivotGfx.alpha = opacity;

        // pivotGfx.moveTo(this.data.xScale(x1), this.data.priceScale(y1));
        // pivotGfx.lineTo(this.data.xScale(x2), this.data.priceScale(y2));
        const rect = pivotGfx.drawRect(
            this.data.xScale(x1),
            this.data.priceScale(y1) - this.lineHeight / 2,
            this.data.width - (this.data.margin.left + this.data.margin.right),
            this.lineHeight
        );

        this.gfxCount++;
    }
}
