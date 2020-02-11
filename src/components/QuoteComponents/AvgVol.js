import React from "react";
import styled from "styled-components";
import {avg} from '../helpers.js'

const QuoteSymbol = ({ LastVols }) => {
  const max = 15
  let vols = LastVols.map((volPrice, i) => {
    return volPrice.LastVol
  })
  // console.log({vols})
  return (
    <div>
      {`AVG Vol: `}
      <span>
        {`5 - `}
        {avg(vols.slice(-5))}
      </span>
      {` | `}
      <span>
        {`10 - `}
        {avg(vols.slice(-10))}
      </span>
      {` | `}
      <span>
        {`15 - `}
        {avg(vols.slice(-15))}
      </span>
      {` | `}
    </div>
  );
};

export default QuoteSymbol;

const Symbol = styled.h3`
  display: inline;
  color: red;
`;
