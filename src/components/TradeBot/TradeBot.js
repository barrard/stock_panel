import React from "react";
import { connect } from "react-redux";
import { toastr } from "react-redux-toastr";
//import { withRouter } from 'next/router';
import { Link, withRouter } from "react-router-dom";
import styled from "styled-components";
import diff from "../../indicators/indicatorHelpers/extrema";

let masterPriceLevels = {};
let masterRegressionLines = {};

let newDataTracker = {};
let closestPriceLevels = {};
let lastTickQuote = {};
let currentPositon = {};
let closedPositions = {};
let totalPL = {};
//import Main_Layout from '../layouts/Main_Layout.js';
class TradeBot extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    console.log("TradeBot has mounted");
  }

  componentDidUpdate(prevProps, prevState) {
    // console.log({prevProps, prevState})
    // console.log({props:this.props, state:this.state})
    let prevTickData = prevProps.newTickData;
    let currentTickData = this.props.newTickData;
    // console.log({prevTickData, currentTickData})

    if (prevTickData !== currentTickData) {
      //   console.log("Run something");
      //   console.log("what stocks do we have data for");
      //   console.log(this.props.stock_data.commodityRegressionData);
      let lineSettings = this.props.stock_data.commodityRegressionData;
      let commodityData = this.props.stock_data.commodity_data;
      for (let symbol in lineSettings) {
        if (!masterPriceLevels[symbol]) {
          masterPriceLevels[symbol] = {};
          masterRegressionLines[symbol] = {};
          newDataTracker[symbol] = {};
          closestPriceLevels[symbol] = {};
          lastTickQuote[symbol] = {};
          closedPositions[symbol] = [];
          totalPL[symbol] = 0;
        }
        // console.log(symbol);
        // console.log(data[symbol]);

        //get one min data
        // console.log(commodityData[symbol]);
        if (!commodityData[symbol]) return;
        lineSettings[symbol].map(settings => {
          let {
            minMaxTolerance,
            regressionErrorLimit,
            priceLevelMinMax,
            priceLevelSensitivity,
            timeframe
          } = settings;
          if (!timeframe) return;
          //   console.log({
          //     minMaxTolerance,
          //     regressionErrorLimit,
          //     timeframe,
          //     priceLevelMinMax,
          //     priceLevelSensitivity
          //   });
          //load the data into memory
          let barData = commodityData[symbol][timeframe];
          if (!barData) return; //console.log(`No data for ${timeframe} ${symbol} `)
          let newDataFlag = false;
          //   console.log(barData.length);
          if (!newDataTracker[symbol][timeframe]) {
            newDataTracker[symbol][timeframe] = barData.length;
          }
          if (newDataTracker[symbol][timeframe] != barData.length) {
            newDataFlag = true;
            newDataTracker[symbol][timeframe] = barData.length;
          }

          if (!masterPriceLevels[symbol][timeframe] || newDataFlag) {
            let priceLevels = this.runPriceLevels(settings, barData);
            masterPriceLevels[symbol][timeframe] = priceLevels;
          }
          if (!masterRegressionLines[symbol][timeframe] || newDataFlag) {
            let regressionLines = this.getRegressionLines(settings, barData);
            masterRegressionLines[symbol][timeframe] = regressionLines;
          }

          //then run line equations
          if (!lastTickQuote[symbol] || !lastTickQuote[symbol].close) {
            console.log("First time through");
            return (lastTickQuote[symbol] = currentTickData[symbol]);
          }

          //Check where we are compared to the pricelines
          let currentlyInPosition = currentPositon[symbol];
          if (currentlyInPosition) {
            this.analyzeTrade(currentTickData[symbol], symbol, timeframe);
          } else {
            this.comparePriceToPriceLevels(
              currentTickData[symbol],
              symbol,
              timeframe
            );

            //   this.comparePriceToRegressionLines(
            //     currentTickData[symbol],
            //     symbol,
            //     timeframe
            //   );
          }

          //this is the end, so we save last tick to compare to the next
          lastTickQuote[symbol] = currentTickData[symbol];
        });
      }
    }
  }

  makeTrade({ buyOrSell, symbol, entryPrice, above, below, entryTime }) {
    console.log({ buyOrSell, symbol, entryPrice, above, below });
    console.log(above.slice(0, 1)[0]);
    console.log(below.slice(0, 1)[0]); //slice the second item, as the first was the entry
    let target =
      buyOrSell === "Buy" ? above.slice(1, 2)[0] : below.slice(1, 2)[0];
    let stop =
      buyOrSell === " Buy"
        ? entryPrice - (target - entryPrice) / 3
        : entryPrice + (entryPrice - target) / 3;
    stop = parseFloat(stop.toFixed(3));
    console.log({ target, stop });
    currentPositon[symbol] = {
      buyOrSell,
      entryPrice,
      stop,
      target,
      entryTime
    };
  }

  analyzeTrade(quote, symbol, timeframe) {
    let price = quote.close;
    let trade = currentPositon[symbol];
    // console.log({ quote, trade });
    let boughtOrSold = trade.buyOrSell === "Buy" ? "Bought" : "Sold";

    let { stop, target } = trade;

    let PL =
      trade.buyOrSell === "Buy"
        ? parseFloat((price - trade.entryPrice).toFixed(3))
        : parseFloat((trade.entryPrice - price).toFixed(3));

    console.log(
      `we ${boughtOrSold} ${symbol} at ${trade.entryPrice}, with a stop at ${stop}, and a target of ${target}`
    );
    console.log(`The current price of ${symbol} is ${price}`);
    console.log(`The current PL ${PL} while the Max PL was ${trade.MaxPL}`);
    if (!trade.MaxPL) trade.MaxPL = PL;
    if (PL > trade.MaxPL) trade.MaxPL = PL;

    /**
     * Check if target has been hit
     */
    let targetHit =
      trade.buyOrSell === "Buy" ? price >= target : price <= target;
    let stopHit = trade.buyOrSell === "Buy" ? price <= stop : price >= stop;

    if (stopHit) {
      console.log(`Hit the stop on ${symbol} at ${price} for loss of ${PL}`);
    } else if (targetHit) {
      console.log(
        `Hit the target on ${symbol} at ${price} for profit of ${PL}`
      );
    }
    if (stopHit || targetHit) {
      trade.PL = PL;
      trade.exitPrice = price;
      trade.exitTime = quote.end_timestamp;
      closedPositions[symbol].push(trade);
      currentPositon[symbol] = null;
      totalPL[symbol] += PL
      console.log(closedPositions);
      console.log(totalPL)
    }
  }

  comparePriceToPriceLevels(quote, symbol, timeframe) {
    let price = quote.close;
    //above and below price levels
    let priceLevels = masterPriceLevels[symbol][timeframe];
    // console.log({ price, symbol, timeframe, priceLevels });
    let above = [];
    let below = [];
    let closest = null;
    priceLevels.forEach(priceLevel => {
      //is price level Above of Below current price
      let aboveOrBelow = price < priceLevel ? "Above" : "Below";
      if (aboveOrBelow === "Above") {
        above.push(priceLevel); //these price levels are above the current price
      } else if (aboveOrBelow === "Below") {
        below.push(priceLevel); //these price levels are below the current price
      }
      if (!closest) {
        closest = priceLevel;
      } else {
        let currentDiff = Math.abs(closest - price);
        let compareDiff = Math.abs(priceLevel - price);
        if (compareDiff < currentDiff) {
          closest = priceLevel;
        }
      }

      //   console.log(`The Price Level ${priceLevel} is ${aboveOrBelow} Currrent price @${price}`)
    });
    // console.log("PriceLevel Analysis");

    if (!closestPriceLevels[symbol][timeframe]) {
      closestPriceLevels[symbol][timeframe] = closest;
    }

    let aboveOrBelow = price < closest ? "Above" : "Below";

    // console.log(
    //   `closest priceLine is at ${closest} which is ${aboveOrBelow} current price ${price}`
    // );

    let previousPrice = lastTickQuote[symbol].close;
    let previousAboveOrBelow = previousPrice < closest ? "Above" : "Below";
    let sameOrNot =
      previousAboveOrBelow === aboveOrBelow ? "Same" : "NOT the same";
    // console.log(
    //   `Previously, closest priceLine was at ${closest} which was ${previousAboveOrBelow} the previousPrice of ${previousPrice}, which is the same or not? ${sameOrNot}`
    // );
    if (sameOrNot === "NOT the same") {
      /**
       * If aboveOrBelow is Above, then
       * we assume previously was below, meaning we buy
       * else we sell
       */
      let buyOrSell = aboveOrBelow === "Above" ? "Buy" : "Sell";
      below.reverse(); //get these price levels highest to lowest

      console.log(`Ok we are ${buyOrSell}ing ${symbol} at ${price}`);
      let entryPrice = price;
      let entryTime = quote.end_timestamp;
      this.makeTrade({
        buyOrSell,
        symbol,
        entryPrice,
        above,
        below,
        entryTime
      });
    }

    // console.log({ above, below, closest });
  }

  comparePriceToRegressionLines(quote, symbol, timeframe) {
    let price = quote.close;
    console.log({ quote });
    //above and below price levels
    let regressionLines = masterRegressionLines[symbol][timeframe];
    console.log({ price, symbol, timeframe, regressionLines });
    let above = [];
    let below = [];
    let closest = null;
    regressionLines.forEach(regressionLine => {
      //   //is price level Above of Below current price
      let { m, b } = regressionLine;
      let x = quote.start_timestamp;
      let regrerssionPrice = parseFloat((m * x + b).toFixed(3));
      let aboveOrBelow = price < regrerssionPrice ? "Above" : "Below";
      if (aboveOrBelow === "Above") {
        above.push(regrerssionPrice); //these price levels are above the current price
      } else if (aboveOrBelow === "Below") {
        below.push(regrerssionPrice); //these price levels are below the current price
      }
      if (!closest) {
        closest = regrerssionPrice;
      } else {
        let currentDiff = Math.abs(closest - price);
        let compareDiff = Math.abs(regrerssionPrice - price);
        if (compareDiff < currentDiff) {
          closest = regrerssionPrice;
        }
      }

      // console.log(`The Price Level ${priceLevel} is ${aboveOrBelow} Currrent price @${price}`)
    });
    console.log("Regression line Analysis");

    if (!closestPriceLevels[symbol][timeframe]) {
      closestPriceLevels[symbol][timeframe] = closest;
    }

    let aboveOrBelow = price < closest ? "Above" : "Below";

    console.log(
      `closest priceLine is at ${closest} which is ${aboveOrBelow} current price ${price}`
    );

    let previousPrice = lastTickQuote[symbol].close;
    let previousAboveOrBelow = previousPrice < closest ? "Above" : "Below";
    let sameOrNot =
      previousAboveOrBelow === aboveOrBelow ? "Same" : "NOT the same";
    console.log(
      `Previously, closest priceLine was at ${closest} which was ${previousAboveOrBelow} the previousPrice of ${previousPrice}, which is the same or not? ${sameOrNot}`
    );

    if (sameOrNot === "NOT the same") {
      /**
       * If aboveOrBelow is Above, then
       * we assume previously was below, meaning we buy
       * else we sell
       */
      let buyOrSell = aboveOrBelow === "Above" ? "Buy" : "Sell";
      //Reverse the values below to get highest first
      console.log(below);
      below.reverse();
      console.log(below);
      console.log(`Ok we are ${buyOrSell}ing ${symbol} at ${price}`);
      let entryPrice = price;
      let entryTime = quote.end_timestamp;
      this.makeTrade({
        buyOrSell,
        symbol,
        entryPrice,
        above,
        below,
        entryTime
      });
    }

    console.log({ above, below, closest });
  }

  getRegressionLines(settings, data) {
    console.log(settings.minMaxTolerance);
    if (!data) return;

    let minMaxValues = this.runMinMax(settings.minMaxTolerance, data);
    let highPoints = [...minMaxValues.high.maxValues];
    let lowPoints = [...minMaxValues.low.minValues];
    //run a cool regression function with the min max values
    let errLimit = settings.regressionErrorLimit;
    let highLines = diff.regressionAnalysis(highPoints, errLimit);
    let lowLines = diff.regressionAnalysis(lowPoints, errLimit);
    console.log({ highLines, lowLines });
    //grab the last 4 lines
    let lastHightLines = highLines.slice(-4);
    let lastLowLines = lowLines.slice(-4);
    console.log({ lastHightLines, lastLowLines });
    return [...lastHightLines, ...lastLowLines];
  }

  runPriceLevels(settings, data) {
    console.log(settings);
    //   return
    let priceLevelMinMax = settings.priceLevelMinMax;
    console.log(`Running local MinMax with ${priceLevelMinMax}`);

    let importantMinMaxValues = this.runMinMax(priceLevelMinMax, data);
    let importantHighPoints = [
      ...importantMinMaxValues.high.maxValues,
      ...importantMinMaxValues.close.maxValues
    ];
    let importantLowPoints = [
      ...importantMinMaxValues.low.minValues,
      ...importantMinMaxValues.close.minValues
    ];
    let allImportantPoints = [...importantHighPoints, ...importantLowPoints];
    /**
     * merge similar lines
     */
    let groupedPoints = diff.mergeImportantPriceLevels(
      allImportantPoints,
      settings.priceLevelSensitivity
    );
    console.log({
      allImportantPoints,
      groupedPoints
    });

    //get all the price levels
    let priceLevels = groupedPoints.map(({ y }) => y).sort();
    console.log({ priceLevels });

    return priceLevels;
  }

  runMinMax(tolerance, data) {
    // console.log({ tolerance });
    let timestamps = data.map(d => d.timestamp);
    let highs = data.map(d => d.high);
    let lows = data.map(d => d.low);
    let closes = data.map(d => d.close);
    let opens = data.map(d => d.open);

    // let { highs, lows, closes, timestamps } = this.state;

    let minMaxValues = {
      high: { maxValues: [] },
      low: { minValues: [] },
      close: { minValues: [], maxValues: [] }
    };
    // console.log({ highs: this.state.highs, data: this.props.data });

    var { minValues, maxValues } = diff.minMax(timestamps, highs, tolerance);

    minMaxValues["high"].maxValues = maxValues;
    // minMaxValues["high"].minValues = minValues;

    var { minValues, maxValues } = diff.minMax(timestamps, lows, tolerance);

    // minMaxValues["low"].maxValues = maxValues;
    minMaxValues["low"].minValues = minValues;
    // var { minValues, maxValues } = diff.minMax(timestamps, opens, minMaxTolerance);

    // minMaxValues["open"].maxValues = maxValues;
    // minMaxValues["open"].minValues = minValues;
    var { minValues, maxValues } = diff.minMax(timestamps, closes, tolerance);

    minMaxValues["close"].maxValues = maxValues;
    minMaxValues["close"].minValues = minValues;

    return minMaxValues;
  }

  render() {
    return <></>;
  }
}

function mapStateToProps(state) {
  return state;
}

export default connect(mapStateToProps)(withRouter(TradeBot));
