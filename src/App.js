import React, { useState } from "react";
import { Route, BrowserRouter as Router } from "react-router-dom";
import styled from "styled-components";

import "./App.css";
import Socket from "./components/Socket.js";
import QuoteContainer from "./components/QuoteContainer.js";
import ChartAnalysis from "./components/ChartAnalysis.js";
import LandingPage from "./components/landingPage.js";
import SignupPage from "./components/SignupPage.js";
import LoginPage from "./components/LoginPage.js";
import StockChart from "./components/StockChartPage.js";
import CommodityChartPage from "./components/CommodityChartPage.js"
import defaultFilterList from "./components/QuoteComponents/DefaultFilterList.js";
import Main_Nav from "./components/Main_Nav.js";
let allData = { ES: [], CL: [], GC: [] };
let i = 0;
let prices_timer;
let es_data = { "/ES": {} };

localStorage.setItem("filterList", defaultFilterList);

function App() {
  const routing = (
    <Router>
      <Main_Nav />

      <div>
        <Route exact path="/" component={LandingPage} />
        <Route
          exact
          path="/commodities"
          // component={QuoteContainer}
          render={props => <QuoteContainer {...props} Socket={Socket} />}
        />
        <Route path="/chart/:symbol" component={StockChart} />
        <Route path="/sign-up" component={SignupPage} />
        <Route path="/login" component={LoginPage} />
        
        <Route path="/commodity/:symbol" component={CommodityChartPage} />
        
      </div>
    </Router>
  );

  return <AppContainer>{routing}</AppContainer>;
}

export default App;

const AppContainer = styled.div`
  position: relative;
  background:#333;
`;
