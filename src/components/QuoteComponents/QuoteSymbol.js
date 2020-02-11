import React from 'react'
import styled from 'styled-components'


const QuoteSymbol = ({ symbol }) => {
  return (
    <>
      <Symbol>{symbol} </Symbol>
    </>
  );
};

export default QuoteSymbol


const Symbol = styled.h3`
    display:inline;
    color:red
`