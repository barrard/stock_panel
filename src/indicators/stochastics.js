const { average, windowAvg } = require("./indicatorHelpers/MovingAverage.js");
let stochasticPeriods = [14, 24, 50, 100];
let indicatorName = "stochastics";

module.exports = {
  stochasticsAnalysis,
  stochasticPeriods,
  calcStochastics,
  addStochastics,
  addNewestStochastics, 
  prevCurrentStoch
};

function prevCurrentStoch(data) {
  let prev = data.slice(-2)[0] 
  let curr = data.slice(-1)[0]
  let prevStoch = evalStoch(prev);
  let currStoch = evalStoch(curr);
  let {symbol, timeframe} = curr
  let dir
  if (prevStoch === "oversold" && currStoch === "oversold") {
    dir = "oversold";
  } else if (prevStoch === "overbought" && currStoch === "overbought") {
    dir = "overbought";
  } else if (prevStoch === "oversold" && currStoch === "being bought") {
    dir = "reverse up";
  } else if (prevStoch === "overbought" && currStoch === "being sold") {
    dir = "reverse down";
  } else {
    dir = "middle";
  }
  let cond = evalStoch(curr)
  if(!cond){
    console.log('wtf')
    cond = 'middle'
  }
  console.log(`----STOCH ${symbol} ${timeframe} ${dir} ${cond}`)

}
function evalStoch(data) {
  if (!data.stochastics || !data.stochastics.K || !data.stochastics.D) return;

  let { K, D } = data.stochastics;
  if ((!K && K!==0) || (!D && D!==0)) {
    throw new Error(`Undefined K ${K} or D ${D}`);
  }
  let dir =
    D > 80 && K > 80
      ? "overbought"
      : 20 > K && 20 > D
      ? "oversold"
      : K > 20 && D < 20
      ? "being bought"
      : K < 80 && D > 80
      ? "being sold"
      : "middle";

      if(!dir){
        console.log('dbug')
      }
  return dir;
}


function addNewestStochastics(data) {
  let { timeframe } = data[0];
  // if (timeframe === "5Min") {
  //   console.log("dbug");
  // }
  let latestData = data.slice(-1)[0];
    if(!data||!latestData){
      throw new Error('NO DATA')
    }

  latestData[indicatorName] = {};
  let fastKAvg = 14;
  let slowKAvg = 3;

  stochasticPeriods.forEach((period) => {
    if (data.length < period) return;
    let window = data.slice(-period);
    // console.log(window)
    let stochastics = calcStochastics(window);
    // if (!stochastics) {
    //   console.log("dbug");
    // }
    latestData[indicatorName][period] = stochastics;
    if (period === fastKAvg) {
      latestData[indicatorName]["K"] = stochastics;
      let allK = [];
      window.slice(-slowKAvg).forEach((d) => {
        let K = d[indicatorName][fastKAvg] 
        if (!K && isNaN(K)) return;
        allK.push({ timestamp: d.timestamp, K: K });
      });
      if(allK.length < slowKAvg)return
      let slowK = windowAvg(allK, slowKAvg, "K");
      if (!slowK.length) {
        return;
      }
      // console.log(slowK[0][`K${slowKAvg}Avg`]);
      // console.log(isNaN(slowK[0][`K${slowKAvg}Avg`]));
      // if (isNaN(slowK[0][`K${slowKAvg}Avg`])) {
      //   console.log("dbug");
      // }
      latestData[indicatorName]["D"] = slowK[0][`K${slowKAvg}Avg`];
    }
  });

  // console.log(data)
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

  // OHLC_data = OHLC_data.slice(-3000)//TODO hmmm?
  //always ensure data is low to high
  //  data = data.sort((a,b)=>a.timestamp-b.timestamp)
  //get data
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

function addStochastics(data) {
  let dataLength = data.length;
  console.log(`Running stochastics on ${data.length} bars`);

  data.forEach((d, dIndex) => {
    d[indicatorName] = {};
    stochasticPeriods.forEach((period, pIndex) => {
      //i.e index 4 i want to run period = 5
      if (dIndex < period - 1) return;
      let end = dIndex + 1;
      let start = end - period;
      if (end > dataLength) {
        return { end, dataLength };
      }
      let window = data.slice(start, end);
      //calc CCI
      let stochastics = calcStochastics(window);
      d = {
        ...d,
        [indicatorName]: {
          ...d[indicatorName],
          [`${period}`]: stochastics,
        },
      };
      data[dIndex] = d;
      // console.log(d)
    });
  });

  //add K, and D?
  //TODO make dynamic
  let fastKAvg = 14;
  let slowKAvg = 3;
  let allK = data.map((d) => {
    return { timestamp: d.timestamp, K: d[indicatorName][fastKAvg] };
  });
  let slowK = windowAvg(allK, slowKAvg, "K");

  slowK.forEach((sk, iSk) => {
    let d = data[iSk + (slowKAvg - 1)];
    let K = allK[iSk + (slowKAvg - 1)];
    if (!K.K && isNaN(K.K) || !sk[`K${slowKAvg}Avg`] && isNaN(sk[`K${slowKAvg}Avg`])) return;
    //timestamps SHOULD match up
    if (d.timestamp !== sk.timestamp && d.timestamp !== K.timestamp) {
      return console.log("The time stamps dont match up");
    }
    d[indicatorName].K = K.K;
    d[indicatorName].D = sk[`K${slowKAvg}Avg`];
  });

  return data;
}

function calcStochastics(window) {
  // console.log(window);
  let lowest = 999999999;
  let highest = 0;
  let close = window.slice(-1)[0].close;
  // let symbol = window[0].symbol
  // if(symbol === 'ES'){
  //   console.log('debug')
  // }
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

