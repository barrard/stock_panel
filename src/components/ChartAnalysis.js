import React, { useRef, useEffect, useCallback } from "react";
import styled from 'styled-components'
import CandleStickChart from "./charts/CandleStickChart.js";


function ChartAnalysis({ data, width, height }) {


  return (
      <Div>
          
          {/* <CandleStickChart
      width={1000}
      height={450}
      timeframe={'intraday'}
      />

<CandleStickChart
      width={1000}
      height={450}
      timeframe={'daily'}
      /> */}

<CandleStickChart
      width={1000}
      height={450}
      timeframe={'weekly'}
      />
      </Div>
  )
}

export default ChartAnalysis


const Div = styled.div`
    margin-top:20px;
`