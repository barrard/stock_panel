export function priceScaleValues({ highest, lowest, tickSize }) {
    const _highest = highest;
    const diff = highest - lowest;
    let priceValues = [];

    const one = 1;
    const five = one * 5;
    const ten = five * 2;

    const twenty = five * 4;

    //find startingValue
    let tickSpread = diff / this.maxTicks;

    // console.log({ diff, tickSpread });

    if (tickSpread > 10000) {
        tickSpread = 25000;
        while (highest % tickSpread !== 0 && highest > 0) {
            highest -= this.tickSize;
        }
    } else if (tickSpread > 1000) {
        tickSpread = 5000;
        while (highest % tickSpread !== 0 && highest > 0) {
            highest -= this.tickSize;
        }
    } else if (tickSpread > 500) {
        tickSpread = 1000;
        while (highest % tickSpread !== 0 && highest > 0) {
            highest -= this.tickSize;
        }
    } else if (tickSpread > 100) {
        tickSpread = 500;
        while (highest % tickSpread !== 0 && highest > 0) {
            highest -= this.tickSize;
        }
    } else if (tickSpread > 4) {
        tickSpread = twenty;
        while (highest % tickSpread !== 0 && highest > 0) {
            highest -= this.tickSize;
        }
    } else if (tickSpread > 2) {
        tickSpread = ten;

        while (highest % ten !== 0 && highest > 0) {
            highest -= this.tickSize;
        }
    } else if (tickSpread > 1) {
        tickSpread = five;

        while (highest % five !== 0 && highest > 0) {
            highest -= this.tickSize;
        }
    } else if (tickSpread > 0.5) {
        tickSpread = one;

        while (highest % one !== 0 && highest > 0) {
            highest -= this.tickSize;
        }
    } else {
        tickSpread = this.tickSize * 2;

        while (highest % tickSpread !== 0 && highest > 0) {
            highest -= this.tickSize;
        }
    }

    let price = highest;
    while (price > lowest) {
        priceValues.push(price);
        price -= tickSpread;
    }

    return priceValues;
}

export function timeScaleValues({ highest, lowest, values }) {
    let timeValues = [];

    const fiveMin = 1000 * 60 * 5;
    const fifteenMin = fiveMin * 3;

    const hour = fifteenMin * 4;
    const fourHour = hour * 4;
    const eightHour = fourHour * 2;
    const sixteenHour = eightHour * 4;

    lowest = values[0];
    highest = values[values.length - 1];

    const sixteenHours = [];
    const eightHours = [];
    const fourHours = [];
    const hours = [];
    const fifteenMins = [];
    const fiveMins = [];

    for (let x = 0; x < values.length; x++) {
        const time = values[x];
        if (time % sixteenHour === 0) {
            sixteenHours.push(x);
        }
        if (time % eightHour === 0) {
            eightHours.push(x);
        }
        if (fourHours.length > 8) continue;

        if (time % fourHour === 0) {
            fourHours.push(x);
        }
        if (hours.length > 8) continue;

        if (time % hour === 0) {
            hours.push(x);
        }
        if (fifteenMins.length > 8) continue;
        if (time % fifteenMin === 0) {
            fifteenMins.push(x);
        }
        if (time % fiveMin === 0) {
            fiveMins.push(x);
        }
    }

    if (fiveMins.length < 8) {
        timeValues = fiveMins; //.filter((el, i) => i % 2 != 0);
    } else if (fifteenMins.length < 8) {
        timeValues = fifteenMins; //.filter((el, i) => i % 2);
    } else if (hours.length < 8) {
        timeValues = hours; //.filter((el, i) => i % 2);
    } else if (fourHours.length < 8) {
        timeValues = fourHours; //.filter((el, i) => i % 2);
    } else if (eightHours.length < 8) {
        timeValues = eightHours; //.filter((el, i) => i % 2);
    } else if (sixteenHours.length < 8) {
        timeValues = sixteenHours; //.filter((el, i) => i % 2);
    }

    return timeValues;
}

export const symbolOptions = [
    //Index Futures
    { value: "ES", name: "S&P 500 Index (E-mini) (ES)", exchange: "CME" },
    { value: "NQ", name: "Nasdaq-100 Futures (E-mini) (NQ)", exchange: "CME" },
    { value: "YM", name: "Dow Jones Industrial Average (Mini) (YM)", exchange: "CBOT" },
    { value: "RTY", name: "Russell 2000 Index (Mini) (RTY):", exchange: "CME" },
    { value: "NK", name: "Nikkei 225 (NK):", exchange: "CME" },

    // Interest Rate Futures
    { value: "ZT", name: "2-Year Treasury Note (ZT)", exchange: "CBOT" },
    { value: "ZF", name: "5-Year Treasury Note (ZF)", exchange: "CBOT" },
    { value: "ZN", name: "10-Year Treasury Note (ZN)", exchange: "CBOT" },
    { value: "ZB", name: "30-Year Treasury Bond (ZB)", exchange: "CBOT" },
    { value: "GE", name: "Eurodollar (GE)", exchange: "CME" },
    //Financial Futures
    { value: "VX", name: "Volatility Index (VX)", exchange: "CBOE" },
    { value: "6E", name: "Euro FX (EUR/USD) (6E)", exchange: "CME" },

    // Energy Futures
    { value: "CL", name: "Crude Oil (WTI) (CL)", exchange: "NYMEX" },
    { value: "NG", name: "Natural Gas (NG)", exchange: "NYMEX" },
    { value: "RB", name: "Gasoline (RB)", exchange: "NYMEX" },
    { value: "HO", name: "Heating Oil (HO)", exchange: "NYMEX" },

    //Agricultural Futures
    { value: "ZC", name: "Corn (ZC): ", exchange: "CBOT" },
    { value: "ZS", name: "Soybeans (ZS)", exchange: "CBOT" },
    { value: "ZW", name: "Wheat (ZW)", exchange: "CBOT" },
    { value: "LC", name: "Live Cattle (LC)", exchange: "CME" },
    { value: "FC", name: "Feeder Cattle (FC)", exchange: "CME" },
    { value: "LH", name: "Lean Hogs (LH)", exchange: "CME" },

    //METALS COMEX
    { value: "GC", name: "Gold (GC)", exchange: "COMEX" },
    { value: "SI", name: "Silver (SI)", exchange: "COMEX" },
    { value: "HG", name: "Copper (HG)", exchange: "COMEX" },
];

export function parseBarTypeTimeFrame({ barType, barTypePeriod }) {
    let timeBerBar;
    if (barType === 1) {
        //SECONDS
        timeBerBar = 1000;
    } else if (barType === 2) {
        //MINUTE
        timeBerBar = 1000 * 60;
    } else if (barType === 3) {
        //DAILY
        timeBerBar = 20220901;
    } else if (barType === 4) {
        //WEEKLY
        timeBerBar = 1000 * 60 * 60 * 24 * 7;
    }
    return timeBerBar * barTypePeriod * 500;
}

export function compileOrders(orders, accumulator = {}) {
    let compiledOrders = orders.reduce((acc, order) => {
        if (order.data) {
            order = order.data;
        }
        const { templateId, completionReason, basketId, totalUnfilledSize, totalFillSize, bracketType, priceType, quantity, notifyType, triggerPrice, cancelledSize, transactionType } = order;
        if (!acc[basketId]) {
            acc[basketId] = {};
        }
        acc[basketId].basketId = basketId;
        acc[basketId].bracketType = bracketType ? bracketType : acc[basketId].bracketType ? acc[basketId].bracketType : null;
        acc[basketId].notifyType = notifyType;
        if (priceType) {
            acc[basketId].priceType = priceType;
        }
        if (transactionType) {
            acc[basketId].transactionType = transactionType;
        }
        if (completionReason) {
            acc[basketId].completionReason = completionReason;
        }
        if (order.netQuantity !== undefined) {
            acc[basketId].netQuantity = order.netQuantity;
        }

        acc[basketId].templateId = templateId;

        let hasFillPrice = acc[basketId].fillPrice;

        if (order.status === "complete") {
            //notify type == 15

            acc[basketId].endTime = order.ssboe; //also has datetime
            acc[basketId].totalFillSize = order.totalFillSize;
            acc[basketId].quantity = order.quantity;
            acc[basketId].triggerPrice = order.triggerPrice;
            acc[basketId].price = order.price;
            acc[basketId].isComplete = true;
        } else if (order.templateId == 353) {
            debugger;
            acc[basketId].firstAckWhatTime = order.ssboe;
            acc[basketId].basketId = order.basketId;
            acc[basketId].targetQuantityReleased = order.targetQuantityReleased;
            acc[basketId].targetQuantity = order.targetQuantity;
            acc[basketId].stopQuantityReleased = order.stopQuantityReleased;
            acc[basketId].stopQuantity = order.stopQuantity;
            acc[basketId].stopTicks = order.stopTicks;
            acc[basketId].targetTicks = order.targetTicks;
        } else if (order.targetQuantityReleased !== undefined || order.stopQuantityReleased !== undefined) {
            debugger;
            acc[basketId].targetQuantityReleased = order.targetQuantityReleased;
            acc[basketId].stopQuantityReleased = order.stopQuantityReleased;
        } else if (order.reportText == "order Recived From Client") {
            //This is from the website, or bot sending to the api
            acc[basketId].originalOrderReceivedFromClientTime = order.ssboe;
        } else if (order.reportText == "order Sent From Client") {
            //This is from the website, or bot sending to the api
            acc[basketId].originalOrderSendFromClientTime = order.ssboe;
        } else if (order.reportText == "order Sent From API") {
            //This is from the website, or bot sending to the api
            acc[basketId].originalOrderSendFromAPITime = order.ssboe;
        } else if (order.reportType === "cancel") {
            //notify type == 15
            acc[basketId].endTime = order.ssboe; //also has datetime
            acc[basketId].totalFillSize = order.totalFillSize;
            acc[basketId].cancelledSize = order.cancelledSize;
            acc[basketId].totalUnfilledSize = order.totalUnfilledSize;
            acc[basketId].triggerPrice = order.triggerPrice;
            acc[basketId].isCancel = true;
        } else if (order.status === "cancel sent to exch") {
            acc[basketId].cancelSentToExchTime = order.ssboe;
        } else if (order.status === "cancel received by exch gateway") {
            acc[basketId].cancelReceivedByExchGatewayTime = order.ssboe;
        } else if (order.status === "Cancel received from client") {
            acc[basketId].cancelReceivedFromClientTime = order.ssboe;
        } else if (order.status === "Order received from client") {
            acc[basketId].orderReceivedFromClientTime = order.ssboe;
            acc[basketId].triggerPrice = order.triggerPrice;
            acc[basketId].price = order.price;
        } else if (order.status === "cancel pending") {
            acc[basketId].cancelPendingTime = order.ssboe;
            acc[basketId].isCancelled = true;
        } else if (order.reportType === "fill") {
            acc[basketId].fillTime = order.ssboe;
            acc[basketId].fillSize = order.totalFillSize;
            acc[basketId].totalFillSize = order.totalFillSize;
            acc[basketId].totalUnfilledSize = order.totalUnfilledSize;
            acc[basketId].price = order.price;
            acc[basketId].fillPrice = order.fillPrice;
            acc[basketId].avgFillPrice = order.avgFillPrice;
        } else if (order.status === "open") {
            acc[basketId].openTime = order.ssboe;
            acc[basketId].triggerPrice = order.triggerPrice;
            acc[basketId].price = order.price;
            acc[basketId].origPriceType = order.origPriceType;
        } else if (order.status === "open pending") {
            acc[basketId].openPendingTime = order.ssboe;
            acc[basketId].triggerPrice = order.triggerPrice;
            acc[basketId].price = order.price;
            acc[basketId].origPriceType = order.origPriceType;
        } else if (order.reportType === "trigger") {
            acc[basketId].triggerTime = order.ssboe;
            acc[basketId].triggerPrice = order.triggerPrice;
            acc[basketId].origPriceType = order.origPriceType;
        } else if (order.reportType === "status") {
            // acc[basketId].avgFillPrice = order.avgFillPrice;

            acc[basketId].statusTime = order.ssboe;
            // acc[basketId].triggerPrice = order.triggerPrice;
            // acc[basketId].price = order.price;
        } else if (order.status === "trigger pending") {
            acc[basketId].triggerPendingTime = order.ssboe;
            acc[basketId].triggerPrice = order.triggerPrice;
        } else if (order.status === "order sent to exch") {
            acc[basketId].orderSentToExchTime = order.ssboe;
            acc[basketId].triggerPrice = order.triggerPrice;
            acc[basketId].price = order.price;
        } else if (order.status === "order received by exch gateway") {
            acc[basketId].orderReceivedByExchGatewayTime = order.ssboe;
            acc[basketId].triggerPrice = order.triggerPrice;
            acc[basketId].price = order.price;
        } else if (order.templateId == 313) {
            //this is the first response from sending an order
            acc[basketId].firstAckTime = order.ssboe;
            acc[basketId].basketId = order.basketId;
        } else if (order.templateId == 331) {
            acc[basketId].firstAckTime = order.ssboe;
            acc[basketId].basketId = order.basketId;
            acc[basketId].isBracketOrder = true;
        } else if (order.reportType === "fill") {
            acc[basketId].fillTime = order.ssboe;
            acc[basketId].fillSize = order.totalFillSize;
            acc[basketId].totalFillSize = order.totalFillSize;
            acc[basketId].totalUnfilledSize = order.totalUnfilledSize;
            acc[basketId].triggerPrice = order.triggerPrice;
            acc[basketId].price = order.price;
            acc[basketId].fillPrice = order.fillPrice;
            acc[basketId].avgFillPrice = order.avgFillPrice;
        } else if (order.completionReason === "C" || order.isCancelled) {
            acc[basketId].cancelTime = order.ssboe;
            debugger;
        } else {
            debugger;
        }

        let stillHasFillPrice = acc[basketId].fillPrice;
        if (hasFillPrice && !stillHasFillPrice) {
            console.log("lost it");
            debugger;
        }

        return acc;
    }, accumulator);
    return compiledOrders;
}
