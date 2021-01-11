const { lstat } = require('fs/promises');
const tulind = require('tulind');

const { average, windowAvg } = require("./indicatorHelpers/MovingAverage.js");
let stochasticPeriods = [14, 24, 50, 100];
let indicatorName = "stochastics";
const STOCH_PERIOD = 14
const STOCK_K = 3
const STOCK_D = 3

module.exports = {
  STOCH_PERIOD,
  stochasticsAnalysis,
  stochasticPeriods,
  calcStochastics,
  addStochastics,
  addNewestStochastics,
  prevCurrentStoch,
  evalStoch,
  checkMultiPeriodStoch,
};

console.log(tulind.indicators)

function decide({ dir }) {
  /**
   * dir          
   * 1 sell  
   * 2 buy   
   * 3 exit sell
   * 4 exit buy
   * 5 middle     
   */

  if (dir === 1) {
    return "oversold";
  } else if (dir === 2) {
    return "overbought";
  } else if (dir === 3) {
    return "being bought";
  } else if (dir === 4) {
    return "being sold";
  } else return null;
}

function checkMultiPeriodStoch(data, symbol, TF) {
  let d = data[TF].slice(-1)[0];
  let results = evalMultiPeriodStoch(d);
  if (!results) return;
  let fastDir = results.fastDir;
  let slowDir = results.slowDir;
  if (!fastDir || !slowDir) {
    console.log("db");
  }
  if (slowDir === "middle") {
    if (fastDir === "goLong") {
      return "Buy";
    } else if (fastDir === "goShort") {
      return "Sell";
    }
  } else {
    if (slowDir === "goLong") {
      return "Buy";
    } else if (slowDir === "goShort") {
      return "Sell";
    }
  }

  function evalMultiPeriodStoch(d) {
    if (
      !d.stochastics ||
      !d.stochastics.K ||
      !d.stochastics.D ||
      !d.stochastics["50"]
    )
      return;

    let { K, D } = d.stochastics;
    let fity = d.stochastics["50"];

    let fastDir = getFastDir(K, D);
    if (!fastDir) {
      console.log("wtf");
    }

    let slowDir = fity >= 95 ? "goLong" : fity <= 5 ? "goShort" : "middle";

    return { fastDir, slowDir };

    function getFastDir(K, D) {
      if (D >= 95 && K >= 95) {
        return "goLong"; //2
      } else if (80 < K && 80 > D) {
        return "exitLong"; //1
      }
      else if (20 > K && 20 < D) {
        return "exitShort"; //1
      }
      else if (5 >= K && 5 >= D) {
        return "goShort"; //1
      }
       else if (K >= 75 && D >= 30 && D <= 70) {
        return "goLong"; //3
      } else if (K <= 25 && D >= 30 && D <= 70) {
        return "goShort"; //4
      } else {
        return "middle"; //5;
      }
    }
  }
}

function prevCurrentStoch(data) {
  let prev = data.slice(-2)[0];
  let curr = data.slice(-1)[0];
  let prevStoch = evalStoch(prev);
  let currStoch = evalStoch(curr);
  let { symbol, timeframe } = curr;
  let dir;
  if (prevStoch === "oversold" && currStoch === "oversold") {
    dir = 'oversold'; //"oversold";sell
  } else if (prevStoch === "overbought" && currStoch === "overbought") {
    dir = 'overbought'; //"overbought"; buy
  } else if (prevStoch === "exitShort" && currStoch === "exitShort") {
    dir = 'being bought'; //"reverse up";exit sell
  } else if (prevStoch === "exitLong" && currStoch === "exitLong") {
    dir = 'being sold'; //"reverse down"; exit buy
  } else {
    dir = null; //"middle";
  }

  // let tradeDecision = decide({ dir });
  return dir;
}

/**
 * 
 * @param {Object} data Contains stochastic data
 * returns overBought, overSold, exitLong, exitShort, middle
 */
function evalStoch(data) {
  if (!data.stochastics || !data.stochastics.K || !data.stochastics.D) return;

  let { K, D } = data.stochastics;
  if ((!K && K !== 0) || (!D && D !== 0)) {
    throw new Error(`Undefined K ${K} or D ${D}`);
  }
  let dir =
    D > 75 && K > 75
      ? "overbought" //2
      : 25 > K && 25 > D
      ? "oversold" //1
      : K > 25 && D < 20
      ? "exitShort" //3
      : K < 75 && D > 80
      ? "exitLong" //4
      : "middle"; //5;

  if (!dir) {
    console.log("dbug");
  }
  return dir;
}

async function addNewestStochastics({high, low, close, data}) {
  
  let latestData = data.slice(-1)[0];
  if (!data || !latestData) {
    throw new Error("NO DATA");
  }

  if(!latestData[indicatorName])latestData[indicatorName] = {};
  // let fastKAvg = 14;
  // let slowKAvg = 3;
  let [stoch_k, stoch_d] = await tulind.indicators.stoch.indicator([high, low, close], [STOCH_PERIOD, STOCK_K, STOCK_D])
  latestData[indicatorName] = {K:stoch_k.slice(-1)[0], D:stoch_d.slice(-1)[0] }
  

  return data;
}
async function stochasticsAnalysis(data) {
  let {
    tickMinutes,
    dailyData,
    fiveMinData,
    fifteenMinData,
    thirtyMinData,
    hourlyData,
  } = data;


  tickMinutes = addStochastics(tickMinutes);
  fiveMinData = addStochastics(fiveMinData);
  fifteenMinData = addStochastics(fifteenMinData);
  thirtyMinData = addStochastics(thirtyMinData);
  hourlyData = addStochastics(hourlyData);
  dailyData = addStochastics(dailyData);

  return {
    tickMinutes,
    dailyData,
    fiveMinData,
    fifteenMinData,
    thirtyMinData,
    hourlyData,
  };
}

async function addStochastics({data, open, high, low, close, volume}) {
  let dataLength = data.length;
  console.log(`Running stochastics on ${data.length} bars`);

  // stochasticPeriods.forEach(period=>{

    let [stoch_k, stoch_d] = await tulind.indicators.stoch.indicator([high, low, close], [STOCH_PERIOD, STOCK_K, STOCK_D])
    for(let i = 0; i < stoch_k.length; i++){
      let dataIndex = i+((STOCH_PERIOD+STOCK_D+STOCK_K)-3)
      if(!data[dataIndex][indicatorName]){
        data[dataIndex][indicatorName]={}
      }
      data[dataIndex][indicatorName] ={K:stoch_k[i], D:stoch_d[i]}
    }
  // })



  // data.forEach((d, dIndex) => {
  //   d[indicatorName] = {};
  //   stochasticPeriods.forEach((period, pIndex) => {
  //     //i.e index 4 i want to run period = 5
  //     if (dIndex < period - 1) return;
  //     let end = dIndex + 1;
  //     let start = end - period;
  //     if (end > dataLength) {
  //       return { end, dataLength };
  //     }
  //     let window = data.slice(start, end);
  //     //calc CCI
  //     let stochastics = calcStochastics(window);
  //     d = {
  //       ...d,
  //       [indicatorName]: {
  //         ...d[indicatorName],
  //         [`${period}`]: stochastics,
  //       },
  //     };
  //     data[dIndex] = d;
  //   });
  // });

  //add K, and D?
  //TODO make dynamic
  // let fastKAvg = 14;
  // let slowKAvg = 3;
  // let allK = data.map((d) => {
  //   return { timestamp: d.timestamp, K: d[indicatorName][fastKAvg] };
  // });
  // let slowK = windowAvg(allK, slowKAvg, "K");

  // slowK.forEach((sk, iSk) => {
  //   let d = data[iSk + (slowKAvg - 1)];
  //   let K = allK[iSk + (slowKAvg - 1)];
  //   if (
  //     (!K.K && isNaN(K.K)) ||
  //     (!sk[`K${slowKAvg}Avg`] && isNaN(sk[`K${slowKAvg}Avg`]))
  //   )
  //     return;
  //   //timestamps SHOULD match up
  //   if (d.timestamp !== sk.timestamp && d.timestamp !== K.timestamp) {
  //     return console.log("The time stamps dont match up");
  //   }
  //   d[indicatorName].K = K.K;
  //   d[indicatorName].D = sk[`K${slowKAvg}Avg`];
  // });

  return data;
}

function calcStochastics(window) {
  let lowest = 999999999;
  let highest = 0;
  let close = window.slice(-1)[0].close;

  window.forEach(({ low, high }) => {
    if (low < lowest) lowest = low;
    if (high > highest) highest = high;
  });
  let stochastic =
    highest === lowest
      ? 1
      : parseFloat(((close - lowest) / (highest - lowest)) * 100);
  return parseFloat(stochastic.toFixed(1));
}
