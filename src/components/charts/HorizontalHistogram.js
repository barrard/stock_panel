import React, { useState, useRef, useEffect, useCallback } from "react";
import { axisBottom, axisRight, axisTop } from "d3-axis";

import { scaleLinear, scaleTime } from "d3-scale";
import { extent, max } from "d3-array";
import { select } from "d3-selection";
import { line } from "d3-shape";

const margin = {
  top: 20,
  right: 40,
  bottom: 20,
  left: 35
};
//LastVol, Price, quote_time
function HorizontalHistogram({
  volPriceData,
  width,
  height,
  timePriceData,
  tickSize
}) {
  // if(!volPriceData)return
  const chartRef = useRef();
  const [initChart, setInitChart] = useState(false);
  const innerWidth = width - (margin.left + margin.right);
  const innerHeight = height - (margin.top + margin.bottom);
  //   console.log({ innerWidth, innerHeight });
  // console.log(volPriceData)
  let volValues = Array.from(Object.values(volPriceData));
  let priceValues = Object.keys(volPriceData);
  priceValues = priceValues.map(y => +y);

  let [priceMin, priceMax] = extent(priceValues);
  let [vMin, volMax] = extent(volValues);
  let [timeMin, timeMax] = extent(timePriceData, d => d.quote_time);

  const volScale = scaleLinear().range([0, innerWidth]);

  const priceScale = scaleLinear().range([innerHeight, 0]);

  const timeScale = scaleTime().range([0, innerWidth]);

  let volAxis = axisBottom(volScale)
    .ticks(4)
    .tickSize(-innerHeight);

  let priceAxis = axisRight(priceScale)
    .ticks(4)
    .tickSize(-innerWidth);

  let timeAxis = axisTop(timeScale)
    .ticks(4)

  let lineFn = line()
    .x(function(d, i) {
      return timeScale(d.quote_time);
    }) // set the x values for the line generator
    .y(function(d) {
      return priceScale(d.Price);
    }); // set the y values for the line generator
  const setupChart = () => {
    if (!chartRef.current) return;
    // console.log('setup chart')
    // console.log(chartRef.current)

    // console.log({volMax})
    volScale.domain([volMax, 0]);

    priceScale.domain([priceMin - tickSize, priceMax + tickSize]);

    timeScale.domain([timeMin, timeMax]);
    // get the SVG element
    let svg = select(chartRef.current);
    svg.style("background-color", "#222");

    // console.log(svg)
    //append chart window
    svg
      .append("g")
      .attr("class", "chartWindow")
      //transform the window to the margins
      .attr("transform", `translate(${margin.left},${margin.top})`);

    //append timeAxis group
    svg
      .append("g")
      .attr("class", "timeAxis white")
      .attr("transform", `translate(${margin.left}, ${margin.top})`)
      .call(timeAxis);

    //append volAxis group
    svg
      .append("g")
      .attr("class", "volAxis white")
      .attr("transform", `translate(${margin.left}, ${height - margin.bottom})`)
      .call(volAxis);

    //append priceAxis group
    svg
      .append("g")
      .attr("class", "priceAxis white")
      .attr("transform", `translate(${width - margin.right}, ${margin.top})`)
      .call(priceAxis);

    setInitChart(true);
  };

  const draw = () => {
    console.log('DRAW')
    if (!volPriceData) return;
    // console.log({volPriceData})
    let volValues = Array.from(Object.values(volPriceData));
    let priceValues = Object.keys(volPriceData);
    priceValues = priceValues.map(y => +y);

    let [priceMin, priceMax] = extent(priceValues);
    let [vMin, volMax] = extent(volValues);
    let [timeMin, timeMax] = extent(timePriceData, d => d.quote_time);

    // console.log('draw chart')
    // console.log(chartRef.current)

    // console.log({volMax})

    volScale.domain([volMax, 0]);

    priceScale.domain([priceMin - tickSize, priceMax + tickSize]);

    timeScale.domain([timeMin, timeMax]);

    // get the SVG element
    let svg = select(chartRef.current);
    //append chart window
    let chartWindow = svg.select(".chartWindow");
    //transform the window to the margins
    chartWindow.selectAll('.tickPriceLine').remove()

    //append timeAxis group
    svg.select(".timeAxis").call(timeAxis);

    //append volAxis group
    svg.select(".volAxis").call(volAxis);

    //append priceAxis group
    svg.select(".priceAxis").call(priceAxis);

    //append rects
    // console.log(volPriceData);
    // console.log({ volValues, priceValues });



    let histoRects = chartWindow.selectAll("rect").data(volValues);
    histoRects.exit().remove();
    histoRects
      .enter()
      .append("rect")
      .merge(histoRects)
      .attr("x", d => volScale(d))
      .attr("y", (_, i) => priceScale(priceValues[i] + tickSize / 2))
      .attr(
        "height",
        (_, i) =>
          priceScale(priceValues[i]) - priceScale(priceValues[i] + tickSize)
      )
      .attr("width", d => innerWidth - volScale(d))
      .attr("fill", "red")
      .attr("stroke", "black")
      .attr("stroke-width", function() {
        return this.getAttribute("height") / 10;
      });



    let tickLinePath = chartWindow.selectAll("path").data([timePriceData]);
    tickLinePath.exit().remove();

    tickLinePath
      .enter()
      .append("path")
      .merge(tickLinePath)
      .attr('stroke-width', '3')
      .attr("class", "tickPriceLine") 
      .attr("d", lineFn(timePriceData)); 


  };

  useEffect(() => {
    if (!initChart) {
      setupChart();
    }
    draw();
  });
  if (!priceMax || !priceMin)
    return <div className="not-available white">Not enough Data to make chart</div>;

  return (
    <svg
      ref={chartRef}
      width={width}
      height={height}
      className="svgChart"
    ></svg>
  );
}

export default HorizontalHistogram;
