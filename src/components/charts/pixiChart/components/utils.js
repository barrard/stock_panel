export const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",

    // These options are needed to round to whole numbers if that's what you want.
    //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
    //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
});
// export function priceScaleValues({ highest, lowest, tickSize }) {
//     const _highest = highest;
//     const diff = highest - lowest;
//     let priceValues = [];

//     const one = 1;
//     const five = one * 5;
//     const ten = five * 2;

//     const twenty = five * 4;

//     const possibleTicks = parseFloat(diff) / parseFloat(tickSize);
//     //find startingValue
//     let tickSpread = diff / this.maxTicks;

//     // console.log({ diff, tickSpread });

//     if (tickSpread > 10000) {
//         tickSpread = 25000;
//         while (highest % tickSpread !== 0 && highest > 0) {
//             highest -= this.tickSize;
//         }
//     } else if (tickSpread > 1000) {
//         tickSpread = 5000;
//         while (highest % tickSpread !== 0 && highest > 0) {
//             highest -= this.tickSize;
//         }
//     } else if (tickSpread > 500) {
//         tickSpread = 1000;
//         while (highest % tickSpread !== 0 && highest > 0) {
//             highest -= this.tickSize;
//         }
//     } else if (tickSpread > 100) {
//         tickSpread = 500;
//         while (highest % tickSpread !== 0 && highest > 0) {
//             highest -= this.tickSize;
//         }
//     } else if (tickSpread > 4) {
//         tickSpread = twenty;
//         while (highest % tickSpread !== 0 && highest > 0) {
//             highest -= this.tickSize;
//         }
//     } else if (tickSpread > 2) {
//         tickSpread = ten;

//         while (highest % ten !== 0 && highest > 0) {
//             highest -= this.tickSize;
//         }
//     } else if (tickSpread > 1) {
//         tickSpread = five;

//         while (highest % five !== 0 && highest > 0) {
//             highest -= this.tickSize;
//         }
//     } else if (tickSpread > 0.5) {
//         tickSpread = one;

//         while (highest % one !== 0 && highest > 0) {
//             highest -= this.tickSize;
//         }
//     } else {
//         tickSpread = this.tickSize * 2;

//         while (highest % tickSpread !== 0 && highest > 0) {
//             highest -= this.tickSize;
//         }
//     }

//     let price = highest;
//     while (price > lowest) {
//         priceValues.push(price);
//         price -= tickSpread;
//     }

//     return priceValues;
// }

export function priceScaleValues({ highest, lowest, tickSize }) {
    const range = highest - lowest;
    const maxTicks = this.maxTicks || 15;

    // Calculate the raw tick spacing
    const rawTickSpacing = range / maxTicks;

    // Find a "nice" tick spacing using powers of 10 and common multipliers
    const niceTickSpacing = getNiceTickSpacing(rawTickSpacing);

    // Find the starting value (ceiling of lowest to nearest nice tick)
    const startValue = Math.ceil(lowest / niceTickSpacing) * niceTickSpacing;

    // Generate tick values
    const priceValues = [];
    let currentValue = startValue;

    while (currentValue <= highest) {
        // Round to avoid floating point precision issues
        const roundedValue = Math.round(currentValue / niceTickSpacing) * niceTickSpacing;
        //        const roundedValue = currencyFormatter.format(Math.round(currentValue / niceTickSpacing) * niceTickSpacing);

        priceValues.push(roundedValue);
        currentValue += niceTickSpacing;
    }

    return priceValues;
}

function getNiceTickSpacing(rawSpacing) {
    // Find the order of magnitude
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawSpacing)));

    // Normalize the spacing to be between 1 and 10
    const normalizedSpacing = rawSpacing / magnitude;

    // Choose a nice spacing based on the normalized value
    let niceSpacing;
    if (normalizedSpacing <= 1) {
        niceSpacing = 1;
    } else if (normalizedSpacing <= 2) {
        niceSpacing = 2;
    } else if (normalizedSpacing <= 5) {
        niceSpacing = 5;
    } else {
        niceSpacing = 10;
    }

    return niceSpacing * magnitude;
}

// Alternative version with more granular control for your specific use case
export function priceScaleValuesAlternative({ highest, lowest, tickSize }) {
    const range = highest - lowest;
    const maxTicks = this.maxTicks || 15;

    // For small ranges, prioritize whole numbers
    if (range < 10) {
        return generateWholeNumberTicks(lowest, highest, maxTicks);
    }

    // For larger ranges, use the nice spacing approach
    const rawTickSpacing = range / maxTicks;
    const niceTickSpacing = getNiceTickSpacing(rawTickSpacing);

    const startValue = Math.ceil(lowest / niceTickSpacing) * niceTickSpacing;
    const priceValues = [];
    let currentValue = startValue;

    while (currentValue <= highest) {
        const roundedValue = Math.round(currentValue / niceTickSpacing) * niceTickSpacing;
        priceValues.push(roundedValue);
        currentValue += niceTickSpacing;
    }

    return priceValues;
}

function generateWholeNumberTicks(lowest, highest, maxTicks) {
    const lowestWhole = Math.floor(lowest);
    const highestWhole = Math.ceil(highest);
    const wholeRange = highestWhole - lowestWhole;

    if (wholeRange <= maxTicks) {
        // If we can fit all whole numbers, use them
        const ticks = [];
        for (let i = lowestWhole; i <= highestWhole; i++) {
            if (i >= lowest && i <= highest) {
                ticks.push(i);
            }
        }
        return ticks;
    } else {
        // If too many whole numbers, use step size
        const stepSize = Math.ceil(wholeRange / maxTicks);
        const ticks = [];
        let current = lowestWhole;

        while (current <= highestWhole) {
            if (current >= lowest && current <= highest) {
                ticks.push(current);
            }
            current += stepSize;
        }

        return ticks;
    }
}

export function timeScaleValues({ values }) {
    const maxTicks = this.maxTicks || 5;
    if (!values || values.length === 0) return [];

    let startTime = values[0];
    let endTime = values[values.length - 1];

    if (typeof startTime === "string") startTime = new Date(startTime).getTime();
    if (typeof endTime === "string") endTime = new Date(endTime).getTime();
    const totalDuration = endTime - startTime;
    const daysSpan = totalDuration / (1000 * 60 * 60 * 24);

    // Expanded time intervals with more options, including monthly and yearly
    const timeIntervals = [
        { interval: 1000 * 1, name: "1sec" }, // 1 second
        { interval: 1000 * 5, name: "5sec" }, // 5 seconds
        { interval: 1000 * 10, name: "10sec" }, // 10 seconds
        { interval: 1000 * 15, name: "15sec" }, // 15 seconds
        { interval: 1000 * 30, name: "30sec" }, // 30 seconds
        { interval: 1000 * 60, name: "1min" }, // 1 minute
        { interval: 1000 * 60 * 2, name: "2min" }, // 2 minutes
        { interval: 1000 * 60 * 5, name: "5min" }, // 5 minutes
        { interval: 1000 * 60 * 10, name: "10min" }, // 10 minutes
        { interval: 1000 * 60 * 15, name: "15min" }, // 15 minutes
        { interval: 1000 * 60 * 30, name: "30min" }, // 30 minutes
        { interval: 1000 * 60 * 60, name: "1hour" }, // 1 hour
        { interval: 1000 * 60 * 60 * 2, name: "2hour" }, // 2 hours
        { interval: 1000 * 60 * 60 * 3, name: "3hour" }, // 3 hours
        { interval: 1000 * 60 * 60 * 4, name: "4hour" }, // 4 hours
        { interval: 1000 * 60 * 60 * 6, name: "6hour" }, // 6 hours
        { interval: 1000 * 60 * 60 * 8, name: "8hour" }, // 8 hours
        { interval: 1000 * 60 * 60 * 12, name: "12hour" }, // 12 hours
        { interval: 1000 * 60 * 60 * 24, name: "1day" }, // 1 day
        { interval: 1000 * 60 * 60 * 24 * 2, name: "2day" }, // 2 days
        { interval: 1000 * 60 * 60 * 24 * 7, name: "1week" }, // 1 week
        { interval: 1000 * 60 * 60 * 24 * 14, name: "2week" }, // 2 weeks
        { interval: 1000 * 60 * 60 * 24 * 30, name: "1month" }, // ~1 month
        { interval: 1000 * 60 * 60 * 24 * 60, name: "2month" }, // ~2 months
        { interval: 1000 * 60 * 60 * 24 * 90, name: "3month" }, // ~3 months
        { interval: 1000 * 60 * 60 * 24 * 180, name: "6month" }, // ~6 months
        { interval: 1000 * 60 * 60 * 24 * 365, name: "1year" }, // ~1 year
    ];

    // Calculate target interval based on duration and max ticks
    const targetInterval = totalDuration / maxTicks;

    // Find the best interval (closest to target without going under by too much)
    const bestInterval = findBestTimeInterval(targetInterval, timeIntervals);

    // Generate ticks based on the interval
    const ticks = generateTimeTicks(startTime, endTime, bestInterval.interval, maxTicks);

    // Map ticks to their closest indices in the values array
    return mapTicksToIndices(ticks, values);
}

function findBestTimeInterval(targetInterval, timeIntervals) {
    // Find the interval that's closest to the target
    let bestInterval = timeIntervals[timeIntervals.length - 1];
    let bestDiff = Infinity;

    for (const interval of timeIntervals) {
        const diff = Math.abs(interval.interval - targetInterval);

        // Prefer intervals that are slightly larger than the target
        if (interval.interval >= targetInterval * 0.8 && diff < bestDiff) {
            bestDiff = diff;
            bestInterval = interval;
        }
    }

    return bestInterval;
}

function generateTimeTicks(startTime, endTime, intervalMs, maxTicks) {
    const ticks = [];
    const totalDuration = endTime - startTime;

    // Calculate how many ticks we'd get with this interval across the full range
    const potentialTickCount = Math.floor(totalDuration / intervalMs);

    // If the interval would give us way more ticks than maxTicks, we need to skip some
    // to distribute them evenly across the range
    let skipFactor = 1;
    if (potentialTickCount > maxTicks * 2) {
        skipFactor = Math.ceil(potentialTickCount / maxTicks);
    }

    // Find the first nice time that's >= startTime
    let currentTime = Math.ceil(startTime / intervalMs) * intervalMs;

    // If we're very close to the start, include it
    if (currentTime - startTime < intervalMs * 0.1) {
        currentTime += intervalMs;
    }

    // Generate ticks, potentially skipping some to spread them out
    let tickCounter = 0;
    while (currentTime <= endTime) {
        if (tickCounter % skipFactor === 0 && ticks.length < maxTicks) {
            ticks.push(currentTime);
        }
        currentTime += intervalMs;
        tickCounter++;
    }

    // If we have too few ticks, try to include more by reducing skip factor
    if (ticks.length < maxTicks / 2 && skipFactor > 1) {
        const newSkipFactor = Math.max(1, Math.floor(skipFactor / 2));
        currentTime = Math.ceil(startTime / intervalMs) * intervalMs;
        ticks.length = 0; // Reset
        tickCounter = 0;

        while (currentTime <= endTime) {
            if (tickCounter % newSkipFactor === 0 && ticks.length < maxTicks) {
                ticks.push(currentTime);
            }
            currentTime += intervalMs;
            tickCounter++;
        }
    }

    return ticks;
}

function mapTicksToIndices(ticks, values) {
    const tickIndices = [];
    let lastIndex = 0;

    for (const tick of ticks) {
        // Find the closest value index (optimized with binary search)
        const index = findClosestTimeIndex(values, tick, lastIndex);

        if (index !== -1 && (tickIndices.length === 0 || tickIndices[tickIndices.length - 1] !== index)) {
            tickIndices.push(index);
            lastIndex = index; // Start next search from here for efficiency
        }
    }

    return tickIndices;
}

function findClosestTimeIndex(values, targetTime, startIndex = 0) {
    let left = startIndex;
    let right = values.length - 1;
    let closestIndex = -1;
    let minDiff = Infinity;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const diff = Math.abs(values[mid] - targetTime);

        if (diff < minDiff) {
            minDiff = diff;
            closestIndex = mid;
        }

        if (values[mid] < targetTime) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    // Only return if reasonably close
    return closestIndex;
    // return minDiff < (values[values.length - 1] - values[0]) / 100 ? closestIndex : -1;
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

export const getExchangeFromSymbol = (symbol) => {
    const symbolData = symbolOptions.find((s) => s.value === symbol);
    return symbolData ? symbolData.exchange : "CME";
};

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

export function normalizeBarData(bars = []) {
    if (!Array.isArray(bars)) return [];

    return bars
        .map((bar) => {
            if (!bar) return null;
            const normalized = { ...bar };

            if (normalized.volume?.low !== undefined) {
                normalized.volume = normalized.volume.low;
            } else if (normalized.askVolume || normalized.bidVolume) {
                const askVolume = normalized.askVolume?.low ?? 0;
                const bidVolume = normalized.bidVolume?.low ?? 0;
                normalized.volume = askVolume + bidVolume;
            }

            if (typeof normalized.datetime === "number" && normalized.datetime < 1e12) {
                normalized.datetime = normalized.datetime * 1000;
            }

            if (!normalized.timestamp && typeof normalized.datetime === "number") {
                normalized.timestamp = normalized.datetime;
            }

            return normalized;
        })
        .filter(Boolean);
}

/**
 * Converts barType and barTypePeriod to timeframe string format
 * Only supports: 1s, 1m, 5m, 30m, 60m, 4h
 * @param {Object} params
 * @param {number} params.barType - 1=seconds, 2=minutes, 3=hours, 4=days
 * @param {number} params.barTypePeriod - Number of barType units
 * @returns {string} Timeframe string like "1m", "5m", "1s"
 * @throws {Error} If the timeframe combination is not supported
 * @example
 * barTypeToTimeframe({ barType: 2, barTypePeriod: 1 }) // "1m"
 * barTypeToTimeframe({ barType: 2, barTypePeriod: 5 }) // "5m"
 * barTypeToTimeframe({ barType: 1, barTypePeriod: 1 }) // "1s"
 * barTypeToTimeframe({ barType: 1, barTypePeriod: 60 }) // "1m" (60 seconds = 1 minute)
 */
export function barTypeToTimeframe({ barType, barTypePeriod }) {
    const SUPPORTED_TIMEFRAMES = ["1s", "1m", "5m", "30m", "60m", "4h"];

    let timeframeStr;

    if (barType === 1) {
        // Seconds - handle edge case where 60 seconds should be "1m"
        if (barTypePeriod === 60) {
            timeframeStr = "1m";
        } else {
            timeframeStr = `${barTypePeriod}s`;
        }
    } else if (barType === 2) {
        // Minutes
        timeframeStr = `${barTypePeriod}m`;
    } else if (barType === 3) {
        // Hours
        timeframeStr = `${barTypePeriod}h`;
    } else {
        throw new Error(`Invalid barType: ${barType}. Only barType 1 (seconds), 2 (minutes), and 3 (hours) are supported.`);
    }

    if (!SUPPORTED_TIMEFRAMES.includes(timeframeStr)) {
        throw new Error(`Unsupported timeframe: ${timeframeStr}. Supported timeframes are: ${SUPPORTED_TIMEFRAMES.join(", ")}`);
    }

    return timeframeStr;
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
        const isMarket = order.priceType === "MARKET";
        if (!acc[order.basketId]) {
            acc[order.basketId] = {};
        }
        if (order.reportText == "Rejected at RMS - Available margin exhausted") {
            acc[order.basketId].marginExhausted = true;
            acc[order.basketId].rejected = true;
            acc[order.basketId].reportText = "Rejected at RMS - Available margin exhausted";
            return acc;
        }
        if (order.userMsg?.[0] == "RequestCancelOrder") {
            return acc;
        }
        if (order?.status == "open" && isMarket && order?.reportType != "fill") {
            return acc;
        }
        order.priceType = _priceType(order.priceType);
        // console.log(order);
        const isBracket = order.bracketType ? order.bracketType : acc[order.basketId].bracketType ? acc[order.basketId].bracketType : null;
        if (order.data) {
            order = order.data;
        }

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
