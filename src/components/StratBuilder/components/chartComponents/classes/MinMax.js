class MinMax {
    constructor(data, tolerance = 1) {
        this.data = data;
        this.tolerance = tolerance > 0 ? tolerance : 1;
        // this.highs = data.map((d) => d.high);
        // this.lows = data.map((d) => d.low);

        this.lowNodes = this.find("low");
        this.highNodes = this.find("high");
        this.highLowerLows = this.highLower("low");
        this.highLowerHighs = this.highLower("high");
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
        if (highLow === "low") {
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
