import React, { useRef, useEffect, useState, useCallback } from "react";
import styled from "styled-components";
import { axisBottom, axisRight } from "d3-axis";
// import { useDispatch, useSelector } from "react-redux";

import { zoom } from "d3-zoom";
import { scaleLinear, scaleTime } from "d3-scale";
import { extent, max, min } from "d3-array";
import { select, event, mouse } from "d3-selection";
import { drag } from "d3-drag";
import {
  dropShadow,
  doZoomIn,
  doZoomOut,
  formatData,
  slopeLine,
  forwardFill,
  slope,
  intercept,
  xIntercept
} from "./chartHelpers/utils.js";
import diff from "../charts/chartHelpers/extrema.js";

import { addCandleSticks } from "./chartHelpers/candleStickUtils.js";
// import { line } from "d3";
import {
  drawAxisAnnotation,
  removeAllAxisAnnotations
} from "./chartHelpers/chartAxis.js";
import { makeEMA, makeSTD, drawMALine } from "./chartHelpers/MA-lines.js";
import { evaluateMinMaxPoints } from "./chartHelpers/evaluateMinMaxPoints.js";

let wtfFlag = false;
let margin = {
  top: 15,
  right: 60,
  bottom: 20,
  left: 35
};
class CandleStickChart extends React.Component {
  constructor(props) {
    super(props);
    let { width, height, timeframe, data } = props;
    let innerWidth = width - (margin.left + margin.right);

    let innerHeight = height - (margin.top + margin.bottom);

    if (data) data = data.slice(1000);
    this.state = {
      width,
      height,
      timeframe,
      data,
      minMaxTolerance: 3,
      regressionErrorLimit:9,
      MOUSEX: 0,
      MOUSEY: 0,
      mouseDRAGSART: null,
      dragStartData: [],
      lastBarCount: null,
      importantLines: [],
      timestamps: [],
      highs: [],
      lows: [],
      closes: [],
      opens: [],

      EMA_data: {
        "20": [],
        "50": [],
        "200": []
      }, //array of {x,y} coords
      STD_data: {
        "20": [],
        "50": [],
        "200": []
      }, //array of {x,y} coords
      timeMin: 0,
      timeMax: 0,
      regressionLines: {
        highLins: [],
        lowLines: []
      },
      allOHLCdata: [],
      rawOHLCData: [],
      partialOHLCdata: [],
      zoomState: 1,
      consolidatedMinMaxPoints: [],
      minMaxValues: {
        open: {
          minValues: [],
          maxValues: []
        },
        close: {
          minValues: [],
          maxValues: []
        },
        high: {
          minValues: [],
          maxValues: []
        },
        low: {
          minValues: [],
          maxValues: []
        }
      },
      visibleIndicators: {
        swingLines: false,
        minMaxMarkers: false,

        importantPriceLevel: false,
        regressionLines: false,
        ema20: false,
        ema200: false,
        ema50: false
      },
      chartRef: React.createRef(),
      innerWidth: width - (margin.left + margin.right),

      innerHeight: height - (margin.top + margin.bottom),

      timeScale: scaleTime().range([0, innerWidth]),

      priceScale: scaleLinear().range([innerHeight, 0]),

      candleHeightScale: scaleLinear().range([0, innerHeight]),

      timeAxis: {},
      //  axisBottom(this.state.timeScale)
      // .ticks(5)
      // .tickSize(-innerHeight),

      priceAxis: {}
      //  axisRight(this.state.priceScale)
      //   .ticks(8)
      //   .tickSize(-innerWidth),
    };
  }

  componentDidMount() {
    console.log("mounted");
  }
  componentDidUpdate(prevProps) {
    let prevData = prevProps.data;
    let currentData = this.props.data;
    if (prevData != currentData) {
      console.log("setup the chart!");
      console.log(this.state.data);
      let forwardFilledData = forwardFill(currentData);
      this.setState({
        rawOHLCData: currentData,
        allOHLCdata: forwardFilledData,
        partialOHLCdata: forwardFilledData
      });
      setTimeout(() => this.setupChart(), 0);
    }
    // console.log(prevProps);
    // console.log(this.props);
  }

  // useEffect(() => {
  //   // console.log("data data changed");
  //   // console.log({data})
  //   if (data && data.length) {
  //     if(wtfFlag)return
  //     wtfFlag = true
  //     // console.log("data data has length");

  //     console.log(data)
  //     rawOHLCData = [...data];
  //     data = forwardFill(data);
  //     console.log(rawOHLCData.length)
  //     console.log(data.length)
  //     allOHLCdata = data;
  //     partialOHLCdata = data;
  //     setupChart();
  //   }
  // }, [data]);

  // useEffect(() => {
  //   console.log("USE EFEFEct");
  //   console.log(minMaxValues);
  //   // console.log("draw");
  //   // console.log({allOHLCdata, partialOHLCdata})

  //   // if(true){
  //   //   draw([])
  //   // }else{

  //   draw();
  //   // }
  // }, [minMaxValues]);

  addHighLowMarkers(minMaxValues) {
    let that = this;
    if (!this.state.visibleIndicators.minMaxMarkers) return; //console.log(' minMaxMarkers not turned on');
    //console.log(minMaxValues);
    // console.log("add markers");
    //  data,  name, mincolor, maxcolor, tolerence, ismin, ismax, PriceLevels
    appendMinmaxMarkers("high", "green", "red", false, true, that);
    appendMinmaxMarkers("low", "green", "red", true, false, that);
    // appendMinmaxMarkers("open", "limegreen", "orangered", true, true, that);
    // appendMinmaxMarkers(
    //   "close",
    //   "lightseagreen",
    //   "palevioletred",

    //   true,
    //   true, that);

    function appendMinmaxMarkers(name, minColor, maxColor, min, max, that) {
      if (!that.state.visibleIndicators.minMaxMarkers)
        return console.log("minMaxMarkers not turned on");

      let svg = select(that.state.chartRef.current);
      let chartWindow = svg.select(".chartWindow");
      // console.log({ name });

      // let { minValues, maxValues } = diff.minMax(timestamps, data, minMaxTolerance);
      // console.log({ maxValues: maxValues.length });
      // console.log({ minValues: minValues.length });
      // console.log({ minMaxValues });
      // if(this.state.visibleIndicators.importantPriceLevel){
      //   appendMarker(
      //     consolidatedMinMaxPoints,
      //     'yellow',
      //     8,
      //     `consolidatedMinMaxPoint`,
      //     'importantPriceLevel',
      //     chartWindow
      //   );
      // }
      if (max) {
        // minMaxValues[name].maxValues = maxValues;
        // console.log(minMaxValues);
        let maxValues = minMaxValues[name].maxValues;
        that.appendMarker(
          maxValues,
          maxColor,
          5,
          `max${name}MarkerGroup`,
          name,
          chartWindow
        );
        that.appendSwingLevel(
          maxValues,
          maxColor,
          `max${name}PriceLevel`,
          chartWindow
        );
      }

      if (min) {
        // minMaxValues[name].minValues = minValues;
        let minValues = minMaxValues[name].minValues;

        that.appendMarker(
          minValues,
          minColor,
          5,
          `min${name}MarkerGroup`,
          name,
          chartWindow
        );
        that.appendSwingLevel(
          minValues,
          minColor,
          `min${name}PriceLevel`,
          chartWindow
        );
      }
    }
  }

  setupChart() {
    console.log("setupChart");
    let that = this;
    if (!this.state.chartRef.current) return;
    let svg = select(this.state.chartRef.current);
    svg.selectAll("*").remove();
    //min max tolerence  TODO make it more dynamic
    dropShadow(svg);
    let timeAxis = axisBottom(this.state.timeScale)
      .ticks(5)
      .tickSize(-this.state.innerHeight);

    let priceAxis = axisRight(this.state.priceScale)
      .ticks(8)
      .tickSize(-this.state.innerWidth);

    //Set up some data
    this.runMinMaxValues();

    //make all EMA/STD data
    Object.keys(this.state.EMA_data).forEach(MA_value => {
      this.state.EMA_data[MA_value] = makeEMA(MA_value, this.state.allOHLCdata);
      this.state.STD_data[MA_value] = makeSTD(MA_value, this.state.allOHLCdata);
    });

    //append timeAxis group
    let timeAxisG = svg
      .append("g")
      .attr("class", "timeAxis white")
      .attr(
        "transform",
        `translate(${margin.left}, ${this.state.height - margin.bottom})`
      )
      .call(timeAxis);
    //append priceAxis group
    let priceAxisG = svg
      .append("g")
      .attr("class", "priceAxis white")
      .attr(
        "transform",
        `translate(${this.state.width - margin.right}, ${margin.top})`
      )
      .call(priceAxis);

    //append the crosshair marker
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
      // .append('rect').attr('width', this.state.innerWidth).attr('height', this.state.innerHeight)
      .append("g")
      .attr("class", "chartWindow")
      .attr("transform", `translate(${margin.left},${margin.top})`)
      .attr("fill", "black");
    /* CrossHair */
    // create crosshairs
    var crosshair = chartWindow.append("g").attr("class", "line");
    // create horizontal line
    crosshair
      .append("line")
      .attr("id", "crosshairX")
      .attr("class", "crosshair");

    // create vertical line
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
        crosshair.style("display", "none");
        removeAllAxisAnnotations(svg);
      })
      .on("mousemove", function() {
        return mousemove(that, this);
      });

    function mousemove(otherThat, that) {
      let _mouse = mouse(that);
      // console.log(_mouse)
      otherThat.setState({
        MOUSEX: _mouse[0],
        MOUSEY: _mouse[1]
      });

      appendAxisAnnotations(
        otherThat.state.MOUSEX,
        otherThat.state.MOUSEY,
        svg
      );
      // let mouseDate = otherThat.state.timeScale.invert(MOUSEX);
      crosshair
        .select("#crosshairX")
        .attr("x1", otherThat.state.MOUSEX)
        .attr("y1", 0)
        .attr("x2", otherThat.state.MOUSEX)
        .attr("y2", otherThat.state.innerHeight);

      crosshair
        .select("#crosshairY")
        .attr("x1", otherThat.state.timeScale(otherThat.state.timestamps[0]))
        .attr("y1", otherThat.state.MOUSEY)
        .attr(
          "x2",
          otherThat.state.timeScale(
            otherThat.state.timestamps[otherThat.state.timestamps.length - 1]
          )
        )
        .attr("y2", otherThat.state.MOUSEY);

      // console.log({ x, y, mouseDate });
    }
    function appendAxisAnnotations(x, y, svg) {
      /* Candle stick is the top candleStickWindowHeight */
      // drawAxisAnnotation(topOpts, x);
      drawAxisAnnotation("bottomTimeTag", that.state.timeScale, x, svg);
      // if (y < candleStickWindowHeight) {
      // drawAxisAnnotation(leftOpts, y);
      drawAxisAnnotation("rightPriceTag", that.state.priceScale, y, svg);
      // removeVolumeAxisAnnotations();
      // } else if (y > candleStickWindowHeight) {
      //   y = y - candleStickWindowHeight;
      //   drawAxisAnnotation(leftVolOpts, y);
      //   drawAxisAnnotation(rightVolOpts, y);
      //   removePriceAxisAnnotations();
      // }
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

    svg.call(d3drag); //breaks if this is not first

    svg.call(d3zoom); //needs to be after drag
    this.setState({
      timeAxis,
      priceAxis
    });
    this.draw();
  } //setupChart()

  zoomed() {
    //console.log("ZOOMED");
    if (!this.state.partialOHLCdata) return;
    //console.log(this.state);
    let mouseZoomPOS = this.state.MOUSEX / this.state.innerWidth;
    if (mouseZoomPOS > 0.98) mouseZoomPOS = 0.97;
    if (mouseZoomPOS < 0.02) mouseZoomPOS = 0.03;
    let kScale = event.transform.k;
    // console.log("zoom");

    if (event && event.sourceEvent && event.sourceEvent.type == "wheel") {
      // setOHLCdata(prevData => {
      let data = this.state.partialOHLCdata;

      if (kScale > this.state.zoomState) {
        if (this.state.partialOHLCdata.length < 30) {
          this.setState({
            zoomState: kScale
          });

          return this.draw();
        }
        // this.setState({
        data = doZoomIn(
          { partialOHLCdata: this.state.partialOHLCdata },
          mouseZoomPOS
        );
        // });
      } else if (kScale < this.state.zoomState) {
        // this.setState({
        data = doZoomOut({
          allOHLCdata: this.state.allOHLCdata,
          partialOHLCdata: this.state.partialOHLCdata
        });
        // });
      }
      // console.log({candleZoom, data})

      this.setState({
        zoomState: kScale,
        partialOHLCdata: data
      });
      return this.draw();

      // });
    }
  }

  dragStart() {
    // console.log("dragStart");
    if (!this.state.partialOHLCdata) return;
    // console.log(this.state.partialOHLCdata);
    this.setState({
      mouseDRAGSART: event.x - margin.left,
      dragStartData: [...this.state.partialOHLCdata]
    });
  }
  dragged() {
    let xDragPOS = event.x - margin.left;
    let dragAmount = Math.abs(xDragPOS - this.state.mouseDRAGSART);
    let barWidth = this.state.innerWidth / this.state.dragStartData.length;
    let barCount = parseInt(dragAmount / barWidth);
    if (barCount < 1) return;
    if (this.state.lastBarCount === barCount) return;
    this.state.lastBarCount = barCount;
    // console.log("dragged");
    let data;
    if (xDragPOS > this.state.mouseDRAGSART) {
      // console.log('right')
      let start = this.state.dragStartData[0];
      let startIndex = this.state.allOHLCdata.findIndex(
        d => d.timestamp === start.timestamp
      );
      // console.log({startIndex, barCount})
      let dataEnd = this.state.dragStartData.slice(
        0,
        this.state.dragStartData.length - 1 - barCount
      );
      let zeroOrGreater = startIndex - barCount < 0 ? 0 : startIndex - barCount;
      let dataStart = this.state.allOHLCdata.slice(zeroOrGreater, startIndex);
      // console.log({
      //   dataEnd,
      //   zeroOrGreater,
      //   dataStart,
      //   dragStartData,
      //   barCount,
      //   startIndex,
      //   start
      // });
      data = [...dataStart, ...dataEnd];
    } else if (xDragPOS < this.state.mouseDRAGSART) {
      //console.log("left");
      let end = this.state.dragStartData[this.state.dragStartData.length - 1];
      let endIndex = this.state.allOHLCdata.findIndex(
        d => d.timestamp === end.timestamp
      );
      let dataStart = this.state.dragStartData.slice(
        barCount,
        this.state.dragStartData.length - 1
      );
      let dataEnd = this.state.allOHLCdata.slice(endIndex, endIndex + barCount);
      data = [...dataStart, ...dataEnd];
    }
    // console.log({ data });

    this.setState({
      partialOHLCdata: data
    });

    return this.draw();
  }
  dragEnd() {
    // console.log("dragEnd");
    // console.log({x:event.x - margin.left,MOUSEX})
  }

  draw(data) {
    // console.log("Draw");
    // console.log(this.state)
    // console.log({ data:this.state.data, allOHLCdata:this.state.allOHLCdata, partialOHLCdata:this.state.partialOHLCdata });
    let drawData;
    if (data) {
      drawData = data;
    } else {
      drawData = this.state.partialOHLCdata;
    }
    if (!drawData || !drawData.length) return;

    let priceMax = max(drawData, d => d.high);
    let priceMin = min(drawData, d => d.low);
    // priceMax = priceMax+(priceMax*.1);
    // priceMin = priceMin+(priceMin*.1);

    let [timeMin, timeMax] = extent(drawData.map(({ timestamp }) => timestamp));
    this.setState({ timeMin, timeMax });
    const priceRange = priceMax - priceMin;
    let timeframe = drawData[1].timestamp - drawData[0].timestamp;
    //  This helps the bars at the ends line up with the edge of the chart
    this.state.timeScale.domain([
      timeMin - timeframe / 2,
      timeMax + timeframe / 2
    ]);
    this.state.candleHeightScale.domain([0, priceRange]);
    this.state.priceScale.domain([priceMin, priceMax]);

    // get the SVG element
    let svg = select(this.state.chartRef.current);

    svg.select(".timeAxis").call(this.state.timeAxis);
    svg.select(".priceAxis").call(this.state.priceAxis);
    let chartWindow = svg.select(".chartWindow");
    let candleWidth = this.state.innerWidth / drawData.length;

    addCandleSticks(
      drawData,
      chartWindow,
      candleWidth,
      this.state.timeScale,
      this.state.priceScale,
      this.state.candleHeightScale
    );

    this.addHighLowMarkers(this.state.minMaxValues);
    // appendFutureLines();
    let scales = {
      timeScale: this.state.timeScale,
      priceScale: this.state.priceScale
    };
    this.appendEMA(chartWindow, scales);
    this.appendSTD();
    this.appendImportantPriceLevel(this, chartWindow, scales);
    this.appendRegressionLines(this, chartWindow, scales);
  }

  appendEMA(chartWindow, { timeScale, priceScale }) {
    if (this.state.visibleIndicators.ema20) {
      //show 20 EMA
      drawMALine(chartWindow, this.state.EMA_data, 20, {
        timeScale,
        priceScale
      });
    }
    if (this.state.visibleIndicators.ema50) {
      //show 50 EMA
      drawMALine(chartWindow, this.state.EMA_data, 50, {
        timeScale,
        priceScale
      });
    }
    if (this.state.visibleIndicators.ema200) {
      //show 200 EMA
      drawMALine(chartWindow, this.state.EMA_data, 200, {
        timeScale,
        priceScale
      });
    }
  }

  appendSTD(chartWindow, timeScale, priceScale) {
    // console.log({minMaxValues})
    // console.log("TODO");
  }

  appendMarker(data, color, r, classAttr, name, chartWindow) {
    let markers = chartWindow.selectAll(`.${classAttr}`).data(data);
    markers.exit().remove();
    markers
      .enter()
      .append("circle")
      .merge(markers)
      .attr("cx", d => this.state.timeScale(d.x))
      .attr("cy", d => this.state.priceScale(d.y))
      .attr("r", r)
      .attr("fill", color)
      .attr("stroke", "white")
      .attr("class", (d, i) => `${classAttr} ${i} minMaxMarkers `)
      .on("mouseover", function() {
        if (name === "futureMarker" || name === "importantPriceLevel") {
          let x = select(this).attr("cy");
          let y = select(this).attr("cx");
          // let futureDate = timeScale.invert(x);
          // let futurePrice = priceScale.invert(y);
          console.log({ x, y });
        } else {
          // return drawDoubleSlopeLines(this, name);
        }
      })
      .on("mouseleave", this.removeLine);
    // .style("filter", "url(#drop-shadow)");
  }

  appendRegressionLines(that, chartWindow, { priceScale, timeScale }) {
    if (!this.state.visibleIndicators.regressionLines) return; //console.log('importantPriceLevel not turned on');;

    console.log(this.state.regressionLines);
    let { regressionLines } = this.state;
    let { highLines, lowLines } = regressionLines;
    let allLines = [...highLines, ...lowLines];
    let plottedRegressionLines = chartWindow
      .selectAll(`.${"regressionLines"}`)
      .data(allLines);

    plottedRegressionLines.exit().remove();
    plottedRegressionLines
      .enter()
      .append("line")
      .merge(plottedRegressionLines)

      .attr("y1", d => priceScale(d.y1))

      .attr("x1", d => timeScale(d.x1))
      .attr("x2", d => timeScale(d.x2))
      .attr("y2", d => priceScale(d.y2))
      .attr("stroke-width", 2)
      .attr("stroke", d => {
        return "yellow";
      })
      .attr("class", `regressionLines`)
      .style("opacity", 0.5)
      .on("mouseover", function(d) {
        console.log(d);
        this.classList.add("hoveredRegressionLine");
        that.regressionNearbyPoints(d, chartWindow, {
          priceScale,
          timeScale
        });
      })
      .on("mouseout", function() {
        this.classList.remove("hoveredRegressionLine");
        chartWindow.selectAll(".regressionNearbyPoint").remove();
        console.log("remove");
      });
  }

  regressionNearbyPoints(data, chartWindow, { priceScale, timeScale }) {
    console.log(data);
    let regressionNearbyPoint = chartWindow
      .selectAll(`.regressionNearbyPoint`)
      .data(data.nearbyPoints);
    regressionNearbyPoint.exit().remove();
    regressionNearbyPoint
      .enter()
      .append("circle")
      .merge(regressionNearbyPoint)
      .attr("cx", d => timeScale(d.x))
      .attr("cy", d => priceScale(d.y))
      .attr("r", 10)
      .attr("fill", "blue")
      .attr("stroke", "white")
      .attr("class", `regressionNearbyPoint`);
  }

  // appendImportantPriceLevel(data, minColor, `minPriceLevel`);
  appendImportantPriceLevel(that, chartWindow, { priceScale, timeScale }) {
    if (!this.state.visibleIndicators.importantPriceLevel) return; //console.log('importantPriceLevel not turned on');;
    console.log({ importantLines: this.state.importantLines });

    let importantPriceLevel = chartWindow
      .selectAll(`.${"importantPriceLevel"}`)
      .data(this.state.importantLines);

    importantPriceLevel.exit().remove();
    importantPriceLevel
      .enter()
      .append("line")
      .merge(importantPriceLevel)

      .attr("y1", d => priceScale(d.currentPoint.point.y))

      .attr("x1", d => timeScale(d.currentPoint.point.x))
      .attr("x2", d => timeScale(d.secondPoint.timeMax))
      .attr("y2", d => priceScale(d.secondPoint.timeMaxPrice))
      .attr("stroke-width", 3)
      .attr("stroke", d => {
        return "lawngreen";
        // let count = d.nearbyPoints.length
        // if(count < 3)return 'lawngreen'
        // if(count < 6)return 'darkslateblue'
        // if(count < 9)return 'darkgreen'
        // if(count < 12)return 'forestgreen'
        // if(count < 15)return 'chartreuse'
        // if(count < 18)return 'orangered'
        // if(count < 21)return 'crimson'
        // if(count < 24)return 'mediumvioletred'
        // if(count >=24)return 'magenta'
      })
      .attr("class", `importantPriceLevel`)
      .style("opacity", 0.7)
      .on("mouseover", function(d) {
        // console.log(d)
        this.classList.add("importantLine");
        that.highlightNearbyPoints(d, chartWindow, {
          priceScale,
          timeScale
        });
      })
      .on("mouseout", function() {
        this.classList.remove("importantLine");
        chartWindow.selectAll(".nearbyPoint").remove();
        console.log("remove");
      });
  }
  highlightNearbyPoints(data, chartWindow, { priceScale, timeScale }) {
    console.log(data);
    let nearbyPoints = chartWindow
      .selectAll(`.nearbyPoint`)
      .data(data.nearbyPoints);
    nearbyPoints.exit().remove();
    nearbyPoints
      .enter()
      .append("circle")
      .merge(nearbyPoints)
      .attr("cx", d => timeScale(d.x))
      .attr("cy", d => priceScale(d.y))
      .attr("r", 10)
      .attr("fill", "blue")
      .attr("stroke", "white")
      .attr("class", `nearbyPoint`);

    let currentPoint = chartWindow
      .selectAll(`.currentPoint`)
      .data([data.currentPoint.point]);
    currentPoint.exit().remove();
    currentPoint
      .enter()
      .append("circle")
      .merge(currentPoint)
      .attr("cx", d => timeScale(d.x))
      .attr("cy", d => priceScale(d.y))
      .attr("r", 10)
      .attr("fill", "green")
      .attr("stroke", "white")
      .attr("class", `currentPoint nearbyPoint`);

    let secondPoint = chartWindow
      .selectAll(`.secondPoint`)
      .data([data.secondPoint.point]);
    secondPoint.exit().remove();
    secondPoint
      .enter()
      .append("circle")
      .merge(secondPoint)
      .attr("cx", d => timeScale(d.x))
      .attr("cy", d => priceScale(d.y))
      .attr("r", 10)
      .attr("fill", "red")
      .attr("stroke", "black")
      .attr("class", `secondPoint nearbyPoint`);
  }

  // appendSwingLevel(minPriceLevels, minColor, `minPriceLevel`);
  appendSwingLevel(data, color, classAttr, chartWindow) {
    // console.log("appedning pricle level");
    if (!this.state.visibleIndicators.swingLines) return; //console.log("swingLines not turned on");
    let priceLevels = chartWindow.selectAll(`.${classAttr}`).data(data);
    let dataLength = priceLevels.data().length;
    priceLevels.exit().remove();
    priceLevels
      .enter()
      .append("line")
      .merge(priceLevels)

      .attr("x1", d => this.state.timeScale(d.x))
      .attr("y1", d => this.state.priceScale(d.y))
      .attr("x2", (d, i) => {
        if (i + 1 < dataLength) {
          let prevData = priceLevels.data()[i + 1];
          if (!prevData) return console.log("fail");
          return this.state.timeScale(prevData.x);
        } else {
          return this.state.timeScale(d.x);
        }
      })
      .attr("y2", (d, i) => {
        if (i + 1 < dataLength) {
          let prevData = priceLevels.data()[i + 1];
          if (!prevData) return console.log("fail");
          return this.state.priceScale(prevData.y);
        } else {
          return this.state.priceScale(d.y);
        }
      })
      .attr("stroke", color)
      .attr("class", `${classAttr} swingLines`);
    // .style("filter", "url(#drop-shadow)");
  }

  removeLine() {
    return console.log("test");
  }

  slopeCompare({ line1, line2 }) {
    let slopeLine1 = slopeLine(line1);
    let slopeLine2 = slopeLine(line2);
    let avgSlope = (slopeLine1 + slopeLine2) / 2;
    let line2EndPoint = { x: line2.x2, y: line2.y2 };
    let yIntcpt = intercept(line2EndPoint, avgSlope);
    //Whats the date 5 bars out
    let barWidth = this.state.innerWidth / this.state.partialOHLCdata.length;
    let futureX = line2.x2 + barWidth * 10;
    let futureDate = this.state.timeScale.invert(futureX);
    let futureY = yIntcpt + futureX * avgSlope;
    let futurePrice = this.state.priceScale.invert(futureY);
    let futureEndPoint = { x: futureDate, y: futurePrice };
    return { futureEndPoint, line2EndPoint };
  }
  toggleIndicators(indicator) {
    console.log({ indicator, minMaxValues: this.state.minMaxValues });
    let svg = select(this.state.chartRef.current);
    let markers = svg.selectAll(`.${indicator}`);
    markers.remove();
    let temp = this.state.visibleIndicators;
    let val = temp[indicator];
    val = !val;
    temp[indicator] = val;
    this.setState({
      visibleIndicators: temp
    });
    setTimeout(() => this.draw(), 0);
  }

  runMinMaxValues() {
    console.log(this.state.minMaxTolerance);
    if (!this.state.rawOHLCData) return;
    let timestamps = this.state.rawOHLCData.map(d => d.timestamp);
    let highs = this.state.rawOHLCData.map(d => d.high);
    let lows = this.state.rawOHLCData.map(d => d.low);
    let closes = this.state.rawOHLCData.map(d => d.close);
    let opens = this.state.rawOHLCData.map(d => d.open);
    let localMinMaxStore = {
      high: { maxValues: [] },
      low: { minValues: [] },
      close: { minValues: [], maxValues: [] }
    };
    console.log({ highs: this.state.highs, data: this.props.data });
    let allValues = [];
    var { minValues, maxValues } = diff.minMax(
      timestamps,
      highs,
      this.state.minMaxTolerance
    );
    allValues = [...allValues, ...maxValues];
    localMinMaxStore["high"].maxValues = maxValues;
    // minMaxValues["high"].minValues = minValues;

    var { minValues, maxValues } = diff.minMax(
      timestamps,
      lows,
      this.state.minMaxTolerance
    );
    allValues = [...allValues, ...minValues];
    // minMaxValues["low"].maxValues = maxValues;
    localMinMaxStore["low"].minValues = minValues;
    // var { minValues, maxValues } = diff.minMax(timestamps, opens, minMaxTolerance);
    // allValues = [...allValues, ...minValues, ...maxValues]
    // minMaxValues["open"].maxValues = maxValues;
    // minMaxValues["open"].minValues = minValues;
    var { minValues, maxValues } = diff.minMax(
      timestamps,
      closes,
      this.state.minMaxTolerance
    );
    allValues = [...allValues, ...minValues, ...maxValues];
    localMinMaxStore["close"].maxValues = maxValues;
    localMinMaxStore["close"].minValues = minValues;

    // let newConsolidatedPoints = diff.consolidateMinMaxValues(
    //   allValues,
    //   this.state.allOHLCdata
    // );
    // let highPoints = [...localMinMaxStore.high.maxValues, ...localMinMaxStore.close.maxValues].sort(byDate)
    // let lowPoints = [...localMinMaxStore.low.minValues, ...localMinMaxStore.close.minValues].sort(byDate)
    let highPoints = [...localMinMaxStore.high.maxValues];
    let lowPoints = [...localMinMaxStore.low.minValues];
    //run a cool regression function with the min max values
    let errLimit = this.state.regressionErrorLimit;
    let highLines = diff.regressionAnalysis(highPoints, errLimit);
    let lowLines = diff.regressionAnalysis(lowPoints, errLimit);
    console.log({ highLines, lowLines });
    this.setState({
      minMaxValues: localMinMaxStore,
      // consolidatedMinMaxPoints: newConsolidatedPoints,
      timestamps,
      opens,
      highs,
      lows,
      closes,
      regressionLines: { highLines, lowLines }
      // importantLines: evaluateMinMaxPoints(newConsolidatedPoints, timestamps)
    });
    setTimeout(() => this.draw(), 0);
  }

  render() {
    return (
      <div>
        <h3>{this.state.timeframe}</h3>
        <ToggleIndicatorButton
          posLeft={0}
          onClick={() => this.toggleIndicators("swingLines")}
          isSet={this.state.visibleIndicators.swingLines}
        >
          SWINGLINES
        </ToggleIndicatorButton>
        <ToggleIndicatorButton
          posLeft={3}
          onClick={() => this.toggleIndicators("minMaxMarkers")}
          isSet={this.state.visibleIndicators.minMaxMarkers}
        >
          MARKERS
        </ToggleIndicatorButton>

        <ToggleIndicatorButton
          onClick={() => this.toggleIndicators("importantPriceLevel")}
          isSet={this.state.visibleIndicators.importantPriceLevel}
        >
          PRICE LEVELS
        </ToggleIndicatorButton>
        <ToggleIndicatorButton
          onClick={() => this.toggleIndicators("regressionLines")}
          isSet={this.state.visibleIndicators.regressionLines}
        >
          Regression Lines
        </ToggleIndicatorButton>

        <ToggleIndicatorButton
          onClick={() => this.toggleIndicators("ema20")}
          isSet={this.state.visibleIndicators.ema20}
        >
          20 EMA
        </ToggleIndicatorButton>

        <ToggleIndicatorButton
          onClick={() => this.toggleIndicators("ema50")}
          isSet={this.state.visibleIndicators.ema50}
        >
          50 EMA
        </ToggleIndicatorButton>
        <ToggleIndicatorButton
          onClick={() => this.toggleIndicators("ema200")}
          isSet={this.state.visibleIndicators.ema200}
        >
          200 EMA
        </ToggleIndicatorButton>

        <svg
          ref={this.state.chartRef}
          width={this.state.width}
          height={this.state.height}
          className="svgChart"
        ></svg>
        <Label>MinMax Point Tolerance</Label>
        <input
          value={this.state.minMaxTolerance}
          onChange={e => {
            console.log("ook");
            this.setState({
              minMaxTolerance: parseInt(e.target.value)
            });
          }}
          type="number"
        />
        <br/>

        <Label>Regression RMS error limit</Label>
        <input
          value={this.state.regressionErrorLimit}
          onChange={e => {
            this.setState({
              regressionErrorLimit: parseInt(e.target.value)
            });
          }}
          type="number"
        />
        <button onClick={() => this.runMinMaxValues()}>Reset </button>
      </div>
    );
  }
}

export default CandleStickChart;

let ToggleIndicatorButton = styled.button`
position: relative;
top:0;
/* left:${({ posLeft }) => posLeft}; */
  background: ${({ isSet }) => (isSet ? "green" : "red")};
`;

let Label = styled.span`
  color: white;
`;

let Block = styled.span`
  display: block;
`;

function byDate(a, b) {
  if (a.timestamp > b.timestamp) return 1;
  if (a.timestamp < b.timestamp) return -1;
}
