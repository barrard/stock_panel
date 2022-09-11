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

    getTickSize(symbol) {
        switch (symbol) {
            case "/ES":
            case "/NQ":
                return 0.25;
            case "/GC":
            case "/CL":
                return 0.01;
            case "/RTY":
                return 0.1;
            case "/YM":
                return 1;

            default:
                return 0.01;
        }
    }
    runProfile() {
        let dailyProfile = {};
        let tickSize = this.getTickSize(this.data[0].symbol); //0.1;

        this.data.forEach((d) => {
            const { open, high, low, close, volume } = d;

            const range =
                high - low != 0
                    ? parseFloat((high - low).toFixed(2))
                    : tickSize;

            const volPortion = range
                ? volume
                    ? Math.ceil(volume / ((range + tickSize) / tickSize))
                    : 0
                : volume;

            if (volPortion === Infinity) {
                console.log("stop");
                debugger;
            }
            for (let x = low; x <= high; x = x + tickSize) {
                x = parseFloat(x.toFixed(2));

                if (!dailyProfile[x]) {
                    dailyProfile[x] = 0;
                }
                dailyProfile[x] += volPortion;
            }
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
        // console.log(prices);
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
            try {
                if (!bottomIndex) {
                    debugger;
                }
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
            } catch (err) {
                console.log(err);
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
