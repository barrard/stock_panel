import React, { useRef, useEffect, useState } from "react";
import { axisBottom, axisRight } from "d3-axis";

import { scaleLinear, scaleTime } from "d3-scale";
import { extent, max, min } from "d3-array";
import { select } from "d3-selection";

const margin = {
  top: 15,
  right: 40,
  bottom: 20,
  left: 35
};

function CandleStickChart({ data, width, height }) {
  const chartRef = useRef();
  const [initChart, setInitChart] = useState(false);
  const [intradayData, setIntradayData] = useState([])

  const innerWidth = width - (margin.left + margin.right);

  const innerHeight = height - (margin.top + margin.bottom);



  const timeScale = scaleTime().range([0, innerWidth]);

  const priceScale = scaleLinear().range([innerHeight, 0]);

  const candleHeightScale = scaleLinear()
//   .domain([0, priceRange])
  .range([0, innerHeight]);

  let timeAxis = axisBottom(timeScale).ticks(3);

  let priceAxis = axisRight(priceScale).ticks(4);

  const setupChart = () => {
    if (!chartRef.current) return;
    console.log({intradayData})


    // let priceMax = max(intradayData, d=>d.high)
    // let priceMin = max(intradayData, d=>d.low)
    // const priceRange = priceMax - priceMin;


    // let [timeMin, timeMax] = extent(intradayData.map(({timestamp})=>timestamp));
    // timeScale.domain([timeMin, timeMax]);

    // priceScale.domain([priceMin - 0.25, priceMax + 0.25]);
    // candleHeightScale.domain([0, priceRange])
    let svg = select(chartRef.current);

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

    setInitChart(true);
  };

  const draw = () => {
    if (!intradayData.length) return;

    let priceMax = max(intradayData, d=>d.high)
    let priceMin = min(intradayData, d=>d.low)
    console.log({priceMax,
        priceMin})
  
    let [timeMin, timeMax] = extent(intradayData.map(({timestamp})=>timestamp));
    const priceRange = priceMax - priceMin;
    timeScale.domain([timeMin, timeMax]);

    candleHeightScale.domain([0, priceRange])

    priceScale.domain([priceMin - 1, priceMax + 1]);
    // get the SVG element
    let svg = select(chartRef.current);

    svg.select(".timeAxis").call(timeAxis);
    svg.select(".priceAxis").call(priceAxis);
    let chartWindow = svg.select(".chartWindow");

        /* CANDLES STICKS */
        let candleSticks = chartWindow.selectAll("rect").data(intradayData);
        candleSticks.exit().remove();
        candleSticks
          .enter()
          .append("rect")
          .merge(candleSticks)
        //   .on("mouseover", bubblyEvent)
        //   .on("mousemove", bubblyEvent)
          .attr("x", (d) => timeScale(d.timestamp))
          .attr("y", d => priceScale(yCandleAccessor(d)))
          .attr("height", d => {
            const h = candleHeightScale(heightCandleAccessor(d));
            if (h === 0) return 1;
            else return h;
          })
          .attr("width", (innerWidth / intradayData.length) - (margin.left + margin.right))
          .attr("fill", d => candleFillAccessor(d));


  };
  useEffect(() => {
    console.log('load')
    //66.8.204.49
    fetch('http://localhost:45678/back_data/intraday/intraday-ES.json').then(async res=>{
        let json = await res.json()
        console.log(json)
        json.results.forEach(r => r.timestamp = new Date(r.timestamp).getTime())
        setIntradayData(json.results)
        setupChart()
    })
    
}, [])
useEffect(() => {
    console.log('draw candle')
    console.log({intradayData})

    draw();
  });


  return (
    <svg
      ref={chartRef}
      width={width}
      height={height}
      className="svgChart"
    ></svg>
  );
}

export default CandleStickChart;



function candleFillAccessor(d) {
    return d.close === d.open ? "black" : d.open > d.close ? "green" : "red";
  }
  
  function heightCandleAccessor(d) {
    const val = Math.abs(d.open - d.close);
    return val;
  }
  
  function yCandleAccessor(d) {
    if (d.open > d.close) return d.open;
    if (d.open < d.close) return d.close;
    return d.close;
  }