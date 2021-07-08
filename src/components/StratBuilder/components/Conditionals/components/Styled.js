import styled from "styled-components"
import React from "react"
export const StyledTargetResult = styled.div`
  display: flex;
  font-size: 30px;
  /* flex-direction: column; */
  width: 20%;
  line-height: 50px;
  justify-content: center;
  align-items: center;
  margin: 0 auto;
  border: 1px solid white;
  background: ${({ color }) => (color ? color : "")};
`
export const StyledTargetItem = styled.div`
  border: 1px solid green;
  display: flex;
  justify-content: center;
  font-size: 12px;
  padding: 1em 3em;
  width: 25%;
`

export const StyledConditionalListHeader = styled.div`
  border: 1px solid yellow;

  display: flex;
  justify-content: center;
  font-size: 12px;
  padding: 1em 3em;
  width: 20%;
`
export const ConditionalListContainer = styled.div`
  border: 1px solid blue;
`
