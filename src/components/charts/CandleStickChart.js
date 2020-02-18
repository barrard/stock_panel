import React, { useRef, useEffect, useState } from "react";
import { axisBottom, axisRight } from "d3-axis";

import { zoom } from "d3-zoom";
import { scaleLinear, scaleTime } from "d3-scale";
import { extent, max, min } from "d3-array";
import { select, event, mouse } from "d3-selection";
import { drag } from "d3-drag";

import diff from "../extrema.js";

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
let useHack

function CandleStickChart({ width, height, timeframe }) {
  const chartRef = useRef();
  const [initChart, setInitChart] = useState(false);
  const [OHLCdata, setOHLCdata] = useState({
    all: [], partial: [], zoomState: 1
  })
  useHack = OHLCdata
  const innerWidth = width - (margin.left + margin.right);

  const innerHeight = height - (margin.top + margin.bottom);



  const timeScale = scaleTime().range([0, innerWidth]);

  const priceScale = scaleLinear().range([innerHeight, 0]);

  const candleHeightScale = scaleLinear()
    .range([0, innerHeight]);

  let timeAxis = axisBottom(timeScale).ticks(5).tickSize(-innerHeight);

  let priceAxis = axisRight(priceScale).ticks(8).tickSize(-innerWidth);



  useEffect(() => {
    console.log('load')
    //66.8.204.49
    fetch(`http://localhost:45678/back_data/${timeframe}/${timeframe}-ES.json`).then(async res => {
      let json = await res.json()
      console.log(json)
      json.results.forEach(r => r.timestamp = new Date(r.timestamp).getTime())
      //add any missing data with forward fill
      json.results = forwardFill(json.results)
      setOHLCdata({

        all: json.results,
        partial: json.results
      })
      setupChart()
    })

  }, [])


  useEffect(() => {
    // console.log('draw candle')
    // console.log({ OHLCdata })

    draw();
  });



  const setupChart = () => {
    if (!chartRef.current) return;
    console.log({ OHLCdata })


    let svg = select(chartRef.current);

    dropShadow(svg)


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
      .attr("transform", `translate(${margin.left},${margin.top})`)

    const d3zoom = zoom()
      // .scaleExtent([1, 40])
      .on("zoom", zoomed);

    const d3drag = drag()
      .on("start", dragStart)
      .on("drag", dragged)
      .on("end", dragEnd)

    svg
      .on('mousemove', () => {
        let x = event.pageX - svg.node().getBoundingClientRect().x - margin.left
        let y = event.pageY - svg.node().getBoundingClientRect().y - margin.top
        x = x < 0 ? 0 : x
        y = y < 0 ? 0 : y
        // console.log({ x, y })
        MOUSEX = x
        MOUSEY = y

      })




    function zoomed() {
      let mouseZoomPOS = MOUSEX / innerWidth
      if(mouseZoomPOS > 0.98) mouseZoomPOS = 0.97
      if(mouseZoomPOS < 0.02) mouseZoomPOS = 0.03
      let kScale = event.transform.k
      // console.log({OHLCdata})
      console.log('zoom')

      if (event && event.sourceEvent && event.sourceEvent.type) {
        // console.log(event.sourceEvent.type)
        if (event && event.sourceEvent && event.sourceEvent.type == 'wheel') {
          setOHLCdata(prevData => {
            // console.log(event.sourceEvent)
            let { zoomState } = prevData
            // console.log({prevData})
            // console.log(prevData.partial.length)
            let data = prevData.partial;
            // console.log(event)

            if (kScale > zoomState) {
              if (prevData.partial.length < 30) return {
                ...prevData, zoomState: kScale
              }

              // console.log('zooom in')
              // console.log(prevData.partial.length)
              let firstHalf = prevData.partial.slice(0, prevData.partial.length * mouseZoomPOS + 1)
              let secondHalf = prevData.partial.slice(prevData.partial.length * -(1 - mouseZoomPOS))
              // console.log(firstHalf.length + secondHalf.length)
              // console.log({ firstHalf, secondHalf, mouseZoomPOS })
              let firstHalfCandleZoom = parseInt(firstHalf.length < 10 ? 0 : ((firstHalf.length * .05) || 1))
              let secondHalfCandleZoom = parseInt(secondHalf.length < 11 ? 0 : ((secondHalf.length * .05) || 1))
              firstHalf = firstHalf.slice(firstHalfCandleZoom, firstHalf.length)
              secondHalf = secondHalf.slice(0, (secondHalf.length - 1) - secondHalfCandleZoom)
              // console.log({ firstHalf, secondHalf, firstHalfCandleZoom, secondHalfCandleZoom })
              data = [...firstHalf, ...secondHalf]
            } else {
              let candleZoom = parseInt(prevData.partial.length * .05) || 1

              let first = prevData.partial[0]
              let last = prevData.partial[prevData.partial.length - 1]
              // console.log({ first, last })
              if (!first || !last) return //fail safe?
              let firstIndex = prevData.all.findIndex(d => d.timestamp === first.timestamp)
              let lastIndex = prevData.all.findIndex(d => d.timestamp === last.timestamp)
              // console.log({firstIndex, lastIndex})
              let newFirstData = prevData.all.slice(firstIndex - candleZoom, firstIndex)
              let newLastData = prevData.all.slice(lastIndex, lastIndex + candleZoom)
              // data = prevData.partial.slice(candleZoom, prevData.partial.length -candleZoom)
              data = [...newFirstData, ...prevData.partial, ...newLastData]
            }
            // console.log({candleZoom, data})
            return ({
              ...prevData,
              partial: data,
              zoomState: kScale
            })
          })
        }
        // else if(event.sourceEvent.type == 'mousemove'){
        //   let x = event.transform.x
        //   let y = event.transform.y
        //   console.log({x, y})

        // }
      }

    }

    svg.call(d3drag)//breaks if this is not first

    svg.call(d3zoom)//needs to be after drag

    function dragStart() {
      // console.log('dragStart')
      let xDragPOS = event.x - margin.left
      mouseDRAGSART = xDragPOS
      dragStartData = [...useHack.partial]
    }
    function dragged() {
      let xDragPOS = event.x - margin.left
      let dragAmount = Math.abs(xDragPOS - mouseDRAGSART)
      let barWidth = innerWidth / dragStartData.length 
      let barCount = parseInt(dragAmount/barWidth)
      if(barCount < 1) return
      if(lastBarCount === barCount)return
      lastBarCount = barCount
      console.log('dragged')
      console.log({barCount})
      // console.log({x:xDragPOS,mouseDRAGSART, dragAmount, barWidth, barCount, useHack, dragStartData})

       // console.log()
       let start = dragStartData[0]
       let end = dragStartData[dragStartData.length-1]
       let startIndex = useHack.all.findIndex(d=>d.timestamp===start.timestamp)
       let endIndex = useHack.all.findIndex(d=>d.timestamp===end.timestamp)
      //  console.log({end:end.timestamp})

      let data;
      if(xDragPOS > mouseDRAGSART){
        // console.log('omving righ')
 
        let dataEnd = dragStartData.slice(0, dragStartData.length-1 - barCount)
        let dataStart = useHack.all.slice(startIndex-barCount, startIndex)
        // console.log({startIndex, barCount, dataStart})
        // console.log(dataStart[0].timestamp)
        data = [...dataStart, ...dataEnd]
        // draw(data)
        setOHLCdata(prevData=>{

          return ({
            ...prevData,
            partial: data,
          })
        })
      }else if(xDragPOS < mouseDRAGSART){
       // console.log('omving righ')
 
       let dataStart = dragStartData.slice(barCount, dragStartData.length-1)
       let dataEnd = useHack.all.slice(endIndex, endIndex + barCount)
      //  console.log({startIndex, barCount, dataStart})
      //  console.log(dataStart[0].timestamp)
       data = [...dataStart, ...dataEnd]
      //  draw(data)

       setOHLCdata(prevData=>{

         return ({
           ...prevData,
           partial: data,
         })
       })



      }

    }
    function dragEnd() {
      console.log('dragEnd')
      // console.log({x:event.x - margin.left,MOUSEX})
    }



    setInitChart(true);
  };
  // console.log(OHLCdata)
  if (!OHLCdata) OHLCdata.all = []
  const timestamps = OHLCdata.all.map(d => d.timestamp)
  const highs = OHLCdata.all.map(d => d.high)
  const lows = OHLCdata.all.map(d => d.low)
  const closes = OHLCdata.all.map(d => d.close)
  const opens = OHLCdata.all.map(d => d.open)
  const minMaxValues = {
    minValues: [],
    maxValues: []
  }

  const addHighLowMarkers = () => {
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

  const draw = (data) => {
    let drawData
    if(data){
      drawData = data
    }else{
      drawData = OHLCdata.partial
    }
    if (!drawData.length) return;

    let priceMax = max(drawData, d => d.high)
    let priceMin = min(drawData, d => d.low)
    // console.log({
    //   priceMax,
    //   priceMin
    // })

    let [timeMin, timeMax] = extent(drawData.map(({ timestamp }) => timestamp));
    const priceRange = priceMax - priceMin;
    let timeframe = drawData[1].timestamp - drawData[0].timestamp
    //  This helps the bars at the ends line up with the edge of the chart
    timeScale.domain([timeMin - (timeframe / 2), timeMax + (timeframe / 2)]);
    candleHeightScale.domain([0, priceRange])
    priceScale.domain([priceMin, priceMax]);

    // get the SVG element
    let svg = select(chartRef.current);

    svg.select(".timeAxis").call(timeAxis);
    svg.select(".priceAxis").call(priceAxis);
    let chartWindow = svg.select(".chartWindow");
    let candleWidth = innerWidth / drawData.length
    let candleStrokeWidth = candleWidth / 10
    let halfWidth = candleWidth / 2


    // addWicks()
    let candleWicks = chartWindow.selectAll("line").data(drawData);
    candleWicks.exit().remove();
    candleWicks
      .enter()
      .append("line")
      .merge(candleWicks)
      //   .on("mouseover", bubblyEvent)
      //   .on("mousemove", bubblyEvent)
      .attr("x1", (d) => timeScale(d.timestamp))
      .attr("x2", d => timeScale(d.timestamp))
      .attr("y1", (d) => priceScale(d.low))
      .attr("y2", d => priceScale(d.high))

      .attr('stroke', 'black')
      .attr('stroke-width', candleStrokeWidth)
      .on('mouseover', ({ open, high, close, low, tradingDay }) => console.log({ open, high, close, low, tradingDay }))


    /* CANDLES STICKS */
    let candleSticks = chartWindow.selectAll(".candleStick").data(drawData);
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
      .attr('stroke-width', candleStrokeWidth / 2)
      .on('mouseover', ({ open, high, close, low, tradingDay }) => console.log({ open, high, close, low, tradingDay }))
      .attr('class', 'candleStick')


    addHighLowMarkers()
  };


  function appendMarker(markers, color, r, classAttr) {
    markers.exit().remove();
    markers
      .enter()
      .append("circle")
      .merge(markers)
      .attr("cx", d => timeScale(d.x))
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
    console.log({ valuesArray, line })
    let currentVal = valuesArray[index]
    let nextVal = valuesArray[index + 1]
    if (!nextVal || !currentVal) return console.log('No next val')
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
    if (!LineObj[cx]) return //fail safe?
    LineObj[cx].style('opacity', 0)
    // clearInterval(timerObj[cx])

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



function dropShadow(svg) {

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


function forwardFill(data) {
  //find the time line
  // console.log({data})
  let timeframe = determineTimeFrame(data)
  data = fillMissingData(data, timeframe)
  // console.log('================================')
  // data = fillMissingData(data, timeframe)
  // console.log({data})
  return data

}

function fillMissingData(data, timeframe) {
  let missingDataObj = {}
  data.forEach((d, i) => {

    if (i === data.length - 1) return
    let diff = data[i + 1].timestamp - d.timestamp
    let today = new Date(d.timestamp)
    let tomorrow = new Date(data[i + 1].timestamp)
    // console.log({diff, timeframe})
    // console.log({i, diff:Math.round(diff / timeframe), today, tomorrow})
    if ((Math.round(diff / timeframe)) != 1) {
      // console.log({ diff: Math.round(diff / timeframe), today, tomorrow, i, timeframe })
      let lastClose = d.close
      let blankDay = {
        open: lastClose,
        close: lastClose,
        high: lastClose,
        low: lastClose,
        timestamp: d.timestamp + (timeframe),
        volume: 0,
        count: Math.round(diff / timeframe) - 1
      }
      missingDataObj[i + 1] = blankDay


    }
  })
  // console.log({ timeframe })
  // console.log({ missingDataObj })
  Object.keys(missingDataObj).reverse().forEach(index => {
    let { count } = missingDataObj[index]
    delete missingDataObj[index].count
    for (let x = 0; x < count; x++) {
      let timestamp = data[index - 1].timestamp + (timeframe * (count - x))
      data.splice(index, 0, { ...missingDataObj[index], timestamp })
    }
  })


  return data
}

function determineTimeFrame(data) {
  let diffObj = {}
  let prev = 0
  data.forEach((d, i) => {
    if (i === data.length - 1) return

    let diff = data[i + 1].timestamp - d.timestamp
    if (!diffObj[diff]) {
      diffObj[diff] = 0

    }
    diffObj[diff]++
  })

  // console.log({ diffObj })

  let timeframe;
  let topCount = 0
  for (let timeDiff in diffObj) {
    let count = diffObj[timeDiff]
    if (count > topCount) {
      topCount = count
      timeframe = parseInt(timeDiff)
    }
  }
  // console.log({ timeframe })
  return timeframe
}