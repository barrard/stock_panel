import React, { useState } from "react";
import { connect } from "react-redux";
import { toastr } from "react-redux-toastr";
import { withRouter } from "react-router";
import styled from "styled-components";
import { getOpAlerts } from "../redux/actions/opActions.js";
import API from "./API.js";
import Tree from "react-d3-tree";

// import {ensure_not_loggedin} from '../components/utils/auth.js'

class OpAlerts extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      filter_symbol: "",
      filter_exp: "",
      filter_underlying: "",
      filter_last: "",
      filter_totalVolume: "",
      filter_strike: "",
      selectedAlerts: [],
      snapshots: {},
      lessThan_last: true,
      lessThan_totalVolume: true,
      lessThan_underlying: true,
      filterNames: ["symbol", "exp", "totalVolume", "last", "underlying"],
    };
    this.resetFilters = this.resetFilters.bind(this);
  }

  componentDidMount() {
    this.props.dispatch(getOpAlerts());
  }

  dropDownSelect(name, values) {
    let selects = values.map((v) => {
      return (
        <option key={v} value={v}>
          {v}
        </option>
      );
    });
    let firstOption = (
      <option
        selected="true"
        disabled="true"
        value={`Select ${name}`}
      >{`Select ${name}`}</option>
    );
    selects = [firstOption, ...selects];
    return (
      <div className="optionFilterSelect">
        {(name === "last" ||
          name === "underlying" ||
          name === "totalVolume") && (
          <>
            <label htmlFor="">{`${
              this.state[`lessThan_${name}`] ? `Less Than` : `Greater Than`
            }`}</label>

            <input
              value={this.state[`lessThan_${name}`]}
              onChange={() => {
                let lessThan = this.state[`lessThan_${name}`];
                this.setState({ [`lessThan_${name}`]: !lessThan });
              }}
              type="checkbox"
              name="greater Less Than"
              id=""
            />
          </>
        )}
        <select
          // value={this.state[`filter_${name}`]}
          onChange={(e) => {
            this.setState({
              [`filter_${name}`]: e.target.value,
            });
          }}
          name={name}
        >
          {selects}
        </select>
      </div>
    );
  }

  showFilters() {
    return (
      <div className="full-width filterHover">
        <div className="row flex_center">
          {this.state.filterNames.map((f) => {
            return (
              <div key={f} className="col flex_center">
                <div className="row flex_center">
                  <div className="col-sm-12 flex_center">{f}</div>
                  <div className="col-sm-12 flex_center">
                    {this.state[`filter_${f}`] && this.state[`filter_${f}`]}
                    {!this.state[`filter_${f}`] && `Select ${f}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  filterAlerts(alerts) {
    // console.log(alerts);
    // console.log(this.state.filterNames);
    this.state.filterNames.forEach((f) => {
      let filterValue = this.state[`filter_${f}`];
      // console.log(filterValue);
      if (filterValue) {
        console.log(`got ${filterValue} for filter_${f}`);
        if (f === "symbol") {
          alerts = alerts.filter((a) => a.symbol === filterValue);
        }
        // if (f === "strike") {
        //   alerts = alerts.filter((a) => a.strike >= filterValue);
        // }
        if (f === "exp") {
          alerts = alerts.filter((a) => a.exp === filterValue);
        }

        if (f === "totalVolume") {
          alerts = alerts.filter((a) => {
            let filteredArray = false;
            a.alerts.forEach((a) => {
              if (this.state[`lessThan_totalVolume`]) {
                if (a.totalVolume <= filterValue) filteredArray = true;
              } else {
                if (a.totalVolume >= filterValue) filteredArray = true;
              }
            });
            if (filteredArray) return true;
          });
        }
        if (f === "underlying") {
          alerts = alerts.filter((a) => {
            let filteredArray = false;
            a.alerts.forEach((a) => {
              if (this.state[`lessThan_underlying`]) {
                if (a.underlyingPrice <= filterValue) filteredArray = true;
              } else {
                if (a.underlyingPrice >= filterValue) filteredArray = true;
              }
            });
            if (filteredArray) return true;
          });
        }
        if (f === "last") {
          alerts = alerts.filter((a) => {
            let filteredArray = false;
            a.alerts.forEach((a) => {
              if (this.state[`lessThan_last`]) {
                if (a.last <= filterValue) filteredArray = true;
              } else {
                if (a.last >= filterValue) filteredArray = true;
              }
            });
            if (filteredArray) return true;
          });
        }
      }
    });
    return alerts;
  }

  resetFilters() {
    this.state.filterNames.forEach((fn) => {
      this.setState({
        [`filter_${fn}`]: "",
      });
    });
  }
  getAlerts(symbol, exp, strike) {
    let alerts = this.props.options.alerts;
    alerts = alerts.filter((a) => {
      if (a.symbol === symbol && a.exp === exp && a.strike === strike) {
        return a;
      }
    });
    console.log(alerts);
    this.setState({
      selectedSymbol: symbol,
      selectedExp: exp,
      selectedStrike: strike,
      selectedAlerts: alerts[0].alerts,
    });
  }

  makeTable(alerts) {
    let header = (
      <div className="col-sm-12 flex_center">
        <div className="full-width">
          <div className="row flex_center">
            <div className="col flex_center">{"putCall"}</div>
            <div className="col flex_center">{"symbol"}</div>
            <div className="col flex_center">{"exp"}</div>
            <div className="col flex_center">{"strike"}</div>
          </div>
        </div>
      </div>
    );
    //for each alert, get one row
    //
    let rows = alerts.map((a) => {
      let {
        selectedExp,
        selectedStrike,
        selectedSymbol,
        selectedAlerts,
      } = this.state;
      let selectedContract =
        selectedExp === a.exp &&
        selectedStrike === a.strike &&
        selectedSymbol === a.symbol;
      return (
        <div className="col-sm-12 flex_center">
          <div className="full-width">
            <div
              onClick={() => this.getAlerts(a.symbol, a.exp, a.strike)}
              className={`hoverable clickable row flex_center ${
                selectedContract ? "selectedContract" : " "
              } `}
            >
              <div className="col flex_center">{a.putCall}</div>
              <div className="col flex_center">{a.symbol}</div>
              <div className="col flex_center">{a.exp}</div>
              <div className="col flex_center">{a.strike}</div>
              {selectedContract && (
                <div className="col-12">
                  {selectedAlerts &&
                    selectedAlerts.map((a, iA) => {
                      return (
                        <>
                          {/* <div className="full-width"> */}
                          <div className="row flex_center opAlertData">
                            {/* <div className="col flex_center">
                                putCall: {a.putCall}
                              </div> */}
                            <div className="col flex_center">
                              <div className="row flex_center">
                                <div className="col-sm-12 flex_center">
                                  <h5> IV:</h5>
                                </div>
                                <div className="col-sm-12 flex_center">
                                  {a.IV}
                                </div>
                              </div>
                            </div>
                            <div className="col flex_center">
                              <div className="row flex_center">
                                <div className="col-sm-12 flex_center">
                                  <h5> last:</h5>
                                </div>
                                <div className="col-sm-12 flex_center">
                                  ${a.last}
                                </div>
                              </div>
                            </div>
                            <div className="col flex_center">
                              <div className="row flex_center">
                                <div className="col-sm-12 flex_center">
                                  <h5> underlyingPrice:</h5>
                                </div>
                                <div className="col-sm-12 flex_center">
                                  ${a.underlyingPrice}
                                </div>
                              </div>
                            </div>
                            <div className="col flex_center">
                              <div className="row flex_center">
                                <div className="col-sm-12 flex_center">
                                  <h5> totalVolume:</h5>
                                </div>
                                <div className="col-sm-12 flex_center">
                                  {a.totalVolume}
                                </div>
                              </div>
                            </div>
                            <div className="col flex_center">
                              <div className="row flex_center">
                                <div className="col-sm-12 flex_center">
                                  <h5> dateTime:</h5>
                                </div>
                                <div className="col-sm-12 flex_center">
                                  {new Date(a.dateTime).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>
                          {/* </div> */}
                        </>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    });

    return [header, ...rows];
  }

  render() {
    let { options } = this.props;
    let allAlerts = options.alerts;
    //filter out selected values
    let allSymbols = [];
    let expDates = [];
    let strikePrices = [];
    let alertMessages = [];
    let lastPrices = [];
    let allIVs = [];
    let allTotalVols = [];
    let allUnderlying = [];
    let putsOrCalls = { puts: [], calls: [] };
    let filteredAlerts = this.filterAlerts(allAlerts);
    filteredAlerts.forEach((alert) => {
      allSymbols.push(alert.symbol);

      expDates.push(alert.exp);
      strikePrices.push(alert.strike);

      alert.alerts.forEach((alert) => {
        alertMessages.push(alert.alert);
        lastPrices.push(alert.last);
        allIVs.push(alert.IV);
        allTotalVols.push(alert.totalVolume);
        allUnderlying.push(alert.underlyingPrice);
      });
    });

    allSymbols = Array.from(new Set(allSymbols)).sort((a, b) => a - b);
    expDates = Array.from(new Set(expDates)).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );
    strikePrices = Array.from(new Set(strikePrices)).sort((a, b) => a - b);
    lastPrices = Array.from(new Set(lastPrices)).sort((a, b) => a - b);
    allIVs = Array.from(new Set(allIVs)).sort((a, b) => a - b);
    allTotalVols = Array.from(new Set(allTotalVols)).sort((a, b) => a - b);
    allUnderlying = Array.from(new Set(allUnderlying)).sort((a, b) => a - b);
    return (
      <div className="row flex_center white">
        <div className="col-sm-12 flex_center">
          <h2>Option Alerts</h2>
        </div>
        <div className="col-sm-6 flex_center"></div>
        <div className="col-sm-6 flex_center">
          <button onClick={this.resetFilters}>RESET</button>
        </div>

        {/* Symbol Select */}
        <div className="col-sm-12 flex_center">
          <div className="row flex_center">
            <div className="col-sm-12 flex_center">
              <h4>Filter symbols {allSymbols.length}</h4>
            </div>
            <div className="col-sm-12 flex_center">
              {this.dropDownSelect("symbol", allSymbols)}
            </div>
          </div>
        </div>
        {/* EXP Date Select */}
        <div className="col-sm-12 flex_center">
          <div className="row flex_center">
            <div className="col-sm-12 flex_center">
              <h4>Filter Expirations {expDates.length}</h4>
            </div>
            <div className="col-sm-12 flex_center">
              {this.dropDownSelect("exp", expDates)}
            </div>
          </div>
        </div>

        {/* total Vol Select */}
        <div className="col-sm-12 flex_center">
          <div className="row flex_center">
            <div className="col-sm-12 flex_center">
              <h4>Total Volume {allTotalVols.length}</h4>
            </div>
            <div className="col-sm-12 flex_center">
              {this.dropDownSelect("totalVolume", allTotalVols)}
            </div>
          </div>
        </div>
        {/* Last Select */}
        <div className="col-sm-12 flex_center">
          <div className="row flex_center">
            <div className="col-sm-12 flex_center">
              <h4>Last Prices {lastPrices.length}</h4>
            </div>
            <div className="col-sm-12 flex_center">
              {this.dropDownSelect("last", lastPrices)}
            </div>
          </div>
        </div>
        {/* Last Select */}
        <div className="col-sm-12 flex_center">
          <div className="row flex_center">
            <div className="col-sm-12 flex_center">
              <h4>Underlying Prices {allUnderlying.length}</h4>
            </div>
            <div className="col-sm-12 flex_center">
              {this.dropDownSelect("underlying", allUnderlying)}
            </div>
          </div>
        </div>
        <div className="col-sm-12 flex_center">
          <h5>Total Contract: {filteredAlerts.length}</h5>
        </div>
        <LineBreak />
        <div className="col-sm-12 flex_center">{this.showFilters()}</div>
        <LineBreak />
        {this.makeTable(filteredAlerts)}
      </div>
    );
  }
}
function mapStateToProps(state) {
  const { options } = state;
  return { options };
}
export default connect(mapStateToProps)(withRouter(OpAlerts));

const LineBreak = styled.div`
  padding: 30px;
  border-top: 1px solid black;
  width: 100%;
`;
