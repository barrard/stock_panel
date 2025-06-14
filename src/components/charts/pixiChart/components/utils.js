export const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",

    // These options are needed to round to whole numbers if that's what you want.
    //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
    //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
});
export function priceScaleValues({ highest, lowest, tickSize }) {
    const _highest = highest;
    const diff = highest - lowest;
    let priceValues = [];

    const one = 1;
    const five = one * 5;
    const ten = five * 2;

    const twenty = five * 4;

    const possibleTicks = parseFloat(diff) / parseFloat(tickSize);
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

export function priceType(type) {
    switch (type) {
        case 1:
            return "LIMIT";
        case 2:
            return "MARKET";
        case 3:
            return "STOP_LIMIT";
        case 4:
            return "STOP_MARKET";
        case 5:
            return "MARKET_IF_TOUCHED";
        case 6:
            return "LIMIT_IF_TOUCHED";
        default:
            return type;
    }
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
export function formatTimeWithMicroSeconds({ ssboe, usecs }) {
    const totalMilliseconds = combineTimestampsMicroSeconds({ ssboe, usecs });
    const date = new Date(totalMilliseconds);

    // Get hours, minutes, seconds
    const timeStr = date.toLocaleTimeString("en-US", {
        hour12: true,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });

    // Ensure usecs is padded to 6 digits
    const usecStr = String(usecs).padStart(6, "0");

    // Split the time string to insert microseconds in the correct place
    const [time, ampm] = timeStr.split(" ");

    // Format as HH:MM:SS.microseconds AM/PM
    return `${time}.${usecStr} ${ampm}`;
}

export function formatTimeDiffInMicroSeconds(diffInMilliseconds) {
    const absValue = Math.abs(diffInMilliseconds);

    if (absValue >= 60000) {
        // If 60 seconds or more, show in minutes
        return `${(diffInMilliseconds / 60000).toFixed(2)} min`;
    } else if (absValue >= 1000) {
        // If 1 second or more, show in seconds
        return `${(diffInMilliseconds / 1000).toFixed(2)} s`;
    } else if (absValue >= 1) {
        // If 1 millisecond or more, show in milliseconds
        return `${diffInMilliseconds.toFixed(2)} ms`;
    } else {
        // Convert to microseconds
        const microseconds = diffInMilliseconds * 1000;
        return `${microseconds.toFixed(1)} μs`;
    }
}

export function combineTimestampsMicroSeconds({ ssboe, usecs = "" }) {
    // Convert ssboe to milliseconds
    const milliseconds = ssboe;

    // Ensure usecs is padded to 6 digits
    const usecStr = String(usecs).padStart(6, "0");

    // Convert microseconds to milliseconds (keeping fractional part)
    const microsToMillis = parseInt(usecStr) / 1000;

    // Combine them
    const totalMilliseconds = parseFloat(String(milliseconds) + String(microsToMillis));

    return totalMilliseconds;
}

export function compileOrders(orders, accumulator = {}) {
    const _priceType = priceType;
    let compiledOrders = orders.reduce((acc, order) => {
        let {
            symbol,
            ssboe,
            usecs,
            templateId,
            completionReason,
            basketId,
            totalUnfilledSize,
            totalFillSize,
            bracketType,
            priceType,
            quantity,
            notifyType,
            triggerPrice,
            cancelledSize,
            transactionType,
        } = order;
        if (!acc[basketId]) {
            acc[basketId] = {};
        }
        order.priceType = _priceType(order.priceType);
        // console.log(order);
        const isBracket = bracketType ? bracketType : acc[basketId].bracketType ? acc[basketId].bracketType : null;
        const isMarket = order.priceType === "MARKET";
        if (order.data) {
            order = order.data;
        }
        if (isBracket) {
            // acc[basketId].bracketType = isBracket;
            acc[basketId].isBracketOrder = true;
        }
        acc[basketId].basketId = basketId;
        //what time is this? the latest?
        if (ssboe) {
            if (!acc[basketId].ssboe) {
                acc[basketId].ssboe = ssboe;
            } else if (acc[basketId].ssboe < ssboe) {
                acc[basketId].ssboe = ssboe;
                if (notifyType) {
                    acc[basketId].notifyType = notifyType;
                }
                if (templateId) {
                    acc[basketId].templateId = templateId;
                    if (templateId == 331) {
                        //this is rithmics first reponse to the order
                        acc[basketId].firstResponseTime = formatTimeWithMicroSeconds({ ssboe, usecs });
                    }
                    if (templateId == 353) {
                        //I think this the next-first response
                        if (order.targetTicks) {
                            //basketId++
                            acc[basketId].targetBasketId = parseInt(order.basketId) + 1;
                            acc[basketId].targetQuantity = order.targetQuantity;
                            acc[basketId].targetQuantityReleased = order.targetQuantityReleased;
                            acc[basketId].targetTicks = order.targetTicks;
                            acc[basketId].hasBracketTarget = true; //"2097020637"//this is still the parent order basketId!
                            if (order.targetQuantity == order.targetQuantityReleased) {
                                acc[basketId].targetOrderReleasedTime = formatTimeWithMicroSeconds({ ssboe, usecs });
                            }
                        } else if (order.stopTicks) {
                            //basketId++
                            acc[basketId].stopBasketId = parseInt(order.basketId) + 2;
                            acc[basketId].stopQuantity = order.stopQuantity;
                            acc[basketId].stopQuantityReleased = order.stopQuantityReleased;
                            acc[basketId].stopTicks = order.stopTicks;
                            acc[basketId].hasBracketStop = true; //"2097020637"//this is still the parent order basketId!
                            if (order.stopQuantity == order.stopQuantityReleased) {
                                acc[basketId].stopOrderReleasedTime = formatTimeWithMicroSeconds({ ssboe, usecs });
                            }
                        } else {
                            acc[basketId].secondResponseTime = formatTimeWithMicroSeconds({ ssboe, usecs });
                        }
                    }
                    if (templateId == 351) {
                        //start of some status updates
                        acc[basketId].lastStatusUpdateTime = formatTimeWithMicroSeconds({ ssboe, usecs });
                        acc[basketId].status = order.status;
                        acc[basketId].sequenceNumber = order.sequenceNumber;
                        if (order.bracketType) {
                            //check if its a target
                            if (order.linkedBasketIds) {
                                acc[basketId].linkedBasketIds = order.linkedBasketIds;
                            }
                            if (order.originalBasketId) {
                                acc[basketId].originalBasketId = order.originalBasketId;
                            }
                        }
                        //triggerPrice
                        if (order.triggerPrice) {
                            acc[basketId].triggerPrice = order.triggerPrice;
                        }
                    }
                    if (templateId == 352) {
                        //start of some status updates
                        if (order.reportType == "status") {
                            acc[basketId].orderActiveTime = formatTimeWithMicroSeconds({ ssboe, usecs });
                            acc[basketId].confirmedTime = order.confirmedTime;
                            acc[basketId].totalUnfilledSize = totalUnfilledSize;
                            acc[basketId].totalFillSize = totalFillSize;
                            acc[basketId].cancelledSize = cancelledSize;
                            acc[basketId].confirmedSize = order.confirmedSize;
                            acc[basketId].totalUnfilledSize = order.totalUnfilledSize;
                        }

                        //totalFillSize
                        if (order.reportType) {
                            acc[basketId].reportType = order.reportType;
                        }
                        if (order.reportType == "fill") {
                            acc[basketId].fillPrice = order.fillPrice;
                            acc[basketId].fillSize = order.fillSize;
                            acc[basketId].fillTime = formatTimeWithMicroSeconds({ ssboe, usecs });
                        }
                        if (order.reportType == "complete") {
                            acc[basketId].completeTime = formatTimeWithMicroSeconds({ ssboe, usecs });
                            acc[basketId].isComplete = true;
                        }
                    }
                }
            }
        }

        if (symbol) {
            acc[basketId].symbol = symbol;
        }
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
        if (
            order.status == "complete" ||
            order.status == "open" ||
            order.status == "open pending" ||
            order.status == "complete" ||
            order.status == "cancel"
        ) {
            if (order.status == "complete") {
                acc[basketId].status = order.status;
            } else if (order.status !== "complete" && acc[basketId].status !== "complete") {
                if (order.status == "open") {
                    acc[basketId].status = order.status;
                } else if (order.status == "open pending" && !acc[basketId].status) {
                    acc[basketId].status = order.status;
                }
                if (order.status == "cancel") {
                    acc[basketId].status = order.status;
                }
            }
        } else if (order.status) {
            // console.log(order.status);
        }

        acc[basketId].templateId = templateId;

        let hasFillPrice = acc[basketId].fillPrice;
        // const price = order.price;
        if (order.price) {
            acc[basketId].price = order.price;
        }

        if (order.status === "complete") {
            //notify type == 15
            // debugger;
            acc[basketId].endTime = order.ssboe; //also has datetime
            acc[basketId].totalFillSize = order.totalFillSize;
            acc[basketId].quantity = order.quantity;
            acc[basketId].triggerPrice = order.triggerPrice;
            acc[basketId].price = order.price;
            acc[basketId].isComplete = true;
        } else if (order.templateId == 353) {
            // debugger;
            // acc[basketId].firstAckWhatTime = order.ssboe;
            // acc[basketId].basketId = order.basketId;
            // acc[basketId].targetQuantityReleased = order.targetQuantityReleased;
            // acc[basketId].targetQuantity = order.targetQuantity;
            // acc[basketId].stopQuantityReleased = order.stopQuantityReleased;
            // acc[basketId].stopQuantity = order.stopQuantity;
            // acc[basketId].stopTicks = order.stopTicks;
            // acc[basketId].targetTicks = order.targetTicks;
        } else if (order.targetQuantityReleased !== undefined || order.stopQuantityReleased !== undefined) {
            // debugger;
            // acc[basketId].targetQuantityReleased = order.targetQuantityReleased;
            // acc[basketId].stopQuantityReleased = order.stopQuantityReleased;
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
            // acc[basketId].price = order.price;
        } else if (order.status === "cancel pending") {
            acc[basketId].cancelPendingTime = order.ssboe;
            acc[basketId].isCancelled = true;
        } else if (order.reportType === "fill") {
            acc[basketId].fillTime = order.ssboe;
            acc[basketId].fillSize = order.totalFillSize;
            acc[basketId].totalFillSize = order.totalFillSize;
            acc[basketId].totalUnfilledSize = order.totalUnfilledSize;
            // acc[basketId].price = order.price;
            acc[basketId].fillPrice = order.fillPrice;
            acc[basketId].avgFillPrice = order.avgFillPrice;
        } else if (order.status === "open") {
            acc[basketId].openTime = order.ssboe;
            acc[basketId].triggerPrice = order.triggerPrice;
            // acc[basketId].price = order.price;
            acc[basketId].origPriceType = order.origPriceType;
        } else if (order.status === "open pending") {
            acc[basketId].openPendingTime = order.ssboe;
            acc[basketId].triggerPrice = order.triggerPrice;
            // acc[basketId].price = order.price;
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
            // acc[basketId].price = order.price;
        } else if (order.status === "order received by exch gateway") {
            acc[basketId].orderReceivedByExchGatewayTime = order.ssboe;
            acc[basketId].triggerPrice = order.triggerPrice;
            // acc[basketId].price = order.price;
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
            // acc[basketId].price = order.price;
            acc[basketId].fillPrice = order.fillPrice;
            acc[basketId].avgFillPrice = order.avgFillPrice;
        } else if (order.completionReason === "C" || order.isCancelled) {
            acc[basketId].cancelTime = order.ssboe;
            debugger;
        } else {
            console.log("order not handled", order);
            // debugger;
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
