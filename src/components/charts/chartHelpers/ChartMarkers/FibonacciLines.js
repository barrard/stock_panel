import diff from "../../../../indicators/indicatorHelpers/extrema.js";
import appendDot from "./Dot.js";
import DrawLine from "./Line.js";
let { slopeAndIntercept, xOfY, dropDuplicateMinMax } = require("../../../../indicators/indicatorHelpers/utils.js");



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

