const { windowExpAvg, windowAvg } = require("./indicatorHelpers/MovingAverage.js");

module.exports =  {
  calcRSI, addRSI, addNewRSI
};

function addNewRSI(data){
  addRSI(data)
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

const movementAvg = 14;

function addRSI(data) {
  // let movementData = []

  data.forEach((d, iD) => {
    //need a previous price to compare
    if (!iD) {
      d.upwardMovement = 0;
      d.downwardMovement = 0;
      return;
    }
    let prevClose = data[iD - 1].close;
    let { close } = d;
    d.RSI = {};
    let upwardMovement = close > prevClose ? close - prevClose : 0;
    let downwardMovement = close < prevClose ? prevClose - close : 0;
    // movementData.push({upwardMovement, downwardMovement})
    d.upwardMovement = upwardMovement;
    d.downwardMovement = downwardMovement;
  });
  let upwardAvg = windowAvg(data, movementAvg, "upwardMovement");
  let downwardAvg = windowAvg(data, movementAvg, "downwardMovement");

  try {
    upwardAvg.forEach((up, iUp) => {
      let RS =
        up[`upwardMovement${movementAvg}Avg`] /
        downwardAvg[iUp][`downwardMovement${movementAvg}Avg`];
      let ohlcData = data[iUp + movementAvg - 1];
      if (ohlcData.timestamp != up.timestamp) {
        throw new Error({ message: "timestamps do not add up" });
      }
      // console.log(RS)
      let RSI = 100 - (100 / (RS + 1));

      delete ohlcData.upwardMovement;
      delete ohlcData.downwardMovement;
      ohlcData.RSI[movementAvg] = parseFloat((RSI).toFixed(1));
    });
    return data
  } catch (err) {
    return err;
  }
}
