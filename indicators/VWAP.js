const {TICKS} = require("./indicatorHelpers/utils.js");
const {checkBeginningNewDay} = require('./indicatorHelpers/IsMarketOpen.js')
module.exports =  {
  addVWAP,
  addNewVWAP,
  createAllVWAP_data,
  evalVWAP,
};

function evalVWAP(data) {
  let lastData = data.slice(-1)[0];
  if (!lastData.VWAP) return;
  let { symbol, timeframe, VWAP } = lastData;
  let tickSize = TICKS()[symbol]
  let close = lastData.close;
  let delta = (close - VWAP.VWAP) / tickSize;
  console.log(`---VWAP----${symbol} ${timeframe} ticks from VWAP:${delta}`);
  return VWAP > close ? "up" : "down";
}

function addNewVWAP(data) {
    let timeframe = data[0].timeframe
  if(timeframe!=='1Min')return data

  let dl = data.length;
  let prevData = data[dl - 2];
  let cumulativeAvgPriceVol
  let cumulativeVol
  if (prevData) {
    cumulativeAvgPriceVol = prevData.VWAP.cumulativeAvgPriceVol;
    cumulativeVol = prevData.VWAP.cumulativeVol;
  } else {
    cumulativeAvgPriceVol = 0;
    cumulativeVol = 0;
  }
  // console.log(prevData)
  let { open, high, low, close, volume } = data[dl - 1];
  let typicalPrice = (high + close + low) / 3;
  cumulativeAvgPriceVol = typicalPrice * volume + cumulativeAvgPriceVol;
  cumulativeVol += volume;
  let VWAP = cumulativeAvgPriceVol / cumulativeVol;
  data[dl - 1].VWAP = { VWAP, cumulativeAvgPriceVol, cumulativeVol };

  return data;
}

function addVWAP(data) {
  let {
    tickMinutes,
    dailyData,
    fiveMinData,
    fifteenMinData,
    thirtyMinData,
    hourlyData,
  } = data;

  tickMinutes = createAllVWAP_data(tickMinutes);
  // dailyData = createAllVWAP_data(dailyData);
  // fiveMinData = createAllVWAP_data(fiveMinData);
  // fifteenMinData = createAllVWAP_data(fifteenMinData);
  // thirtyMinData = createAllVWAP_data(thirtyMinData);
  // hourlyData = createAllVWAP_data(hourlyData);

  return {
    tickMinutes,
    dailyData,
    fiveMinData,
    fifteenMinData,
    thirtyMinData,
    hourlyData,
  };
}

function createAllVWAP_data(data) {
  let cumulativeVol = 0;
  let cumulativeAvgPriceVol = 0;
  data.forEach((d, iD) => {
    let { open, high, low, close, volume, timestamp } = d;
    if(checkBeginningNewDay(timestamp)){
      cumulativeVol = 0;
      cumulativeAvgPriceVol = 0;
    }
    let typicalPrice = (high + close + low) / 3;
    cumulativeAvgPriceVol = typicalPrice * volume + cumulativeAvgPriceVol;
    cumulativeVol += volume;
    if(cumulativeVol < 0){
    }
    let VWAP = cumulativeAvgPriceVol / cumulativeVol;
    d.VWAP = { VWAP, cumulativeAvgPriceVol, cumulativeVol };
    if(iD>180){

    }
  });
  return data;
}
