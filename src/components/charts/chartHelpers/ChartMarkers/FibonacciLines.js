import { select } from "d3-selection";
import { extent, max, min, mean } from "d3-array";

import diff from "../extrema.js";

import appendDot from "./Dot.js";
import DrawLine from "./Line.js";

const MIN_MAX_TOLERANCE = 75;
const PRICE_MERGING_TOLERANCE = 10

function makeFibonacciData(that) {
  let { timeframe, highs, lows, timestamps } = that.state;
  // console.log(that.state);
  let { symbol, stock_data } = that.props;
  let { commodity_data } = stock_data;
  // console.log({ timeframe, symbol, stock_data });
  if (commodity_data[symbol]) {
    let data = commodity_data[symbol][timeframe];
    // console.log(data);

    /**
     * Run MinMax with 50-100 as the tolerance
     */

    let tolerance = MIN_MAX_TOLERANCE;
    var minMaxMostRecentData = true;
    var { maxValues } = diff.minMax(
      timestamps,
      highs,
      tolerance,
      minMaxMostRecentData
    );

    var { minValues } = diff.minMax(
      timestamps,
      lows,
      tolerance,
      minMaxMostRecentData
    );

    // console.log({ maxValues, minValues });

    /**
     * Walk the MinMax values to find the swings
     */

    let {
      supports,
      resistances,
      lowToHigh,
      highToLow,
    } = determineSupportsAndResistances(maxValues, minValues);

    // console.log({ supports, resistances });

    return {
      maxValues,
      minValues,
      supports,
      resistances,
      lowToHigh,
      highToLow,
    };
  }
}

function determineSupportsAndResistances(highPoints, lowPoints) {
  let MIN = min(lowPoints, (d) => d.y);
  let MAX = max(highPoints, (d) => d.y);

  let lowToHigh = [];
  let highToLow = [];

  // console.log({ MIN, MAX });

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

    swingLows.forEach(({ x, y }) => lowToHigh.push({ x1, y1, x2: x, y2: y }));

    //after finding the support levels for main low to high swing.
    //we can now find the resistance levels form the max high forward
    // console.log({lowToHigh})

    let maxHighIndex = highPoints.findIndex(
      (high) => high.x === maxDataPoint.x
    );
    let recentHighs = highPoints.slice(maxHighIndex);

    let recentLows = lowPoints.filter((low) => low.x > maxDataPoint.x);
    let recentMin = min(recentLows, (low) => low.y);
    let recentMinData = recentLows.filter((low) => low.y === recentMin)[0];
    recentHighs = recentHighs.filter((high) => high.x < recentMinData.x);

    // console.log({ recentLows, recentHighs, recentMin });
    recentHighs.forEach((high) => {
      highToLow.push({
        x1: high.x,
        y1: high.y,
        x2: recentMinData.x,
        y2: recentMinData.y,
      });
    });
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
    swingHighs.forEach(({ x, y }) => highToLow.push({ x1, y1, x2: x, y2: y }));
    // console.log({ maxDataPoint, swingHighs, highToLow });
    //filter the lows to only be after this high
    let minLowIndex = lowPoints.findIndex((low) => low.x === minDataPoint.x);
    let recentLows = lowPoints.slice(minLowIndex);
    let recentHighs = highPoints.filter((high) => high.x > minDataPoint.x);
    let recentMax = max(recentHighs, (high) => high.y);
    let recentMaxData = recentHighs.filter((high) => high.y === recentMax)[0];

    recentLows = recentLows.filter((low) => low.x < recentMaxData.x);

    // console.log({ recentLows, recentHighs, recentMax });
    recentLows.forEach((low) => {
      lowToHigh.push({
        x1: low.x,
        y1: low.y,
        x2: recentMaxData.x,
        y2: recentMaxData.y,
      });
    });
  }

  let resistances = runFibCalculation(highToLow);
  let supports = runFibCalculation(lowToHigh);

  return { resistances, supports, lowToHigh, highToLow };
}

function runFibCalculation(lines) {
  // console.log(lines)
  let levels = [];

  lines.forEach(({ x1, y1, x2, y2 }) => {
    let range = Math.abs(y1 - y2);

    let higher = y1 > y2 ? y1 : y2;

    let A = higher - range * 0.38;
    let B = higher - range * 0.5;
    let C = higher - range * 0.62;
    // console.log(({A,B,C}))
    levels.push({ A, B, C });
  });

  // console.log({levels})
  return levels;
}

export default function FibonacciLines(that, chartWindow, scales) {
  // console.log("FIBONACCI");
  let { priceScale, timeScale } = scales;
  let {
    maxValues,
    minValues,
    supports,
    resistances,
    lowToHigh,
    highToLow,
  } = makeFibonacciData(that);

  // console.log({
  //   maxValues,
  //   minValues,
  //   supports,
  //   resistances,
  //   lowToHigh,
  //   highToLow,
  // });
  // return
  if (!that.state.visibleIndicators.fibonacciLines)
    return //console.log("fibonacciLines not turned on");

  // let svg = select(that.state.chartRef.current);
  // let chartWindow = svg.select(".chartWindow");
  // console.log({ name });

  appendHighLowDots({ maxValues, minValues, scales, chartWindow });
  appendSwingLines({ that, lowToHigh, highToLow, scales, chartWindow });
  // console.log({scales})
  appendSupportResistanceLines({
    that,
    supports,
    resistances,
    scales,
    chartWindow,
  });
}

function appendSupportResistanceLines({
  that,
  supports,
  resistances,
  scales,
  chartWindow,
}) {
  // console.log("append appendSupportResistanceLines");

  // console.log({ supports, resistances });
  let xMin = scales.timeScale.domain()[0];
  let xMax = scales.timeScale.domain()[1];
  let supportLines = [];
  supports.forEach((support) => {
    for (let fib in support) {
      supportLines.push({x:xMin, y:support[fib]})

      }
    });
    
    // console.log({supports})
    supports = diff.mergeImportantPriceLevels(supportLines, PRICE_MERGING_TOLERANCE)
  supportLines = []
    // console.log({supports})
  supports.forEach(support=>{
          supportLines.push({
          x1: support.x,
          y1: support.y,
          x2: xMax,
          y2: support.y,
        });

  })

  let resistanceLines = []
  resistances.forEach((resistance) => {
    for (let fib in resistance) {
      resistanceLines.push({x:xMin, y:resistance[fib]})

      }
    });

  
    // console.log({resistances})
    resistances = diff.mergeImportantPriceLevels(resistanceLines, PRICE_MERGING_TOLERANCE)
  resistanceLines = []
    // console.log({resistances})
  resistances.forEach(resistance=>{
          resistanceLines.push({
          x1: resistance.x,
          y1: resistance.y,
          x2: xMax,
          y2: resistance.y,
        });

  })

  // console.log({ supportLines, resistanceLines });
  scales = { xScale: scales.timeScale, yScale: scales.priceScale };
  let options = { strokeWidth: 3, color: "green" };
  DrawLine({
    that,
    dataPoints: supportLines,
    chartWindow,
    markerClass: "fibPullbackSupport",
    name: "fibonacciLines",
    scales,
    options,
  });
  options = { strokeWidth: 3, color: "red" };
  DrawLine({
    that,
    dataPoints: resistanceLines,
    chartWindow,
    markerClass: "fibPullbackResistance",
    name: "fibonacciLines",
    scales,
    options,
  });
}

function appendSwingLines({ that, lowToHigh, highToLow, scales, chartWindow }) {
  // console.log("append swing lines");

  // console.log({ lowToHigh, highToLow });
  scales = { xScale: scales.timeScale, yScale: scales.priceScale };
  let options = { strokeWidth: 3, color: "green" };
  DrawLine({
    that,
    dataPoints: lowToHigh,
    chartWindow,
    markerClass: "fibPullbackSupport",
    name: "fibonacciLines",
    scales,
    options,
  });
  options = { strokeWidth: 3, color: "red" };
  DrawLine({
    that,
    dataPoints: highToLow,
    chartWindow,
    markerClass: "fibPullbackResistance",
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
