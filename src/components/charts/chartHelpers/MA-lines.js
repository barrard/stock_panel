//making moving averages cool again
import { sum, mean, median, deviation } from "d3-array";
import { drawLine } from "./drawLine.js";
import { add_MA_data_action } from "../../../redux/actions/stock_actions.js";


const close = d => d.close;

/* Makes the data for given  Standard Deviation */
export function makeSTD(STD_length, data) {
  let STDdata = {high:[], low:[]};
  data.forEach((d, i) => {
      if(i === 0 )return
    if (i < STD_length - 1) return 
    let end = i;
    let start = i - (STD_length - 1);

    let stdData = data.slice(start, end);
    let std = deviation(stdData, close);
    // console.log({std, stdData, close})
    std = parseFloat(std.toFixed(3));
    STDdata.high.push({x:data[i].timestamp, y:data[i].close+std});
    STDdata.low.push({x:data[i].timestamp, y:data[i].close-std});
});
//   console.log(STDdata);
  return STDdata;
}

/* Makes the data for given  Moving Average*/
export function makeEMA(EMA_val, data) {
    EMA_val = parseInt(EMA_val)//EMA_val is a string, the number of days on average
  const multiplier = 2 / (EMA_val + 1);

  let EMAdata = [];
  data.forEach((d, i) => {
      if(i === 0 )return
     if (i <= EMA_val - 1) {
      let values = data.slice(0, i);
      let valuesMean = mean(values, close);
      EMAdata.push({x: data[i].timestamp, y:parseFloat(valuesMean.toFixed(3))});
    } else {
      let prevEMA = EMAdata[EMAdata.length - 1].y;
      let close = d.close;
    //   console.log({ close, prevEMA, multiplier, i, EMA_val });
      let emaCalc = (close - prevEMA) * multiplier + prevEMA;
      emaCalc = parseFloat(emaCalc.toFixed(3))

      EMAdata.push({x: d.timestamp,y:emaCalc});
    }
  });
//   console.log(EMAdata);
  return EMAdata;
}

export function drawMALine(
  chartWindow,
  emaData,
  MA_value,
  {timeScale,
  priceScale}
) {
//   console.log(emaData);
//   console.log({ MA_value, emaData });
  let MA_className = `ema${MA_value}`;
  let scales = { priceScale, timeScale };

  drawLine(chartWindow, emaData[MA_value], MA_className, scales);
}
