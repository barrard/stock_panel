import React from "react"
import { ShowArrayTail } from "./formatting"
import { Small, BoldLabel } from "./styled"
import { IsSelectable } from "../../styled"
import RealDataContext from "../context"

export default ({ indicators }) => {
  let { selectingTargetInput, selectTarget, selectSeries } = React.useContext(
    RealDataContext
  )
  return (
    <>
      {Object.keys(indicators).map((key) => {
        let {
          indicator,
          result: {
            result: { result },
          },
        } = indicators[key]
        let { fullName, color } = indicator

        let details =
          indicator.optInputs &&
          Object.values(indicator.optInputs).map((o) => (
            <Small title={o.hint}>
              {`${o.displayName} - ${o.defaultValue}`}
            </Small>
          ))

        let source = Object.values(indicator.selectedInputs).map((input) => (
          <Small>{input}</Small>
        ))

        let tail = Object.keys(result).map((lineName) => {
          return (
            <ShowArrayTail
              data={result[lineName]}
              type={lineName}
              color={color[lineName]}
            />
          )
        })
        return (
          <IsSelectable
            isSelecting={selectSeries}
            onClick={() => selectTarget(indicators[key], "indicator")}
          >
            <BoldLabel>{fullName}</BoldLabel>
            {details}
            {source}
            {tail}
          </IsSelectable>
        )
      })}
    </>
  )
}
