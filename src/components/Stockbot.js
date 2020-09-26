import React from "react";
import { connect } from "react-redux";
import { Link, withRouter } from "react-router-dom";
import styled from "styled-components";
import { getTrades } from "../redux/actions/StockBotActions.js";

import Table from "./StockBotComponents/DisplayTradesTable.js";
const {
  getDollarProfit,
  TICKS,
  tickValues,
} = require("../indicators/indicatorHelpers/utils.js");

class Stockbot_Page extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      headerArrayMapping: {
        // orderTime: "Time",
        entryTime: "Entry",
        symbol: "Symbol",
        stratName: "Strat",
        buyOrSell: "Buy/Sell",
        entryPrice: "Price",
        exitPrice: "Price",
        exitTime: "Exit",
        // instrumentType:"instrumentType",
        // orderStatus: "Status",
        // order_stop: "Stop",
        // order_target: "Target",
        // order_type: "Type",
        // position_size: "Size",
        MaxPL: "Max PnL",
        PL: "PnL",
        dollarProfit: "$USD",
      },
      rowCount: 30,
      startData: 0,
      endData: 30,
    };
    this.tableOverflowScroll = React.createRef();

    this.handleScroll = this.handleScroll.bind(this);
    this.handlePrev = this.handlePrev.bind(this);
    this.handleNext = this.handleNext.bind(this);
    this.handlePageLast = this.handlePageLast.bind(this);
    this.handlePageFirst = this.handlePageFirst.bind(this);
  }

  async componentDidMount() {
    console.log("get stock bot trades");
    this.props.dispatch(getTrades());

    //add scroll event listeners
  }

  componentWillUnmount() {
    //remove scroll event listeners
  }

  componentDidUpdate(prevProps) {
    this.dataUpdated(prevProps);
  }

  dataUpdated(prevProps) {
    let prevData = prevProps.stockBot.trades;

    let { trades } = this.props.stockBot;
    if (prevData.length !== trades.length) {
      let dataLen = trades.length;
      if (!dataLen < 30) {
        dataLen = 30;
      }
      this.setState({
        endData: dataLen,
      });
    }
  }
  alterData(data, key) {
    if (key === "exitTime" || key === "entryTime" || key === "orderTime") {
      let d = new Date(data[key]).toLocaleString().split(" ");
      d.shift();
      d = d.join(" ");
      return d;
    } else if (
      key === "entryPrice" ||
      key === "exitPrice" ||
      key === "order_stop" ||
      key === "dollarProfit" ||
      key === "order_target"
    ) {
      return `$${data[key]}`;
    } else {
      return false;
    }
  }

  totalPL(trades) {
    let totalProfit = trades.reduce((a, trade) => {
      let dollarAmount = getDollarProfit(trade);
      if(dollarAmount>100000){
        console.log('no')
        debugger
      }
      return a + dollarAmount;
    }, 0);
    return totalProfit;
  }

  handleScroll(e) {
    let element = e.target;
    this.tableOverflowScroll.current.scrollLeft = element.scrollLeft;
  }
  handlePageLast() {
    let { trades } = this.props.stockBot;
    console.log("go last " + trades.length);
    let endData = trades.length;
    let startData =
      trades.length < this.state.rowCount
        ? 0
        : trades.length - this.state.rowCount;
    console.log({ startData, endData });
    this.setState({
      startData,
      endData,
    });
  }
  handlePageFirst() {
    let { trades } = this.props.stockBot;
    let endData =
      trades.length > this.state.rowCount ? this.state.rowCount : trades.length;
    this.setState({
      startData: 0,
      endData,
    });
  }

  handleNext() {
    let { trades } = this.props.stockBot;
    let startData;
    let endData;
    if (this.state.endData === trades.length) {
      endData =
        trades.length > this.state.rowCount
          ? this.state.rowCount
          : trades.length;
      startData = 0;
    } else {
      startData = this.state.startData + this.state.rowCount;
      endData = this.state.endData + this.state.rowCount;
    }
    if (this.state.endData > trades.length) {
      startData = trades.length - this.state.rowCount;
      endData = trades.length;
    }
    this.setState({
      startData,
      endData,
    });
  }
  handlePrev() {
    let { trades } = this.props.stockBot;
    let startData;
    let endData;
    if (this.state.startData === 0) {
      endData = trades.length;
      startData = trades.length - this.state.rowCount;
    } else {
      endData = this.state.endData - this.state.rowCount;
      startData = this.state.startData - this.state.rowCount;
    }
    if (startData < 0) {
      startData = 0;
      endData = trades.length < 30 ? trades.length : 30;
    }
    this.setState({
      startData,
      endData,
    });
  }

  render() {
    let { rowCount, startData, endData } = this.state;
    let { handleNext, handlePrev, handlePageFirst, handlePageLast } = this;
    let trades = this.props.stockBot.trades;
    trades.forEach((trade) => {
      trade.dollarProfit = getDollarProfit(trade);
    });
    // console.log(trades);
    let stochasticMethodTrades = trades.filter((t) =>
      t.stratName.startsWith("stochastic")
    );
    let stochasticWinners = stochasticMethodTrades.filter((t) => t.PL > 0);
    //get all stochastic trade details
    let all1Min = [];
    let all5Min = [];
    let all15Min = [];
    let all30Min = [];
    let all60Min = [];
    let allDaily = [];
    let all_ES_trades = [];
    let all_RTY_trades = [];
    let all_CL_trades = [];
    let all_GC_trades = [];
    let all_NQ_trades = [];
    let all_YM_trades = [];
    stochasticMethodTrades.forEach((t) => {
      let { PL } = t;
      let [groupName, symbol, timeframe, buySell] = t.stratName.split("_");
      // console.log({groupName, symbol, timeframe, buySell})

      switch (symbol) {
        case "ES":
          all_ES_trades.push(t);
          break;
        case "NQ":
          all_NQ_trades.push(t);
          break;
        case "CL":
          all_CL_trades.push(t);
          break;
        case "GC":
          all_GC_trades.push(t);
          break;
        case "YM":
          all_YM_trades.push(t);
          break;
        case "RTY":
          all_RTY_trades.push(t);
          break;

        default:
          break;
      }

      switch (timeframe) {
        case "1Min":
          all1Min.push(t);
          break;
        case "5Min":
          all5Min.push(t);
          break;
        case "15Min":
          all15Min.push(t);
          break;
        case "30Min":
          all30Min.push(t);
          break;
        case "60Min":
          all60Min.push(t);
          break;
        case "daily":
          allDaily.push(t);
          break;

        default:
          break;
      }
    });
    let oldPriceLevelTrades = trades.filter(
      (t) => !t.stratName.endsWith("Activation")
    );
    let newPriceLevelTrades = trades.filter((t) =>
      t.stratName.endsWith("Activation")
    );
    let oldStratProfit = oldPriceLevelTrades.reduce(
      (a, b) => getDollarProfit(b) + a,
      0
    );
    let newStratProfit = newPriceLevelTrades.reduce(
      (a, b) => getDollarProfit(b) + a,
      0
    );
    let oldWinners = oldPriceLevelTrades.filter((t) => t.PL > 0);
    let newWinners = newPriceLevelTrades.filter((t) => t.PL > 0);

    let stochastic_winners = {};
    let symbols = ["ES", "CL", "YM", "GC", "RTY", "NQ"];

    let esWinners = all_ES_trades.filter((t) => t.PL > 0);
    let nqWinners = all_NQ_trades.filter((t) => t.PL > 0);
    let clWinners = all_CL_trades.filter((t) => t.PL > 0);
    let ymWinners = all_YM_trades.filter((t) => t.PL > 0);
    let gcWinners = all_GC_trades.filter((t) => t.PL > 0);
    let rtyWinners = all_RTY_trades.filter((t) => t.PL > 0);
    let min1Winners = all1Min.filter((t) => t.PL > 0);
    let min5Winners = all5Min.filter((t) => t.PL > 0);
    let min15Winners = all15Min.filter((t) => t.PL > 0);
    let min30Winners = all30Min.filter((t) => t.PL > 0);
    let min60Winners = all60Min.filter((t) => t.PL > 0);
    let dailyWinners = allDaily.filter((t) => t.PL > 0);
    return (
      <div className="container white">
        <div className="col flex_center">
          <h1>Stock bot</h1>
        </div>
        <div className="col flex_center">
          <h3>
            Total PL:{" "}
            <span className="white">{`$${this.totalPL(
              this.props.stockBot.trades
            )}`}</span>
          </h3>
        </div>
        <div className="row flex_center">
          <div className="col-sm-12 flex_center">STOCHASTICS</div>

          <div className="col-sm-12 flex_center">
            Total ES winners {esWinners.length}/{all_ES_trades.length} ratio{" "}
            {(esWinners.length / all_ES_trades.length).toFixed(3)} PL ={" "}
            {this.totalPL(all_ES_trades)}
          </div>
          <div className="col-sm-12 flex_center">
            Total YM winners {ymWinners.length}/{all_YM_trades.length} ratio{" "}
            {(ymWinners.length / all_YM_trades.length).toFixed(3)} PL ={" "}
            {this.totalPL(all_YM_trades)}
          </div>
          <div className="col-sm-12 flex_center">
            Total GC winners {gcWinners.length}/{all_GC_trades.length} ratio{" "}
            {(gcWinners.length / all_GC_trades.length).toFixed(3)} PL ={" "}
            {this.totalPL(all_GC_trades)}
          </div>
          <div className="col-sm-12 flex_center">
            Total CL winners {clWinners.length}/{all_CL_trades.length} ratio{" "}
            {(clWinners.length / all_CL_trades.length).toFixed(3)} PL ={" "}
            {this.totalPL(all_CL_trades)}
          </div>
          <div className="col-sm-12 flex_center">
            Total NQ winners {nqWinners.length}/{all_NQ_trades.length} ratio{" "}
            {(nqWinners.length / all_NQ_trades.length).toFixed(3)} PL ={" "}
            {this.totalPL(all_NQ_trades)}
          </div>
          <div className="col-sm-12 flex_center">
            Total RTY winners {rtyWinners.length}/{all_RTY_trades.length} ratio{" "}
            {(rtyWinners.length / all_RTY_trades.length).toFixed(3)} PL ={" "}
            {this.totalPL(all_RTY_trades)}
          </div>

          <div className="col-sm-12 flex_center">
            Total 1Min winners {min1Winners.length}/{all1Min.length} ratio{" "}
            {(min1Winners.length / all1Min.length).toFixed(3)} PL ={" "}
            {this.totalPL(all1Min)}
          </div>

          <div className="col-sm-12 flex_center">
            Total 5Min winners {min5Winners.length}/{all5Min.length} ratio{" "}
            {(min5Winners.length / all5Min.length).toFixed(3)} PL ={" "}
            {this.totalPL(all5Min)}
          </div>

          <div className="col-sm-12 flex_center">
            Total 15Min winners {min15Winners.length}/{all15Min.length} ratio{" "}
            {(min15Winners.length / all15Min.length).toFixed(3)} PL ={" "}
            {this.totalPL(all15Min)}
          </div>
          <div className="col-sm-12 flex_center">
            Total 30Min winners {min30Winners.length}/{all30Min.length} ratio{" "}
            {(min30Winners.length / all30Min.length).toFixed(3)} PL ={" "}
            {this.totalPL(all30Min)}
          </div>
          <div className="col-sm-12 flex_center">
            Total 60Min winners {min60Winners.length}/{all60Min.length} ratio{" "}
            {(min60Winners.length / all60Min.length).toFixed(3)} PL ={" "}
            {this.totalPL(all60Min)}
          </div>
          <div className="col-sm-12 flex_center">
            Total Daily winners {dailyWinners.length}/{allDaily.length} ratio{" "}
            {(dailyWinners.length / allDaily.length).toFixed(3)} PL ={" "}
            {this.totalPL(allDaily)}
          </div>
        </div>
        <div className="row flex_center white">
          <div className="col-sm-12 flex_center">Strat Study</div>

          <div className="row flex_center full-width">
            <div className="col-sm-6 ">
              <div className="row full-width flex_center">
                <p>Old PriceLevel Strat = {oldStratProfit}</p>
              </div>
              <div className="row full-width flex_center">
                <p>
                  winners vs losers = {oldWinners.length}/
                  {oldPriceLevelTrades.length}
                </p>
              </div>
              <div className="row flex_center">
                <p>Ratio: {oldWinners.length / oldPriceLevelTrades.length}</p>
              </div>
            </div>
            <div className="col-sm-6 ">
              <div className="row flex_center">
                <p>New PriceLevel Strat = {newStratProfit}</p>
              </div>
              <div className="row flex_center">
                <p>
                  winners vs losers = {newWinners.length}/
                  {newPriceLevelTrades.length}
                </p>
              </div>
              <div className="row flex_center">
                <p>Ratio: {newWinners.length / newPriceLevelTrades.length}</p>
              </div>
            </div>
          </div>
        </div>
        {trades.length && (
          <>
            <ScrollBar onScroll={this.handleScroll} />
            <div
              ref={this.tableOverflowScroll}
              className="full-width scroll_x mb-4"
            >
              <Table
                startData={startData}
                endData={endData}
                dailyDollarProfit={true}
                addDateRow={"entryTime"}
                alterData={this.alterData}
                data={trades.sort((a, b) => b.entryTime - a.entryTime)}
                headerArrayMapping={this.state.headerArrayMapping}
              />
            </div>
            <Pagination
              startData={startData}
              endData={endData}
              handleNext={handleNext}
              handlePrev={handlePrev}
              handlePageLast={handlePageLast}
              handlePageFirst={handlePageFirst}
              trades={trades}
            />
          </>
        )}
      </div>
    );
  }
}

function mapStateToProps(state) {
  const { stockBot } = state;
  return { stockBot };
}

export default connect(mapStateToProps)(withRouter(Stockbot_Page));

const Pagination = ({
  startData,
  endData,
  handleNext,
  handlePrev,
  handlePageLast,
  handlePageFirst,
  trades,
}) => {
  return (
    <div className="row flex_center">
      <div className="col-sm-6 flex_center">
        <button
          onClick={handlePageFirst}
          type="button"
          className="btn btn-primary"
        >
          {"<< "}FIRST 0
        </button>
        <button onClick={handlePrev} type="button" className="btn btn-primary">
          {"< "}PREV {startData}
        </button>
      </div>
      <div className="col-sm-6 flex_center">
        <button onClick={handleNext} type="button" className="btn btn-primary">
          {" "}
          {endData} NEXT {" >"}
        </button>
        <button
          onClick={handlePageLast}
          type="button"
          className="btn btn-primary"
        >
          {" "}
          {trades.length} LAST {" >>"}
        </button>
      </div>
    </div>
  );
};
const ScrollBar = ({ onScroll }) => {
  return (
    <>
      <SimScroll onScroll={onScroll}>
        <SimBar />
      </SimScroll>
    </>
  );
};

const SimScroll = styled.div`
  /* width:100%; */
  overflow-x: scroll;
  overflow-y: hidden;
  height: 12px;
`;

const SimBar = styled.div`
  width: 2000px;
  height: 2px;
`;
