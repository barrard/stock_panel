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
// import {isRTH} from '../../../../indicators/indicatorHelpers/IsMarketOpen.js'
import { doZoomIn, doZoomOut } from "../utils.js";
import { drawAxisAnnotation, removeAllAxisAnnotations } from "../chartAxis.js";

import Loader from "../../../smallComponents/LoadingSpinner.js";
import { appendRegressionLines } from "../ChartMarkers/RegressionLines.js";
import API from "../../../API.js";
import { CenterLabel } from "../ChartMarkers/Labels.js";

const margin = {
  top: 15,
  right: 60,
  bottom: 20,
  left: 65,
};

let MOUSEX = 0;
let MOUSEY = 0;
let mouseDRAGSTART = null;
let dragStartData = [];
let lastBarCount = null;
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
      yScale: scaleLinear().range([innerHeight, 0]),

      timestamps: [],
      indicator: props.indicator, //momentum
      selectedWindows: [],
      availableWindows: [],
      indicatorData: {},
      data: [],
      partialOHLCdata: [],
      visibleIndicators: {
        minMaxMarkers: true,
        regressionLines: true,
      },
    };
  }

  // async loadIndicatorData({ indicator, timeframe, symbol, date }) {
  //   console.log({ indicator, timeframe, symbol });
  //   let indicatorData = await API.getIndicatorValues(
  //     { indicator, timeframe, symbol, date },
  //     this.props
  //   );
  //   console.log(indicatorData);
  //   return indicatorData;
  // }

  async componentDidMount() {}

  componentDidUpdate(prevProps, prevState) {
    // console.log({prevProps, prevState})
    // let {indicatorsData} = prevState
    // let currentIndicatorsData = this.state.indicatorsData
    // if(indicatorsData !== currentIndicatorsData){
    //   console.log('indicator data changed')
    //   console.log({indicatorsData})
    //   console.log(currentIndicatorsData)
    // }
    this.handleTimeFrameChange(prevState, prevProps);

    this.checkIfDataUpdated(prevProps);
    // this.didTickDataUpdate(prevProps);
    this.didWidthChange(prevProps);
  }

  async handleTimeFrameChange(prevState, prevProps) {
    let { data } = this.props;
    let prevData = prevProps.data;
    if (!(data && Array.isArray(data)) 
      || !(prevData && Array.isArray(prevData))){
        return;
      }
    let prevTimeframe = prevData[0].timeframe;
    let currentTimeframe = data[0].timeframe;
    if(!prevTimeframe || !currentTimeframe)return
    if (prevTimeframe !== currentTimeframe) {
      console.log(`NEW TIME FRAME for indicator ${this.props.indicator}`);
      setTimeout(() => {
        this.createIndicatorData();
      }, 0);
    }
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

  //   didTickDataUpdate(prevProps) {
  //     if(!partialOHLCdata.length)return
  //     //FIRST CHECK IF NEW TICK DATA IS HERE
  //     if (prevProps.currentTickData != this.props.currentTickData) {
  //       let { data } = this.props;
  //       // console.log(this.state)
  //       // console.log(this.props)
  //       let lastPartialDataTickTime = partialOHLCdata.slice(-1)[0].timestamp;
  //       let lastDataTickTime = this.state.indicatorData.slice(-1)[0].timestamp;

  //       let { priceChangeData, volumePriceProfile } = this.props.currentTickData;
  //       // console.log({ priceChangeData, data });
  //       // FIND INDEX WHERE WE NEED TO GET CURRENT TICK DATA
  //       let newTickDataIndex = priceChangeData.findIndex((tickData) => {
  //         return tickData.timestamp === lastDataTickTime;
  //       });
  //       let newData;
  //       let newTicks
  //       // console.log({ newTickDataIndex });
  //       // EITHER ADD ALL
  //       if (newTickDataIndex < 0) {
  //         newTicks = priceChangeData;

  //         // partialOHLCdata = [...partialOHLCdata, ...newTicks];
  //           // newData= [...this.state.indicatorData, ...priceChangeData]
  //         //OR ADD SLICED
  //       } else {
  //         //Slice it
  //         newTicks = priceChangeData.slice(newTickDataIndex + 1);
  //         // partialOHLCdata = [...partialOHLCdata, ...newTicks];
  //         // newData= [...this.state.indicatorData, ...newTicks]
  //       }
  //       if(lastPartialDataTickTime === lastDataTickTime){
  //         // console.log('also add to partial')
  //         partialOHLCdata = [...partialOHLCdata, ...newTicks];

  //       }
  //       newData = [...this.state.indicatorData, ...newTicks]
  //       let timestamps = partialOHLCdata.map(d => d.timestamp);

  //           this.setState({
  //             timestamps,
  //             data:newData
  //           });
  //       setTimeout(() => this.draw(), 0);
  //     }
  //   }
  checkIfDataUpdated(prevProps) {
    let data = this.props.data;
    let prevData = prevProps.data;
    if (!data) return;
    if (data && !prevData) {
      console.log("FIRST TIME");
      this.createIndicatorData(data);
    }
    if (!data || !prevData || !prevData.length) return;
    let symbol = this.props.symbol;
    if (!this.props.stock_data.rawCommodityCharts[symbol]) return;
    let timeframe = this.props.timeframe;
    if (!prevProps.stock_data.rawCommodityCharts[symbol]) return;
    if (!data.length || !prevData) return;
    let currentMin = data[data.length - 1];
    let prevMin = prevData[prevData.length - 1];

    if (prevMin.lastTickDateTime != currentMin.lastTickDateTime) {
      let { partialOHLCdata, indicatorData } = this.state;
      let lastPartialBar = partialOHLCdata[partialOHLCdata.length - 1];

      let lastData = indicatorData[indicatorData.length - 1];

      currentMin.x = currentMin.timestamp;
      if (lastData.x === currentMin.x) {
        if (lastPartialBar.timestamp === lastData.timestamp) {
          partialOHLCdata[partialOHLCdata.length - 1] = currentMin;
        }
        indicatorData[indicatorData.length - 1] = currentMin;
      } else {
        if (lastPartialBar.timestamp === lastData.timestamp) {
          partialOHLCdata.push(currentMin);
        }
        indicatorData.push(currentMin);
      }
      // this.setState({
      //   partialOHLCdata
      // })
      this.draw();
      // this.createIndicatorData(data);
    }
  }

  createIndicatorData() {
    let { symbol, timeframe, indicator } = this.props;
    let data = this.props.data;
    let availableWindows = [];
    Object.keys(data.slice(-1)[0][indicator]).forEach((key) => {
      let n = key.split(indicator).slice(-1)[0];
      availableWindows.push(n);
    });
    this.state.partialOHLCdata = data.map((d) => {
      return { x: d.timestamp, [indicator]: d[indicator] };
    });
    let timestamps = data.map((d) => d.timestamp);
    this.setState({
      availableWindows,
      data,
      timestamps,
      indicatorData: [...this.state.partialOHLCdata],
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
        if (!d[that.props.indicator] || !d[that.props.indicator][yName])
          return scale(0);
        return scale(d[that.props.indicator][yName]);
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
    let { indicator, innerHeight, innerWidth } = this.state;

    drawAxisAnnotation(
      `right${indicator}Tag`,
      this.state.yScale,
      y,
      svg,
      `${indicator}YAxis`
    );
  }

  zoomed() {
    if (!this.state.partialOHLCdata) return;

    let mouseZoomPOS = MOUSEX / this.state.innerWidth;
    //    let mouseZoomPOS = this.state.MOUSEX / this.state.innerWidth;
    if (mouseZoomPOS > 0.98) mouseZoomPOS = 0.97;
    if (mouseZoomPOS < 0.02) mouseZoomPOS = 0.03;
    let kScale = event.transform.k;

    if (event && event.sourceEvent && event.sourceEvent.type == "wheel") {
      let data = this.state.partialOHLCdata;

      if (kScale > zoomState) {
        if (this.state.partialOHLCdata.length < 30) {
          zoomState = kScale;

          return this.draw();
        }
        data = doZoomIn(
          { partialOHLCdata: this.state.partialOHLCdata },
          mouseZoomPOS
        );
      } else if (kScale < zoomState) {
        data = doZoomOut({
          allOHLCdata: this.state.indicatorData,
          partialOHLCdata: this.state.partialOHLCdata,
          xName: "x",
        });
      }
      // console.log(data);
      zoomState = kScale;
      this.state.partialOHLCdata = data;
      return this.draw();
    }
  }

  dragStart() {
    if (!this.state.partialOHLCdata)
      return console.log("FUUCK NO PARTIAL DAATT?");
    mouseDRAGSTART = event.x - margin.left;
    dragStartData = [...this.state.partialOHLCdata];
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
      let startIndex = this.state.indicatorData.findIndex(
        (d) => d.x === start.x
      );
      // console.log({startIndex, barCount})
      let dataEnd = dragStartData.slice(0, dragStartData.length - 1 - barCount);
      let zeroOrGreater = startIndex - barCount < 0 ? 0 : startIndex - barCount;
      let dataStart = this.state.indicatorData.slice(zeroOrGreater, startIndex);
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
      let endIndex = this.state.indicatorData.findIndex((d) => d.x === end.x);
      let dataStart = dragStartData.slice(barCount, dragStartData.length - 1);
      let dataEnd = this.state.indicatorData.slice(
        endIndex,
        endIndex + barCount
      );
      data = [...dataStart, ...dataEnd];
    }
    // console.log({ data });

    // this.setState({
    this.state.partialOHLCdata = data;
    // });

    return this.draw();
  }
  dragEnd() {
    // console.log("dragEnd");
    // console.log({x:event.x - margin.left,MOUSEX})
  }

  colorBackGround(svg, data){
    let date;
    let bgFlag = false
    debugger
        let bgBarClass = 'backgroundColorBars'
        let bgColorBars = svg.selectAll(`.${bgBarClass}`).data(data);
        bgColorBars.exit().remove();
        bgColorBars
          .enter()
          .append("rect")
          .merge(bgColorBars)
          .attr("class", bgBarClass)
          .attr(
            "x",
    
            (d) => this.state.timeScale(d.x)
            +margin.left
            // -(5)
            // +this.state.timeScale.bandwidth()/2
            // innerWidth / dra.length / 2
          )
          .attr("y", (d) => margin.top)
          .attr("height", this.state.innerHeight)
    
          // .attr("opacity")
          .attr("pointer-events", "none")
    
          .attr("width", (d, i) => 15)
          .attr("fill", (d, i) => {
            
            debugger
            let curDate = new Date(d.x).toLocaleString().split(',')[0]
            if(!date){
              date = curDate
            }
            if(date !=curDate){
              bgFlag = !bgFlag
              date = curDate
            }
            return bgFlag ? '#222':'#333'
    
          })
          .attr("stroke", "none")
       
    
    
    
    
      }

  setupChart() {
    console.log("SET UP INDICATOR");
    if (!this.state.chartRef.current)
      return console.log("NO INDICATOR ChaRT FOR you");
    let that = this;
    let svg = select(this.state.chartRef.current);
    svg.selectAll("*").remove();

    // this.colorBackGround(svg, [])

    let timeAxis = axisBottom(this.state.timeScale)
      .ticks(4)
      .tickSize(-this.state.innerHeight);

    //Make and store the indicator Axis from the scale objects keys
    let indicatorYAxes = {};
    // Object.keys(this.state.yScale).forEach((indicatorName) => {

    let yAxis = axisRight(this.state.yScale).ticks(4);
    //   .tickSize(-this.state.innerHeight);
    // });

    let chartWindow = svg
      .append("g")
      .attr("class", "chartWindow")
      .attr("transform", `translate(${margin.left},${margin.top})`)
      .attr("fill", "black");
    console.log("cher is setting up");

    //append timeAxis group
    let timeAxisG = svg
      .append("g")
      .attr("class", "white timeAxis")
      .attr(
        "transform",
        `translate(${margin.left}, ${this.props.height - margin.bottom})`
      )
      .call(timeAxis);

    let { indicator, innerHeight, innerWidth } = this.state;
    // Object.keys(indicatorYAxes).forEach((yAxisName, index) => {
    let yAxisG = svg
      .append("g")
      .attr("class", `white ${indicator}YAxis`)
      .attr(
        "transform",
        `translate(${this.props.width - margin.right}, ${margin.top})`
      )
      .call(yAxis);

    CenterLabel({
      symbol: indicator,
      chartWindow,
      x: "45%",
      y: margin.top + this.state.innerHeight / 2,
    });

    //User defined horizontal lines
    if (this.props.horizontalLines) {
      for (let lineName in this.props.horizontalLines) {
        chartWindow.append("line").attr("id", lineName);
      }
    }

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

      let { timeframe } = otherThat.props;
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
      yAxis,
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
      drawData = this.state.partialOHLCdata;
    }
    if (!drawData || !drawData.length || drawData.length < 2) return;

    let { indicator } = this.props;
    let [timeMin, timeMax] = extent(drawData.map(({ x }) => x));
    let allIndicatorData = [];
    drawData.forEach((d) => {
      for (let key in d[indicator]) {
        allIndicatorData.push(d[indicator][key]);
      }
    });
    let [indicatorMax, indicatorMin] = extent(
      allIndicatorData.map((indicatorData) => indicatorData)
    );

    this.state.timeScale.domain([timeMin, timeMax]);
    this.state.yScale.domain([indicatorMax, indicatorMin]);

    let svg = select(this.state.chartRef.current);
    // this.colorBackGround(svg, drawData)

    
    //append timeAxis group
    svg.select(".timeAxis").call(this.state.timeAxis);
    //append All the y indicator axis
    svg.select(`.${indicator}YAxis`).call(this.state.yAxis);
    
    let chartWindow = svg.select(".chartWindow");

    chartWindow.selectAll(`.${indicator}Line`).remove();

    let indicatorKey = (window) => `${window}`;
    let colors = [
      "white",
      "blue",
      "red",
      "green",
      "yellow",
      "orange",
      "pink",
      "magenta",
    ];
    this.state.availableWindows.map((windowVal, index) => {
      let yVal = `${indicatorKey(windowVal)}`;
      let xVal = "x";
      let color = colors[index % colors.length];
      this.drawLine({ indicator, chartWindow, drawData, xVal, yVal, color });
    });

    //User defined horizontal lines
    if (this.props.horizontalLines) {
      for (let lineName in this.props.horizontalLines) {
        let yVal = this.props.horizontalLines[lineName];
        this.drawHorizontalLine(lineName, {
          chartWindow,
          timeMin,
          timeMax,
          yVal,
        });
      }
    }
  }

  drawHorizontalLine(id, { chartWindow, timeMax, timeMin, yVal }) {
    chartWindow
      .select(`#${id}`)
      .attr("stroke", "orange")
      .attr("stroke-width", "5")
      .attr("pointer-events", "none")
      .attr("fill", "none")
      .attr("x1", this.state.timeScale(timeMin))
      .attr("y1", this.state.yScale(yVal))

      .attr("x2", this.state.timeScale(timeMax))
      .attr("y2", this.state.yScale(yVal));
  }

  drawLine({ indicator, chartWindow, yVal, xVal, drawData, color }) {
    chartWindow.selectAll(`.${indicator}${yVal}Line`).remove();

    let tickLinePath = chartWindow
      .selectAll(`.${indicator}${yVal}Line`)
      .data([drawData]);
    tickLinePath.exit().remove();

    tickLinePath
      .enter()
      .append("path")
      .merge(tickLinePath)
      .attr("stroke", color)
      .attr("stroke-width", "2")
      .attr("pointer-events", "none")
      .attr("fill", "none")

      .attr("class", `${indicator}${yVal}Line`) // Assign a class for styling
      .attr("d", this.lineFn(this.state.yScale, xVal, yVal));
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
  if (timeframe === "Daily") return 1000 * 60 * 60 * 24;
}
