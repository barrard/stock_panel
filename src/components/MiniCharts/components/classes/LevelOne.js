class LevelOne {
    constructor() {
        this.symbols = [
            "/ES",
            //  "/CL", "/YM", "/NQ", "/GC", "/RTY"
        ];
        this.props = [
            "bidPrice",
            "askPrice",
            "askSize",
            "bidSize",
            "lastPrice",
        ];

        //init level one? should move
        this.reset();
        this.lastLevelOneData = this.initObj(0);
        this.levelOneDataHistory = this.initObj();
        this.levelOneDataChangeHistory = this.initObj();
    }

    reset() {
        this.levelOneDataChangeArrays = this.initObj();
        this.levelOneDataArrays = this.initObj();
    }
    initObj(value) {
        return this.symbols.reduce(
            (acc, s) => ({ ...acc, [s]: this.initProps(value) }),
            {}
        );
    }
    initProps(value) {
        if (value === undefined) {
            return this.props.reduce((acc, p) => ({ ...acc, [p]: [] }), {});
        }
        return this.props.reduce((acc, p) => ({ ...acc, [p]: value }), {});
    }

    compile() {
        this.symbols.forEach((s) => {
            this.props.forEach((p) => {
                const data = this.levelOneDataArrays[s][p].length
                    ? this.levelOneDataArrays[s][p].reduce(
                          (acc, b) => acc + b,
                          0
                      ) / this.levelOneDataArrays[s][p].length
                    : this.lastLevelOneData[s][p];

                this.levelOneDataHistory[s][p].push(data);

                const change = this.levelOneDataChangeArrays[s][p].length
                    ? this.levelOneDataChangeArrays[s][p].reduce(
                          (acc, b) => acc + b,
                          0
                      ) / this.levelOneDataChangeArrays[s][p].length
                    : this.lastLevelOneData[s][p];

                this.levelOneDataChangeHistory[s][p].push(data);
            });
        });
        this.reset();
    }

    parse(levelOneArray) {
        let obj = {};
        if (Array.isArray(levelOneArray)) {
            levelOneArray.forEach((levelOne) =>
                this.parseLevelOne(levelOne, obj)
            );
        }
        return obj;
    }

    parseLevelOne(data, obj) {
        let symbol = data["key"].slice(0, -3);
        if (!this.lastLevelOneData[symbol]) return obj;
        console.log(data);
        let bidPrice = data["1"] || this.lastLevelOneData[symbol]["bidPrice"];
        let askPrice = data["2"] || this.lastLevelOneData[symbol]["askPrice"];
        let lastPrice = data["3"] || this.lastLevelOneData[symbol]["lastPrice"];
        let bidSize = data["4"] || this.lastLevelOneData[symbol]["bidSize"];
        let askSize = data["5"] || this.lastLevelOneData[symbol]["askSize"];

        obj[symbol] = { bidPrice, askPrice, askSize, bidSize, lastPrice };
    }

    handleLevelOne(levelOne) {
        // let levelOneDataChange = {};
        // setLevelOneData({ ...levelOne });
        let levelOneData = this.parse(levelOne);
        // console.log({ levelOneData });

        this.symbols.forEach((symbol) => {
            const data = levelOneData[symbol];
            if (!data) return;
            this.props.forEach((prop) => {
                let val = data[prop];
                // if (val === undefined) return;
                // if (val === undefined) {
                //     if (this.lastLevelOneData[symbol][prop] === undefined) {
                //         debugger;
                //         val = 0;
                //     } else {
                //         val = this.lastLevelOneData[symbol][prop];
                //     }
                // }
                this.levelOneDataArrays[symbol][prop].push(val);
                let lastVal = this.lastLevelOneData[symbol][prop];
                let delta = val - lastVal;
                this.levelOneDataChangeArrays[symbol][prop].push(delta);
                // levelOneDataChange[symbol][prop] = delta;

                this.lastLevelOneData[symbol][prop] = val;
            });
        });

        // levelOneDataChange.timestamp = new Date().toLocaleString();
        // levelOneDataChangeArrays.push(levelOneDataChange);
    }
}

export default LevelOne;
