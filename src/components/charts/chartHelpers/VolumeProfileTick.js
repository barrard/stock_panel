import React from "react";
import { connect } from "react-redux";
import { toastr } from "react-redux-toastr";
//import { withRouter } from 'next/router';
import { Link, withRouter } from "react-router-dom";
import styled from "styled-components";
import { axisBottom, axisRight, axisLeft } from "d3-axis";
import { zoom } from "d3-zoom";
import { drag } from "d3-drag";

import { scaleLinear, scaleTime } from "d3-scale";
import { extent, max } from "d3-array";
import { select, event, mouse } from "d3-selection";
import { line } from "d3-shape";

import { doZoomIn, doZoomOut } from "./utils.js";
import { drawAxisAnnotation, removeAllAxisAnnotations } from "./chartAxis.js";

const margin = {
    top: 15,
    right: 60,
    bottom: 20,
    left: 100
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
    let { height, width, data } = props;
    let innerHeight = height - (margin.top + margin.bottom);
    let innerWidth = width - (margin.left + margin.right);
    this.state = {
      chartRef: React.createRef(),
      initChart: false,
      innerWidth: innerWidth,
      innerHeight: innerHeight,
      timeScale: scaleTime().range([0, innerWidth]),

      priceScale: scaleLinear()
        .range([innerHeight, 0])
        .nice(),

      volScale: scaleLinear()
        .range([innerHeight, 0])
        .nice(),
      data,
      timestamps: []
    };
  }

  componentDidMount() {
    console.log("TICK CHART");
    // console.log(this.state)
  }

  componentDidUpdate(prevPops, prevState) {
    //   console.log(prevPops)
    let prevData = prevPops.data;
    let data = this.props.data;
    // console.log(prevData)
    // console.log(data)
    if (prevData != data) {
      console.log("TICK CHART UPDATE DATA");
      console.log(data);
      partialOHLCdata = data;
      let timestamps = data.map(d => d.timestamp);
        console.log({timestamps})
      this.setState({
        data,
        timestamps
      });
      setTimeout(() => this.setupChart(), 0);
    }
    if (prevPops.currentTickData != this.props.currentTickData) {
      console.log("New Tick data");
      // let data = this.state.data
      // console.log(this.props.currentTickData.priceChangeData)
      let { priceChangeData } = this.props.currentTickData;
      let newBar = false;
      console.log({ priceChangeData });
      let data = this.state.data;
      console.log(data.length);
      // data.shift()
      console.log(data.length);
      // if(partialOHLCdata) partialOHLCdata.shift()
      data = [...priceChangeData, ...data];
      console.log(data.length);
      this.setState({
        data
      });
      setTimeout(() => this.draw(), 0);
    }
    if (this.props.data != prevPops.data) {
      console.log("DO THIS RUN>");
      partialOHLCdata = this.props.data;
      this.setState({
        data: this.props.data
      });
      setTimeout(() => {
        this.setupChart();
      }, 0);
    }
  }

  lineFn() {
    let that = this;
    return line()
      .x(function(d) {
        return that.state.timeScale(d.timestamp);
      })
      .y(function(d) {
        return that.state.priceScale(d.price);
      });
  }

  appendAxisAnnotations(x, y, svg) {
    /* Candle stick is the top candleStickWindowHeight */
    // drawAxisAnnotation(topOpts, x);
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
          partialOHLCdata: partialOHLCdata
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
        d => d.timestamp === start.timestamp
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
        d => d.timestamp === end.timestamp
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
    if (!this.state.chartRef.current) return;
  
    let that = this;
    let svg = select(this.state.chartRef.current);
    svg.selectAll("*").remove();

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

    //append priceAxis group
    let priceAxisG = svg
      .append("g")
      .attr("class", "white priceAxis")
      .attr(
        "transform",
        `translate(${this.props.width - margin.right}, ${margin.top})`
      )
      .call(priceAxis);
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

    timeAxisG
      .append("path")
      .attr("id", `bottomTimeTag`)
      // .attr("stroke", "blue")
      .attr("stroke-width", 2);
    timeAxisG.append("text").attr("id", `bottomTimeTagText`);

    //append the crosshair marker
    priceAxisG
      .append("path")
      .attr("id", `rightPriceTag`)
      // .attr("stroke", "blue")
      .attr("stroke-width", 2);
    priceAxisG.append("text").attr("id", `rightPriceTagText`);

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
      .on("mouseover", function() {
        crosshair.style("display", null);
      })
      .on("mouseout", function() {
        // crosshair.style("display", "none");
        removeAllAxisAnnotations(svg);
      })
      .on("mousemove", function() {
        // console.log("mousey movey");
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
        .attr("y2", ()=> MOUSEY);
      // .attr("y2", otherThat.state.MOUSEY);
    }

    const d3zoom = zoom()
      // .scaleExtent([1, 40])
      .on("zoom", function() {
        return that.zoomed();
      });

    const d3drag = drag()
      .on("start", function() {
        return that.dragStart();
      })
      .on("drag", function() {
        return that.dragged();
      })
      .on("end", function() {
        return that.dragEnd();
      });
    this.setState({
      timeAxis,
      priceAxis,
      volAxis
    });

    chartWindow.call(d3drag); //breaks if this is not first
    chartWindow.call(d3zoom); //needs to be after drag
    this.draw();
    // setTimeout(() => , 0);
  }

  draw(data) {
    let drawData;
    if (data) {
      drawData = data;
    } else {
      drawData = partialOHLCdata;
    }
    if (!drawData || !drawData.length || drawData.length < 2) return;

    let prices = drawData.map(d => d.price);
    let volValues = drawData.map(d => d.volumeChange);
    let quote_times = drawData.map(d => d.timestamp);
    let [volMin, volMax] = extent(volValues);
    let [priceMin, priceMax] = extent(prices);
    // console.log({prices})
    this.state.timeScale.domain(extent(quote_times));
    this.setState({
      p: "p"
    });
    this.state.priceScale.domain([
      priceMin - this.props.tickSize,
      priceMax + this.props.tickSize
    ]);

    this.state.volScale.domain([0, volMax]);
    let svg = select(this.state.chartRef.current);

    //append timeAxis group
    svg.select(".timeAxis").call(this.state.timeAxis);
    //append priceAxis group
    svg.select(".priceAxis").call(this.state.priceAxis);

    //appand volAxis
    svg.select(".volAxis").call(this.state.volAxis);

    let chartWindow = svg.select(".chartWindow");
    //ensure we draw a new line to be on top da other lines
    chartWindow.selectAll(".tickPriceLine").remove();

    let volRects = chartWindow.selectAll(".tickVolume").data(this.state.data);
    volRects.exit().remove();
    volRects
      .enter()
      .append("rect")
      .merge(volRects)
      .attr("class", "tickVolume")
      .attr(
        "x",
        d =>
          this.state.timeScale(d.timestamp) -
          this.state.innerWidth / this.state.data.length / 2
      )
      .attr("y", d => this.state.volScale(d.volumeChange))
      .attr(
        "height",
        d => this.state.innerHeight - this.state.volScale(d.volumeChange)
      )
      .attr("width", (d, i) => this.state.innerWidth / partialOHLCdata.length)
      .attr("fill", "red")
      .attr("stroke", "black")
      .attr("stroke-width", function() {
        return this.getAttribute("width") / 10;
      });

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

      .attr("class", "tickPriceLine") // Assign a class for styling
      .attr("d", this.lineFn(this.state.data)); // 11. Calls the line generator
  }
  render() {
    return (
      <svg
        ref={this.state.chartRef}
        width={this.props.width}
        height={this.props.height}
        className="svgChart"
      ></svg>
    );
  }
}

function mapStateToProps(state) {
  return state;
}

export default connect(mapStateToProps)(withRouter(TickChart));
