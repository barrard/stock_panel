import React from "react";
import { connect } from "react-redux";
import { Link, withRouter } from "react-router-dom";
import { getTrades } from "../redux/actions/StockBotActions.js";
import { TICKS, tickValues } from "./charts/chartHelpers/utils.js";
import Table from "./StockBotComponents/DisplayTradesTable.js";
import {getDollarProfit} from './charts/chartHelpers/utils.js'

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
    };
  }

  async componentDidMount() {
    console.log("get stock bot trades");
    this.props.dispatch(getTrades());
  }

  componentWillUnmount() {}

  componentDidUpdate(prevProps) {}

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

  render() {
    let trades = this.props.stockBot.trades;
    trades.forEach((trade) => {
      trade.dollarProfit = getDollarProfit(trade);
    });

    console.log(trades);
    // debugger

    return (
      <div className="container">
        <div className="row flex_center">
          <div className="col flex_center">
            <h1>Stock bot</h1>
          </div>
          <div className="col flex_center">
            <h3>
              Total PL:{" "}
              <span className='white'>{`$${this.totalPL(this.props.stockBot.trades)}`}</span>
            </h3>
          </div>
        </div>
        <div className="row">
          <Table
          dailyDollarProfit={true}
            addDateRow={"entryTime"}
            alterData={this.alterData}
            data={trades.sort((a,b)=>b.entryTime-a.entryTime)}
            headerArrayMapping={this.state.headerArrayMapping}
          />
        </div>
      </div>
    );
  }
}

function mapStateToProps(state) {
  const { user, stock_data, meta, stockBot } = state;
  return { user, stock_data, meta, stockBot };
}

export default connect(mapStateToProps)(withRouter(Account_Profile));

