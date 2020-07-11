import React from "react";
import { connect } from "react-redux";
import { toastr } from "react-redux-toastr";
//import { withRouter } from 'next/router';
import { Link, withRouter } from "react-router-dom";
import styled from "styled-components";
import { axisBottom, axisRight, axisLeft, axisTop } from "d3-axis";

import { scaleLinear, scaleTime } from "d3-scale";
import { extent, max } from "d3-array";
import { select, event, mouse } from "d3-selection";
import { line } from "d3-shape";

import {
  drawAxisAnnotation,
  removeAllAxisAnnotations,
} from "../charts/chartHelpers/chartAxis.js";

const margin = {
  top: 15,
  right: 60,
  bottom: 20,
  left: 35,
};

let MOUSEX = 0;
let MOUSEY = 0;
let mouseDRAGSTART = null;
let dragStartData = [];
let lastBarCount = null;
let partialOHLCdata = [];
let zoomState = 1;

class IndicatorChart extends React.Component {
  constructor(props) {
    super(props);
    let { height, width } = props;
    let innerHeight = height - (margin.top + margin.bottom);
    let innerWidth = width - (margin.left + margin.right);
    this.state = {
      chartRef: React.createRef(),
      innerWidth: innerWidth,
      innerHeight: innerHeight,
      timeScale: scaleTime().range([0, innerWidth]),
      yScale: scaleLinear().range([innerHeight, 0]),

      timestamps: [],
      data: [],
    };
  }

  async componentDidMount() {
    console.log("chart for " + this.props.filingItem);
    console.log(this.props.filingData);
    this.setupChart();
  }

  componentDidUpdate(prevProps, prevState) {
    // console.log('data update for '+this.props.filingItem)
    // this.checkIfDataUpdated(prevProps);
    this.didWidthChange(prevProps);
  }

  didWidthChange(prevProps) {
    if (prevProps.width != this.props.width) {
      console.log("Update width");
      let { width } = this.props;
      let innerWidth = width - (margin.left + margin.right);
      let { timeScale } = this.state;
      timeScale.range([0, innerWidth]);
      this.setState({
        timeScale,
        innerWidth,
      });
      setTimeout(() => this.setupChart(), 0);
    }
  }

  checkIfDataUpdated(prevProps) {
    let symbol = this.props.symbol;
    if (!this.props.stock_data.commodity_data[symbol]) return;
    let timeframe = this.props.timeframe;
    let data = this.props.stock_data.commodity_data[symbol][timeframe];
    let prevData;
    if (!prevProps.stock_data.commodity_data[symbol]) prevData = undefined;
    else prevData = prevProps.stock_data.commodity_data[symbol][timeframe];

    if (data === prevData) return;
    console.log(this.props);
    console.log(this.state);
    console.log(this.props.stock_data.commodity_data[symbol][timeframe]);

    let availableWindows = Object.keys(data.slice(-1)[0].momentum).map((key) =>
      parseInt(key.split("momentum").slice(-1)[0])
    );
    partialOHLCdata = data.map((d) => {
      return { x: d.timestamp, momentum: d.momentum };
    });
    let timestamps = data.map((d) => d.timestamp);
    this.setState({
      availableWindows,
      data,
      timestamps,
      stochasticData: [...partialOHLCdata],
    });
    setTimeout(() => this.setupChart(), 0);
  }

  lineFn(scale, xName, yName) {
    let that = this;
    return line()
      .x(function (d) {
        return that.state.timeScale(d[xName]);
      })
      .y(function (d) {
        return scale(d[yName]);
      });
  }

  appendAxisAnnotations(x, y, svg) {
    drawAxisAnnotation(
      "bottomTimeTag",
      this.state.timeScale,
      x,
      svg,
      "timeAxis"
    );
    let {  innerHeight, innerWidth } = this.state;
      let {filingItem} = this.props
    // Object.keys(this.state.yScale).forEach((indicatorName, index) => {
    let { yScale } = this.state;
    // let yAxis = axisRight(scale).ticks(4);
    // indicatorYAxes[indicator] = yAxis;
    
    drawAxisAnnotation(
      `right${filingItem}Tag`,
      yScale,
      y,
      svg,
      `${filingItem}YAxis`
    );

    // .tickSize(-this.state.innerHeight);
    // });

    //     drawAxisAnnotation("rightPriceTag", this.state.priceScale, y, svg);
    //     drawAxisAnnotation("leftVolTag", this.state.volScale, y, svg);
  }

  setupChart() {
    console.log(
      `SET UP balance data for balance sheet ${this.props.filingItem}`
    );
    if (!this.state.chartRef.current)
      return console.log("NO INDICATOR ChaRT FOR you");
    let that = this;
    let svg = select(this.state.chartRef.current);
    svg.selectAll("*").remove();

    let timeAxis = axisBottom(this.state.timeScale)
      .ticks(4)
      .tickSize(-this.state.innerHeight);

    let yAxis = axisRight(this.state.yScale).ticks(4);

    //append timeAxis group
    let timeAxisG = svg
      .append("g")
      .attr("class", "white timeAxis")
      .attr(
        "transform",
        `translate(${margin.left}, ${this.props.height - margin.bottom})`
      )
      .call(timeAxis);

    let chartWindow = svg
      .append("g")
      .attr("class", "chartWindow")
      .attr("transform", `translate(${margin.left},${margin.top})`)
      .attr("fill", "black");

    let { innerHeight, innerWidth } = this.state;
    let { filingItem, filingName } = this.props;
    let yAxisG = svg
      .append("g")
      .attr("class", `white ${filingItem}YAxis`)
      .attr(
        "transform",
        `translate(${this.props.width - margin.right}, ${margin.top})`
      )
      .call(yAxis);

    chartWindow
      .append("text")
      .text(filingName)
      .attr("x", "50%")
      .attr("y", margin.top + innerHeight / 2)
      .attr("font-size", "3.3em")
      .attr("opacity", "0.3")
      .attr("font-color", "white")
      .attr("text-anchor", "middle");

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

      .attr("height", innerHeight)
      .attr("width", innerWidth)
      .on("mouseover", function () {
        crosshair.style("display", null);
      })
      .on("mouseout", function () {
        // crosshair.style("display", "none");
        // removeAllAxisAnnotations(svg);
      })
      .on("mousemove", function () {
        // console.log("mousey mouse");
        return mousemove(that, this);
      });

    function mousemove(otherThat, that) {
      let _mouse = mouse(that);

      //this enables the crosshair to move at the
      // timeframe interval

      //   let { timeframe } = otherThat.props;
      let timeframe = "quarterly";
      let interval = getInterval(timeframe);

      let MOUSETIME = new Date(
        otherThat.state.timeScale.invert(_mouse[0])
      ).getTime();
      MOUSETIME = Math.round(MOUSETIME / interval) * interval;

      MOUSEX = otherThat.state.timeScale(MOUSETIME);
      MOUSEY = _mouse[1];
      otherThat.appendAxisAnnotations(MOUSEX, MOUSEY, svg);

      crosshair
        .select("#crosshairX")
        .attr("x1", MOUSEX)

        .attr("y1", 0)
        .attr("x2", MOUSEX)

        .attr("y2", otherThat.state.innerHeight);

      crosshair
        .select("#crosshairY")
        .attr("x1", otherThat.state.timeScale(otherThat.state.timestamps[0]))
        .attr("y1", MOUSEY)

        .attr(
          "x2",
          otherThat.state.timeScale(
            otherThat.state.timestamps[otherThat.state.timestamps.length - 1]
          )
        )
        .attr("y2", () => MOUSEY);
    }

    // const d3zoom = zoom()
    //   // .scaleExtent([1, 40])
    //   .on("zoom", function () {
    //     return that.zoomed();
    //   });

    // const d3drag = drag()
    //   .on("start", function () {
    //     return that.dragStart();
    //   })
    //   .on("drag", function () {
    //     return that.dragged();
    //   })
    //   .on("end", function () {
    //     return that.dragEnd();
    //   });
    this.setState({
      timeAxis,
      yAxis,
    });

    // chartWindow.call(d3drag); //breaks if this is not first
    // chartWindow.call(d3zoom); //needs to be after drag
    setTimeout(() => this.draw(), 0);
  }

  draw() {
    // let drawData;
    // if (data) {
    //   drawData = data;
    // } else {
    //   drawData = partialOHLCdata;
    // }
    // if (!drawData || !drawData.length || drawData.length < 2) return;
    let { filingItem, filingData } = this.props;
    filingData = filingData.map((data) => {
      let date = data.date;
      let _filingItem = data[filingItem];
      return {
        date: new Date(date).getTime(),
        [filingItem]: +_filingItem,
      };
    });
    console.log(filingData);
    // console.log(drawData)
    // let volProfileValues = Array.from(
    //   Object.values(this.state.volumePriceProfile)
    // );
    // let volPriceKeys = Array.from(Object.keys(this.state.volumePriceProfile));

    // let prices = drawData.map(d => d.price);
    // let volValues = drawData.map(d => d.volumeChange);
    let [timeMin, timeMax] = extent(
      filingData.map(({ date }) => new Date(date).getTime())
    );
    let [filingDataMin, filingDataMax] = extent(
      filingData.map(data => data[filingItem])
    );
    // let [volMin, volMax] = extent(volValues);

    // let [priceMin, priceMax] = extent(prices);

    this.state.timeScale.domain([timeMin, timeMax]);

    let yScale = this.state.yScale;

    yScale.domain([filingDataMin, filingDataMax]);

    let svg = select(this.state.chartRef.current);

    //append timeAxis group
    console.log(this.state.timeAxis);
    svg.select(".timeAxis").call(this.state.timeAxis);
    //append All the y filingItem axis
    svg.select(`.${filingItem}YAxis`).call(yScale);

    let chartWindow = svg.select(".chartWindow");

    chartWindow.selectAll(`.${filingItem}Line`).remove();
    let tickLinePath = chartWindow
      .selectAll(`.${filingItem}Line`)
      .data([filingData]);
    tickLinePath.exit().remove();

    tickLinePath
      .enter()
      .append("path")
      .merge(tickLinePath)
      .attr("stroke", "white")
      .attr("stroke-width", "2")
      .attr("pointer-events", "none")
      .attr("fill", "none")

      .attr("class", `${filingItem}Line`) // Assign a class for styling
      .attr("d", this.lineFn(this.state.yScale, "date", filingItem));
  }

  render() {
    return (
      <>
        {/* {this.props.meta.is_loading && (
          <Loader width={this.props.width} height={this.state.height} />
        )} */}
        <svg
          ref={this.state.chartRef}
          width={this.props.width}
          height={this.props.height}
          className="svgChart"
        ></svg>
      </>
    );
  }
}

function mapStateToProps(state) {
  return state;
}

export default connect(mapStateToProps)(withRouter(IndicatorChart));

function getInterval(timeframe) {
  if (timeframe === "1Min") return 1000 * 60 * 1;
  if (timeframe === "5Min") return 1000 * 60 * 5;
  if (timeframe === "60Min") return 1000 * 60 * 60;
  if (timeframe === "daily") return 1000 * 60 * 60 * 24;
  if (timeframe === "quarterly") return 1000 * 60 * 60 * 24 * 30;
}
