import { makeEMA } from "../../../../../indicators/indicatorHelpers/MovingAverage";
import extrema from "../../../../../indicators/indicatorHelpers/extrema";

class MinMax {
    constructor(
        data,
        tolerance = 1,
        zigZagTolerance = 0.019,
        zigZagRegressionErrorLimit,
        toggleZigzagDynamic
    ) {
        this.data = data;
        this.tolerance = tolerance > 0 ? tolerance : 1;
        this.zigZagTolerance = zigZagTolerance > 0 ? zigZagTolerance : 0.0001;
        this.zigZagRegressionErrorLimit = zigZagRegressionErrorLimit || 5;
        this.toggleZigzagDynamic = toggleZigzagDynamic;
        // this.highs = data.map((d) => d.high);
        // this.lows = data.map((d) => d.low);

        this.lowNodes = this.find("low");
        this.highNodes = this.find("high");
        this.highLowerLows = this.highLower("low");
        this.highLowerHighs = this.highLower("high");
        this.zigZag = this.getZigZag();
        this.regressionZigZag = this.runRegressionSwings();
        this.zigZagFibs = this.runZigZagFibs();
    }

    runZigZagFibs() {
        const fibsList = [];
        const arbitraryLimit = 0.01; //1%
        console.log(this.swings);
        this.swings.forEach((swing, swingIndex) => {
            if (swingIndex === this.swings.length - 1) return;
            const firstPoint = swing;
            const secondPoint = this.swings[swingIndex + 1];
            // console.log({ firstPoint, secondPoint });
            let lowToHigh;
            if (firstPoint.name === "high" && secondPoint.name === "low") {
                lowToHigh = false;
            } else if (
                firstPoint.name === "low" &&
                secondPoint.name === "high"
            ) {
                lowToHigh = true;
            } else {
                throw Error("fibs are broken");
            }

            if (lowToHigh) {
                const diff = secondPoint.val.y - firstPoint.val.y;
                if (firstPoint.val.y * arbitraryLimit > diff) {
                    // console.log("lets say this is too small to matter");
                    return;
                }
                const _50 = secondPoint.val.y - diff / 2;
                const _62 = secondPoint.val.y - diff * 0.62;
                const _38 = secondPoint.val.y - diff * 0.38;
                fibsList.push({ firstPoint, secondPoint, _38, _50, _62 });
            } else if (!lowToHigh) {
                const diff = firstPoint.val.y - secondPoint.val.y;
                if (firstPoint.val.y * arbitraryLimit > diff) {
                    // console.log("lets say this is too small to matter");
                    return;
                }
                const _50 = secondPoint.val.y + diff / 2;
                const _62 = secondPoint.val.y + diff * 0.62;
                const _38 = secondPoint.val.y + diff * 0.38;

                fibsList.push({ firstPoint, secondPoint, _38, _50, _62 });
            }
        });

        this.fibsList = fibsList;
        return fibsList;
    }

    getZigZag() {
        //make a smooth MA
        const smoothValue = 1;
        const smoothMinMax = [];
        const t = smoothValue;
        //Loop to find all high and low locals
        for (let i = 1; i < this.data.length - 1; i++) {
            if (i === 1) {
                smoothMinMax.push({
                    val: { y: this.data[i].close },
                    name: "start",
                    index: i,
                    datetime: this.data[i]?.datetime || this.data[i]?.timestamp,
                });
            }

            let { middle, left, right } = this.leftRightCenter(this.data, i, 1);
            const isHighLow = this.compare(left, right, middle);
            if (isHighLow) {
                let val;
                if (isHighLow === "high") {
                    // val = { y: this.data[i].close };
                    val = { y: this.data[i].high };
                } else if (isHighLow === "low") {
                    // val = { y: this.data[i].close };
                    val = { y: this.data[i].low };
                } else if (isHighLow === "both") {
                    //if both, send both high and low, then later check what the last value was.....

                    //why no y, WE NEED A y
                    //based on last value.name, if high then check is this high, else, take the low value
                    const last_smoothMinMax =
                        smoothMinMax[smoothMinMax.length - 1];

                    val = {
                        high: this.data[i].high,
                        low: this.data[i].low,
                        close: this.data[i].close,
                    };
                } else {
                    // debugger;
                    console.log("WHHHAAATT??!!");
                }

                smoothMinMax.push({
                    val: val,
                    name: isHighLow,
                    index: i,
                    datetime: this.data[i].datetime,
                });
            }
        }

        // console.log({ smoothMinMax });

        /**   Second Step, filtering out the smaller moves */
        /**  * Use zigzag tolerance to alter the output */
        let moveLimit = this.zigZagTolerance; //5%
        const swings = [smoothMinMax[0]];

        smoothMinMax.forEach((minMaxValue, i, arr) => {
            let diff1, diff2;
            let lastVal = swings[swings.length - 1];

            if (minMaxValue.val.y !== undefined) {
                diff1 = Math.abs(lastVal.val.y - minMaxValue.val.y);
            } else {
                diff1 = Math.abs(lastVal.val.y - minMaxValue.val.high);
                diff2 = Math.abs(lastVal.val.y - minMaxValue.val.low);
            }

            if (
                minMaxValue.name === lastVal.name ||
                minMaxValue.name === "both"
            ) {
                if (lastVal.name === "high") {
                    if (minMaxValue.name === "high") {
                        if (minMaxValue.val.y >= lastVal.val.y) {
                            swings[swings.length - 1] = minMaxValue;
                            return;
                        }
                    } else if (minMaxValue.name === "both") {
                        if (minMaxValue.val.high >= lastVal.val.y) {
                            const newVal = {
                                index: minMaxValue.index,
                                datetime: minMaxValue.datetime,
                                val: { y: minMaxValue.val.high },
                                name: "high",
                            };
                            swings[swings.length - 1] = newVal;
                            return;
                        }
                    }
                }
                if (lastVal.name === "low") {
                    if (minMaxValue.name === "low") {
                        if (minMaxValue.val.y <= lastVal.val.y) {
                            swings[swings.length - 1] = minMaxValue;
                            return;
                        }
                    } else if (minMaxValue.name === "both") {
                        if (minMaxValue.val.low <= lastVal.val.y) {
                            const newVal = {
                                index: minMaxValue.index,
                                datetime: minMaxValue.datetime,
                                val: { y: minMaxValue.val.low },
                                name: "low",
                            };
                            swings[swings.length - 1] = newVal;
                            return;
                        }
                    }
                }
            }

            //If the very first values comes through this should run
            if (lastVal.name === "start") {
                if (i !== 0) {
                    debugger;
                    throw new Error(
                        "this should only happen on the very first value"
                    );
                }
                //need a default to start with.
                //try high
                swings[swings.length - 1] = {
                    name: "high",
                    index: minMaxValue.index,
                    val: { y: minMaxValue.val.y || minMaxValue.val.high }, //add the y OR high, JUST DO IT (likely this could just be 'y')
                };

                //try low

                // swings[swings.length - 1] = {
                //     name: "low",
                //     index: minMaxValue.index,
                //     val: { y: minMaxValue.val.y || minMaxValue.val.low }, //add the y OR high, JUST DO IT (likely this could just be 'y')
                // };
                return;
            }

            // console.log({ diff1, diff2, perc: lastVal.val.y * moveLimit });

            if (minMaxValue.name == "both") {
                // if it was a high, then, replace the high
                const highDiff = lastVal.val.y * this.zigZagTolerance < diff1;
                const lowDiff = lastVal.val.y * this.zigZagTolerance < diff2;
                if (!highDiff && !lowDiff) {
                    //this is insignificunt
                    // console.log("this is insignificunt", { highDiff, lowDiff });
                    return;
                }

                if (lastVal.name === "high" && lowDiff) {
                    //replace the last val with this high
                    const newVal = {
                        datetime: minMaxValue.datetime,

                        name: "low",
                        index: minMaxValue.index,
                        val: { y: minMaxValue.val.low },
                    };

                    if (this.compareLastIndex(newVal, lastVal)) {
                        swings.push(newVal);
                        moveLimit = this.zigZagTolerance;
                    } else {
                        moveLimit += 0.001;
                    }
                } else if (lastVal.name === "low" && highDiff) {
                    //replace the last val with this low
                    const newVal = {
                        name: "high",
                        index: minMaxValue.index,
                        datetime: minMaxValue.datetime,
                        val: { y: minMaxValue.val.high },
                    };

                    if (this.compareLastIndex(newVal, lastVal)) {
                        swings.push(newVal);
                        moveLimit = this.zigZagTolerance;
                    } else {
                        moveLimit += 0.001;
                    }
                } else {
                    //we got a new high or low, sooo check for which
                    //if last was a high, and we got a new low, add it
                    if (lastVal.name === "high") {
                        const newVal = {
                            datetime: minMaxValue.datetime,

                            name: "low",
                            index: minMaxValue.index,
                            val: { y: minMaxValue.val.low },
                        };
                        if (this.compareLastIndex(newVal, lastVal)) {
                            swings.push(newVal);
                            moveLimit = this.zigZagTolerance;
                        } else {
                            moveLimit += 0.001;
                        }
                    } else if (lastVal.name === "low") {
                        const newVal = {
                            name: "high",
                            datetime: minMaxValue.datetime,

                            index: minMaxValue.index,
                            val: { y: minMaxValue.val.high },
                        };
                        if (this.compareLastIndex(newVal, lastVal)) {
                            swings.push(newVal);
                            moveLimit = this.zigZagTolerance;
                        } else {
                            moveLimit += 0.001;
                        }
                    } else {
                        console.log("STOP!!!!!");
                        throw new Error("STOP!!!");
                    }
                }
            } else if (minMaxValue.name === "both") {
                if (lastVal.name === "high") {
                    const newVal = {
                        datetime: minMaxValue.datetime,

                        name: "low",
                        y: { y: minMaxValue.val.low },
                        index: minMaxValue.index,
                    };
                    if (this.compareLastIndex(newVal, lastVal)) {
                        swings.push(newVal);
                        moveLimit = this.zigZagTolerance;
                    } else {
                        moveLimit += 0.001;
                    }
                } else if (lastVal.name === "low") {
                    const newVal = {
                        datetime: minMaxValue.datetime,

                        name: "high",
                        y: { y: minMaxValue.val.high },
                        index: minMaxValue.index,
                    };
                    if (this.compareLastIndex(newVal, lastVal)) {
                        swings.push(newVal);
                        moveLimit = this.zigZagTolerance;
                    } else {
                        moveLimit += 0.001;
                    }
                }
            } else if (diff1 > lastVal.val.y * this.zigZagTolerance) {
                //only go swing high, low, high, low, etc...
                if (lastVal.name === minMaxValue.name) {
                    if (
                        (lastVal.name === "high" &&
                            minMaxValue.val.y > lastVal.val.y) ||
                        (lastVal.name === "low" &&
                            minMaxValue.val.y < lastVal.val.y)
                    ) {
                        swings[swings.length - 1] = minMaxValue;
                    }
                } else {
                    if (this.compareLastIndex(minMaxValue, lastVal)) {
                        swings.push(minMaxValue);
                        moveLimit = this.zigZagTolerance;
                    } else {
                        moveLimit += 0.001;
                    }
                }
            }
        });

        this.swings = swings;

        return { swings, smoothMinMax };
    }

    compareLastIndex(current, last) {
        const indexDiff = current.index - last.index;
        const yDiff = current.val.y - last.val.y;
        const percDiff = Math.abs(yDiff) / last.val.y;
        if (percDiff < 0.01 && indexDiff <= 5 && this.toggleZigzagDynamic) {
            console.log("can we skip?");
            return false;
        } else {
            return true;
        }
    }

    runRegressionSwings() {
        // console.log(this.swings);
        if (!this.swings?.length && this.swings[0] !== undefined) {
            return;
        }
        const lows = this.swings.filter((d) => {
            return d?.name === "low";
        });
        const highs = this.swings.filter((d) => d?.name === "high");
        const regressionLowLines = extrema.regressionAnalysis(
            lows.map((low) => ({ y: low.val.y, x: low.index })),
            this.zigZagRegressionErrorLimit
        );
        const regressionHighLines = extrema.regressionAnalysis(
            highs.map((high) => ({ y: high.val.y, x: high.index })),
            this.zigZagRegressionErrorLimit
        );
        return { regressionLowLines, regressionHighLines };
    }

    //loop over the high/low node indexes and compare to the previous node
    highLower(highLow) {
        let finds = [];
        const data = highLow === "high" ? this.highNodes : this.lowNodes;
        // const values = highLow === "high" ? this.highs : this.lows;
        for (let i = 0; i < data.length; i++) {
            if (i === 0) {
                finds.push({ data: data[i], name: "start" });
                continue;
            }
            const prev = data[i - 1][highLow];
            const curr = data[i][highLow];
            if (curr > prev) {
                finds.push({ index: i, data: data[i], name: "higher" });
            } else if (curr < prev) {
                finds.push({ index: i, data: data[i], name: "lower" });
            } else {
                finds.push({ index: i, data: data[i], name: "equal" });
            }
        }
        return finds;
    }

    find(highLow) {
        let finds = [];
        // const data = highLow === "high" ? this.highs : this.lows;
        const t = this.tolerance;
        for (let i = t; i < this.data.length - t; i++) {
            let { middle, left, right } = this.leftRightCenter(this.data, i, t);

            const found = this.compare(left, right, middle, highLow);
            if (found) {
                finds.push({
                    ...this.data[i],
                    index: i,
                    highLow: highLow === "high" ? "high" : "low",
                });
                i = i + t - 1;
            }
        }
        return finds;
    }

    /**
     *
     * @param {Array*} left : ;array of numbers to the left of middle
     * @param {Array} right array of numbers to the right of middle
     * @param {Int} middle single value to compare to the right and left
     * @param {Boolean} highLow high or low, true false
     */
    compare(left, right, middle, highLow) {
        let found = true;
        //Test for highs
        if (highLow === "high") {
            //USE THE CLOSE INSTEAD OF THE HIGH
            highLow = "close";
            //test the left
            left.forEach((val) => {
                if (val[highLow] > middle[highLow]) found = false;
            });
            if (!found) return;
            //test the right
            right.forEach((val) => {
                if (val[highLow] > middle[highLow]) found = false;
            });
            return found;
        }
        //test for lows
        else if (highLow === "low") {
            //USE THE CLOSE INSTEAD OF THE HIGH
            highLow = "close";
            //test the left
            left.forEach((val) => {
                if (val[highLow] < middle[highLow]) found = false;
            });
            if (!found) return;
            //test the right
            right.forEach((val) => {
                if (val[highLow] < middle[highLow]) found = false;
            });
            return found;
        } else if (!highLow) {
            let highVal = true;
            let lowVal = true;
            let highDiff = 0;
            let lowDiff = 0;
            //determine is this is a high or low
            //check High
            [...left, ...right].forEach(({ high, close }) => {
                if (close > middle.close) {
                    // if (high > middle.high) {
                    // let _highDiff = high - middle.high;
                    highVal = false;
                    // highDiff = highDiff < _highDiff ? _highDiff : highDiff;
                }
            });
            //check low
            [...left, ...right].forEach(({ low, close }) => {
                if (close < middle.close) {
                    // if (low < middle.low) {
                    // let _lowDiff = middle.low - low;
                    // lowDiff = _lowDiff < lowDiff ? lowDiff : _lowDiff;
                    lowVal = false;
                }
            });

            // debugger;
            if (highVal && lowVal) {
                // console.log("huh?");
                // if (highDiff > lowDiff) {
                //     return "high";
                // } else if (highDiff < lowDiff) {
                //     return "low";
                // } else if (highDiff === lowDiff) {
                return "both";
                //     //curious what the last smoothMinMAx was
                // }
            } else if (highVal) {
                // console.log("found one");
                return "high";
            } else if (lowVal) {
                return "low";
            } else {
                // console.log("not a high or a low");
            }
        }
    }

    leftRightCenter(data, i, t) {
        let middle = data[i];
        let left = data.slice(i - t, i);
        let right = data.slice(i + 1, i + t + 1);

        return { left, right, middle };
    }
}

export default MinMax;
