const {
    windowAvg,
    meanAvgDev,
  } = require("./indicatorHelpers/MovingAverage.js");
  
  module.exports = {
    calcBollingerBands,
    addBollingerBands,
    addNewBollingerBands,
  };
  
  const movingAvg = 20;
  const standDeviations = 2;
  
  
  function addNewBollingerBands(data) {
    
        //the MAD function will need more data hence the *2
    let window = data.slice(-(movingAvg));
    window = addBollingerBands(window, "close");
    data[data.length-1] = window.slice(-1)[0];
    return data;
  }
  
  function calcBollingerBands(data, key) {
    key = key || "close";
    let {
      tickMinutes,
      dailyData,
      fiveMinData,
      fifteenMinData,
      thirtyMinData,
      hourlyData,
    } = data;
    tickMinutes = addBollingerBands(tickMinutes, key);
    dailyData = addBollingerBands(dailyData, key);
  
    tickMinutes = addBollingerBands(tickMinutes, key);
    dailyData = addBollingerBands(dailyData, key);
    fiveMinData = addBollingerBands(fiveMinData, key);
    fifteenMinData = addBollingerBands(fifteenMinData, key);
    thirtyMinData = addBollingerBands(thirtyMinData, key);
    hourlyData = addBollingerBands(hourlyData, key);
  
    return {
      tickMinutes,
      dailyData,
      fiveMinData,
      fifteenMinData,
      thirtyMinData,
      hourlyData,
    };
  }
  
  function addBollingerBands(data, key) {
    
    key = key || "close";
    // let SMA_Key = `${key}${movingAvg}Avg`;
    //first SMA
    // let SMA = windowAvg(data, movingAvg, `${key}`);
  
    let MAD = meanAvgDev(data, movingAvg, key);
    try {
      MAD.forEach((sigma, iSigma) => {
        
        // console.log(SMA)
        let { meanAbsDeviation, timestamp, meanVal } = sigma;
        let currentData = data[iSigma + movingAvg - 1];
        // let currentSMA = SMA[iSigma + movingAvg * 1 - 1];
        //    console.log(currentSMA.timestamp)
        //    console.log(currentData.timestamp)
        //    console.log(timestamp)
        // if (
        //   timestamp != currentData.timestamp &&
        //   timestamp != currentSMA.timestamp
        // ) {
        //   throw new Error({ message: "The timestamps don't match up." });
        // }
     
        let STD = meanAbsDeviation * standDeviations;
        let upper = meanVal + STD;
        let lower = meanVal - STD;
        let middle = meanVal
  
        //    console.log({upper, close, lower})
        currentData.BB = {};
        currentData.BB = { upper, lower, middle };
      });
      return data;
    } catch (err) {
      console.log(err);
      return err;
    }
  }
  