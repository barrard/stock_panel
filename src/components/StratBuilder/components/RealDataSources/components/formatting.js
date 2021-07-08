import React from "react"
import { toFixedIfNeed } from "../../utilFuncs"
import { StyledDataTail, SmallLabel } from "./styled"
import { IsSelectable } from "../../styled"

const styles = {
  alignCenter: { display: "flex", alignItems: "center" },
}

let tailLen = -10
export const ShowDataTail = ({ data, type }) => {
  if (!data) return <></>
  let isTime = type === "timestamp"
  // console.log(data, type)
  return (
    <div style={styles.alignCenter}>
      <SmallLabel>{type} : </SmallLabel>
      {data.slice(tailLen).map((d, i) => (
        <StyledDataTail key={i} title={d[type]}>{`${toFixedIfNeed(
          d[type],
          isTime
        )}, `}</StyledDataTail>
      ))}
      ....
    </div>
  )
}
export const ShowArrayTail = ({ data, type, color }) => {
  return (
    <div>
      <SmallLabel color={color}>{type} : </SmallLabel>
      {data.slice(tailLen).map((d, i) => (
        <StyledDataTail key={i} title={d[type]}>{`${toFixedIfNeed(
          d
        )}, `}</StyledDataTail>
      ))}
      ....
    </div>
  )
}
