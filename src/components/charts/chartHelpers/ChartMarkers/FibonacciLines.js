import { max, min } from "d3-array";
import diff from "../extrema.js";
import appendDot from "./Dot.js";
import DrawLine from "./Line.js";
let { slopeAndIntercept, xOfY, dropDuplicateMinMax } = require("../../../../indicators/indicatorHelpers/utils.js");

export function makeFibonacciData(that, scales) {
  let { highs, lows, timestamps } = that.state;
  // console.log(that.state);
  let { symbol, stock_data } = that.props;
  let { commodity_data } = stock_data;
  // console.log({ timeframe, symbol, stock_data });
  if (commodity_data[symbol]) {
    // let data = commodity_data[symbol][timeframe];
    // console.log(data);

    /**
     * Run MinMax with 50-100 as the tolerance
     */

    let tolerance = that.state.fibonacciMinMax;
    var minMaxMostRecentData = false;//keep as false for this
    var { maxValues } = diff.minMax(
      timestamps,
      highs,
      tolerance,
      minMaxMostRecentData
    );

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
      scales,
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
      levels.push({ "38": A, "50": B, "62": C });
    } else if (direction === "down") {
      levels.push({ "38": C, "50": B, "62": A });
    }
  });

  // console.log({levels})
  return levels;
}
// let fibData = makeFibonacciData(that, scales);

export function FibonacciLines(that, chartWindow, scales, fibData) {
  let maxValues,
    minValues,
    supports,
    resistances,
    lowToHigh,
    highToLow,
    supportFibs,
    resistanceFibs;
  if (!fibData) return;
  // let { priceScale, timeScale } = scales;
  maxValues = fibData.maxValues;
  minValues = fibData.minValues;
  supports = fibData.supports;
  resistances = fibData.resistances;
  lowToHigh = fibData.lowToHigh;
  highToLow = fibData.highToLow;
  supportFibs = fibData.supportFibs;
  resistanceFibs = fibData.resistanceFibs;
  // console.log({
  //   maxValues,
  //   minValues,
  //   supports,
  //   resistances,
  //   lowToHigh,
  //   highToLow,
  // });
  // return
  if (!that.state.visibleIndicators.fibonacciLines) return; //console.log("fibonacciLines not turned on");

  // let svg = select(that.state.chartRef.current);
  // let chartWindow = svg.select(".chartWindow");
  // console.log({ name });

  //add the fib levels here so they can be drawn

  appendHighLowDots({ maxValues, minValues, scales, chartWindow });
  appendSwingLines({ that, lowToHigh, highToLow, scales, chartWindow });
  // console.log({scales})
  appendSupportResistanceFibs({
    that,
    supportFibs,
    resistanceFibs,
    scales,
    chartWindow,
  });
}

function appendSupportResistanceFibs({
  that,
  supportFibs,
  resistanceFibs,
  scales,
  chartWindow,
}) {
  // console.log({  supportFibs,
  //   resistanceFibs,})
  // console.log("append appendSupportResistanceFibs");
  let xMax = new Date(scales.timeScale.domain()[1]).getTime();
  // console.log({xMax})
  // console.log({ supports, resistances });

  // console.log({supports})
  let supports = diff.mergeImportantPriceLevels(
    supportFibs,
    that.state.fibonacciSensitivity
  );
  supportFibs = [];
  supports.forEach((support) => {
    // console.log({support})
    supportFibs.push({
      x1: support.x,
      y1: support.y,
      x2: xMax,
      y2: support.y,
    });
  });
  // console.log({supports, supportFibs})

  // console.log({resistances})
  let resistances = diff.mergeImportantPriceLevels(
    resistanceFibs,
    that.state.fibonacciSensitivity
  );
  resistanceFibs = [];
  // console.log({resistances})
  resistances.forEach((resistance) => {
    // console.log({resistance})
    resistanceFibs.push({
      x1: resistance.x,
      y1: resistance.y,
      x2: xMax,
      y2: resistance.y,
    });
  });
  // console.log({resistances, resistanceFibs})

  // console.log({ supportFibs, resistanceFibs });
  scales = { xScale: scales.timeScale, yScale: scales.priceScale };
  let options = { strokeWidth: 3, color: "green" };
  DrawLine({
    that,
    dataPoints: supportFibs,
    chartWindow,
    markerClass: "fibPullbackSupport",
    name: "fibonacciLines",
    scales,
    options,
  });
  options = { strokeWidth: 3, color: "red" };
  DrawLine({
    that,
    dataPoints: resistanceFibs,
    chartWindow,
    markerClass: "fibPullbackResistance",
    name: "fibonacciLines",
    scales,
    options,
  });
}

function makeHighlighFibLines(fibData, swingLine) {
  let highlightedFibLineData = [];
  let { m, b } = swingLine;
  fibData.forEach((fibLine) => {
    let { fib, y } = fibLine;
    let x = xOfY({ m, b, y });
    highlightedFibLineData.push({
      x1: x,
      y1: y,
      x2: new Date().getTime(),
      y2: y,
    });
  });
  return highlightedFibLineData;
}

function highlightFibLines(d, i, swings, chartWindow, scales) {
  // console.log({d, i, swings})
  // console.log({ scales });
  //draw these lines?
  let options = {
    strokeWidth: 5,
    color: "blue",
  };
  let { fibs } = swings;
  fibs = fibs.filter(({ lineIndex }) => lineIndex === i);
  // console.log({ fibs, swing: d });
  let highlightedFibLinesData = makeHighlighFibLines(fibs, d);
  DrawLine({
    that: null,
    dataPoints: highlightedFibLinesData,
    chartWindow,
    markerClass: "highlightedFibLines",
    name: "fibonacciLines",
    scales,
    options,
  });
}
function appendSwingLines({ that, lowToHigh, highToLow, scales, chartWindow }) {
  // console.log("append swing lines");

  // console.log({ lowToHigh, highToLow });
  scales = { xScale: scales.timeScale, yScale: scales.priceScale };
  let options = {
    strokeWidth: 3,
    color: "green",
    mouseover: function (d, i) {
      this.classList.add("hoveredSwingLine");

      highlightFibLines(d, i, lowToHigh, chartWindow, scales);
    },
    mouseout: function () {
      this.classList.remove("hoveredSwingLine");

      chartWindow.selectAll(".highlightedFibLines").remove();
    },
  };
  // console.log({scales})
  DrawLine({
    that,
    dataPoints: lowToHigh,
    chartWindow,
    markerClass: "fibSwingHigh",
    name: "fibonacciLines",
    scales,
    options,
  });

  options = {
    strokeWidth: 3,
    color: "red",
    mouseover: function (d, i) {
      this.classList.add("hoveredSwingLine");

      highlightFibLines(d, i, highToLow, chartWindow, scales);
    },
    mouseout: function () {
      this.classList.remove("hoveredSwingLine");

      chartWindow.selectAll(".highlightedFibLines").remove();
    },
  };
  DrawLine({
    that,
    dataPoints: highToLow,
    chartWindow,
    markerClass: "fibSwingLow",
    name: "fibonacciLines",
    scales,
    options,
  });
}

function appendHighLowDots({ maxValues, minValues, scales, chartWindow }) {
  appendDot(
    maxValues, //data
    "red", //color
    5, //radius
    "fibonacciHigh", //markerClass
    `fibonacciLines`, //name
    chartWindow, //chartWindow
    scales //scales
  );

  appendDot(
    minValues,
    "green",
    5,
    `fibonacciLow`,
    "fibonacciLines",
    chartWindow,
    scales
  );
}

function addFibsToSwings({ scales, supports, resistances }) {
  let xMax = new Date(scales.timeScale.domain()[0]).getTime();
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

  // lowToHigh = lowToHigh.map(lth=>{

  // })

  // highToLow = highToLow.map(htl=>{

  // })
}
