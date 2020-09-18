import React from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import styled from "styled-components";
import { axisBottom, axisRight, axisLeft, axisTop } from "d3-axis";
import { zoom } from "d3-zoom";
import { scaleLinear, scaleTime } from "d3-scale";
import { extent, max, min } from "d3-array";
import { select, event, mouse } from "d3-selection";
import { drag } from "d3-drag";

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
      xBottomScale: scaleTime().range([0, innerWidth]),
    //   topXScale: scaleLinear().range([innerWidth / 2, innerWidth]),
      yRightScale: scaleLinear().range([innerHeight, 0]),
      yLeftScale: scaleLinear().range([innerHeight, 0]).nice(),

    };
  }

  async componentDidMount() {
      debugger
      console.log(this.props)
      this.setupChart()
  }

  componentDidUpdate(prevProps, prevState) {
    this.draw();

    // this.handleNewData(prevState, prevProps);

}

handleNewData(ps,pp){
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
    drawAxisAnnotation(
      "bottomTimeTag",
      this.state.xBottomScale,
      x,
      svg,
      "timeAxis"
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

  //setup
  setupChart() {
    let that = this;
    if (!this.state.chartRef.current) return;
    let svg = select(this.state.chartRef.current);
    svg.selectAll("*").remove();
  
    let xBottomAxis = axisBottom(this.state.xBottomScale)
    .ticks(5)
    .tickSize(-innerHeight);

  let yRightAxis = axisRight(this.state.yRightScale)
    .ticks(8)
    .tickSize(-innerWidth);


    let yLeftAxis = axisLeft(this.state.yLeftScale).ticks(4);

    // let volProfileAxis = axisTop(this.state.volProfileScale).ticks(4);


    // this.setupData()


        //append timeAxis group
        let timeAxisG = svg
        .append("g")
        .attr("class", "timeAxis white")
        .attr(
          "transform",
          `translate(${margin.left}, ${height - margin.bottom})`
        )
        .call(xBottomAxis);
  
      //append priceAxis group
      let priceAxisG = svg
        .append("g")
        .attr("class", "priceAxis white")
        .attr(
          "transform",
          `translate(${width - margin.right}, ${margin.top})`
        )
        .call(yRightAxis);


            //appand volAxis
    let volAxisG = svg
    .append("g")
    .attr("class", "white volAxis")
    .attr("transform", `translate(${margin.left}, ${margin.top})`)
    .call(yLeftAxis);

//   //append the crosshair marker
//   volAxisG
//     .append("path")
//     .attr("id", `leftVolTag`)
//     // .attr("stroke", "blue")
//     .attr("stroke-width", 2);
//   volAxisG.append("text").attr("id", `leftVolTagText`);


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

     /* CrossHair */
     var crosshair = DrawCrossHair(chartWindow);


     chartWindow
     .append("rect")
     .attr("class", "overlay")

     .attr("height", this.state.innerHeight)
     .attr("width", this.state.innerWidth)
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
  
        //this enables the crosshair to move at the
        // timeframe interval
        // let { timeframe } = otherThat.state;
        // let interval = getInterval(timeframe);
        let interval = 100
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
          .attr("y2", innerHeight);
  
        crosshair
          .select("#crosshairY")
          .attr("x1", otherThat.xBottomScale(otherThat.timestamps[0]))
          .attr("y1", MOUSEY)
          .attr(
            "x2",
            otherThat.xBottomScale(
              otherThat.timestamps[otherThat.timestamps.length - 1]
            )
          )
          .attr("y2", MOUSEY);
      }
  

      this.setState({
        xBottomAxis,
        yRightAxis,
        yLeftAxis,

    });
      this.draw();

}



  //draw
  draw() {

      
      let drawData = this.props.data
      debugger
    if(!drawData)return
    let volValues = drawData.map((d) => d.totalVolume);
    let [volMin, volMax] = extent(volValues);
    let lastPriceValues = drawData.map((d) => d.last);
    // let priceMax = max(lastPriceValues, (d) => d);
    // let priceMin = mn(lastPriceValues, (d) => d);
    let [priceMin, priceMax] = extent(lastPriceValues);
    let timestamps = drawData.map(d=>new Date(d.dateTime).toLocaleString())

    let [timeMin, timeMax] = extent(timestamps)

    let timeframe = 0

    this.state.xBottomScale.domain([timeMin - timeframe, timeMax + timeframe]);

    // this.state.candleHeightScale.domain([0, priceRange]);
    this.state.yRightScale.domain([priceMin, priceMax]);
    this.state.yLeftScale.domain([0, volMax]);


    let svg = select(this.state.chartRef.current);

    svg.select(".timeAxis").call(this.state.xBottomScale);
    svg.select(".priceAxis").call(this.state.yRightScale);
    svg.select(".volAxis").call(this.state.yLeftScale);
    // svg.select(".volProfileAxis").call(this.state.volProfileAxis);
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
      console.log(this.props.data)
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
