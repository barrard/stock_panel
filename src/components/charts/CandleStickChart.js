import React from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import styled from "styled-components";
import { axisBottom, axisRight, axisLeft, axisTop } from "d3-axis";
// import { useDispatch, useSelector } from "react-redux";
import {
  view_selected_stock,
  getMinutesForTimeframe,
  appendMinutelyCommodityDataAsNeeded,
} from "../landingPageComponents/chart_data_utils.js";
import TradesList from "./chartHelpers/TradesList.js";
import { zoom } from "d3-zoom";
import { scaleLinear, scaleTime } from "d3-scale";
import { extent, max, min } from "d3-array";
import { select, event, mouse } from "d3-selection";
import { drag } from "d3-drag";
import ToggleIndicators from "./chartHelpers/ToggleIndicators.js";
import IndicatorChart from "./chartHelpers/indicatorCharts/IndicatorChart.js";
import Loader from "../smallComponents/LoadingSpinner.js";
import {
  priceRangeGreen,
  priceRangeRed,
  dropShadow,
  doZoomIn,
  doZoomOut,
} from "./chartHelpers/utils.js";
import Timers from "./chartHelpers/Timers.js";
import { drawSimpleLine } from "./chartHelpers/drawLine.js";
import {
  view_selected_commodity,
  getMinutelyCommodityData,
} from "../landingPageComponents/chart_data_utils.js";

import diff from "../charts/chartHelpers/extrema.js";
import { addCandleSticks } from "./chartHelpers/candleStickUtils.js";
import { add_commodity_chart_data } from "../../redux/actions/stock_actions.js";
import {
  drawAxisAnnotation,
  removeAllAxisAnnotations,
  addAxisAnnotationElements,
  DrawCrossHair,
} from "./chartHelpers/chartAxis.js";
import {
  makeEMA,
  drawMALine,
  drawColoredSuperTrend,
} from "./chartHelpers/MA-lines.js";
import API from "../API.js";
import RegressionSettings from "./chartHelpers/regressionSettings.js";
import {
  FibonacciLines,
  makeFibonacciData,
} from "./chartHelpers/ChartMarkers/FibonacciLines.js";

import {
  VolumeBars,
  VolumeProfileBars,
} from "./chartHelpers/ChartMarkers/VolumeBars.js";
import { CenterLabel } from "./chartHelpers/ChartMarkers/Labels.js";
import { TradeMarker } from "./chartHelpers/ChartMarkers/TradeMarker.js";
import { DefaultRegressionSettings } from "./chartHelpers/indicatorCharts/IndicatorRegressionSettings.js";
import { toastr } from "react-redux-toastr";
const { TICKS } = require("../../indicators/indicatorHelpers/utils.js");
const { VolProfile } = require("../../indicators/VolProfile.js");
const { addRSI, addNewRSI } = require("../../indicators/RSI.js");
const {
  stochasticsAnalysis,
  stochasticPeriods,
  calcStochastics,
  addStochastics,
  addNewestStochastics,
  prevCurrentStoch,
} = require("../../indicators/stochastics.js");
const {
  addNewestCCI_data,
  addAllCCI_data,
} = require("../../indicators/CCI.js");
const {
  momentumAnalysis,
  addNewestMomentumAnalysis,
} = require("../../indicators/momentum.js");
const { addNewVWAP } = require("../../indicators/VWAP.js");
const { makeNewSuperTrendData } = require("../../indicators/superTrend.js");
const { addNewBollingerBands } = require("../../indicators/BollingerBands.js");
const { addNewTradingRange } = require("../../indicators/ATR.js");
const {
  compileTickData,
} = require("../../indicators/indicatorHelpers/barCompiler.js");
let margin = {
  top: 15,
  right: 60,
  bottom: 20,
  left: 65,
};
let notEndOfData = true; //used to load data on drag
let MOUSEX = 0;
let MOUSEY = 0;
let prevMOUSEX = 0;
let mouseDRAGSART = null;
let dragStartData = [];
let lastBarCount = null;
let partialOHLCdata = [];
let zoomState = 1;
let waitForDrag = false;
let waitForDragTimer; //holdsTimer reference
let waitForZoom = false;
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
      volProfileBarCount: 1400,
      volProfileBins: 50,
      timestamps: [],
      highs: [],
      lows: [],
      closes: [],
      opens: [],
      EMA_data: {
        20: [],
        50: [],
        200: [],
      }, //array of {x,y} coords
      STD_data: {
        20: [],
        50: [],
        200: [],
      }, //array of {x,y} coords
      timeMin: 0,
      timeMax: 0,
      regressionLines: {
        highLins: [],
        lowLines: [],
      },
      rawOHLCData: null,
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
        // minMaxMarkers: false,
        showTrades: false,
        importantPriceLevel: false,
        regressionLines: false,
        emaLine: false,
        bollingerBands: true,
        VWAP: false,
        superTrend: false,
        fibonacciLines: false,
        volumeBars: false,
        volumeProfile: false,
      },
      chartRef: React.createRef(),
      innerWidth: width - (margin.left + margin.right),

      innerHeight: height - (margin.top + margin.bottom),

      timeScale: scaleTime().range([0, innerWidth]),
      volProfileScale: scaleLinear().range([innerWidth / 2, innerWidth]),
      priceScale: scaleLinear().range([innerHeight, 0]),
      volScale: scaleLinear().range([innerHeight, 0]).nice(),

      // priceChangeData: [], //for time and sales
      volProfile: {},

      candleHeightScale: scaleLinear().range([0, innerHeight]),

      timeAxis: {},

      priceAxis: {},
      volAxis: {},
      volProfileAxis: {},
    };
    this.updateVolProfile = this.updateVolProfile.bind(this);
  }

  async componentDidMount() {
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
        API.getAllStockTrades(this.props.symbol, this.props);
        await view_selected_stock({ timeframe, end, symbol, props });
        console.log("SET NEW DATA???");

        this.setNewData(symbol, timeframe);
        console.log("DONE!!!!!!MM<<<<<");
      } else {
        // console.log("WTF WE ALREADY HAVE DATA>!");
        this.setNewData(symbol, timeframe);
      }
      //Setting default regression settings, this is a work in progress
      // and likely not the final solution
      this.setState({ ...DefaultRegressionSettings });
    } else if (this.props.type === "commodity") {
      //TODO this needs to be set as commodity in the request
      let regressionData = await API.getCommodityRegressionValues(
        this.props.symbol,
        this.props
      );
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
      // console.log({ regressionData });
      //HArd to read, but this spreads all the regression settings into state
      // this is subject to changing however and should go away
      this.setState({
        ...this.props.stock_data.commodityRegressionData[symbol][timeframe],
      });
    }
  }
  componentDidUpdate(prevProps, prevState) {
    if (!this.props.stock_data.has_symbols_data) {
      return console.log("nothing is ready yet");
    }

    this.handleTimeFrameChange(prevState, prevProps);
    this.handleSymbolChange(prevState, prevProps);
    this.handleNewTick(prevState, prevProps);
    this.didWidthChange(prevProps);
    this.handleTradesFilter(prevProps);
  }

  handleTradesFilter(prevPops) {
    let prevTradeFilter = prevPops.tradeFilter;
    let { tradeFilter } = this.props;
    if (prevTradeFilter !== tradeFilter) {
      this.draw();
    }
  }

  didWidthChange(prevPops) {
    if (prevPops.width != this.props.width) {
      // console.log("Update width");
      let { width } = this.props;
      let innerWidth = width - (margin.left + margin.right);
      let { timeScale, volProfileScale } = this.state;
      timeScale.range([0, innerWidth]);
      volProfileScale.range([0, innerWidth]);
      this.setState({
        volProfileScale,
        timeScale,
        innerWidth,
        width,
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

    let { open, high, low, close, volume, timestamp } = currentTickData;
    if (currentTickData.timestamp >= nextChartDataBarTimestamp) {
      // console.log("ADD THE NEW BAR");
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
      // console.log("JUST ADD THIS DATA TO THE last data bar");

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

    this.setState({
      allOHLCdata: [...currentData],
      rawOHLCData: [...currentRawOHLCData],
    });
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
      if (timeframe !== "1Min") {
        let chart_data = stock_data.commodity_data[symbol][timeframe];
        let props = this.props;

        // chart_data = appendMinutelyCommodityDataAsNeeded(
        //   props,
        //   chart_data,
        //   timeframe,
        //   symbol
        // );
      }
    }
  }

  async handleNewTick(prevState, prevProps) {
    let { type, stock_data, symbol } = this.props;
    const timeframe = this.state.timeframe;
    let currentData;
    let currentRawOHLCData;
    let rawCurrentData;
    if (type === "commodity") {
      let currentTickData = stock_data.currentTickData[symbol];
      let lastTickData = prevProps.stock_data.currentTickData[symbol];
      if (currentTickData !== lastTickData) {
        // if (timeframe !== "1Min")
        // return this.handleUpdatingOtherTimeframesOnTick(prevProps);
        // this.addTickDataToOtherTimeframes(prevProps);
        if (
          !stock_data.commodity_data[symbol] ||
          !stock_data.commodity_data[symbol]["1Min"]
        ) {
          await getMinutelyCommodityData({ symbol, props: this.props });
          return; //why don't we have 1Min data yet?
        }
        //Check the current time frame, and add data accordingly?
        let { timeframe } = this.props.stock_data;

        currentData = stock_data.commodity_data[symbol][timeframe];
        rawCurrentData = stock_data.rawCommodityCharts[symbol][timeframe];

        // currentRawOHLCData = this.state.rawOHLCData;
        if (!currentData || !currentData.length) return;

        let lastBar = currentData[currentData.length - 1];
        let lastPartialBar = partialOHLCdata.slice(-1)[0];

        /**
         * this needs ot be the last bar
         * in the data, but we dont want
         * to add it over and over, just once
         */
        if (!lastBar || !currentData) return;
        if (lastBar.timestamp !== currentTickData.timestamp) {
          if (!lastPartialBar || !lastBar) return;
          if (lastPartialBar.timestamp === lastBar.timestamp) {
            partialOHLCdata.push(currentTickData);
          }
          currentData.push(currentTickData);
          // currentRawOHLCData.push(currentTickData);
          rawCurrentData.push(currentTickData);
          this.createPriceLevelsData();
        } else {
          currentData[currentData.length - 1] = { ...currentTickData };
          // currentRawOHLCData[currentRawOHLCData.length - 1] = {...currentTickData};
          rawCurrentData[rawCurrentData.length - 1] = { ...currentTickData };
          if (lastPartialBar.timestamp === currentTickData.timestamp) {
            partialOHLCdata[partialOHLCdata.length - 1] = {
              ...currentTickData,
            };
          }
        }
        console.log("Run Indicator update");

        addNewVWAP(rawCurrentData);
        addNewBollingerBands(rawCurrentData);
        addNewTradingRange(rawCurrentData);
        makeNewSuperTrendData(rawCurrentData);
        addNewRSI(rawCurrentData);
        addNewestStochastics(rawCurrentData);
        addNewestCCI_data(rawCurrentData);
        addNewestMomentumAnalysis(rawCurrentData);
        this.setState({
          allOHLCdata: [...currentData],
          rawOHLCData: [...rawCurrentData],
        });

        setTimeout(() => this.draw(), 0);
      }
    } else if (type == "stock") {
      // console.log("//TODO!!!");
    }
  }

  async handleSymbolChange(prevState, prevProps) {
    let prevSymbol = prevProps.symbol;
    let currentSymbol = this.props.symbol;
    if (prevSymbol !== currentSymbol) {
      let timeframe = this.state.timeframe;
      let symbol = currentSymbol;
      this.setState({
        symbol,
      });
      if (this.props.type === "stock") {
        this.getStockDataSetUp(symbol, timeframe);
      } else if (this.props.type === "commodity") {
        let { props } = this;
        await API.getCommodityRegressionValues(this.props.symbol, this.props);
        await API.getAllCommodityTrades(this.props.symbol, this.props);
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
      partialOHLCdata = this.props.stock_data.charts[symbol][timeframe];
      this.setState({
        allOHLCdata: this.props.stock_data.charts[symbol][timeframe],
      });
    } else {
      this.setState({
        allOHLCdata: this.props.stock_data.charts[symbol][timeframe],
      });
      partialOHLCdata = this.props.stock_data.charts[symbol][timeframe];
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
    if (
      !prevProps.stock_data.commodity_data[prevSymbol] ||
      !prevProps.stock_data.commodity_data[prevSymbol][prevTimeframe]
    ) {
      return console.log("no previous data?");
    }

    let { timeframe } = this.state;

    if (type === "stock") {
      console.log("load up some stock data");
      this.setNewData(symbol, timeframe);
    }

    if (type === "commodity") {
      let prevData = prevProps.stock_data.commodity_data;
      let currentData = this.props.stock_data.commodity_data;
      if (prevData != currentData && currentData) {
        let onlyAddNewBar = sameTimeFrame && sameSymbol ? true : false;
        this.setNewData(symbol, timeframe, onlyAddNewBar);
      }
    }
  }

  async handleTimeFrameChange(prevState, prevProps) {
    let prevTimeframe = prevState.timeframe;
    let currentTimeframe = this.state.timeframe;
    // console.log({ prevTimeframe, currentTimeframe });
    if (prevTimeframe !== currentTimeframe) {
      console.log("NEW TIME FRAME");
      console.log({ prevTimeframe, currentTimeframe });

      let { symbol } = this.props.match.params;
      const timeframe = currentTimeframe;
      const props = this.props;
      notEndOfData = true;
      if (this.props.type === "stock") {
        // console.log("TIM FRAME CHGANGE");
        if (
          !this.props.stock_data.charts[symbol] ||
          !this.props.stock_data.charts[symbol][timeframe]
        ) {
          const end = new Date().getTime();
          await view_selected_stock({ timeframe, end, symbol, props });
          this.setState({
            allOHLCdata: this.props.stock_data.charts[symbol][timeframe],
          });
          partialOHLCdata = this.props.stock_data.charts[symbol][timeframe];
        } else {
          this.setState({
            allOHLCdata: this.props.stock_data.charts[symbol][timeframe],
          });
          partialOHLCdata = this.props.stock_data.charts[symbol][timeframe];
        }
        //this is just a temporary fix
        // this data may come from elsewhere
        this.setState({ ...DefaultRegressionSettings });
      } else if (this.props.type === "commodity") {
        if (
          timeframe !== "daily" &&
          timeframe !== "weekly"
          // timeframe !== "60Min" &&
          // timeframe !== "5Min"
          /**
           * The timeframe is
           * 1Min tick data
           */
        ) {
          if (
            /**
             * Do we even have one minute data to serve
             */
            !this.props.stock_data.commodity_data[symbol] ||
            !this.props.stock_data.commodity_data[symbol]["1Min"]
          ) {
            let props = this.props;
            await getMinutelyCommodityData({
              symbol,
              props,
            });
          } else {
            //compile tick mins
            let chart_data = this.props.stock_data.commodity_data[symbol][
              "1Min"
            ];
            let mins = getMins(timeframe);
            chart_data = compileTickData([...chart_data], mins);
            this.props.dispatch(
              add_commodity_chart_data({ symbol, chart_data, timeframe })
            );
            setTimeout(() => {
              this.setNewData(symbol, timeframe);
            }, 0);
          }
        } else if (
          timeframe === "daily" ||
          timeframe === "weekly"
          // timeframe === "60Min" ||
          // timeframe === "5Min"
        ) {
          //If we get a timeframe other than 1min, lets also just get the 1Min
          if (
            !this.props.stock_data.commodity_data[symbol] ||
            !this.props.stock_data.commodity_data[symbol]["1Min"]
          ) {
            let props = this.props;
            await getMinutelyCommodityData({
              symbol,
              props,
            });
          }
          if (
            !this.props.stock_data.commodity_data[symbol] ||
            !this.props.stock_data.commodity_data[symbol][timeframe]
          ) {
            await view_selected_commodity({ timeframe, symbol, props });
            this.setNewData(symbol, timeframe);
          } else {
            this.setNewData(symbol, timeframe);
          }
        }
      }
      this.props.dispatch({
        type: "NEW_TIMEFRAME",
        timeframe,
      });
    }
  }

  setNewData(symbol, timeframe, onlyAddNewBar) {
    let { type, stock_data } = this.props;
    let currentData;
    let currentRawData;
    notEndOfData = true;
    if (type === "commodity") {
      if (!stock_data.commodity_data[symbol]) return console.log("new bugg?");
      currentData = stock_data.commodity_data[symbol][timeframe];
      currentRawData = stock_data.rawCommodityCharts[symbol][timeframe];
    } else if (type === "stock") {
      //catch possible bugs
      if (!stock_data.charts[symbol])
        return toastr.error(`no chart data found for ${symbol}`);
      //TODO get Stock regression values??

      // console.log(stock_data.charts);
      currentData = stock_data.charts[symbol][timeframe];
      // currentRawData = stock_data.rawCharts[symbol][timeframe];
    }

    /**
     * We need to check if all the data changed
     */
    if (!onlyAddNewBar) {
      this.setState({
        allOHLCdata: currentData,
        rawOHLCData: currentRawData,
      });
      partialOHLCdata = currentData;
      setTimeout(() => this.setupChart(), 0);
    }
  }

  async loadCommodityData({ timeframe, symbol, props }) {
    let {
      active,
      fibonacciMinMax,
      fibonacciSensitivity,
      minMaxTolerance,
      priceLevelMinMax,
      priceLevelSensitivity,
      regressionErrorLimit,
      volProfileBarCount,
      volProfileBins,
    } = this.props.stock_data.commodityRegressionData[symbol][timeframe];
    this.setState({
      fibonacciMinMax,
      fibonacciSensitivity,
      minMaxTolerance,
      priceLevelMinMax,
      priceLevelSensitivity,
      regressionErrorLimit,
      volProfileBarCount,
      volProfileBins,
    });
    if (
      timeframe !== "daily" &&
      timeframe !== "weekly" &&
      timeframe !== "intraday"
    ) {
      if (timeframe === "1Min") {
        await getMinutelyCommodityData({ symbol, props });
        this.updateVolProfile();
      }
    } else {
      await view_selected_commodity({ timeframe, symbol, props });
    }
  }

  addHighLowMarkers(minMaxValues) {
    let that = this;
    if (!this.state.visibleIndicators.minMaxMarkers) return; //console.log(' minMaxMarkers not turned on');

    //   name, mincolor, maxcolor, ismin, ismax, PriceLevels
    appendMinmaxMarkers("high", "green", "red", false, true, that);
    appendMinmaxMarkers("low", "green", "red", true, false, that);

    function appendMinmaxMarkers(name, minColor, maxColor, min, max, that) {
      if (!that.state.visibleIndicators.minMaxMarkers)
        return console.log("minMaxMarkers not turned on");

      let svg = select(that.state.chartRef.current);
      let chartWindow = svg.select(".chartWindow");

      if (max) {
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

    let volAxis = axisLeft(this.state.volScale).ticks(4);

    let volProfileAxis = axisTop(this.state.volProfileScale).ticks(4);

    //Set up some data
    this.createPriceLevelsData();

    //make all EMA/STD data
    Object.keys(this.state.EMA_data).forEach((MA_value) => {
      this.state.EMA_data[MA_value] = makeEMA(MA_value, this.state.allOHLCdata);
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

    let chartWindow = svg
      // .append('rect').attr('width', this.state.innerWidth).attr('height', this.state.innerHeight)
      .append("g")
      .attr("class", "chartWindow")
      .attr("transform", `translate(${margin.left},${margin.top})`)
      .attr("fill", "black");

    CenterLabel({
      symbol: this.state.symbol,
      timeframe: this.state.timeframe,
      chartWindow,
      x: "45%",
      y: margin.top + this.state.innerHeight / 2,
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
      let { timeframe } = otherThat.state;
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
        .attr("x2", () =>
          otherThat.state.timeScale(
            otherThat.state.timestamps[otherThat.state.timestamps.length - 1]
          )
        )
        .attr("y2", MOUSEY);
    }

    const d3zoom = zoom().on("zoom", function () {
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

    //Making data for later draws
    let fibData = makeFibonacciData(this, {
      timeScale: this.state.timeScale,
      priceScale: this.state.priceScale,
    });
    this.setState({
      timeAxis,
      priceAxis,
      fibData,
      volAxis,
      volProfileAxis,
    });
    this.draw();
  } //setupChart()

  appendAxisAnnotations(x, y, svg) {
    drawAxisAnnotation(
      "topVolProfileTag",
      this.state.volProfileScale,
      x,
      svg,
      "volProfileAxis"
    );
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
      "priceAxis",
      2
    );
    drawAxisAnnotation("leftVolTag", this.state.volScale, y, svg, "volAxis");
  }

  zoomed() {
    if (!partialOHLCdata) return;
    let mouseZoomPOS = MOUSEX / this.state.innerWidth;
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
    if (!partialOHLCdata) return;

    mouseDRAGSART = event.x - margin.left;
    dragStartData = [...partialOHLCdata];
  }
  async dragged() {
    let isLoading = this.props.meta.is_loading;
    if (isLoading) return;
    let xDragPOS = event.x - margin.left;
    let dragAmount = Math.abs(xDragPOS - mouseDRAGSART);
    let barWidth = this.state.innerWidth / dragStartData.length;
    let barCount = parseInt(dragAmount / barWidth);
    // console.log({ barWidth });
    if (barCount < 1) return;
    if (lastBarCount === barCount) return;
    lastBarCount = barCount;
    let data;
    let zoomingLeft = false;
    if (xDragPOS > mouseDRAGSART) {
      // console.log("left");
      let start = dragStartData[0];
      let startIndex = this.state.allOHLCdata.findIndex(
        (d) => d.timestamp === start.timestamp
      );
      let dataEnd = dragStartData.slice(0, dragStartData.length - 1 - barCount);
      let zeroOrGreater = startIndex - barCount < 0 ? 0 : startIndex - barCount;
      let dataStart = this.state.allOHLCdata.slice(zeroOrGreater, startIndex);
      if (zeroOrGreater === 0) zoomingLeft = true;

      data = [...dataStart, ...dataEnd];
    } else if (xDragPOS < mouseDRAGSART) {
      // console.log("right");
      let end = dragStartData[dragStartData.length - 1];
      let endIndex = this.state.allOHLCdata.findIndex(
        (d) => d.timestamp === end.timestamp
      );
      let dataStart = dragStartData.slice(barCount, dragStartData.length - 1);
      let dataEnd = this.state.allOHLCdata.slice(endIndex, endIndex + barCount);
      data = [...dataStart, ...dataEnd];
    }
    let props = this.props;
    let { symbol, timeframe } = this.state;
    let newBarWidth = this.state.innerWidth / data.length;
    const barWidthLimit = 1.6;
    // if (newBarWidth > barWidthLimit && notEndOfData && zoomingLeft) {
    //   // console.log(this.state);
    //   // console.log(this.props);
    //   //load more data
    //   let currentData = this.props.stock_data.commodity_data[symbol][timeframe];
    //   let to = new Date().getTime();
    //   let from = 0;
    //   if (currentData) {
    //     from = 0;
    //     to = currentData[0].timestamp;
    //   }
    //   if (timeframe === "1Min") {
    //     await getMinutelyCommodityData({ props, symbol, timeframe, from, to });
    //   } else {
    //     await view_selected_commodity({ props, symbol, timeframe, from, to });
    //   }
    //   // console.log(this.props.stock_data.commodity_data[symbol][timeframe]);
    //   let dataIndex = this.props.stock_data.commodity_data[symbol][
    //     timeframe
    //   ].findIndex((d) => d.timestamp === to);
    //   let newData = this.props.stock_data.commodity_data[symbol][
    //     timeframe
    //   ].slice(0, dataIndex);
    //   if (!newData.length) notEndOfData = false;
    //   data = [...newData, ...data];
    // }

    partialOHLCdata = data;

    return this.draw();
  }
  dragEnd() {
    // console.log("dragEnd");
  }

  draw(data) {
    if (!this.state.timeAxis) return console.log("Disaster averted!");
    // console.log(this.state.timeAxis)
    let drawData;
    if (data) {
      drawData = data;
    } else {
      drawData = partialOHLCdata;
    }
    if (!drawData || !drawData.length || drawData.length < 2) return;
    let volValues = drawData.map((d) => d.volume);
    let [volMin, volMax] = extent(volValues);
    let priceMax = max(drawData, (d) => d.high);
    let priceMin = min(drawData, (d) => d.low);
    //only run if have vol profile data
    if (this.state.volProfile.binnedProfile) {
      let rawVolProfileValues = this.state.volProfile.binnedProfile.map(
        ({ up, down, neutral }) => up + down + neutral
      );
      let [volProfileMin, volProfileMax] = extent(rawVolProfileValues);
      this.state.volProfileScale.domain([volProfileMax, 0]);
    }
    let [timeMin, timeMax] = extent(drawData.map(({ timestamp }) => timestamp));
    const priceRange = priceMax - priceMin;
    let timeframe = drawData[1].timestamp - drawData[0].timestamp;
    this.state.timeScale.domain([timeMin - timeframe, timeMax + timeframe]);

    this.state.candleHeightScale.domain([0, priceRange]);
    this.state.priceScale.domain([priceMin, priceMax]);
    this.state.volScale.domain([0, volMax]);
    // get the SVG element
    let svg = select(this.state.chartRef.current);
    //trying to catch the source of this strange error, that only happens in dev...
    // (() => {
    //   if (!svg) {
    //     console.log("WHAA");
    //   }
    //   if (!svg.select() || !this.state.priceAxis) {
    //     console.log("WHAA");
    //   }
    //   if (!svg.select(".timeAxis").call(this.state.priceAxis)) {
    //     console.log("WHAA");
    //   }
    //   if (typeof this.state.priceAxis != "function") {
    //     console.log(typeof this.state.priceAxis);
    //     console.log("WHAA");
    //   }
    // })();

    svg.select(".timeAxis").call(this.state.timeAxis);
    svg.select(".priceAxis").call(this.state.priceAxis);
    svg.select(".volAxis").call(this.state.volAxis);
    svg.select(".volProfileAxis").call(this.state.volProfileAxis);

    let chartWindow = svg.select(".chartWindow");
    let candleWidth = this.state.innerWidth / drawData.length;

    this.addHighLowMarkers(this.state.minMaxValues);

    let scales = {
      timeScale: this.state.timeScale,
      priceScale: this.state.priceScale,
      volScale: this.state.volScale,
      volProfileScale: this.state.volProfileScale,
    };
    let moreData = { priceMax, priceMin };
    this.appendEMA(chartWindow, scales);
    this.appendImportantPriceLevel(this, chartWindow, scales);
    this.appendFibonacciLines(this, chartWindow, scales);

    this.appendPriceLevelRanges(this, chartWindow, scales);
    this.appendRegressionLines(this, chartWindow, scales);
    this.appendTrades(this, chartWindow, scales);
    this.drawVolumeBars(this, chartWindow, scales);
    this.drawVolumeProfile(this, chartWindow, scales, moreData);
    this.drawVWAP(this, chartWindow, scales, moreData);
    this.drawBollingerBands(this, chartWindow, scales, moreData);
    this.drawSuperTrend(this, chartWindow, scales, moreData);
    this.drawExpectedTradingRange(this, chartWindow, scales, moreData);

    addCandleSticks(
      drawData,
      chartWindow,
      candleWidth,
      this.state.timeScale,
      this.state.priceScale,
      this.state.candleHeightScale
    );

    //  Adds an axis annotation to show the most recent value
    drawAxisAnnotation(
      "currentRightPriceTag",
      this.state.priceScale,
      partialOHLCdata.slice(-1)[0].close,
      svg,
      "priceAxis"
    );
  } //end of draw

  appendEMA(chartWindow, { timeScale, priceScale }) {
    if (this.state.visibleIndicators.emaLine) {
      chartWindow.selectAll(".emaLine").remove();

      //show 20 EMA
      drawMALine(chartWindow, this.state.EMA_data, 20, {
        timeScale,
        priceScale,
      });
      // }
      // if (this.state.visibleIndicators.ema50) {
      //show 50 EMA
      drawMALine(chartWindow, this.state.EMA_data, 50, {
        timeScale,
        priceScale,
      });
      // }
      // if (this.state.visibleIndicators.ema200) {
      //show 200 EMA
      drawMALine(chartWindow, this.state.EMA_data, 200, {
        timeScale,
        priceScale,
      });
    }
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
    if (!that.state.visibleIndicators.tradeMarkers) return; //console.log('showTrades not turned on');

    let scales = {
      priceScale,
      timeScale,
    };

    TradeMarker({ that, partialOHLCdata, scales, chartWindow });
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
      .style("opacity", (d) => {
        //display shorter lines with more opacity
        let length = d.length / 10000;
        if (length > 2000) return 0.9;
        if (length > 1500) return 0.7;
        if (length > 1000) return 0.5;
        if (length > 500) return 0.3;
        return 0.2;
      })
      .on("click", function (d) {
        console.log("click");
      })
      .on("mouseover", function (d) {
        that.regressionNearbyPoints(d, chartWindow, {
          priceScale,
          timeScale,
        });
        //extend length to end of chart
        let maxTime = max(that.state.timestamps, (t) => t);
        let { m, b } = d;
        let price = m * maxTime + b;
        this.setAttribute("x2", timeScale(maxTime));
        this.setAttribute("y2", priceScale(price));
      })
      .on("mouseout", function () {
        this.classList.remove("hoveredRegressionLine");
        chartWindow.selectAll(".regressionNearbyPoint").remove();
      });
  }

  async updateVolProfile() {
    let { symbol, timeframe, volProfileBins, volProfileBarCount } = this.state;
    let data = this.props.stock_data.rawCommodityCharts[symbol][timeframe];
    let regData = this.props.stock_data.commodityRegressionData;
    if (!volProfileBarCount || !volProfileBins) {
      volProfileBarCount = regData[symbol][timeframe].volProfileBarCount;
      volProfileBins = regData[symbol][timeframe].volProfileBins;
    }

    //use the function to make own profile
    let volProfile = VolProfile(data, timeframe, volProfileBins);

    // let volProfile = await API.getVolProfile({
    //   symbol,
    //   date: new Date().getTime(),
    //   bars: volProfileBarCount,
    //   bins: volProfileBins,
    // });
    this.setState({ volProfile });
    this.draw();
  }

  regressionNearbyPoints(data, chartWindow, { priceScale, timeScale }) {
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

  drawExpectedTradingRange(that, chartWindow, scales, { priceMax, priceMin }) {
    if (!this.state.visibleIndicators.expectedTradingRange) return;
    let { symbol, timeframe } = this.state;

    let x = "timestamp";
    let y = "expectedRange";
    let nestedY = "top";
    let color = "#bfe7b1";
    let groupName = "expectedTradingRange";
    let data = this.state.rawOHLCData;
    drawSimpleLine(chartWindow, data, "upperTtradingRange", scales, {
      x,
      y,
      nestedY,
      color,
      groupName,
    });

    nestedY = "bottom";
    drawSimpleLine(chartWindow, data, "lowerTtradingRange", scales, {
      x,
      y,
      nestedY,
      color,
      groupName,
    });
  }
  drawSuperTrend(that, chartWindow, scales, { priceMax, priceMin }) {
    if (!this.state.visibleIndicators.superTrend) return;
    let { symbol, timeframe } = this.state;
    let data = this.state.rawOHLCData;
    drawColoredSuperTrend(chartWindow, data, "superTrend", scales);
  }
  drawBollingerBands(that, chartWindow, scales, { priceMax, priceMin }) {
    if (!this.state.visibleIndicators.bollingerBands) return;
    let { symbol, timeframe } = this.state;

    let x = "timestamp";
    let y = "BB";
    let groupName = "bollingerBands";
    let nestedY = "upper";
    let color = "#bfe7b1";
    let data = this.state.rawOHLCData;
    drawSimpleLine(chartWindow, data, "upperBB", scales, {
      x,
      y,
      nestedY,
      color,
      groupName,
    });
    nestedY = "lower";
    drawSimpleLine(chartWindow, data, "lowerBB", scales, {
      x,
      y,
      nestedY,
      color,
      groupName,
    });
    nestedY = "middle";
    drawSimpleLine(chartWindow, data, "middleBB", scales, {
      x,
      y,
      nestedY,
      color,
      groupName,
    });
  }
  drawVWAP(that, chartWindow, scales, { priceMax, priceMin }) {
    if (!this.state.visibleIndicators.VWAP) return;
    let { symbol, timeframe } = this.state;

    let x = "timestamp";
    let y = "VWAP";
    let nestedY = "VWAP";
    let color = "pink";
    let data = that.props.stock_data.rawCommodityCharts[symbol][timeframe];
    drawSimpleLine(chartWindow, data, "VWAP", scales, {
      x,
      y,
      nestedY,
      color,
    });
  }

  drawVolumeProfile(that, chartWindow, scales, { priceMax, priceMin }) {
    if (!this.state.visibleIndicators.volumeProfile) return;

    let dataPoints = this.state.volProfile;
    const tickSize = TICKS[this.state.symbol];

    let options = {
      tickSize,
      opacity: 0.2,
      innerHeight: this.state.innerHeight,
      innerWidth: this.state.innerWidth,
      priceMax,
      priceMin,
    };
    let markerClass = "volProfileBar";

    VolumeProfileBars({
      that,
      chartWindow,
      dataPoints,
      scales,
      options,
      markerClass,
    });
  }
  drawVolumeBars(that, chartWindow, scales) {
    if (!this.state.visibleIndicators.volumeBars) return;
    let dataPoints = partialOHLCdata;
    let options = {
      opacity: 0.2,
      innerHeight: this.state.innerHeight,
      innerWidth: this.state.innerWidth,
    };
    let markerClass = "volBar";
    VolumeBars({ that, chartWindow, dataPoints, scales, options, markerClass });
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
        this.classList.add("importantLine");
        that.highlightNearbyPoints(d, chartWindow, {
          priceScale,
          timeScale,
        });
      })
      .on("mouseout", function () {
        this.classList.remove("importantLine");
        chartWindow.selectAll(".nearbyPoint").remove();
      });
  }
  highlightNearbyPoints(data, chartWindow, { priceScale, timeScale }) {
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
    let { highs, lows, closes, timestamps } = this.state;
    let minMaxValues = {
      high: { maxValues: [] },
      low: { minValues: [] },
      close: { minValues: [], maxValues: [] },
    };
    var { minValues, maxValues } = diff.minMax(
      timestamps,
      highs,
      tolerance,
      minMaxMostRecentData
    );

    minMaxValues["high"].maxValues = maxValues;

    var { minValues, maxValues } = diff.minMax(
      timestamps,
      lows,
      tolerance,
      minMaxMostRecentData
    );

    minMaxValues["low"].minValues = minValues;

    var { minValues, maxValues } = diff.minMax(
      timestamps,
      closes,
      tolerance,
      minMaxMostRecentData
    );

    minMaxValues["close"].maxValues = maxValues;
    minMaxValues["close"].minValues = minValues;
    return minMaxValues;
  }

  removeLine() {
    return console.log("test");
  }

  toggleIndicators(indicator) {
    let svg = select(this.state.chartRef.current);

    let markers = svg.selectAll(`.${indicator}`);
    markers.remove();
    let temp = this.state.visibleIndicators;
    let val = temp[indicator];
    val = !val;
    temp[indicator] = val;
    this.setState({
      visibleIndicators: temp,
    });
    setTimeout(() => this.draw(), 0);
  }

  runPriceLevels() {
    let priceLevelMinMax = this.state.priceLevelMinMax;
    //this is used to decide if the minMax setting
    // will get reduced as the window gets smaller
    //towards the more recent data
    let minMaxMostRecentData = true;
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

    //not sure this works?
    // groupedPoints = dropDuplicateMinMax(groupedPoints);

    this.setState({ importantPriceLevels: groupedPoints });
    setTimeout(() => this.draw(), 0);
  }

  createPriceLevelsData() {
    if (!this.state.rawOHLCData) return;
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
      let highPoints = [...minMaxValues.high.maxValues];
      let lowPoints = [...minMaxValues.low.minValues];
      //run a cool regression function with the min max values
      let errLimit = this.state.regressionErrorLimit;
      let highLines = diff.regressionAnalysis(highPoints, errLimit);
      let lowLines = diff.regressionAnalysis(lowPoints, errLimit);
      this.runPriceLevels();
      //make all EMA/STD data
      Object.keys(this.state.EMA_data).forEach((MA_value) => {
        this.state.EMA_data[MA_value] = makeEMA(
          MA_value,
          this.state.allOHLCdata
        );
      });

      this.setState({
        minMaxValues: minMaxValues,
        regressionLines: { highLines, lowLines },
      });
    }, 0);
    setTimeout(() => this.draw(), 0);
  }
  //tells the stock bot to watch certain stock
  setTimeframeActive() {
    let { timeframe, symbol } = this.state;
    let { _id } = this.props.stock_data.commodityRegressionData[symbol][
      timeframe
    ];
    API.setTimeframeActive(_id, timeframe, this.props);
  }
  //sets the settings in the api server
  //TODO add user id
  saveRegressionSettings() {
    let { symbol } = this.props;
    let {
      minMaxTolerance,
      regressionErrorLimit,
      priceLevelMinMax,
      priceLevelSensitivity,
      fibonacciMinMax,
      fibonacciSensitivity,
      timeframe,
      volProfileBins,
      volProfileBarCount,
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
      volProfileBins,
      volProfileBarCount,
      props,
    });
  }

  setTimeframe(e) {
    let timeframe = e.target.value;
    let { stock_data } = this.props;
    let symbol = stock_data.search_symbol;
    //TODO subject to change
    //this data should come from somewhere?
    if (this.props.type === "commodity") {
      //also setting the regression indicators settings
      this.setState({
        timeframe,
        ...stock_data.commodityRegressionData[symbol][timeframe],
      });
    } else if (this.props.type === "stock") {
      this.setState({ ...DefaultRegressionSettings });
    }
  }

  runRegressionAnalysis() {
    //Run regrerssion lines
    let minMaxMostRecentData = true;
    let minMaxValues = this.runMinMax(
      this.state.minMaxTolerance,
      minMaxMostRecentData
    );
    let highPoints = [...minMaxValues.high.maxValues];
    let lowPoints = [...minMaxValues.low.minValues];
    //run a cool regression function with the min max values
    let errLimit = this.state.regressionErrorLimit;
    let highLines = diff.regressionAnalysis(highPoints, errLimit);
    let lowLines = diff.regressionAnalysis(lowPoints, errLimit);
    this.setState({
      minMaxValues: minMaxValues,
      regressionLines: { highLines, lowLines },
    });
  }

  updateSettingsValue(e, value) {
    this.setState({
      [value]: parseFloat(e.target.value),
    });

    this.runNewSettings(value);
  }

  runNewSettings(settingName) {
    console.log({ settingName });
    if (
      settingName === "minMaxTolerance" ||
      settingName === "regressionErrorLimit"
    ) {
      this.runRegressionAnalysis();
    } else if (
      settingName === "priceLevelMinMax" ||
      settingName === "priceLevelSensitivity"
    ) {
      this.runPriceLevels();
    } else if (
      settingName === "fibonacciMinMax" ||
      settingName === '"fibonacciSensitivity"'
    ) {
      let fibData = makeFibonacciData(this, {
        timeScale: this.state.timeScale,
        priceScale: this.state.priceScale,
      });
      this.setState({ fibData });
    }
    setTimeout(() => this.draw(), 0);
  }
  render() {
    // console.log("RENDERING??");
    let symbol = this.props.stock_data.search_symbol;
    let trades;
    if (this.props.type === "commodity") {
      trades = this.props.stock_data.commodityTrades[symbol];
    } else if (this.props.type === "stock") {
      trades = this.props.stock_data.stockTrades[symbol];
    }
    let currentTickData = this.props.stock_data.currentTickData[symbol];

    return (
      <div>
        <h3>{this.state.timeframe}</h3>

        {this.props.meta.is_loading && (
          <Loader width={this.props.width} height={this.state.height} />
        )}
        <div
          onClick={() =>
            this.setState({
              showIndicatorCharts: !this.state.showIndicatorCharts,
            })
          }
        >
          <button>Indicator Charts</button>
          <div style={{
            display:this.state.showIndicatorCharts? ' ':'none'
          }}>

          <IndicatorChart
            data={this.state.rawOHLCData}
            indicator="momentum"
            horizontalLines={{ centerLine: 0 }}
            symbol={this.state.symbol}
            timeframe={this.state.timeframe}
            width={this.props.width}
            height={150}
          />

          <IndicatorChart
            data={this.state.rawOHLCData}
            indicator="RSI"
            horizontalLines={{ overboughtLine: 70, oversoldLine: 20 }}
            symbol={this.state.symbol}
            timeframe={this.state.timeframe}
            width={this.props.width}
            height={150}
          />
          <IndicatorChart
            data={this.state.rawOHLCData}
            horizontalLines={{ overboughtLine: 100, oversoldLine: -100 }}
            indicator="CCI"
            symbol={this.state.symbol}
            timeframe={this.state.timeframe}
            width={this.props.width}
            height={150}
          />

          <IndicatorChart
            data={this.state.rawOHLCData}
            horizontalLines={{ overboughtLine: 80, oversoldLine: 20 }}
            indicator="stochastics"
            symbol={this.state.symbol}
            timeframe={this.state.timeframe}
            width={this.props.width}
            height={150}
          />
                    </div>

        </div>

        <ToggleIndicators
          toggleIndicators={(indicator) => this.toggleIndicators(indicator)}
          visibleIndicators={this.state.visibleIndicators}
        />

        <svg
          ref={this.state.chartRef}
          width={this.props.width}
          height={this.state.height}
          className="svgChart"
        ></svg>
        <select
          onChange={(e) => this.setTimeframe(e)}
          className="form-control"
          name=""
          id=""
        >
          <option value="1Min">1 Min</option>
          <option value="5Min">5 Min</option>
          {/* <option value="15Min">15 Min</option>
          <option value="30Min">30 Min</option> */}
          <option value="60Min">60 Min</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>
        {/* Sad but no more cool timer */}
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
            //for volProfile
            volProfileBins={this.state.volProfileBins}
            volProfileBarCount={this.state.volProfileBarCount}
            updateVolProfile={this.updateVolProfile}
            //SAVES THE SETTINGS
            saveRegressionSettings={() => this.saveRegressionSettings()}
            //tells stock bot its active
            setActive={() => this.setTimeframeActive()}
          />
        </RegressionSettingsContainer>

        <TradesListContainer>
          <TradesList trades={trades} instrumentType={this.props.type} />
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
  if (timeframe === "Daily") return 1000 * 60 * 60 * 24;
}
function getMins(timeframe) {
  if (timeframe === "1Min") return 1;
  if (timeframe === "5Min") return 5;
  if (timeframe === "60Min") return 60;
  if (timeframe === "Daily") return 60 * 24;
}
