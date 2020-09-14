const { getEMA_Trend, emaPriceCheck, emaProximityCheck } = require("../EMA.js");
const { momoTrend } = require("../momentum.js");
const { proximity, tls } = require("./utils.js");
module.exports = {
  evalEMA,
  evalVWAP,
  evalATR,
  evalMomoTrend,
  analyzeIndicatorState,
  evalStoch,
  evalBB,
  evalCCI,
  evalRSI,
  evalSuperTrend,
  prevCurrentRSI,
  prevCurrentBB,
};

function analyzeIndicatorState(currentBar, data) {
  // console.log(data.slice[0]);
  // console.log(currentBar);
  let { close, timeframe, timestamp } = currentBar;
  let dataIndex = data.findIndex((d) => d.timestamp === currentBar.timestamp);
  let prevData = data[dataIndex - 1];
  if (!prevData || !currentBar) {
    return;
  }
  //RSI
  let RSI_state = prevCurrentRSI(prevData, currentBar);
  //BB
  let BB_state = prevCurrentBB(prevData, currentBar);
  //EMA
  let EMA_state = prevCurrentEMA(prevData, currentBar);
  //superTrend
  let superTrendState = prevCurrentSuperTrend(prevData, currentBar);
  //CCI
  let CCI_State = prevCurrentCCI(prevData, currentBar);
  //Stochastics
  let stochState = prevCurrentStoch(prevData, currentBar);
  //VWAP
  let VWAP_state = prevCurrentVWAP(prevData, currentBar);
  //MOMO
  let momoState = prevCurrentMomo(prevData, currentBar);
  //TODO MomoStrength
  //ATR
  let ATR_State = prevCurrentATR(prevData, currentBar);

  let allIndicatorStates = [
    RSI_state,
    BB_state,
    CCI_State,
    stochState,
    momoState,
    // ATR_State,
    VWAP_state,
    EMA_state,
    superTrendState,
  ];
  let indicatorsUp = allIndicatorStates.filter((i) => i === "up");
  let indicatorsDown = allIndicatorStates.filter((i) => i === "down");
  let indicatorsInvalid = allIndicatorStates.filter((i) => !i);
  if (indicatorsInvalid.length)
    return console.log(`${timeframe} invalid indicators`);
  console.log(
    `${timeframe} price ${close} at ${tls(timestamp)} is seen as ${
      indicatorsUp.length
    } up and ${indicatorsDown.length} down`
  );
  if (indicatorsUp.length >= 4) {
    return "up";
  } else if (indicatorsDown.length >= 4) {
    return "down";
  }else {
    return 'middle'
  }
}

function prevCurrentSuperTrend(prev, curr) {
  let prevST = evalSuperTrend(prev);
  let currST = evalSuperTrend(curr);
  if (prevST === "down" && currST === "down") {
    return "down";
  } else if (prevST === "up" && currST === "up") {
    return "up";
  } else if (prevST === "down" && currST === "up") {
    return "reverse up";
  } else if (prevST === "up" && currST === "down") {
    return "reverse down";
  }
}

function evalSuperTrend(data) {
  if (!data.superTrend) return;

  let { superTrend, close } = data;
  superTrend = superTrend.superTrend;
  if (close < superTrend) {
    return "down";
  } else if (close > superTrend) {
    return "up";
  } else {
    return "middle";
  }
}

function prevCurrentRSI(prev, curr) {
  //RSI measures overbought (>70)
  //  and oversold (<30)
  if (!prev.RSI || !prev.RSI["14"]) return;
  if (!curr.RSI || !curr.RSI["14"]) return;
  let prevRSI = prev.RSI["14"];
  let currRSI = curr.RSI["14"];

  let oversold = 30;
  let overbought = 70;

  if (prevRSI <= oversold && currRSI <= oversold) {
    return "oversold";
  } else if (prevRSI >= overbought && currRSI >= overbought) {
    return "overbought";
  } else if (prevRSI >= overbought && currRSI <= overbought) {
    return "leaving overbought";
  } else if (prevRSI <= overbought && currRSI >= overbought) {
    return "entering overbought";
  } else if (prevRSI >= oversold && currRSI <= oversold) {
    return "entering oversold";
  } else if (prevRSI <= oversold && currRSI >= oversold) {
    return "leaving overbought";
  } else {
    return "middle";
  }
}

function evalRSI(data) {
  if (!data.RSI || !data.RSI["14"]) return;
  let RSI = data.RSI["14"];
  if (RSI <= 30) {
    return "down";
  } else if (RSI >= 70) {
    return "up";
  } else {
    return "middle";
  }
}

function prevCurrentCCI(prev, curr) {
  let prevCCI = evalCCI(prev);
  let currCCI = evalCCI(curr);

  if (prevCCI === "down" && currCCI === "down") {
    return "down";
  } else if (prevCCI === "up" && currCCI === "up") {
    return "up";
  } else if (prevCCI === "down" && currCCI === "up") {
    return "reverse up";
  } else if (prevCCI === "up" && currCCI === "down") {
    return "reverse down";
  } else if (prevCCI === "middle" && currCCI === "down") {
    return "reverse down";
  } else if (prevCCI === "up" && currCCI === "down") {
    return "reverse down";
  } else if (prevCCI === "up" && currCCI === "down") {
    return "reverse down";
  } else {
    return "middle";
  }
}
function evalCCI(data) {
  if (!data.CCI || !data.CCI["14"]) return;

  let CCI = data.CCI["14"];
  if (CCI <= -90) {
    return "down";
  } else if (CCI >= 90) {
    return "up";
  } else {
    return "middle";
  }
}

function prevCurrentBB(prev, curr) {
  //if trending, close will hang out on the upper/lower banc
  let prevProximity = evalBB_Proximity(prev);
  let currProximity = evalBB_Proximity(curr);

  let ctlb = "close to lower band";
  let blb = "below lower band";
  let ctub = "close to upper band";
  let aub = "above upper band";
  let ctsma = "close to SMA";
  let am = "above middle";
  let bm = "below middle";

  //bearish combo
  if (
    (prevProximity === ctub && currProximity !== aub) ||
    (prevProximity === ctlb && currProximity === blb) ||
    (prevProximity === aub && currProximity === ctub) ||
    (prevProximity === blb && currProximity === blb) ||
    (prevProximity === bm && currProximity === ctsma)
  ) {
    return "down";
  }
  //bullish combo
  else if (
    (prevProximity === ctlb && currProximity !== blb) ||
    (prevProximity === ctub && currProximity === aub) ||
    (prevProximity === blb && currProximity === ctlb) ||
    (prevProximity === aub && currProximity === aub) ||
    (prevProximity === am && currProximity === ctsma)
  ) {
    return "up";
  }
  //range combo
  else {
    return "middle";
  }
}
function evalBB_Proximity(data) {
  if (!data.BB || !data.BB.lower || !data.BB.upper || !data.BB.middle)
    return "not enough data";

  const PROX_LIMIT = 0.005;
  let { BB, close } = data;
  let { upper, lower, middle } = BB;

  let lowerProximity = proximity(close, lower);
  let upperProximity = proximity(close, upper);
  let middleProximity = proximity(close, middle);

  if (lowerProximity < PROX_LIMIT) {
    return "close to lower band";
  } else if (close < lower) {
    return "below lower band";
  } else if (upperProximity < PROX_LIMIT) {
    return "close to upper band";
  } else if (close > upper) {
    return "above upper band";
  } else if (middleProximity < PROX_LIMIT) {
    return "close to SMA";
  } else if (close > middle) {
    return "above middle";
  } else if (close < middle) {
    return "below middle";
  }
}

function evalBB(data) {
  if (!data.BB || !data.BB.lower || !data.BB.upper) return;

  let { BB, close } = data;
  let { upper, lower } = BB;
  if (close < lower) {
    return "down";
  } else if (close > upper) {
    return "up";
  } else {
    return "middle";
  }
}

function prevCurrentStoch(prev, curr) {
  let prevStoch = evalStoch(prev);
  let currStoch = evalStoch(curr);
  // console.log({prevStoch,
  //   currStoch})
  if (prevStoch === "down" && currStoch === "down") {
    return "down";
  } else if (prevStoch === "up" && currStoch === "up") {
    return "up";
  } else if (prevStoch === "down" && currStoch === "up") {
    return "reverse up";
  } else if (prevStoch === "up" && currStoch === "down") {
    return "reverse down";
  } else if (prevStoch === "middle" && currStoch === "down") {
    return "reverse down";
  } else if (prevStoch === "up" && currStoch === "down") {
    return "reverse down";
  } else if (prevStoch === "up" && currStoch === "down") {
    return "reverse down";
  } else {
    return "middle";
  }
}
function evalStoch(data) {
  if (!data.stochastics || !data.stochastics.K || !data.stochastics.D) return;

  let { K, D } = data.stochastics;
  if (!K || !D) {
    throw new Error(`Undefined K ${K} or D ${D}`);
  }
  let dir =
    D > 80 && K > 80
      ? "up"
      : 20 > K && 20 > D
      ? "down"
      : K > 20 && D < 20
      ? "up"
      : K < 80 && D > 80
      ? "down"
      : "middle";

  return dir;
}

function prevCurrentEMA(prevData, currentBar) {
  let prevEmaState = evalEMA(prevData);
  let currEmaState = evalEMA(currentBar);
  // console.log({ prevEmaState, currEmaState });
  if (prevEmaState === "up" && currEmaState === "up") {
    return "EMA pointing up";
  } else if (prevEmaState === "down" && currEmaState === "down") {
    return "EMA pointing down";
  } else if (prevEmaState === "down" && currEmaState === "up") {
    return "EMA switched to up";
  } else if (prevEmaState === "up" && currEmaState === "down") {
    return "EMA switched to down";
  } else {
    return "middle";
  }
}

function evalEMA(data) {
  if (!data.ema) return;

  let trend = getEMA_Trend(data);

  let priceCheck = emaPriceCheck(data);

  let proximityCheck = emaProximityCheck(data);

  // console.log({ priceCheck, proximityCheck });
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

function prevCurrentVWAP(prev, curr) {
  let prevVWAP = evalVWAP(prev);
  let currVWAP = evalVWAP(curr);
  // console.log({prevVWAP, currVWAP})
  if (prevVWAP === "up" && currVWAP === "up") {
    return "up";
  } else if (prevVWAP === "down" && currVWAP === "down") {
    return "down";
  } else if (prevVWAP === "down" && currVWAP === "up") {
    return "revered up";
  } else if (prevVWAP === "up" && currVWAP === "down") {
    return "revered down";
  }
}

function evalVWAP(data) {
  if (!data.VWAP) return;

  let { VWAP } = data.VWAP;
  let close = data.close;
  return VWAP > close ? "up" : "down";
}

function prevCurrentATR(prev, curr) {
  let prevATR = evalATR(prev);
  let currATR = evalATR(curr);

  if (prevATR === "consolidate" && currATR === "consolidate") {
    return "consolidate";
  } else if (prevATR === "expand" && currATR === "expand") {
    return "expand";
  } else if (prevATR === "avg" && currATR === "avg") {
    return "avg";
  }
}
function evalATR(data) {
  if (!data.ATR || !data.tradingRange) return;

  let { ATR, tradingRange } = data;
  if (tradingRange < ATR / 2) {
    return "consolidate";
  } else if (tradingRange > ATR * 1.5) {
    return "expand";
  } else "avg";
}

function prevCurrentMomo(prev, curr) {
  let prevMomoTrend = evalMomoTrend(prev);
  let currMomoTrend = evalMomoTrend(curr);
  let prevSmallerTrend = prevMomoTrend.smallerTrend;
  let prevBiggerTrend = prevMomoTrend.biggerTrend;
  let currSmallerTrend = currMomoTrend.smallerTrend;
  let currBiggerTrend = currMomoTrend.biggerTrend;
  if (prevSmallerTrend === "up" && currSmallerTrend === "up") {
    return "up";
  } else if (prevSmallerTrend === "down" && currSmallerTrend === "down") {
    return "down";
  } else if (prevSmallerTrend === "middle" && currSmallerTrend === "middle") {
    return "middle";
  } else {
    return "middle";
  }
}

function evalMomoTrend(data) {
  if (!data.momentum) return;

  let { biggerTrend, smallerTrend } = momoTrend(data);
  return { biggerTrend, smallerTrend };
}
