import React, { useState } from "react"
import styled from "styled-components"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faChartLine,
  faSquareRootAlt,
  faPlusSquare,
} from "@fortawesome/free-solid-svg-icons"
import StratContext from "../StratContext"
import API from "../../API"
import { AddThingBtn, IconButton } from "./components"
import PriceDatasList from "./PriceDatasList"
import AddPriceDataModal from "./AddPriceDataModal"

export default function StrategyWindow() {
  const [showPriceDataModal, setShowPriceDataModal] = useState(false)
  const [addingPriceData, setAddingPriceData] = useState(false)
  const {
    selectedStrat,
    setSelectedStrat,
    updateStrat,
    setPriceDatas,
    priceDatas,
    conditionals,
  } = React.useContext(StratContext)

  const submitAddPriceData = async ({ timeframe, symbol }) => {
    try {
      //set is loading
      setAddingPriceData(true)
      //API call
      let newPriceData = await API.addPriceData(symbol, timeframe)
      setAddingPriceData(false)

      console.log(newPriceData)
      if (!newPriceData) return
      setPriceDatas([...priceDatas, newPriceData])
      //return reult or error
    } catch (err) {
      setAddingPriceData(false)

      console.log(err)
    }
  }

  const addLinkPriceData = async (priceData) => {
    let updatedStrat = await API.linkPriceData(selectedStrat._id, priceData._id)
    updateStrat(updatedStrat)
  }

  return (
    <StrategyWindowContainer>
      {/* STRAT HEADER / TITLE*/}
      <h2>{selectedStrat.name}</h2>

      <div style={{ width: "30%" }}>
        <PriceDataList
          addLinkPriceData={addLinkPriceData}
          setShowPriceDataModal={setShowPriceDataModal}
          showPriceDataModal={showPriceDataModal}
          submitAddPriceData={submitAddPriceData}
          addingPriceData={addingPriceData}
        />
        <DataFeedList />
      </div>
      <div
        style={{
          width: "70%",
          border: "1px solid red",
        }}
      >
        <ConditionalsList />
      </div>
    </StrategyWindowContainer>
  )
}

const ConditionalsList = () => {
  let { conditionals } = React.useContext(StratContext)

  console.log({ conditionals })

  //sort conditionals in the types,
  //value, OHLC, indicator
  let valueConditionals = conditionals.filter((c) => c.type === "value")
  let indicatorConditionals = conditionals.filter((c) => c.type === "indicator")
  let ohlcConditionals = conditionals.filter((c) => c.type === "OHLC")
  let headerValues = ["Name", "Symbol", "Timeframe", "Value"]

  return (
    <>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <h2>Conditionals</h2>
      </div>
      <ConditionalListContainer>
        <div style={{ display: "flex" }}>
          {headerValues.map((h) => (
            <StyledConditionalListHeader>{h}</StyledConditionalListHeader>
          ))}
        </div>
        {conditionals.map((c) => (
          <ConditionalItem item={c} />
        ))}
        {/* <h3>Values</h3>
        {valueConditionals.map((c) => (
          <ConditionalItem item={c} />
        ))}
        <h3>OHLC</h3>
        {ohlcConditionals.map((c) => (
          <ConditionalItem item={c} />
        ))}
        <h3>Indicators</h3>
        {indicatorConditionals.map((c) => (
          <ConditionalItem item={c} />
        ))} */}
      </ConditionalListContainer>
    </>
  )
}

const PriceDataList = ({
  submitAddPriceData,
  addingPriceData,
  setShowPriceDataModal,
  showPriceDataModal,
  addLinkPriceData,
}) => {
  return (
    <>
      {/* Price DATA FEED CREATE */}
      <AddThingBtn
        name={showPriceDataModal ? "Cancel" : "Create New Price Data"}
        onClick={() => {
          setShowPriceDataModal(!showPriceDataModal)
        }}
      />
      <h2>Price Feeds</h2>
      <PriceDatasList link={addLinkPriceData} />

      {/* PRICE DATA MODAL */}
      {showPriceDataModal && (
        <AddPriceDataModal
          submit={submitAddPriceData}
          loading={addingPriceData}
        />
      )}
      {/*  */}
    </>
  )
}

const DataFeedList = () => {
  let { selectedStrat } = React.useContext(StratContext)

  return (
    <>
      {/* DATA FEED LIST */}
      {selectedStrat.priceData.length == 0 && (
        <div>No Linked Price Data Feeds, Please Select Price Data to Link</div>
      )}
      {selectedStrat.priceData.length !== 0 && (
        <>
          <h2>{`You have ${selectedStrat.priceData.length} Data Feed${
            selectedStrat.priceData.length > 1 ? "s" : ""
          }`}</h2>
          {selectedStrat.priceData.map((data, i) => (
            <DataFeedItem key={i} index={i} data={data} />
          ))}
        </>
      )}
      {/*  */}
    </>
  )
}

const DataFeedItem = ({ data, index }) => {
  let { addChart } = React.useContext(StratContext)
  let { symbol, timeframe, _id } = data
  return (
    <LinkedDataFeed index={index}>
      <span>{`${symbol} ${timeframe}`}</span>
      <IconButton
        title="Show Chart"
        index={index}
        onClick={() => addChart({ symbol, timeframe, _id })}
        icon={faChartLine}
      />
      <IconButton
        title="Add Condition"
        index={index}
        onClick={() => console.log("click")}
        icon={faSquareRootAlt}
      />
    </LinkedDataFeed>
  )
}

function findIndicatorResults(target, indicatorResults) {
  if (indicatorResults[`${target.symbol}`]) {
    if (indicatorResults[`${target.symbol}`][target.timeframe]) {
      console.log(indicatorResults[`${target.symbol}`][target.timeframe])

      let IR = indicatorResults[`${target.symbol}`][target.timeframe]
      if (IR[target.indicatorId]) {
        let results = IR[target.indicatorId]
        console.log(results)
        return results
      }
      debugger
    }
  }
}

const ConditionalItem = ({ item }) => {
  let { target1, target2 } = item

  //get the data?
  let { charts, indicatorResults } = React.useContext(StratContext)
  //if type is indicator?
  //find the indicator data in indicatorResults
  console.log(indicatorResults, charts)
  //target 1
  debugger
  if (target1.type === "indicator") {
    let results = findIndicatorResults(target1, indicatorResults)
    debugger
  }
  //target 2
  debugger
  if (target2.type === "indicator") {
    let results = findIndicatorResults(target2, indicatorResults)
    debugger
  }

  debugger
  return (
    <div style={{ border: "1px solid white", margin: "1em 0" }}>
      <div style={{ display: "flex" }}>
        <StyledConditionalTargetItem>{item.name}</StyledConditionalTargetItem>
        <StyledConditionalTargetItem>
          {target1.symbol}
        </StyledConditionalTargetItem>
        <StyledConditionalTargetItem>
          {target1.timeframe}
        </StyledConditionalTargetItem>
      </div>
      <div style={{ display: "flex" }}>
        <StyledConditionalTargetItem>{item.name}</StyledConditionalTargetItem>
        <StyledConditionalTargetItem>
          {target2.symbol}
        </StyledConditionalTargetItem>
        <StyledConditionalTargetItem>
          {target2.timeframe}
        </StyledConditionalTargetItem>
      </div>
    </div>
  )
}

const StyledConditionalTargetItem = styled.div`
  border: 1px solid green;
  display: flex;
  justify-content: center;
  font-size: 12px;
  padding: 1em 3em;
  width: 20%;
`
const StyledConditionalListHeader = styled.div`
  border: 1px solid yellow;

  display: flex;
  justify-content: center;
  font-size: 12px;
  padding: 1em 3em;
  width: 20%;
`
const ConditionalListContainer = styled.div`
  border: 1px solid blue;
`

const StrategyWindowContainer = styled.div`
  border: 1px solid green;
  display: inline-block;
  display: flex;
`

const LinkedDataFeed = styled.div`
  display: flex;
  justify-content: space-around;
  align-items: baseline;
  background-color: ${({ index }) => (index % 2 ? "#333" : "#444")};
`
