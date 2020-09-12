import React from "react";
import { connect } from "react-redux";
import { toastr } from "react-redux-toastr";
import { withRouter } from "react-router";
import styled from "styled-components";
import { getOpAlerts } from "../redux/actions/opActions.js";
import API from './API.js'
// import {ensure_not_loggedin} from '../components/utils/auth.js'

class OpAlerts extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    this.props.dispatch(getOpAlerts());
  }
  componentDidUpdate() {}

  sortAlerts() {
    let { alerts } = this.props.options;
    if (!alerts.length) return {};
    let sortedAlerts = {};
    alerts.forEach((alert) => {
      let { dateTime, exp, putCall, strike, symbol, timestamp } = alert;
      if (!sortedAlerts[symbol]) {
        sortedAlerts[symbol] = {};
        sortedAlerts[symbol]["PUT"] = {};
        sortedAlerts[symbol]["CALL"] = {};
      }
      sortedAlerts[symbol][putCall][strike] = alert;
    });
    console.log(sortedAlerts);
    return sortedAlerts;
  }
  async checkSnap({ symbol, exp, strike, putCall }) {
    console.log({ symbol, exp, strike });
    let res = await API.fetchOpAlertData({symbol, exp, strike, putCall })
    console.log(res)
  }

  render() {
    let { options } = this.props;
    let { checkSnap } = this;
    console.log(options);
    let sortedAlerts = this.sortAlerts();
    console.log({ sortedAlerts });
    return (
      <div className="row flex_center white">
        <div className="col-sm-12 flex_center">
          <h2>Option Alerts</h2>
        </div>
        <div className="col-sm-12">
          <div className="row flex_center">
            <h2>Table</h2>
          </div>
          {Object.keys(sortedAlerts).map((symbol) => {
            let { CALL, PUT, alert } = sortedAlerts[symbol];
            //return a row per symbol
            return alertRow({ symbol, CALL, PUT, alert, checkSnap });
          })}
        </div>
      </div>
    );
  }
}
function mapStateToProps(state) {
  const { options } = state;
  return { options };
}
export default connect(mapStateToProps)(withRouter(OpAlerts));

const alertRow = ({ symbol, CALL, PUT, alert, checkSnap }) => {
  return (
    <div key={symbol} className="row m-2">
      <div className="col-sm-12  hoverableTicker">
        <TickerSymbol symbol={symbol} />
        <CallPutRow
          checkSnap={checkSnap}
          calls={CALL}
          puts={PUT}
          alert={alert}
        />
      </div>
    </div>
  );
};

const TickerSymbol = ({ symbol }) => {
  return (
    <div className="row flex_center">
      <h5>{symbol}</h5>
    </div>
  );
};

const CallPutRow = ({ calls, puts, alert, checkSnap }) => {
  return (
    <div className="row ">
      <div className="col-sm-6 sectionHover">
        <div className="row flex_center">
          <h5>CALLS</h5>
        </div>
        <div className="row flex_center">
          <Strikes checkSnap={checkSnap} callsPutStrikes={calls} />
        </div>
      </div>
      <div className="col-sm-6 sectionHover">
        <h5>PUTS</h5>
        <div className="row flex_center">
          <Strikes checkSnap={checkSnap} callsPutStrikes={puts} />
        </div>
      </div>
    </div>
  );
};

const Strikes = ({ callsPutStrikes, symbol, checkSnap }) => {
  let strikes = Object.keys(callsPutStrikes)
    .sort((a, b) => a - b)
    .map((strike) => {
      let { alerts, dateTime, exp, putCall, symbol } = callsPutStrikes[
        strike
      ];
      return (
        <div className="col-sm-12 flex_center">
          <div key={callsPutStrikes} className="row hoverable clickable ">
            <div className="col-sm-12 ">
              <div className="row flex_center">{strike}</div>
            </div>
            {alerts.map((alert, iAlert) => {
              let contractBG =
                iAlert % 2 === 0 ? "ticker_row_light" : "ticker_row_dark";
              return (
                <div
                  key={`${alert}${iAlert}`}
                  onClick={() => checkSnap({ symbol, strike, exp, putCall })}
                  className={`col-sm-12 flex_center ${contractBG}`}
                >
                  <div className="row flex_center hoverableAlertTimestamp full-width">
                    <div className="col-sm-6 flex_center">{alert.alert}</div>
                    <div className="col-sm-6 flex_center">{alert.dateTime}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    });
  return strikes;
};
