// const { lstat } = require("fs/promises");
const tulind = require("tulind")
const talib = require("../node_modules/talib/build/Release/talib")

const { average, windowAvg } = require("./indicatorHelpers/MovingAverage.js")
let stochasticPeriods = [5, 14, 24, 50, 100]
let indicatorName = "stochastics"
const STOCH_PERIOD = 4
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
}

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
    return "oversold"
  } else if (dir === 2) {
    return "overbought"
  } else if (dir === 3) {
    return "being bought"
  } else if (dir === 4) {
    return "being sold"
  } else return null
}

function checkMultiPeriodStoch(data, symbol, TF) {
  let d = data[TF].slice(-1)[0]
  let results = evalMultiPeriodStoch(d)
  if (!results) return
  let fastDir = results.fastDir
  let slowDir = results.slowDir
  if (!fastDir || !slowDir) {
    console.log("db")
  }
  if (slowDir === "middle") {
    if (fastDir === "goLong") {
      return "Buy"
    } else if (fastDir === "goShort") {
      return "Sell"
    }
  } else {
    if (slowDir === "goLong") {
      return "Buy"
    } else if (slowDir === "goShort") {
      return "Sell"
    }
  }

  function evalMultiPeriodStoch(d) {
    if (
      !d.stochastics ||
      !d.stochastics.K ||
      !d.stochastics.D ||
      !d.stochastics["14"]
    )
      return

    let { K, D } = d.stochastics
    let fity = d.stochastics["50"]

    let fastDir = getFastDir(K, D)
    if (!fastDir) {
      console.log("wtf")
    }

    let slowDir = fity >= 95 ? "goLong" : fity <= 5 ? "goShort" : "middle"

    return { fastDir, slowDir }

    function getFastDir(K, D) {
      if (D >= 95 && K >= 95) {
        return "goLong" //2
      } else if (80 < K && 80 > D) {
        return "exitLong" //1
      } else if (20 > K && 20 < D) {
        return "exitShort" //1
      } else if (5 >= K && 5 >= D) {
        return "goShort" //1
      } else if (K >= 75 && D >= 30 && D <= 70) {
        return "goLong" //3
      } else if (K <= 25 && D >= 30 && D <= 70) {
        return "goShort" //4
      } else {
        return "middle" //5;
      }
    }
  }
}

function prevCurrentStoch(data) {
  if (!data) {
    return console.log("no data?")
  }
  let prev = data.slice(-3)[0]
  let curr = data.slice(-2)[0]
  let rightMeow = data.slice(-1)[0]
  // let prevStoch = evalStoch(prev);
  // let currStoch = evalStoch(curr);

  //check if prev was above 80 or below 20
  //check if k is above or below d
  let dir = evalStoch(prev, curr, rightMeow)

  // let { symbol, timeframe } = curr;
  // console.log({ prevStoch, currStoch });
  // let dir;
  // if (prevStoch === "oversold" && currStoch === "oversold") {
  // 	dir = "oversold"; //"oversold";sell
  // } else if (prevStoch === "overbought" && currStoch === "overbought") {
  // 	dir = "overbought"; //"overbought"; buy
  // } else if (prevStoch === "exitShort" && currStoch === "exitShort") {
  // 	dir = "being bought"; //"reverse up";exit sell
  // } else if (prevStoch === "exitLong" && currStoch === "exitLong") {
  // 	dir = "being sold"; //"reverse down"; exit buy
  // } else {
  // 	dir = null; //"middle";
  // }

  // let tradeDecision = decide({ dir });
  return dir
}

/**
 *
 * @param {Object} data Contains stochastic data
 * returns overBought, overSold, exitLong, exitShort, middle
 */
function evalStoch(prev, curr, meow) {
  if (
    prev.stochastics === undefined ||
    prev.stochastics.K === undefined ||
    prev.stochastics.D === undefined ||
    curr.stochastics === undefined ||
    curr.stochastics.K === undefined ||
    curr.stochastics.D === undefined ||
    meow.stochastics === undefined ||
    meow.stochastics.K === undefined ||
    meow.stochastics.D === undefined
  )
    return

  var { K, D } = prev.stochastics

  let prevDir =
    D >= 85 && K >= 85
      ? "overbought" //2
      : K <= 15 && D <= 15
      ? "oversold" //1
      : "middle" //5;
  if (prevDir == "middle") return "middle"
  var { K, D } = curr.stochastics
  let meowState = getStochState(meow)

  let currDir =
    K < D && K < 80 && prevDir == "overbought" && meowState !== "up"
      ? "overbought"
      : K > D && K > 20 && prevDir == "oversold" && meowState !== "down"
      ? "oversold"
      : "middle"

  if (!currDir) {
    console.log("dbug")
  }
  return currDir
}

function getStochState(data) {
  var { K, D } = data.stochastics

  let currDir =
    K >= 80 && D > 70 && K > D
      ? "up"
      : K <= 20 && D < 30 && K < D
      ? "down" //1
      : "middle" //5;

  if (!currDir) {
    console.log("dbug")
  }
  return currDir
}

async function addNewestStochastics({ high, low, close, data }) {
  let latestData = data.slice(-1)[0]
  if (!data || !latestData) {
    throw new Error("NO DATA")
  }

  if (!latestData[indicatorName]) latestData[indicatorName] = {}
  // let fastKAvg = 14;
  // let slowKAvg = 3;
  let [stoch_k, stoch_d] = await tulind.indicators.stoch.indicator(
    [high, low, close],
    [STOCH_PERIOD, STOCK_K, STOCK_D]
  )
  latestData[indicatorName] = {
    K: stoch_k.slice(-1)[0],
    D: stoch_d.slice(-1)[0],
  }

  return data
}
async function stochasticsAnalysis(data) {
  let {
    tickMinutes,
    dailyData,
    fiveMinData,
    fifteenMinData,
    thirtyMinData,
    hourlyData,
  } = data

  tickMinutes = addStochastics(tickMinutes)
  fiveMinData = addStochastics(fiveMinData)
  fifteenMinData = addStochastics(fifteenMinData)
  thirtyMinData = addStochastics(thirtyMinData)
  hourlyData = addStochastics(hourlyData)
  dailyData = addStochastics(dailyData)

  return {
    tickMinutes,
    dailyData,
    fiveMinData,
    fifteenMinData,
    thirtyMinData,
    hourlyData,
  }
}

async function addStochastics({ data, open, high, low, close, volume }) {
  var {
    result: { outSlowK, outSlowD },
  } = talib.execute({
    startIdx: 0,
    endIdx: close.length - 1,
    name: "STOCH",
    high,
    low,
    close,
    optInFastK_Period: STOCH_PERIOD,
    optInSlowK_Period: STOCK_K,
    optInSlowK_MAType: 0,
    optInSlowD_Period: STOCK_D,
    optInSlowD_MAType: 0,
  })

  let diff = data.length - outSlowD.length

  for (let i = diff; i < data.length; i++) {
    let dataIndex = i - diff
    if (!data[i][indicatorName]) {
      data[i][indicatorName] = {}
    }
    data[i][indicatorName] = { K: outSlowK[dataIndex], D: outSlowD[dataIndex] }
  }

  return data
}

function calcStochastics(window) {
  let lowest = 999999999
  let highest = 0
  let close = window.slice(-1)[0].close

  window.forEach(({ low, high }) => {
    if (low < lowest) lowest = low
    if (high > highest) highest = high
  })
  let stochastic =
    highest === lowest
      ? 1
      : parseFloat(((close - lowest) / (highest - lowest)) * 100)
  return parseFloat(stochastic.toFixed(1))
}
