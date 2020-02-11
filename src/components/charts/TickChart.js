import React, { useState, useRef, useEffect, useCallback } from "react";
import { axisBottom, axisRight, axisLeft } from "d3-axis";

import { scaleLinear, scaleTime } from "d3-scale";
import { extent, max } from "d3-array";
import { select } from "d3-selection";
import { line } from "d3-shape";

const margin = {
  top: 15,
  right: 40,
  bottom: 20,
  left: 35
};

let dataset = [];

function TickChart({ data, width, height, localMinMax, tickSize }) {
  const chartRef = useRef();
  const [initChart, setInitChart] = useState(false);
  const innerWidth = width - (margin.left + margin.right);
  const innerHeight = height - (margin.top + margin.bottom);
  let prices = data.map(d => d.Price);
  let volValues = data.map(d => d.LastVol);
  let quote_times = data.map(d => d.quote_time);

  let [volMin, volMax] = extent(volValues);
  let [priceMin, priceMax] = extent(prices);

  const timeScale = scaleTime().range([0, innerWidth]);

  const priceScale = scaleLinear().range([innerHeight, 0]);

  const volScale = scaleLinear().range([innerHeight, 0]);

  let timeAxis = axisBottom(timeScale).ticks(4);

  let priceAxis = axisRight(priceScale).ticks(4);
  let volAxis = axisLeft(volScale).ticks(4);

  let lineFn = line()
    .x(function(d, i) {
      return timeScale(quote_times[i]);
    })
    .y(function(d) {
      return priceScale(d);
    });

  const setupChart = () => {
    if (!chartRef.current) return;
    // console.log("setup chart");
    // console.log(chartRef.current);
    timeScale.domain(extent(quote_times));

    priceScale.domain([priceMin - tickSize, priceMax + tickSize]);

    volScale.domain([0, volMax]);
    let svg = select(chartRef.current);

    //append chart window
    let chartWindow = svg
      .append("g")
      .attr("class", "chartWindow")
      .attr("transform", `translate(${margin.left},${margin.top})`);
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
    //appand volAxis
    svg
      .append("g")
      .attr("class", "volAxis")
      .attr("transform", `translate(${margin.left}, ${margin.top})`)
      .call(volAxis);

    setInitChart(true);
  };

  const draw = () => {
    if (!data) return;
    let prices = data.map(d => d.Price);
    let volValues = data.map(d => d.LastVol);
    let quote_times = data.map(d => d.quote_time);

    let [volMin, volMax] = extent(volValues);
    let [priceMin, priceMax] = extent(prices);

    timeScale.domain(extent(quote_times));

    priceScale.domain([priceMin - tickSize, priceMax + tickSize]);

    volScale.domain([0, volMax]);

    // get the SVG element
    let svg = select(chartRef.current);

    let chartWindow = svg.select(".chartWindow");

    //append timeAxis group
    svg.select(".timeAxis").call(timeAxis);
    //append priceAxis group
    svg.select(".priceAxis").call(priceAxis);

    //appand volAxis
    svg.select(".volAxis").call(volAxis);

    let volRects = chartWindow.selectAll("rect").data(data);
    volRects.exit().remove();
    volRects
      .enter()
      .append("rect")
      .merge(volRects)
      .attr("x", d => timeScale(d.quote_time) - innerWidth / data.length / 2)
      .attr("y", d => volScale(d.LastVol))
      .attr("height", d => innerHeight - volScale(d.LastVol))
      .attr("width", (d, i) => innerWidth / data.length)
      .attr("fill", "red")
      .attr("stroke", "black")
      .attr("stroke-width", function() {
        return this.getAttribute("width") / 10;
      });

    let tickLinePath = chartWindow.selectAll("path").data(prices);
    tickLinePath.exit().remove();

    tickLinePath
      .enter()
      .append("path")
      .merge(tickLinePath)

      .attr("class", "line") // Assign a class for styling
      .attr("d", lineFn(prices)); // 11. Calls the line generator

    //add min max lines? circles? markers???
    let { minValues, maxValues } = localMinMax;
    // console.log({minValues, maxValues})

    let maxMarkers = chartWindow.selectAll(".maxMarkerGroup").data(maxValues);
    maxMarkers.exit().remove();
    maxMarkers
      .enter()
      .append("circle")
      .merge(maxMarkers)

      .attr("cx", d => timeScale(d.x))
      .attr("cy", d => priceScale(d.y))
      .attr("r", 3)
      .attr("fill", "red")
      .attr("class", "maxMarkerGroup");

    let minMarkers = chartWindow.selectAll(".minMarkerGroup").data(minValues);
    minMarkers.exit().remove();
    minMarkers
      .enter()
      .append("circle")
      .merge(minMarkers)

      .attr("cx", d => timeScale(d.x))
      .attr("cy", d => priceScale(d.y))
      .attr("r", 3)
      .attr("fill", "green")
      .attr("class", "minMarkerGroup");
  };
  useEffect(() => {
    if (!initChart) {
      setupChart();
    }
    draw();
  });

  if (!priceMax || !priceMin)
    return <div className="not-available">Not enough Data to make chart</div>;

  return (
    <svg
      ref={chartRef}
      width={width}
      height={height}
      className="svgChart"
    ></svg>
  );
}

export default TickChart;
