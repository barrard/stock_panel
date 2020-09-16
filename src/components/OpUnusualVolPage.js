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
      snapshots: {},
    };
  }

  componentDidMount() {
    this.props.dispatch(getOpAlerts());
  }

  dropDownSelect(name, values) {
    let selects = values.map((v) => {
      return <option value={v}>{v}</option>;
    });

    return (
      <select name={name} id="">
        {selects}
      </select>
    );
  }

  render() {
    let { options } = this.props;
    console.log(options);
    let sortedAlerts = this.props.options.alerts;
    let allSymbols = [];
    let expDates = [];
    let strikePrices = [];
    let alertMessages = [];
    let lastPrices = [];
    let allIVs = [];
    let allTotalVols = [];
    let putsOrCalls = { puts: [], calls: [] };
 
    Object.keys(sortedAlerts).forEach((symbol) => {
      allSymbols.push(symbol);
      Object.keys(sortedAlerts[symbol]).forEach((expDate) => {
        expDates.push(expDate);
        let { CALL, PUT } = sortedAlerts[symbol][expDate];
        if (CALL) {
          Object.keys(CALL).forEach((strike) => {
            strikePrices.push(strike);
            let alerts = CALL[strike].alerts;
            let last = CALL[strike].last;
            alerts.forEach((alert) => {
              alertMessages.push(alert.alert);
              lastPrices.push(alert.last);
              allIVs.push(alert.IV);
              allTotalVols.push(alert.totalVolume);            });
          });
        }
        if (PUT) {
          Object.keys(PUT).forEach((strike) => {
            strikePrices.push(strike);
            let alerts = PUT[strike].alerts;
            alerts.forEach((alert) => {
              alertMessages.push(alert.alert);
              lastPrices.push(alert.last);
              allIVs.push(alert.IV);
              allTotalVols.push(alert.totalVolume);
            });
          });
        }
      });
    });
    allSymbols = Array.from(new Set(allSymbols)).sort((a, b) => a - b);
    expDates = Array.from(new Set(expDates)).sort((a, b) => a - b);
    strikePrices = Array.from(new Set(strikePrices)).sort((a, b) => a - b);
    lastPrices =Array.from(new Set(lastPrices)).sort((a, b) => a - b);
    allIVs =Array.from(new Set(allIVs)).sort((a, b) => a - b);
    allTotalVols =Array.from(new Set(allTotalVols)).sort((a, b) => a - b);
    return (
      <div className="row flex_center white">
        <div className="col-sm-12 flex_center">
          <h2>Option Alerts</h2>
        </div>

        <div className="col-sm-12 flex_center">
          {/* Symbol Select */}
          <label htmlFor="symbol select">
            Filter symbols {allSymbols.length}
          </label>
          {this.dropDownSelect("symbol", allSymbols)}
        </div>
        <div className="col-sm-12 flex_center">
          {/* Symbol Select */}
          <label htmlFor="expiration select">
            Filter Expirations {expDates.length}
          </label>
          {this.dropDownSelect("expDate", expDates)}
        </div>
        <div className="col-sm-12 flex_center">
          {/* Symbol Select */}
          <label htmlFor="symbol strike">
            Filter Strike {strikePrices.length}
          </label>
          {this.dropDownSelect("strike", strikePrices)}
        </div>
        <div className="col-sm-12 flex_center">
          {/* Symbol Select */}
          <label htmlFor="symbol strike">Last Prices {lastPrices.length}</label>
          {this.dropDownSelect("last", lastPrices)}
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
