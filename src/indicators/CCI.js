let {average, meanDeviation} = require('./indicatorHelpers/MovingAverage.js')
let CCI_PERIODS = [5, 10, 14];
let indicatorName = "CCI";

module.exports = {
  calcCCI, CCI_PERIODS, addAllCCI_data, addNewestCCI_data
}



function addNewestCCI_data(data){
  let latestData = data.slice(-1)[0]
  latestData[indicatorName] = {}
  CCI_PERIODS.forEach((period) => {
    //the plus one is needed here for this case
let window = data.slice(-(period))
if(window.length<period)return 
let cci = calcCCI(window);
//momo is who whole window array, but we only want the current (last) 
latestData[indicatorName][period] = cci

});
// console.log(data)
return data
}
/**
 *
 * @param {Array} OHLC_array array of OHLC objects
 */
function calcCCI(OHLC_array) {
  let period = OHLC_array.length
  let typicalPrices = OHLC_array.map(
    ({ high, low, close }) => +((close + high + low) / 3).toFixed(2)
  );
  let currentTypicalPrice = typicalPrices.slice(-1)[0]
  let avgTypicalPrice = average(typicalPrices)
  // let absDeviations = typicalPrices.map(tp=> Math.abs(avgTypicalPrice - tp))
  // absDeviations = absDeviations.reduce((a,b)=> a+ b, 0)/absDeviations.length

  let meanDev = meanDeviation(typicalPrices)
  let cci = meanDev === 0 ? 0 :  ((currentTypicalPrice - avgTypicalPrice)/ (meanDev*0.015 ))

  // console.log({ typicalPrices, avgTypicalPrice, meanDev, cci})
  return parseFloat(cci.toFixed(1))
}


function addAllCCI_data(data) {
  let start = new Date().getTime()
  console.log(`Running CCI on ${data.length} bars`);
  // data = data.sort((a, b) => a.timestamp - b.timestamp);
  let dataLength = data.length;
  data.forEach((d, dIndex) => {
    d[indicatorName] = {};
    CCI_PERIODS.forEach((period, pIndex) => {
      //i.e index 4 i want to run period = 5
      if (dIndex < (period-1)) return;
      let end = dIndex+1;
      let start = end - period;
      if (end > dataLength) {
        return { end, dataLength };
      }
      let window = data.slice(start, end);
      //calc CCI
      let cci = calcCCI(window);
      d = {
        ...d,
        [indicatorName]: {
          ...d[indicatorName],
          [period]: cci,
        },
      };
      data[dIndex] = d;
    });
    // Candlestick_Controller.addTickMinuteIndicator(d);
  });
  console.log(`Total time = ${new Date().getTime() - start}`)
  return data
}