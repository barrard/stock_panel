import { fas } from "@fortawesome/free-solid-svg-icons";
import { Graphics, Container } from "pixi.js";

function indexOfSmallest(a) {
    let lowest = 0;
    for (let i = 1; i < a.length; i++) {
        if (a[i] <= a[lowest]) lowest = i;
    }
    return lowest;
}
function indexOfLargest(a) {
    let lowest = 0;
    for (let i = 1; i < a.length; i++) {
        if (a[i] >= a[lowest]) lowest = i;
    }
    return lowest;
}

function checkBar(bar) {
    const { open, close } = bar;
    if (open > close) {
        return "red";
    } else if (close > open) {
        return "green";
    } else {
        return "";
    }
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

        this.evalLength = 5;
        this.volImitUp = 30; // volatility limit
        this.volImitDown = -30; // volatility limit

        // this.data.ohlcDatas.forEach((ohlc, i) => {
        for (let i = 0; i < this.data.ohlcDatas.length; i++) {
            const ohlc = this.data.ohlcDatas[i];
            // }
            // this.data.ohlcDatas.forEach((ohlc, i) => {
            if (i < this.evalLength) continue;

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

            let total = 0;
            let bars = 0;
            while (
                total < this.volImitUp &&
                total > this.volImitDown &&
                bars < this.evalLength
            ) {
                const [bar1, bar2] = evalData.slice(bars, bars + 2);
                if (!bar1 || !bar2) {
                    debugger;
                    continue;
                }
                total += bar2.close - bar1.open;

                bars++;
            }

            // secondClose -
            //     firstClose +
            //     (thirdClose - secondClose) +
            //     (fourthClose - thirdClose); //+
            // (fifthClose - fourthClose);
            // console.log(total);
            if (total > this.volImitUp) {
                //Where did it start???
                this.findLowVolatilityOfGroup(
                    this.timesOfHighMomoUpGroupingTesting,
                    this.timesOfHighMomoUp,
                    // ATRs,
                    evalData.map((d) => d.low),
                    evalData,
                    i,
                    "low"
                );
                i += this.evalLength - 1;
            } else if (total < this.volImitDown) {
                //Where did it start???
                this.findLowVolatilityOfGroup(
                    this.timesOfHighMomoDownGroupingTesting,
                    this.timesOfHighMomoDown,
                    // ATRs,
                    evalData.map((d) => d.high),
                    evalData,
                    i,
                    "high"
                );
                i += this.evalLength - 1;
            }

            // if (fast > 5) {
            //     //Where did it start???

            //     this.findLowVolatilityOfGroup(
            //         this.timesOfFastHighMomoUpGroupingTesting,
            //         this.timesOfFastHighMomoUp,
            //         ATRs,
            //         evalData,
            //         i
            //     );
            // } else if (fast < -5) {
            //     //Where did it start???

            //     this.findLowVolatilityOfGroup(
            //         this.timesOfFastHighMomoDownGroupingTesting,
            //         this.timesOfFastHighMomoDown,
            //         ATRs,
            //         evalData,
            //         i
            //     );
            // }
        }
    }

    findLowVolatilityOfGroup(
        groupingTesting,
        plotArray,
        ATRs,
        evalData,
        i,
        highLow
    ) {
        let lowIndex; // indexOfSmallest(ATRs);
        if (highLow === "high") {
            lowIndex = indexOfLargest(ATRs);
        } else if (highLow === "low") {
            lowIndex = indexOfSmallest(ATRs);
        }

        let theBarIndex = i - (this.evalLength - lowIndex);
        let lowestAtrData = this.data.ohlcDatas[theBarIndex];

        let barCheck = checkBar(lowestAtrData);

        //if high, find the last green bar
        if (highLow === "high") {
            if (barCheck !== "green") {
                while (barCheck !== "green") {
                    //go back in time index to find a damn green bar!
                    theBarIndex--;
                    lowestAtrData = this.data.ohlcDatas[theBarIndex];
                    evalData.unshift(lowestAtrData);
                    barCheck = checkBar(lowestAtrData);
                }
            }
        } else if (highLow === "low") {
            //if low find  the last red bar
            if (barCheck !== "red") {
                while (barCheck !== "red") {
                    //go back in time index to find a damn red bar!
                    theBarIndex--;
                    lowestAtrData = this.data.ohlcDatas[theBarIndex];
                    barCheck = checkBar(lowestAtrData);
                }
            }
        }

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
        // this.SDZGfx.lineStyle(2, 0xffffff, 0.9);

        this.SDZGfx.beginFill(0x00ff00, fill);
        this.timesOfHighMomoUp.forEach((momo, i) =>
            drawMomoMarker(
                i,
                this.timesOfHighMomoUpGroupingTesting[i],
                momo,
                10,
                "demand"
            )
        );

        dataCounter = 0;
        this.SDZGfx.beginFill(0xff0000, fill);
        this.timesOfHighMomoDown.forEach((momo, i) =>
            drawMomoMarker(
                i,
                this.timesOfHighMomoDownGroupingTesting[i],
                momo,
                10,
                "supply"
            )
        );

        // dataCounter = 0;

        // this.SDZGfx.beginFill(0x00ffaa, fill);
        // this.timesOfFastHighMomoUp.forEach((momo, i) =>
        //     drawMomoMarker(
        //         i,
        //         this.timesOfFastHighMomoUpGroupingTesting[i],
        //         momo,
        //         10
        //     )
        // );

        // dataCounter = 0;
        // this.SDZGfx.beginFill(0xff00aa, fill);
        // this.timesOfFastHighMomoDown.forEach((momo, i) =>
        //     drawMomoMarker(
        //         i,
        //         this.timesOfFastHighMomoDownGroupingTesting[i],
        //         momo,
        //         10
        //     )
        // );

        function drawMomoMarker(i, groupTesting, momo, radius, SD) {
            if (!momo) return;
            let x;
            let timestamp = momo.timestamp;
            const y = that.data.priceScale(momo.open);
            if (timestamp < sliceStart) {
                debugger;
                x = that.data.xScale(0);
                timestamp = sliceStart;
                // return;
            }
            if (
                timestamp <= sliceEnd &&
                groupTesting[0].timestamp > sliceStart &&
                groupTesting.slice(-1)[0].timestamp < sliceEnd
            ) {
                debugger;
                // return;
                // console.log(groupTesting);
                let start = that.data.slicedData.findIndex(
                    (d) => d.timestamp === groupTesting[0].timestamp
                );
                if (start < 0) start = 1;
                const left = that.data.xScale(start);
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

                let end = that.data.slicedData.findIndex(
                    (d) => d.timestamp === groupTesting.slice(-1)[0].timestamp
                );
                if (end < 0) end = that.data.slicedData.length - 1;
                const width = that.data.xScale(end) - that.data.xScale(start);

                that.SDZGfx.drawRect(left, top, width, height);
            }

            if (x === undefined) {
                debugger;
                for (
                    let _x = dataCounter;
                    _x < that.data.slicedData.length;
                    _x++
                ) {
                    const ohlcData = that.data.slicedData[_x];

                    if (ohlcData.timestamp === timestamp) {
                        // dataCounter = _x;
                        x = that.data.xScale(_x);
                        break;
                    }
                }
            }
            if (!x) x = 1;
            that.SDZGfx.drawCircle(x, y, radius);

            const SD_ZONE_END = that.data.xScale(
                that.data.slicedData.length - 1
            );
            //supportZone
            if (SD === "supply") {
                let top = that.data.priceScale(momo.open);
                let bottom = that.data.priceScale(momo.low);

                let start = that.data.slicedData.findIndex(
                    (d) => d.timestamp === timestamp
                );
                if (start < 0) {
                    debugger;
                    start = 50;
                }
                const left = that.data.xScale(start);

                const height = bottom - top;
                // const width = 500;
                const width = SD_ZONE_END - that.data.xScale(start);

                that.SDZGfx.drawRect(left, top, width, height);
            } else if (SD === "demand") {
                debugger;
                let top = that.data.priceScale(momo.open);
                let bottom = that.data.priceScale(momo.low);

                let start = that.data.slicedData.findIndex(
                    (d) => d.timestamp === timestamp
                );
                if (start < 0) start = 0;
                const left = that.data.xScale(start);

                const height = bottom - top;
                // const width = 500;
                const width = SD_ZONE_END - that.data.xScale(start);

                that.SDZGfx.drawRect(left, top, width, height);
            }
        }
    }
}
