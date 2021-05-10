import React from "react"
import styled from "styled-components"

export const StyledDataTail = styled.span`
  width: 70px;
  display: inline-block;
  text-align: center;
  font-size: 12px;
`

export const SmallLabel = styled.span`
  width: 70px;
  display: inline-block;
  text-align: center;
  font-size: 12px;
  font-weight: bold;
  color: ${({ color }) => (color ? color : "white")};
`
export const Small = styled.span`
  padding: 0 0.3em;
  display: inline-block;
  text-align: center;
  font-size: 12px;
  color: ${({ color }) => (color ? color : "white")};
`

export const BoldLabel = styled.span`
  text-decoration: underline;
  font-size: 16px;
  font-weight: bold;
`
export const Container = styled.div`
  border: 3px solid #222;
  padding: 1em;
  border-radius: 5px;
  background: #444;
  display: inline-block;
  width: 100%;
`
