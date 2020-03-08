import { sum, mean, median, deviation } from "d3-array";

import { slopeLine, slope, intercept, xIntercept } from "./utils.js";
export function evaluateMinMaxPoints(minMaxValues, allData) {
  console.log(minMaxValues, allData);

  let masterData = [
    /*
        {
            point:{x, y}
            nearbyPoints:[{x,y}]   
        }
        */
  ];

  //first opens?
  let openHighs = minMaxValues["open"].maxValues;
  let highHighs = minMaxValues["high"].maxValues;
  let lowHighs = minMaxValues["low"].maxValues;
  let closeHighs = minMaxValues["close"].maxValues;
  let openLow = minMaxValues["open"].minValues;
  let highLow = minMaxValues["high"].minValues;
  let lowLow = minMaxValues["low"].minValues;
  let closeLow = minMaxValues["close"].minValues;

  openHighs.forEach((openHigh, firstMarkerIndex) => {
    console.log({ openHigh });
    //function to check all points compared to this?
    let x1 = openHigh.x;
    let y1 = openHigh.y;
    for (let ohlc in minMaxValues) {
      //open, high, low, close
      for (let minMax in minMaxValues[ohlc]) {
        minMaxValues[ohlc][minMax].forEach((dataPoint, secondMarkerIndex) => {
          let nearbyPointsData = {
            firstMarker: { point: openHigh, ohlc:'openHigh' },
            secondMarker: { point: dataPoint, ohlc, minMax },
            nearbyPoints: []
          };

          let x2 = dataPoint.x;
          let y2 = dataPoint.y;
          let line = { x1, x2, y1, y2 };
          let slope = slopeLine(line);
          let yIntcpt = intercept({ x: x1, y: y1 }, slope);
          //   console.log({ slope, yIntcpt });
          /* once we can draw the line
                    
                        we need to check the distance of all other 
                        bars (o, h, l, c)
                    */
          let diffs = {
            high: [],
            low: [],
            close: [],
            open: []
          };
          //   console.log(`---------------${ohlc} and ${minMax}---------------`);
          allData.forEach(
            ({ open, high, low, close, timestamp }, dataIndex) => {
              /*  TODO make function to check that all values are atleast above $5-$10 */
              if (!ensureLimit({ open, high, low, close }))
                return console.log("BELOW LIMIT $5");
              // if(index > 10) return
              //get distance from each
              let x = timestamp;
              let lineY = yIntcpt + x * slope;
              let diffOpen = Math.abs(lineY - open);
              let diffClose = Math.abs(lineY - close);
              let diffHigh = Math.abs(lineY - high);
              let diffLow = Math.abs(lineY - low);
              if (diffClose < open * 0.001) {
                // console.log({ diffClose, x, x1, y1, firstMarkerIndex, secondMarker, dataIndex });
                nearbyPointsData.nearbyPoints.push({
                  open,
                  high,
                  low,
                  close,
                  timestamp,
                  diffClose,
                  diffHigh,
                  diffLow,
                  diffOpen,
                  firstMarkerIndex,
                  secondMarkerIndex,
                  ohlc,
                  minMax
                });
              }
            }
          );
          masterData.push(nearbyPointsData);
        });
      }
    }
  });
  console.log(masterData);

  //highs

  //lows

  //closes
}

function ensureLimit({ open, high, low, close }) {
  if (open < 5 || high < 5 || low < 5 || close < 5) return false;
  return true;
}
