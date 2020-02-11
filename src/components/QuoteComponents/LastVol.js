import React from "react";
import styled from "styled-components";


const LastVolume = ({ LastVol }) => {
  return (
    <div>
    {`Last Vol: `}
    <span>{String(LastVol)}</span>
  </div>
  );
};

export default LastVolume;

const Symbol = styled.h3`
  display: inline;
  color: red;
`;
