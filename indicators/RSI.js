const talib = require("../node_modules/talib/build/Release/talib");
const { windowExpAvg, windowAvg } = require("./indicatorHelpers/MovingAverage.js");

module.exports =  {
  calcRSI, addRSI, addNewRSI
};


function addNewRSI({data, open, high, low, close}){
  let d = data.slice(-1)[0]
  let mini = close.slice(-(RSI_PERIOD+11))
  let { result } = talib.execute({
    startIdx: 0,
    endIdx: mini.length - 1,
    name: "RSI",
    // high,
    // low,
    inReal:mini,
    optInTimePeriod:RSI_PERIOD,
  });
  //only add the last data
  d.RSI = result.outReal.slice(-1)[0]  
  return data
}

function calcRSI(data) {
  let {
    tickMinutes,
    dailyData,
    fiveMinData,
    fifteenMinData,
    thirtyMinData,
    hourlyData,
  } = data;

  addRSI(tickMinutes);
  addRSI(dailyData);
  addRSI(fiveMinData);
  addRSI(fifteenMinData);
  addRSI(thirtyMinData);
  addRSI(hourlyData);
  return {
    tickMinutes,
    dailyData,
    fiveMinData,
    fifteenMinData,
    thirtyMinData,
    hourlyData,
  };
}

const RSI_PERIOD = 14;

function addRSI({data, open, high, low, close}) {

  let { result } = talib.execute({
    startIdx: 0,
    endIdx: close.length - 1,
    name: "RSI",
    // high,
    // low,
    inReal:close,
    optInTimePeriod:RSI_PERIOD,
  });
  // let _test = close.slice(-(RSI_PERIOD+11))
  // let tester = talib.execute({
  //   startIdx: 0,
  //   endIdx: _test.length - 1,
  //   name: "RSI",
  //   // high,
  //   // low,
  //   inReal:_test,
  //   optInTimePeriod:RSI_PERIOD,
  // });
  // result.outReal.forEach((RSI, iRsi) => {

    result.outReal.forEach((RSI, iRsi) => {
      let d = data[iRsi+RSI_PERIOD]
      if(!d['RSI'])d['RSI'] = {}
      d['RSI'] = RSI
    })
    return data
    //need a previous price to compare
  //   if (!iD) {
  //     d.upwardMovement = 0;
  //     d.downwardMovement = 0;
  //     return;
  //   }
  //   let prevClose = data[iD - 1].close;
  //   let { close } = d;
  //   d.RSI = {};
  //   let upwardMovement = close > prevClose ? close - prevClose : 0;
  //   let downwardMovement = close < prevClose ? prevClose - close : 0;
  //   // movementData.push({upwardMovement, downwardMovement})
  //   d.upwardMovement = upwardMovement;
  //   d.downwardMovement = downwardMovement;
  // });
  // let upwardAvg = windowAvg(data, RSI_PERIOD, "upwardMovement");
  // let downwardAvg = windowAvg(data, RSI_PERIOD, "downwardMovement");

  // try {
  //   upwardAvg.forEach((up, iUp) => {
  //     let RS =
  //       up[`upwardMovement${RSI_PERIOD}Avg`] /
  //       downwardAvg[iUp][`downwardMovement${RSI_PERIOD}Avg`];
  //     let ohlcData = data[iUp + RSI_PERIOD - 1];
  //     if (ohlcData.timestamp != up.timestamp) {
  //       throw new Error({ message: "timestamps do not add up" });
  //     }
  //     // console.log(RS)
  //     let RSI = 100 - (100 / (RS + 1));

  //     delete ohlcData.upwardMovement;
  //     delete ohlcData.downwardMovement;
  //     ohlcData.RSI[RSI_PERIOD] = parseFloat((RSI).toFixed(1));
  //   });
  //   return data
  // } catch (err) {
  //   return err;
  // }
}
