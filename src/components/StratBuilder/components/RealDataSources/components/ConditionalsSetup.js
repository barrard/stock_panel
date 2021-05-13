import React, { useState } from "react"
import RealDataContext from "../context"
import { Container } from "./styled"
import { Input, Select, LoadingButton } from "../../components"
import { TargetInputs } from "./"
import StratContext from "../../../StratContext"

export default function ConditionalsSetup() {
  let { equality, setEquality, targetsData, setTargetsData, selectTarget } =
    React.useContext(RealDataContext)
  let { selectedStrat, API } = React.useContext(StratContext)
  const [conditionalName, setConditionalName] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const submitConditional = () => {
    let { target1, target2 } = targetsData
    //validate the data
    let valid1 = validate(target1)
    let valid2 = validate(target2)
    if (valid1 && valid2) {
      //submit them!!
      API.submitConditional({
        equality: equality.value,
        target1: valid1,
        target2: valid2,
        conditionalName,
        stratId: selectedStrat._id,
      })
    }

    function validate(target) {
      let targetData = {}
      if (!conditionalName || !target.name) {
        console.log("No name")
        return false
      }
      let {
        name,
        indicator,
        indexOrRangeValue,
        inputType,
        indexOrRange,
        resultLine,
        symbol,
        timeframe,
        target1,
        type,
      } = target

      targetData.type = type
      targetData.name = name
      targetData.resultLine = resultLine
      targetData.symbol = symbol
      targetData.timeframe = timeframe
      targetData.indexOrRangeValue = indexOrRangeValue
      targetData.indexOrRange = indexOrRange
      targetData.target1 = target1
      targetData.stratId = selectedStrat._id

      if (type === "indicator") {
        if (!symbol || !timeframe) {
          console.log("Missing symbol or timeframe")
          return false
        }
        if (!indexOrRange) {
          console.log("Missing indexOrRange")
          return false
        }

        if (!indicator || !indicator._id) {
          console.log("Missing indicator")
          return false
        }
        targetData.indicatorId = indicator._id
      } else if (type === "OHLC") {
        if (!symbol || !timeframe) {
          console.log("Missing symbol or timeframe")
          return false
        }
        if (!indexOrRange) {
          console.log("Missing indexOrRange")
          return false
        }
      } else if (type === "value") {
        if (indexOrRangeValue === undefined) {
          console.log("Missing value")
          return false
        }
      }

      console.log({ targetData })
      return targetData
    }
  }

  const equalityOptions = [
    { label: ">", value: ">" },
    { label: "<", value: "<" },
    { label: "=", value: "=" },
    { label: "=>", value: "=>" },
    { label: "<=", value: "<=" },
  ]
  return (
    <Container>
      <div>
        <Input
          label={"Name"}
          value={conditionalName}
          onChange={setConditionalName}
        />
        <LoadingButton
          disabled={false}
          loading={submitting}
          submit={submitConditional}
          name={"Save"}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-around" }}>
        <TargetInputs
          value={{ ...targetsData.target1 }}
          setValue={(target1) => {
            selectTarget(target1, target1.type, target1.name)

            // let data = { ...targetsData, target1 }
            // console.log(data)
            // return setTargetsData({ ...data })
          }}
          label={"Target1"}
        />

        <div>
          <Select
            value={equality}
            setValue={setEquality}
            options={equalityOptions}
          />
        </div>
        <TargetInputs
          value={targetsData.target2}
          setValue={
            (target2) => selectTarget(target2, target2.type, target2.name)
            // setTargetsData({ ...targetsData, target2: { ...target2 } })
          }
          label={"Target2"}
        />
      </div>
    </Container>
  )
}
