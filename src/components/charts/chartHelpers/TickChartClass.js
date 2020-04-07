import React from "react";
import { connect } from "react-redux";
import { toastr } from "react-redux-toastr";
//import { withRouter } from 'next/router';
import { Link, withRouter } from "react-router-dom";
import styled from "styled-components";
import { axisBottom, axisRight, axisLeft, axisTop } from "d3-axis";
import { zoom } from "d3-zoom";
import { drag } from "d3-drag";

import { scaleLinear, scaleTime } from "d3-scale";
import { extent, max } from "d3-array";
import { select, event, mouse } from "d3-selection";
import { line } from "d3-shape";

import { doZoomIn, doZoomOut } from "./utils.js";
import { drawAxisAnnotation, removeAllAxisAnnotations } from "./chartAxis.js";
import {appendMinMaxMarkers, runMinMax} from './ChartMarkers/HighLowMarks.js'
import {appendRegressionLines} from './ChartMarkers/RegressionLines.js'
const margin = {
  top: 35,
  right: 60,
  bottom: 20,
  left: 100,
};

let MOUSEX = 0;
let MOUSEY = 0;
let mouseDRAGSART = null;
let dragStartData = [];
let lastBarCount = null;
let partialOHLCdata = [];
let zoomState = 1;

//import Main_Layout from '../layouts/Main_Layout.js';
class TickChart extends React.Component {
  constructor(props) {
    super(props);
    let { height, width, data, volumePriceProfile } = props;
    let innerHeight = height - (margin.top + margin.bottom);
    let innerWidth = width - (margin.left + margin.right);
    this.state = {
      chartRef: React.createRef(),
      initChart: false,
      innerWidth: innerWidth,
      innerHeight: innerHeight,
      timeScale: scaleTime().range([0, innerWidth]),

      priceScale: scaleLinear().range([innerHeight, 0]).nice(),
      volProfileScale: scaleLinear().range([0, innerWidth]),
      volScale: scaleLinear().range([innerHeight, 0]).nice(),
      data,
      timestamps: [],
      volumePriceProfile,
      visibleIndicators:{
        minMaxMarkers:true, regressionLines:true
      }
    };
  }

  componentDidMount() {
    console.log("TICK CHART");
    // console.log(this.state)
    // let svg = select(this.state.chartRef.current);

    // console.log(svg.select(".timeAxis"))
    this.setupChart();
  }

  componentDidUpdate(prevPops, prevState) {
    //   console.log(prevPops)
    this.didDataUpdate(prevPops);
    this.didTickDataUpdate(prevPops);
  }

  didTickDataUpdate(prevPops) {
    //FIRST CHECK IF NEW TICK DATA IS HERE
    if (prevPops.currentTickData != this.props.currentTickData) {
      
      // let currentTickData = this.props.currentTickData.priceChangeData;
      let { priceChangeData, volumePriceProfile } = this.props.currentTickData;
      
      /**
       * this is to check the state ofthe full data 
       * compared to tha partial data (draw data)
       * so we know if we shoudl also append the data to the drawData
       */
      let lastPartialDataTickTime = partialOHLCdata.slice(-1)[0].timestamp;
      let lastDataTickTime = this.state.data[this.state.data.length - 1].timestamp;

      
      //FIND INDEX WHERE WE NEED TO GET CURRENT TICK DATA
      let newTickDataIndex = priceChangeData.findIndex((tickData) => {
        return tickData.timestamp === lastDataTickTime;
      });
      let newData;
      let newTicks
      //EITHER ADD ALL
      if (newTickDataIndex < 0) {
        newTicks = priceChangeData;
        // console.log({newTicks})
        this.appendNewTicksToVolProfile(newTicks);
        
        // partialOHLCdata = [...partialOHLCdata, ...newTicks];
        // newData = [...this.state.data, ...priceChangeData]
        //OR ADD SLICED
      } else {
        //Slice it
        newTicks = priceChangeData.slice(newTickDataIndex + 1);
        // console.log({newTicks})
        this.appendNewTicksToVolProfile(newTicks);
        // newData= [...this.state.data, ...newTicks]
      }
      // console.log({lastPartialDataTickTime, lastDataTickTime})
      if(lastPartialDataTickTime === lastDataTickTime){
        // console.log('also add to partial')
        partialOHLCdata = [...partialOHLCdata, ...newTicks];

      }
      let timestamps = partialOHLCdata.map(d => d.timestamp);

      newData = [...this.state.data, ...newTicks]
          this.setState({
            timestamps,
            data:newData
          });
      setTimeout(() => this.draw(), 0);
    }
  }

  appendNewTicksToVolProfile(newTicks) {
    // console.log(newTicks);
    // console.log(this.props.volumePriceProfile);
    let lastTick;
    newTicks.forEach((tick, i) => {
      if (i === 0) {
        //use the lastTick for reference as to if we went down up or stayed the same
        lastTick = this.state.data.slice(-1)[0];
      } else {
        let lastTick = newTicks[i - 1];
      }
      let { volumePriceProfile } = this.state;

      if (!volumePriceProfile[tick.price])
        volumePriceProfile[tick.price] = { up: 0, down: 0, neutral: 0 };
      // console.log({ lastTick, tick });
      if (lastTick.price < tick.price) {
        volumePriceProfile[tick.price]["up"] += tick.volumeChange;
      } else if (lastTick.price > tick.price) {
        volumePriceProfile[tick.price]["down"] += tick.volumeChange;
      } else if (lastTick.price === tick.price) {
        volumePriceProfile[tick.price]["neutral"] += tick.volumeChange;
      }
      this.setState({ volumePriceProfile });
    });
  }
  didDataUpdate(prevPops) {
    let prevData = prevPops.data;
    let data = this.props.data;
    // console.log(prevData)
    // console.log(data)
    if (prevData != data) {
      let { volumePriceProfile } = this.props;
      // console.log("TICK CHART UPDATE DATA");
      // console.log(this.props.currentTickData);
      // console.log(data);
      partialOHLCdata = data;
      let timestamps = data.map((d) => d.timestamp);
      // console.log({ timestamps });
      this.setState({
        data,
        timestamps,
        volumePriceProfile,
      });
      setTimeout(() => this.setupChart(), 0);
    }
  }
  lineFn() {
    let that = this;
    return line()
      .x(function (d) {
        return that.state.timeScale(d.timestamp);
      })
      .y(function (d) {
        return that.state.priceScale(d.price);
      });
  }

  appendAxisAnnotations(x, y, svg) {
    /* Candle stick is the top candleStickWindowHeight */
    // drawAxisAnnotation(topOpts, x);
    drawAxisAnnotation("topVolProfileTag", this.state.volProfileScale, x, svg);
    drawAxisAnnotation("bottomTimeTag", this.state.timeScale, x, svg);
    // if (y < candleStickWindowHeight) {
    // drawAxisAnnotation(leftOpts, y);
    drawAxisAnnotation("rightPriceTag", this.state.priceScale, y, svg);
    drawAxisAnnotation("leftVolTag", this.state.volScale, y, svg);
    // removeVolumeAxisAnnotations();
    // } else if (y > candleStickWindowHeight) {
    //   y = y - candleStickWindowHeight;
    //   drawAxisAnnotation(leftVolOpts, y);
    //   drawAxisAnnotation(rightVolOpts, y);
    //   removePriceAxisAnnotations();
    // }
  }

  zoomed() {
    if (!partialOHLCdata) return;

    let mouseZoomPOS = MOUSEX / this.state.innerWidth;
    //    let mouseZoomPOS = this.state.MOUSEX / this.state.innerWidth;
    if (mouseZoomPOS > 0.98) mouseZoomPOS = 0.97;
    if (mouseZoomPOS < 0.02) mouseZoomPOS = 0.03;
    let kScale = event.transform.k;

    if (event && event.sourceEvent && event.sourceEvent.type == "wheel") {
      let data = partialOHLCdata;

      if (kScale > zoomState) {
        if (partialOHLCdata.length < 30) {
          zoomState = kScale;

          return this.draw();
        }
        data = doZoomIn({ partialOHLCdata: partialOHLCdata }, mouseZoomPOS);
      } else if (kScale < zoomState) {
        data = doZoomOut({
          allOHLCdata: this.state.data,
          partialOHLCdata: partialOHLCdata,
        });
      }

      zoomState = kScale;
      partialOHLCdata = data;
      return this.draw();
    }
  }

  dragStart() {
    if (!partialOHLCdata) return console.log("FUUCK NO PARTIAL DAATT?");
    mouseDRAGSART = event.x - margin.left;
    dragStartData = [...partialOHLCdata];
  }
  dragged() {
    let xDragPOS = event.x - margin.left;
    let dragAmount = Math.abs(xDragPOS - mouseDRAGSART);
    let barWidth = this.state.innerWidth / dragStartData.length;
    let barCount = parseInt(dragAmount / barWidth);
    if (barCount < 1) return;
    if (lastBarCount === barCount) return;
    lastBarCount = barCount;
    // console.log("dragged");
    let data;
    if (xDragPOS > mouseDRAGSART) {
      // console.log('right')
      let start = dragStartData[0];
      let startIndex = this.state.data.findIndex(
        (d) => d.timestamp === start.timestamp
      );
      // console.log({startIndex, barCount})
      let dataEnd = dragStartData.slice(0, dragStartData.length - 1 - barCount);
      let zeroOrGreater = startIndex - barCount < 0 ? 0 : startIndex - barCount;
      let dataStart = this.state.data.slice(zeroOrGreater, startIndex);
      //   console.log({
      //     dataEnd,
      //     zeroOrGreater,
      //     dataStart,
      //     dragStartData,
      //     barCount,
      //     startIndex,
      //     start
      //   });
      data = [...dataStart, ...dataEnd];
    } else if (xDragPOS < mouseDRAGSART) {
      //console.log("left");
      let end = dragStartData[dragStartData.length - 1];
      let endIndex = this.state.data.findIndex(
        (d) => d.timestamp === end.timestamp
      );
      let dataStart = dragStartData.slice(barCount, dragStartData.length - 1);
      let dataEnd = this.state.data.slice(endIndex, endIndex + barCount);
      data = [...dataStart, ...dataEnd];
    }
    // console.log({ data });

    // this.setState({
    partialOHLCdata = data;
    // });

    return this.draw();
  }
  dragEnd() {
    // console.log("dragEnd");
    // console.log({x:event.x - margin.left,MOUSEX})
  }

  setupChart() {
    // console.log("set up cart");
    if (!this.state.chartRef.current) return;
    // console.log("chart ref is defined");
    let that = this;
    let svg = select(this.state.chartRef.current);
    svg.selectAll("*").remove();

    let volProfileAxis = axisTop(this.state.volProfileScale).ticks(4);

    let timeAxis = axisBottom(this.state.timeScale)
      .ticks(4)
      .tickSize(-this.state.innerHeight);

    let priceAxis = axisRight(this.state.priceScale)
      .ticks(4)
      .tickSize(-this.state.innerWidth);

    let volAxis = axisLeft(this.state.volScale).ticks(4);

    //append timeAxis group
    let timeAxisG = svg
      .append("g")
      .attr("class", "white timeAxis")
      .attr(
        "transform",
        `translate(${margin.left}, ${this.props.height - margin.bottom})`
      )
      .call(timeAxis);

    timeAxisG
      .append("path")
      .attr("id", `bottomTimeTag`)
      // .attr("stroke", "blue")
      .attr("stroke-width", 2);
    timeAxisG.append("text").attr("id", `bottomTimeTagText`);

    //append volProfileAxis group
    let volProfileAxisG = svg
      .append("g")
      .attr("class", "white volProfileAxis")
      .attr("transform", `translate(${margin.left}, ${margin.top})`)

      .call(volProfileAxis);
    volProfileAxisG
      .append("path")
      .attr("id", `topVolProfileTag`)
      // .attr("stroke", "blue")
      .attr("stroke-width", 2);
    volProfileAxisG.append("text").attr("id", `topVolProfileTagText`);

    //append priceAxis group
    let priceAxisG = svg
      .append("g")
      .attr("class", "white priceAxis")
      .attr(
        "transform",
        `translate(${this.props.width - margin.right}, ${margin.top})`
      )
      .call(priceAxis);

    //append the crosshair marker
    priceAxisG
      .append("path")
      .attr("id", `rightPriceTag`)
      // .attr("stroke", "blue")
      .attr("stroke-width", 2);
    priceAxisG.append("text").attr("id", `rightPriceTagText`);

    //appand volAxis
    let volAxisG = svg
      .append("g")
      .attr("class", "white volAxis")
      .attr("transform", `translate(${margin.left}, ${margin.top})`)
      .call(volAxis);

    //append the crosshair marker
    volAxisG
      .append("path")
      .attr("id", `leftVolTag`)
      // .attr("stroke", "blue")
      .attr("stroke-width", 2);
    volAxisG.append("text").attr("id", `leftVolTagText`);

    let chartWindow = svg
      .append("g")
      .attr("class", "chartWindow")
      .attr("transform", `translate(${margin.left},${margin.top})`)
      .attr("fill", "black");

    /* CrossHair */
    // create crosshairs
    var crosshair = chartWindow.append("g").attr("class", "line");
    // create vertical line
    crosshair
      .append("line")
      .attr("id", "crosshairX")
      .attr("class", "crosshair");

    // create horizontal line
    crosshair
      .append("line")
      .attr("id", "crosshairY")
      .attr("class", "crosshair");

    chartWindow
      .append("rect")
      .attr("class", "overlay")

      .attr("height", this.state.innerHeight)
      .attr("width", this.state.innerWidth)
      .on("mouseover", function () {
        crosshair.style("display", null);
      })
      .on("mouseout", function () {
        // crosshair.style("display", "none");
        removeAllAxisAnnotations(svg);
      })
      .on("mousemove", function () {
        return mousemove(that, this);
      });

    function mousemove(otherThat, that) {
      let _mouse = mouse(that);
      //   console.log(_mouse);
      // otherThat.setState({
      MOUSEX = _mouse[0];
      MOUSEY = _mouse[1];
      otherThat.appendAxisAnnotations(
        // otherThat.state.MOUSEX,
        // otherThat.state.MOUSEY,
        MOUSEX,
        MOUSEY,
        svg
      );
      // });

      // let mouseDate = otherThat.state.timeScale.invert(MOUSEX);
      crosshair
        .select("#crosshairX")
        .attr("x1", MOUSEX)
        // .attr("x1", otherThat.state.MOUSEX)
        .attr("y1", 0)
        .attr("x2", MOUSEX)
        // .attr("x2", otherThat.state.MOUSEX)
        .attr("y2", otherThat.state.innerHeight);

      crosshair
        .select("#crosshairY")
        .attr("x1", otherThat.state.timeScale(otherThat.state.timestamps[0]))
        .attr("y1", MOUSEY)
        // .attr("y1", otherThat.state.MOUSEY)
        .attr(
          "x2",
          otherThat.state.timeScale(
            otherThat.state.timestamps[otherThat.state.timestamps.length - 1]
          )
        )
        .attr("y2", () => MOUSEY);
      // .attr("y2", otherThat.state.MOUSEY);
    }

    const d3zoom = zoom()
      // .scaleExtent([1, 40])
      .on("zoom", function () {
        return that.zoomed();
      });

    const d3drag = drag()
      .on("start", function () {
        return that.dragStart();
      })
      .on("drag", function () {
        return that.dragged();
      })
      .on("end", function () {
        return that.dragEnd();
      });

    chartWindow.call(d3drag); //breaks if this is not first
    chartWindow.call(d3zoom); //needs to be after drag
    this.setState({
      timeAxis,
      priceAxis,
      volAxis,
      volProfileAxis,
    });
    this.draw();
    // setTimeout(() => , 0);
  }

  draw(data) {
    // console.log("Heavy tick chart redraw");
    let drawData;
    if (data) {
      drawData = data;
    } else {
      drawData = partialOHLCdata;
    }
    if (!drawData || !drawData.length || drawData.length < 2) return;

    let volPriceKeys = Array.from(Object.keys(this.state.volumePriceProfile));
    // console.log({volPriceKeys})
    let prices = drawData.map((d) => d.price);
    let volValues = drawData.map((d) => d.volumeChange);
    let [timeMin, timeMax] = extent(drawData.map(({ timestamp }) => timestamp));
    let [volMin, volMax] = extent(volValues);

    let [priceMin, priceMax] = extent(prices);
    // console.log(volPriceKeys.length)

    volPriceKeys = volPriceKeys.filter((v) => v >= priceMin && v <= priceMax);
    volPriceKeys = volPriceKeys.map((v) => +v);
    let volProfileValues = volPriceKeys.map(
      (volPriceKey) => this.state.volumePriceProfile[volPriceKey]
    );
    // console.log({ volProfileValues });
    let rawVolProfileValues = volProfileValues.map(
      ({ up, down, neutral }) => up + down + neutral
    );
    let [volProfileMin, volProfileMax] = extent(rawVolProfileValues);
    // console.log({ rawVolProfileValues, volProfileMax });

    // console.log({volPriceKeys, volProfileValues, volProfileMax})
    // let [volPriceKeysMin, volPriceKeysMax] = extent(volPriceKeys);
    // console.log({prices})
    this.state.timeScale.domain([timeMin, timeMax]);

    this.state.priceScale.domain([
      priceMin - this.props.tickSize,
      priceMax + this.props.tickSize,
    ]);
    if (!this.state.timeAxis) return;
    this.state.volScale.domain([0, volMax]);
    this.state.volProfileScale.domain([volProfileMax, 0]);
    let svg = select(this.state.chartRef.current);

    //append timeAxis group
    svg.select(".timeAxis").call(this.state.timeAxis);
    //append priceAxis group
    svg.select(".priceAxis").call(this.state.priceAxis);

    //append volAxis
    svg.select(".volAxis").call(this.state.volAxis);
    svg.select(".volProfileAxis").call(this.state.volProfileAxis);

    let chartWindow = svg.select(".chartWindow");
    //ensure we draw a new line to be on top da other lines
    chartWindow.selectAll(".tickPriceLine").remove();

    //NEUTRAL VOLUME PROFILE
    let volProfileBarsNeutral = chartWindow
      .selectAll(".volProfileBarNeutral")
      .data(volProfileValues);
    // console.log({ volProfileValues });
    volProfileBarsNeutral.exit().remove();
    volProfileBarsNeutral
      .enter()
      .append("rect")
      .merge(volProfileBarsNeutral)
      .attr("class", "volProfileBarNeutral")
      .attr("x", ({ up, down, neutral }) =>
        this.state.volProfileScale(up + down + neutral)
      )
      .attr("y", (_, i) =>
        this.state.priceScale(volPriceKeys[i] + this.props.tickSize / 2)
      )
      .attr("height", (_, i) => {
        let h =
          this.state.priceScale(volPriceKeys[i]) -
          this.state.priceScale(volPriceKeys[i] + this.props.tickSize);
        if (h < 0)
          console.log(`${volPriceKeys[i]} is less that 0 at index ${i}`);
        return h;
      })
      .attr("pointer-events", "none")

      .attr("opacity", 0.3)
      .attr(
        "width",
        ({ up, down, neutral }) =>
          this.state.innerWidth -
          this.state.volProfileScale(up + down + neutral)
      )
      .attr("fill", "grey")
      .attr("stroke", "black")
      .attr("stroke-width", function () {
        return this.getAttribute("height") / 10;
      });

    //DOWN VOLUME PROFILE
    let volProfileBarsDown = chartWindow
      .selectAll(".volProfileBarDown")
      .data(volProfileValues);
    //   console.log({volProfileValues})
    volProfileBarsDown.exit().remove();
    volProfileBarsDown
      .enter()
      .append("rect")
      .merge(volProfileBarsDown)
      .attr("class", "volProfileBarDown")
      .attr("x", ({ up, down }) => this.state.volProfileScale(up + down))
      .attr("y", (_, i) =>
        this.state.priceScale(volPriceKeys[i] + this.props.tickSize / 2)
      )
      .attr(
        "height",
        (_, i) =>
          this.state.priceScale(volPriceKeys[i]) -
          this.state.priceScale(volPriceKeys[i] + this.props.tickSize)
      )
      .attr("pointer-events", "none")

      .attr("opacity", 0.3)
      .attr(
        "width",
        ({ up, down }, i) =>
          this.state.innerWidth - this.state.volProfileScale(up + down)
      )
      .attr("fill", "red")
      .attr("stroke", "black")
      .attr("stroke-width", function () {
        return this.getAttribute("height") / 10;
      });

    //UP VOL PROFILE
    let volProfileBarsUp = chartWindow
      .selectAll(".volProfileBarUp")
      .data(volProfileValues);
    //   console.log({volProfileValues})
    volProfileBarsUp.exit().remove();
    volProfileBarsUp
      .enter()
      .append("rect")
      .merge(volProfileBarsUp)
      .attr("class", "volProfileBarUp")
      .attr("x", ({ up }) => this.state.volProfileScale(up))
      .attr("y", (_, i) =>
        this.state.priceScale(volPriceKeys[i] + this.props.tickSize / 2)
      )
      .attr("height", (_, i) => {
        let h =
          this.state.priceScale(volPriceKeys[i]) -
          this.state.priceScale(volPriceKeys[i] + this.props.tickSize);
        if (h < 0)
          console.log(`${volPriceKeys[i]} is less that 0 at index ${i}`);
        return h;
      })
      .attr("pointer-events", "none")

      .attr("opacity", 0.6)
      .attr(
        "width",
        ({ up }) => this.state.innerWidth - this.state.volProfileScale(up)
      )
      .attr("fill", "green")
      .attr("stroke", "black")
      .attr("stroke-width", function () {
        return this.getAttribute("height") / 10;
      });

    let barWidth = this.state.innerWidth / partialOHLCdata.length;
    let strokeWidth = barWidth / 10;
    let volRects = chartWindow.selectAll(".tickVolume").data(this.state.data);
    /**
     * volumeChange: 42
price: 2479
timestamp: 1585947527586
priceChange: -0.25
TOTAL_NEUTRAL_VOLUME: 45752
TOTAL_UP_VOL: 187350
TOTAL_DOWN_VOL: 174893
     */
    volRects.exit().remove();
    volRects
      .enter()
      .append("rect")
      .merge(volRects)
      .attr("class", "tickVolume")
      .attr(
        "x",
        (d) =>
          this.state.timeScale(d.timestamp) -
          this.state.innerWidth / this.state.data.length / 2
      )
      .attr("y", (d) => this.state.volScale(d.volumeChange))
      .attr("height", (d, i) => {
        let h = this.state.innerHeight - this.state.volScale(d.volumeChange);
        if (h < 0) h = 0;
        return h;
      })
      .attr("opacity", 0.5)
      .attr("pointer-events", "none")

      .attr("width", (d, i) => barWidth)
      .attr("fill", (d, i) => {
        if (d.priceChange > 0) return "green";
        if (d.priceChange < 0) return "red";
        else return "grey";
      })
      .attr("stroke", "black")
      .attr("stroke-width", strokeWidth);

    //Draw tick line
    let tickLinePath = chartWindow
      .selectAll(".tickPriceLine")
      .data([this.state.data]);
    tickLinePath.exit().remove();

    tickLinePath
      .enter()
      .append("path")
      .merge(tickLinePath)
      .attr("stroke-color", "white")
      .attr("stroke-width", "2")
      .attr("pointer-events", "none")

      .attr("class", "tickPriceLine") // Assign a class for styling
      .attr("d", this.lineFn()); // 11. Calls the line generator

        let xKey = 'timestamp'
        let yKey = 'price'
        let tolerance = 2
        let minMaxMostRecentData = true
        let {timeScale, priceScale} = this.state
        let scales = {timeScale, priceScale}
      let MinMaxValues = runMinMax(partialOHLCdata,
        xKey,
        yKey,
        tolerance)
        // console.log({MinMaxValues})
      // appendMinMaxMarkers(this, MinMaxValues, scales)
      appendRegressionLines(this, chartWindow,
        this.state.data, {xKey:'timestamp',yKey:'price'},
        200, {xScale:timeScale, yScale:priceScale}, {}
         )
  }
  render() {
    return (
      <div className={this.props.redGreenClass}>
        <svg
          ref={this.state.chartRef}
          width={this.props.width}
          height={this.props.height}
          className="svgChart"
        ></svg>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return state;
}

export default connect(mapStateToProps)(withRouter(TickChart));
