import * as SS from "simple-statistics";

class CalcVolProfile {
    constructor(data) {
        this.data = data;
        console.log("CalcVolProfile");
        this.volProfile = {};
        this.runProfile();
        this.fundHVN();
        this.findValueArea();
    }
    runProfile() {
        let dailyProfile = {};
        let tickSize = 0.1; //  getTickSize()  //0.1;
        return;
        this.data.forEach((d) => {
            const { open, high, low, close, volume } = d;

            const even = high === low;
            // const _low = low + tickSize;
            const range = Math.floor(
                ((even ? tickSize : high - low) * (1 / tickSize) * 100) / 100
            );
            debugger;
            if (range.toString().length > 7) {
                debugger;
            }
            const volPortion = Math.ceil(volume / range);

            if (range < 0) {
                debugger;
            }

            const sillyArray = new Array(range).fill(0);

            sillyArray.forEach((_, i) => {
                console.log(i);
                const start = i * tickSize;
                debugger;
                if (!dailyProfile[start]) {
                    dailyProfile[start] = 0;
                }
                dailyProfile[start] += volPortion;
            });

            // {
            // if (!dailyProfile[start]) {
            //     dailyProfile[start] = 0;
            // }
            // dailyProfile[start] += volPortion;
            // }

            // //get the range, and divide by 10, lets put the volume in 10 equal bins, but I do want to somehow favor the close
            // const range = Math.ceil(((high - low) % 10) * 10);
            // let end = gtrdn(high);
            // // let start = parseFloat(low.toFixed(1));
            // let start = gtrdn(low);
            // // console.log({ open, high, low, close, volume, start, end });
            // for (let i = 0; i < range; i++) {
            //     const plusplus = i * tickSize;
            //     const current = parseFloat((start + plusplus).toFixed(1));
            //     if (!dailyProfile[current]) {
            //         dailyProfile[current] = 0;
            //     }
            //     dailyProfile[current] += Math.ceil(volume / range);
            // }
        });
        this.volProfile = dailyProfile;
    }

    findValueArea() {
        let max = SS.max(this.HVNs);
        //find the max HVN Price
        const volProfile = this.volProfile;
        const prices = Object.keys(volProfile).sort((a, b) => a - b);
        if (!prices.length) return;
        const vols = Object.values(volProfile);
        console.log(prices);
        let priceHVN = prices.find((p) => volProfile[p] === max);
        const indexPOC = prices.indexOf(priceHVN);
        let totalVol = vols.reduce((acc, val) => (acc += val), 0);
        const valAreaVol = totalVol * 0.7;
        let valAreaVolSum = volProfile[priceHVN];
        let topIndex = indexPOC;
        let bottomIndex = indexPOC;

        const { valueHigh, valueLow } = sumValArea(topIndex, bottomIndex);
        this.valueAreaHigh = prices[valueHigh];
        this.valueAreaLow = prices[valueLow];
        this.POC = prices[indexPOC];

        function sumValArea(topIndex, bottomIndex) {
            let _2Below = prices.slice(bottomIndex - 2, bottomIndex);
            let _2Above = prices.slice(topIndex + 1, topIndex + 3);

            let aboveSum = _2Above.reduce(
                (acc, price) => acc + volProfile[price],
                0
            );
            let belowSum = _2Below.reduce(
                (acc, price) => acc + volProfile[price],
                0
            );
            // console.log({ _2Above, _2Below });
            if (aboveSum === belowSum) {
                // console.log("hmm, take both?");
                valAreaVolSum += belowSum;
                valAreaVolSum += aboveSum;
                bottomIndex = bottomIndex - 2;
                topIndex = topIndex + 2;
            } else if (belowSum > aboveSum) {
                valAreaVolSum += belowSum;
                bottomIndex = bottomIndex - 2;
            } else if (aboveSum > belowSum) {
                valAreaVolSum += aboveSum;
                // return sumValArea(topIndex + 2, bottomIndex);
                topIndex = topIndex + 2;
            }

            if (valAreaVolSum >= valAreaVol) {
                return { valueHigh: topIndex, valueLow: bottomIndex };
            } else {
                // console.log({ valAreaVolSum, valAreaVol });
                return sumValArea(topIndex, bottomIndex);
            }
        }

        return;
    }

    fundHVN() {
        //find the deviation?

        this.HVNs = topN(Object.values(this.volProfile), 3);
        this.LVNs = bottomN(Object.values(this.volProfile), 3);
    }
}

export default CalcVolProfile;

const topN = (arr, n) => {
    if (n > arr.length) {
        return false;
    }
    return arr
        .slice()
        .sort((a, b) => {
            return b - a;
        })
        .slice(0, n);
};
const bottomN = (arr, n) => {
    if (n > arr.length) {
        return false;
    }
    return arr
        .slice()
        .sort((a, b) => {
            return a - b;
        })
        .slice(0, n);
};

function gtrdn(num) {
    let _num = String(num).split(".");
    if (_num.length <= 1) {
        return num;
    }
    if (_num.length != 2) {
        throw new Error("WTF");
    }
    let dec = _num[1].split("")[0];
    num = `${_num[0]}.${dec}`;
    return parseFloat(num);
}
