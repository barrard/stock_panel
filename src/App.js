import React, { useState } from "react";
import { Route, BrowserRouter as Router } from "react-router-dom";
import styled from "styled-components";
import { connect } from "react-redux";

import "./App.css";
import Socket from "./components/Socket.js";
import QuoteContainer from "./components/QuoteContainer.js";
import ChartAnalysis from "./components/ChartAnalysis.js";
import LandingPage from "./components/landingPage.js";
import SignupPage from "./components/SignupPage.js";
import LoginPage from "./components/LoginPage.js";
import StockChart from "./components/StockChartPage.js";
import CommodityChartPage from "./components/CommodityChartPage.js";
import defaultFilterList from "./components/QuoteComponents/DefaultFilterList.js";
import Main_Nav from "./components/Main_Nav.js";
import { updateCommodityData, addCommodityTrade, updateCommodityTrade } from "./redux/actions/stock_actions.js";
import TradeBot from './components/TradeBot/TradeBot.js'
let allData = { ES: [], CL: [], GC: [] };
let i = 0;
let prices_timer;
let es_data = { "/ES": {} };

localStorage.setItem("filterList", defaultFilterList);

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      newTickData:{}
    };
  }

  componentDidMount() {
    let {dispatch}=this.props
    // Socket.on("new_minutley_data", (newTickData)=>dispatch(updateCommodityData(newTickData, 'minute')));
    Socket.on("current_minute_data", (newTickData)=>dispatch(updateCommodityData(newTickData, 'tick')));
    Socket.on("enterTrade", newTrade=>{
      console.log('ENTERING A TRADE')
      return dispatch(addCommodityTrade(newTrade, newTrade.symbol))
    })
    Socket.on("updateTrade", updateTrade=>{
      console.log('updateTrade')
      return dispatch(updateCommodityTrade(updateTrade, updateTrade.symbol))
    })
  }

  render() {
    const routing = (
      <Router>
        <Main_Nav />
        <TradeBot newTickData={this.state.newTickData}/>

        <div>
          <Route exact path="/" component={LandingPage} />
          <Route path="/sign-up" component={SignupPage} />
          <Route path="/login" component={LoginPage} />
          <Route
            exact
            path="/commodities"
            // component={QuoteContainer}
            render={props => <QuoteContainer {...props} Socket={Socket} />}
          />
          <Route
            path="/chart/:symbol"
            render={props => <StockChart {...props} Socket={Socket} />}
          />

          <Route
            path="/commodity/:symbol"
            render={props => <CommodityChartPage {...props} Socket={Socket} />}
          />
        </div>
      </Router>
    );

    return <AppContainer>{routing}</AppContainer>;
  }
}

function mapStateToProps(state) {
  return state;
}

export default connect(mapStateToProps)(App);

const AppContainer = styled.div`
  position: relative;
  background: #333;
`;
