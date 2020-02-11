import React from "react";
import styled from "styled-components";


const TotalVolume = ({ TotalVol }) => {
  return (
    <div>
    Total Vol: <span>{TotalVol}</span>
  </div>
  );
};

export default TotalVolume;

const Symbol = styled.h3`
  display: inline;
  color: red;
`;
