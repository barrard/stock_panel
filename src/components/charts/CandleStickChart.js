import React, { useRef, useEffect, useState } from "react";
import { axisBottom, axisRight } from "d3-axis";

import { scaleLinear, scaleTime } from "d3-scale";
import { extent, max, min } from "d3-array";
import { select } from "d3-selection";
import diff from "../extrema.js";

const margin = {
  top: 15,
  right: 40,
  bottom: 20,
  left: 35
};

function CandleStickChart({ width, height, timeframe }) {
  const chartRef = useRef();
  const [initChart, setInitChart] = useState(false);
  const [OHLCdata, setOHLCdata] = useState([])

  const innerWidth = width - (margin.left + margin.right);

  const innerHeight = height - (margin.top + margin.bottom);



  const timeScale = scaleTime().range([0, innerWidth]);

  const priceScale = scaleLinear().range([innerHeight, 0]);

  const candleHeightScale = scaleLinear()
    .range([0, innerHeight]);

  let timeAxis = axisBottom(timeScale).ticks(5).tickSize(-innerHeight);

  let priceAxis = axisRight(priceScale).ticks(8).tickSize(-innerWidth);

  const setupChart = () => {
    if (!chartRef.current) return;
    console.log({ OHLCdata })


    let svg = select(chartRef.current);

    dropShadow(svg)

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

  const timestamps = OHLCdata.map(d => d.timestamp)
  const highs = OHLCdata.map(d => d.high)
  const lows = OHLCdata.map(d => d.low)
  const closes = OHLCdata.map(d => d.close)
  const opens = OHLCdata.map(d => d.open)
  const minMaxValues = {
    minValues: [],
    maxValues: []
  }

  const addHighLowMarkers = () => {
console.log(highs)
    appendMinmaxMarkers(highs, 'high', 'green', 'red', 5, true, true)
    appendMinmaxMarkers(lows, 'low', 'green', 'red', 10, true, true)
    appendMinmaxMarkers(opens, 'open', 'green', 'red', 10, true, true)
    appendMinmaxMarkers(closes, 'close', 'green', 'red', 10, true, true)
  }


  const appendMinmaxMarkers = (data, name, minColor, maxColor, tolerance, min, max) => {
    let svg = select(chartRef.current);
    let chartWindow = svg.select(".chartWindow");

    let { minValues, maxValues } = diff.minMax(
      timestamps,
      data,
      tolerance
    );

    if (max) {
      minMaxValues.maxValues = [...minMaxValues.maxValues, ...maxValues];
      let maxMarkers = chartWindow.selectAll(`.max${name}MarkerGroup`).data(maxValues);
      appendMarker(maxMarkers, maxColor, 5, `max${name}MarkerGroup`)
    }

    if (min) {
      minMaxValues.minValues = [...minMaxValues.minValues, ...minValues];
      let minMarkers = chartWindow.selectAll(`.min${name}MarkerGroup`).data(minValues);
      appendMarker(minMarkers, minColor, 5, `min${name}MarkerGroup`)
    }
  }

  const draw = () => {
    if (!OHLCdata.length) return;

    let priceMax = max(OHLCdata, d => d.high)
    let priceMin = min(OHLCdata, d => d.low)
    console.log({
      priceMax,
      priceMin
    })

    let [timeMin, timeMax] = extent(OHLCdata.map(({ timestamp }) => timestamp));
    const priceRange = priceMax - priceMin;

    timeScale.domain([timeMin, timeMax]);
    candleHeightScale.domain([0, priceRange])
    priceScale.domain([priceMin - 1, priceMax + 1]);

    // get the SVG element
    let svg = select(chartRef.current);

    svg.select(".timeAxis").call(timeAxis);
    svg.select(".priceAxis").call(priceAxis);
    let chartWindow = svg.select(".chartWindow");
    let candleWidth = innerWidth / OHLCdata.length
    let candleStrokeWidth = candleWidth / 10
    let halfWidth = candleWidth/2


    // addWicks()
    let candleWicks = chartWindow.selectAll("line").data(OHLCdata);
    candleWicks.exit().remove();
    candleWicks
      .enter()
      .append("line")
      .merge(candleWicks)
      //   .on("mouseover", bubblyEvent)
      //   .on("mousemove", bubblyEvent)
      .attr("x1", (d) => timeScale(d.timestamp) )
      .attr("x2", d => timeScale(d.timestamp) )
      .attr("y1", (d) =>  priceScale(d.low))
      .attr("y2", d => priceScale(d.high))
  
      .attr('stroke', 'black')
      .attr('stroke-width', candleStrokeWidth)
      .on('mouseover', ({open, high, close, low, tradingDay}) => console.log({open, high, close, low, tradingDay}))





    /* CANDLES STICKS */
    let candleSticks = chartWindow.selectAll("rect").data(OHLCdata);
    candleSticks.exit().remove();
    candleSticks
      .enter()
      .append("rect")
      .merge(candleSticks)
      //   .on("mouseover", bubblyEvent)
      //   .on("mousemove", bubblyEvent)
      .attr("x", (d) => timeScale(d.timestamp) - halfWidth)
      .attr("y", d => priceScale(yCandleAccessor(d)))
      .attr("height", d => {
        const h = candleHeightScale(heightCandleAccessor(d));
        if (h === 0) return 1;
        else return h;
      })
      .attr("width", (candleWidth))
      .attr("fill", d => candleFillAccessor(d))
      .attr('stroke', 'black')
      .attr('stroke-width', candleStrokeWidth/2)
      .on('mouseover', ({open, high, close, low, tradingDay}) => console.log({open, high, close, low, tradingDay}))


    addHighLowMarkers()
  };
  useEffect(() => {
    console.log('load')
    //66.8.204.49
    fetch(`http://localhost:45678/back_data/${timeframe}/${timeframe}-ES.json`).then(async res => {
      let json = await res.json()
      console.log(json)
      json.results.forEach(r => r.timestamp = new Date(r.timestamp).getTime())
      //add any missing data with forward fill
      json.results = forwardFill(json.results)
      setOHLCdata(json.results.slice(-70, -50))
      setupChart()
    })

  }, [])
  useEffect(() => {
    console.log('draw candle')
    console.log({ OHLCdata })

    draw();
  });

  function appendMarker(markers, color, r, classAttr) {
    markers.exit().remove();
    markers
      .enter()
      .append("circle")
      .merge(markers)
      .attr("cx", d => timeScale(d.x) )
      .attr("cy", d => priceScale(d.y))
      .attr("r", r)
      .attr("fill", color)
      .attr("class", classAttr)
      .on('mouseover', drawlineThenRotate)
      .on('mouseleave', removeLine)
      .style("filter", "url(#drop-shadow)")

  }

  const LineObj = {}
  const timerObj = {}
  function drawlineThenRotate() {
    let svg = select(chartRef.current);
    let chartWindow = svg.select(".chartWindow");
    let cx = parseFloat(select(this).attr('cx'))
    console.log('mouse')
    console.log(cx)
    if (!LineObj[cx]) {
      LineObj[cx] = chartWindow.append('line')
      .attr('class', 'slopeLine')
    }
    LineObj[cx]
      .style('opacity', 1)

    let { minValues, maxValues } = minMaxValues

    minValues.some((minVal, index) => {
      if (timeScale(minVal.x) == cx) {

        startRotation(LineObj[cx], index, minValues)
        return true

      }
    })
    maxValues.some((maxVal, index) => {
      if (timeScale(maxVal.x) == cx) {

        startRotation(LineObj[cx], index, maxValues)
        return true
      }
    })

  }


  function startRotation(line, index, valuesArray) {
    console.log({valuesArray, line})
    let currentVal = valuesArray[index]
    let nextVal = valuesArray[index + 1]

    let x1 = timeScale(currentVal.x)
    let x2 = timeScale(nextVal.x)
    let y1 = priceScale(currentVal.y)
    let y2 = priceScale(nextVal.y)
    console.log({ x1, x2, y1, y2 })
    line.attr('x1', x1)
    line.attr('x2', x2)
    line.attr('y1', y1)
    line.attr('y2', y2)

  }

  function removeLine() {
    let cx = select(this).attr('cx')
    console.log('leave')
    LineObj[cx].style('opacity', 0)
    // clearInterval(timerObj[cx])

  }

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
  return d.close === d.open ? "black" : d.open > d.close ? "red" : "green";
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



function dropShadow(svg){

  // filters go in defs element
var defs = svg.append("defs");

// create filter with id #drop-shadow
// height=130% so that the shadow is not clipped
var filter = defs.append("filter")
    .attr("id", "drop-shadow")
    .attr("height", "130%");

// SourceAlpha refers to opacity of graphic that this filter will be applied to
// convolve that with a Gaussian with standard deviation 3 and store result
// in blur
filter.append("feGaussianBlur")
    .attr("in", "SourceAlpha")
    .attr("stdDeviation", 3)

// translate output of Gaussian blur to the right and downwards with 2px
// store result in offsetBlur
filter.append("feOffset")
    .attr("dx", 2)
    .attr("dy", 2)
    .attr("result", "offsetBlur");

// Control opacity of shadow filter
var feTransfer = filter.append("feComponentTransfer");

feTransfer.append("feFuncA")
	.attr("type", "linear")
	.attr("slope", 0.2)

// overlay original SourceGraphic over translated blurred opacity by using
// feMerge filter. Order of specifying inputs is important!
var feMerge = filter.append("feMerge");


feMerge.append("feMergeNode")
    .attr("in", "offsetBlur")
feMerge.append("feMergeNode")
    .attr("in", "SourceGraphic");



}


function forwardFill(data){
  //find the time line
  let timeframe = determineTimeFrame(data)
  data = fillMissingData(data, timeframe)
  console.log('================================')
  data = fillMissingData(data, timeframe)
  return data
  
}

function fillMissingData(data, timeframe){
  let missingDataObj={}
  data.forEach((d, i)=>{
  
    if(i === data.length - 1) return
    let diff = data[i+1].timestamp - d.timestamp 
    let today = new Date(d.timestamp)
      let tomorrow = new Date(data[i+1].timestamp)
    // console.log({diff, timeframe})
    if((Math.round(diff/timeframe))!=1){
      // console.log({diff:Math.round(diff/timeframe), today, tomorrow, i, timeframe})
      let lastClose = d.close
        let blankDay = {
          open:lastClose,
          close:lastClose,
          high:lastClose,
          low:lastClose,
          timestamp:d.timestamp + (timeframe),
          volume:0
        }
        missingDataObj[i+1]= blankDay
 

    }
  })
  console.log({timeframe})
  console.log({missingDataObj})
  Object.keys(missingDataObj).reverse().forEach(index=>{
    data.splice(index, 0,  missingDataObj[index])
  })


  return data
}

function determineTimeFrame(data){
  let diffObj ={}
  let prev = 0
  data.forEach((d, i)=>{
    if(i === data.length - 1) return

    let diff = data[i+1].timestamp - d.timestamp 
    if(!diffObj[diff]){
      diffObj[diff] = 0

    }
    diffObj[diff]++
  })

  console.log({diffObj})

  let timeframe;
  let topCount = 0
  for(let timeDiff in diffObj){
    let count = diffObj[timeDiff]
    if(count > topCount) {
      topCount = count
      timeframe = parseInt(timeDiff)
    }
  }
  console.log({timeframe})
  return timeframe
}