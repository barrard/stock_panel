import React, { useState } from "react";
import { GiChart } from "react-icons/gi";
import { Link } from "react-router-dom";

import AskSizeAndPrice from "./QuoteComponents/AskSizeAndPrice.js";
import BidSizeAndPrice from "./QuoteComponents/BidSizeAndPrice.js";

import QuoteSymbol from "./QuoteComponents/QuoteSymbol.js";
import QuotePrice from "./QuoteComponents/QuotePrice.js";
import LastVolume from "./QuoteComponents/LastVol.js";
import AvgVol from "./QuoteComponents/AvgVol.js";
import TotalVolume from "./QuoteComponents/TotalVolume.js";

import HorizontalHistogram from "../components/charts/HorizontalHistogram.js";
import TickChart from "../components/charts/TickChart.js";
import CandleStickChart from "../components/charts/CandleStickChart.js";

import styled from "styled-components";
import diff from "./extrema.js";

const LAST_PRICE = {}; //just to determine uptick downTick
const PRICE_VOL_LIST = {}; //for time and sales
const LAST_VOL = {}; //Just for this one last vol compared to the next
const volumePriceProfile = {};
let allMinMaxValues = {
  maxValues: [],
  minValues: []
};

function QuoteContainer({ data }) {
  if (!data) return <></>;
  let filterList = localStorage.getItem("filterList");
  filterList = JSON.parse(filterList);

  let AllQuotes = Object.keys(data).map(symbol => {
    if (filterList.indexOf(symbol) >= 0) return <div key={symbol}></div>;
    if (!LAST_VOL[symbol]) {
      PRICE_VOL_LIST[symbol] = [];
      volumePriceProfile[symbol] = {};
      LAST_VOL[symbol] = data[symbol].totalVolume;
      LAST_PRICE[symbol] = data[symbol].lastPriceInDouble;
    }

    const Price = data[symbol].lastPriceInDouble;
    const BidSize = data[symbol].bidSizeInLong;
    const AskSize = data[symbol].askSizeInLong;
    const BidPrice = data[symbol].bidPriceInDouble;
    const AskPrice = data[symbol].askPriceInDouble;
    const LastVol = data[symbol].totalVolume - LAST_VOL[symbol];
    const TotalVol = data[symbol].totalVolume;
    const quote_time = data[symbol].quoteTimeInLong;
    const tickSize = data[symbol].tick ? data[symbol].tick : 0.25;

    let currentPrice = data[symbol].lastPriceInDouble;
    let last = LAST_PRICE[symbol];
    let redGreenClass = "";

    if (currentPrice < last) {
      //went down
      redGreenClass = "downTick";
    } else if (currentPrice > last) {
      //went up
      redGreenClass = "upTick";
    }
    const LastVols = PRICE_VOL_LIST[symbol].slice(-15);
    PRICE_VOL_LIST[symbol].push({ LastVol, Price, quote_time });
    LAST_VOL[symbol] = data[symbol].totalVolume;
    LAST_PRICE[symbol] = currentPrice;

    if (LastVol && LastVol != NaN && !volumePriceProfile[symbol][Price]) {
      volumePriceProfile[symbol][Price] = LastVol;
    } else if (LastVol) {
      volumePriceProfile[symbol][Price] += LastVol;
    }

    /*
    Find local min and max
    returns {minValues: [{x:int, y:int}], maxValues: [{x:int, y:int}]}
    */
    const tolerance = 20; //   Slice of the last few for running streaming data
    const toleratedRecentData = PRICE_VOL_LIST[symbol].slice(-tolerance * 2);
    let latestLocalMinMax = diff.minMax(
      toleratedRecentData.map(d => d.quote_time),
      toleratedRecentData.map(d => d.Price),
      tolerance
    );
    let { minValues, maxValues } = latestLocalMinMax;
    allMinMaxValues.maxValues = [...allMinMaxValues.maxValues, ...maxValues];
    allMinMaxValues.minValues = [...allMinMaxValues.minValues, ...minValues];

    // console.log({ allMinMaxValues });
    // console.log({ latestLocalMinMax, toleratedRecentData });

    return (
      <Container className={`quoteBox ${redGreenClass}`} key={symbol}>
        <HideButton onClick={() => hide(symbol)}>HIDE</HideButton>
        <QuoteSymbol symbol={symbol} />
        <IconButton>
          <Link to={`/chart/${symbol}`}>
            <GiChart />
          </Link>
        </IconButton>
        <AskSizeAndPrice AskSize={AskSize} AskPrice={AskPrice} />
        <QuotePrice price={Price} />
        <BidSizeAndPrice BidSize={BidSize} BidPrice={BidPrice} />
        <br />
        <LastVolume LastVol={LastVol} />
        <AvgVol LastVols={LastVols} />

        <HorizontalHistogram
          tickSize={tickSize}
          volPriceData={volumePriceProfile[symbol]}
          timePriceData={PRICE_VOL_LIST[symbol]}
          width={300}
          height={150}
        />
        <TickChart
          tickSize={tickSize}
          localMinMax={allMinMaxValues}
          data={PRICE_VOL_LIST[symbol]}
          width={300}
          height={150}
        />
        <CandleStickChart
          tickSize={tickSize}
          width={1000}
          height={450}
        />
        <TotalVolume TotalVol={TotalVol} />
      </Container>
    );
  });

  return <QuotesContainer>{AllQuotes}</QuotesContainer>;
}

export default QuoteContainer;

const QuotesContainer = styled.div`
  margin-top: 5em;
`;

const IconButton = styled.button`
  cursor: pointer;
`;

const Container = styled.div`
  position: relative;
`;

const HideButton = styled.button`
  position: absolute;
  top: 1em;
  right: 1em;
`;

function hide(symbol) {
  try {
    let list = localStorage.getItem("filterList");
    if (!list) localStorage.setItem("filterList", JSON.stringify([]));

    list = localStorage.getItem("filterList");
    list = JSON.parse(list);
    let index = list.indexOf(symbol);
    if (index < 0) list.push(symbol);
    localStorage.setItem("filterList", JSON.stringify(list));
  } catch (err) {
    console.log(err);
  }
}
