import React from 'react'
import styled from 'styled-components'


const QuotePrice = ({ price }) => {
  return (
    <>
      <Price>{price} </Price>
    </>
  );
};

export default QuotePrice


const Price = styled.span`
    
`