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

  let timeAxis = axisBottom(timeScale).ticks(3);

  let priceAxis = axisRight(priceScale).ticks(4);

  const setupChart = () => {
    if (!chartRef.current) return;
    console.log({intradayData})


    let priceMax = max(intradayData, d=>d.high)
    let priceMin = max(intradayData, d=>d.low)

    let [timeMin, timeMax] = extent(intradayData.map(({timestamp})=>timestamp));
    timeScale.domain([timeMin, timeMax]);

    priceScale.domain([priceMin - 0.25, priceMax + 0.25]);
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

    timeScale.domain([timeMin, timeMax]);

    priceScale.domain([priceMin - 1, priceMax + 1]);
    // get the SVG element
    let svg = select(chartRef.current);

    svg.select(".timeAxis").call(timeAxis);
    svg.select(".priceAxis").call(priceAxis);
  };
  useEffect(() => {
    console.log('load')
    //66.8.204.49
    fetch(`${process.env.REACT_APP_STOCK_DATA_URL}/back_data/intraday/ES`).then(async res=>{
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
