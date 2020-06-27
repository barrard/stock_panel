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
import {appendRegressionLines} from './ChartMarkers/RegressionLines.js'

const margin = {
  top: 15,
  right: 60,
  bottom: 20,
  left: 50,
};

let MOUSEX = 0;
let MOUSEY = 0;
let mouseDRAGSTART = null;
let dragStartData = [];
let lastBarCount = null;
let partialOHLCdata = [];
let zoomState = 1;

//import Main_Layout from '../layouts/Main_Layout.js';
class IndicatorChart extends React.Component {
  constructor(props) {
    super(props);
    let { height, width } = props;
    let innerHeight = height - (margin.top + margin.bottom);
    let innerWidth = width - (margin.left + margin.right);
    this.state = {
      chartRef: React.createRef(),
      initChart: false,
      innerWidth: innerWidth,
      innerHeight: innerHeight,
      timeScale: scaleTime().range([0, innerWidth]),

      timestamps: [],
      indicators: [
        // "MFI", //Money Flow indicator,
        "OBV", //On Balance Vol
        // "PVT", //Price Vol Trend
      ],
      indicatorOptions: {
        MFI: {}, //Money Flow indicator,
        OBV: {}, //On Balance Vol
        PVT: {}, //Price Vol Trend
      },
      indicatorYScales: {},
      indicatorYAxes: {},
      data:[],
      visibleIndicators:{
        minMaxMarkers:true, regressionLines:true
      }
    };
  }

  componentDidMount() {
    console.log("INDICATORS CHART");

    let indicatorYScales = {};
    let { indicators, innerHeight } = this.state;
    indicators.forEach((indicator) => {
      let indicatorYScale = scaleLinear().range([
        innerHeight / indicators.length,
        0,
      ]);
      indicatorYScales[indicator] = indicatorYScale;
    });

    this.setState({
      indicatorYScales,
    });
    setTimeout(() => this.setupChart(), 0);
  }
  /**
 * 
  PriceChangeData
  volumeChange: 325
price: 2470.25
timestamp: 1585940640000
priceChange: 1
TOTAL_NEUTRAL_VOLUME: 1567
TOTAL_UP_VOL: 9343
TOTAL_DOWN_VOL: 9494


volumePriceProfile
up: 0
down: 106
neutral: 0

 */

  componentDidUpdate(prevProps, prevState) {
    this.checkIfDataUpdated(prevProps);

    this.didTickDataUpdate(prevProps);
    this.didWidthChange(prevProps);
  }

  didWidthChange(prevProps) {
    if (prevProps.width != this.props.width) {
      console.log("Update width");
      let { width } = this.props;
      let innerWidth = width - (margin.left + margin.right);
      let { timeScale } = this.state;
      timeScale.range([0, innerWidth])
      this.setState({
        timeScale, innerWidth
      });
      setTimeout(() => this.setupChart(), 0);

    }
  }

  didTickDataUpdate(prevProps) {
    if(!partialOHLCdata.length || !this.state.data.length)return
    //FIRST CHECK IF NEW TICK DATA IS HERE
    if (prevProps.currentTickData != this.props.currentTickData) {
      let { data } = this.props;
      // console.log(this.state)
      // console.log(this.props)
      let lastPartialDataTickTime = partialOHLCdata.slice(-1)[0].timestamp;
      let lastDataTickTime = this.state.data.slice(-1)[0].timestamp;

      let { priceChangeData, volumePriceProfile } = this.props.currentTickData;
      // console.log({ priceChangeData, data });
      // FIND INDEX WHERE WE NEED TO GET CURRENT TICK DATA
      let newTickDataIndex = priceChangeData.findIndex((tickData) => {
        return tickData.timestamp === lastDataTickTime;
      });
      let newData;
      let newTicks
      // console.log({ newTickDataIndex });
      // EITHER ADD ALL
      if (newTickDataIndex < 0) {
        newTicks = priceChangeData;

        // partialOHLCdata = [...partialOHLCdata, ...newTicks];
          // newData= [...this.state.data, ...priceChangeData]
        //OR ADD SLICED
      } else {
        //Slice it
        newTicks = priceChangeData.slice(newTickDataIndex + 1);
        // partialOHLCdata = [...partialOHLCdata, ...newTicks];
        // newData= [...this.state.data, ...newTicks]
      }
      if(lastPartialDataTickTime === lastDataTickTime){
        // console.log('also add to partial')
        partialOHLCdata = [...partialOHLCdata, ...newTicks];

      }
      newData = [...this.state.data, ...newTicks]
      let timestamps = partialOHLCdata.map(d => d.timestamp);


          this.setState({
            timestamps,
            data:newData
          });
      setTimeout(() => this.draw(), 0);
    }
  }

  checkIfDataUpdated(prevProps) {
    let prevData = prevProps.data;
    let data = this.props.data;
    if (prevData != data) {
      // console.log("TICK CHART UPDATE DATA");
      // console.log(data);
      partialOHLCdata = data;
      let timestamps = data.map((d) => d.timestamp);
      // console.log({ timestamps });
      this.setState({
        data,
        timestamps,
      });
      setTimeout(() => this.setupChart(), 0);
    }
  }

  lineFn(scale, index) {
    let that = this;
    let addedHeight = this.state.indicatorHeight * index;
    return line()
      .x(function (d) {
        return that.state.timeScale(d.x);
      })
      .y(function (d) {
        return scale(d.y) + addedHeight;
      });
  }

  appendAxisAnnotations(x, y, svg) {
    drawAxisAnnotation("bottomTimeTag", this.state.timeScale, x, svg,'timeAxis');
    let { indicators, innerHeight, innerWidth } = this.state;

    Object.keys(this.state.indicatorYScales).forEach((indicatorName, index) => {

      let indicatorHeight = innerHeight / indicators.length;

      let addedHeight = indicatorHeight * index;

      let scale = this.state.indicatorYScales[indicatorName];
      // let yAxis = axisRight(scale).ticks(4);
      // indicatorYAxes[indicatorName] = yAxis;
      drawAxisAnnotation(`right${indicatorName}Tag`, scale, y+addedHeight, svg,`${indicatorName}YAxis`);

      //   .tickSize(-this.state.innerHeight);
    });

    
    //     drawAxisAnnotation("rightPriceTag", this.state.priceScale, y, svg);
    //     drawAxisAnnotation("leftVolTag", this.state.volScale, y, svg);
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
      // console.log(data);
      zoomState = kScale;
      partialOHLCdata = data;
      return this.draw();
    }
  }

  dragStart() {
    if (!partialOHLCdata) return console.log("FUUCK NO PARTIAL DAATT?");
    mouseDRAGSTART = event.x - margin.left;
    dragStartData = [...partialOHLCdata];
  }
  dragged() {
    let xDragPOS = event.x - margin.left;
    let dragAmount = Math.abs(xDragPOS - mouseDRAGSTART);
    let barWidth = this.state.innerWidth / dragStartData.length;
    let barCount = parseInt(dragAmount / barWidth);
    if (barCount < 1) return;
    if (lastBarCount === barCount) return;
    lastBarCount = barCount;
    // console.log("dragged");
    let data;
    if (xDragPOS > mouseDRAGSTART) {
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
    } else if (xDragPOS < mouseDRAGSTART) {
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
    if (!this.state.chartRef.current) return;

    let that = this;
    let svg = select(this.state.chartRef.current);
    svg.selectAll("*").remove();

    let timeAxis = axisBottom(this.state.timeScale)
      .ticks(4)
      .tickSize(-this.state.innerHeight);

    //Make and store the indicator Axis from the scale objects keys
    let indicatorYAxes = {};
    Object.keys(this.state.indicatorYScales).forEach((indicatorName) => {
      let scale = this.state.indicatorYScales[indicatorName];
      let yAxis = axisRight(scale).ticks(4);
      indicatorYAxes[indicatorName] = yAxis;
      //   .tickSize(-this.state.innerHeight);
    });

    // let priceAxis = axisRight(this.state.priceScale)
    //   .ticks(4)
    //   .tickSize(-this.state.innerWidth);

    //append timeAxis group
    let timeAxisG = svg
      .append("g")
      .attr("class", "white timeAxis")
      .attr(
        "transform",
        `translate(${margin.left}, ${this.props.height - margin.bottom})`
      )
      .call(timeAxis);

    // timeAxisG
    //   .append("path")
    //   .attr("id", `bottomTimeTag`)
    //   // .attr("stroke", "blue")
    //   .attr("stroke-width", 2);
    // timeAxisG.append("text").attr("id", `bottomTimeTagText`);

    let chartWindow = svg
      .append("g")
      .attr("class", "chartWindow")
      .attr("transform", `translate(${margin.left},${margin.top})`)
      .attr("fill", "black");

    let { indicators, innerHeight, innerWidth } = this.state;
    let indicatorHeight = innerHeight / indicators.length;
    Object.keys(indicatorYAxes).forEach((yAxisName, index) => {
      let addedHeight = indicatorHeight * index;
      let yAxisG = svg
        .append("g")
        .attr("class", `white ${yAxisName}YAxis`)
        .attr(
          "transform",
          `translate(${this.props.width - margin.right}, ${
            margin.top + addedHeight
          })`
        )
        .call(indicatorYAxes[yAxisName]);

      chartWindow
        .append("text")
        .text(yAxisName)
        .attr("x", "50%")
        .attr("y", addedHeight + indicatorHeight / 2)
        .attr("font-size", "5.3em")
        .attr("opacity", "0.3")
        .attr("font-color", "white")
        .attr("text-anchor", "middle");
    });

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

      MOUSEX = _mouse[0];
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
    this.setState({
      timeAxis,
      indicatorYAxes,
      indicatorHeight,
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
// console.log(drawData)
    // let volProfileValues = Array.from(
    //   Object.values(this.state.volumePriceProfile)
    // );
    // let volPriceKeys = Array.from(Object.keys(this.state.volumePriceProfile));

    // let prices = drawData.map(d => d.price);
    // let volValues = drawData.map(d => d.volumeChange);
    let [timeMin, timeMax] = extent(drawData.map(({ timestamp }) => timestamp));
    // let [volMin, volMax] = extent(volValues);

    // let [priceMin, priceMax] = extent(prices);

    let { OBVdata, PVTdata, MFIdata } = makeIndicatorData(
      drawData,
      this.state.indicatorYScales,
      this.state.timeScale
    );

    // console.log({PVTdata, OBVdata})
    // console.log(extent(OBVdata, (d) => d.y));
    this.state.timeScale.domain([timeMin, timeMax]);

    Object.keys(this.state.indicatorYScales).forEach((indicatorName) => {
      let yScale = this.state.indicatorYScales[indicatorName];
      if (indicatorName === "MFI") {
        yScale.domain(extent([0, 100]));
        // console.log(MFIdata)
      }
      if (indicatorName === "OBV") {
        // console.log("Whats the range of the OBV data?");
        // console.log({ OBVdata });
        yScale.domain(extent(OBVdata, (d) => d.y));
      }
      if (indicatorName === "PVT") {

        // console.log("Whats the range of the OBV data?");
        // console.log({PVTdata})
        yScale.domain(extent(PVTdata, (d) => d.y));
      }
    });

    let svg = select(this.state.chartRef.current);

    //append timeAxis group
    svg.select(".timeAxis").call(this.state.timeAxis);
    //append All the y indicator axis
    Object.keys(this.state.indicatorYAxes).forEach((indicatorName) => {
      let yScale = this.state.indicatorYAxes[indicatorName];
      svg.select(`.${indicatorName}YAxis`).call(yScale);
    });

    let chartWindow = svg.select(".chartWindow");

    this.state.indicators.forEach((indicatorName, index) => {
      let XYdata = [];
      if (indicatorName === "OBV") {
        XYdata = OBVdata;
      }else if(indicatorName === "PVT"){
        XYdata = PVTdata
      }else if(indicatorName === "MFI"){
        XYdata = MFIdata
      }
      chartWindow.selectAll(`.${indicatorName}Line`).remove();
      // console.log({ XYdata, indicatorName });
      let tickLinePath = chartWindow
        .selectAll(`.${indicatorName}Line`)
        .data([XYdata]);
      tickLinePath.exit().remove();

      tickLinePath
        .enter()
        .append("path")
        .merge(tickLinePath)
        .attr("stroke", "white")
        .attr("stroke-width", "2")
        .attr("pointer-events", "none")
        .attr("fill", "none")

        .attr("class", `${indicatorName}Line`) // Assign a class for styling
        .attr(
          "d",
          this.lineFn(this.state.indicatorYScales[indicatorName], index)
        ); // 11. Calls the line generator

        if(indicatorName === 'OBV'){
          /**
           * adding regression line to all my charts to compare slopes
           */
          // console.log({XYdata})
          let addedHeight = this.state.indicatorHeight * index;
          XYdata.forEach(d=>d.y === 0 ? d.y = 1: d.y=d.y)
          let yScale = this.state.indicatorYScales[indicatorName]
          let xScale = this.state.timeScale
          appendRegressionLines(this, chartWindow,
            XYdata, {xKey:'x',yKey:'y'},
            20000, {xScale, yScale}, {addedHeight}
             )

        }
    });
  }

  render() {
    return (
      <>
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

function makeIndicatorData(data) {
  // console.log(data);
  /**
     * volumeChange: 0
price: 2472.75
timestamp: 1585940340000
priceChange: 0
TOTAL_NEUTRAL_VOLUME: 0
TOTAL_UP_VOL: 0
TOTAL_DOWN_VOL: 0
     */
  let OBVdata = []; //try to get these {x:val, y:val}
  let PVTdata = []
  let MFIdata = []

  /**
   * To make OBV data, we use the volumeChange
   * and priceChange
   */
  let OBV_val = 0;
  let PVT_val = 0
  let rawMoneyFlowVals = []
  data.forEach(({ volumeChange, priceChange, timestamp, price }, index) => {
    if(index === 0) return
    let x = timestamp;
    // ******     MFI  Money Flow Index  ******  
    let rawMoneyFlow = price*volumeChange
    rawMoneyFlowVals.push(rawMoneyFlow)

    // ******     PVT  ******  
    if(index!==0){
      let prevClose = data[index-1].price
      PVT_val = (((price - prevClose) / prevClose) * volumeChange) + PVT_val
      // console.log({PVT_val})
      PVTdata.push({x, y:PVT_val})

    }


    // ******     OBV  ******  
    if (priceChange < 0) {
      OBV_val -= volumeChange;
    } else if (priceChange > 0) {
      OBV_val += volumeChange;
    }
    //  console.log(OBV_val)
    let y = OBV_val;
    OBVdata.push({ x, y });
  });
      //MFI period variable //TODO make this dynamic
      let MFI_period = 100
      // ******     MFI part 2 ******  
      rawMoneyFlowVals.forEach((val, periodIndex)=>{
        if( periodIndex < MFI_period - 1) return
        let start = periodIndex - (MFI_period-1)
        let end = periodIndex +1

        let periodData = rawMoneyFlowVals.slice(start, end)
        // console.log(periodData)
        let positiveMoneyFlow =[] 
        let negativeMoneyFlow =  []
        // console.log({periodIndex, start})
        periodData.forEach((d, i)=>{
          // console.log({i, start})
          let previousPrice = data[start+i].price
          let currentPrice = data[start+i+1].price
          if(previousPrice < currentPrice){
            positiveMoneyFlow.push(d)
          }else if(previousPrice > currentPrice){
            negativeMoneyFlow.push(d)
          }
        })
        // console.log({periodData})
        let Psum = positiveMoneyFlow.reduce((a, b) => b + a, 0);
        let Nsum = negativeMoneyFlow.reduce((a, b) => b + a, 0);
        let MFI
        // console.log({ Psum, Nsum})
        if(!Psum && !Nsum){
          MFI = 0
        }else if(Psum && !Nsum){

          Nsum = 1
          MFI = 100 - 100/(1 + (Psum/Nsum))
        }else if(!Psum && Nsum){
          Psum = 1
          MFI = 100 - 100/(1 + (Psum/Nsum))
        }else{
          MFI = 100 - 100/(1 + (Psum/Nsum))

        }

        // console.log({MFI, Psum, Nsum})
        MFI = {x:data[periodIndex].timestamp, y:MFI}

        MFIdata.push(MFI)

      })




  return { OBVdata, PVTdata, MFIdata };
}
