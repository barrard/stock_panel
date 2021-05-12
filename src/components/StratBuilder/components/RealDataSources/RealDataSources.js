import React, { useState } from "react"
import styled from "styled-components"
import {
  faEye,
  faPlusSquare,
  faTrashAlt,
  faPencilAlt,
  faEyeSlash,
  faBell,
  faWindowClose,
  faTimes,
} from "@fortawesome/free-solid-svg-icons"

import RealDataContext from "./context"
import { MainTitle, SubTitle, IsSelectable, Scrollable } from "../styled"

import StratContext from "../../StratContext"
import { ShowDataTail, ListIndicators, ConditionalsSetup } from "./components"
import { IconButton } from "../components"
export default function RealDataSources() {
  let {
    selectedStrat,
    charts,
    indicatorResults,
    priceDatas,
  } = React.useContext(StratContext)

  const [isNewAlert, setIsNewAlert] = useState(false)
  const [selectingTargetInput, setSelectingTargetInput] = useState(false)
  const [target1, setTarget1] = useState({})
  const [target2, setTarget2] = useState({})
  const [equality, setEquality] = useState({ label: "=", value: "=" })
  const [resultLineOpts, setResultLineOpts] = useState([])
  const [targetsData, setTargetsData] = useState({
    target1: {
      symbol: "",
      timeframe: "",
      name: "",
      data: [],
      indexOrRange: "index",
      indexOrRangeValue: 0,
      inputType: "series",
      target1: true,
      resultLine: "",
      type: "",
    },
    target2: {
      symbol: "",
      timeframe: "",
      name: "",
      data: [],
      indexOrRange: "index",
      indexOrRangeValue: 0,
      inputType: "series",
      target1: false,
      resultLine: "",
      type: "",
    },
  })

  function selectTarget(target, type, name) {
    console.log(selectingTargetInput)
    if (selectingTargetInput) {
      console.log(target, type, selectingTargetInput)
      console.log(targetsData)

      let targetData = targetsData[selectingTargetInput]

      targetData = { ...targetData, ...target }

      if (targetData.inputType === "value") {
        targetData.resultLine = ""
        targetData.name = "Value " + targetData.indexOrRangeValue
        // delete targetData.indicator
        // delete targetData.data
        // delete targetData.result
        //SELECTING OHLCV DATA SERIES
      } else if (type === "OHLC") {
        // targetData.type = "OHLC"
        targetData.name = name
        targetData.ohlc = target.ohlc
        targetData.data = target.ohlc.map((d) => d[name])
        targetData.type = type
        targetData.symbol = target.ohlc[0].symbol
        targetData.timeframe = target.ohlc[0].timeframe
        targetData.resultLine = ""
        targetData.inputType = "series"

        setResultLineOpts([])
        //SELECTING INDICATOR DATA
      } else if (type === "indicator") {
        let { indicator, result } = target

        targetData.indicator = indicator
        targetData.result = result
        targetData.resultLine = target.resultLine
        result = result.result.result

        let { name, symbol, timeframe } = setName(indicator, targetData)
        targetData.name = name
        targetData.type = type

        targetData.symbol = symbol
        targetData.timeframe = timeframe
        targetData.inputType = "series"
        if (target.inputType === "series" && targetData.inputOrRangeValue < 0) {
          targetData.inputOrRangeValue = 0
        }

        let resultLines = []
        Object.keys(result).forEach((line) => resultLines.push(line))

        if (
          resultLines.length &&
          !resultLines.find((lineOpt) => lineOpt == targetData.resultLine)
        ) {
          console.log(
            resultLines.find((lineOpt) => lineOpt == targetData.resultLine)
          )

          targetData.resultLine = resultLines[0]
        }
        targetData.data = result[targetData.resultLine]

        setResultLineOpts([...resultLines])
      }
      setTargetsData({ ...targetsData, [selectingTargetInput]: targetData })
    }

    function setName(indicator, targetData) {
      let { fullName, optInputs, priceData } = indicator

      let { timeframe, symbol } = priceDatas.find(
        ({ _id }) => _id === priceData
      )

      let name = ""
      // if (priceData) {
      //   name += `${timeframe} ${symbol}`
      // }
      name += `${fullName} - \n`

      if (optInputs) {
        Object.keys(optInputs).forEach(
          (optInput) =>
            (name += ` ${optInput} ${optInputs[optInput].defaultValue}\n`)
        )
      }
      // name += `${targetData.resultLine}`
      return { name, timeframe, symbol }
    }
  }

  var selectSeries =
    selectingTargetInput &&
    targetsData[selectingTargetInput].inputType !== "value"

  console.log({ targetsData })
  return (
    <RealDataContext.Provider
      value={{
        selectingTargetInput,
        setSelectingTargetInput,
        selectTarget,
        targetsData,
        setTargetsData,
        target1,
        setTarget1,
        target2,
        setTarget2,
        equality,
        setEquality,
        selectSeries,
        resultLineOpts,
      }}
    >
      <MainTitle>RealDataSources</MainTitle>
      <IconButton
        onClick={() => {
          setIsNewAlert(!isNewAlert)
        }}
        icon={faBell}
        title={"Add Alert"}
        color={"goldenrod"}
        bgColor={isNewAlert ? "#222" : null}
        borderColor={`lawngreen`}
      />
      <div>
        <ConditionalsSetup />
        {Object.keys(charts).map((symbol) => {
          return (
            <>
              {Object.keys(charts[symbol]).map((timeframe) => {
                let { data } = charts[symbol][timeframe]
                let datas = [
                  "timestamp",
                  "open",
                  "high",
                  "low",
                  "close",
                  "volume",
                ]
                let indicators = indicatorResults[symbol][timeframe]
                return (
                  <Scrollable height={"500px"}>
                    <SubTitle>{` ${symbol} ${timeframe}`}</SubTitle>
                    <PriceContainer>
                      {datas.map((name) => (
                        <IsSelectable
                          onClick={() =>
                            selectTarget({ ohlc: data }, "OHLC", name)
                          }
                          isSelecting={selectSeries}
                          isSelected={
                            name === targetsData[selectingTargetInput]?.name
                          }
                        >
                          <ShowDataTail data={data} type={name} />
                          <button />
                        </IsSelectable>
                      ))}
                    </PriceContainer>
                    <IndicatorListContainer>
                      <ListIndicators indicators={indicators} />
                    </IndicatorListContainer>
                  </Scrollable>
                )
              })}
            </>
          )
        })}
      </div>
    </RealDataContext.Provider>
  )
}

const PriceContainer = styled.div`
  /* text-align: center; */
  border: 1px solid red;
  padding: 0.3em;
`

const IndicatorListContainer = styled.div`
  border: 1px solid green;
  padding: 0.3em;
`
