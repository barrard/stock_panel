let { dropDuplicateMinMax } = require("./indicatorHelpers/utils.js");
let diff = require("./indicatorHelpers/extrema.js");

module.exports = {
    runPriceLevels
}

function runPriceLevels(priceLevelMinMax, priceLevelSensitivity, data) {
  // let priceLevelMinMax = this.state.priceLevelMinMax;

  let importantMinMaxValues = runMinMax(priceLevelMinMax, data);
  let importantHighPoints = [
    ...importantMinMaxValues.high.maxValues,
    ...importantMinMaxValues.close.maxValues,
  ];
  let importantLowPoints = [
    ...importantMinMaxValues.low.minValues,
    ...importantMinMaxValues.close.minValues,
  ];
  let allImportantPoints = [...importantHighPoints, ...importantLowPoints];
  /**
   * merge similar lines
   */
  let groupedPoints = diff.mergeImportantPriceLevels(
    allImportantPoints,
    priceLevelSensitivity
  );

  //not sure this works?
  // groupedPoints = dropDuplicateMinMax(groupedPoints);

return { importantPriceLevels: groupedPoints }
}



function runMinMax(tolerance, data) {
  let { highs, lows, closes, timestamps } = this.state;
  let minMaxValues = {
    high: { maxValues: [] },
    low: { minValues: [] },
    close: { minValues: [], maxValues: [] },
  };
  //Max Highs
  var { maxValues } = diff.minMax(timestamps, highs, tolerance);
  //remove dups
  maxValues = dropDuplicateMinMax(maxValues);
  minMaxValues["high"].maxValues = maxValues;
  //Min lows
  var { minValues } = diff.minMax(timestamps, lows, tolerance);
  minValues = dropDuplicateMinMax(minValues);
  minMaxValues["low"].minValues = minValues;
  //Min and max close
  var { minValues, maxValues } = diff.minMax(timestamps, closes, tolerance);
  maxValues = dropDuplicateMinMax(maxValues);
  minValues = dropDuplicateMinMax(minValues);
  minMaxValues["close"].maxValues = maxValues;
  minMaxValues["close"].minValues = minValues;

  return minMaxValues;
}
