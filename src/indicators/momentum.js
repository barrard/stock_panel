const { average } = require("./indicatorHelpers/MovingAverage.js");
let momoValues = [1, 2, 3, 5, 10, 20, 40];
let indicatorName = "momentum";

module.exports = {
  momoTrend,
  momoStrength,
  momentumAnalysis,
  momoValues,
  calcMomo,
  updateMomo,
  addNewestMomentumAnalysis,
};

function addNewestMomentumAnalysis(data) {
  let latestData = data.slice(-1)[0];
  latestData[indicatorName] = {};
  momoValues.forEach((period) => {
    //the plus one is needed here for this case
    let window = data.slice(-(period + 1));
    let momo = makeMomo(window, period);
    //momo is who whole window array, but we only want the current (last)
    // latestData[indicatorName][period] = momo.slice(-1)[0]
  });
  // console.log(data)
  return data;
}

function momentumAnalysis(OHLC_data) {
  // OHLC_data = OHLC_data.slice(-3000)//TODO hmmm?
  console.log(`Running momentum on ${OHLC_data.length} data`);

  momoValues.forEach((momoVal) => {
    makeMomo(OHLC_data, momoVal);
  });
  return OHLC_data;
}

function updateMomo(data) {
  data = data.sort((a, b) => a.timestamp - b.timestamp);
  let sortedMomoValues = momoValues.sort((a, b) => b - a);

  let newData = data.slice(-1)[0];
  if (newData.momentum) {
    return console.log(`Already have momentum on`);
  }
  newData.momentum = {};
  sortedMomoValues.forEach((momentumVal, i_momentumVal) => {
    let window = data.slice(-momentumVal);
    // console.log({window, newData})
    let current = newData;
    let past = window[0];
    let momentum = calcMomo({ current, past });
    newData.momentum[`${momentumVal}`] = momentum;
  });
  return newData;
}

//momentum generator, also volume
function makeMomo(OHLC_data, period) {
  if (period < 1) return console.log("bad momo val");
  let dataLength = OHLC_data.length;
  OHLC_data.forEach((current, iCurrent) => {
    if (!current.momentum) current.momentum = {};
    if (iCurrent < period) return;
    let past = iCurrent - period;
    // if (past > dataLength) {
    //   return { past, dataLength };
    // }
    past = OHLC_data[past];

    let { momo, highLow } = calcMomo({ current, past });

    current.momentum[period] =
      // {
      momo;
    // highLow,
    // };
  });
  return OHLC_data;
}

function calcMomo({ current, past }) {
  let { close, high, low } = current;
  let pastClose = past.close;
  let momo =
    close === pastClose
      ? 0
      : parseFloat((((close - pastClose) / pastClose) * 100).toFixed(4));
  let highLow = closedNear(close, high, low);
  return { momo, highLow };
}
function closedNear(close, high, low) {
  let fromLow = Math.abs(close - low);
  let fromHigh = Math.abs(close - high);
  if (fromLow < fromHigh) return 0;
  else if (fromHigh < fromLow) return 1;
  else return 2;
}

//TODO function momoStrength

function momoStrength(data) {
  let { momentum, timeframe, symbol } = data.slice(-1)[0];
  let str = "";
  let momStr = "";
  Object.keys(momentum).forEach((momoVal) => {
    if (momentum[1] > 0.05 || momentum[1] < -0.05) momStr += `1:strong `;
    if (momentum[2] > 0.09 || momentum[1] < -0.09) momStr += `2:strong `;
    if (momentum[3] > 0.13 || momentum[1] < -0.13) momStr += `3:strong `;
    if (momentum[5] > 0.12 || momentum[1] < -0.12) momStr += `5:strong `;
    if (momentum[10] > 0.17 || momentum[1] < -0.17) momStr += `10:strong `;
    if (momentum[20] > 0.27 || momentum[1] < -0.27) momStr += `20:strong `;
    if (momentum[40] > 0.46 || momentum[1] < -0.46) momStr += `40:strong `;
    momoVal = +momoVal;
    let val = momentum[momoVal].momo;
    if (val > 0) str += "1";
    if (val < 0) str += "0";
    if (val === 0) str += "-1";
  });
  if (momStr) momStr = `--PWR MOMO---${momStr}`;
  console.log(`---momo--- ${symbol} ${timeframe} ${str} ${momStr}`);
}

function momoTrend({ momentum, close, timeframe, timestamp }) {
  let momentumVals = Object.keys(momentum).map((k) => +k);
  let largeMomentumVals = momentumVals.filter((v) => v > 5);
  let smallMomentumVals = momentumVals.filter((v) => v < 5);

  let smallMomentumAllPositive = smallMomentumVals.reduce((a, b) => {
    if (a === false) return false;
    return momentum[b].momo > 0 ? true : false;
  }, true);

  let smallMomentumAllNegative = smallMomentumVals.reduce((a, b) => {
    if (a === false) return false;
    return momentum[b].momo < 0 ? true : false;
  }, true);
  let smallerTrend = smallMomentumAllPositive
    ? "up"
    : smallMomentumAllNegative
    ? "down"
    : "range";

  let largeMomentumAllPositive = largeMomentumVals.reduce((a, b) => {
    if (a === false) return false;
    return momentum[b].momo > 0 ? true : false;
  }, true);

  let largeMomentumAllNegative = largeMomentumVals.reduce((a, b) => {
    if (a === false) return false;
    return momentum[b].momo < 0 ? true : false;
  }, true);
  let biggerTrend = largeMomentumAllPositive
    ? "up"
    : largeMomentumAllNegative
    ? "down"
    : "range";
  // console.log('momo deets')
  // console.log(tls(timestamp))
  //   console.log({smallerTrend, biggerTrend, timeframe})

  return { biggerTrend, smallerTrend };
}
