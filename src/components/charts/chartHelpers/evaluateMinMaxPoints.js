import { sum, mean, median, deviation } from "d3-array";

import { slopeLine, intercept } from "./utils.js";
import { extent } from "d3-array";
import { axisBottom } from "d3";

export function evaluateMinMaxPoints(minMaxValues, timestamps) {
  let linesObj = {};
  let lineCount = 0;
  let importantLines = [];
  let [timeMin, timeMax] = extent(timestamps.map(ts => ts));

  // let openHighs = minMaxValues["open"].maxValues;
  // let highHighs = minMaxValues["high"].maxValues;
  // let lowHighs = minMaxValues["low"].maxValues;
  // let closeHighs = minMaxValues["close"].maxValues;
  // let openLows = minMaxValues["open"].minValues;
  // let highLows = minMaxValues["high"].minValues;
  // let lowLows = minMaxValues["low"].minValues;
  // let closeLows = minMaxValues["close"].minValues;
  // let allPoints = [
  //   ...openHighs,
  //   ...openLows,
  //   ...highHighs,
  //   ...highLows,
  //   ...lowHighs,
  //   ...lowLows,
  //   ...closeHighs,
  //   ...closeLows
  // ];
  // allPoints = allPoints.sort((a, b) => {
  //   if (a.x > b.x) return 1;
  //   if (a.x < b.x) return -1;
  // });



  console.log({ minMaxValues });

  let count = 0;
  let focusedPoint = 4
  let secondFocusedPoint = 25
  minMaxValues.forEach((currentPoint, currentPointIndex) => {
    // if(currentPointIndex > focusedPoint || currentPointIndex < focusedPoint)return
    // console.log({ currentPointIndex });
    run_MinMaxOHLC_pointChecks(currentPoint, currentPointIndex);
  });
  // }

  console.log({ count, importantLines, linesObj });
  return importantLines;

  function run_MinMaxOHLC_pointChecks(currentPoint, currentPointIndex) {
    let x1 = currentPoint.x;
    let y1 = currentPoint.y;

    minMaxValues.forEach((secondPoint, secondPointIndex) => {
      // if(secondPointIndex > secondFocusedPoint || secondPointIndex < secondFocusedPoint)return

      let skippingMessage = `SKIPPING!!! currentPointIndex ${currentPointIndex} at ${new Date(
        currentPoint.x
      ).toLocaleString()} and secondPointIndex ${secondPointIndex} at ${new Date(
        secondPoint.x
      ).toLocaleString()}`;
      if (secondPointIndex <= currentPointIndex)
        return //console.log(skippingMessage);
      let continueMessage = `Comparing currentPointIndex ${currentPointIndex} at ${new Date(
        currentPoint.x
      ).toLocaleString()} and secondPointIndex ${secondPointIndex} at ${new Date(
        secondPoint.x
      ).toLocaleString()}`;
      // console.log(continueMessage);

      let x2 = secondPoint.x;
      let y2 = secondPoint.y;
      let line = { x1, x2, y1, y2 };
      let slope = slopeLine(line);
      if(slope === null )return
      let yIntcpt = intercept({ x: x1, y: y1 }, slope);

      //get timeMin price and timeMax price
      let timeMinPrice = parseFloat(
        (yIntcpt + timeMin * slope).toFixed(3)
      );
      let timeMaxPrice = parseFloat(
        (yIntcpt + timeMax * slope).toFixed(3)
      );
      // console.log({ currentPointIndex, secondPointIndex });
      // console.log({ slope, timeMinPrice, timeMaxPrice });
      //check if similar line already exists
      let newLineFlag = true;
      for (let line in linesObj) {
        let timeMinPriceLimit = timeMinPrice * 0.03;
        let timeMaxPriceLimit = timeMaxPrice * 0.03;
        // let slopeLimit = slope * 0.03
        // let slopeDiff = Math.abs(slope-linesObj[line].slope)
        let timeMinPriceDiff = Math.abs(
          timeMinPrice - linesObj[line].timeMinPrice
        );
        let timeMaxPriceDiff = Math.abs(
          timeMaxPrice - linesObj[line].timeMaxPrice
        );
        if (
          // slopeDiff < slopeLimit &&
          timeMinPriceDiff < timeMinPriceLimit &&
          timeMaxPriceDiff < timeMaxPriceLimit
        ) {
          newLineFlag = false;
        }
      }
      if (!newLineFlag) return; console.log("already got this line!!");

      // console.log('got a new line flag')
      linesObj[`line${lineCount}`] = {
        slope,
        timeMaxPrice,
        timeMinPrice
      };
      lineCount++;
      // console.log({timeMaxPriceDiff, timeMinPriceDiff})
      let nearbyPointsData = {
        currentPoint: {
          point: currentPoint,
          timeMin, timeMinPrice
        },
        secondPoint: { point: secondPoint,
          timeMax, timeMaxPrice
         },
        slope,
        yIntcpt,
        nearbyPoints: []
      };

      minMaxValues.forEach(({ x, y }, index) => {
        // console.log({x, currentX:currentPoint.x})
        // console.log(x<=currentPoint.x)
        
        if (x <= currentPoint.x) return;
        count++;
        let lineY = yIntcpt + x * slope;

        let delta = Math.abs(lineY - y);
        let closenessLimit = y * 0.001;
        if (delta < closenessLimit) {
          nearbyPointsData.nearbyPoints.push({ x, y, delta });
        }
      });

      if (nearbyPointsData.nearbyPoints.length > 1) {
        // console.log('pushing into the important line array')
        importantLines.push(nearbyPointsData);
      }
    });
    //   }
    // }
  }
}

















export function evaluateMinMaxPoints_onHold_but_kinda_works(
  minMaxValues,
  timestamps
) {
  let linesObj = {};
  let lineCount = 0;
  let importantLines = [];
  let [timeMin, timeMax] = extent(timestamps.map(ts => ts));

  let openHighs = minMaxValues["open"].maxValues;
  let highHighs = minMaxValues["high"].maxValues;
  let lowHighs = minMaxValues["low"].maxValues;
  let closeHighs = minMaxValues["close"].maxValues;
  let openLows = minMaxValues["open"].minValues;
  let highLows = minMaxValues["high"].minValues;
  let lowLows = minMaxValues["low"].minValues;
  let closeLows = minMaxValues["close"].minValues;
  let allPoints = [
    ...openHighs,
    ...openLows,
    ...highHighs,
    ...highLows,
    ...lowHighs,
    ...lowLows,
    ...closeHighs,
    ...closeLows
  ];
  allPoints = allPoints.sort((a, b) => {
    if (a.x > b.x) return 1;
    if (a.x < b.x) return -1;
  });

  console.log({ minMaxValues, allPoints });

  let count = 0;
  // for (let currentOHLC in minMaxValues) {
  // for (let currentMinMax in minMaxValues[currentOHLC]) {
  // minMaxValues[currentOHLC][currentMinMax].forEach(
  allPoints.forEach((currentPoint, currentPointIndex) => {
    // console.log({ currentPointIndex });
    run_MinMaxOHLC_pointChecks(
      currentPoint,
      currentPointIndex
      // currentOHLC,
      // currentMinMax
    );
  });
  // }
  // }

  console.log({ count, importantLines, linesObj });
  return importantLines;

  function run_MinMaxOHLC_pointChecks(
    currentPoint,
    currentPointIndex,
    currentOHLC,
    currentMinMax
  ) {
    // console.log({ currentPoint });
    //function to check all points compared to this?
    let x1 = currentPoint.x;
    let y1 = currentPoint.y;
    // for (let ohlc in minMaxValues) {
    //open, high, low, close
    // for (let minMax in minMaxValues[ohlc]) {
    // minMaxValues[ohlc][minMax].forEach(
    allPoints.forEach((secondPoint, secondPointIndex) => {
      // console.log({second:secondPoint.x ,current:currentPoint.x})
      // console.log(secondPoint.x < currentPoint.x)
      let shouldSkip = false;
      if (secondPointIndex <= currentPointIndex) shouldSkip = true;

      if (shouldSkip)
        return console.log(
          `SKIPPING!!! currentPointIndex ${currentPointIndex} at ${new Date(
            currentPoint.x
          ).toLocaleString()} and secondPointIndex ${secondPointIndex} at ${new Date(
            secondPoint.x
          ).toLocaleString()}`
        );
      console.log(
        `Comparing currentPointIndex ${currentPointIndex} at ${new Date(
          currentPoint.x
        ).toLocaleString()} and secondPointIndex ${secondPointIndex} at ${new Date(
          secondPoint.x
        ).toLocaleString()}`
      );

      let x2 = secondPoint.x;
      let y2 = secondPoint.y;
      let line = { x1, x2, y1, y2 };
      let slope = slopeLine(line);
      let yIntcpt = intercept({ x: x1, y: y1 }, slope);

      //get timeMin price and timeMax price
      let timeMinPrice = parseFloat(
        (yIntcpt + currentPoint.x * slope).toFixed(3)
      );
      let timeMaxPrice = parseFloat(
        (yIntcpt + secondPoint.x * slope).toFixed(3)
      );
      // console.log({ currentPointIndex, secondPointIndex });
      // console.log({ slope, timeMinPrice, timeMaxPrice });
      //check if similar line already exists
      let newLineFlag = true;
      for (let line in linesObj) {
        let timeMinPriceLimit = timeMinPrice * 0.03;
        let timeMaxPriceLimit = timeMaxPrice * 0.03;
        // let slopeLimit = slope * 0.03
        // let slopeDiff = Math.abs(slope-linesObj[line].slope)
        let timeMinPriceDiff = Math.abs(
          timeMinPrice - linesObj[line].timeMinPrice
        );
        let timeMaxPriceDiff = Math.abs(
          timeMaxPrice - linesObj[line].timeMaxPrice
        );
        if (
          // slopeDiff < slopeLimit &&
          timeMinPriceDiff < timeMinPriceLimit &&
          timeMaxPriceDiff < timeMaxPriceLimit
        ) {
          newLineFlag = false;
        }
      }
      if (!newLineFlag) return; //console.log("already got this line!!");

      // console.log('got a new line flag')
      linesObj[`line${lineCount}`] = {
        slope,
        timeMaxPrice,
        timeMinPrice
      };
      lineCount++;
      // console.log({timeMaxPriceDiff, timeMinPriceDiff})
      let nearbyPointsData = {
        currentPoint: {
          point: currentPoint
          // ohlc: currentOHLC,
          // minMax: currentMinMax
        },
        secondPoint: { point: secondPoint },
        slope,
        yIntcpt,
        nearbyPoints: []
      };

      allPoints.forEach(({ x, y }, index) => {
        // if (index <= currentPoint.x) return;
        count++;
        let lineY = yIntcpt + x * slope;

        let delta = Math.abs(lineY - y);
        let closenessLimit = y * 0.01;
        if (delta < closenessLimit) {
          nearbyPointsData.nearbyPoints.push({ x, y });
        }
      });

      if (nearbyPointsData.nearbyPoints.length > 6) {
        // console.log('pushing into the important line array')
        importantLines.push(nearbyPointsData);
      }
    });
    //   }
    // }
  }
}
