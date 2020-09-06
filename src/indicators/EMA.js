const { sum, mean, median, deviation, max, min, extent } = require("d3-array");
const { makeEMA, getClose } = require("./indicatorHelpers/MovingAverage.js");
const { maxDiffFromPrice } = require("./indicatorHelpers/dataParser.js");

const TICK_SIZE = require("../../utils/ticks.js");

const indicatorName = "ema";

module.exports = {
    createAllEMAData,
  EMA_Analysis,
  addEMAVals,
  addNewEMAVal,
  considerCurrentEMA,
  getEMA_Trend,
  emaPriceCheck,
  emaProximityCheck,
  evalEMA
};

const emaValues = [20, 50, 200];

function evalEMA(allData) {
  let data = allData.slice(-1)[0]
  let {ema} = data

  if (!ema) return;

  let trend = getEMA_Trend(data);

  let priceCheck = emaPriceCheck(data);

  let proximityCheck = emaProximityCheck(data);

  let spaceBetween = emaSpread(data)
  console.log('----- ema')
  console.log({ priceCheck, proximityCheck, spaceBetween });
  if (
    (trend === "downtrend" || priceCheck === "downtrend") &&
    !proximityCheck
  ) {
    return "down trending wait for pullback";
  } else if (
    (trend === "uptrend" || priceCheck === "uptrend") &&
    !proximityCheck
  ) {
    return "up";
  } else if (
    trend === "uptrend" &&
    priceCheck === "uptrend" &&
    proximityCheck
  ) {
    return "up";
  } else if (
    trend === "downtrend" &&
    priceCheck === "downtrend" &&
    proximityCheck
  ) {
    return "down";
  } else if (proximityCheck) {
    if (proximityCheck === 20 && trend === "bullishPullback") {
      return "up";
    } else if (proximityCheck === 50 && trend === "bullishPullback") {
      return "up";
    } else if (proximityCheck === 200 && trend === "bullishPullback") {
      return "up";
    } else if (proximityCheck === 20 && trend === "bearishPullback") {
      return "down";
    } else if (proximityCheck === 50 && trend === "bearishPullback") {
      return "down";
    } else if (proximityCheck === 200 && trend === "bearishPullback") {
      return "down";
    } else {
      return "middle";
    }
  } else {
    return "middle";
  }
}


function addNewEMAVal(data) {
  //if data is longer than 1, and previous data holds ema then simple

  //adding only the latest EMA
  let emaData = {};
  data[data.length - 1].ema = {};

  emaValues.forEach((emaVal) => {
    if (emaVal > data.length) return (emaData[emaVal] = []);
    if (emaVal == data.length) {
      let window = data;
      //just get SMA
      let MA = mean(window, getClose);
      emaCalc = parseFloat(MA.toFixed(3));
      data[data.length - 1].ema[emaVal] = MA;
    } else {
      const multiplier = 2 / (emaVal + 1);
      // use the previous ema value
      let currentDay = data[data.length - 1];
      let close = currentDay.close;
      let prevDay = data[data.length - 2];
      let prevEMA = prevDay.ema[emaVal];
      let emaCalc = (close - prevEMA) * multiplier + prevEMA;
      data[data.length - 1].ema[emaVal] = emaCalc;
    }
  });
  return data;
}

function addEMAVals(data) {
  let {
    tickMinutes,
    dailyData,
    fiveMinData,
    fifteenMinData,
    thirtyMinData,
    hourlyData,
  } = data;

  tickMinutes = createAllEMAData(tickMinutes);
  dailyData = createAllEMAData(dailyData);
  fiveMinData = createAllEMAData(fiveMinData);
  fifteenMinData = createAllEMAData(fifteenMinData);
  thirtyMinData = createAllEMAData(thirtyMinData);
  hourlyData = createAllEMAData(hourlyData);

  return {
    tickMinutes,
    dailyData,
    fiveMinData,
    fifteenMinData,
    thirtyMinData,
    hourlyData,
  };
}

function createAllEMAData(data) {
  let emaData = {};

  emaValues.forEach((emaVal) => {
    emaData[emaVal] = makeEMA(data, emaVal);
  });
  emaValues.forEach((emaVal) => {
    let ema = emaData[emaVal];
    ema.forEach((EMA, iEma) => {
      // console.log(EMA);
      let currentData = data[iEma + (emaVal - 1)];
      if (!currentData.ema) currentData.ema = {};
      // console.log(currentData)
      if (EMA.x !== currentData.timestamp) {
        throw new Error("Timestamps do not match");
      }
      currentData.ema[emaVal] = EMA.y;
    });
  });

  return data;
}

/**
 *
 * @param {Array} data array of data
 */
function considerCurrentEMA(data) {
  // console.log(data)
  let { ema, close } = data.slice(-1)[0];
  //check the trend
  let trend = emaPriceCheck(data.slice(-1)[0]);

  //are we far from any one MA?
  let percDiff = checkPercentDiff(ema, close);

  //check if the ema are in order
  let biggerTrend = getEMA_Trend({ ema, close });

  return { trend, percDiff, biggerTrend };
}

function emaSpread(data){
  let {ema, symbol,timeframe} = data

  let vals = []

  let spread = 0
  Object.keys(ema).forEach(emaVal=>{
    vals.push( +emaVal)
  })
  vals.forEach(v1=>{
    vals.forEach(v2=> spread+= Math.abs(ema[v1]-ema[v2]))
  })
  // console.log(`-----EMA spread for ${symbol} ${timeframe} ${spread}`)
  spread = spread/TICK_SIZE[symbol].toFixed(2)
  return spread
}

function getEMA_Trend({ ema, close }) {
  let emaVals = Object.keys(ema).map((k) => +k);
  emaVals.sort((a, b) => a - b); //low to high
  //were the emas in order low to high, were in a
  //20 ema > 50 ema > 200 ema === uptrend
  let emaOrderUpTrend = emaVals.reduce((a, b) => {
    if (a === false) return false;
    if (a === null) return (a = ema[b]);
    if (a < ema[b]) return false;
    return ema[b];
  }, null);

  let emaOrderDownTrend = emaVals.reduce((a, b) => {
    if (a === false) return false;
    if (a === null) return (a = ema[b]);
    if (a > ema[b]) return false;
    return ema[b];
  }, null);
  //if not all ema in uptrend order, just check the 50/200
  //maybe a pullback is causing this
  let bullishPullback = false
  let bearishPullback = false
  if(!emaOrderUpTrend){
    if(ema['50'] > ema['200']) bullishPullback = true
  }else if(!emaOrderDownTrend){
    if(ema['50'] < ema['200']) bearishPullback = true
  }

  
  let biggerTrend = emaOrderUpTrend
    ? "uptrend"
    : emaOrderDownTrend
    ? "downtrend"
    : bullishPullback
    ? 'bullishPullback'
    : bearishPullback
    ? 'bearishPullback'
    : "range";

  return biggerTrend;
}

function checkPercentDiff(ema, close) {
  let diffData = {};
  emaValues.forEach((emaVal) => {
    let emaData = ema[emaVal];
    if (!emaData) return;

    let diff = Math.abs(close - emaData);
    let perc = diff / close;
    diffData[emaVal] = perc;

    //todo need to define perc cuttoffs for when its a lot?

    return;
  });

  return diffData;
}

function emaProximityCheck(data) {
  let { ema, close, symbol, timeframe } = data
  const PROX_LIMIT = 0.005;
  let ema20 = ema["20"];
  let ema50 = ema["50"];
  let ema200 = ema["200"];
  let tickSize = TICK_SIZE[symbol];
  let limit = 4
  let prox20 = checkProx(close, ema20, tickSize, limit);
  let prox50 = checkProx(close, ema50, tickSize, limit);
  let prox200 = checkProx(close, ema200, tickSize, limit);
  // console.log({ prox20, prox50, prox200 });
  if (prox200) {
    return 200;
  } else if (prox50) {
    return 50;
  } else if (prox20) {
    return 20;
  } else {
    return false;
  }
}

function checkProx(close, priceLevel, TICK_SIZE, limit) {
  let diff = Math.abs(close - priceLevel);
  // if (diff <= TICK_SIZE * limit * 4) {
  //   console.log(`${close} is near ${priceLevel}`);
  // }

  return diff <= TICK_SIZE * limit;
}

function emaPriceCheck(data) {
  let { ema, close } = data;
  let isPriceBelowAll = true;
  emaValues.forEach((emaVal) => {
    // console.log(emaVal)
    let emaData = ema[emaVal];
    if (close > emaData) {
      isPriceBelowAll = false;
    }
  });

  let isPriceAboveAll = true;
  emaValues.forEach((emaVal) => {
    // console.log(emaVal)
    let emaData = ema[emaVal];
    if (close < emaData) {
      isPriceAboveAll = false;
    }
  });

  if (isPriceBelowAll) {
    return "downtrend";
  } else if (isPriceAboveAll) {
    return "uptrend";
  } else {
    return "range";
  }
}

/**
 *
 * @param {array} data array of OHLC objects
 */
function EMA_Analysis(OHLC_data) {
  console.log("EMA analysis");
  let emaData = {};
  let distanceFromPriceData = {};
  emaValues.forEach((emaVal) => {
    //First get all the EMA values
    emaData[emaVal] = makeEMA(OHLC_data, emaVal);
    //get the distance from price data
    distanceFromPriceData[emaVal] = maxDiffFromPrice(
      emaData[emaVal],
      OHLC_data
    );
  });

  //then evaluate the results
  let { finalResults, filteredResults } = analyzeEMA(
    emaData,
    distanceFromPriceData,
    OHLC_data
  );

  //Doesnt really do anything right now
  let {
    closerLook,
    timeGroupedEvents,
    sortedCloserLook,
  } = backTestWithResults({ finalResults, filteredResults });
  console.log({ backTestResults });
  return {
    finalResults,
    filteredResults,
    closerLook,
    timeGroupedEvents,
    sortedCloserLook,
  };
}

function backTestWithResults({ finalResults, filteredResults }) {
  console.log(finalResults);
  let closerLook = {};
  let timeGroupedEvents = {};
  let sortedCloserLook = {};

  //lets look closer at events that came from 00, or 11, or 22
  for (let emaVal in finalResults) {
    closerLook[emaVal] = {};
    for (let percDiff in finalResults[emaVal]) {
      closerLook[emaVal][percDiff] = {};
      for (let results in finalResults[emaVal][percDiff]) {
        let xy = finalResults[emaVal][percDiff][results];
        results = results.split("");
        results.pop();
        results = results.join("");
        // console.log(results);
        if (!closerLook[emaVal][percDiff][results])
          closerLook[emaVal][percDiff][results] = [];
        closerLook[emaVal][percDiff][results] = [
          ...xy,
          ...closerLook[emaVal][percDiff][results],
        ];
        xy.forEach((emaEventData) => {
          let { x } = emaEventData;
          let day = new Date(x).toLocaleString().split(", ")[0];
          if (!timeGroupedEvents[day]) timeGroupedEvents[day] = [];
          timeGroupedEvents[day] = [...timeGroupedEvents[day], emaEventData];
        });
      }
    }
  }
  for (let ema in closerLook) {
    sortedCloserLook[ema] = Object.keys(closerLook[ema])
      .map((percDiff) => {
        let events = closerLook[ema][percDiff];
        let eventsCount = {};
        let totalEvents = 0;
        for (let fromToCodes in events) {
          totalEvents += events[fromToCodes].length;
          eventsCount[fromToCodes] = events[fromToCodes].length;
        }
        return { percDiff: +percDiff, eventsCount, totalEvents };
      })
      .sort((a, b) => b.totalEvents - a.totalEvents);
  }
  console.log(finalResults);
  timeGroupedEvents = Object.keys(timeGroupedEvents)
    .map((day) => {
      return { day, events: timeGroupedEvents[day] };
    })
    .sort(
      (a, b) =>
        new Date(b.day).toLocaleString().split(", ")[0] -
        new Date(a.day).toLocaleString().split(", ")[0]
    );

  return { closerLook, timeGroupedEvents, sortedCloserLook };

  /**
   * I can see some evidence that majority of the time
   * if it's going down or up, and hits 0% it will continue
   * in the same direction.
   */

  //TODO
  /**
      * final results object has some good insight
      * look at each ema value first
      * then, for each percDiff,
      * find how many times it happened going up, down, or mix.
      * 
      * EX:
      * ----------------
      * //Looking at results for when ema is 0% from price
        0:Object 
          //When going down we have 165+46+5+10 =  226
          $$  going down to go down, and go first down 165/226 = %73
          000:Array(165) [Object, Object, Object, …]
          $  going down  to go down, but at first goes up 46/226 = %20
          001:Array(46) [Object, Object, Object, …]
          ##total going down and ending down (165+46)/226 = 93%
          ##only sometimes does it go down then result in mix
          ## 15/226 = %6
          020:Array(5) [Object, Object, Object, …]
          021:Array(10) [Object, Object, Object, …]

        //When going up we have 74+93+13+13 =  193
        ##chance of continuing up is (74+93)/193 = %86
          110:Array(74) [Object, Object, Object, …]
          111:Array(93) [Object, Object, Object, …]
        ## (13+7) / 193  = %10 
          120:Array(13) [Object, Object, Object, …]
          121:Array(7) [Object, Object, Object, …]

        //When going mix we have 5+1+4+9+118+52 =  189
        ## mix to down (5+1) / 189 = %3 
          200:Array(5) [Object, Object, Object, …]
          201:Array(1) [Object]
          ##mix to up (4+9)/189 = %7
          210:Array(4) [Object, Object, Object, …]
          211:Array(9) [Object, Object, Object, …]
          mix to mix (118+52)/189=%90 
          220:Array(118) [Object, Object, Object, …]
          221:Array(52) [Object, Object, Object, …]
      *   
      * 
      * If its statistically enough, (over 70-80%?) then see the breakdown between
      * each outcome.  Example above has a fairly even amount for each up, down, mix
      *  total events = 193+226+189 = 608 
      *   up = 193 | down = 226 | mix  = 189
      * Then look for the most common goTo direction is
      *   up to up = 86% | down to down = 93% | Mix to mix = 189
      * 
      * 
      */
}

/**
 *
 * @param {array} diffFromPriceData percDiff and value from price
 * @param {number} EMAVal which EMA is being looked at
 * @param {array} OHLC_data OHLC array with timestamps
 */
function analyzeEMA(emaData, distanceFromPriceData, OHLC_data) {
  let finalResults = {};
  let filteredResults = {};
  for (let emaVal in emaData) {
    filteredResults[emaVal] = {};
    emaVal = +emaVal;
    // if(emaVal!=200)continue//DEBUGGING
    finalResults[emaVal] = {};
    console.log(`Evaluating ${emaVal}`);

    let diffFromPriceData = distanceFromPriceData[emaVal];

    let { percDiffCount, percDiffArray } = diffFromPriceData;

    //sooo, lets find percDiffs that occur less than 4% percAmount of the time
    //and sort them by percAmount, which is how often it occured
    let limit = 4;
    filteredResults[emaVal] = percDiffCount.sort(
      (a, b) => b.percAmount - a.percAmount
    );
    // .filter((data, i) => {
    //   let { percAmount, percDiff } = data;
    //   //   if()
    //   if (percAmount < limit) return data;
    // })
    console.log(filteredResults[emaVal]);

    //loop through this filtered, sorted array
    //use the percentDiff value, to search trough the
    //percDiffArray, and find times to then look up the
    //OHLC
    filteredResults[emaVal].forEach((data) => {
      let { percAmount, percDiff } = data;
      if (percAmount > limit) return;
      finalResults[emaVal][percDiff] = {};
      // console.log(
      //   `looking for times when the price was %${percDiff} away from the ${emaVal}EMA, which only happened %${percAmount} of the time.`
      // );
      //using the percDiffArray, look for the rare occurring percDiffs and get the timestamp
      let timesWhenPercDiff = percDiffArray.filter((percDiffTime) => {
        let { y } = percDiffTime;
        if (+y === +percDiff) return percDiffTime;
      });
      // console.log({timesWhenPercDiff})
      //loop through the times when these rare percDiffs happened
      //and then grab a window for analysis
      timesWhenPercDiff.forEach((xy) => {
        let cameFrom_goTo_firstGo = windowAssessment(
          xy,
          OHLC_data,
          percDiffArray,
          emaData,
          emaVal
        );
        // console.log({cameFrom_goTo_firstGo})
        if (cameFrom_goTo_firstGo === undefined) return;
        if (!finalResults[emaVal][percDiff][cameFrom_goTo_firstGo]) {
          finalResults[emaVal][percDiff][cameFrom_goTo_firstGo] = [];
        }

        finalResults[emaVal][percDiff][cameFrom_goTo_firstGo].push(xy);
      });
    });
  }
  // console.log({ finalResults });
  return { finalResults, filteredResults };
}

function windowAssessment({ x, y }, OHLC_data, percDiffArray, emaData, emaVal) {
  //x and y represent time and percDiff
  // console.log(`Percent diff ${y}`);
  //we dont really care about percDiff, just the time
  //we will look for this time in the OHLC data
  let windowLength = emaVal;
  // and grab a window view, +-10 bars?
  //to determine, where we came from and where we went...
  let timeIndex = OHLC_data.findIndex(({ timestamp }) => +timestamp === x);
  // slice the array
  if (timeIndex < windowLength || timeIndex + windowLength >= OHLC_data.length)
    return;
  // let window = OHLC_data.slice(
  //   timeIndex - windowLength,
  //   timeIndex + windowLength
  // );
  let percValuesWindow = percDiffArray.slice(
    timeIndex - windowLength / 2,
    timeIndex + windowLength / 2
  );
  emaDataWindow = windowEmaData({ ...emaData }, timeIndex, windowLength);
  //Make sure they are all on the same day
  if (!allDataSameDay(percValuesWindow)) return; //console.log("Not the same day");
  // console.log(window)
  // console.log("whereDidYouComeFromWhereDidYouGo");
  if (percValuesWindow.length != emaVal) {
    console.log("stop");
  }
  let { cameFrom, goTo, firstGo } = whereDidYouComeFromWhereDidYouGo(
    percValuesWindow,
    emaDataWindow,
    emaVal
  );
  return `${cameFrom}${goTo}${firstGo}`;
}

//TODO this should be more of a utility
/**
 *
 * @param {array} percValuesWindow array of data before and after rare price event
 * @param {object} emaData ema values, key is ema
 * @param {number} emaVal which ema looking at currently
 */
function whereDidYouComeFromWhereDidYouGo(percValuesWindow, emaData, emaVal) {
  let windowLength = percValuesWindow.length / 2;
  // console.log({windowLength, emaVal})
  let cameFrom = percValuesWindow.slice(0, windowLength);
  let goTo = percValuesWindow.slice(windowLength);

  // console.log({percValuesWindow})

  //check if the maxVal is pos or neg to indicate being above or below
  let firstGo = whereGoFirst([...goTo]);

  cameFrom = checkWhereCameFrom(cameFrom, emaData.cameFrom, emaVal);
  goTo = checkWhereGoTo(goTo, emaData.goTo, emaVal);
  // console.log({ firstGo });

  return { cameFrom, goTo, firstGo };
}

function whereGoFirst(data) {
  let whereGo = 0;
  let startPrice = data[0].price;
  //TODO this could be a loop to find best value
  let limit = 2; //just look at the first 4 days
  data.splice(limit);
  data.forEach((d) => {
    let { price } = d;
    let diff = price - startPrice;
    if (Math.abs(diff) > Math.abs(whereGo)) whereGo = diff;
  });
  if (whereGo > 0) whereGo = "1";
  else if (whereGo < 0) whereGo = "0";
  else whereGo = "0";

  return whereGo;
}

function checkWhereCameFrom(data, emaData, emaVal) {
  if (checkAllBelow(data, emaData, emaVal)) {
    // console.log("Came from a down trend");
    return "0";
  } else if (checkAllAbove(data, emaData, emaVal)) {
    // console.log("Came from an up trend");
    return "1";
  } else {
    // console.log("Came from a mix bag");
    return "2";
  }
}

function checkWhereGoTo(data, emaData, emaVal) {
  if (checkAllBelow(data, emaData, emaVal)) {
    // console.log("Go to a down trend");
    return "0";
  } else if (checkAllAbove(data, emaData, emaVal)) {
    // console.log("Go to an up trend");
    return "1";
  } else {
    // console.log("Go to a mix bag");
    return "2";
  }
}

function windowEmaData(emaData, timeIndex, windowLength) {
  let windowedEmaData = { cameFrom: {}, goTo: {} };
  Object.keys(emaData).forEach((emaVal) => {
    let window = emaData[emaVal].slice(
      timeIndex - windowLength / 2,
      timeIndex + windowLength / 2
    );

    windowedEmaData.cameFrom[emaVal] = window.slice(0, windowLength / 2);
    windowedEmaData.goTo[emaVal] = window.slice(windowLength / 2);
  });
  return windowedEmaData;
}

function allDataSameDay(data) {
  let sameDay = true;
  let day = new Date(data[0].x).getDay();

  data.forEach((d) => {
    if (new Date(d.x).getDay() !== day) sameDay = false;
  });
  return sameDay;
}

function checkAllBelow(data, emaData, emaVal) {
  // let maxValuesBelow = true;
  let emaValuesBelow = true; //20 below 50, 50 below 200
  //check if the maxVal seen was ever positive (above the MA)
  //This should be MOSTLY, not strictly?
  // data.map((d) => {
  //   if (d.maxVal > 0) maxValuesBelow = false;
  // });
  //check if the ema show down
  for (let ema in emaData) {
    ema = +ema;
    if (ema === emaVal) continue;
    if (ema > emaVal) {
      emaData[ema].forEach((d, i) => {
        let _ema = ema;
        let _emaData = emaData;
        // console.log({i, ema, emaVal})
        // console.log(data[i])
        // console.log(data)
        if (!data[i]) {
          console.log("SHIT");
        }
        if (d.y < data[i].MAval) emaValuesBelow = false;
      });
    } else if (ema < emaVal) {
      emaData[ema].forEach((d, i) => {
        if (d.y > data[i].MAval) emaValuesBelow = false;
      });
    }
  }
  return emaValuesBelow;
  // return { maxValuesBelow, emaValuesBelow };
}
function checkAllAbove(data, emaData, emaVal) {
  // let maxValuesAbove = true;
  // data.map((d) => {
  //   if (d.maxVal < 0) maxValuesAbove = false;
  // });
  let emaValuesAbove = true;
  //check if the ema show down
  for (let ema in emaData) {
    ema = +ema;
    if (ema === emaVal) continue;
    if (ema > emaVal) {
      emaData[ema].map((d, i) => {
        if (d.y > data[i].MAval) emaValuesAbove = false;
      });
    } else if (ema < emaVal) {
      emaData[ema].map((d, i) => {
        if (d.y < data[i].MAval) emaValuesAbove = false;
      });
    }
  }
  return emaValuesAbove;
  // return { maxValuesAbove, emaValuesAbove };
}
