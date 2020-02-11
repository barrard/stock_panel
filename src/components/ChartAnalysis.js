import React, { useState,  } from "react";
import { useParams } from 'react-router-dom'

import AskSizeAndPrice from "./QuoteComponents/AskSizeAndPrice.js";
import BidSizeAndPrice from "./QuoteComponents/BidSizeAndPrice.js";

import QuoteSymbol from "./QuoteComponents/QuoteSymbol.js";
import QuotePrice from "./QuoteComponents/QuotePrice.js";
import LastVolume from "./QuoteComponents/LastVol.js";
import AvgVol from "./QuoteComponents/AvgVol.js";
import TotalVolume from "./QuoteComponents/TotalVolume.js";

import HorizontalHistogram from "../components/charts/HorizontalHistogram.js";
import TickChart from "../components/charts/TickChart.js";

import styled from "styled-components";

import diff from "./extrema.js";

function ChartAnalysis({ data, match }) {
    let {sym} = useParams()


return (
    <div>
        Chart analysis {sym}
    </div>
)
}


export default ChartAnalysis