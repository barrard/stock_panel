const {
    windowAvg,
    rateOfChange,
    exceedsDeviationLimit,average
  } = require("./indicatorHelpers/MovingAverage.js");
  
  const indicatorName = "tradingRange";
  const WINDOW_SIZE = 14
  module.exports = {
    // addAllATR_data,
    singleTradingRange,
    calcTradingRange,
    ATR_indicatorVals,
    ATR_Analysis,
    addNewTradingRange,
    considerTradingRange,
  };
  
  function considerTradingRange(data) {
    let currentData = data.slice(-1)[0];
    // console.log(currentData.tradingRange)
    // console.log(currentData.close)
    let { open, close, high, low, ATR, timestamp } = currentData;
    //variable to decide 'close' to range
    const CLOSE_RANGE = 0.8;
    const AT_RANGE = 0.98;
    const BEYOND_RANGE = 1.18;
    let currentRange = Math.abs(high - low);
    let proximity = currentRange / ATR;
    if(!currentRange||!ATR) {
      proximity = 0
    }else{
      let d='bug'
    }
    let gettingClose = CLOSE_RANGE - proximity > 0 ? false : true;
  
    let atRange = AT_RANGE - proximity > 0 ? false : true;
  
    let beyondRange = BEYOND_RANGE - proximity > 0 ? false : true;
    let priceLocation = (high - close) > (close - low) ? 'low' : 'high'
    return {
      timestamp,
      gettingClose,
      atRange,
      beyondRange,priceLocation
    };
  }
  
  function addNewTradingRange(data) {
    let prevClose = data.slice(-2)[0].close;
    let TR = singleTradingRange({ d: data.slice(-1)[0], prevClose });
    if(!data[data.length-1].expectedRange){
      addExpectedRange(data.slice(-WINDOW_SIZE))
    }
    // console.log(TR);
    data[data.length - 1][indicatorName] = TR;
    let window = data.slice(-WINDOW_SIZE)
    let atr = window.map(d=>d[indicatorName])
    atr = average(atr)
  
    data[data.length - 1]['ATR'] = atr;
    return data;
  }
  
  // function addAllATR_data(data) {
  //   ATR_indicatorVals(ohlc);
  // }
  
  function ATR_Analysis(avgTradingWindow, tickMinutes, dailyData) {
    // console.log(dailyAtrData);
    //see how price reacts when it gets near trading ranges of daily
  
    //one type of analysis is the rate of change
    // let rateOfChangeWindow = 2;
    let indicatorKey = `tradingRange`;
    // let rateOfChangeData = rateOfChange(atr_data, rateOfChangeWindow, indicatorKey);
    let deviationWindow = avgTradingWindow;
    let deviationLimit = {
      highSigmas: [4],
      lowSigmas: [10],
    };
    //find the deviation of ATR intraday
    var { aboveSigmas, belowSigmas } = exceedsDeviationLimit(
      tickMinutes,
      indicatorKey,
      deviationWindow,
      deviationLimit
    );
  
    tickMinutes.aboveSigmas = aboveSigmas;
    tickMinutes.belowSigmas = belowSigmas;
  
    //find the deviation of ATR daily
    var { aboveSigmas, belowSigmas } = exceedsDeviationLimit(
      dailyData,
      indicatorKey,
      deviationWindow,
      deviationLimit
    );
  
    dailyData.aboveSigmas = aboveSigmas;
    dailyData.belowSigmas = belowSigmas;
    //no what?
    //we have times when the STD was sigmas above or below
    return { tickMinutes, dailyData };
  }
  
  function addExpectedRange(data) {
    data.forEach((todaysData, iTodaysData) => {
      // //get tiem stamp and them get the daily data
      todaysData.expectedRange = {};
      let startSlice = iTodaysData - WINDOW_SIZE < 0 ? 0 : iTodaysData - WINDOW_SIZE;
      let endSlice = iTodaysData;
      let window = data.slice(startSlice, endSlice);
      if (window.length == 0) return;
      // let todaysTr = data[iTodaysData];
      let ATR =
        window.reduce((a, b) => {
          return b.tradingRange + a;
        }, 0) / window.length;
  
      let { open, high, low, close } = todaysData;
      //we may expect some resistance at open+range = about 3050
      let maxExpectedTopRange = open + ATR;
      let maxExpectedBottomRange = open - ATR;
      todaysData.expectedRange.top = maxExpectedTopRange;
      todaysData.expectedRange.bottom = maxExpectedBottomRange;
    });
    return data;
  }
  
  function ATR_indicatorVals(ohlc) {
    // console.log(ohlc);
    // window = window || 14;
  
    ohlc = calcTradingRange(ohlc);
    ohlc = addExpectedRange(
      ohlc
    );
  
  
    //get some kind of average
    return ohlc;
  }
  

  function calcTradingRange(ohlc) {
    // fill an array with ATR values
    // let allTradingRange = [];
    ohlc.forEach((d, iD) => {
      //skip index 0
      let prevClose;
      if (!iD) {
        prevClose = 0;
      } else {
        prevClose = ohlc[iD - 1].close;
      }
      d[indicatorName] = singleTradingRange({ d, prevClose });
      if(iD >= WINDOW_SIZE-1){
  
        let window = ohlc.slice( (iD+1)-WINDOW_SIZE, iD+1)
        let atr = window.map(d=>d[indicatorName])
        atr = average(atr)
        
        d['ATR'] = atr;
      }
    });
    return ohlc;
  }
  
  function singleTradingRange({ d, prevClose }) {
    let timestamp = d.timestamp;
    let h = d.high;
    let l = d.low;
    //Current high minus the previous close
    let highTR = Math.abs(h - prevClose);
    // Current low minus the previous close
    let lowTR = Math.abs(l - prevClose);
    // Current high minus the current low
    let rangeTR = h - l;
    let tradingRange = Math.max(...[highTR, lowTR, rangeTR]);
    if (!prevClose) tradingRange = rangeTR;
    // let tradingRange = (highTR + lowTR + rangeTR) / 3;
    return tradingRange;
  }
  