import MinMax from "./MinMax";

class PriceLevels extends MinMax {
    constructor(data, minMaxTolerance, priceLevelTolerance) {
        super(data, minMaxTolerance);
        this.priceLevelTolerance = priceLevelTolerance;
        console.log("PriceLevels");
        // this.lowPriceLevels();
        // this.highPriceLevels();
        this.makePriceLevels();
    }

    makePriceLevels() {
        this.priceLevels = [
            ...this.lowNodes.map((node) => ({
                value: node.low,
                index: node.index,
                highLow: node.highLow,
            })),
            ...this.highNodes.map((node) => ({
                value: node.high,
                index: node.index,
                highLow: node.highLow,
            })),
        ]
            .sort((a, b) => a.value - b.value)
            .reduce(this.groupLevels.bind(this), []);
    }
    lowPriceLevels() {
        this.lowPriceLevels = this.lowNodes
            .map((node) => ({
                value: node.low,
                index: node.index,
                highLow: node.highLow,
            }))
            .sort((a, b) => a.value - b.value)
            .reduce(this.groupLevels.bind(this), []);
    }

    highPriceLevels() {
        this.highPriceLevels = this.highNodes
            .map((node) => ({
                value: node.high,
                index: node.index,
                highLow: node.highLow,
            }))
            .sort((a, b) => a.value - b.value)
            .reduce(this.groupLevels.bind(this), []);
    }

    groupLevels(r, a, i, aa) {
        if (i === 0) {
            r.push([a]);
            return r;
        } else {
            const prev = aa[i - 1].value;
            let absDiff = Math.abs(a.value / prev - 1);

            if (prev && absDiff < this.priceLevelTolerance / 10000) {
                if (!Array.isArray(r[r.length - 1])) {
                    r[r.length - 1] = [r[r.length - 1]];
                }
                r[r.length - 1].push(a);
                return r;
            }
            r.push([a]);
            return r;
        }
    }
}

export default PriceLevels;
