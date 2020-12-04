let diff = require("./indicatorHelpers/extrema.js");
let { max, min } = require("d3-array");

let {
  slopeAndIntercept,
  xOfY,
  dropDuplicateMinMax,
} = require("./indicatorHelpers/utils.js");

module.exports = {
  makeFibonacciData, determineSupportsAndResistances, addFibsToSwings
}

 function makeFibonacciData(data) {
  let { highs, lows, timestamps, fibonacciMinMax } = data;
  // console.log(that.state);
  // let { symbol, rawOHLCData } = that.state;
  // let { commodity_data } = stock_data;
  // console.log({ timeframe, symbol, stock_data });
  if (highs.length && lows.length) {
    // let data = commodity_data[symbol][timeframe];
    // console.log(data);

    /**
     * Run MinMax with 50-100 as the tolerance
     */
    let tolerance = fibonacciMinMax;
    var minMaxMostRecentData = false; //keep as false for this
    var { maxValues } = diff.minMax(
      timestamps,
      highs,
      tolerance,
      minMaxMostRecentData
    );
    debugger;
    maxValues = dropDuplicateMinMax(maxValues);

    var { minValues } = diff.minMax(
      timestamps,
      lows,
      tolerance,
      minMaxMostRecentData
    );

    minValues = dropDuplicateMinMax(minValues);

    // console.log({ maxValues, minValues });
    if (!maxValues.length || !minValues.length)
      return console.log("No points to work with ");
    /**
     * Walk the MinMax values to find the swings
     */

    let {
      supports,
      resistances,
      lowToHigh,
      highToLow,
    } = determineSupportsAndResistances(maxValues, minValues);

    let { supportFibs, resistanceFibs } = addFibsToSwings({
      supports,
      resistances,
    });
    lowToHigh.fibs = supportFibs;
    highToLow.fibs = resistanceFibs;
    // console.log({ supports, resistances, lowToHigh, highToLow });

    return {
      maxValues,
      minValues,
      supports,
      resistances,
      lowToHigh,
      highToLow,
      supportFibs,
      resistanceFibs,
    };
  }
}

function determineSupportsAndResistances(highPoints, lowPoints) {
  let MIN = min(lowPoints, (d) => d.y);
  let MAX = max(highPoints, (d) => d.y);

  let lowToHigh = [];
  let highToLow = [];

  // console.log({ MIN, MAX, highPoints, lowPoints });

  let minDataPoint = lowPoints.filter((low) => low.y === MIN)[0];
  let maxDataPoint = highPoints.filter((high) => high.y === MAX)[0];

  // console.log({ minDataPoint, maxDataPoint });

  //which one is newer
  let olderData = minDataPoint.x < maxDataPoint.x ? "low" : "high";

  // console.log({ olderData });

  if (olderData === "low") {
    let x1 = maxDataPoint.x;
    let y1 = maxDataPoint.y;

    let swingLows = lowPoints.filter(
      (low) => low.x >= minDataPoint.x && low.x <= maxDataPoint.x
    );

    swingLows.forEach(({ x, y }) => {
      let { m, b, l } = slopeAndIntercept({ x1, y1, x2: x, y2: y });
      if (l > 400000) {
        //only grab somewhat "long" (l) lines
        lowToHigh.push({ x1, y1, x2: x, y2: y, m, b, l });
      }
    });

    //after finding the support levels for main low to high swing.
    //we can now find the resistance levels from the max high forward
    // console.log({lowToHigh})

    let maxHighIndex = highPoints.findIndex(
      (high) => high.x === maxDataPoint.x
    );
    let recentHighs = highPoints.slice(maxHighIndex);

    let recentLows = lowPoints.filter((low) => low.x > maxDataPoint.x);
    if (recentLows.length) {
      // console.log(recentLows);
      let recentMin = min(recentLows, (low) => low.y);
      // console.log({ recentMin });
      let recentMinData = recentLows.filter((low) => low.y === recentMin)[0];
      // console.log(recentMinData);

      if (recentMinData) {
        recentHighs = recentHighs.filter((high) => high.x < recentMinData.x);
      } else {
        recentHighs = [];
      }

      // console.log({ recentLows, recentHighs, recentMin });
      recentHighs.forEach((high) => {
        let x1 = high.x;
        let y1 = high.y;
        let x2 = recentMinData.x;
        let y2 = recentMinData.y;
        let { m, b, l } = slopeAndIntercept({ x1, y1, x2, y2 });
        highToLow.push({ m, b, l, x1, y1, x2, y2 });
      });
    }
  } else if (olderData === "high") {
    //THIS situations is when the high is older
    // than the low, so it must have down trended
    // were looking to compare the swing highs to the main low
    let x1 = minDataPoint.x;
    let y1 = minDataPoint.y;
    //find index of the low point?
    let swingHighs = highPoints.filter(
      (high) => high.x >= maxDataPoint.x && high.x <= minDataPoint.x
    );
    // console.log({swingHighs})
    swingHighs.forEach(({ x, y }) => {
      let { m, b, l } = slopeAndIntercept({ x1, y1, x2: x, y2: y });

      highToLow.push({ x1, y1, x2: x, y2: y, m, b, l });
    });
    // console.log({ maxDataPoint, swingHighs, highToLow });
    //filter the lows to only be after this high
    let minLowIndex = lowPoints.findIndex((low) => low.x === minDataPoint.x);
    let recentLows = lowPoints.slice(minLowIndex);
    let recentHighs = highPoints.filter((high) => high.x > minDataPoint.x);
    let recentMax = max(recentHighs, (high) => high.y);
    let recentMaxData = recentHighs.filter((high) => high.y === recentMax)[0];
    // console.log({minLowIndex,
    //   recentLows,
    //   recentHighs,
    //   recentMax,
    //   recentMaxData})
    if (recentMaxData) {
      recentLows = recentLows.filter((low) => low.x < recentMaxData.x);
    } else {
      recentLows = [];
    }

    // console.log({ recentLows, recentHighs, recentMax });
    recentLows.forEach((low) => {
      let x1 = low.x;
      let y1 = low.y;
      let x2 = recentMaxData.x;
      let y2 = recentMaxData.y;
      let { m, b, l } = slopeAndIntercept({ x1, y1, x2, y2 });
      lowToHigh.push({ m, b, l, x1, y1, x2, y2 });
    });
  }
  // console.log({ lowToHigh, highToLow });

  let resistances = runFibCalculation(highToLow, "down");
  let supports = runFibCalculation(lowToHigh, "up");

  return { resistances, supports, lowToHigh, highToLow };
}

function runFibCalculation(lines, direction) {
  // console.log(lines)
  let levels = [];
  if (!lines.length) return levels;

  lines.forEach(({ x1, y1, x2, y2 }) => {
    let range = Math.abs(y1 - y2);

    let higher = y1 > y2 ? y1 : y2;

    let A = higher - range * 0.38;
    let B = higher - range * 0.5;
    let C = higher - range * 0.62;
    // console.log(({A,B,C}))
    if (direction === "up") {
      levels.push({ 38: A, 50: B, 62: C });
    } else if (direction === "down") {
      levels.push({ 38: C, 50: B, 62: A });
    }
  });

  // console.log({levels})
  return levels;
}
function addFibsToSwings({ supports, resistances }) {
  // let xMax = new Date(scales.timeScale.domain()[0]).getTime();
  let supportFibs = [];
  supports.forEach((support, lineIndex) => {
    for (let fib in support) {
      // console.log({fib, support})
      // console.log(support[fib])
      supportFibs.push({ x: 0, y: support[fib], fib, lineIndex });
    }
  });

  let resistanceFibs = [];
  resistances.forEach((resistance, lineIndex) => {
    for (let fib in resistance) {
      resistanceFibs.push({ x: 0, y: resistance[fib], fib, lineIndex });
    }
  });

  return { supportFibs, resistanceFibs };
}
