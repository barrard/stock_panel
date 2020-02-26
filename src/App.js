import React, { useState } from "react";
import Chart from './components/ChartAnalysis.js';
import { Route, BrowserRouter as Router } from 'react-router-dom'

import "./App.css";
import Socket from './components/Socket.js'
import { csv } from "d3-fetch";
import QuoteContainer from "./components/QuoteContainer.js";
import FilterButton from "./components/FilterButton.js";
import styled from "styled-components";
import defaultFilterList from './components/QuoteComponents/DefaultFilterList.js'

let allData = { ES: [], CL: [], GC: [] };
let i = 0;
let prices_timer;
let es_data = { "/ES": {} };


localStorage.setItem("filterList",   defaultFilterList  );

function App() {
  const [commodities_quotes, setCommodities_quotes] = useState({});
  const [playPause, setPlayPause] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);

let quoteTimeInLong = 0
  
  if(playPause){
    Socket.on("commodities_quotes", commodities_quotes => {
      // console.log('commodities_quotes')
      if(!commodities_quotes) return console.log('NO DATA?!?!?!')
      for (let sym in commodities_quotes){
        commodities_quotes[sym.slice(1)] = commodities_quotes[sym]
        delete commodities_quotes[sym]
      }
      let bad = quoteTimeInLong === commodities_quotes['ES'].quoteTimeInLong
        // console.log(commodities_quotes['CL'])
      // if(bad) console.log('BAAAAD')
      quoteTimeInLong = commodities_quotes['ES'].quoteTimeInLong

      setCommodities_quotes(commodities_quotes)
    })
  }else{
    Socket.off("commodities_quotes")
      console.log('commodities_quotes paused')

  }


    // if (!timerStarted) {
  //   csv("./ES.csv", data => {
  //     allData["ES"].push(data);
  //   });
  //   setTimerStarted(true);
  //   setTimeout(() => {
  //     console.log("STARTING READ DATA TIMER");
  //     readDataAloud(allData, 0);
  //   }, 1000);
  // }

  // function readDataAloud(data, index) {
  //   console.log({ index });
  //   console.log(data);
  //   let d = data["ES"][index];
  //   if (prices_timer) return;
  //   // let GC = data['GC'][index]
  //   // let CL = data['CL'][index]
  //   let prices = JSON.parse(d.prices);
  //   let ask_sizes = JSON.parse(d.ask_sizes);
  //   let bid_sizes = JSON.parse(d.bid_sizes);
  //   let ask_prices = JSON.parse(d.ask_prices);

  //   let bid_prices = JSON.parse(d.bid_prices);
  //   let quote_times = JSON.parse(d.quote_times);

  //   let vols = JSON.parse(d.vols);

  //   prices_timer = setInterval(() => {
  //     if (i >= prices.length) {
  //       i = 0;
  //       console.log("Clear interval");
  //       clearInterval(prices_timer);
  //       prices_timer = false;
  //       readDataAloud(data, index + 1);
  //       return;
  //     }

  //     es_data = { "/ES": {} };

  //     es_data["/ES"].lastPriceInDouble = prices[i];
  //     es_data["/ES"].bidSizeInLong = bid_sizes[i];
  //     es_data["/ES"].askSizeInLong = ask_sizes[i];
  //     es_data["/ES"].bidPriceInDouble = bid_prices[i];
  //     es_data["/ES"].askPriceInDouble = ask_prices[i];
  //     es_data["/ES"].totalVolume = vols[i];
  //     es_data["/ES"].quoteTimeInLong = quote_times[i];
  //     setCommodities_quotes(es_data);

  //     i++;
  //   }, 10000);
  // }
  const routing = (
    <Router>
      <div>
        <Route exact path="/" render={(props)=><QuoteContainer {...props} data={commodities_quotes} />} />
        <Route path="/chart/:sym" component={Chart} />
      </div>
    </Router>
  )


  return (
    <AppContainer>
      <FilterButton setShow={setShowFilter} show={showFilter} />
      <PlayPauseBtn onClick={() => setPlayPause(!playPause)}>
        {playPause && "Pause"}
        {!playPause && "Play"}
      </PlayPauseBtn>
{routing}

      


    </AppContainer>
  );
}

export default App;

const AppContainer = styled.div`
  position: relative;
`;

const PlayPauseBtn = styled.button`
  z-index: 100;
  position: fixed;
  top: 10px;
  left: 10px;
`;
