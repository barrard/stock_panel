import React, { useState } from "react";
import { connect } from "react-redux";
import { toastr } from "react-redux-toastr";
import { withRouter } from "react-router";
import styled from "styled-components";
import { getOpAlerts } from "../redux/actions/opActions.js";
import API from "./API.js";
import Tree from "react-d3-tree";
import OptionsChart from "./charts/OptionsChart.js";
import Switch from "react-switch";

// import {ensure_not_loggedin} from '../components/utils/auth.js'
import { histogram } from "d3-array";

const CHART_WIDTH_REDUCER = 0.9;
class OpAlerts extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedContractRef: null,
      filter_symbol: "",
      filter_exp: "",
      filter_underlying: "",
      filter_last: "",
      filter_totalVolume: "",
      filter_strike: "",
      filter_dateTime: "",
      filter_maxPL: "",
      filter_maxPercentPL: "",
      filter_PL: "",
      filter_percentPL: "",
      selectedAlerts: [],
      snapshots: {}, //AML_EXP_CALL_44
      includeExpiredContracts: false,
      lessThan_last: true,
      lessThan_totalVolume: true,
      lessThan_underlying: true,
      lessThan_maxPercentPL: true,
      lessThan_maxPL: true,
      lessThan_exp: true,
      sortBy: "symbol",
      sortOrder: true,
      filterNames: [
        "symbol",
        "exp",
        "totalVolume",
        "last",
        "underlying",
        "dateTime",
        "PL",
        "percentPL",
        "maxPL",
        "maxPercentPL",
      ],
    };
    this.resetFilters = this.resetFilters.bind(this);
  }

  componentDidMount() {
    this.props.dispatch(getOpAlerts());
    this.setChartWidth();
    window.addEventListener("resize", this.setChartWidth.bind(this));
  }
  componentWillUnmount() {
    window.removeEventListener("resize", this.setChartWidth);
  }
  setChartWidth() {
    this.setState({
      chartWidth: window.innerWidth * CHART_WIDTH_REDUCER,
    });
  }

  dropDownSelect(name, values, label) {
    let selects = values.map((v, iV) => {
      return (
        <option key={iV} value={v}>
          {v}
        </option>
      );
    });
    let firstOption = (
      <option
        key={`Select ${label}`}
        // selected={true}
        // disabled={true}
        value={``}
      >{`Select ${label}`}</option>
    );
    selects = [firstOption, ...selects];
    return (
      <div className="optionFilterSelect">
        {/* <div className='row flex_center'> */}

        {/* <div className='col-sm-6 flex_center'> */}
        {(name === "last" ||
          name === "maxPL" ||
          name === "maxPercentPL" ||
          name === "exp" ||
          name === "underlying" ||
          name === "totalVolume") && (
          <>
            <Switch
              className="filterSwitch"
              onChange={() => {
                let lessThan = this.state[`lessThan_${name}`];
                this.setState({ [`lessThan_${name}`]: !lessThan });
              }}
              checked={this.state[`lessThan_${name}`]}
              offColor="#333"
              onColor="#333"
              width={111}
              height={30}
              checkedIcon={
                <span
                  style={{
                    textShadow: "rgb(1,1,1) 0px 0px 1px",
                    width: "6em",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100%",
                    fontWeight: 900,
                    fontSize: 12,
                    color: "red",
                    paddingLeft: "1em",
                  }}
                >
                  Less Than
                </span>
              }
              uncheckedIcon={
                <div
                  style={{
                    textShadow: "rgb(1,1,1) 0px 0px 1px",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100%",
                    fontWeight: 900,
                    fontSize: 12,
                    color: "green",
                    whiteSpace: "nowrap",
                    paddingRight: "3em",
                  }}
                >
                  Greater Than
                </div>
              }
            />
          </>
        )}
        {/* </div> */}
        {/* <div className='col-sm-6 flex_center'> */}
        <select
          className="darkDropDown"
          value={this.state[`filter_${name}`]}
          defaultValue={`Select ${name}`}
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
      // </div>

      // </div>
    );
  }
  //display to the user which filters are used
  showFilters() {
    return (
      <div className="full-width filterHover dynamicText">
        <div className="row flex_center">
          {this.state.filterNames.map((f) => {
            return (
              <>
                {this.state[`filter_${f}`] && (
                  <div key={f} className="col flex_center">
                    <div className="row flex_center">
                      <div className="col-sm-12 flex_center sm-title">{f}</div>
                      <div className="col-sm-12 flex_center">
                        {/* LESS THAN LABEL */}
                        {this.state[`lessThan_${f}`] && (
                          <div>
                            <span className="red">Less</span> Than{" "}
                            {this.state[`filter_${f}`]}
                          </div>
                        )}
                        {/* GREATER THAN LABEL */}
                        {typeof this.state[`lessThan_${f}`] !== undefined &&
                          this.state[`lessThan_${f}`] === false && (
                            <div>
                              <span className="green">Greater</span> Than{" "}
                              {this.state[`filter_${f}`]}
                            </div>
                          )}
                        {/* EQUAL TO LABEL */}
                        {this.state[`filter_${f}`] !== "" && (
                          <div>
                            {/* <span className="yellow">Equal</span> Than{" "} */}
                            {this.state[`filter_${f}`]}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
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
        // console.log(`got ${filterValue} for filter_${f}`);
        if (f === "symbol") {
          alerts = alerts.filter((a) => a.symbol === filterValue);
        }

        if (f === "exp") {
          filterValue = new Date(filterValue).getTime();
          alerts = alerts.filter((a) => {
            let filteredArray = false;
            let alertExp = new Date(a.exp).getTime();
            // a.alerts.forEach((a) => {
            if (this.state[`lessThan_exp`]) {
              if (alertExp <= filterValue) filteredArray = true;
            } else {
              if (alertExp >= filterValue) filteredArray = true;
            }
            // });
            if (filteredArray) return true;
          });
        }

        if (f === "dateTime") {
          filterValue = new Date(filterValue).toLocaleString().split(",")[0];
          alerts = alerts.filter((a) => {
            let filteredArray = false;
            // a.alerts.forEach((a) => {
            let dateTime = new Date(a.dateTime).toLocaleString().split(",")[0];
            if (dateTime == filterValue) filteredArray = true;
            // });
            if (filteredArray) return true;
          });
        }

        if (f === "totalVolume") {
          alerts = alerts.filter((a) => {
            let filteredArray = false;
            // a.alerts.forEach((a) => {
            if (this.state[`lessThan_totalVolume`]) {
              if (a.totalVolume <= filterValue) filteredArray = true;
            } else {
              if (a.totalVolume >= filterValue) filteredArray = true;
            }
            // });
            if (filteredArray) return true;
          });
        }
        if (f === "underlying") {
          alerts = alerts.filter((a) => {
            let filteredArray = false;
            // a.alerts.forEach((a) => {
            if (this.state[`lessThan_underlying`]) {
              if (a.underlyingPrice <= filterValue) filteredArray = true;
            } else {
              if (a.underlyingPrice >= filterValue) filteredArray = true;
            }
            // });
            if (filteredArray) return true;
          });
        }
        if (f === "last") {
          alerts = alerts.filter((a) => {
            let filteredArray = false;
            // a.alerts.forEach((a) => {
            if (this.state[`lessThan_last`]) {
              if (a.last <= filterValue) filteredArray = true;
            } else {
              if (a.last >= filterValue) filteredArray = true;
            }
            // });
            if (filteredArray) return true;
          });
        }
        if (f === "PL") {
          alerts = alerts.filter((a) => {
            let filteredArray = false;
            // a.alerts.forEach((a) => {
            if (this.state[`lessThan_PL`]) {
              if (a.PL <= filterValue) filteredArray = true;
            } else {
              if (a.PL >= filterValue) filteredArray = true;
            }
            // });
            if (filteredArray) return true;
          });
        }
        if (f === "percentPL") {
          alerts = alerts.filter((a) => {
            let filteredArray = false;
            // a.alerts.forEach((a) => {
            if (this.state[`lessThan_percentPL`]) {
              if (a.percentPL <= filterValue) filteredArray = true;
            } else {
              if (a.percentPL >= filterValue) filteredArray = true;
            }
            // });
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
  async getAlert(symbol, exp, strike, putCall, timestamp) {
    let alertDay = new Date(timestamp).toLocaleString().split(",")[0];
    let {
      selectedSymbol,
      selectedExp,
      selectedStrike,
      selectedPutCall,
      selectedAlertDay,
    } = this.state;
    if (
      selectedSymbol === symbol &&
      selectedExp === exp &&
      selectedStrike === strike &&
      selectedPutCall === putCall &&
      selectedAlertDay === alertDay
    ) {
      return this.setState({
        snapData: [],
        selectedSymbol: "",
        selectedExp: "",
        selectedStrike: "",
        selectedPutCall: "",
        selectedAlertDay: "",
        selectedAlerts: [],
      });
    }

    //HELPER FUNCTION SHOULD GO SOMEWHERE ELSE
    //TODO
    function fallbackCopyTextToClipboard(text) {
      var textArea = document.createElement("textarea");
      textArea.value = text;

      // Avoid scrolling to bottom
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";

      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        var successful = document.execCommand("copy");
        var msg = successful ? "successful" : "unsuccessful";
        console.log("Fallback: Copying text command was " + msg);
      } catch (err) {
        console.error("Fallback: Oops, unable to copy", err);
      }

      document.body.removeChild(textArea);
    }
    //HELPER FUNCTION SHOULD GO SOMEWHERE ELSE
    //TODO
    function copyTextToClipboard(text) {
      if (!navigator.clipboard) {
        fallbackCopyTextToClipboard(text);
        return;
      }
      navigator.clipboard.writeText(text).then(
        function () {
          console.log("Async: Copying to clipboard was successful!");
        },
        function (err) {
          console.error("Async: Could not copy text: ", err);
        }
      );
    }
    let opString = `${symbol} ${exp} ${
      putCall === "CALL" ? "c" : "p"
    } @$${strike}`;

    copyTextToClipboard(opString);

    let alerts = this.props.options.alerts;
    let snapData = await API.fetchOpAlertData({ symbol, strike, exp, putCall });
    let allSnaps = [];

    //the database has a conflict, this code may be able to be changed TODO
    snapData.forEach((a) => {
      if (a.snaps) {
        a.snaps.forEach((snap) => allSnaps.push(snap));
      } else if (a.opDataSnaps) {
        //should be snaps, not this
        a.opDataSnaps.forEach((snap) => allSnaps.push(snap));
      }
    });
    allSnaps = allSnaps.sort((a, b) => a.timestamp - b.timestamp);
    alerts = alerts.filter((a) => {
      if (
        a.symbol === symbol &&
        a.exp === exp &&
        a.strike === strike &&
        a.putCall === putCall
      ) {
        return a;
      }
    });
    console.log(allSnaps);
    this.scrollToId("selectedContractChart");
    this.setState({
      snapData: allSnaps,
      selectedSymbol: symbol,
      selectedExp: exp,
      selectedStrike: strike,
      selectedPutCall: putCall,
      selectedAlertDay: alertDay,
      selectedAlerts: alerts,
    });
  }

  FilterSelect(label, name, array) {
    return (
      <div className="col-sm-4 flex_center">
        <div className="row ">
          <div className="col-sm-12 flex_center">
            <h4>{label} </h4>
          </div>
          <div className="col-sm-12 flex_center">
            {this.dropDownSelect(name, array, label)}
          </div>
        </div>
      </div>
    );
  }

  sortBy(key) {
    let { sortOrder } = this.state;
    this.setState({ sortBy: key, sortOrder: !sortOrder });
  }
  scrollToId = (id) => {
    setTimeout(() => {
      const yOffset = -40;
      const element = document.getElementById(id);
      const y =
        element.getBoundingClientRect().top + window.pageYOffset + yOffset;

      window.scrollTo({ top: y, behavior: "smooth" });
    }, 0);
  };

  makeTable(alerts) {
    let header = (
      <div className="col-sm-12 flex_center">
        <div className="full-width">
          <div className="row flex_center">
            <div className="col flex_center sm-title p-0">#</div>
            <div
              onClick={() => this.sortBy("putCall")}
              className="col flex_center sm-title p-0"
            >
              putCall
            </div>
            <div
              onClick={() => this.sortBy("symbol")}
              className="col flex_center sm-title p-0"
            >
              symbol
            </div>
            <div
              onClick={() => this.sortBy("exp")}
              className="col flex_center sm-title p-0"
            >
              exp
            </div>
            <div
              onClick={() => this.sortBy("strike")}
              className="col flex_center sm-title p-0"
            >
              strike
            </div>
            <div
              onClick={() => this.sortBy("underlyingPrice")}
              className="col flex_center sm-title p-0"
            >
              Underlying
            </div>
            <div
              onClick={() => this.sortBy("maxPL")}
              className="col flex_center sm-title p-0"
            >
              max PL
            </div>
            <div
              onClick={() => this.sortBy("maxPercentPL")}
              className="col flex_center sm-title p-0"
            >
              Max %PL
            </div>
          </div>
        </div>
      </div>
    );
    //for each alert, get one row
    //
    let rows = alerts.map((a, iA) => {
      let { underlyingPrice, maxPL, maxPercentPL } = a;
      let {
        selectedExp,
        selectedStrike,
        selectedSymbol,
        selectedPutCall,
        chartWidth,
        selectedAlerts,
        selectedAlertDay,
      } = this.state;
      let alertDate = new Date(a.timestamp).toLocaleString().split(",")[0];
      let selectedContract =
        selectedExp === a.exp &&
        selectedStrike === a.strike &&
        selectedSymbol === a.symbol &&
        selectedAlertDay === alertDate &&
        selectedPutCall === a.putCall;
      return (
        <div className="col-sm-12 flex_center">
          <div className="full-width">
            <div
              onClick={() =>
                this.getAlert(a.symbol, a.exp, a.strike, a.putCall, a.timestamp)
              }
              className={`hoverable clickable row flex_center ${
                selectedContract ? "selectedContract" : " "
              } `}
            >
              <div className={`col flex_center p-0`}>{iA + 1}</div>
              <div className={`col flex_center p-0`}>{a.putCall}</div>
              <div className={`col flex_center p-0`}>{a.symbol}</div>
              <div className={`col flex_center`}>{a.exp}</div>
              <div className={`col flex_center p-0`}>{a.strike}</div>
              <div className={`col flex_center p-0`}>{underlyingPrice}</div>
              <div className={`col flex_center p-0`}>{maxPL}</div>
              <div className={`col flex_center p-0`}>{maxPercentPL}</div>
              {selectedContract && (
                <div id="selectedContractChart" className="floating ">
                  {
                    <OptionsChart
                      width={chartWidth}
                      alertDay={selectedAlertDay}
                      alerts={selectedAlerts}
                      symbol={selectedSymbol}
                      exp={selectedExp}
                      strike={selectedStrike}
                      putCall={selectedPutCall}
                      data={this.state.snapData}
                    />
                  }
                  {selectedAlerts &&
                    selectedAlerts.map((a, iA) => {
                      return (
                        <>
                          {/* <div className="full-width"> */}
                          <div className="row flex_center opAlertData dynamicText">
                            {/* <div className="col flex_center">
                                putCall: {a.putCall}
                              </div> */}
                            <AlertDetails
                              title="Alert Date"
                              col={12}
                              value={new Date(a.timestamp).toLocaleString()}
                            />
                            <AlertDetails title="Strike" col={12} value={a.strike} />
                            <AlertDetails title="Exp" col={12} value={a.exp} />
                            <AlertDetails title="Alert Price" col={12} value={a.last} />
                            <AlertDetails title="Max Profit" col={12} value={a.maxPL} />
                            <AlertDetails title="Max Profit %" col={12} value={a.maxPercentPL} />
              
                   
                         
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
    let { sortBy, sortOrder, includeExpiredContracts } = this.state;
    let allAlerts = options.alerts;
    //filter out selected values
    let allSymbols = [];
    let expDates = [];
    let strikePrices = [];
    let alertMessages = [];
    let lastPrices = [];
    let allIVs = [];
    let allDateTimes = [];
    let allTotalVols = [];
    let allUnderlying = [];
    let allPL = [];
    let allMaxPL = [];
    let allPercentPL = [];
    let allMaxPercentPL = [];
    let putsOrCalls = { puts: [], calls: [] };
    if (!includeExpiredContracts && allAlerts.length) {
      let day = new Date(new Date().toLocaleString().split(",")[0]).getTime();
      allAlerts = allAlerts.filter((a) => new Date(a.exp).getTime() > day);
    }

    allAlerts.forEach((alert) => {
      // allAlerts[alertDay].map(()=>{

      allSymbols.push(alert.symbol);

      expDates.push(alert.exp);
      strikePrices.push(alert.strike);
      let { last, currentLast, highPrice } = alert;
      // let PL = parseFloat((currentLast - last).toFixed(2));
      // let percentPL = parseFloat(((PL / last) * 100).toFixed(2));
      let maxPL = parseFloat((highPrice - last).toFixed(2));
      let maxPercentPL = parseFloat(((maxPL / last) * 100).toFixed(2));
      alert.maxPercentPL = maxPercentPL;
      alert.maxPL = maxPL;
      // allPL.push(PL);
      allMaxPL.push(maxPL);
      allMaxPercentPL.push(maxPercentPL);
      // allPercentPL.push(percentPL);
      alertMessages.push(alert.alert);
      lastPrices.push(alert.last);
      allIVs.push(alert.IV);
      allDateTimes.push(alert.dateTime.split(",")[0]);
      allTotalVols.push(alert.totalVolume);
      allUnderlying.push(alert.underlyingPrice);
      // });
    });
    let filteredAlerts = this.filterAlerts(allAlerts);
    filteredAlerts = filteredAlerts.sort((a, b) => {
      if (
        sortBy === "underlyingPrice" ||
        sortBy === "maxPL" ||
        sortBy === "maxPercentPL"
      ) {
        if (parseFloat(a[sortBy]) < parseFloat(b[sortBy]))
          return sortOrder ? 1 : -1;
        if (parseFloat(a[sortBy]) > parseFloat(b[sortBy]))
          return sortOrder ? -1 : 1;
        return 0;
      } else {
        if (a[sortBy] < b[sortBy]) return sortOrder ? -1 : 1;
        if (a[sortBy] > b[sortBy]) return sortOrder ? 1 : -1;
        return 0;
      }
    });

    let totalMaxPL = filteredAlerts
      .reduce((a, b) => {
        let maxPL = parseFloat(b.maxPL);
        let sum = a + maxPL;
        return sum;
      }, 0)
      .toFixed(1);
    let totalMaxPercPL = filteredAlerts.reduce((a, b) => {
      let maxPercentPL = parseFloat(b.maxPercentPL);
      let sum = parseInt((a + maxPercentPL).toFixed(2));

      return sum;
    }, 0);

    allSymbols = Array.from(new Set(allSymbols)).sort((a, b) => {
      if (a > b) return 1;
      if (a < b) return -1;
      return 0;
    });
    expDates = Array.from(new Set(expDates)).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );
    allDateTimes = Array.from(new Set(allDateTimes)).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );
    strikePrices = Array.from(new Set(strikePrices)).sort((a, b) => a - b);
    lastPrices = Array.from(new Set(lastPrices)).sort((a, b) => a - b);
    allIVs = Array.from(new Set(allIVs)).sort((a, b) => a - b);
    allTotalVols = Array.from(new Set(allTotalVols)).sort((a, b) => a - b);
    allUnderlying = Array.from(new Set(allUnderlying)).sort((a, b) => a - b);
    // allPL = Array.from(new Set(allPL)).sort((a, b) => b - a);
    // allPercentPL = Array.from(new Set(allPercentPL)).sort((a, b) => b - a);

    allMaxPL = Array.from(new Set(allMaxPL)).sort((a, b) => b - a);
    allMaxPercentPL = Array.from(new Set(allMaxPercentPL)).sort(
      (a, b) => b - a
    );

    // allPL = allPL.filter((p, iP) => iP % Math.floor(allPL.length / 10) === 0);
    // allPercentPL = allPercentPL.filter(
    //   (p, iP) => iP % Math.floor(allPercentPL.length / 10) === 0
    // );

    allMaxPL = allMaxPL.filter(
      (p, iP) => iP % Math.floor(allMaxPL.length / 10) === 0
    );
    allMaxPercentPL = allMaxPercentPL.filter(
      (p, iP) => iP % Math.floor(allMaxPercentPL.length / 10) === 0
    );
    lastPrices = lastPrices.filter(
      (p, iP) => iP % Math.floor(lastPrices.length / 10) === 0
    );
    allUnderlying = allUnderlying.filter(
      (p, iP) => iP % Math.floor(allUnderlying.length / 10) === 0
    );
    allTotalVols = allTotalVols.filter(
      (p, iP) => iP % Math.floor(allTotalVols.length / 10) === 0
    );

    return (
      <div className="row flex_center white">
        <div className="col-sm-12 flex_center">
          <h2>Option Alerts</h2>
        </div>
        {/* <div className="col-sm-6 flex_center"></div> */}
        <div className="col-sm-4 flex_center">
          <label className="p-2">Include Expired Contracts</label>
          <Switch
            onChange={() => {
              let incExp = this.state.includeExpiredContracts;
              this.setState({ includeExpiredContracts: !incExp });
            }}
            checked={this.state[`includeExpiredContracts`]}
          />{" "}
        </div>
        <div className="col-sm-4 flex_center"></div>

        <div className="col-sm-4 flex_center">
          <button onClick={this.resetFilters}>RESET</button>
        </div>
        <div className="container">
          <div className="row flex_center">
            {/* EXP Date Select */}
            {this.FilterSelect("Filter Expirations", "exp", expDates)}

            {/* Date Select */}
            {this.FilterSelect("Alert Date", "dateTime", allDateTimes)}

            {/* Symbol Select */}
            {this.FilterSelect("Filter symbols", "symbol", allSymbols)}

            {/* total Vol Select */}
            {this.FilterSelect("Total Volume", "totalVolume", allTotalVols)}

            {/* Last Select */}
            {this.FilterSelect("Last Prices", "last", lastPrices)}

            {/* Last Select */}
            {this.FilterSelect(
              "Underlying Prices",
              "underlying",
              allUnderlying
            )}

            {/* Profit Select */}
            {/* {this.FilterSelect("Filter P&L", "PL", allPL)} */}

            {/* Profit Select */}
            {/* {this.FilterSelect("Filter %P&L", "percentPL", allPercentPL)} */}

            {/* Max Profit Select */}
            {this.FilterSelect("Filter Max P&L", "maxPL", allMaxPL)}

            {/* Max Profit Select */}
            {this.FilterSelect(
              "Filter Max %P&L",
              "maxPercentPL",
              allMaxPercentPL
            )}
          </div>
        </div>
        <LineBreak />
        <div className="col-sm-12 flex_center">{this.showFilters()}</div>
        <LineBreak />
        <div className="col-sm-4 flex_center">
          <div className="row flex_center">
            <div className="col-sm-12 flex_center">
              <div className="sm-title">Total Contracts</div>
            </div>
            <div className="col-sm-12 flex_center">
              <p>{filteredAlerts.length}</p>
            </div>
          </div>
        </div>
        <div className="col-sm-4 flex_center">
          <div className="row flex_center">
            <div className="col-sm-12 flex_center">
              <div className="sm-title">Total P&L</div>
            </div>
            <div className="col-sm-12 flex_center">
              <p>${totalMaxPL}</p>
            </div>
          </div>
        </div>
        <div className="col-sm-4 flex_center">
          <div className="row flex_center">
            <div className="col-sm-12 flex_center">
              <div className="sm-title">Total %P&L</div>
            </div>
            <div className="col-sm-12 flex_center">
              <p>%{totalMaxPercPL}</p>
            </div>
          </div>
        </div>
        <LineBreak />
        <div className="container dynamicText">
          {this.makeTable(filteredAlerts)}
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

const LineBreak = styled.div`
  padding: 30px;
  border-top: 1px solid black;
  width: 100%;
`;

const AlertDetails = ({ col, title, value }) => {
  return (
    <div className="col flex_center">
      <div className="row flex_center">
        <div className={`col-sm-${col} flex_center`}>
          <h5> {title}:</h5>
        </div>
        <div className={`col-sm-${col} flex_center`}>{value}</div>
      </div>
    </div>
  );
};
