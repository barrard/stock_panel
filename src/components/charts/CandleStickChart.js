import React, { useRef, useEffect, useState, useCallback } from "react";
import { connect } from "react-redux";
import { Link, withRouter } from "react-router-dom";
import styled from "styled-components";
import { axisBottom, axisRight } from "d3-axis";
// import { useDispatch, useSelector } from "react-redux";
import {
  view_selected_stock,
  getMinutesForTimeframe,
  appendMinutelyCommodityDataAsNeeded,
} from "../landingPageComponents/chart_data_utils.js";
import TradesList from "./chartHelpers/TradesList.js";
import { zoom } from "d3-zoom";
import { scaleLinear, scaleTime } from "d3-scale";
import { extent, max, min, mean } from "d3-array";
import { select, event, mouse } from "d3-selection";
import { drag } from "d3-drag";
import ToggleIndicators from "./chartHelpers/ToggleIndicators.js";
import Loader from "../smallComponents/LoadingSpinner.js";
import {
  priceRangeGreen,
  priceRangeRed,
  dropShadow,
  doZoomIn,
  doZoomOut,
} from "./chartHelpers/utils.js";
import Timers from "./chartHelpers/Timers.js";
import {
  view_selected_commodity,
  getMinutelyCommodityData,
} from "../landingPageComponents/chart_data_utils.js";

import diff from "../charts/chartHelpers/extrema.js";
import { addCandleSticks } from "./chartHelpers/candleStickUtils.js";
// import { line } from "d3";
import {
  drawAxisAnnotation,
  removeAllAxisAnnotations,
  addAxisAnnotationElements, DrawCrossHair
} from "./chartHelpers/chartAxis.js";
import { makeEMA, makeSTD, drawMALine } from "./chartHelpers/MA-lines.js";
import API from "../API.js";
import RegressionSettings from "./chartHelpers/regressionSettings.js";
import {
  FibonacciLines,
  makeFibonacciData,
} from "./chartHelpers/ChartMarkers/FibonacciLines.js";


let wtfFlag = false;
let margin = {
  top: 15,
  right: 60,
  bottom: 20,
  left: 35,
};

let MOUSEX = 0;
let MOUSEY = 0;
let prevMOUSEX = 0;
let mouseDRAGSART = null;
let dragStartData = [];
let lastBarCount = null;
let partialOHLCdata = [];
let zoomState = 1;
class CandleStickChart extends React.Component {
  constructor(props) {
    super(props);
    let { width, height, symbol } = props;
    // console.log('WHATS THE WIDTH')
    // console.log({width})
    // console.log({ symbol });
    // console.log({ symbol });
    // console.log({ symbol });
    // console.log({ symbol });
    let innerWidth = width - (margin.left + margin.right);

    let innerHeight = height - (margin.top + margin.bottom);

    this.state = {
      width,
      height,
      timeframe: "1Min",
      symbol: symbol,
      allOHLCdata: [],
      minMaxTolerance: 3,
      regressionErrorLimit: 9,
      importantPriceLevels: [],
      priceLevelMinMax: 20,
      priceLevelSensitivity: 30,
      fibonacciMinMax: 75,
      fibonacciSensitivity: 50,
      timestamps: [],
      highs: [],
      lows: [],
      closes: [],
      opens: [],
      EMA_data: {
        "20": [],
        "50": [],
        "200": [],
      }, //array of {x,y} coords
      STD_data: {
        "20": [],
        "50": [],
        "200": [],
      }, //array of {x,y} coords
      timeMin: 0,
      timeMax: 0,
      regressionLines: {
        highLins: [],
        lowLines: [],
      },
      rawOHLCData: [],
      consolidatedMinMaxPoints: [],
      minMaxValues: {
        open: {
          minValues: [],
          maxValues: [],
        },
        close: {
          minValues: [],
          maxValues: [],
        },
        high: {
          minValues: [],
          maxValues: [],
        },
        low: {
          minValues: [],
          maxValues: [],
        },
      },
      visibleIndicators: {
        swingLines: false,
        minMaxMarkers: false,
        showTrades: false,
        importantPriceLevel: false,
        regressionLines: false,
        ema20: false,
        ema200: false,
        ema50: false,
        fibonacciLines: false,
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

      priceAxis: {},
      //  axisRight(this.state.priceScale)
      //   .ticks(8)
      //   .tickSize(-innerWidth),
    };
  }

  async componentDidMount() {
    // console.log("mounted");
    let { symbol } = this.props.match.params;
    const timeframe = this.state.timeframe;
    const props = this.props;
    if (this.props.type === "stock") {
      if (
        !this.props.stock_data.charts[symbol] ||
        !this.props.stock_data.charts[symbol][timeframe]
      ) {
        // console.log("fetching data");
        const end = new Date().getTime();
        await view_selected_stock({ timeframe, end, symbol, props });
        // console.log("SET NEW DATA???");
        this.setNewData(symbol, timeframe);
      } else {
        // console.log("WTF WE ALREADY HAVE DATA>!");
        this.setNewData(symbol, timeframe);
      }
    } else if (this.props.type === "commodity") {
      let regressionData= await API.getCommodityRegressionValues(this.props.symbol, this.props);
      API.getAllCommodityTrades(this.props.symbol, this.props);
      if (!this.props.stock_data.commodity_data[symbol]) {
        // console.log("loadCommodityData");
        // console.log({ timeframe, symbol });
        await this.loadCommodityData({ timeframe, symbol, props });
        // console.log("SET NEW DATA???");
        this.setNewData(symbol, timeframe);
      } else {
        // console.log("WTF WE ALREADY HAVE DATA>!");
        this.setNewData(symbol, timeframe);
      }
      console.log({regressionData})
      let {fibonacciMinMax,
        fibonacciSensitivity,
        minMaxTolerance,
        priceLevelMinMax,
        priceLevelSensitivity,
        regressionErrorLimit,} = this.props.stock_data.commodityRegressionData[symbol][timeframe]

        this.setState({
        fibonacciMinMax,
        fibonacciSensitivity,
        minMaxTolerance,
        priceLevelMinMax,
        priceLevelSensitivity,
        regressionErrorLimit      })
    }
  }
  componentDidUpdate(prevProps, prevState) {
    if (!this.props.stock_data.has_symbols_data) {
      return console.log("nothing is ready yet");
    }
    let prevStockData = prevProps.stock_data;
    // console.log({ prevState, prevStockData });
    // console.log("state");
    // console.log(this.state);
    // console.log("props");
    // console.log(this.props.stock_data);

    // console.log({ prevData, currentData });
    // this.handleDataChange(prevState, prevProps);

    this.handleTimeFrameChange(prevState, prevProps);
    this.handleSymbolChange(prevState, prevProps);
    this.handleNewTick(prevState, prevProps);
    this.didWidthChange(prevProps);

  }

  didWidthChange(prevPops) {
    if (prevPops.width != this.props.width) {
      console.log("Update width");
      let { width } = this.props;
      let innerWidth = width - (margin.left + margin.right);
      let { timeScale } = this.state;
      timeScale.range([0, innerWidth])
      this.setState({
        timeScale, innerWidth, width
      });
      setTimeout(() => this.setupChart(), 0);

    }
  }

  handleUpdatingOtherTimeframesOnTick(prevProps) {
    let { type, stock_data, symbol } = this.props;
    const timeframe = this.state.timeframe;
    let currentData;
    let currentRawOHLCData;

    let currentTickData = stock_data.currentTickData[symbol];
    let lastTickData = prevProps.stock_data.currentTickData[symbol];
    // console.log(stock_data);

    currentData = stock_data.commodity_data[symbol][timeframe];
    // console.log(currentData);
    // console.log(this.state.rawOHLCData);
    currentRawOHLCData = this.state.rawOHLCData;
    if (!currentData || !currentData.length) return;
    let lastBar = currentData[currentData.length - 1];
    let lastPartialBar = partialOHLCdata.slice(-1)[0];
    let secondLastPartialBar = partialOHLCdata.slice(-2)[0];

    //Get Time frame minutes?  and maybe figure out what the next bar time should be
    let nextChartDataBarTimestamp =
      lastBar.timestamp + 1000 * 60 * getMinutesForTimeframe(timeframe);

    // console.log({
    //   lastBar,
    //   lastPartialBar,
    //   secondLastPartialBar,
    //   nextChartDataBarTimestamp,
    //   currentTickData,
    // });
    let { open, high, low, close, volume, timestamp } = currentTickData;
    if (currentTickData.timestamp >= nextChartDataBarTimestamp) {
      console.log("ADD THE NEW BAR");
      let newBar = {
        open,
        high,
        low,
        close,
        volume,
        timestamp,
      };
      if (lastPartialBar.timestamp === currentData.timestamp) {
        partialOHLCdata.push(lastBar);
      }
      currentData.push(newBar);
      currentRawOHLCData.push(newBar);
    } else {
      console.log("JUST ADD THIS DATA TO THE last data bar");
      // console.log(currentTickData);

      lastBar.close = close;
      if (high > lastBar.high) {
        lastBar.high = high;
      }

      if (low < lastBar.low) {
        lastBar.low = low;
      }

      if (lastPartialBar.timestamp === lastBar.timestamp) {
        partialOHLCdata[partialOHLCdata.length - 1] = lastBar;
      }
      currentData[currentData.length - 1] = lastBar;
      currentRawOHLCData[currentRawOHLCData.length - 1] = lastBar;
    }
    /**
     * this needs ot be the last bar
     * in the data, but we dont want
     * to add it over and over, just once
     */
    // console.log({lastBar, currentTickData})
    // if (lastBar.timestamp !== currentTickData.timestamp) {
    //   // console.log("pushin");
    //   currentData.push(currentTickData);
    //   currentRawOHLCData.push(currentTickData);
    //   if (lastPartialBar.timestamp === lastBar.timestamp) {
    //     partialOHLCdata.push(currentTickData);
    //   }

    //   this.createPriceLevelsData();
    // } else {
    //   // console.log("not pushing");
    //   currentData[currentData.length - 1] = currentTickData;
    //   currentRawOHLCData[currentRawOHLCData.length - 1] = currentTickData;

    // }
    // console.log({partialOHLCdata, currentData})
    this.setState({
      allOHLCdata: [...currentData],
      rawOHLCData: [...currentRawOHLCData],
    });
    // setTimeout(() => this.setupChart(), 0);
  }

  addTickDataToOtherTimeframes(prevProps) {
    // console.log("addTickDataToOtherTimeframes");
    let { type, stock_data, symbol } = this.props;
    const timeframe = this.state.timeframe;
    let currentData;
    let currentRawOHLCData;
    let currentTickData = stock_data.currentTickData[symbol];
    let lastTickData = prevProps.stock_data.currentTickData[symbol];

    for (let timeframe in stock_data.commodity_data[symbol]) {
      // console.log({ timeframe });
      if (timeframe !== "1Min") {
        // console.log({ stock_data, lastTickData, currentTickData });
        let chart_data = stock_data.commodity_data[symbol][timeframe];
        let props = this.props;
        // console.log({ chart_data });

        chart_data = appendMinutelyCommodityDataAsNeeded(
          props,
          chart_data,
          timeframe,
          symbol
        );
        // console.log({ chart_data });
      }
    }
  }

  handleNewTick(prevState, prevProps) {
    let { type, stock_data, symbol } = this.props;
    const timeframe = this.state.timeframe;
    let currentData;
    let currentRawOHLCData;

    if (type === "commodity") {
      let currentTickData = stock_data.currentTickData[symbol];
      let lastTickData = prevProps.stock_data.currentTickData[symbol];
      if (currentTickData !== lastTickData) {
        if (timeframe !== "1Min")
          return this.handleUpdatingOtherTimeframesOnTick(prevProps);
        // console.log(currentTickData.timestamp);
        //TODO
        this.addTickDataToOtherTimeframes(prevProps);
        // console.log(stock_data);
        //TODO
        // console.log({currentTickData,
        //   lastTickData})
        //   console.log(currentTickData === lastTickData)
        if (!stock_data.commodity_data[symbol]["1Min"]) {
          // console.log(stock_data.commodity_data);
          return; //why don't we have 1Min data yet?
        }
        // console.log("new Tick data");
        // console.log(stock_data.commodity_data[symbol]["1Min"].length)
        currentData = stock_data.commodity_data[symbol]["1Min"];
        // console.log(currentData)
        // console.log(this.state.rawOHLCData)
        currentRawOHLCData = this.state.rawOHLCData;
        if (!currentData.length) return;
        let lastBar = currentData[currentData.length - 1];
        let lastPartialBar = partialOHLCdata.slice(-1)[0];

        /**
         * this needs ot be the last bar
         * in the data, but we dont want
         * to add it over and over, just once
         */
        // console.log({lastBar, currentTickData})
        if (lastBar.timestamp !== currentTickData.timestamp) {
          // console.log("pushin");
          // console.log({currentTickData})
          if (lastPartialBar.timestamp === lastBar.timestamp) {
            partialOHLCdata.push(currentTickData);
          }
          currentData.push(currentTickData);
          currentRawOHLCData.push(currentTickData);
          console.log('New Bar')
          this.createPriceLevelsData();
        } else {
          // console.log("not pushing");
          // console.log({currentTickData})
          currentData[currentData.length - 1] = currentTickData;
          currentRawOHLCData[currentRawOHLCData.length - 1] = currentTickData;
          if (lastPartialBar.timestamp === currentTickData.timestamp) {
            partialOHLCdata[partialOHLCdata.length - 1] = currentTickData;
          }
        }
        // console.log({partialOHLCdata, currentData})
        this.setState({
          allOHLCdata: [...currentData],
          rawOHLCData: [...currentRawOHLCData],
        });
      
        setTimeout(() => this.setupChart(), 0);
      }
    } else if (type == "stock") {
      console.log("//TODO!!!");
    }
  }
  async handleSymbolChange(prevState, prevProps) {
    let prevSymbol = prevProps.symbol;
    let currentSymbol = this.props.symbol;
    if (prevSymbol !== currentSymbol) {
      console.log("Symbol Changed");
      console.log({ prevSymbol, currentSymbol });

      let timeframe = this.state.timeframe;
      let symbol = currentSymbol;
      this.setState({
        symbol,
      });
      if (this.props.type === "stock") {
        this.getStockDataSetUp(symbol, timeframe);
      } else if (this.props.type === "commodity") {
        let { props } = this;
        API.getCommodityRegressionValues(this.props.symbol, this.props);
        API.getAllCommodityTrades(this.props.symbol, this.props);
        await this.loadCommodityData({ timeframe, symbol, props });
        this.setNewData(symbol, timeframe);
      }
    }
  }

  async getStockDataSetUp(symbol, timeframe) {
    let props = this.props;

    if (
      !this.props.stock_data.charts[symbol] ||
      !this.props.stock_data.charts[symbol][timeframe]
    ) {
      const end = new Date().getTime();
      await view_selected_stock({ timeframe, end, symbol, props });
      this.setState({
        allOHLCdata: this.props.stock_data.charts[symbol][timeframe],
      });
    } else {
      this.setState({
        allOHLCdata: this.props.stock_data.charts[symbol][timeframe],
      });
    }
  }

  handleDataChange(prevState, prevProps) {
    let { symbol, stock_data, type } = this.props;
    /**
     * Check Prev symbol and timeframe
     * to determine how we'll update.
     * i.e. 'all new data', or 'just new bar'
     */
    let prevSymbol = prevProps.symbol;
    let currentSymbol = this.props.symbol;
    let prevTimeframe = prevState.timeframe;
    let currentTimeframe = this.state.timeframe;
    let sameTimeFrame = prevTimeframe == currentTimeframe;
    let sameSymbol = prevSymbol == currentSymbol;
    // console.log({prevTimeframe,
    //   currentTimeframe, currentSymbol,
    //   sameSymbol})
    if (
      !prevProps.stock_data.commodity_data[prevSymbol] ||
      !prevProps.stock_data.commodity_data[prevSymbol][prevTimeframe]
    ) {
      return console.log("no previous data?");
    }
    // let prevData = prevProps.stock_data.commodity_data[prevSymbol][prevTimeframe];
    // let currentData = this.props.stock_data.commodity_data[currentSymbol][currentTimeframe];

    let { timeframe } = this.state;

    if (type === "stock") {
      console.log("load up some stock data");
      this.setNewData(symbol, timeframe);
    }

    if (type === "commodity") {
      let prevData = prevProps.stock_data.commodity_data;
      let currentData = this.props.stock_data.commodity_data;
      if (prevData != currentData && currentData) {
        console.log("dataChanged");
        console.log({ prevData, currentData });
        console.log("load up some COMMODITY data");

        let onlyAddNewBar = sameTimeFrame && sameSymbol ? true : false;
        console.log({ onlyAddNewBar, sameSymbol, sameTimeFrame });
        this.setNewData(symbol, timeframe, onlyAddNewBar);
      } else {
        // console.log("Data hasnt changed");
        // console.log({prevData, currentData})
      }
    }
  }

  async handleTimeFrameChange(prevState, prevProps) {
    let prevTimeframe = prevState.timeframe;
    let currentTimeframe = this.state.timeframe;
    if (prevTimeframe !== currentTimeframe) {
      console.log("NEW TIME FRAME");
      console.log({ prevTimeframe, currentTimeframe });

      let { symbol } = this.props.match.params;
      const timeframe = currentTimeframe;
      const props = this.props;
      // console.log(symbol);

      if (this.props.type === "stock") {
        if (
          !this.props.stock_data.charts[symbol] ||
          !this.props.stock_data.charts[symbol][timeframe]
        ) {
          console.log("fetching data");

          const end = new Date().getTime();
          await view_selected_stock({ timeframe, end, symbol, props });
          this.setState({
            allOHLCdata: this.props.stock_data.charts[symbol][timeframe],
          });
        } else {
          console.log("Whaaat now?");
          this.setState({
            allOHLCdata: this.props.stock_data.charts[symbol][timeframe],
          });
        }
      } else if (this.props.type === "commodity") {
        if (
          timeframe !== "daily" &&
          timeframe !== "weekly" &&
          timeframe !== "60Min" &&
          timeframe !== "5Min"
          /**
           * The timeframe is some minutely
           * 1Min,  5Min 15Min, 30Min
           */
        ) {
          console.log({ timeframe });
          if (
            /**
             * Do we even have one minute data to serve
             */
            !this.props.stock_data.commodity_data[symbol] ||
            !this.props.stock_data.commodity_data[symbol]["1Min"]
          ) {
            let props = this.props;
            let tryGetOneMoreDay = true;
            await getMinutelyCommodityData({
              symbol,
              props,
              tryGetOneMoreDay,
            });
          } else {
            if (!this.props.stock_data.commodity_data[symbol][timeframe]) {
              console.log(`neeed to make up some ${timeframe} data`);
            } else {
              console.log("give them what they want");
              this.setNewData(symbol, timeframe);
            }
          }
        } else if (
          timeframe === "daily" ||
          timeframe === "weekly" ||
          timeframe === "60Min" ||
          timeframe === "5Min"
        ) {
          if (
            !this.props.stock_data.commodity_data[symbol] ||
            !this.props.stock_data.commodity_data[symbol]["1Min"]
          ) {
            let props = this.props;
            let tryGetOneMoreDay = true;
            await getMinutelyCommodityData({
              symbol,
              props,
              tryGetOneMoreDay,
            });
          }
          if (
            !this.props.stock_data.commodity_data[symbol] ||
            !this.props.stock_data.commodity_data[symbol][timeframe]
          ) {
            await view_selected_commodity({ timeframe, symbol, props });
            this.setNewData(symbol, timeframe);
            // this.setState({
            //   allOHLCdata: this.props.stock_data.commodity_data[symbol][
            //     timeframe
            //   ]
            // });
          } else {
            console.log("Give them wht they want");
            this.setNewData(symbol, timeframe);

            // this.setState({
            //   allOHLCdata: this.props.stock_data.commodity_data[symbol][
            //     timeframe
            //   ],
            //   rawOHLCData: this.props.stock_data.commodity_data[symbol][
            //     timeframe
            //   ]
            // });
            // partialOHLCdata =  this.props.stock_data.commodity_data[symbol][
            //   timeframe
            // ]
          }
        }
      }
    }
  }

  setNewData(symbol, timeframe, onlyAddNewBar) {
    let { type, stock_data } = this.props;

    console.log(`setNewData for timeframe ${timeframe}!`);
    let currentData;
    let currentRawData;

    if (type === "commodity") {
      currentData = stock_data.commodity_data[symbol][timeframe];
      currentRawData = stock_data.rawCommodityCharts[symbol][timeframe];
      // console.log(stock_data)
    } else if (type === "stock") {
      //TODO get Stock regression values
      console.log(stock_data.charts);
      currentData = stock_data.charts[symbol][timeframe];
      currentRawData = stock_data.rawCharts[symbol][timeframe];
    }
    // console.log(currentData[currentData.length-2])
    // console.log(currentData[currentData.length-1])
    // let forwardFilledData = forwardFill(currentData);

    /**
     * We need to check if all the data changed
     */
    // console.log({onlyAddNewBar, partialOHLCdata, currentData})
    if (onlyAddNewBar) {
      console.log({ onlyAddNewBar });
      // this.setState({
      //   allOHLCdata: currentData,
      //   rawOHLCData: currentData
      // });
      // partialOHLCdata.push(currentData[currentData.length - 1]);
      // setTimeout(() => this.setupChart(), 0);
    } else {
      console.log({ onlyAddNewBar });

      this.setState({
        allOHLCdata: currentData,
        rawOHLCData: currentRawData,
        // currentRawData:currentRawData
      });
      partialOHLCdata = currentData;
      console.log({ currentData, partialOHLCdata });
      setTimeout(() => this.setupChart(), 0);
    }
  }

  async loadCommodityData({ timeframe, symbol, props }) {
    if (
      timeframe !== "daily" &&
      timeframe !== "weekly" &&
      timeframe !== "intraday"
    ) {
      console.log("getMinutelyCommodityData");
      let tryGetOneMoreDay = true;
      await getMinutelyCommodityData({ symbol, props, tryGetOneMoreDay });
    } else {
      if (
        !this.props.stock_data.commodity_data[symbol] ||
        !this.props.stock_data.commodity_data[symbol]["1Min"]
      ) {
        let tryGetOneMoreDay = true;
        await getMinutelyCommodityData({ symbol, props, tryGetOneMoreDay });
        setTimeout(async () => {
          let props = this.props;
          await view_selected_commodity({ timeframe, symbol, props });
        }, 2000);
      } else {
        await view_selected_commodity({ timeframe, symbol, props });
      }
    }
  }

  addHighLowMarkers(minMaxValues) {
    let that = this;
    if (!this.state.visibleIndicators.minMaxMarkers) return; //console.log(' minMaxMarkers not turned on');

    //   name, mincolor, maxcolor, ismin, ismax, PriceLevels
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
      }
    }
  }

  setupChart() {
    console.log("setupChart");
    let that = this;
    if (!this.state.chartRef.current) return;
    let svg = select(this.state.chartRef.current);
    svg.selectAll("*").remove();
    /**
     * DEFS
     */
    let defs = svg.append("defs");

    dropShadow(defs);
    priceRangeRed(defs);
    priceRangeGreen(defs);
    let timeAxis = axisBottom(this.state.timeScale)
      .ticks(5)
      .tickSize(-this.state.innerHeight);

    let priceAxis = axisRight(this.state.priceScale)
      .ticks(8)
      .tickSize(-this.state.innerWidth);

    //Set up some data
    this.createPriceLevelsData();

    //make all EMA/STD data
    Object.keys(this.state.EMA_data).forEach((MA_value) => {
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
    // addAxisAnnotationElements(timeAxisG, "bottomTimeTag");
    // addAxisAnnotationElements(priceAxisG, "rightPriceTag");

    let chartWindow = svg
      // .append('rect').attr('width', this.state.innerWidth).attr('height', this.state.innerHeight)
      .append("g")
      .attr("class", "chartWindow")
      .attr("transform", `translate(${margin.left},${margin.top})`)
      .attr("fill", "black");
    /* CrossHair */
    // create crosshairs
    var crosshair  =DrawCrossHair(chartWindow)


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
      let { timeframe } = otherThat.state;
      let interval = getInterval(timeframe);

      let MOUSETIME = new Date(
        otherThat.state.timeScale.invert(_mouse[0])
      ).getTime();
      MOUSETIME = Math.floor(MOUSETIME / interval) * interval;

      MOUSEX = otherThat.state.timeScale(MOUSETIME);
      MOUSEY = _mouse[1];

      // if(!prevMOUSEX) prevMOUSEX  = MOUSEX

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
        .attr("y2", MOUSEY);
      // .attr("y2", otherThat.state.MOUSEY);

      // console.log({ x, y, mouseDate });
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

    svg.call(d3drag); //breaks if this is not first
    svg.call(d3zoom); //needs to be after drag

    //Makeing data for later draws
    // console.log('MAKING FIBDATA')
    let fibData = makeFibonacciData(this, {
      timeScale: this.state.timeScale,
      priceScale: this.state.priceScale,

    });
    console.log({fibData})
    this.setState({
      timeAxis,
      priceAxis,
      fibData,
    });
    this.draw();
  } //setupChart()

  appendAxisAnnotations(x, y, svg) {
    drawAxisAnnotation(
      "bottomTimeTag",
      this.state.timeScale,
      x,
      svg,
      "timeAxis"
    );
    drawAxisAnnotation(
      "rightPriceTag",
      this.state.priceScale,
      y,
      svg,
      "priceAxis"
    );
  }

  zoomed() {
    //console.log("ZOOMED");
    if (!partialOHLCdata) return;
    //console.log(this.state);
    let mouseZoomPOS = MOUSEX / this.state.innerWidth;
    //    let mouseZoomPOS = this.state.MOUSEX / this.state.innerWidth;
    if (mouseZoomPOS > 0.98) mouseZoomPOS = 0.97;
    if (mouseZoomPOS < 0.02) mouseZoomPOS = 0.03;
    let kScale = event.transform.k;
    // console.log("zoom");

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
          allOHLCdata: this.state.allOHLCdata,
          partialOHLCdata: partialOHLCdata,
        });
      }

      zoomState = kScale;
      partialOHLCdata = data;
      return this.draw();
    }
  }

  dragStart() {
    // console.log("dragStart");
    if (!partialOHLCdata) return;

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
    console.log("dragged");
    let data;
    if (xDragPOS > mouseDRAGSART) {
      console.log("right");
      let start = dragStartData[0];
      let startIndex = this.state.allOHLCdata.findIndex(
        (d) => d.timestamp === start.timestamp
      );
      console.log({ startIndex, barCount });
      let dataEnd = dragStartData.slice(0, dragStartData.length - 1 - barCount);
      let zeroOrGreater = startIndex - barCount < 0 ? 0 : startIndex - barCount;
      let dataStart = this.state.allOHLCdata.slice(zeroOrGreater, startIndex);
      console.log({
        dataEnd,
        zeroOrGreater,
        dataStart,
        dragStartData,
        barCount,
        startIndex,
        start,
      });
      data = [...dataStart, ...dataEnd];
    } else if (xDragPOS < mouseDRAGSART) {
      // console.log("left");
      let end = dragStartData[dragStartData.length - 1];
      let endIndex = this.state.allOHLCdata.findIndex(
        (d) => d.timestamp === end.timestamp
      );
      let dataStart = dragStartData.slice(barCount, dragStartData.length - 1);
      let dataEnd = this.state.allOHLCdata.slice(endIndex, endIndex + barCount);
      // console.log({
      //   dataEnd,
      //   dataStart,
      //   dragStartData,
      //   barCount,
      // });
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

  draw(data) {
    // console.log("Draw");
    // console.log(this.state)
    // console.log({ data:this.state.data, allOHLCdata:allOHLCdata, partialOHLCdata:partialOHLCdata });
    let drawData;
    if (data) {
      drawData = data;
    } else {
      drawData = partialOHLCdata;
    }
    if (!drawData || !drawData.length || drawData.length < 2) return;

    let priceMax = max(drawData, (d) => d.high);
    let priceMin = min(drawData, (d) => d.low);
    // priceMax = priceMax+(priceMax*.1);
    // priceMin = priceMin+(priceMin*.1);

    let [timeMin, timeMax] = extent(drawData.map(({ timestamp }) => timestamp));
    // this.setState({ timeMin, timeMax });
    const priceRange = priceMax - priceMin;
    let timeframe = drawData[1].timestamp - drawData[0].timestamp;
    //  This helps the bars at the ends line up with the edge of the chart
    this.state.timeScale.domain([
      timeMin - timeframe,
      timeMax + timeframe,

      // timeMin ,
      // timeMax
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
      priceScale: this.state.priceScale,
    };
    this.appendEMA(chartWindow, scales);
    this.appendSTD();
    this.appendImportantPriceLevel(this, chartWindow, scales);
    this.appendFibonacciLines(this, chartWindow, scales);

    this.appendPriceLevelRanges(this, chartWindow, scales);
    this.appendRegressionLines(this, chartWindow, scales);
    this.appendTrades(this, chartWindow, scales);
  }

  appendEMA(chartWindow, { timeScale, priceScale }) {
    if (this.state.visibleIndicators.ema20) {
      //show 20 EMA
      drawMALine(chartWindow, this.state.EMA_data, 20, {
        timeScale,
        priceScale,
      });
    }
    if (this.state.visibleIndicators.ema50) {
      //show 50 EMA
      drawMALine(chartWindow, this.state.EMA_data, 50, {
        timeScale,
        priceScale,
      });
    }
    if (this.state.visibleIndicators.ema200) {
      //show 200 EMA
      drawMALine(chartWindow, this.state.EMA_data, 200, {
        timeScale,
        priceScale,
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
      .attr("cx", (d) => this.state.timeScale(d.x))
      .attr("cy", (d) => this.state.priceScale(d.y))
      .attr("r", r)
      .attr("fill", color)
      .attr("stroke", "white")
      .attr("class", (d, i) => `${classAttr} ${i} minMaxMarkers `)
      .on("mouseover", function (d) {
        console.log(d);
      })
      .on("mouseleave", this.removeLine);
    // .style("filter", "url(#drop-shadow)");
  }

  appendTrades(that, chartWindow, { timeScale, priceScale }) {
    /**
     * id(pin):"5e833a02a693dc4122d7355f"
buyOrSell(pin):"Buy"
symbol(pin):"ES"
entryPrice(pin):2584
stop(pin):2580.326
target(pin):2595.0213
entryTime(pin):1585658369836
__v(pin):0
MaxPL(pin):11.25
PL(pin):11.25
exitPrice(pin):2595.25
exitTime(pin):1585659963841
     */
    let candleWidth = that.state.innerWidth / partialOHLCdata.length;
    function entryArrow(data) {
      let { entryTime, exitTime, exitPrice, entryPrice } = data;
      let x = timeScale(entryTime);
      let y = priceScale(entryPrice);
      let scaler = 3.5;
      if (candleWidth < 15) scaler = 2.5;
      if (candleWidth < 6) scaler = 1.5;
      // x = x + (candleWidth*2)
      return `M ${x}, ${y}
                  l ${scaler * 5}, ${scaler * -3.75}
                  l ${scaler * 0}, ${scaler * 2.5}
                  l ${scaler * 7.5}, ${scaler * 0}
                  l ${scaler * 0}, ${scaler * 2.5}
                  l ${scaler * -7.5}, ${scaler * 0}
                  l ${scaler * 0}, ${scaler * 2.5} z`;
    }

    function exitArrow(data) {
      let { entryTime, exitTime, exitPrice, entryPrice } = data;
      if (!exitPrice || !exitTime) return;
      let x = timeScale(exitTime);
      let y = priceScale(exitPrice);
      let scaler = 3.5;
      if (candleWidth < 15) scaler = 2.5;
      if (candleWidth < 6) scaler = 1.5;
      return `M ${x}, ${y}
                  l ${scaler * 5}, ${scaler * -3.75}
                  l ${scaler * 0}, ${scaler * 2.5}
                  l ${scaler * 7.5}, ${scaler * 0}
                  l ${scaler * 0}, ${scaler * 2.5}
                  l ${scaler * -7.5}, ${scaler * 0}
                  l ${scaler * 0}, ${scaler * 2.5} z`;
    }

    function PL_color({ PL }) {
      return PL > 0 ? "green" : "red";
    }
    function buyOrSellColor({ buyOrSell }) {
      if (buyOrSell === "Buy") return "green";
      else return "red";
    }

    if (!this.state.visibleIndicators.tradeMarkers) return; //console.log('showTrades not turned on');
    let symbol = this.props.stock_data.search_symbol;
    let trades = this.props.stock_data.commodityTrades[symbol];
    let tradeEntry = chartWindow
      .selectAll(`.${"tradeEntryMarkers"}`)
      .data(trades);
    // if(!tradeEntry.length) return
    // console.log(tradeEntry)

    tradeEntry.exit().remove();
    tradeEntry
      .enter()
      .append("path")
      .merge(tradeEntry)

      // .attr('class', 'dirArrow')
      .attr("transform", (d) => {
        let { entryTime, exitTime, exitPrice, entryPrice } = d;
        let x = timeScale(entryTime);
        let y = priceScale(entryPrice);
        return `rotate(${180}, ${x}, ${y})`;
      })
      .attr("d", (d) => entryArrow(d))

      .attr("fill", (d) => buyOrSellColor(d))

      .attr("stroke", "black")
      .attr("class", `tradeMarkers tradeEntryMarkers`)
      .style("opacity", 0.9)
      .on("click", function (d) {
        console.log("click");
      })
      .on("mouseover", function (d) {
        // console.log(d);
        this.classList.add("hoveredtradeMarker");
        that.showTradeDetails(d, chartWindow, {
          priceScale,
          timeScale,
        });
      })
      .on("mouseout", function () {
        this.classList.remove("hoveredtradeMarker");
        chartWindow.selectAll(".tradeMarkerDetails").remove();
        // console.log("remove");
      });

    let tradeExit = chartWindow
      .selectAll(`.${"tradeExitMarkers"}`)
      .data(trades);

    tradeExit.exit().remove();
    tradeExit
      .enter()
      .append("path")
      .merge(tradeExit)

      // .attr('class', 'dirArrow')

      .attr("d", (d) => exitArrow(d))

      .attr("fill", (d) => PL_color(d))

      .attr("stroke", "black")
      .attr("class", `tradeMarkers tradeExitMarkers`)
      .style("opacity", 0.9)
      .on("click", function (d) {
        console.log("click");
      })
      .on("mouseover", function (d) {
        // console.log(d);
        this.classList.add("hoveredtradeMarker");
        that.showTradeDetails(d, chartWindow, {
          priceScale,
          timeScale,
        });
      })
      .on("mouseout", function () {
        this.classList.remove("hoveredtradeMarker");
        chartWindow.selectAll(".tradeMarkerDetails").remove();
        // console.log("remove");
      });
  }

  appendRegressionLines(that, chartWindow, { priceScale, timeScale }) {
    // function parseLineLength(lineLength) {
    //   return (lineLength / 10000).toFixed(2);
    // }
    // function formatSlopes(slope) {
    //   /**
    //    * Slopes are usually between 1x10-5 - 1x10-8
    //    */
    //   return (slope * 1000000).toFixed(4);
    // }
    if (!this.state.visibleIndicators.regressionLines) return; //console.log('importantPriceLevel not turned on');
    // console.log(this.state.regressionLines);
    let { regressionLines } = this.state;
    // console.log(this.state)
    let { highLines, lowLines } = regressionLines;
    if (!highLines || !lowLines) return;
    let allLines = [...highLines, ...lowLines];
    let plottedRegressionLines = chartWindow
      .selectAll(`.${"regressionLines"}`)
      .data(allLines);

    plottedRegressionLines.exit().remove();
    plottedRegressionLines
      .enter()
      .append("line")
      .merge(plottedRegressionLines)

      .attr("y1", (d) => priceScale(d.y1))

      .attr("x1", (d) => timeScale(d.x1))
      .attr("x2", (d) => timeScale(d.x2))
      .attr("y2", (d) => priceScale(d.y2))
      .attr("stroke-width", 5)
      .attr("stroke", (d) => {
        return "yellow";
      })
      .attr("class", `regressionLines`)
      .style("opacity", (d)=>{
        //display shorter lines with more opacity
        let length=d.length/10000
        if(length>2000) return .9
        if(length>1500)return .7
        if(length>1000)return .5
        if(length>500)return .3
        return .2

      })
      .on("click", function (d) {
        console.log("click");
      })
      .on("mouseover", function (d) {
        // console.log(d);
        // this.classList.add("hoveredRegressionLine");
        that.regressionNearbyPoints(d, chartWindow, {
          priceScale,
          timeScale,
        });
        //extend length to edth of chart
        let maxTime = max(that.state.timestamps, (t) => t);
        let { m, b } = d;
        let price = m * maxTime + b;
        // console.log({m,b,price,maxTime})
        this.setAttribute("x2", timeScale(maxTime));
        this.setAttribute("y2", priceScale(price));
        console.log(d);
      })
      .on("mouseout", function () {
        this.classList.remove("hoveredRegressionLine");
        chartWindow.selectAll(".regressionNearbyPoint").remove();
        // console.log("remove");
      });
  }

  showTradeDetails(data, chartWindow, { priceScale, timeScale }) {
    //TODO
    // .tradeMarkerDetails
    // console.log(data)
  }

  regressionNearbyPoints(data, chartWindow, { priceScale, timeScale }) {
    // console.log(data);
    let regressionNearbyPoint = chartWindow
      .selectAll(`.regressionNearbyPoint`)
      .data(data.nearbyPoints);
    regressionNearbyPoint.exit().remove();
    regressionNearbyPoint
      .enter()
      .append("circle")
      .merge(regressionNearbyPoint)
      .attr("cx", (d) => timeScale(d.x))
      .attr("cy", (d) => priceScale(d.y))
      .attr("r", 10)
      .attr("fill", "blue")
      .attr("stroke", "white")
      .attr("class", `regressionNearbyPoint`);
  }

  appendPriceLevelRanges(that, chartWindow, { priceScale, timeScale }) {
    if (!this.state.visibleIndicators.importantPriceLevel) return; //console.log('importantPriceLevel not turned on');;
    let timeMax = max(this.state.timestamps, (d) => d);
    let { priceLevelSensitivity } = this.state;

    let importantPriceRangeLow = chartWindow
      .selectAll(`.${"importantPriceRangeLow"}`)
      .data(this.state.importantPriceLevels);

    importantPriceRangeLow.exit().remove();
    importantPriceRangeLow
      .enter()
      .append("rect")
      .merge(importantPriceRangeLow)

      .attr("x", (d) => timeScale(d.x))
      .attr("y", (d) => priceScale(d.y))
      .attr("height", (d) => {
        return Math.abs(
          priceScale(d.y) -
            priceScale(d.y / (priceLevelSensitivity / 10000 + 1))
        ); //10000 is magic number?
      })
      .attr("width", (d) => {
        return timeScale(timeMax) - timeScale(d.x);
      })
      .attr("stroke", "none")
      .attr("pointer-events", "none")
      .attr("fill", "url(#priceLevelGradientRed)")
      .attr("class", `importantPriceRangeLow importantPriceLevel`)
      .on("mouseover", function (d) {});

    let importantPriceRangeHigh = chartWindow
      .selectAll(`.${"importantPriceRangeHigh"}`)
      .data(this.state.importantPriceLevels);

    importantPriceRangeHigh.exit().remove();
    importantPriceRangeHigh
      .enter()
      .append("rect")
      .merge(importantPriceRangeHigh)
      .attr("pointer-events", "none")
      .attr("x", (d) => timeScale(d.x))
      .attr(
        "y",
        (d) =>
          priceScale(d.y) -
          Math.abs(
            priceScale(d.y) -
              priceScale(d.y / (priceLevelSensitivity / 10000 + 1))
          )
      )
      .attr("height", (d) => {
        return Math.abs(
          priceScale(d.y) -
            priceScale(d.y / (priceLevelSensitivity / 10000 + 1))
        ); //10000 is magic number?
      })
      .attr("width", (d) => {
        return timeScale(timeMax) - timeScale(d.x);
      })
      .attr("stroke", "none")
      .attr("fill", "url(#priceLevelGradientGreen)")
      .attr("class", `importantPriceRangeHigh importantPriceLevel`)

      .on("mouseover", function (d) {});
    //   .on("mouseout", function() {
    //     this.classList.remove("importantLine");
    //     chartWindow.selectAll(".nearbyPoint").remove();
    //     // console.log("remove");
    //   });
  }
  // appendImportantPriceLevel(data, minColor, `minPriceLevel`);

  appendFibonacciLines(that, chartWindow, { priceScale, timeScale }) {
    let { fibData } = this.state;
    FibonacciLines(that, chartWindow, { priceScale, timeScale }, fibData);
  }
  appendImportantPriceLevel(that, chartWindow, { priceScale, timeScale }) {
    if (!this.state.visibleIndicators.importantPriceLevel) return; //console.log('importantPriceLevel not turned on');;
    let timeMax = max(this.state.timestamps, (d) => d);

    let importantPriceLevel = chartWindow
      .selectAll(`.${"importantPriceLevel"}`)
      .data(this.state.importantPriceLevels);

    importantPriceLevel.exit().remove();
    importantPriceLevel
      .enter()
      .append("line")
      .merge(importantPriceLevel)

      .attr("y1", (d) => priceScale(d.y))

      .attr("x1", (d) => timeScale(d.x))
      .attr("x2", (d) => timeScale(timeMax))
      .attr("y2", (d) => priceScale(d.y))
      .attr("stroke-width", 3)
      .attr("stroke", (d) => {
        return "lawngreen";
      })
      .attr("class", `importantPriceLevel`)
      .style("opacity", 0.7)
      .on("mouseover", function (d) {
        // console.log(d)
        this.classList.add("importantLine");
        that.highlightNearbyPoints(d, chartWindow, {
          priceScale,
          timeScale,
        });
      })
      .on("mouseout", function () {
        this.classList.remove("importantLine");
        chartWindow.selectAll(".nearbyPoint").remove();
        // console.log("remove");
      });
  }
  highlightNearbyPoints(data, chartWindow, { priceScale, timeScale }) {
    // console.log(data);
    let nearbyPoints = chartWindow.selectAll(`.nearbyPoint`).data(data.points);
    nearbyPoints.exit().remove();
    nearbyPoints
      .enter()
      .append("circle")
      .merge(nearbyPoints)
      .attr("cx", (d) => timeScale(d.x))
      .attr("cy", (d) => priceScale(d.y))
      .attr("r", 10)
      .attr("fill", "blue")
      .attr("stroke", "white")
      .attr("class", `nearbyPoint`);
  }

  runMinMax(tolerance, minMaxMostRecentData) {
    // console.log({ tolerance, minMaxMostRecentData });

    let { highs, lows, closes, timestamps } = this.state;
    // console.log({highs, lows, closes, timestamps})
    let minMaxValues = {
      high: { maxValues: [] },
      low: { minValues: [] },
      close: { minValues: [], maxValues: [] },
    };
    // console.log({ highs: this.state.highs, data: this.props.data });

    var { minValues, maxValues } = diff.minMax(
      timestamps,
      highs,
      tolerance,
      minMaxMostRecentData
    );

    minMaxValues["high"].maxValues = maxValues;
    // minMaxValues["high"].minValues = minValues;

    var { minValues, maxValues } = diff.minMax(
      timestamps,
      lows,
      tolerance,
      minMaxMostRecentData
    );

    // minMaxValues["low"].maxValues = maxValues;
    minMaxValues["low"].minValues = minValues;
    // var { minValues, maxValues } = diff.minMax(timestamps, opens, minMaxTolerance);

    // minMaxValues["open"].maxValues = maxValues;
    // minMaxValues["open"].minValues = minValues;
    var { minValues, maxValues } = diff.minMax(
      timestamps,
      closes,
      tolerance,
      minMaxMostRecentData
    );

    minMaxValues["close"].maxValues = maxValues;
    minMaxValues["close"].minValues = minValues;
    // console.log({highs, lows, timestamps})
    return minMaxValues;
  }


  removeLine() {
    return console.log("test");
  }

  toggleIndicators(indicator) {
    console.log(this);
    console.log({ indicator, minMaxValues: this.state.minMaxValues });
    let svg = select(this.state.chartRef.current);
    let markers = svg.selectAll(`.${indicator}`);
    markers.remove();
    let temp = this.state.visibleIndicators;
    console.log(temp);
    let val = temp[indicator];
    val = !val;
    temp[indicator] = val;
    console.log(temp);
    this.setState({
      visibleIndicators: temp,
    });
    setTimeout(() => this.draw(), 0);
  }

  runPriceLevels() {
    let priceLevelMinMax = this.state.priceLevelMinMax;
    // console.log(`Running local MinMax with ${priceLevelMinMax}`);
    let minMaxMostRecentData = false;
    let importantMinMaxValues = this.runMinMax(
      priceLevelMinMax,
      minMaxMostRecentData
    );
    let importantHighPoints = [
      ...importantMinMaxValues.high.maxValues,
      ...importantMinMaxValues.close.maxValues,
    ];
    let importantLowPoints = [
      ...importantMinMaxValues.low.minValues,
      ...importantMinMaxValues.close.minValues,
    ];
    let allImportantPoints = [...importantHighPoints, ...importantLowPoints];
    /**
     * merge similar lines
     */
    let groupedPoints = diff.mergeImportantPriceLevels(
      allImportantPoints,
      this.state.priceLevelSensitivity
    );
    // groupedPoints = groupedPoints.sort((a, b)=>a.x - b.x)
    // console.log({
    //   allImportantPoints,
    //   groupedPoints
    // });

    this.setState({ importantPriceLevels: groupedPoints });
    setTimeout(() => this.draw(), 0);
  }

  createPriceLevelsData() {
    console.log('createPriceLevelsData ')
    // console.log(this.state.minMaxTolerance);
    if (!this.state.rawOHLCData) return;
    // console.log(this.state.rawOHLCData)
    let timestamps = this.state.rawOHLCData.map((d) => d.timestamp);
    let highs = this.state.rawOHLCData.map((d) => d.high);
    let lows = this.state.rawOHLCData.map((d) => d.low);
    let closes = this.state.rawOHLCData.map((d) => d.close);
    let opens = this.state.rawOHLCData.map((d) => d.open);

    this.setState({
      timestamps,
      opens,
      highs,
      lows,
      closes,
    });

    setTimeout(() => {
      let minMaxMostRecentData = true;
      let minMaxValues = this.runMinMax(
        this.state.minMaxTolerance,
        minMaxMostRecentData
      );
      // console.log({minMaxValues, lows})
      // let highPoints = [...minMaxValues.high.maxValues, ...minMaxValues.close.maxValues].sort(byDate)
      // let lowPoints = [...minMaxValues.low.minValues, ...minMaxValues.close.minValues].sort(byDate)
      let highPoints = [...minMaxValues.high.maxValues];
      let lowPoints = [...minMaxValues.low.minValues];
      //run a cool regression function with the min max values
      let errLimit = this.state.regressionErrorLimit;
      // console.log({highPoints,
      //   lowPoints})
      let highLines = diff.regressionAnalysis(highPoints, errLimit);
      let lowLines = diff.regressionAnalysis(lowPoints, errLimit);
      // console.log({ highLines, lowLines })
      this.runPriceLevels();

      let fibData = makeFibonacciData(this, {
        timeScale: this.state.timeScale,
        priceScale: this.state.priceScale,
  
      });

      this.setState({
        minMaxValues: minMaxValues,
        // consolidatedMinMaxPoints: newConsolidatedPoints,
        regressionLines: { highLines, lowLines },
        fibData
      });
    }, 0);
    setTimeout(() => this.draw(), 0);
  }
  setTimeframeActive(){
    let {timeframe, symbol} = this.state
    let {_id} = this.props.stock_data.commodityRegressionData[symbol][timeframe]
    console.log(_id)
    API.setTimeframeActive(_id, timeframe, this.props)

  }

  saveRegressionSettings() {
    // return console.log(this)
    let { symbol } = this.props;
    let {
      minMaxTolerance,
      regressionErrorLimit,
      priceLevelMinMax,
      priceLevelSensitivity,
      fibonacciMinMax,
      fibonacciSensitivity,
      timeframe
    } = this.state;
    let { props } = this;
    API.saveRegressionValues({
      timeframe,
      symbol,
      minMaxTolerance,
      regressionErrorLimit,
      priceLevelMinMax,
      priceLevelSensitivity,
      fibonacciMinMax,
      fibonacciSensitivity,
      props,
    });
  }

  setTimeframe(e) {
    let timeframe = e.target.value;
    let { stock_data } = this.props;
    let symbol = stock_data.search_symbol;

    console.log(timeframe);
    //also setting the indicators settings
    let {
      priceLevelMinMax,
      priceLevelSensitivity,
      regressionErrorLimit,
      minMaxTolerance,
      fibonacciMinMax,
      fibonacciSensitivity,
    } = stock_data.commodityRegressionData[symbol][timeframe];
    console.log(stock_data.commodityRegressionData[symbol][timeframe])
    this.setState({
      timeframe,
      priceLevelMinMax,
      priceLevelSensitivity,
      regressionErrorLimit,
      minMaxTolerance,
      fibonacciMinMax,
      fibonacciSensitivity,
    });
  }

  runRegressionAnalysis(){
      //Run regrerssion lines
      console.log('running regression lines analysis ')

      let minMaxMostRecentData = true;
      let minMaxValues = this.runMinMax(
        this.state.minMaxTolerance,
        minMaxMostRecentData
      );
      // console.log({minMaxValues, lows})
      // let highPoints = [...minMaxValues.high.maxValues, ...minMaxValues.close.maxValues].sort(byDate)
      // let lowPoints = [...minMaxValues.low.minValues, ...minMaxValues.close.minValues].sort(byDate)
      let highPoints = [...minMaxValues.high.maxValues];
      let lowPoints = [...minMaxValues.low.minValues];
      //run a cool regression function with the min max values
      let errLimit = this.state.regressionErrorLimit;
      // console.log({highPoints,
      //   lowPoints})
      let highLines = diff.regressionAnalysis(highPoints, errLimit);
      let lowLines = diff.regressionAnalysis(lowPoints, errLimit);
      this.setState({
        minMaxValues: minMaxValues,
        regressionLines: { highLines, lowLines },
      })
  }

  updateSettingsValue(e, value) {
    this.setState({
      [value]: parseFloat(e.target.value),
    });
  
   this.runNewSettings(value)
  }

  runNewSettings(settingName) {
    console.log({settingName})
    if( settingName=== 'minMaxTolerance'||
    settingName === 'regressionErrorLimit'){

      this.runRegressionAnalysis()

    }else if(
      settingName ==="priceLevelMinMax"||
      settingName === 'priceLevelSensitivity'
    ){
      //Run price levels
      console.log('running runPriceLevels ')

      this.runPriceLevels();

    }else if(
      settingName === 'fibonacciMinMax'||
      settingName === '"fibonacciSensitivity"'
    ){
      console.log('running makeFibonacciData ')
      let fibData = makeFibonacciData(this, {
        timeScale: this.state.timeScale,
        priceScale: this.state.priceScale,
  
      });
      this.setState({fibData})
    }
    setTimeout(() => this.draw(), 0);

  }
  render() {
    // console.log("RENDERING??");
    let symbol = this.props.stock_data.search_symbol;
    let trades = this.props.stock_data.commodityTrades[symbol];
    let currentTickData = this.props.stock_data.currentTickData[symbol];
    // console.log({trades})

    return (
      <div>
        <h3>{this.state.timeframe}</h3>
        <select
          onChange={(e) => this.setTimeframe(e)}
          className="form-control"
          name=""
          id=""
        >
          <option value="1Min">1 Min</option>
          <option value="5Min">5 Min</option>
          <option value="60Min">60 Min</option>

          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>
        <ToggleIndicators
          toggleIndicators={(indicator) => this.toggleIndicators(indicator)}
          visibleIndicators={this.state.visibleIndicators}
        />

        {this.props.meta.is_loading && (
          <Loader width={this.props.width} height={this.state.height} />
        )}

        <svg
          ref={this.state.chartRef}
          width={this.props.width}
          height={this.state.height}
          className="svgChart"
        ></svg>
        {currentTickData && <Timers lastTick={currentTickData} />}
        <RegressionSettingsContainer>
          {/* RegressionLine settings */}
          <RegressionSettings
            //ALL TIED TO THIS TIMEFRAME
            timeframe={this.state.timeframe}
            //for regression settings
            minMaxTolerance={this.state.minMaxTolerance}
            updateSettingsValue={(value, setting) =>
              this.updateSettingsValue(value, setting)
            }
            //for price levels
            priceLevelMinMax={this.state.priceLevelMinMax}
            regressionErrorLimit={this.state.regressionErrorLimit}
            priceLevelSensitivity={this.state.priceLevelSensitivity}
            //for fibonacci lines
            fibonacciMinMax={this.state.fibonacciMinMax}
            fibonacciSensitivity={this.state.fibonacciSensitivity}
            //SAVES THE SETTINGS
            saveRegressionSettings={() => this.saveRegressionSettings()}
            //tells stock bot its active
            setActive={() => this.setTimeframeActive()}
         
    
          />
        </RegressionSettingsContainer>

        <TradesListContainer>
          <TradesList trades={trades} />
        </TradesListContainer>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return state;
}

export default connect(mapStateToProps)(withRouter(CandleStickChart));

let RegressionSettingsContainer = styled.div`
  border: solid red 1px;
`;

let TradesListContainer = styled.div`
  border: solid red 1px;
`;

function byDate(a, b) {
  if (a.timestamp < b.timestamp) return 1;
  if (a.timestamp > b.timestamp) return -1;
}
function byX(a, b) {
  if (a.x > b.x) return 1;
  if (a.x < b.x) return -1;
}

function getInterval(timeframe) {
  if (timeframe === "1Min") return 1000 * 60 * 1;
  if (timeframe === "5Min") return 1000 * 60 * 5;
  if (timeframe === "60Min") return 1000 * 60 * 60;
  if (timeframe === "daily") return 1000 * 60 * 60 * 24;
}
