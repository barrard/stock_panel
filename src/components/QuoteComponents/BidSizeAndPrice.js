import React from "react";
import styled from "styled-components";

const BidSizeAndPrice = ({ BidPrice, BidSize }) => {
  return (
    <>
      <div>
        <InlineP>Bid size: </InlineP>
        <span>{BidSize}</span>
        <InlineP> | </InlineP>
        <InlineP>Bid Price: </InlineP>
        <span>{BidPrice}</span>
      </div>
    </>
  );
};

export default BidSizeAndPrice

const InlineP = styled.p`
display: inline;
`