import { makeEMA } from "../../../../../indicators/indicatorHelpers/MovingAverage";
class MinMax {
    constructor(data, tolerance = 1, zigZagTolerance = 0.001) {
        this.data = data;
        this.tolerance = tolerance > 0 ? tolerance : 1;
        this.zigZagTolerance = zigZagTolerance > 0 ? zigZagTolerance : 0.0001;
        // this.highs = data.map((d) => d.high);
        // this.lows = data.map((d) => d.low);

        this.lowNodes = this.find("low");
        this.highNodes = this.find("high");
        this.highLowerLows = this.highLower("low");
        this.highLowerHighs = this.highLower("high");
        this.zigZag = this.getZigZag();
    }

    getZigZag() {
        //make a smooth MA
        const smoothValue = 1;

        // let smooth = makeEMA(this.data, smoothValue);
        // smooth = smooth.slice(0, 10);
        // console.log(smooth);
        const smoothMinMax = [];
        const t = smoothValue;
        for (let i = t; i < this.data.length - t; i++) {
            if (i === t) {
                smoothMinMax.push({
                    val: { y: this.data[i].close },
                    name: "start",
                    index: i,
                });
            }
            let { middle, left, right } = this.leftRightCenter(this.data, i, t);
            const isHighLow = this.compare(left, right, middle);
            if (isHighLow) {
                let val;
                if (isHighLow === "high") {
                    val = { y: this.data[i].high };
                } else if (isHighLow === "low") {
                    val = { y: this.data[i].low };
                } else if (isHighLow === "both") {
                    //if both, send both high and low, then later check what the last value was.....
                    val = { high: this.data[i].high, low: this.data[i].low };
                } else {
                    debugger;
                    console.log("WHHHAAATT??!!");
                }

                smoothMinMax.push({
                    val: val,
                    name: isHighLow,
                    index: i,
                });
            }
        }

        //filter out small moves
        const moveLimit = this.zigZagTolerance; //5%
        const swings = [smoothMinMax[0]];

        smoothMinMax.forEach((minMaxValue, i, arr) => {
            //diff1 = high | dif2 = low
            let diff1, diff2;
            let lastVal = swings[swings.length - 1];

            if (minMaxValue.name === lastVal.name) {
                if (minMaxValue.name === "both") {
                    throw new Error("this will break");
                }
                if (
                    lastVal.name === "high" &&
                    minMaxValue.val.y >= lastVal.val.y
                ) {
                    swings[swings.length - 1] = minMaxValue;

                    return;
                } else if (
                    lastVal.name === "low" &&
                    minMaxValue.val.y <= lastVal.val.y
                ) {
                    swings[swings.length - 1] = minMaxValue;

                    return;
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
                // swings[swings.length - 1] = {
                //     name: "high",
                //     index: minMaxValue.index,
                //     val: { y: minMaxValue.val.y || minMaxValue.val.high }, //add the y OR high, JUST DO IT (likely this could just be 'y')
                // };

                //try low

                swings[swings.length - 1] = {
                    name: "low",
                    index: minMaxValue.index,
                    val: { y: minMaxValue.val.y || minMaxValue.val.low }, //add the y OR high, JUST DO IT (likely this could just be 'y')
                };
                return;
            }

            if (minMaxValue.val.y) {
                diff1 = Math.abs(lastVal.val.y - minMaxValue.val.y);
            } else {
                // debugger;
                diff1 = Math.abs(lastVal.val.y - minMaxValue.val.high);
                diff2 = Math.abs(lastVal.val.y - minMaxValue.val.low);
            }
            console.log({ diff1, diff2, perc: lastVal.val.y * moveLimit });

            if (minMaxValue.name == "both") {
                // debugger;
                // if it was a high, then, replace the high

                const highDiff = lastVal.val.y * moveLimit < diff1;
                const lowDiff = lastVal.val.y * moveLimit < diff2;
                if (!highDiff && !lowDiff) {
                    //this is insignificunt
                    console.log("this is insignificunt");
                    return;
                }

                if (lastVal.name === "high" && lowDiff) {
                    // && minMaxValue.name === "high"
                    // debugger;
                    //replace the last val with this high
                    const newVal = {
                        name: "low",
                        index: minMaxValue.index,
                        val: { y: minMaxValue.val.low },
                    };
                    if (lastVal.name === minMaxValue.name) {
                        swings[swings.length - 1] = newVal;
                    } else {
                        swings.push(newVal);
                    }
                } else if (lastVal.name === "low" && highDiff) {
                    // && minMaxValue.name === "low"
                    // debugger;
                    //replace the last val with this low
                    const newVal = {
                        name: "high",
                        index: minMaxValue.index,
                        val: { y: minMaxValue.val.high },
                    };
                    if (lastVal.name === minMaxValue.name) {
                        swings[swings.length - 1] = newVal;
                    } else {
                        swings.push(newVal);
                    }
                } else {
                    debugger;
                    //we got a new high or low, sooo check for which

                    console.log("is this a new swing???");
                    //if last was a high, and we got a new low, add it
                    if (lastVal.name === "high") {
                        // debugger;
                        const newValue = {
                            name: "low",
                            index: minMaxValue.index,
                            val: { y: minMaxValue.val.low },
                        };
                        swings.push(newValue);
                        lastVal = newValue;
                    } else if (lastVal.name === "low") {
                        // debugger;
                        const newValue = {
                            name: "high",
                            index: minMaxValue.index,
                            val: { y: minMaxValue.val.high },
                        };
                        swings.push(newValue);
                        lastVal = newValue;
                    } else {
                        console.log("STOP!!!!!");
                        throw new Error("STOP!!!");
                    }
                }
            } else if (diff1 > lastVal.val.y * moveLimit) {
                //only go swing high, low, high, low, etc...
                if (lastVal.name === minMaxValue.name) {
                    swings[swings.length - 1] = minMaxValue;
                } else {
                    swings.push(minMaxValue);
                    // lastVal = minMaxValue;
                }
            }
        });

        return { swings, smoothMinMax };
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
            //determine is this is a high or low
            //check High
            [...left, ...right].forEach(({ high }) => {
                if (high > middle.high) {
                    highVal = false;
                }
            });

            [...left, ...right].forEach(({ low }) => {
                if (low < middle.low) {
                    lowVal = false;
                }
            });

            if (highVal && lowVal) {
                console.log("huh?");
                return "both";
                debugger;
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
