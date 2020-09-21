import React from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import styled from "styled-components";
import { axisBottom, axisRight, axisLeft, axisTop } from "d3-axis";
import { zoom } from "d3-zoom";
import { scaleLinear, scaleTime, scaleBand } from "d3-scale";
import { extent, max, min } from "d3-array";
import { select, event, mouse } from "d3-selection";
import { drag } from "d3-drag";
import { line } from "d3-shape";

import {
  drawAxisAnnotation,
  removeAllAxisAnnotations,
  addAxisAnnotationElements,
  DrawCrossHair,
} from "./chartHelpers/chartAxis.js";
import { CenterLabel } from "./chartHelpers/ChartMarkers/Labels.js";

let margin = {
  top: 15,
  right: 60,
  bottom: 20,
  left: 65,
};
let MOUSEX = 0;
let MOUSEY = 0;
let width = 800;
let height = 400;
let innerWidth = width - (margin.left + margin.right);
let innerHeight = height - (margin.top + margin.bottom);
class OptionsChart extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      chartRef: React.createRef(),

      //   innerWidth: width - (margin.left + margin.right),
      //   innerHeight: height - (margin.top + margin.bottom),
      xBottomScale: scaleBand()
        .range([0, innerWidth])
        .paddingInner(0.1)
        .paddingOuter(0.2)
        .align(0.5)
        .round(true),
      //   topXScale: scaleLinear().range([innerWidth / 2, innerWidth]),
      yRightScale: scaleLinear().range([innerHeight, 0]),
      yLeftScale: scaleLinear().range([innerHeight, 0]).nice(),
      xBottomAxis: {},
      yRightAxis: {},
      yLeftAxis: {},
    };
  }

  async componentDidMount() {
    console.log(this.props);
    this.setupChart();
  }

  componentDidUpdate(prevProps, prevState) {
    // this.draw();
    // this.handleNewData(prevState, prevProps);
  }

  handleNewData(ps, pp) {
    // let ppData = pp.data
    // let {data} = this.props
    // if(data.data !==
    //     // data.symbol !===ppData.symbol &&
    //     // data.exp !===ppData.exp &&
    //     // data.symbol !===ppData.symbol &&
    //     // data.symbol !===ppData.symbol &&
    //     // data.symbol !===ppData.symbol &&
    // )
  }
  appendAxisAnnotations(x, y, svg) {
    // drawAxisAnnotation(
    //   "topVolProfileTag",
    //   this.state.volProfileScale,
    //   x,
    //   svg,
    //   "volProfileAxis"
    // );

    let isOrdinal = true;
    drawAxisAnnotation(
      "bottomTimeTag",
      this.state.xBottomScale,
      x,
      svg,
      "timeAxis",
      isOrdinal
    );

    drawAxisAnnotation(
      "rightPriceTag",
      this.state.yRightScale,
      y,
      svg,
      "priceAxis"
    );

    drawAxisAnnotation("leftVolTag", this.state.yLeftScale, y, svg, "volAxis");
  }

  drawFirstAlert(chartWindow, firstAlert, data){
    let {timestamp} = firstAlert
    timestamp = new Date(timestamp).setMilliseconds(0)
    timestamp = new Date(timestamp).setSeconds(0)
    /**
     * IV: 1.32
alert: "Unusual Activity"
dateTime: "9/21/2020, 12:31:11 AM"
last: 3.25
timestamp: 1600673471686
totalVolume: 1222
underlyingPrice: 74.73
     */
    timestamp = new Date(timestamp).toLocaleString()
debugger
    chartWindow.append("line").attr("class", "firstAlert")
    // .select("#crosshairX")
    .attr("x1", this.state.xBottomScale(timestamp))
    .attr("y1", 0)
    .attr("x2", this.state.xBottomScale(timestamp))
    .attr("y2", innerHeight)
    .attr('color', 'purple')
    .attr("stroke", 'red')
    .attr("fill", "none");  


  }

  drawLine(chartWindow, xName, yName, className, color, data) {
    let lineFunc = line()
      .x(
        (d) =>
          this.state.xBottomScale(new Date(d[xName]).toLocaleString()) +
          this.state.xBottomScale.bandwidth() / 2
      )
      .y((d) => this.state.yRightScale(d[yName]));

    let lastPriceLinePath = chartWindow.selectAll(`.${className}`).data([data]);
    lastPriceLinePath
      .enter()
      .append("path")
      .merge(lastPriceLinePath)
      .attr("class", `.${className}`)
      .attr("stroke-width", 3)
      .attr("d", lineFunc)
      .attr("stroke", color)
      .attr("fill", "none");
  }

  drawVolBars(chartWindow, xName, yName, className, color, data) {
    let volBars = chartWindow.selectAll(`.${className}`).data(data);
    volBars.exit().remove();
    volBars
      .enter()
      .append("rect")
      .merge(volBars)
      .attr("class", className)
      .attr(
        "x",

        (d) => this.state.xBottomScale(new Date(d[xName]).toLocaleString())
        // +this.state.xBottomScale.bandwidth()/2
        // innerWidth / dra.length / 2
      )
      .attr("y", (d) => this.state.yLeftScale(d[yName]))
      .attr(
        "height",
        // height ||
        (d, i) => {
          let h = innerHeight - this.state.yLeftScale(d.totalVolume);
          if (h < 0) h = 0;
          return h;
        }
      )
      // .attr("opacity")
      .attr("pointer-events", "none")

      .attr("width", (d, i) => this.state.xBottomScale.bandwidth() / 2)
      .attr("fill", (d, i) => color)
      .attr("stroke", "#666")
      .attr(
        "stroke-width",
        0
        // function () {
        //   return this.getAttribute("height") / 10;
        // }
      );

    className = "totalInterestBars";
    yName = "openInterest";
    color = "blue";

    let totalIntBars = chartWindow.selectAll(`.${className}`).data(data);
    totalIntBars.exit().remove();
    totalIntBars
      .enter()
      .append("rect")
      .merge(totalIntBars)
      .attr("class", className)
      .attr(
        "x",

        (d) =>
          this.state.xBottomScale(new Date(d[xName]).toLocaleString()) +
          this.state.xBottomScale.bandwidth() / 2
        // innerWidth / dra.length / 2
      )
      .attr("y", (d) => this.state.yLeftScale(d[yName]))
      .attr(
        "height",
        // height ||
        (d, i) => {
          let h = innerHeight - this.state.yLeftScale(d[yName]);
          if (h < 0) h = 0;
          return h;
        }
      )
      // .attr("opacity")
      .attr("pointer-events", "none")

      .attr("width", (d, i) => this.state.xBottomScale.bandwidth() / 2)
      .attr("fill", (d, i) => color)
      .attr("stroke", "#666")
      .attr(
        "stroke-width",
        0
        // function () {
        //   return this.getAttribute("height") / 10;
        // }
      );
  }

  //setup
  setupChart() {
    let that = this;
    let drawData = this.props.data;
    if (!this.state.chartRef.current) return;
    let svg = select(this.state.chartRef.current);
    svg.selectAll("*").remove();

    //Time axis
    let xBottomAxis = axisBottom(this.state.xBottomScale)
      // .ticks(5)
      .tickSize(-innerHeight)
      .tickValues(
        this.state.xBottomScale.domain().filter(function (d, i) {
          return !(i % 10);
        })
      );
    //last price axis
    let yRightAxis = axisRight(this.state.yRightScale)
      .ticks(8)
      .tickSize(-innerWidth);
    //total volume axis
    let yLeftAxis = axisLeft(this.state.yLeftScale).ticks(4);

    //data cleaning get min max values
    let volValues = drawData.map((d) => d.totalVolume);
     volValues = [...volValues,...drawData.map((d) => d.openInterest)];
    let [volMin, volMax] = extent(volValues);
    let allPrices = drawData.map((d) => d.last);
    allPrices = [...allPrices, ...drawData.map((d) => d.ask)];
    allPrices = [...allPrices, ...drawData.map((d) => d.bid)];

    let [priceMin, priceMax] = extent(allPrices);
    let timestamps = drawData
      .map((d) => new Date(d.dateTime).toLocaleString())
      .sort((a, b) => a - b);

    let [timeMin, timeMax] = extent(timestamps);

    let timeframe = 0;
    let timeSpanBuffer = 1000 * 60 * 60 * 2;
    //scale the domains
    this.state.xBottomScale.domain(timestamps);
    // this.state.candleHeightScale.domain([0, priceRange]);
    this.state.yRightScale.domain([priceMin, priceMax * 1.2]);
    this.state.yLeftScale.domain([0, volMax * 1.2]);

    // let volProfileAxis = axisTop(this.state.volProfileScale).ticks(4);

    // this.setupData()

    //append/create timeAxis group
    let timeAxisG = svg
      .append("g")
      .attr("class", "timeAxis white")
      .attr("transform", `translate(${margin.left}, ${height - margin.bottom})`)
      .call(xBottomAxis);

    //append priceAxis group
    let priceAxisG = svg
      .append("g")
      .attr("class", "priceAxis white")
      .attr("transform", `translate(${width - margin.right}, ${margin.top})`)
      .call(yRightAxis);

    //appand volAxis
    let volAxisG = svg
      .append("g")
      .attr("class", "white volAxis")
      .attr("transform", `translate(${margin.left}, ${margin.top})`)
      .call(yLeftAxis);

    //apply the scaled domains to the axis
    svg.select(".timeAxis").call(this.state.xBottomScale);
    svg.select(".priceAxis").call(this.state.yRightScale);
    svg.select(".volAxis").call(this.state.yLeftScale);

    let chartWindow = svg
      // .append('rect').attr('width', this.state.innerWidth).attr('height', this.state.innerHeight)
      .append("g")
      .attr("class", "chartWindow")
      .attr("transform", `translate(${margin.left},${margin.top})`)
      .attr("fill", "black");

    CenterLabel({
      symbol: this.props.symbol,
      timeframe: this.props.exp,
      chartWindow,
      x: "45%",
      y: margin.top + innerHeight / 2,
    });

    //Draw total volume bars
    //this draws both vol and open interest
    this.drawVolBars(
      chartWindow,
      "dateTime",
      "totalVolume",
      "totalVolumeBars",
      "goldenrod",
      drawData
    );

    //Draw last price line
    this.drawLine(
      chartWindow,
      "dateTime",
      "last",
      "lastPriceLine",
      "white",
      drawData
    );
    //Draw ask price line
    this.drawLine(
      chartWindow,
      "dateTime",
      "ask",
      "askPriceLine",
      "red",
      drawData
    );
    //Draw bid price line
    this.drawLine(
      chartWindow,
      "dateTime",
      "bid",
      "bidPriceLine",
      "green",
      drawData
    );

    //draw Alert Marker
    let {data}=this.props
    data.forEach(a => {
      a.dateTime = new Date(a.timestamp).toLocaleString()
    });
    let firstAlert = this.props.alerts[0]
    this.drawFirstAlert(chartWindow ,firstAlert, data)

    this.setState({
      timestamps,
      xBottomAxis,
      yRightAxis,
      yLeftAxis,
    });

    /* CrossHair */
    var crosshair = DrawCrossHair(chartWindow);

    chartWindow
      .append("rect")
      .attr("class", "overlay")

      .attr("height", innerHeight)
      .attr("width", innerWidth)
      .on("mouseover", function () {
        crosshair.style("display", null);
      })
      .on("mouseout", function () {
        crosshair.style("display", "none");
        removeAllAxisAnnotations(svg);
      })
      .on("mousemove", function () {
        return mousemove(that, this);
      });

    function mousemove(otherThat, that) {
      let _mouse = mouse(that);

      MOUSEY = _mouse[1];
      MOUSEX = _mouse[0];
      otherThat.appendAxisAnnotations(
        MOUSEX ,
        MOUSEY,
        svg
      );

      crosshair
        .select("#crosshairX")
        .attr("x1", MOUSEX)
        .attr("y1", 0)
        .attr("x2", MOUSEX)
        .attr("y2", innerHeight);
      crosshair
        .select("#crosshairY")
        .attr(
          "x1",
          otherThat.state.xBottomScale(
            otherThat.state.xBottomScale.domain()[0]
          ) -
          
          otherThat.state.xBottomScale.bandwidth()/2 +
          otherThat.state.xBottomScale.paddingOuter() *
            otherThat.state.xBottomScale.step()
        )
        .attr("y1", MOUSEY)
        .attr(
          "x2",
          otherThat.state.xBottomScale(
            otherThat.state.xBottomScale.domain().slice(-1)[0]
          ) +
            otherThat.state.xBottomScale.bandwidth() +
            otherThat.state.xBottomScale.paddingOuter() *
              otherThat.state.xBottomScale.step()
        )
        .attr("y2", MOUSEY);
    }
  }

  /*
  IV: 1.26
ask: 11.9
askSize: 1
bid: 9.85
bidSize: 10
bsPricing: 12.48
dateTime: "9/17/2020, 1:27:00 AM"
delta: 0.509
gamma: 0.015
last: 12.48
mark: 10.88
markChange: -22.09
markPercentChange: -67.01
netChange: -20.48
openInterest: 754
rho: 0.013
theoreticalOptionValue: 10.875
theoreticalVolatility: 29
totalVolume: 195 */

  render() {
    console.log(this.props.data);
    return (
      <svg
        ref={this.state.chartRef}
        width={width}
        height={height}
        className="svgChart"
      ></svg>
    );
  }
}

function mapStateToProps(state) {
  return state;
}

export default connect(mapStateToProps)(withRouter(OptionsChart));
