import React, { useRef, useEffect, useState, useCallback } from "react";
import styled from "styled-components";
import { axisBottom, axisRight } from "d3-axis";
// import { useDispatch, useSelector } from "react-redux";

import { zoom } from "d3-zoom";
import { scaleLinear, scaleTime } from "d3-scale";
import { extent, max, min } from "d3-array";
import { select, event, mouse } from "d3-selection";
import { drag } from "d3-drag";
import {
  dropShadow,
  doZoomIn,
  doZoomOut,
  formatData,
  slopeLine,
  forwardFill,
  slope,
  intercept,
  xIntercept
} from "./chartHelpers/utils.js";
import diff from "../charts/chartHelpers/extrema.js";

import { addCandleSticks } from "./chartHelpers/candleStickUtils.js";
// import { line } from "d3";
import {
  drawAxisAnnotation,
  removeAllAxisAnnotations
} from "./chartHelpers/chartAxis.js";
import { makeEMA, makeSTD, drawMALine } from "./chartHelpers/MA-lines.js";
import { evaluateMinMaxPoints } from "./chartHelpers/evaluateMinMaxPoints.js";
let visibleIndicators = {
  swingLines: false,
  minMaxMarkers: false,
  futureLines: false,
  importantPriceLevel: false,
  regressionLines:false,
  ema20: false,
  ema200: false,
  ema50: false
};
let wtfFlag = false
function CandleStickChart({ width, height, timeframe, data }) {
  if(data)data = data.slice(1000)
  const chartRef = useRef();
  // const { stock_data } = useSelector(state => state);
  // const { search_symbol, charts } = stock_data;
  const [minMaxTolerance, setMinMaxTolerance] = useState(15)
  const [, updateState] = React.useState();
  const forceUpdate = useCallback(() => updateState({}), []);
  const margin = {
    top: 15,
    right: 60,
    bottom: 20,
    left: 35
  };

  let MOUSEX;
  let MOUSEY;
  let mouseDRAGSART;
  let dragStartData;
  let lastBarCount;
  let currentLineForward;
  let currentLineBackward;
  let futureLineForward;
  let importantLines = [];
  let timestamps;
  let highs;
  let lows;
  let closes;
  let opens;
  let EMA_data = {
    "20": [],
    "50": [],
    "200": []
  }; //array of {x,y} coords
  let STD_data = {
    "20": [],
    "50": [],
    "200": []
  }; //array of {x,y} coords
  let timeMin, timeMax;
  let futureLines = {};
  let allOHLCdata = [];
  let rawOHLCData = [];
  let partialOHLCdata = [];
  let zoomState = 1;
  let consolidatedMinMaxPoints =[]
  const minMaxValues = {
    open: {
      minValues: [],
      maxValues: []
    },
    close: {
      minValues: [],
      maxValues: []
    },
    high: {
      minValues: [],
      maxValues: []
    },
    low: {
      minValues: [],
      maxValues: []
    }
  };

  const innerWidth = width - (margin.left + margin.right);

  const innerHeight = height - (margin.top + margin.bottom);

  const timeScale = scaleTime().range([0, innerWidth]);

  const priceScale = scaleLinear().range([innerHeight, 0]);

  const candleHeightScale = scaleLinear().range([0, innerHeight]);

  let timeAxis = axisBottom(timeScale)
    .ticks(5)
    .tickSize(-innerHeight);

  let priceAxis = axisRight(priceScale)
    .ticks(8)
    .tickSize(-innerWidth);

  useEffect(() => {
    // console.log("data data changed");
    // console.log({data})
    if (data && data.length) {
      if(wtfFlag)return
      wtfFlag = true
      // console.log("data data has length");

      console.log(data)
      rawOHLCData = [...data];
      data = forwardFill(data);
      console.log(rawOHLCData.length)
      console.log(data.length)
      allOHLCdata = data;
      partialOHLCdata = data;
      setupChart();
    }
  }, [data]);

  useEffect(() => {
    console.log("onload");

    // console.log(charts[search_symbol])
    // console.log(_OHLCdata)
    // console.log('FETCH DATA')
    // fetch(
    //   `${process.env.REACT_APP_STOCK_DATA_URL}/back_data/${timeframe}/${timeframe}-ES.json`
    // ).then(async res => {
    //   let json = await res.json();
    //   //set the time to a number
    //   json.forEach(r => (r.timestamp = new Date(r.timestamp).getTime()));
    //   //add any missing data with forward fill
    //   json = forwardFill(json);
    //   OHLCdata = {
    //     ...OHLCdata,
    //     // all: json.slice(-100),
    //     // partial: json.slice(-100)
    //     all: json,
    //     partial: json
    //   };
    //   setupChart();
    // });
  }, []);

  useEffect(() => {
    console.log("USE EFEFEct");
    console.log(minMaxValues);
    // console.log("draw");
    // console.log({allOHLCdata, partialOHLCdata})

    // if(true){
    //   draw([])
    // }else{

    draw();
    // }
  }, [minMaxValues]);

  const appendMinmaxMarkers = (name, minColor, maxColor, min, max) => {
    if (!visibleIndicators.minMaxMarkers)
      return console.log("minMaxMarkers not turned on");

    let svg = select(chartRef.current);
    let chartWindow = svg.select(".chartWindow");
    // console.log({ name });

    // let { minValues, maxValues } = diff.minMax(timestamps, data, minMaxTolerance);
    // console.log({ maxValues: maxValues.length });
    // console.log({ minValues: minValues.length });
    // console.log({ minMaxValues });
    // if(visibleIndicators.importantPriceLevel){
    //   appendMarker(
    //     consolidatedMinMaxPoints,
    //     'yellow',
    //     8,
    //     `consolidatedMinMaxPoint`,
    //     'importantPriceLevel',
    //     chartWindow
    //   );
    // }
    if (max) {
      // minMaxValues[name].maxValues = maxValues;
      // console.log(minMaxValues);
      let maxValues = minMaxValues[name].maxValues;
      appendMarker(
        maxValues,
        maxColor,
        5,
        `max${name}MarkerGroup`,
        name,
        chartWindow
      );
      appendSwingLevel(
        maxValues,
        maxColor,
        `max${name}PriceLevel`,
        chartWindow
      );
    }

    if (min) {
      // minMaxValues[name].minValues = minValues;
      let minValues = minMaxValues[name].minValues;

      appendMarker(
        minValues,
        minColor,
        5,
        `min${name}MarkerGroup`,
        name,
        chartWindow
      );
      appendSwingLevel(
        minValues,
        minColor,
        `min${name}PriceLevel`,
        chartWindow
      );
    }
  };
  const addHighLowMarkers = () => {
    if (!visibleIndicators.minMaxMarkers) return; //console.log(' minMaxMarkers not turned on');

    // console.log("add markers");
    //  data,  name, mincolor, maxcolor, tolerence, ismin, ismax, PriceLevels
    appendMinmaxMarkers("high", "green", "red", false, true);
    appendMinmaxMarkers("low", "green", "red", true, false);
    // appendMinmaxMarkers("open", "limegreen", "orangered", true, true);
    // appendMinmaxMarkers(
    //   "close",
    //   "lightseagreen",
    //   "palevioletred",

    //   true,
    //   true
    // );
  };

  const setupChart = () => {
    console.log("setupChart");
    if (!chartRef.current) return;
    let svg = select(chartRef.current);
    svg.selectAll("*").remove();
    //min max tolerence  TODO make it more dynamic
    dropShadow(svg);

    //Set up some data
    runMinMaxValues();

    //make all EMA/STD data
    Object.keys(EMA_data).forEach(MA_value => {
      EMA_data[MA_value] = makeEMA(MA_value, allOHLCdata);
      STD_data[MA_value] = makeSTD(MA_value, allOHLCdata);
    });

    //append timeAxis group
    let timeAxisG = svg
      .append("g")
      .attr("class", "timeAxis")
      .attr("transform", `translate(${margin.left}, ${height - margin.bottom})`)
      .call(timeAxis);
    //append priceAxis group
    let priceAxisG = svg
      .append("g")
      .attr("class", "priceAxis")
      .attr("transform", `translate(${width - margin.right}, ${margin.top})`)
      .call(priceAxis);

    //append the crosshair marker
    timeAxisG
      .append("path")
      .attr("id", `bottomTimeTag`)
      // .attr("stroke", "blue")
      .attr("stroke-width", 2);
    timeAxisG.append("text").attr("id", `bottomTimeTagText`);

    //append the crosshair marker
    priceAxisG
      .append("path")
      .attr("id", `rightPriceTag`)
      // .attr("stroke", "blue")
      .attr("stroke-width", 2);
    priceAxisG.append("text").attr("id", `rightPriceTagText`);

    let chartWindow = svg
    // .append('rect').attr('width', innerWidth).attr('height', innerHeight)
      .append("g")
      .attr("class", "chartWindow")
      .attr("transform", `translate(${margin.left},${margin.top})`)
      .attr('fill', 'black')
    /* CrossHair */
    // create crosshairs
    var crosshair = chartWindow.append("g").attr("class", "line");
    // create horizontal line
    crosshair
      .append("line")
      .attr("id", "crosshairX")
      .attr("class", "crosshair");

    // create vertical line
    crosshair
      .append("line")
      .attr("id", "crosshairY")
      .attr("class", "crosshair");

    chartWindow
      .append("rect")
      .attr("class", "overlay")

      .attr("height", innerHeight)
      .attr("width", innerWidth)
      .on("mouseover", function() {
        crosshair.style("display", null);
      })
      .on("mouseout", function() {
        crosshair.style("display", "none");
        removeAllAxisAnnotations(svg);
      })
      .on("mousemove", mousemove);

    function mousemove() {
      let _mouse = mouse(this);
      MOUSEX = _mouse[0];
      MOUSEY = _mouse[1];

      appendAxisAnnotations(MOUSEX, MOUSEY, svg);
      // let mouseDate = timeScale.invert(MOUSEX);
      crosshair
        .select("#crosshairX")
        .attr("x1", MOUSEX)
        .attr("y1", 0)
        .attr("x2", MOUSEX)
        .attr("y2", innerHeight);

      crosshair
        .select("#crosshairY")
        .attr("x1", timeScale(timestamps[0]))
        .attr("y1", MOUSEY)
        .attr("x2", timeScale(timestamps[timestamps.length - 1]))
        .attr("y2", MOUSEY);

      // console.log({ x, y, mouseDate });
    }
    function appendAxisAnnotations(x, y, svg) {
      /* Candle stick is the top candleStickWindowHeight */
      // drawAxisAnnotation(topOpts, x);
      drawAxisAnnotation("bottomTimeTag", timeScale, x, svg);
      // if (y < candleStickWindowHeight) {
      // drawAxisAnnotation(leftOpts, y);
      drawAxisAnnotation("rightPriceTag", priceScale, y, svg);
      // removeVolumeAxisAnnotations();
      // } else if (y > candleStickWindowHeight) {
      //   y = y - candleStickWindowHeight;
      //   drawAxisAnnotation(leftVolOpts, y);
      //   drawAxisAnnotation(rightVolOpts, y);
      //   removePriceAxisAnnotations();
      // }
    }

    const d3zoom = zoom()
      // .scaleExtent([1, 40])
      .on("zoom", zoomed);

    const d3drag = drag()
      .on("start", dragStart)
      .on("drag", dragged)
      .on("end", dragEnd);

    svg.call(d3drag); //breaks if this is not first

    svg.call(d3zoom); //needs to be after drag

    draw();
    // setTimeout(() => {
    //   if(importantLines.length)return
    //   importantLines = evaluateMinMaxPoints(
    //     consolidatedMinMaxPoints,
    //     timestamps
    //   );
    // }, 500);
  }; //setupChart()


  function zoomed() {
    let mouseZoomPOS = MOUSEX / innerWidth;
    if (mouseZoomPOS > 0.98) mouseZoomPOS = 0.97;
    if (mouseZoomPOS < 0.02) mouseZoomPOS = 0.03;
    let kScale = event.transform.k;
    // console.log("zoom");

    if (event && event.sourceEvent && event.sourceEvent.type == "wheel") {
      // setOHLCdata(prevData => {
      let data = partialOHLCdata;

      if (kScale > zoomState) {
        if (partialOHLCdata.length < 30) {
          zoomState = kScale;

          return draw();
        }

        data = doZoomIn({ partialOHLCdata }, mouseZoomPOS);
      } else if (kScale < zoomState) {
        data = doZoomOut({ allOHLCdata, partialOHLCdata });
      }
      // console.log({candleZoom, data})

      partialOHLCdata = data;
      zoomState = kScale;
      return draw();

      // });
    }
  }

  function dragStart() {
    // console.log('dragStart')
    mouseDRAGSART = event.x - margin.left;
    dragStartData = [...partialOHLCdata];
  }
  function dragged() {
    let xDragPOS = event.x - margin.left;
    let dragAmount = Math.abs(xDragPOS - mouseDRAGSART);
    let barWidth = innerWidth / dragStartData.length;
    let barCount = parseInt(dragAmount / barWidth);
    if (barCount < 1) return;
    if (lastBarCount === barCount) return;
    lastBarCount = barCount;
    // console.log("dragged");
    let data;
    if (xDragPOS > mouseDRAGSART) {
      // console.log('right')
      let start = dragStartData[0];
      let startIndex = allOHLCdata.findIndex(
        d => d.timestamp === start.timestamp
      );
      // console.log({startIndex, barCount})
      let dataEnd = dragStartData.slice(0, dragStartData.length - 1 - barCount);
      let zeroOrGreater = startIndex - barCount < 0 ? 0 : startIndex - barCount;
      let dataStart = allOHLCdata.slice(zeroOrGreater, startIndex);
      console.log({dataEnd, zeroOrGreater, dataStart, dragStartData, barCount, startIndex, start})
      data = [...dataStart, ...dataEnd];
    } else if (xDragPOS < mouseDRAGSART) {
      console.log('left')
      let end = dragStartData[dragStartData.length - 1];
      let endIndex = allOHLCdata.findIndex(d => d.timestamp === end.timestamp);
      let dataStart = dragStartData.slice(barCount, dragStartData.length - 1);
      let dataEnd = allOHLCdata.slice(endIndex, endIndex + barCount);
      data = [...dataStart, ...dataEnd];
    }
    console.log({data})

    partialOHLCdata = data;

    return draw();
  }
  function dragEnd() {
    // console.log("dragEnd");
    // console.log({x:event.x - margin.left,MOUSEX})
  }

  function draw(data) {
    // console.log({ data, allOHLCdata, partialOHLCdata });
    let drawData;
    if (data) {
      drawData = data;
    } else {
      drawData = partialOHLCdata;
    }
    if (!drawData.length) return;

    let priceMax = max(drawData, d => d.high);
    let priceMin = min(drawData, d => d.low);
    // priceMax = priceMax+(priceMax*.1);
    // priceMin = priceMin+(priceMin*.1);

    [timeMin, timeMax] = extent(drawData.map(({ timestamp }) => timestamp));

    const priceRange = priceMax - priceMin;
    let timeframe = drawData[1].timestamp - drawData[0].timestamp;
    //  This helps the bars at the ends line up with the edge of the chart
    timeScale.domain([timeMin - timeframe / 2, timeMax + timeframe / 2]);
    candleHeightScale.domain([0, priceRange]);
    priceScale.domain([priceMin, priceMax]);

    // get the SVG element
    let svg = select(chartRef.current);

    svg.select(".timeAxis").call(timeAxis);
    svg.select(".priceAxis").call(priceAxis);
    let chartWindow = svg.select(".chartWindow");
    let candleWidth = innerWidth / drawData.length;

    addCandleSticks(
      drawData,
      chartWindow,
      candleWidth,
      timeScale,
      priceScale,
      candleHeightScale
    );

    addHighLowMarkers();
    appendFutureLines();
    let scales = { timeScale, priceScale };
    appendEMA(chartWindow, scales);
    appendSTD();
    appendImportantPriceLevel(chartWindow, scales);
  }

  function appendEMA(chartWindow, { timeScale, priceScale }) {
    if (visibleIndicators.ema20) {
      //show 20 EMA
      drawMALine(chartWindow, EMA_data, 20, { timeScale, priceScale });
    }
    if (visibleIndicators.ema50) {
      //show 50 EMA
      drawMALine(chartWindow, EMA_data, 50, { timeScale, priceScale });
    }
    if (visibleIndicators.ema200) {
      //show 200 EMA
      drawMALine(chartWindow, EMA_data, 200, { timeScale, priceScale });
    }
  }

  function appendSTD(chartWindow, timeScale, priceScale) {
    // console.log({minMaxValues})
    console.log("TODO");
  }

  function appendFutureLines() {
    if (!visibleIndicators.futureLines) return; //console.log('futureLines not turned on');;
    // console.log("Append futureLines");
    let currentLinesForward = [];
    let currentLinesBackward = [];
    let futureLinesForward = [];
    for (let linesId in futureLines) {
      let {
        currentLineForward,
        currentLineBackward,
        futureLineForward
      } = futureLines[linesId];
      if (currentLineForward) {
        currentLinesForward.push(currentLineForward);
      }
      if (currentLineBackward) currentLinesBackward.push(currentLineBackward);
      if (futureLineForward) futureLinesForward.push(futureLineForward);
    }
    let svg = select(chartRef.current);
    let chartWindow = svg.select(".chartWindow");

    drawFutureLines(currentLinesForward, "currentLineForward", chartWindow);
    drawFutureLines(currentLinesBackward, "currentLineBackward", chartWindow);
    drawFutureLines(futureLinesForward, "futureLineForward", chartWindow);
  }

  function drawFutureLines(linesData, className, chartWindow) {
    let lines = chartWindow.selectAll(`.${className}`).data(linesData);
    lines.exit().remove();
    lines
      .enter()
      .append("line")
      .merge(lines)
      .attr("class", `${className} futureLines`)
      .attr("x1", d => timeScale(d.x1))
      .attr("x2", d => timeScale(d.x2))
      .attr("y1", d => priceScale(d.y1))
      .attr("y2", d => priceScale(d.y2));
  }

  function appendMarker(data, color, r, classAttr, name, chartWindow) {
    let markers = chartWindow.selectAll(`.${classAttr}`).data(data);
    markers.exit().remove();
    markers
      .enter()
      .append("circle")
      .merge(markers)
      .attr("cx", d => timeScale(d.x))
      .attr("cy", d => priceScale(d.y))
      .attr("r", r)
      .attr("fill", color)
      .attr("class", (d, i) => `${classAttr} ${i} minMaxMarkers `)
      .on("mouseover", function() {
        if (name === "futureMarker" || name==='importantPriceLevel') {
          let x = select(this).attr("cy");
          let y = select(this).attr("cx");
          // let futureDate = timeScale.invert(x);
          // let futurePrice = priceScale.invert(y);
          console.log({ x, y });
        }else {
          return drawDoubleSlopeLines(this, name);
        }
      })
      .on("mouseleave", removeLine);
    // .style("filter", "url(#drop-shadow)");
  }

  // appendImportantPriceLevel(data, minColor, `minPriceLevel`);
  function appendImportantPriceLevel(chartWindow, { priceScale, timeScale }) {
    if (!visibleIndicators.importantPriceLevel) return; //console.log('importantPriceLevel not turned on');;
    console.log({ importantLines });

    let importantPriceLevel = chartWindow
      .selectAll(`.${"importantPriceLevel"}`)
      .data(importantLines);
    // let barWidth = innerWidth / partialOHLCdata.length;

    importantPriceLevel.exit().remove();
    importantPriceLevel
      .enter()
      .append("line")
      .merge(importantPriceLevel)

      .attr("y1", d => priceScale(d.currentPoint.point.y))

      .attr("x1", d => timeScale(d.currentPoint.point.x))
      .attr("x2", d => timeScale(d.secondPoint.timeMax))
      .attr("y2", d => priceScale(d.secondPoint.timeMaxPrice))
      .attr("stroke-width", 3)
      .attr("stroke", (d)=>{ return 'lawngreen'
        // let count = d.nearbyPoints.length
        // if(count < 3)return 'lawngreen'
        // if(count < 6)return 'darkslateblue'
        // if(count < 9)return 'darkgreen'
        // if(count < 12)return 'forestgreen'
        // if(count < 15)return 'chartreuse'
        // if(count < 18)return 'orangered'
        // if(count < 21)return 'crimson'
        // if(count < 24)return 'mediumvioletred'
        // if(count >=24)return 'magenta'
      })
      .attr("class", `importantPriceLevel`)
      .style("opacity", 0.7)
      .on('mouseover', function(d){
        // console.log(d)
        this.classList.add('importantLine')
        highlightNearbyPoints(d, chartWindow, {priceScale, timeScale})

      }).on('mouseout', function(){
        this.classList.remove('importantLine')
        chartWindow.selectAll('.nearbyPoint').remove()
        console.log('remove')
      })

  }
  function highlightNearbyPoints(data, chartWindow, {priceScale, timeScale}){


    console.log(data)
    let nearbyPoints = chartWindow.selectAll(`.nearbyPoint`).data(data.nearbyPoints);
    nearbyPoints.exit().remove();
    nearbyPoints
      .enter()
      .append("circle")
      .merge(nearbyPoints)
      .attr("cx", d => timeScale(d.x))
      .attr("cy", d => priceScale(d.y))
      .attr("r", 10)
      .attr("fill", 'blue')
      .attr("stroke", 'white')
      .attr("class", `nearbyPoint`)

      let currentPoint = chartWindow.selectAll(`.currentPoint`).data([data.currentPoint.point]);
      currentPoint.exit().remove();
      currentPoint
        .enter()
        .append("circle")
        .merge(currentPoint)
        .attr("cx", d => timeScale(d.x))
        .attr("cy", d => priceScale(d.y))
        .attr("r", 10)
        .attr("fill", 'green')
        .attr("stroke", 'white')
        .attr("class", `currentPoint nearbyPoint`)

        let secondPoint = chartWindow.selectAll(`.secondPoint`).data([data.secondPoint.point]);
        secondPoint.exit().remove();
        secondPoint
          .enter()
          .append("circle")
          .merge(secondPoint)
          .attr("cx", d => timeScale(d.x))
          .attr("cy", d => priceScale(d.y))
          .attr("r", 10)
          .attr("fill", 'red')
          .attr("stroke", 'black')
          .attr("class", `secondPoint nearbyPoint`)



  }

  // appendSwingLevel(minPriceLevels, minColor, `minPriceLevel`);
  function appendSwingLevel(data, color, classAttr, chartWindow) {
    // console.log("appedning pricle level");
    if (!visibleIndicators.swingLines) return; //console.log("swingLines not turned on");
    let priceLevels = chartWindow.selectAll(`.${classAttr}`).data(data);
    let dataLength = priceLevels.data().length;
    priceLevels.exit().remove();
    priceLevels
      .enter()
      .append("line")
      .merge(priceLevels)

      .attr("x1", d => timeScale(d.x))
      .attr("y1", d => priceScale(d.y))
      .attr("x2", (d, i) => {
        if (i + 1 < dataLength) {
          let prevData = priceLevels.data()[i + 1];
          if (!prevData) return console.log("fail");
          return timeScale(prevData.x);
        } else {
          return timeScale(d.x);
        }
      })
      .attr("y2", (d, i) => {
        if (i + 1 < dataLength) {
          let prevData = priceLevels.data()[i + 1];
          if (!prevData) return console.log("fail");
          return priceScale(prevData.y);
        } else {
          return priceScale(d.y);
        }
      })
      .attr("stroke", color)
      .attr("class", `${classAttr} swingLines`);
    // .style("filter", "url(#drop-shadow)");
  }

  function drawDoubleSlopeLines(that, name) {
    let svg = select(chartRef.current);
    let chartWindow = svg.select(".chartWindow");
    let cx = parseFloat(select(that).attr("cx"));
    let cy = parseFloat(select(that).attr("cy"));
    let className = select(that).attr("class");
    console.log({ className, name });

    let { minValues, maxValues } = minMaxValues[name];

    if (className.includes("min")) {
      minValues.some((minVal, index) => {
        // console.log("looking in minvalues");
        if (timeScale(minVal.x) == cx && priceScale(minVal.y) == cy) {
          appendSlopeLines(className, index, minValues);
          return true;
        }
      });
    }

    if (className.includes("max")) {
      maxValues.some((maxVal, index) => {
        // console.log("looking in maxValues");
        if (timeScale(maxVal.x) == cx && priceScale(maxVal.y) == cy) {
          appendSlopeLines(className, index, maxValues);
          return true;
        }
      });
    }
  }

  function appendSlopeLines(className, index, valuesArray) {
    if(!visibleIndicators.futureLines)return
    //{currentLineForward, currentLineBackward, futureLineForward},
    console.log({ index, valuesArrayLength: valuesArray.length });
    // console.log({ valuesArray, line });
    let currentVal = valuesArray[index];
    let nextVal = valuesArray[index + 1];
    let prevVal = valuesArray[index - 1];
    let line1 = false;
    let line2 = false;
    let linesData = futureLines[className];
    if (!linesData) {
      linesData = futureLines[className] = {};
      //  futureLines[className];
    }
    if (!nextVal || !currentVal || index === valuesArray.length - 1) {
      console.log("No next val");
    } else {
      let x1 = timeScale(currentVal.x);
      let x2 = timeScale(nextVal.x);
      let y1 = priceScale(currentVal.y);
      let y2 = priceScale(nextVal.y);

      line2 = { x1, x2, y1, y2 };
      linesData.currentLineForward = {
        x1: timeScale.invert(line2.x1),
        x2: timeScale.invert(line2.x2),
        y1: priceScale.invert(line2.y1),
        y2: priceScale.invert(line2.y2)
      };
    }
    if (!prevVal || !currentVal || index === 0) {
      console.log("No prev val");
    } else {
      let x1 = timeScale(prevVal.x);
      let x2 = timeScale(currentVal.x);
      let y1 = priceScale(prevVal.y);
      let y2 = priceScale(currentVal.y);

      line1 = { x1, x2, y1, y2 };
      linesData.currentLineBackward = {
        x1: timeScale.invert(line1.x1),
        x2: timeScale.invert(line1.x2),
        y1: priceScale.invert(line1.y1),
        y2: priceScale.invert(line1.y2)
      };
    }
    if (line1 && line2) {
      /*
      Compare the slopes of thee two lines?
      Draw a line, add a dot, blah blah
      */
      let { futureEndPoint, line2EndPoint } = slopeCompare({ line1, line2 });

      let x1 = timeScale.invert(line2EndPoint.x);
      let x2 = futureEndPoint.x;
      let y1 = priceScale.invert(line2EndPoint.y);
      let y2 = futureEndPoint.y;
      linesData.futureLineForward = { x1, x2, y1, y2 };
    }
    draw();
  }

  function removeLine() {
    console.log(futureLines);
    return console.log("test");
  }

  function slopeCompare({ line1, line2 }) {
    let slopeLine1 = slopeLine(line1);
    let slopeLine2 = slopeLine(line2);
    let avgSlope = (slopeLine1 + slopeLine2) / 2;
    let line2EndPoint = { x: line2.x2, y: line2.y2 };
    let yIntcpt = intercept(line2EndPoint, avgSlope);
    //Whats the date 5 bars out
    let barWidth = innerWidth / partialOHLCdata.length;
    let futureX = line2.x2 + barWidth * 10;
    let futureDate = timeScale.invert(futureX);
    let futureY = yIntcpt + futureX * avgSlope;
    let futurePrice = priceScale.invert(futureY);
    let futureEndPoint = { x: futureDate, y: futurePrice };
    return { futureEndPoint, line2EndPoint };
  }
  function toggleIndicators(indicator) {
    console.log({ indicator, minMaxValues });
    let svg = select(chartRef.current);
    let markers = svg.selectAll(`.${indicator}`);
    markers.remove();
    let val = visibleIndicators[indicator];
    val = !val;
    // setVisibleIndicators({...visibleIndicators, [indicator]:val})
    visibleIndicators[indicator] = val;
    // console.log(visibleIndicators)
    forceUpdate();
  }

  function runMinMaxValues() {
    console.log(minMaxTolerance)
    timestamps = data.map(d => d.timestamp);
    highs = data.map(d => d.high);
    lows = data.map(d => d.low);
    closes = data.map(d => d.close);
    opens = data.map(d => d.open);
    console.log({highs, data})
    let allValues = []
    var { minValues, maxValues } = diff.minMax(timestamps, highs, minMaxTolerance);
    allValues = [...allValues, ...maxValues]
    minMaxValues["high"].maxValues = maxValues;
    minMaxValues["high"].minValues = minValues;

    var { minValues, maxValues } = diff.minMax(timestamps, lows, minMaxTolerance);
    allValues = [...allValues, ...minValues]
    minMaxValues["low"].maxValues = maxValues;
    minMaxValues["low"].minValues = minValues;
    // var { minValues, maxValues } = diff.minMax(timestamps, opens, minMaxTolerance);
    // allValues = [...allValues, ...minValues, ...maxValues]
    // minMaxValues["open"].maxValues = maxValues;
    // minMaxValues["open"].minValues = minValues;
    // var { minValues, maxValues } = diff.minMax(timestamps, closes, minMaxTolerance);
    // allValues = [...allValues, ...minValues, ...maxValues]
    // minMaxValues["close"].maxValues = maxValues;
    // minMaxValues["close"].minValues = minValues;
    console.log(minMaxValues)
    consolidatedMinMaxPoints = diff.consolidateMinMaxValues(allValues, allOHLCdata)
  }

  return (
    <>
      <h3>{timeframe}</h3>
      <ToggleIndicatorButton
        posLeft={0}
        onClick={() => toggleIndicators("swingLines")}
        isSet={visibleIndicators.swingLines}
      >
        SWINGLINES
      </ToggleIndicatorButton>
      <ToggleIndicatorButton
        posLeft={3}
        onClick={() => toggleIndicators("minMaxMarkers")}
        isSet={visibleIndicators.minMaxMarkers}
      >
        MARKERS
      </ToggleIndicatorButton>
      <ToggleIndicatorButton
        posLeft={6}
        onClick={() => toggleIndicators("futureLines")}
        isSet={visibleIndicators.futureLines}
      >
        FUTURE LINES
      </ToggleIndicatorButton>
      <ToggleIndicatorButton
        onClick={() => toggleIndicators("importantPriceLevel")}
        isSet={visibleIndicators.importantPriceLevel}
      >
        PRICE LEVELS
      </ToggleIndicatorButton>
      <ToggleIndicatorButton
        onClick={() => toggleIndicators("regressionLines")}
        isSet={visibleIndicators.regressionLines}
      >
        Regression Lines
      </ToggleIndicatorButton>

      <ToggleIndicatorButton
        onClick={() => toggleIndicators("ema20")}
        isSet={visibleIndicators.ema20}
      >
        20 EMA
      </ToggleIndicatorButton>

      <ToggleIndicatorButton
        onClick={() => toggleIndicators("ema50")}
        isSet={visibleIndicators.ema50}
      >
        50 EMA
      </ToggleIndicatorButton>
      <ToggleIndicatorButton
        onClick={() => toggleIndicators("ema200")}
        isSet={visibleIndicators.ema200}
      >
        200 EMA
      </ToggleIndicatorButton>

      <svg
        ref={chartRef}
        width={width}
        height={height}
        className="svgChart"
      ></svg>

      <input value={minMaxTolerance} onChange={(e)=>{
        console.log('ook')
        setMinMaxTolerance(parseInt(e.target.value))
        
      }} type="number"/>
      <button onClick={runMinMaxValues}>Reset </button>
    </>
  );
}

export default CandleStickChart;

let ToggleIndicatorButton = styled.button`
position: relative;
top:0;
/* left:${({ posLeft }) => posLeft}; */
  background: ${({ isSet }) => (isSet ? "green" : "red")};
`;
