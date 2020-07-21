import React from "react";
import styled from 'styled-components'
import CandleStickChart from "./charts/CandleStickChart.js";


function ChartAnalysis({ data, width, height }) {


  return (
      <Div>
          <h2>Chart Analysis</h2>
        
        <CandleStickChart
      width={950}
      height={650}
      timeframe={'intraday'}
      /> 

 {/* <CandleStickChart
      width={800}
      height={450}
      timeframe={'daily'}
      /> */}

{/* <CandleStickChart
      width={800}
      height={450}
      timeframe={'weekly'}
      />  */}
      </Div>
  )
}

export default ChartAnalysis


const Div = styled.div`
    margin-top:20px;
`