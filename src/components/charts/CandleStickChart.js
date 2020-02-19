import React, { useRef, useEffect, useState } from "react";
import { axisBottom, axisRight } from "d3-axis";

import { zoom } from "d3-zoom";
import { scaleLinear, scaleTime } from "d3-scale";
import { extent, max, min } from "d3-array";
import { select, event } from "d3-selection";
import { drag } from "d3-drag";
import {
  forwardFill,
  dropShadow,
  doZoomIn,
  doZoomOut,
  utilDataSetup
} from "./chartHelpers/utils.js";

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
  // const timestamps = OHLCdata.all.map(d => d.timestamp);
  const highs = OHLCdata.all.map(d => d.high);
  const lows = OHLCdata.all.map(d => d.low);
  const closes = OHLCdata.all.map(d => d.close);
  const opens = OHLCdata.all.map(d => d.open);
  // const minMaxValues = {
  //   minValues: [],
  //   maxValues: []
  // };
  
  useHack = OHLCdata;
  const innerWidth = width - (margin.left + margin.right);
  
  const innerHeight = height - (margin.top + margin.bottom);
  
  const timeScale = scaleTime().range([0, innerWidth]);
  
  const priceScale = scaleLinear().range([innerHeight, 0]);
  
  const candleHeightScale = scaleLinear().range([0, innerHeight]);
  
  let {appendMinmaxMarkers} =  utilDataSetup({OHLCdata, priceScale, timeScale})

  let timeAxis = axisBottom(timeScale)
    .ticks(5)
    .tickSize(-innerHeight);

  let priceAxis = axisRight(priceScale)
    .ticks(8)
    .tickSize(-innerWidth);

  useEffect(() => {
    console.log("load");
    //66.8.204.49
    fetch(
      `http://localhost:45678/back_data/${timeframe}/${timeframe}-ES.json`
    ).then(async res => {
      let json = await res.json();
      console.log(json);
      json.results.forEach(
        r => (r.timestamp = new Date(r.timestamp).getTime())
      );
      //add any missing data with forward fill
      json.results = forwardFill(json.results);
      setOHLCdata({
        all: json.results,
        partial: json.results
      });
      setupChart();
    });
  }, []);

  useEffect(() => {
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
    let svg = select(chartRef.current);

    let chartWindow = svg.select(".chartWindow");
    appendMinmaxMarkers({
      chartWindow,
      data: highs,
      name: "high",
      minColor: "green",
      maxColor: "red",
      tolaerance: 5,
      isMin: true,
      isMax: true
    });
    appendMinmaxMarkers({
      chartWindow,
      data: lows,
      name: "low",
      minColor: "green",
      maxColor: "red",
      tolaerance: 10,
      isMin: true,
      isMax: true
    });
    appendMinmaxMarkers({
      chartWindow,
      data: opens,
      name: "open",
      minColor: "green",
      maxColor: "red",
      tolaerance: 10,
      isMin: true,
      isMax: true
    });
    appendMinmaxMarkers({
      chartWindow,
      data: closes,
      name: "close",
      minColor: "green",
      maxColor: "red",
      tolaerance: 10,
      isMin: true,
      isMax: true
    });
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

function slope(a, b) {
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
