import { fas } from "@fortawesome/free-solid-svg-icons";
import { Graphics, Container } from "pixi.js";

function indexOfSmallest(a) {
    var lowest = 0;
    for (var i = 1; i < a.length; i++) {
        if (a[i] <= a[lowest]) lowest = i;
    }
    return lowest;
}

export default class SupplyDemandZones {
    constructor(dataHandler) {
        this.data = dataHandler;

        this.results = [];

        this.container = new Container();
        this.SDZContainer = new Container();
        this.SDZGfx = new Graphics();
        this.SDZContainer.addChild(this.SDZGfx);

        this.init();
    }

    init() {
        console.log("dataHandler");
        this.data.mainChartContainer.addChild(this.container);
        this.container.addChild(this.SDZContainer);

        this.timesOfHighMomoUp = [];
        this.timesOfHighMomoDown = [];
        this.timesOfFastHighMomoUp = [];
        this.timesOfFastHighMomoDown = [];

        ///////TESTING
        this.timesOfHighMomoDownGroupingTesting = [];
        this.timesOfHighMomoUpGroupingTesting = [];
        this.timesOfFastHighMomoUpGroupingTesting = [];
        this.timesOfFastHighMomoDownGroupingTesting = [];

        this.evalLength = 4;
        this.volImitUp = 10; // volatility limit
        this.volImitDown = -7; // volatility limit

        this.data.ohlcDatas.forEach((ohlc, i) => {
            if (i < this.evalLength) return;

            const evalData = this.data.ohlcDatas.slice(
                i - this.evalLength,
                i + 1
            );
            const [first, second, third, fourth, fifth] = evalData;
            // const [firstATR, secondATR, thirdATR, fourthATR, fifthATR]
            const ATRs = evalData.map((d) => {
                return Math.abs(d.open - d.close);
            });

            const [
                firstClose,
                secondClose,
                thirdClose,
                fourthClose,
                fifthClose,
            ] = evalData.map((d) => {
                return d.close;
            });

            const fast = secondClose - firstClose;
            const medium = thirdClose - firstClose;
            const slow = fourthClose - firstClose;
            const xSlow = fifthClose - firstClose;

            const total =
                secondClose -
                firstClose +
                (thirdClose - secondClose) +
                (fourthClose - thirdClose) +
                (fifthClose - fourthClose);
            // console.log(total);
            if (total > this.volImitUp) {
                //Where did it start???
                this.findLowVolatilityOfGroup(
                    this.timesOfHighMomoUpGroupingTesting,
                    this.timesOfHighMomoUp,
                    ATRs,
                    evalData,
                    i
                );
            } else if (total < this.volImitDown) {
                //Where did it start???
                this.findLowVolatilityOfGroup(
                    this.timesOfHighMomoDownGroupingTesting,
                    this.timesOfHighMomoDown,
                    ATRs,
                    evalData,
                    i
                );
            }

            if (fast > 5) {
                //Where did it start???

                this.findLowVolatilityOfGroup(
                    this.timesOfFastHighMomoUpGroupingTesting,
                    this.timesOfFastHighMomoUp,
                    ATRs,
                    evalData,
                    i
                );
            } else if (fast < -5) {
                //Where did it start???

                this.findLowVolatilityOfGroup(
                    this.timesOfFastHighMomoDownGroupingTesting,
                    this.timesOfFastHighMomoDown,
                    ATRs,
                    evalData,
                    i
                );
            }
        });
    }

    findLowVolatilityOfGroup(groupingTesting, plotArray, ATRs, evalData, i) {
        const lowIndex = indexOfSmallest(ATRs);
        if (lowIndex >= this.evalLength - 1) return;
        const lowestAtrData =
            this.data.ohlcDatas[i - (this.evalLength - lowIndex)];
        plotArray.push(lowestAtrData);
        groupingTesting.push(evalData);
    }

    draw() {
        if (!this.SDZGfx?._geometry) {
            return;
        }
        this.SDZGfx.clear();
        const sliceStart = this.data.slicedData?.[0]?.timestamp;
        const sliceEnd = this.data.slicedData.slice(-1)?.[0]?.timestamp;

        const that = this;

        const fill = 0.4;

        //try draw a marker here

        let dataCounter = 0;
        this.SDZGfx.lineStyle(2, 0xffffff, 0.9);

        // this.SDZGfx.beginFill(0x00ff00, fill);
        // this.timesOfHighMomoUp.forEach((momo, i) =>
        //     drawMomoMarker(
        //         i,
        //         this.timesOfHighMomoUpGroupingTesting[i],
        //         momo,
        //         10
        //     )
        // );

        // dataCounter = 0;
        // this.SDZGfx.beginFill(0xff0000, fill);
        // this.timesOfHighMomoDown.forEach((momo, i) =>
        //     drawMomoMarker(
        //         i,
        //         this.timesOfHighMomoDownGroupingTesting[i],
        //         momo,
        //         10
        //     )
        // );

        dataCounter = 0;

        this.SDZGfx.beginFill(0x00ffaa, fill);
        this.timesOfFastHighMomoUp.forEach((momo, i) =>
            drawMomoMarker(
                i,
                this.timesOfFastHighMomoUpGroupingTesting[i],
                momo,
                10
            )
        );

        dataCounter = 0;

        this.SDZGfx.beginFill(0xff00aa, fill);
        this.timesOfFastHighMomoDown.forEach((momo, i) =>
            drawMomoMarker(
                i,
                this.timesOfFastHighMomoDownGroupingTesting[i],
                momo,
                10
            )
        );

        function drawMomoMarker(i, groupTesting, momo, radius) {
            if (!groupTesting?.length) {
                debugger;
            }

            if (!momo) return;
            if (momo.timestamp < sliceStart) return;
            if (momo.timestamp > sliceEnd) return;
            const y = that.data.priceScale(momo.close);
            console.log(groupTesting);
            const left = that.data.xScale(
                that.data.slicedData.findIndex(
                    (d) => d.timestamp === groupTesting[0].timestamp
                )
            );
            const top = that.data.priceScale(
                groupTesting.reduce(
                    (acc, d) => (d.high > acc ? d.high : acc),
                    -Infinity
                )
            );
            const height =
                that.data.priceScale(
                    groupTesting.reduce(
                        (acc, d) => (d.low < acc ? d.low : acc),
                        Infinity
                    )
                ) - top;

            const width =
                that.data.xScale(
                    that.data.slicedData.findIndex(
                        (d) =>
                            d.timestamp === groupTesting.slice(-1)[0].timestamp
                    )
                ) -
                that.data.xScale(
                    that.data.slicedData.findIndex(
                        (d) => d.timestamp === groupTesting[0].timestamp
                    )
                );

            that.SDZGfx.drawRect(left, top, width, height);

            let x;
            for (let _x = dataCounter; _x < that.data.slicedData.length; _x++) {
                const ohlcData = that.data.slicedData[_x];

                if (ohlcData.timestamp === momo.timestamp) {
                    dataCounter = _x;
                    x = that.data.xScale(_x);
                    break;
                }
            }
            that.SDZGfx.drawCircle(x, y, radius);
        }
    }
}
