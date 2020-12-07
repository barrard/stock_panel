import React from "react";
import { connect } from "react-redux";
import { Link, withRouter } from "react-router-dom";
import { getTrades } from "../redux/actions/StockBotActions.js";
import Socket from "./Socket.js";

class Account_Profile extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      priceLevelIndicator: {},
    };
  }

  componentDidMount() {
    Socket.on("PriceLevelIndicator", (priceLevelIndicator) => {
      this.setState({ priceLevelIndicator });
    });
  }

  componentWillUnmount() {
    Socket.off("PriceLevelIndicator");
  }

  componentDidUpdate(prevProps) {}

  render() {
    console.log(this.props);
    console.log(this.state);
    let { priceLevelIndicator } = this.state;
    debugger;

    return (
      <div className="container">
        <div className="row flex_center">
          <h1>Account_Profile</h1>
        </div>
        <div className="row flex_center white">
          {this.props.user.user.primary_email}
        </div>
        {Object.keys(priceLevelIndicator).length === 0 && (

          <div className="white">Waiting for indicator data......</div>
        )}


        {!!Object.keys(priceLevelIndicator).length && (
          <>
            <div className="white">Temp indicator spot {new Date().toLocaleString()}</div>
            <ul className="white">
              <li>
                COMPX {priceLevelIndicator.COMPX.lastPrice} %
                {priceLevelIndicator.COMPX.netPercentChangeInDouble}
              </li>
              <li>
                DJI {priceLevelIndicator.DJI.lastPrice} %
                {priceLevelIndicator.DJI.netPercentChangeInDouble}
              </li>
              <li>
                SPX {priceLevelIndicator.SPX.lastPrice} %
                {priceLevelIndicator.SPX.netPercentChangeInDouble}
              </li>
              <li>
                VIX {priceLevelIndicator.VIX.lastPrice} %
                {priceLevelIndicator.VIX.netPercentChangeInDouble}
              </li>
              <li>
                UVOL {priceLevelIndicator.UVOL.lastPrice} %
                {priceLevelIndicator.UVOL.netPercentChangeInDouble}
              </li>
              <li>
                DVOL {priceLevelIndicator.DVOL.lastPrice} %
                {priceLevelIndicator.DVOL.netPercentChangeInDouble}
              </li>
              <li>
                TICK {priceLevelIndicator.TICK.lastPrice} %
                {priceLevelIndicator.TICK.netPercentChangeInDouble}
              </li>
              <li>
                TRIN {priceLevelIndicator.TRIN.lastPrice} %
                {priceLevelIndicator.TRIN.netPercentChangeInDouble}
              </li>
              <li>dailyCount {priceLevelIndicator.dailyCount}</li>
              <li>hourlyCount {priceLevelIndicator.hourlyCount}</li>
              <li>weeklyCount {priceLevelIndicator.weeklyCount}</li>
              <li>symbolCount {priceLevelIndicator.symbolCount}</li>
            </ul>
          </>
        )}
      </div>
    );
  }
}

function mapStateToProps(state) {
  const { user, stock_data, meta, stockbot } = state;
  return { user, stock_data, meta, stockbot };
}

export default connect(mapStateToProps)(withRouter(Account_Profile));
