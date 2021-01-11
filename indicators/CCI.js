const talib = require("../node_modules/talib/build/Release/talib");
let { average, meanDeviation } = require("./indicatorHelpers/MovingAverage.js");
let CCI_PERIODS = [5, 10, 14];
let indicatorName = "CCI";

module.exports = {
  calcCCI,
  CCI_PERIODS,
  addAllCCI_data,
  addNewestCCI_data,
};

function addNewestCCI_data({data, open, high, low, close}) {
  // let latestData = data.slice(-1)[0];
  CCI_PERIODS.forEach((cci_period) => {
    let optInTimePeriod = cci_period
    let { result } = talib.execute({
      startIdx: 0,
      endIdx: close.length - 1,
      name: "CCI",
      high,
      low,
      close,
      optInTimePeriod,
    });
    let cci = result.outReal.slice(-1)[0]
        let d = data.slice(-1)[0];
      if(!d[indicatorName])d[indicatorName] = {};
        d[indicatorName][cci_period] = cci
        //  {
          // ...d,
          // [indicatorName]: {
          //   ...d[indicatorName],
            // [cci_period]: cci,
          // },
        // };
        // data[data.length-1] = d

  });
  return data;
}
/**
 *
 * @param {Array} OHLC_array array of OHLC objects
 */
function calcCCI(OHLC_array) {
  let period = OHLC_array.length;
  let typicalPrices = OHLC_array.map(
    ({ high, low, close }) => +((close + high + low) / 3).toFixed(2)
  );
  let currentTypicalPrice = typicalPrices.slice(-1)[0];
  let avgTypicalPrice = average(typicalPrices);
  // let absDeviations = typicalPrices.map(tp=> Math.abs(avgTypicalPrice - tp))
  // absDeviations = absDeviations.reduce((a,b)=> a+ b, 0)/absDeviations.length

  let meanDev = meanDeviation(typicalPrices);
  let cci =
    meanDev === 0
      ? 0
      : (currentTypicalPrice - avgTypicalPrice) / (meanDev * 0.015);

  // console.log({ typicalPrices, avgTypicalPrice, meanDev, cci})
  return parseFloat(cci.toFixed(1));
}

function addAllCCI_data({ data, open, high, low, close }) {
  // let start = new Date().getTime()
  console.log(`Running CCI on ${data.length} bars`);

  CCI_PERIODS.forEach((cci_period) => {
    // console.log(talib.explain("CCI"));
    // console.log(talib.explain("CCI"));
    let optInTimePeriod = cci_period
    let { result } = talib.execute({
      startIdx: 0,
      endIdx: close.length - 1,
      name: "CCI",
      high,
      low,
      close,
      optInTimePeriod,
    });

    // let dataLength = data.length;
      result.outReal.forEach((cci, iCci) => {
        let iD = iCci + optInTimePeriod-1;//some indicators are inclusive to the period
        let d = data[iD];
      if(!d[indicatorName])d[indicatorName] = {};
        d = {
          ...d,
          [indicatorName]: {
            ...d[indicatorName],
            [cci_period]: cci,
          },
        };
        data[iD] = d;
    });
  });
  return data;
}
