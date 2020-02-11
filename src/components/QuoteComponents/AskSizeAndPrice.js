import React from "react";
import styled from "styled-components";


const AskSizeAndPrice = ({ AskPrice, AskSize }) => {
  return (
    <>
      <div>
        <InlineP>Ask size: </InlineP>
        <span>{AskSize}</span>
        <InlineP> | </InlineP>

        <InlineP>Ask Price: </InlineP>
        <span>{AskPrice}</span>
      </div>
    </>
  );
};

export default AskSizeAndPrice

const InlineP = styled.p`
display: inline;
`