const { sum, mean, median, deviation, max, min, extent } = require("d3-array");

const getClose = (d) => +d.close;
const getOpen = (d) => +d.open;
const getHigh = (d) => +d.high;
const getLow = (d) => +d.low;
const getVolume = (d) => +d.volume;
const getTimestamp = (d) => +d.timestamp;

module.exports = {
  findDeviation,
  windowAvg,
  rateOfChange,
  exceedsDeviationLimit,
  SMA,
  windowEMA,
  average,
  makeEMA,
  meanDeviation,
  findMax,
  findMin,
  meanAvgDev,
  findMedian,
  windowExpAvg,
  getClose,
};
let arr = [5, 4, 3, 2, 1, 0];

function findMax(arr) {
  return max(arr, (val) => val);
}

function findDeviation(arr) {
  return deviation(arr);
}

function findMedian(arr) {
  return median(arr, (val) => val);
}

function findMin(arr) {
  return min(arr, (val) => val);
}

function meanDeviation(data) {
  let avgData = average(data);
  // let currentVal = data[data.length-1]
  let deviation = data.map((d) => Math.abs(d - avgData));
  let meanDev = average(deviation);
  return meanDev;
}

function SMA(data) {
  return average(data);
}

function average(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function EMA(data, length) {
  makeEMA(data, length);
}

/* Makes the data for given  Moving Average*/
function makeEMA(data, EMA_val) {
  if (!data) return;
  EMA_val = parseInt(EMA_val); //EMA_val is a string, the number of days on average
  const multiplier = 2 / (EMA_val + 1);

  let dataLength = data.length;
  let EMAdata = [];
  data.forEach((d, iD) => {
    let emaCalc;
    let start = iD;
    let end = iD + EMA_val;
    if (end > dataLength) return;
    let window = data.slice(start, end);
    if (!EMAdata.length) {
      let MA = mean(window, getClose);
      emaCalc = parseFloat(MA.toFixed(3));
    } else {
      let prevEMA = EMAdata[EMAdata.length - 1].y;
      let close = +data[end - 1].close;
      //   console.log({ close, prevEMA, multiplier, i, EMA_val });
      emaCalc = (close - prevEMA) * multiplier + prevEMA;
      emaCalc = parseFloat(emaCalc.toFixed(3));
    }
    EMAdata.push({ x: +data[end - 1].timestamp, y: emaCalc });
  });
  //   console.log(EMAdata);\
  return EMAdata;
}

//allData is array of obj, with {key, timestamp}
function windowAvg(allData, windowSize, key) {
  let allDataLength = allData.length;
  let allAvgData = [];
  // console.log({allData, windowSize, key})
  // debugger
  allData.forEach((data, iData) => {
    let start = iData;
    let end = iData + windowSize;
    if (end > allDataLength) return;
    let window = allData.slice(start, end);

    let { timestamp } = window.slice(-1)[0];
    let vals = window.map((d) => d[key]);
    let avg = parseFloat(average(vals).toFixed(3));
    allAvgData.push({ [`${key}${windowSize}Avg`]: avg, timestamp, dateTime:new Date(timestamp).toLocaleString() });
  });

  // console.log(allAvgData)
  return allAvgData;
}

function windowEMA(data, windowSize, key) {
  let factor = 2 / (windowSize + 1);
  let allAvgData = [];
  let dataLength = data.length;

  let newKey = `${key}${windowSize}EMA`;

  data.forEach((d, iD) => {
    let start = iD;
    let end = iD + windowSize;
    if (end > dataLength) return;
    let timestamp;
    let EMA;
    if (!allAvgData.length) {
      let window = data.slice(start, end);
      let vals = window.map((d) => d[key]);
      timestamp = window.slice(-1)[0].timestamp;
      EMA = parseFloat(average(vals).toFixed(3));
    } else {
      let price = data[iD + (windowSize - 1)][key];
      let prevEMA = allAvgData[iD - 1][newKey];
      EMA = (price - prevEMA) * factor + prevEMA;
      timestamp = data[iD + (windowSize - 1)];
      // console.log({EMA, price})
    }
    allAvgData.push({ timestamp, [newKey]: EMA });
  });
  return allAvgData;
}

//allData is array of obj, with {key, timestamp}
function windowExpAvg(allData, windowSize, key) {
  let allDataLength = allData.length;
  let allAvgData = [];
  let newKey = `${key}${windowSize}Avg`;
  // console.log({allData, windowSize, key})
  allData.forEach((data, iData) => {
    let start = iData;
    let end = iData + windowSize;
    let avg, timestamp;
    if (end > allDataLength) return;
    if (!allAvgData.length) {
      let window = allData.slice(start, end);
      timestamp = window.slice(-1)[0].timestamp;
      let vals = window.map((d) => d[key]);
      avg = parseFloat(average(vals).toFixed(3));
    } else {
      let dataIndex = iData + windowSize - 1;
      let currentData = allData[dataIndex];
      timestamp = currentData.timestamp;
      avg =
        (allAvgData[iData - 1][newKey] * (windowSize - 1) + currentData[key]) /
        windowSize;
    }
    allAvgData.push({ [newKey]: avg, timestamp });
  });

  // console.log(allAvgData)
  return allAvgData;
}

function diffVals(allData, _lookForward, key) {
  let allDataLength = allData.length;
  let allDiffData = [];
  // console.log({allData, windowSize, key})
  allData.forEach((data, iData) => {
    let lookForward = iData + _lookForward;
    if (lookForward >= allDataLength) return;
    let to = allData[lookForward];
    let fromVal = allData[iData][key];
    let toVal = to[key];
    let { timestamp } = to;

    let diff = toVal - fromVal;
    allDiffData.push({
      [`${key}${_lookForward}RateOfChange`]: diff,
      timestamp,
    });
  });

  return allDiffData;
}

//Generic function that give rate of change on key data
function rateOfChange(allData, lookForward, key) {
  let allDiffData = diffVals(allData, lookForward, key);
  // console.log(allDiffData)
  return allDiffData;
}

function exceedsDeviationLimit(allData, key, deviationWindow, deviationLimit) {
  let meanAbsDev = meanAvgDev(allData, deviationWindow, key);
  //check for how many sigmas the current deviation is from the mean deviation
  let aboveSigmas = {};
  let belowSigmas = {};
  let zeroCount = 0;
  let { highSigmas, lowSigmas } = deviationLimit;
  meanAbsDev.forEach((std, iStd) => {
    let { currentAbsDeviation, meanAbsDeviation, timestamp } = std;
    // if(timestamp === 1593693000000){
    //   console.log('debug')
    // }
    if (!meanAbsDeviation) return zeroCount++;
    if (!currentAbsDeviation) return zeroCount++;
    //if 2x or 1/2 Sigma
    if (currentAbsDeviation > meanAbsDeviation) {
      //check for 2x or 3x
      highSigmas.forEach((sigma) => {
        if (!aboveSigmas[sigma]) aboveSigmas[sigma] = [];
        if (meanAbsDeviation * sigma < currentAbsDeviation) {
          aboveSigmas[sigma].push(std);
        }
      });
    } else if (currentAbsDeviation < meanAbsDeviation) {
      //check for sigma 1/2 1/3 etc..
      lowSigmas.forEach((sigma) => {
        if (!belowSigmas[sigma]) belowSigmas[sigma] = [];
        if (currentAbsDeviation < meanAbsDeviation * (1 / sigma)) {
          belowSigmas[sigma].push(std);
        }
      });
    }
  });

  return { aboveSigmas, belowSigmas };
}

function meanAvgDev(data, window, key) {
  let all_MAD = [];
  let meanVals = windowAvg(data, window, key);
  let meanKey = `${key}${window}Avg`;
  // console.log(meanVals);
  // debugger
  data.forEach((d, iD) => {
    d = data[iD];
    if (iD < window-1) return;

    let end = iD;
    let start = iD - (window-1);

    let { timestamp } = d;
    let meanVal = meanVals[start][meanKey];
    let dataWindow = data.slice(start, end+1);
    let absDeviation = dataWindow.reduce((a, b) => {
      //for each data in the window
      //add the difference from the mean
      return Math.abs(b[key] - meanVal) + a;
    }, 0);
    //then avg this abs deviation
    let meanAbsDeviation = absDeviation / window;

    //now compare this val to the data
    // let currentDataPoint = dataWindow.slice(-1)[0];
    // let currentDataVal = currentDataPoint[key];
    // let currentAbsDeviation = Math.abs(currentDataVal - meanVal);

    all_MAD.push({
      meanVal,
      meanAbsDeviation,
      // currentAbsDeviation,
      timestamp,
      dateTime:new Date(timestamp).toLocaleString()
    });
  });

  return all_MAD;
}

const pcorr = (x, y) => {
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0,
    sumY2 = 0;
  const minLength = (x.length = y.length = Math.min(x.length, y.length)),
    reduce = (xi, idx) => {
      const yi = y[idx];
      sumX += xi;
      sumY += yi;
      sumXY += xi * yi;
      sumX2 += xi * xi;
      sumY2 += yi * yi;
    };
  x.forEach(reduce);
  return (
    (minLength * sumXY - sumX * sumY) /
    Math.sqrt(
      (minLength * sumX2 - sumX * sumX) * (minLength * sumY2 - sumY * sumY)
    )
  );
};
// let arrX = [20, 54, 54, 65, 45];
// let arrY = [22, 11, 21, 34, 87];
// let R = pcorr(arrX, arrY);
// console.log('arrX', arrX, 'arrY', arrY, 'R', R);
