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
import diff from "../extrema.js";

import { addCandleSticks } from "./chartHelpers/candleStickUtils.js";

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
let useHack;
let currentLineForward;
let currentLineBackward;

function CandleStickChart({ width, height, timeframe }) {
  const chartRef = useRef();
  const [initChart, setInitChart] = useState(false);

  const [OHLCdata, setOHLCdata] = useState({
    all: [],
    partial: [],
    zoomState: 1
  });

  // console.log(OHLCdata)
  if (!OHLCdata) OHLCdata.all = [];
  const timestamps = OHLCdata.all.map(d => d.timestamp);
  const highs = OHLCdata.all.map(d => d.high);
  const lows = OHLCdata.all.map(d => d.low);
  const closes = OHLCdata.all.map(d => d.close);
  const opens = OHLCdata.all.map(d => d.open);
  const minMaxValues = {
    open:{

      minValues: [],
      maxValues: []
    },
    close:{

      minValues: [],
      maxValues: []
    },
    high:{

      minValues: [],
      maxValues: []
    },
    low:{

      minValues: [],
      maxValues: []
    },
    
  };

  useHack = OHLCdata;
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
      setOHLCdata({
        all: json.results,
        partial: json.results.slice(600)
      });
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

    setInitChart(true);
  };

  function zoomed() {
    let mouseZoomPOS = MOUSEX / innerWidth;
    if (mouseZoomPOS > 0.98) mouseZoomPOS = 0.97;
    if (mouseZoomPOS < 0.02) mouseZoomPOS = 0.03;
    let kScale = event.transform.k;
    console.log("zoom");

    if (event && event.sourceEvent && event.sourceEvent.type == "wheel") {
      setOHLCdata(prevData => {
        let { zoomState } = prevData;
        let data = prevData.partial;

        if (kScale > zoomState) {
          if (prevData.partial.length < 30)
            return {
              ...prevData,
              zoomState: kScale
            };

          data = doZoomIn(prevData, mouseZoomPOS);
        } else if (kScale < zoomState) {
          data = doZoomOut(prevData);
        }
        // console.log({candleZoom, data})
        return {
          ...prevData,
          partial: data,
          zoomState: kScale
        };
      });
    }
  }

  function dragStart() {
    // console.log('dragStart')
    mouseDRAGSART = event.x - margin.left;
    dragStartData = [...useHack.partial];
  }
  function dragged() {
    let xDragPOS = event.x - margin.left;
    let dragAmount = Math.abs(xDragPOS - mouseDRAGSART);
    let barWidth = innerWidth / dragStartData.length;
    let barCount = parseInt(dragAmount / barWidth);
    if (barCount < 1) return;
    if (lastBarCount === barCount) return;
    lastBarCount = barCount;
    console.log("dragged");
    let data;
    if (xDragPOS > mouseDRAGSART) {
      let start = dragStartData[0];
      let startIndex = useHack.all.findIndex(
        d => d.timestamp === start.timestamp
      );
      let dataEnd = dragStartData.slice(0, dragStartData.length - 1 - barCount);
      let dataStart = useHack.all.slice(startIndex - barCount, startIndex);
      data = [...dataStart, ...dataEnd];
    } else if (xDragPOS < mouseDRAGSART) {
      let end = dragStartData[dragStartData.length - 1];
      let endIndex = useHack.all.findIndex(d => d.timestamp === end.timestamp);
      let dataStart = dragStartData.slice(barCount, dragStartData.length - 1);
      let dataEnd = useHack.all.slice(endIndex, endIndex + barCount);
      data = [...dataStart, ...dataEnd];
    }

    setOHLCdata(prevData => {
      return {
        ...prevData,
        partial: data
      };
    });
  }
  function dragEnd() {
    console.log("dragEnd");
    // console.log({x:event.x - margin.left,MOUSEX})
  }

  const addHighLowMarkers = () => {
    //  data,  name, mincolor, maxcolor, tolerence, ismin, ismax, PriceLevels
    appendMinmaxMarkers(highs, "high", "green", "red", 5, false, true, true);
    appendMinmaxMarkers(lows, "low", "green", "red", 5, true, false, true);
    appendMinmaxMarkers(opens, "open", "green", "red", 10, true, true, true);
    appendMinmaxMarkers(closes, "close", "green", "red", 10, true, true, true);
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
    console.log({ name });

    let { minValues, maxValues } = diff.minMax(timestamps, data, tolerance);
    console.log({ maxValues: maxValues.length });
    // console.log({ minValues: minValues.length });
    // console.log({ minMaxValues });
    if (max) {
      minMaxValues[name].maxValues = maxValues;
      let maxMarkers = chartWindow
        .selectAll(`.max${name}MarkerGroup`)
        .data(maxValues);
      appendMarker(maxMarkers, maxColor, 5, `max${name}MarkerGroup`, name);
      if (addPriceLevels) {
        let maxPriceLevels = chartWindow
          .selectAll(`.max${name}PriceLevel`)
          .data(maxValues);
        appendPriceLevel(maxPriceLevels, maxColor, `max${name}PriceLevel`);
      }
    }

    if (min) {
      minMaxValues[name].minValues =minValues
      let minMarkers = chartWindow
        .selectAll(`.min${name}MarkerGroup`)
        .data(minValues);
      appendMarker(minMarkers, minColor, 5, `min${name}MarkerGroup`, name);
      if (addPriceLevels) {
        let minPriceLevels = chartWindow
          .selectAll(`.min${name}PriceLevel`)
          .data(minValues);
        appendPriceLevel(minPriceLevels, minColor, `min${name}PriceLevel`);
      }
    }
  };

  const draw = data => {
    let drawData;
    if (data) {
      drawData = data;
    } else {
      drawData = OHLCdata.partial;
    }
    if (!drawData.length) return;

    let priceMax = max(drawData, d => d.high);
    let priceMin = min(drawData, d => d.low);

    let [timeMin, timeMax] = extent(drawData.map(({ timestamp }) => timestamp));
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
  };

  function appendMarker(markers, color, r, classAttr, name) {
    markers.exit().remove();
    markers
      .enter()
      .append("circle")
      .merge(markers)
      .attr("cx", d => timeScale(d.x))
      .attr("cy", d => priceScale(d.y))
      .attr("r", r)
      .attr("fill", color)
      .attr("class", (d, i)=>`${classAttr} ${i}`)
      .on("mouseover", function(){return drawDoubleSlopeLines(this,name)})
      .on("mouseleave", removeLine)
      .style("filter", "url(#drop-shadow)");
  }

  // appendPriceLevel(minPriceLevels, minColor, `minPriceLevel`);

  function appendPriceLevel(priceLevels, color, classAttr) {
    // console.log("appedning pricle level");
    priceLevels.exit().remove();
    priceLevels
      .enter()
      .append("line")
      .merge(priceLevels)

      .attr("x1", d => timeScale(d.x))
      .attr("y1", d => priceScale(d.y))
      .attr("x2", (d, i) => {
        if (i + 1 < priceLevels.data().length) {
          let prevData = priceLevels.data()[i + 1];
          if (!prevData) return console.log("fail");
          // console.log({prevData})
          return timeScale(prevData.x);
        } else {
          return timeScale(d.x);
        }
      })
      .attr("y2", (d, i) => {
        if (i + 1 < priceLevels.data().length) {
          // console.log({ i, ys: priceLevels.data()[i] });
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

  const LineObj = {};
  const timerObj = {};

  function drawDoubleSlopeLines(that,name) {
    let svg = select(chartRef.current);
    let chartWindow = svg.select(".chartWindow");
    let cx = parseFloat(select(that).attr("cx"));
    let cy = parseFloat(select(that).attr("cy"));
    let className = select(that).attr("class");
    console.log({ className });
    // console.log(cx);
    // if (!LineObj[cx]) {
    currentLineForward = chartWindow
      .append("line")
      .attr("class", "slopeLineForward");
    currentLineBackward = chartWindow
      .append("line")
      .attr("class", "slopeLineBackward");

    // }
    currentLineForward.style("opacity", 1);
    currentLineBackward.style("opacity", 1);

    let { minValues, maxValues } = minMaxValues[name];

    if (className.includes("min")) {
      minValues.some((minVal, index) => {
        console.log("looking in minvalues");
        if (timeScale(minVal.x) == cx && priceScale(minVal.y) == cy) {
          appendSlopeLines(
            currentLineForward,
            currentLineBackward,
            index,
            minValues
          );
          return true;
        }
      });
    }

    if (className.includes("max")) {
      maxValues.some((maxVal, index) => {
        console.log("looking in maxvalues");
        if (timeScale(maxVal.x) == cx && priceScale(maxVal.y) == cy) {
          appendSlopeLines(
            currentLineForward,
            currentLineBackward,
            index,
            maxValues
          );
          return true;
        }
      });
    }
  }

  function appendSlopeLines(forwardLine, backwardLine, index, valuesArray) {
    console.log({index, valuesArrayLength:valuesArray.length})
    // console.log({ valuesArray, line });
    let currentVal = valuesArray[index];
    let nextVal = valuesArray[index + 1];
    let prevVal = valuesArray[index - 1];
    let line1 = false
    let line2 = false
    if (!nextVal || !currentVal || (index === valuesArray.length-1)) {
      console.log("No next val");
    } else {
      let x1 = timeScale(currentVal.x);
      let x2 = timeScale(nextVal.x);
      let y1 = priceScale(currentVal.y);
      let y2 = priceScale(nextVal.y);
      // console.log({ x1, x2, y1, y2 });
      forwardLine.attr("x1", x1);
      forwardLine.attr("x2", x2);
      forwardLine.attr("y1", y1);
      forwardLine.attr("y2", y2);
      line2 = {x1, x2, y1, y2}
    }
    if (!prevVal || !currentVal || index === 0) {
      console.log("No prev val");
    } else {
      let x1 = timeScale(prevVal.x);
      let x2 = timeScale(currentVal.x);
      let y1 = priceScale(prevVal.y);
      let y2 = priceScale(currentVal.y);
      // console.log({ x1, x2, y1, y2 });
      backwardLine.attr("x1", x1);
      backwardLine.attr("x2", x2);
      backwardLine.attr("y1", y1);
      backwardLine.attr("y2", y2);
      line1 = {x1, x2, y1, y2}
    }
    if(line1&&line2){
      /*
      Compare the slopes of thee two lines?
      */
     slopeCompare({line1, line2})
    }
  }

  function removeLine() {
    let cx = select(this).attr("cx");
    // console.log("leave");
    if (currentLineForward) {
      currentLineForward.style("opacity", 0);
      currentLineForward = false;
    }
    if (currentLineBackward) {
      currentLineBackward.style("opacity", 0);
      currentLineBackward = false;
    }
  }

  function slopeCompare({line1, line2}){
    console.log({line1, line2})
    let slopeLine1 = slopeLine(line1)
    console.log({slopeLine1})
    let slopeLine2 = slopeLine(line2)
    console.log({slopeLine2})
    let avgSlope = (slopeLine1+slopeLine2)/2
    console.log({avgSlope})
    let yIntcpt = intercept({x:line2.x2, y:line2.y2}, slopeLine2)
    console.log({yIntcpt})
    //Whats the date 5 bars out
    let barWidth = innerWidth / OHLCdata.partial.length;
    console.log({barWidth, x2:line2.x2})
    let futureX = line2.x2+(barWidth*10)
    let futureDate = timeScale.invert(futureX)
    console.log({futureDate})
    let futureY = yIntcpt + (futureX*avgSlope)
    console.log({futureY})
    console.log(priceScale.invert(futureY))
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

function slopeLine({x1, x2, y1, y2}){
  return slope({x:x1, y:y1}, {x:x2, y:y2})
}

function slope(a, b) {
  console.log({a,b})
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
