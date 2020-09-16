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
      render: false,
      snaps: {},
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
    this.nodeClicked = this.nodeClicked.bind(this);
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
  shouldComponentUpdate(pp, ps) {
    let prevAlertsLen = pp.options.alerts.length;
    let alertsLen = this.props.options.alerts.length;

    if (
      (prevAlertsLen !== 0 && prevAlertsLen !== alertsLen) ||
      this.state.render
    ) {
      this.state.render = false;
      return true;
    } else {
      return false;
    }
    // console.log({pp, ps})
  }

  sortAlerts() {
    console.log("Sorting / Organizing alerts");
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
    return sortedAlerts;
  }

  treeSort(sortedAlerts) {
    console.log("building tree sort data");
    let today = new Date().toLocaleString().split(",")[0];
    let data = {
      name: today,
      children: [],
    };
    Object.keys(sortedAlerts)
      .sort((a, b) => (b < a ? 1 : -1))
      .map((symbol) => {
        let symbolData = {
          name: symbol,
          // attributes: { underlying: underlyingPrice },
          _collapsed: true,
          children: [], //expiration dates
        };
        data.children.push(symbolData);
        let attributes = {
          "exp Dates": Object.keys(sortedAlerts[symbol]).length,
        };
        symbolData.attributes = attributes;

        Object.keys(sortedAlerts[symbol])
          .sort((a, b) => (b < a ? 1 : -1))
          .map((exp) => {
            let expData = {
              name: exp,
              _collapsed: true,
              children: [], //PUTS CALLS
            };
            symbolData.children.push(expData);

            let attributes = {
              putCall: Object.keys(sortedAlerts[symbol][exp]).length,
            };
            expData.attributes = attributes;
            for (let putCall in sortedAlerts[symbol][exp]) {
              let putCallData = {
                name: putCall,
                _collapsed: true,
                children: [], //strikes
              };
              expData.children.push(putCallData);

              let attributes = {
                strikes: Object.keys(sortedAlerts[symbol][exp][putCall]).length,
              };
              putCallData.attributes = attributes;

              Object.keys(sortedAlerts[symbol][exp][putCall])
                .sort((a, b) => a - b)
                .map((strike) => {
                  let {
                    alerts,
                    last,
                    timestamp,
                    underlyingPrice,
                    bid,
                    ask,
                    bsPricing,
                    IV,
                  } = sortedAlerts[symbol][exp][putCall][strike];

                  //this just adds the underlying price to the symbol
                  let dataIndex = data.children.findIndex(
                    (d) => d.name === symbol
                  );
                  let attributes = data.children[dataIndex].attributes;
                  data.children[dataIndex].attributes = {
                    ...attributes,
                    $: underlyingPrice,
                  }; //adding undelying to symbol
                  debugger;
                  let strikeCallData = {
                    name: strike,
                    children: alerts.map((a) => {
                      let child = {};
                      child.attributes = {
                        alert: a.alert

                      };
                      child.name = a.dateTime;

                      // if (
                      //   this.state.snaps[symbol] &&
                      //   this.state.snaps[symbol][exp] &&
                      //   this.state.snaps[symbol][exp][putCall] &&
                      //   this.state.snaps[symbol][exp][putCall][strike]
                      // ) {
                      // debugger;
                      // console.log(
                      //   this.state.snaps[symbol][exp][putCall][strike]
                      // );
                      // let snaps = this.state.snaps[symbol][exp][putCall][
                      //   strike
                      // ];
                      // let iSnap = snaps.findIndex((d) => {
                      //   if (d.dateTime === a.dateTime) {
                      //     debugger;
                      //     console.log(d.dateTime === a.dateTime);
                      //   }
                      // });
                      // let {
                      //   IV,
                      //   ask,
                      //   bid,
                      //   bsPricing,
                      //   dateTime,
                      //   delta,
                      //   gamma,
                      //   last,
                      //   openInterest,
                      //   rho,
                      //   timestamp,
                      //   totalVolume,
                      //   underlyingPrice,
                      //   vega,
                      // } = snaps[iSnap];
                      // child.attributes={...snaps[iSnap]}
                      // _collapsed: true,
                      // attributes: {
                      //   Alerts: alerts.length,
                      //   Date: new Date(timestamp).toLocaleString(),
                      //   IV: IV.toFixed(5),
                      //   "last vs BS": (last - bsPricing).toFixed(5),
                      //   "Bid Ask": `${bid} ${ask}`,
                      // },
                      // }
                      return child;
                    }),
                  
                  };
                  putCallData.children.push(strikeCallData);
                });
            }
          });
      });

    return [data];
  }

  async nodeClicked(data, evt) {
    console.log(data.depth);
    switch (data.depth) {
      case 1: //symbol
        //get the snaps

        break;

      case 4:
        console.log(4);
        console.log(data);
        // let needSnaps = data._children.map(
        // )
        let strike = data.name;
        let putCall = data.parent.name;
        let exp = data.parent.parent.name;
        let symbol = data.parent.parent.parent.name;
        let snaps = this.state.snaps;
        if (!snaps[symbol]) snaps[symbol] = {};
        if (!snaps[symbol][exp]) snaps[symbol][exp] = {};
        if (!snaps[symbol][exp][putCall]) {
          snaps[symbol][exp][putCall] = {};

          debugger;
          // if(needSnaps){
          let valTracker = await API.fetchOpAlertData({
            symbol,
            exp,
            strike,
            putCall,
          }); //[0]//SHOULD BE ARRAY LENGTH 1
          console.log(valTracker);
          snaps[symbol][exp][putCall][strike] = valTracker[0].snaps;
        }

        // if (!snaps[symbol][exp][putCall][strike])
        //   snaps[symbol][exp][putCall][strike] = [];

        // debugger;
        this.setState({
          render: true,
          snaps: { ...snaps },
        });
        //apply the timestamped snapshots to the respective alert
        // data._children.gotSnaps=true
        // }
        break;

      case 5:
        console.log(5);

        break;

      default:
        break;
    }
    if (data.depth === 5) {
      //get

      console.log(data);
      // this.checkSnap({ symbol, strike, exp, putCall });
    }
  }

  render() {
    let { options } = this.props;
    // let { checkSnap } = this;
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
          <Tree
            onClick={this.nodeClicked}
            translate={this.state.translate}
            data={treeSort}
          />
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
