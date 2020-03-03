import React, { useState } from "react";
import Chart from "./components/ChartAnalysis.js";
import { Route, BrowserRouter as Router } from "react-router-dom";

import "./App.css";
import Socket from "./components/Socket.js";
import { csv } from "d3-fetch";
import QuoteContainer from "./components/QuoteContainer.js";
import LandingPage from "./components/landingPage.js";
import styled from "styled-components";
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
        <Route path="/chart/:sym" component={Chart} />
      </div>
    </Router>
  );

  return <AppContainer>{routing}</AppContainer>;
}

export default App;

const AppContainer = styled.div`
  position: relative;
`;
