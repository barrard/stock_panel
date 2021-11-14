import React, { useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faChartLine,
  faSquareRootAlt,
  faPlusSquare,
} from "@fortawesome/free-solid-svg-icons"
import StratContext from "../../../StratContext"
import { StyledConditionalListHeader, ConditionalListContainer } from "./Styled"
import { LoadingButton } from "../../../components"
import { IconButton } from "../../components"

import ConditionalItem from "./ConditionalItem"

export default function ConditionalsList() {
  let {
    conditionals,
    chartConditionals,
    setChartConditionals,
    addChartConditionalsData,
    removeChartConditionalsData,
  } = React.useContext(StratContext)

  console.log({ conditionals })

  //sort conditionals in the types,
  //value, OHLC, indicator
  let valueConditionals = conditionals.filter((c) => c.type === "value")
  let indicatorConditionals = conditionals.filter((c) => c.type === "indicator")
  let ohlcConditionals = conditionals.filter((c) => c.type === "OHLC")
  let headerValues = ["Name", "Symbol", "Timeframe", "Value", "Result"]

  const addChartConditionals = (c) => {
    let { _id } = c
    setChartConditionals((chartConditionals) => {
      if (chartConditionals[_id]) {
        removeChartConditionalsData(c)
        delete chartConditionals[_id]
        return { ...chartConditionals }
      } else {
        //run data here?  save?
        addChartConditionalsData(c)
        return { ...chartConditionals, [_id]: c }
      }
    })
  }
  return (
    <>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <IconButton
          //   borderColor={applyToChart ? "red" : "grey"}
          //   onClick={() => setApplyToChart(!applyToChart)}
          icon={faChartLine}
          title="Apply to chart"
          color="green"
          bgColor="black"
        />
        <h2>Conditionals</h2>
      </div>
      <ConditionalListContainer>
        <div style={{ display: "flex" }}>
          {headerValues.map((h) => (
            <StyledConditionalListHeader key={h}>
              {h}
            </StyledConditionalListHeader>
          ))}
        </div>
        {conditionals.map((c) => (
          <div key={c._id} onClick={() => addChartConditionals(c)}>
            <ConditionalItem item={c} />
          </div>
        ))}
      </ConditionalListContainer>
    </>
  )
}
