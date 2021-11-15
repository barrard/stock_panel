export function updateConditionalsResults(
    c,
    data,

    indicatorResults,
    charts
) {
    console.log({ c, data });
    let next = true;
    let currentResultsSeries = [];

    let { target1, target2, equality } = c;

    // if(target1.type === 'value' || target2.type === 'value' ){
    //     //the other one should be a series//type = "time" may come in the future

    // }

    let target1Value, target2Value;

    for (let i = 0; i < data.length; i++) {
        let val1, val2;
        let next1, next2;
        let time1, time2;

        if (target1.type === "indicator") {
            target1Value =
                target1Value || findIndicatorResults(target1, indicatorResults);
            if (!target1Value) return console.log("???? no results indicator");
            let { nextResult, results, timestamp } = getIndicatorResults(
                target1Value,
                target1,
                next,
                charts
            );
            next1 = nextResult;
            val1 = results;
            time1 = timestamp;
        } else if (target1.type === "OHLC") {
            target1Value = target1Value || getOhlcResults(target1, charts);
            if (!target1Value) return console.log("???? no results OHLC");

            let { results, nextResult, timestamp } = getPriceResults(
                target2,
                target2Value,
                next
            );
            //   console.log(results)
            next1 = nextResult;
            val1 = results;
            time1 = timestamp;
        } else if (target1.type === "value") {
            target1Value = target1.indexOrRangeValue;
            if (target1Value === undefined) {
                debugger;
                return console.log("???? no results value");
            }
            val1 = target1Value;
        }

        if (target2.type === "indicator") {
            target2Value = findIndicatorResults(target2, indicatorResults);
            if (!target2Value) return console.log("???? no results indicator");
            let { nextResult, results, timestamp } = getIndicatorResults(
                target2Value,
                target2,
                next,
                charts
            );
            next2 = nextResult;
            val2 = results;
            time2 = timestamp;
        } else if (target2.type === "value") {
            target2Value = target2.indexOrRangeValue;
            if (target2Value === undefined) {
                debugger;
                return console.log("???? no results 2 Value");
            }
            val2 = target2Value;
        } else if (target2.type === "OHLC") {
            target2Value = getOhlcResults(target2, charts);
            if (!target2Value) return console.log("???? no results 2 value");
            let { results, nextResult, timestamp } = getPriceResults(
                target2,
                target2Value,
                next
            );
            //   console.log(results)
            next2 = nextResult;
            val2 = results;
            time2 = timestamp;
        }

        // console.log({ target1Value, target2Value })

        let currentResult = evalConditional({
            equality,
            val1,
            val2,
        });

        //determine index with time1, time2

        currentResultsSeries.push(currentResult);

        target1Value = next1;
        target2Value = next2;
    }
    console.log(currentResultsSeries);
    return currentResultsSeries;
}

export function chartConditionals(conditionals, charts) {
    console.log(conditionals, charts);
}

export function getOhlcResults(target, charts) {
    if (charts[`${target.symbol}`]) {
        if (charts[`${target.symbol}`][target.timeframe]) {
            //   console.log(charts[`${target.symbol}`][target.timeframe])

            let results = charts[`${target.symbol}`][target.timeframe].data;
            //   if (IR[target.indicatorId]) {
            // 	let results = IR[target.indicatorId]
            return results;
            //   }
        }
    }
}
export function findIndicatorResults(target, indicatorResults) {
    if (indicatorResults[`${target.symbol}`]) {
        if (indicatorResults[`${target.symbol}`][target.timeframe]) {
            //   console.log(indicatorResults[`${target.symbol}`][target.timeframe])

            let IR = indicatorResults[`${target.symbol}`][target.timeframe];
            if (IR[target.indicatorId]) {
                let results = IR[target.indicatorId];
                return results;
            }
        }
    }
}

export function getPriceResults(target, results, next) {
    let { name, indexOrRangeValue, indexOrRange } = target;
    if (!results) return 0;
    let timestamp = results.slice(-1)[0].timestamp;
    let _results;
    _results = [...results];

    if (indexOrRange === "index") {
        let data = _results.slice(
            indexOrRangeValue === "0" ? -1 : indexOrRangeValue * -1 - 1
        )[0];
        _results = data[name];
    } else {
        _results = _results;
        _results = _results.slice(-indexOrRangeValue).map((d) => d[name]);
    }
    if (next) {
        let timestamp = results.slice(-1)[0].timestamp;

        let nextResult = JSON.parse(JSON.stringify(results));

        nextResult = nextResult.slice(0, -1);
        return { results: _results, nextResult, timestamp };
    }
    return _results;
}
export function getIndicatorResults(results, target, next, charts) {
    let { resultLine, indexOrRangeValue, indexOrRange } = target;
    let _results;
    _results = [...results.result.result.result[resultLine]];

    if (indexOrRange === "index") {
        _results = _results.slice(
            indexOrRangeValue === "0" ? -1 : indexOrRangeValue * -1 - 1
        )[0];
    } else {
        _results = _results.slice(
            -(indexOrRangeValue == 0 ? -1 : indexOrRangeValue)
        );
    }
    if (next) {
        let ohlc = getOhlcResults(target, charts);
        let resLen = results.result.result.result[resultLine].length;
        let { begIndex } = results.result.result;
        let timestamp = ohlc[resLen - 1 + begIndex].timestamp;
        let nextResult = JSON.parse(JSON.stringify(results));

        nextResult.result.result.result[resultLine] =
            nextResult.result.result.result[resultLine].slice(0, -1);
        return { results: _results, nextResult, timestamp };
    }
    return _results;
}

export function formatRange(range) {
    return `${range[0]}...${range.slice(-1)[0]}`;
}

export function evalConditional({ equality, val1, val2 }) {
    let isTrue = true;
    if (Array.isArray(val1)) {
        for (let i1 = 0; i1 < val1.length; i1++) {
            if (!isTrue) return;
            let v1 = val1[i1];

            if (Array.isArray(val2)) {
                // for (let i2 = 0; i2 < val2.length; i2++) {
                if (!isTrue) return;

                let v2 = val2[i1];
                isTrue = checkEquality(v1, v2, equality);
                // }
            } else {
                isTrue = checkEquality(v1, val2, equality);
            }
        }
    } else if (Array.isArray(val2)) {
        for (let i2 = 0; i2 < val2.length; i2++) {
            if (!isTrue) return;
            let v1 = val2[i2];

            if (Array.isArray(val1)) {
                // for (let i2 = 0; i2 < val1.length; i2++) {
                if (!isTrue) return;

                let v2 = val1[i2];
                isTrue = checkEquality(v1, v2, equality);
                // }
            } else {
                isTrue = checkEquality(v1, val2, equality);
            }
        }
    } else {
        isTrue = checkEquality(val1, val2, equality);
    }

    function checkEquality(v1, v2, equality) {
        // console.log(equality)
        if (equality === ">") {
            if (v1 > v2) isTrue = true;
            else isTrue = false;
        } else if (equality === "<") {
            if (v1 < v2) isTrue = true;
            else isTrue = false;
        } else if (equality === "==") {
            if (v1 == v2) isTrue = true;
            else isTrue = false;
        } else if (equality === "<=") {
            if (v1 <= v2) isTrue = true;
            else isTrue = false;
        } else if (equality === ">=") {
            if (v1 >= v2) isTrue = true;
            else isTrue = false;
        }
        return isTrue;
    }

    return isTrue;
}
