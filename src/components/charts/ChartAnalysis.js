import React, { useRef, useEffect, useCallback } from "react";
import { axisBottom, axisRight } from "d3-axis";

import { scaleLinear } from "d3-scale";
import { extent, max } from "d3-array";
import { select } from "d3-selection";

const margin = {
  top: 15,
  right: 40,
  bottom: 20,
  left: 35
};

function TickChart({ data, width, height }) {
  const chartRef = useRef();
  const innerWidth = width - (margin.left + margin.right);
  const innerHeight = height - (margin.top + margin.bottom);

  let [yMin, yMax] = extent(yValues);
  let [xMin, xMax] = extent(xValues);

  const xScale = scaleLinear()
    .range([0, innerWidth])
    .domain([xMax, 0]);

  const yScale = scaleLinear()
    .range([innerHeight, 0])
    .domain([yMin - 1, yMax + 1]);

  let xAxis = axisBottom(xScale).ticks(4);

  let yAxis = axisRight(yScale).ticks(4);

  const draw = () => {
    if (!data) return;
        // get the SVG element
        let svg = select(chartRef.current);
        //append chart window
        let chartWindow = svg
          .append("g")
          //transform the window to the margins
          .attr("transform", `translate(${margin.left},${margin.top})`);
    
        //append xAxis group
        svg
          .append("g")
          .attr("transform", `translate(${margin.left}, ${height - margin.bottom})`)
          .call(xAxis);
        //append yAxis group
        svg
          .append("g")
          .attr("transform", `translate(${width - margin.right}, ${margin.top})`)
          .call(yAxis);
  }



  useEffect(() => {
    draw();
  });



  if (!yMax || !yMin)
  return <div className="not-available">Not enough Data to make chart</div>;

const Chart = () => (
  <svg
    ref={chartRef}
    width={width}
    height={height}
    className="svgChart"
  ></svg>
);

return <Chart />;
}

export default TickChart;

