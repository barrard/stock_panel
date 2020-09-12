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
      snap: {},
      selectedSymbol: null,
      selectedStrike: null,
      selectedExp: null,
      selectedPutCall: null,
      myTreeData: [
        {
          name: "Top Level",
          attributes: {
            keyA: "val A",
            keyB: "val B",
            keyC: "val C",
          },
          children: [
            {
              name: " 2: A",
              attributes: {
                keyA: "val A",
                keyB: "val B",
                keyC: "val C",
              },
            },
            {
              name: " 2: B",
            },
            {
              name: " 2: B",
            },
            {
              name: " 2: B",
            },
            {
              name: " 2: B",
            },
          ],
        },
      ],
    };
    this.checkSnap = this.checkSnap.bind(this);
  }

  componentDidMount() {
    const dimensions = this.treeContainer.getBoundingClientRect();
    this.setState({
      translate: {
        x: dimensions.width / 10,
        y: dimensions.height / 2,
      },
    });
    this.props.dispatch(getOpAlerts());
  }
  componentDidUpdate() {}

  sortAlerts() {
    let { alerts } = this.props.options;
    if (!alerts.length) return {};
    let sortedAlerts = {};
    alerts.forEach((alert) => {
      let { dateTime, exp, putCall, strike, symbol, timestamp } = alert;
      // debugger
      if (!sortedAlerts[symbol]) {
        sortedAlerts[symbol] = {};
      }
      if (!sortedAlerts[symbol][exp]) {
        sortedAlerts[symbol][exp] = {};
      }
      if (!sortedAlerts[symbol][exp][putCall]) {
        sortedAlerts[symbol][exp][putCall] = {};
      }
      if (!sortedAlerts[symbol][exp][putCall][strike]) {
        sortedAlerts[symbol][exp][putCall][strike] = [];
      }
      sortedAlerts[symbol][exp][putCall][strike] = alert;
    });
    // console.log(sortedAlerts);
    debugger;
    return sortedAlerts;
  }

  treeSort(sortedAlerts) {
    let today = new Date().toLocaleString().split(",")[0];
    let data = {
      name: today,
      children: [],
    };
    Object.keys(sortedAlerts).sort((a,b)=>b<a?1:-1).map( symbol => {
      let symbolData = {
        name: symbol,
        _collapsed: true,
        children: [],//expiration dates
      };
      data.children.push(symbolData);
      let attributes= {
        'exp Dates': Object.keys(sortedAlerts[symbol]).length
      }
      symbolData.attributes=attributes

      Object.keys(sortedAlerts[symbol]).sort((a, b)=>b<a?1:-1).map(exp=> {
        let expData = {
          name: exp,
          _collapsed: true,
          children: [],//PUTS CALLS
        };
        symbolData.children.push(expData);
    
        let attributes= {
          'putCall': Object.keys(sortedAlerts[symbol][exp]).length
        }
        expData.attributes=attributes
        for (let putCall in sortedAlerts[symbol][exp]) {
          let putCallData = {
            name: putCall,
            _collapsed: true,
            children: [],//strikes
          };
          expData.children.push(putCallData);

          let attributes= {
            'strikes': Object.keys(sortedAlerts[symbol][exp][putCall]).length
          }
          putCallData.attributes=attributes

          Object.keys(sortedAlerts[symbol][exp][putCall]).sort((a,b)=>a-b).map(strike => {
            let { alerts } = sortedAlerts[symbol][exp][putCall][strike];
            let strikeCallData = {
              name: strike,
              children:alerts.map(a=>{return{name:a.dateTime}}),
              _collapsed: true,
              attributes: {
                Alerts: alerts.length,
              },
            };
            putCallData.children.push(strikeCallData);
          })
        }
      })
    })

    return [data];
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
    let treeSort = this.treeSort(sortedAlerts);
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

        <div
          id="treeWrapper"
          style={{ width: "100vw", height: "100vh" }}
          ref={(tc) => (this.treeContainer = tc)}
        >
          <Tree translate={this.state.translate} data={treeSort} />
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
