//cal the super trend

const { windowAvg } = require("./indicatorHelpers/MovingAverage.js");
const MULTIPLYER = 2;
const tradingRangeAvg = 14;
const indicatorName = "superTrend";
module.exports = {
  calcSuperTrend,
  makeSuperTrendData,
  makeNewSuperTrendData,
  evalSuperTrend
};

function evalSuperTrend(d) {
  //is price above or below ST
  let { close, ST } = d;
  return close > ST ? 1 : 0;
}

function makeNewSuperTrendData(data) {
  let window = data.slice(-tradingRangeAvg);
  // let ST_data = window.slice(0,-1)
  let prevST = window.slice(-2, -1)[0];
  window = makeSuperTrendData(window, prevST);
  // console.log(window)
  data[data.length - 1] = window.slice(-1)[0];
  return data;
}

//need ATR, assumed Trading Range is already on the data
function calcSuperTrend(data) {
  let {
    tickMinutes,
    dailyData,
    fiveMinData,
    fifteenMinData,
    thirtyMinData,
    hourlyData,
  } = data;

  tickMinutes = makeSuperTrendData(tickMinutes);
  dailyData = makeSuperTrendData(dailyData);
  fiveMinData = makeSuperTrendData(fiveMinData);
  fifteenMinData = makeSuperTrendData(fifteenMinData);
  thirtyMinData = makeSuperTrendData(thirtyMinData);
  hourlyData = makeSuperTrendData(hourlyData);

  return {
    tickMinutes,
    dailyData,
    fiveMinData,
    fifteenMinData,
    thirtyMinData,
    hourlyData,
  };
}

function makeSuperTrendData(data, prevST) {
  if (data.length < tradingRangeAvg) return data;
  //need to make a rolling avg on the trading range
  let ATR = windowAvg(data, tradingRangeAvg, "tradingRange");

  // console.log(ATR);
  let prevUpper, prevLower, prevSuperTrend;
  if (prevST && prevST.superTrend) {
    prevUpper = prevST.superTrend.prevUpper;
    prevLower = prevST.superTrend.prevLower;
    prevSuperTrend = prevST.superTrend.superTrend;
  } else {
    prevUpper = 0;
    prevLower = 0;
    prevSuperTrend = 0;
  }
  ATR.forEach((d, iD) => {
    let dataIndex = iD + (tradingRangeAvg - 1);
    //requires a previous value
    // if (iD === 0) {
    //   return;
    // }
    let atr = d[`tradingRange${tradingRangeAvg}Avg`];
    let { high, low, close, timestamp } = data[dataIndex];
    let prevClose = data[dataIndex - 1].close;

    let atrMultiple = atr * MULTIPLYER;
    let upperBandBasic = (high + low) / 2 + atrMultiple;
    let lowerBandBasic = (high + low) / 2 - atrMultiple;

    let upperBand =
      upperBandBasic < prevUpper || prevClose > prevUpper
        ? upperBandBasic
        : prevUpper;
    let lowerBand =
      lowerBandBasic > prevLower || prevClose < prevLower
        ? lowerBandBasic
        : prevLower;

    let superTrend =
      prevSuperTrend === prevUpper && close < upperBand
        ? upperBand
        : prevSuperTrend == prevUpper && close > upperBand
        ? lowerBand
        : prevSuperTrend === prevLower && close > lowerBand
        ? lowerBand
        : prevSuperTrend === prevLower && close < lowerBand
        ? upperBand
        : prevSuperTrend;

    // console.log({ superTrend, upperBand, lowerBand, close, aboveOrBelow });
    prevUpper = upperBand;
    prevLower = lowerBand;
    if (atrMultiple === 0 && upperBand === lowerBand) {
      superTrend = upperBand;
    }
    prevSuperTrend = superTrend;
    data[dataIndex].superTrend = { superTrend, prevLower, prevUpper };
  });
  return data;
}
