import React, { useState, useEffect } from "react"
import { SubTitle, Clickable } from "../../styled"
import RealDataContext from "../context"
import { Input, Select } from "../../components"
import { StyledInputLabel } from "../../styled"
import { Small } from "./styled"
export default function TargetInputs({ value, setValue, label }) {
  let {
    selectingTargetInput,
    setSelectingTargetInput,
    selectTarget,
    resultLineOpts,
    setTargetsData,
    targetsData,
  } = React.useContext(RealDataContext)

  console.log({ value })
  const [target, setTarget] = useState(0)
  const [indexOrRangeValue, setIndexOrRangeValue] = useState(0)
  const [indexOrRange, setIndexOrRange] = useState("index")
  const [resultLine, setResultLine] = useState(value.resultLine)
  const [targetType, setTargetType] = useState(
    "series"
    // label: "series",
  ) //series, or value

  useEffect(() => {
    console.log("useEffect")

    if (targetType === "value") {
      delete value.indicator
      delete value.result
      delete value.resultLine
      delete value.type
    }
    setValue({
      ...value,
      inputType: targetType,
      indexOrRangeValue,
      indexOrRange,
      resultLine,
    })
  }, [indexOrRangeValue, indexOrRange, targetType, resultLine])

  // if (
  //   resultLineOpts.length &&
  //   !resultLineOpts.find((lineOpt) => lineOpt == value.resultLine)
  // ) {
  //   console.log(resultLineOpts.find((lineOpt) => lineOpt == value.resultLine))
  //   value.resultLine = resultLineOpts[0]
  //   // setTimeout(() => setResultLine(resultLineOpts[0]), 100)
  // }

  let isActive = label.toLowerCase() === selectingTargetInput
  let isIndex = value.indexOrRange === "index"
  let isSeries = value.inputType === "series"
  let isValue = value.inputType === "value"

  let dataValue = () => {
    let dataStr = ""
    if (!isIndex && isSeries) {
      dataStr += `${value.data.slice(-value.indexOrRangeValue)[0]} ... `
      dataStr += `${value.data.slice(-1)[0]}`
    } else {
      debugger
      dataStr += `${
        value.data.slice(
          -(value.indexOrRangeValue === "0" ? 1 : value.indexOrRangeValue)
        )[0]
      }`
    }

    return dataStr
  }
  return (
    <div
      style={{
        border: isActive ? "1px solid blue" : "",
      }}
    >
      <Clickable
        onClick={() =>
          setSelectingTargetInput(
            !selectingTargetInput ? label.toLowerCase() : false
          )
        }
      >
        <SubTitle>{label}</SubTitle>
        <SubTitle>{value.name}</SubTitle>
        <SubTitle>{value.resultLine}</SubTitle>
        <SubTitle>{`${
          isValue
            ? ""
            : isIndex
            ? `Index - ${value.indexOrRangeValue}`
            : `Range: ${value.indexOrRangeValue} ... 0`
        }`}</SubTitle>
        <SubTitle>
          {isValue ? "" : value.data?.length ? dataValue() : "NO DATA"}
        </SubTitle>

        {!isActive && "Click to set"}
      </Clickable>
      {/* {label === "Target2" && isActive && ( */}
      {isActive && (
        <>
          <StyledInputLabel>Input Type</StyledInputLabel>
          <Small>{value.inputType}</Small>

          <Select
            options={[
              { value: "series", label: "series" },
              { value: "value", label: "value" },
            ]}
            setValue={({ value }) => setTargetType(value)}
            value={{ value: value.inputType, label: value.inputType }}
          />

          {isSeries && (
            <>
              <div>
                {resultLineOpts.map((line) => {
                  return (
                    <React.Fragment key={line}>
                      <StyledInputLabel>{line}</StyledInputLabel>
                      <input
                        key={line}
                        value={line}
                        checked={value.resultLine === line}
                        onChange={() => setResultLine(line)}
                        type="radio"
                      />
                    </React.Fragment>
                  )
                })}
              </div>
              <StyledInputLabel>
                {isIndex ? "Set To Range" : "Set To Index"}
              </StyledInputLabel>
              <input
                checked={!isIndex}
                onChange={() => {
                  debugger
                  setIndexOrRange(isIndex ? "range" : "index")
                }}
                type="checkbox"
                name={isIndex ? "Set To Range" : "Set To Index"}
                id=""
              />
            </>
          )}
          <Input
            min={value.inputType === "series" ? "0" : "-999999999"}
            type={"number"}
            onChange={setIndexOrRangeValue}
            label={
              isValue
                ? "value"
                : isIndex
                ? "Index"
                : "Range 0-" + value.indexOrRangeValue
            }
            value={value.indexOrRangeValue}
            disabled={false}
          />
          {/* {value.inputType === "value" && ( */}
          <button
            onClick={() => {
              setTargetsData({ ...targetsData, [selectingTargetInput]: value })
              setSelectingTargetInput(false)
            }}
          >
            Set
          </button>
          {/* )} */}
        </>
      )}
    </div>
  )
}
