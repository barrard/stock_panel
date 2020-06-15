// import { select, event, mouse } from "d3-selection";

import { ReactReduxContext } from "react-redux";

// import extrema from "./extrema.js";

export function formatData(data) {
  if (data.length && data[0].t) {
    //alpaca data
    data = data.map(d => ({
      timestamp: d.t*1000,
      open: d.o,
      high: d.h,
      close: d.c,
      low: d.l
    }));
    return data
  } else {
    return data;
  }
}

export function forwardFill(data) {
  //find the time line
  console.log({data})
  let timeframe = determineTimeFrame(data);
  data = fillMissingData(data, timeframe);
  // console.log('================================')
  // data = fillMissingData(data, timeframe)
  // console.log({data})
  return data;
}

export function fillMissingData(data, timeframe) {
  if(!data)return
  let missingDataObj = {};
  data.forEach((d, i) => {
    if (i === data.length - 1) return;
    let diff = data[i + 1].timestamp - d.timestamp;
    // let today = new Date(d.timestamp);
    // let tomorrow = new Date(data[i + 1].timestamp);
    // console.log({diff, timeframe})
    // console.log({i, diff:Math.round(diff / timeframe), today, tomorrow})
    if (Math.round(diff / timeframe) !== 1) {
      // console.log({ diff: Math.round(diff / timeframe), today, tomorrow, i, timeframe })
      let lastClose = d.close;
      let blankDay = {
        timestamp: d.timestamp + timeframe,
        open: lastClose,
        close: lastClose,
        high: lastClose,
        low: lastClose,
        volume: 0,
        count: Math.round(diff / timeframe) - 1
      };
      missingDataObj[i + 1] = blankDay;
    }
  });
  // console.log({ timeframe })
  // console.log({ missingDataObj })
  Object.keys(missingDataObj)
    .reverse()
    .forEach(index => {
      let { count } = missingDataObj[index];
      delete missingDataObj[index].count;
      for (let x = 0; x < count; x++) {
        let timestamp = data[index - 1].timestamp + timeframe * (count - x);
        data.splice(index, 0, { ...missingDataObj[index], timestamp });
      }
    });

  return data;
}

export function determineTimeFrame(data) {
  if(!data)return
  let diffObj = {};
  // let prev = 0;
  data.forEach((d, i) => {
    if (i === data.length - 1) return;

    let diff = data[i + 1].timestamp - d.timestamp;
    if (!diffObj[diff]) {
      diffObj[diff] = 0;
    }
    diffObj[diff]++;
  });

  // console.log({ diffObj })

  let timeframe;
  let topCount = 0;
  for (let timeDiff in diffObj) {
    let count = diffObj[timeDiff];
    if (count > topCount) {
      topCount = count;
      timeframe = parseInt(timeDiff);
    }
  }
  // console.log({ timeframe })
  return timeframe;
}

export function priceRangeRed(defs){
  let gradient = defs.append('linearGradient')
  .attr('id', 'priceLevelGradientRed')
  .attr('gradientTransform',"rotate(90)")
  gradient.append('stop')
  .attr('offset', '0%')
  .attr('stop-opacity', '.4')
  .attr('stop-color','red')

  gradient.append('stop')
  .attr('stop-color','red')
  .attr('offset', '20%')
  .attr('stop-opacity', '0.1')

  gradient.append('stop')
  .attr('stop-color','red')
  .attr('offset', '50%')
  .attr('stop-opacity', '0.0')
}


export function priceRangeGreen(defs){
  let gradient = defs.append('linearGradient')
  .attr('id', 'priceLevelGradientGreen')
  .attr('gradientTransform',"rotate(90)")
  gradient.append('stop')
  .attr('stop-color','green')
  .attr('offset', '50%')
  .attr('stop-opacity', '0.0')
  
  gradient.append('stop')
  .attr('stop-color','green')
  .attr('offset', '80%')
  .attr('stop-opacity', '0.2')
  
  gradient.append('stop')
  .attr('offset', '100%')
  .attr('stop-opacity', '0.4')
  .attr('stop-color','green')
}


export function dropShadow(defs) {
  // filters go in defs element

  // create filter with id #drop-shadow
  // height=130% so that the shadow is not clipped
  var filter = defs
    .append("filter")
    .attr("id", "drop-shadow")
    .attr("height", "130%");

  // SourceAlpha refers to opacity of graphic that this filter will be applied to
  // convolve that with a Gaussian with standard deviation 3 and store result
  // in blur
  filter
    .append("feGaussianBlur")
    .attr("in", "SourceAlpha")
    .attr("stdDeviation", 3);

  // translate output of Gaussian blur to the right and downwards with 2px
  // store result in offsetBlur
  filter
    .append("feOffset")
    .attr("dx", 2)
    .attr("dy", 2)
    .attr("result", "offsetBlur");

  // Control opacity of shadow filter
  var feTransfer = filter.append("feComponentTransfer");

  feTransfer
    .append("feFuncA")
    .attr("type", "linear")
    .attr("slope", 0.2);

  // overlay original SourceGraphic over translated blurred opacity by using
  // feMerge filter. Order of specifying inputs is important!
  var feMerge = filter.append("feMerge");

  feMerge.append("feMergeNode").attr("in", "offsetBlur");
  feMerge.append("feMergeNode").attr("in", "SourceGraphic");
}

export function doZoomIn({partialOHLCdata}, mouseZoomPOS) {
  let firstHalf = partialOHLCdata.slice(
    0,
    partialOHLCdata.length * mouseZoomPOS + 1
  );
  let secondHalf = partialOHLCdata.slice(
    partialOHLCdata.length * -(1 - mouseZoomPOS)
  );

  let firstHalfCandleZoom = parseInt(
    firstHalf.length < 10 ? 0 : firstHalf.length * 0.05 || 1
  );
  let secondHalfCandleZoom = parseInt(
    secondHalf.length < 11 ? 0 : secondHalf.length * 0.05 || 1
  );
  firstHalf = firstHalf.slice(firstHalfCandleZoom, firstHalf.length);
  secondHalf = secondHalf.slice(
    0,
    secondHalf.length - 1 - secondHalfCandleZoom
  );
  let data = [...firstHalf, ...secondHalf];
  return data;
}

export function doZoomOut({allOHLCdata, partialOHLCdata, xName='timestamp'}) {
  if(!allOHLCdata || !partialOHLCdata)return
  let candleZoom = parseInt(partialOHLCdata.length * 0.05) || 1;

  let first = partialOHLCdata[0];
  let last = partialOHLCdata[partialOHLCdata.length - 1];
  if (!first || !last) return; //fail safe?
  let firstIndex = allOHLCdata.findIndex(d => d[xName] === first[xName]);
  let lastIndex = allOHLCdata.findIndex(d => d[xName] === last[xName]);
  // console.log({firstIndex, lastIndex})
  let newFirstData = allOHLCdata.slice(firstIndex - candleZoom, firstIndex);
  let newLastData = allOHLCdata.slice(lastIndex, lastIndex + candleZoom);
  // data = partialOHLCdata.slice(candleZoom, partialOHLCdata.length -candleZoom)
  let data = [...newFirstData, ...partialOHLCdata, ...newLastData];
  return data;
}

/**
 * 
 * @param {Objecy} values object {x:time, y:price}
 * we want to remove duplicate prices 
 */
export function dropDuplicateMinMax(values){
  let valCheck = [];
  let newValues = [];
  values.forEach(v=>{
    let index = valCheck.indexOf(v.y)
    if(index < 0) {
      valCheck.push(v.y)
      newValues.push(v)
    }
  })

return newValues
}

export function pythagorean(x1, x2, y1, y2){
  let sideA, sideB
  sideA = Math.abs(x1-x2)
  sideB = Math.abs(y1 - y2)

  return Math.sqrt(Math.pow(sideA, 2) + Math.pow(sideB, 2));
}

export function xOfY({m, b, y}){
  
  // y = m*x + b
  let x = (y-b)/m
  return x
}
export function slopeAndIntercept({x1, x2, y1, y2}){
  let m = slopeLine({ x1, x2, y1, y2 })
  let b = intercept({x:x1, y:y1}, m)
  let l = pythagorean(x1, x2, y1, y2)

  return {b, m, l}

}
export function slopeLine({ x1, x2, y1, y2 }) {
  return slope({ x: x1, y: y1 }, { x: x2, y: y2 });
}

export function slope(a, b) {
  // console.log({ a, b });
  if (a.x === b.x) {
    return null;
  }
  if((b.y === a.y))return 0
  return (b.y - a.y) / (b.x - a.x);
}

export function intercept(point, slope) {
  if (slope === null) {
    // vertical line
    return point.x;
  }

  return point.y - slope * point.x;
}

export function xIntercept(a, m) {
  return a.x - a.y / m;
}

// export function utilDataSetup({OHLCdata, priceScale, timeScale, timeframe}) {

// const timestamps = OHLCdata.all.map(d => d.timestamp);

// const minMaxValues = {
//   minValues: [],
//   maxValues: []
// };

// const LineObj = {};
// const timerObj = {};

//   const appendMinmaxMarkers = ({
//     chartWindow,

//     data,
//     name,
//     minColor,
//     maxColor,
//     tolerance,
//     isMin,
//     isMax
//   }) => {
//     let { minValues, maxValues } = extrema.minMax(timestamps, data, tolerance);
// console.log('appendMinmaxMarkers')
// console.log({ name, timeframe})
//     if (isMax) {
//       minMaxValues.maxValues = [...minMaxValues.maxValues, ...maxValues];
//       let maxMarkers = chartWindow
//         .selectAll(`.max${name}MarkerGroup`)
//         .data(maxValues);
//       appendMarker(maxMarkers, maxColor, 5, `max${name}MarkerGroup`);
//     }

//     if (isMin) {
//       minMaxValues.minValues = [...minMaxValues.minValues, ...minValues];
//       let minMarkers = chartWindow
//         .selectAll(`.min${name}MarkerGroup`)
//         .data(minValues);
//       appendMarker(minMarkers, minColor, 5, `min${name}MarkerGroup`);
//     }

//     function appendMarker(markers, color, r, classAttr) {
//       markers.exit().remove();
//       markers
//         .enter()
//         .append("circle")
//         .merge(markers)
//         .attr("cx", d => timeScale(d.x))
//         .attr("cy", d => priceScale(d.y))
//         .attr("r", r)
//         .attr("fill", color)
//         .attr("class", classAttr)
//         .on("mouseover", function(d){
//             drawlineThenRotate({
//                 chartWindow, cx:timeScale(d.x)
//               })
//         }

//         )
//         .on("mouseleave", removeLine)
//         .style("filter", "url(#drop-shadow)");
//     }
//   };

//   function drawlineThenRotate({ chartWindow, cx }) {
//     // let cx = parseFloat(select(this).attr("cx"));
//     console.log("mouse");
//     console.log(cx);
//     if (!LineObj[cx]) {
//       LineObj[cx] = chartWindow.append("line").attr("class", "slopeLine");
//     }
//     LineObj[cx].style("opacity", 1);

//     let { minValues, maxValues } = minMaxValues;

//     minValues.some((minVal, index) => {
//       if (timeScale(minVal.x) == cx) {
//         startRotation(LineObj[cx], index, minValues);
//         return true;
//       }
//     });
//     maxValues.some((maxVal, index) => {
//       if (timeScale(maxVal.x) == cx) {
//         startRotation(LineObj[cx], index, maxValues);
//         return true;
//       }
//     });
//   }

//   function startRotation(line, index, valuesArray) {
//     console.log({ valuesArray, line });
//     let currentVal = valuesArray[index];
//     let nextVal = valuesArray[index + 1];
//     if (!nextVal || !currentVal) return console.log("No next val");
//     let x1 = timeScale(currentVal.x);
//     let x2 = timeScale(nextVal.x);
//     let y1 = priceScale(currentVal.y);
//     let y2 = priceScale(nextVal.y);
//     console.log({ x1, x2, y1, y2 });
//     line.attr("x1", x1);
//     line.attr("x2", x2);
//     line.attr("y1", y1);
//     line.attr("y2", y2);
//   }

//   function removeLine() {
//     let cx = select(this).attr("cx");
//     console.log("leave");
//     if (!LineObj[cx]) return; //fail safe?
//     LineObj[cx].style("opacity", 0);
//     // clearInterval(timerObj[cx])
//   }

//   return {
//     appendMinmaxMarkers
//   };

// }


export const TICKS = {
  ZT: 0.0039,
  ZF: 0.0078,
  ZN: 0.0156,
  TN: 0.0156,
  ZB: 0.0313,
  GE: 0.005,
  ZQ: 0.0025,
  GLB: 0.0025,
  UB: 0.0313,
  SIL: 0.01,
  GC: 0.1,
  SI: 0.005,
  HG: 0.0005,
  MGC: 0.1,
  PL: 0.1,
  PA: 0.1,
  "6A": 0.0001,
  "6B": 0.0001,
  "6C": 0.0001,
  M6A: 0.0001,
  M6B: 0.0001,
  M6E: 0.0001,
  J7: 0,
  "6E": 0.0001,
  "6J": 0,
  "6M": 0,
  E7: 0.0001,
  "6N": 0.0001,
  "6S": 0.0001,
  ZC: 0.25,
  XC: 0.125,
  XW: 0.125,
  XK: 0.125,
  KE: 0.25,
  ZO: 0.25,
  ZS: 0.25,
  ZM: 0.1,
  ZL: 0.01,
  ZW: 0.25,
  NQ: 0.25,
  RTY: 0.1,
  ES: 0.25,
  EMD: 0.1,
  YM: 1,
  NKD: 5,
  BTC: 5,
  MES: 0.25,
  MNQ: 0.25,
  M2K: 0.1,
  MYM: 1,
  BZ: 0.01,
  QG: 0.005,
  RB: 0.0001,
  HO: 0.0001,
  CL: 0.01,
  NG: 0.001,
  QM: 0.025,
  LBS: 0.1,
  GF: 0.025,
  HE: 0.025,
  LE: 0.025,
};
