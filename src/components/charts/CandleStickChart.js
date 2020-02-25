import React, { useRef, useEffect, useState } from "react";
import { axisBottom, axisRight } from "d3-axis";

import { zoom } from "d3-zoom";
import { scaleLinear, scaleTime } from "d3-scale";
import { extent, max, min } from "d3-array";
import { select, event, mouse } from "d3-selection";
import { drag } from "d3-drag";
import {
  forwardFill,
  dropShadow,
  doZoomIn,
  doZoomOut
} from "./chartHelpers/utils.js";
import diff from "../charts/chartHelpers/extrema.js";

import { addCandleSticks } from "./chartHelpers/candleStickUtils.js";
import { line } from "d3";



function CandleStickChart({ width, height, timeframe }) {
  const chartRef = useRef();
  const margin = {
    top: 15,
    right: 40,
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
  
  let timestamps;
  let highs;
  let lows;
  let closes;
  let opens;
  let timeMin, timeMax;
  let futureLines = {};
  let OHLCdata = {
    all: [],
    partial: [],
    zoomState: 1
  };
  // const [initChart, setInitChart] = useState(false);

  // const [OHLCdata, setOHLCdata] = useState({
  //   all: [],
  //   partial: [],
  //   zoomState: 1
  // });

  console.log(OHLCdata);
  if (!OHLCdata) OHLCdata.all = [];

  console.log({ highs, lows, opens, closes });
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
    console.log("load");
    fetch(
      `${process.env.REACT_APP_STOCK_DATA_URL}/back_data/${timeframe}/${timeframe}-ES.json`
    ).then(async res => {
      let json = await res.json();
      //TESTING TODO REMOVE
      console.log(json);
      //TESTING TODO REMOVE
      json.results.forEach(
        r => (r.timestamp = new Date(r.timestamp).getTime())
      );
      //add any missing data with forward fill
      json.results = forwardFill(json.results);
      OHLCdata = {
        ...OHLCdata,
        all: json.results,
        partial: json.results
      };
      setupChart();
    });
  }, []);

  useEffect(() => {
    // console.log("draw");
    draw();
  });

  const setupChart = () => {
    if (!chartRef.current) return;
    let svg = select(chartRef.current);
    dropShadow(svg);
    //Set up some data
    timestamps = OHLCdata.all.map(d => d.timestamp);
    highs = OHLCdata.all.map(d => d.high);
    lows = OHLCdata.all.map(d => d.low);
    closes = OHLCdata.all.map(d => d.close);
    opens = OHLCdata.all.map(d => d.open);

    //append timeAxis group
    svg
      .append("g")
      .attr("class", "timeAxis")
      .attr("transform", `translate(${margin.left}, ${height - margin.bottom})`)
      .call(timeAxis);
    //append priceAxis group
    svg
      .append("g")
      .attr("class", "priceAxis")
      .attr("transform", `translate(${width - margin.right}, ${margin.top})`)
      .call(priceAxis);

    let chartWindow = svg
      .append("g")
      .attr("class", "chartWindow")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const d3zoom = zoom()
      // .scaleExtent([1, 40])
      .on("zoom", zoomed);

    const d3drag = drag()
      .on("start", dragStart)
      .on("drag", dragged)
      .on("end", dragEnd);

    svg.on("mousemove", () => {
      let x = event.pageX - svg.node().getBoundingClientRect().x - margin.left;
      let y = event.pageY - svg.node().getBoundingClientRect().y - margin.top;
      x = x < 0 ? 0 : x;
      y = y < 0 ? 0 : y;
      // console.log({ x, y })
      MOUSEX = x;
      MOUSEY = y;
    });

    svg.call(d3drag); //breaks if this is not first

    svg.call(d3zoom); //needs to be after drag

    draw();
    // setInitChart(true);
  };

  function zoomed() {
    let mouseZoomPOS = MOUSEX / innerWidth;
    if (mouseZoomPOS > 0.98) mouseZoomPOS = 0.97;
    if (mouseZoomPOS < 0.02) mouseZoomPOS = 0.03;
    let kScale = event.transform.k;
    console.log("zoom");

    if (event && event.sourceEvent && event.sourceEvent.type == "wheel") {
      // setOHLCdata(prevData => {
      let { zoomState } = OHLCdata;
      let data = OHLCdata.partial;

      if (kScale > zoomState) {
        if (OHLCdata.partial.length < 30) {
          OHLCdata = {
            ...OHLCdata,
            zoomState: kScale
          };
          return draw();
        }

        data = doZoomIn(OHLCdata, mouseZoomPOS);
      } else if (kScale < zoomState) {
        data = doZoomOut(OHLCdata);
      }
      // console.log({candleZoom, data})
      OHLCdata = {
        ...OHLCdata,
        partial: data,
        zoomState: kScale
      };
      return draw();

      // });
    }
  }

  function dragStart() {
    // console.log('dragStart')
    mouseDRAGSART = event.x - margin.left;
    dragStartData = [...OHLCdata.partial];
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
      let start = dragStartData[0];
      let startIndex = OHLCdata.all.findIndex(
        d => d.timestamp === start.timestamp
      );
      let dataEnd = dragStartData.slice(0, dragStartData.length - 1 - barCount);
      let dataStart = OHLCdata.all.slice(startIndex - barCount, startIndex);
      data = [...dataStart, ...dataEnd];
    } else if (xDragPOS < mouseDRAGSART) {
      let end = dragStartData[dragStartData.length - 1];
      let endIndex = OHLCdata.all.findIndex(d => d.timestamp === end.timestamp);
      let dataStart = dragStartData.slice(barCount, dragStartData.length - 1);
      let dataEnd = OHLCdata.all.slice(endIndex, endIndex + barCount);
      data = [...dataStart, ...dataEnd];
    }

    // set(prevData => {
    OHLCdata = {
      ...OHLCdata,
      partial: data
    };
    return draw();

    // });
  }
  function dragEnd() {
    // console.log("dragEnd");
    // console.log({x:event.x - margin.left,MOUSEX})
  }

  const addHighLowMarkers = () => {
    //  data,  name, mincolor, maxcolor, tolerence, ismin, ismax, PriceLevels
    appendMinmaxMarkers(highs, "high", "green", "red", 5, false, true, true);
    appendMinmaxMarkers(lows, "low", "green", "red", 5, true, false, true);
    appendMinmaxMarkers(
      opens,
      "open",
      "limegreen",
      "orangered",
      5,
      true,
      true,
      true
    );
    appendMinmaxMarkers(
      closes,
      "close",
      "lightseagreen",
      "palevioletred",
      5,
      true,
      true,
      true
    );
  };

  const appendMinmaxMarkers = (
    data,
    name,
    minColor,
    maxColor,
    tolerance,
    min,
    max,
    addPriceLevels
  ) => {
    let svg = select(chartRef.current);
    let chartWindow = svg.select(".chartWindow");
    // console.log({ name });

    let { minValues, maxValues } = diff.minMax(timestamps, data, tolerance);
    // console.log({ maxValues: maxValues.length });
    // console.log({ minValues: minValues.length });
    // console.log({ minMaxValues });
    if (max) {
      minMaxValues[name].maxValues = maxValues;

      appendMarker(
        maxValues,
        maxColor,
        5,
        `max${name}MarkerGroup`,
        name,
        chartWindow
      );
      if (addPriceLevels) {
        appendPriceLevel(
          maxValues,
          maxColor,
          `max${name}PriceLevel`,
          chartWindow
        );
        appendHorizontalPriceLevel(
          maxValues,
          maxColor,
          `maxHorizontal${name}PriceLevel`,
          chartWindow
        );
      }
    }

    if (min) {
      minMaxValues[name].minValues = minValues;

      appendMarker(
        minValues,
        minColor,
        5,
        `min${name}MarkerGroup`,
        name,
        chartWindow
      );
      if (addPriceLevels) {
        appendPriceLevel(
          minValues,
          minColor,
          `min${name}PriceLevel`,
          chartWindow
        );
        appendHorizontalPriceLevel(
          minValues,
          minColor,
          `minHorizontal${name}PriceLevel`,
          chartWindow
        );
      }
    }
  };

  function draw(data) {
    let drawData;
    if (data) {
      drawData = data;
    } else {
      drawData = OHLCdata.partial;
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
  }

  function appendFutureLines() {
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
    console.log({ linesData, className });
    let lines = chartWindow.selectAll(`.${className}`).data(linesData);
    lines.exit().remove();
    lines
      .enter()
      .append("line")
      .merge(lines)
      .attr("class", className)
      .attr("x1", d => timeScale(d.x1))
      .attr("x2", d => timeScale(d.x2))
      .attr("y1", d => priceScale(d.y1))
      .attr("y2", d => priceScale(d.y2));
  }

  function appendFutureMarker_AndLine({ point1, point2, futureLineForward }) {
    console.log({ point1, point2 });
    let svg = select(chartRef.current);
    let chartWindow = svg.select(".chartWindow");
    let data = [{ x: point2.x, y: point2.y }];
    appendMarker(
      data,
      "orange",
      6,
      "futureMarker",
      "futureMarker",
      chartWindow
    );

    let x1 = point1.x;
    let x2 = timeScale(point2.x);
    let y1 = point1.y;
    let y2 = priceScale(point2.y);
    // console.log({ x1, x2, y1, y2 });
    // futureLineForward.attr("x1", x1);
    // futureLineForward.attr("x2", x2);
    // futureLineForward.attr("y1", y1);
    // futureLineForward.attr("y2", y2);
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
      .attr("class", (d, i) => `${classAttr} ${i}`)
      .on("mouseover", function() {
        if (name === "futureMarker") {
          let x = select(this).attr("cy");
          let y = select(this).attr("cx");
          let futureDate = timeScale.invert(x);
          let futurePrice = priceScale.invert(y);
          console.log({ futureDate, futurePrice });
        } else {
          return drawDoubleSlopeLines(this, name);
        }
      })
      .on("mouseleave", removeLine);
    // .style("filter", "url(#drop-shadow)");
  }

  // appendHorizontalPriceLevel(data, minColor, `minPriceLevel`);
  function appendHorizontalPriceLevel(data, color, classAttr, chartWindow) {
    let priceLevels = chartWindow.selectAll(`.${classAttr}`).data(data);
    let barWidth = innerWidth / OHLCdata.partial.length;
    let strokeWidth = barWidth / 5 < 1 ? 1 : barWidth / 5;

    console.log({ data, color, classAttr, barWidth });
    console.log("appedning pricle level");
    console.log(priceLevels);
    priceLevels.exit().remove();
    priceLevels
      .enter()
      .append("line")
      .merge(priceLevels)

      .attr("y1", d => priceScale(d.y))

      .attr("x1", timeScale(timeMax))
      .attr("x2", d => timeScale(d.x))
      .attr("y2", d => priceScale(d.y))
      .attr("stroke-width", 2)
      .attr("stroke", color)
      .attr("class", classAttr)
      .style("opacity", 0.1);
  }

  // appendPriceLevel(minPriceLevels, minColor, `minPriceLevel`);
  function appendPriceLevel(data, color, classAttr, chartWindow) {
    // console.log("appedning pricle level");
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
      // .attr("stroke-width", 4)
      .attr("stroke", color)
      .attr("class", classAttr);
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
        // console.log("looking in maxvalues");
        if (timeScale(maxVal.x) == cx && priceScale(maxVal.y) == cy) {
          appendSlopeLines(className, index, maxValues);
          return true;
        }
      });
    }
  }

  function appendSlopeLines(className, index, valuesArray) {
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
      // let currentLineForward = chartWindow
      //   .append("line")
      //   .attr("class", "slopeLineForward");
      //   let currentLineBackward = chartWindow
      //   .append("line")
      //   .attr("class", "slopeLineBackward");
      //   let futureLineForward = chartWindow
      //   .append("line")
      //   .attr("class", "futureLineForward");
      futureLines[className] = {};
      linesData = futureLines[className];
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
      // appendFutureMarker_AndLine({point1:line2EndPoint,point2:futureEndPoint, futureLineForward} );
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
    let className = select(this).attr("class");
    if (!futureLines[className]) {
      return console.log("I dont know about this marker");
    }
    // console.log("leave");
    let {
      currentLineForward,
      currentLineBackward,
      futureLineForward
    } = futureLines[className];
    if (currentLineForward) {
      currentLineForward.remove();
    }
    if (currentLineBackward) {
      currentLineBackward.remove();
    }
    if (futureLineForward) {
      futureLineForward.remove();
    }

    console.log(futureLines);
  }

  function slopeCompare({ line1, line2 }) {
    let slopeLine1 = slopeLine(line1);
    let slopeLine2 = slopeLine(line2);
    let avgSlope = (slopeLine1 + slopeLine2) / 2;
    let line2EndPoint = { x: line2.x2, y: line2.y2 };
    let yIntcpt = intercept(line2EndPoint, avgSlope);
    //Whats the date 5 bars out
    let barWidth = innerWidth / OHLCdata.partial.length;
    let futureX = line2.x2 + barWidth * 10;
    let futureDate = timeScale.invert(futureX);
    let futureY = yIntcpt + futureX * avgSlope;
    let futurePrice = priceScale.invert(futureY);
    let futureEndPoint = { x: futureDate, y: futurePrice };
    return { futureEndPoint, line2EndPoint };
  }
  return (
    <>
      <h3>{timeframe}</h3>
      <svg
        ref={chartRef}
        width={width}
        height={height}
        className="svgChart"
      ></svg>
    </>
  );
}

export default CandleStickChart;

function slopeLine({ x1, x2, y1, y2 }) {
  return slope({ x: x1, y: y1 }, { x: x2, y: y2 });
}

function slope(a, b) {
  console.log({ a, b });
  if (a.x == b.x) {
    return null;
  }

  return (b.y - a.y) / (b.x - a.x);
}

function intercept(point, slope) {
  if (slope === null) {
    // vertical line
    return point.x;
  }

  return point.y - slope * point.x;
}

function xIntercept(a, m) {
  return a.x - a.y / m;
}
