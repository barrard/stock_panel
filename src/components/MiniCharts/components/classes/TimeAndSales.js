class TimeAndSales {
    constructor() {
        this.symbols = ["/ES", "/CL", "/YM", "/NQ", "/GC", "/RT"];

        this.lastTradePrice = this.init(null);
        this.lastTradeTime = this.init(null);
        //init raw time and sales
        this.resetRaw();

        //init history data
        this.tradeCountPerSecHistory = this.init([]);
        this.tradeVolPerSecHistory = this.init([]);
        this.volWeightedPerSecHistory = this.init([]);
        this.volPerTradePerSecHistory = this.init([]);
        this.tradePriceChangeHistory = this.init([]);
        this.tradeTimeChangeHistory = this.init([]);
    }

    init(value) {
        if (Array.isArray(value)) {
            return this.symbols.reduce((acc, s) => ({ ...acc, [s]: [] }), {});
        }
        return this.symbols.reduce((acc, s) => ({ ...acc, [s]: value }), {});
    }

    getTimeAndSalesStats(symbol, timeSalesData) {
        let arrayData = timeSalesData[symbol];
        let tradeNim = 0;
        arrayData.forEach((timeSandSale) => {
            tradeNim++;
            this._raw_tradeCount[symbol]++;
            this._raw_totalVol[symbol] += timeSandSale.lastSize;

            this._raw_volWeightedTradePrices[symbol].push(
                timeSandSale.lastPrice * timeSandSale.lastSize
            );

            let lastPrice =
                this.lastTradePrice[symbol] || timeSandSale.lastPrice; //Note this is the LAST trade price
            let tradeTime =
                this.lastTradeTime[symbol] || timeSandSale.tradeTime; //Note this is the LAST trade time

            this._raw_tradePriceChanges[symbol].push(
                timeSandSale.lastPrice - lastPrice
            );

            this._raw_tradeTimeDiffs[symbol].push(
                timeSandSale.tradeTime - tradeTime
            );

            this._raw_tradeVols[symbol].push(timeSandSale.lastSize);
            //setting last trade price
            this.lastTradePrice[symbol] = timeSandSale.lastPrice;
            //setting last trade time
            this.lastTradeTime[symbol] = timeSandSale.tradeTime;
        });
    }

    compile() {
        this.symbols.forEach((symbol) => {
            if (!this._raw_tradeCount[symbol]) {
                // return;
            }
            //this is the trades per second
            this.tradeCountPerSecHistory[symbol].push(
                this._raw_tradeCount[symbol]
            );
            //trade volume per second
            this.tradeVolPerSecHistory[symbol].push(this._raw_totalVol[symbol]);

            //volume weight per second
            if (this._raw_totalVol[symbol]) {
                this.volWeightedPerSecHistory[symbol].push(
                    this._raw_totalVol[symbol]
                        ? this._raw_volWeightedTradePrices[symbol].reduce(
                              (acc, b) => acc + b,
                              0
                          ) / this._raw_totalVol[symbol]
                        : 0
                );
            } else if (this._raw_volWeightedTradePrices[symbol].length) {
                throw new Error("How get trades and no volume?");
            }

            //Average vol per trade this second
            this.volPerTradePerSecHistory[symbol].push(
                this._raw_tradeCount[symbol]
                    ? this._raw_totalVol[symbol] / this._raw_tradeCount[symbol]
                    : 0
                // this._raw_tradeVols[symbol].reduce((acc, b) => acc + b, 0) /
                //     this._raw_tradeCount[symbol]
            );

            //Average time between trades this second
            if (this._raw_tradeTimeDiffs[symbol].length) {
                this.tradeTimeChangeHistory[symbol].push(
                    this._raw_tradeTimeDiffs[symbol].reduce(
                        (total, timeDiff) => Math.abs(timeDiff) + total,
                        0
                    ) / this._raw_tradeTimeDiffs[symbol].length
                );
            } else {
                this.tradeTimeChangeHistory[symbol].push(0);
            }

            //TEST
            //These should be equal
            if (
                this._raw_tradePriceChanges[symbol].length !==
                this._raw_tradeCount[symbol]
            ) {
                throw new Error("Got a miss match");
            }

            if (this._raw_tradePriceChanges[symbol].length) {
                this.tradePriceChangeHistory[symbol].push(
                    this._raw_tradePriceChanges[symbol].reduce(
                        (total, priceDiff) => priceDiff + total,
                        0
                    ) / this._raw_tradePriceChanges[symbol].length
                );
            } else {
                //if no trades, likely the price change was 0
                this.tradePriceChangeHistory[symbol].push(0);
            }
        });

        this.resetRaw();
    }

    resetRaw() {
        //Resetting time and sales raw data
        //initial values for some raw time and sales accumulation

        this._raw_tradeCount = this.init(0);
        this._raw_totalVol = this.init(0);

        this._raw_volWeightedTradePrices = this.init([]);
        this._raw_tradeTimeDiffs = this.init([]);
        this._raw_tradePriceChanges = this.init([]);
        this._raw_tradeVols = this.init([]);
    }

    handelTimeAndSales(timeSalesArray) {
        let timeSalesData = {};
        if (Array.isArray(timeSalesArray)) {
            timeSalesArray.forEach((data) =>
                this.parseTimeSales(data, timeSalesData)
            );
        } else console.error("ERROR!  timeSales is not an array");
        Object.keys(timeSalesData).forEach((symbol) =>
            this.getTimeAndSalesStats(symbol, timeSalesData)
        );
    }

    parseTimeSales(data, timeSalesData) {
        let symbol = data["key"].substring(0, 3);
        if (!timeSalesData[symbol]) timeSalesData[symbol] = [];
        let tradeTime = data[1];
        let lastPrice = data[2];
        let lastSize = data[3];
        let lastSequence = data[4];
        timeSalesData[symbol].push({
            lastPrice,
            tradeTime,
            lastSize,
            lastSequence,
        });
    }
}

export default TimeAndSales;
