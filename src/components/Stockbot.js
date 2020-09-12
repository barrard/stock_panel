import React from "react";
import { connect } from "react-redux";
import { Link, withRouter } from "react-router-dom";
import styled from "styled-components";
import { getTrades } from "../redux/actions/StockBotActions.js";

import Table from "./StockBotComponents/DisplayTradesTable.js";
import { getDollarProfit, TICKS, tickValues } from "../indicators/indicatorHelpers/utils.js";

class Account_Profile extends React.Component {
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

export default connect(mapStateToProps)(withRouter(Account_Profile));

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
