import React, { useState ,useRef, useEffect, useCallback } from "react";
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
  const [chart, setChart] = useState(<></>)
  const chartRef = useRef();
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

  const volScale = scaleLinear()
    .range([0, innerWidth])

  const priceScale = scaleLinear()
    .range([innerHeight, 0])

  const timeScale = scaleTime()
    .range([0, innerWidth])

  let volAxis = axisBottom(volScale).ticks(4);

  let priceAxis = axisRight(priceScale).ticks(4);

  let timeAxis = axisTop(timeScale).ticks(4);

  let lineFn = line()
    .x(function(d, i) {
      return timeScale(d.quote_time);
    }) // set the x values for the line generator
    .y(function(d) {
      return priceScale(d.Price);
    }); // set the y values for the line generator
    useEffect(() => {
   
      console.log('init chart')
      console.log({volMax})
      volScale.domain([volMax, 0]);

      priceScale.domain([priceMin - tickSize, priceMax + tickSize]);
  
      timeScale.domain([timeMin, timeMax]);
          // get the SVG element
    let svg = select(chartRef.current);
    console.log(svg)
    //append chart window
    svg
      .append("g")
      .attr('class', 'chartWindow')
      //transform the window to the margins
      .attr("transform", `translate(${margin.left},${margin.top})`);

    //append timeAxis group
    svg
      .append("g")
      .attr('class', 'timeAxis')
      .attr("transform", `translate(${margin.left}, ${margin.top})`)
      .call(timeAxis);

    //append volAxis group
    svg
      .append("g")
      .attr('class', 'volAxis')
      .attr("transform", `translate(${margin.left}, ${height - margin.bottom})`)
      .call(volAxis);

    //append priceAxis group
    svg
      .append("g")
      .attr('class', 'priceAxis')
      .attr("transform", `translate(${width - margin.right}, ${margin.top})`)
      .call(priceAxis);
      
    }, [])

  const draw = () => {
    if (!volPriceData) return;
    console.log({volPriceData})
    let volValues = Array.from(Object.values(volPriceData));
    let priceValues = Object.keys(volPriceData);
    priceValues = priceValues.map(y => +y);
  
  
    let [priceMin, priceMax] = extent(priceValues);
    let [vMin, volMax] = extent(volValues);
    let [timeMin, timeMax] = extent(timePriceData, d => d.quote_time);
  
    console.log('draw chart')
    console.log({volMax})


    volScale.domain([volMax, 0]);

    priceScale.domain([priceMin - tickSize, priceMax + tickSize]);

    timeScale.domain([timeMin, timeMax]);

    // get the SVG element
    let svg = select(chartRef.current);
    //append chart window
    let chartWindow = svg
      .select( '.chartWindow')
      //transform the window to the margins

    //append timeAxis group
    svg
      .select('.timeAxis')
      .call(timeAxis);

    //append volAxis group
    svg
      .select( '.volAxis')
      .call(volAxis);

    //append priceAxis group
    svg
      .select('.priceAxis')
      .call(priceAxis);

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
      .attr("y", (_, i) => priceScale(priceValues[i] - tickSize / 2))
      .attr(
        "height",
        (_, i) => priceScale(priceValues[i]) - priceScale(priceValues[i] + tickSize)
      )
      .attr("width", d => innerWidth - volScale(d))
      .attr("fill", "red")
      .attr("stroke", "black")
      .attr("stroke-width", function(){
        return this.getAttribute('height')/10
      })
    chartWindow
      .append("path")
      .datum(timePriceData) // 10. Binds data to the line
      .attr("class", "line") // Assign a class for styling
      .attr("d", lineFn); // 11. Calls the line generator
  };

  useEffect(() => {
    draw();
  });
  if (!priceMax || !priceMin)
    return <div className="not-available">Not enough Data to make chart</div>;


  return  {chart} 
}

export default HorizontalHistogram;
