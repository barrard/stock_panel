import React, { useState } from "react";
import { connect } from "react-redux";
import { toastr } from "react-redux-toastr";
import { withRouter } from "react-router";
import styled from "styled-components";
import { getOpAlerts } from "../redux/actions/opActions.js";
import API from "./API.js";
// import {ensure_not_loggedin} from '../components/utils/auth.js'

class OpAlerts extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      snap: {},
      selectedSymbol: null,
      selectedStrike: null,
      selectedExp: null,
      selectedPutCall: null,
    };
    this.checkSnap = this.checkSnap.bind(this);
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
        debugger
        let underlyingPrice = alert.alerts.slice(-1)[0].underlyingPrice || 'Na'
        sortedAlerts[symbol] = {};
        sortedAlerts[symbol]["PUT"] = {};
        sortedAlerts[symbol]["CALL"] = {};
        sortedAlerts[symbol]["underlyingPrice"] = underlyingPrice
      }
      sortedAlerts[symbol][putCall][strike] = alert;
    });
    // console.log(sortedAlerts);
    return sortedAlerts;
  }
  async checkSnap({ symbol, exp, strike, putCall }) {
    //set the symbol, strike, exp, putCall
    console.log({ symbol, exp, strike });
    let snap = await API.fetchOpAlertData({ symbol, exp, strike, putCall }); //[0]//SHOULD BE ARRAY LENGTH 1
    if (!snap.length) {
      return console.log(`No data for this strike ${symbol} ${strike}`);
    } //re should really only get one snapshot back
    console.log(snap);
    debugger;

    this.setState({
      snap: snap[0],
      selectedSymbol: symbol,
      selectedStrike: strike,
      selectedExp: exp,
      selectedPutCall: putCall,
    });
  }

  render() {
    let { options } = this.props;
    let { checkSnap } = this;
    console.log(options);
    let sortedAlerts = this.sortAlerts();
    // console.log({ sortedAlerts });
    let {
      selectedExp,
      selectedSymbol,
      selectedStrike,
      selectedPutCall,
    } = this.state;
    let selectedOp = {
      selectedSymbol,
      selectedExp,
      selectedPutCall,
      selectedStrike,
    };
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
            let { CALL, PUT, underlyingPrice } = sortedAlerts[symbol];
            //return a row per symbol
            return alertRow({
              state: this.state,
              symbol,
              CALL,
              PUT,underlyingPrice,
              checkSnap,
              selectedOp,
            });
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

const alertRow = ({ symbol, CALL, PUT, underlyingPrice,checkSnap, selectedOp, state }) => {
  debugger
  return (
    <div key={symbol} className="row m-2">
      <div className="col-sm-12  hoverableTicker">
        <TickerSymbol symbol={symbol} />{underlyingPrice}
        <CallPutRow
          state={state}
          checkSnap={checkSnap}
          calls={CALL}
          puts={PUT}
          selectedOp={selectedOp}
        />
      </div>
    </div>
  );
};

const TickerSymbol = ({ symbol }) => {
  return (
    <div className="row flex_center ">
      <h5 className="isMainTitle">{symbol}</h5>
    </div>
  );
};

const CallPutRow = ({ calls, puts, checkSnap, selectedOp, state }) => {
  // let{selectedExp,
  //   selectedSymbol,
  //   selectedStrike,
  //   selectedPutCall}= selectedOp
  return (
    <div className="row ">
      <div className="col-sm-6 sectionHover">
        <div className="row flex_center">
          <h5>CALLS</h5>
        </div>
        <div className="row  opContractWindow">
          <Strikes
            state={state}
            selectedOp={selectedOp}
            checkSnap={checkSnap}
            callsPutStrikes={calls}
          />
        </div>
      </div>
      <div className="col-sm-6 flex_center sectionHover">
        <h5>PUTS</h5>
        <div className="row flex_center opContractWindow">
          <Strikes
            state={state}
            selectedOp={selectedOp}
            checkSnap={checkSnap}
            callsPutStrikes={puts}
          />
        </div>
      </div>
    </div>
  );
};

const Strikes = ({ callsPutStrikes, checkSnap, selectedOp, state }) => {
  const [min, setMin] = useState(null);
  let strikes = Object.keys(callsPutStrikes)
    .sort((a, b) => a - b)
    .map((strike, iStrike) => {
      let { alerts, exp, putCall, symbol } = callsPutStrikes[strike];
      let isSelected;
      let {
        selectedExp,
        selectedPutCall,
        selectedStrike,
        selectedSymbol,
      } = selectedOp;
      if (
        exp === selectedExp &&
        putCall === selectedPutCall &&
        symbol === selectedSymbol &&
        strike === selectedStrike
      ) {
        isSelected = true;
      }
      return (
        <div key={`${strike}${putCall}`} className="col-sm-12 flex_center">
          <div
            key={callsPutStrikes}
            className="row hoverable clickable full-width "
          >
            <div className="col-sm-12 ">
              <div
                className="row flex_center isTitle"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log("Click");
                  console.log(min);
                  setMin(iStrike);
                }}
              >
                ${strike} Exp: {exp} #Alerts({alerts.length})
              </div>
            </div>
            {alerts.map((alert, iAlert) => {
              let snap;
              let contractBG =
                iAlert % 2 === 0 ? "ticker_row_light" : "ticker_row_dark";

              return (
                <div
                  key={`${alert}${iAlert}`}
                  onClick={(e) => {
                    e.stopPropagation(); //  <------ Here is the magic
                    checkSnap({ symbol, strike, exp, putCall });
                  }}
                  className={`col-sm-12 flex_center ${contractBG} ${
                    min === iStrike ? " " : " zeroHeight"
                  }`}
                >
                  

                  <div className="row flex_center hoverableAlertTimestamp full-width">
                    <div className="col-sm-6  "><span className='keyLabel'> Alert:</span> {alert.alert}</div>
                    <div className="col-sm-6  "><span className='keyLabel'>Time:</span> {alert.dateTime}</div>
                    {isSelected && (
                      <div className="row flex_center ">
                        <div className="col-sm-12 flex_center">
                          {state.snap &&
                            state.snap.snaps
                              .filter((s) => s.dateTime === alert.dateTime)
                              .map((snap) => {
                                if (snap.dateTime === alert.dateTime) {
                                  debugger
                                  return (
                                    <div className="row flex_center p-2">
                                      <hr />
                                      <div className="col-sm-12 ">
                                        <div className="row flex_center">
                                          <div className="col-sm-6 ">
                                            <div className="row ">
                                              <div className="col-sm-12 keyLabel">
                                                Time of alert:
                                              </div>
                                            </div>
                                            <div className="row ">
                                              <div className="col-sm-12 ">
                                                {snap.dateTime}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="col-sm-6 ">
                                            <div className="row ">
                                              <div className="col-sm-12 keyLabel">
                                                Price:
                                              </div>
                                              <div className="col-sm-12 ">
                                                {snap.last}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {twoColData(
                                        "openInterest",
                                        snap.openInterest,
                                        "totalVolume",
                                        snap.totalVolume
                                      )}
                                      {twoColData(
                                        "Bid",
                                        snap.bid,
                                        "Ask",
                                        snap.ask
                                      )}
                                          {twoColData(
                                        "rho",
                                        snap.rho,
                                        "vega",
                                        snap.vega
                                      )}
                                          {twoColData(
                                        "delta",
                                        snap.delta,
                                        "gamma",
                                        snap.gamma
                                      )}



                                    </div>
                                  );
                                }
                              })}
                        </div>
                      </div>
                    )}
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

const twoColData = (title1, data1, title2, data2) => {
  return (
    <div className="col-sm-12">
      <div className="row ">
        <div className="col-sm-6 ">
          <span className="keyLabel">{title1}:</span>{data1}
        </div>
        <div className="col-sm-6 ">
        <span className="keyLabel">{title2}:</span>{data2}
        </div>
      </div>
    </div>
  );
};


