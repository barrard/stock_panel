import React, { useState, useRef, useEffect } from "react"
import styled from "styled-components"

import StratContext from "./StratContext"
import API from "../API"

import {
  AddStratModal,
  StrategiesList,
  AddThingBtn,
  StratListContainer,
  StrategyWindow,
  Title,
  Container,
  Chart,
  RealDataSources,
} from "./components"

export default function StratBuilder() {
  const [newStrategyName, setNewStrategyName] = useState("")
  const [strategies, setStrategies] = useState([])
  const [priceDatas, setPriceDatas] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [creatingStrat, setCreatingStrat] = useState(false)
  const [selectedStrat, setSelectedStrat] = useState(false)
  const [updatingIndicator, setUpdatingIndicator] = useState(false)
  const [charts, setCharts] = useState({})
  const [indicatorList, setIndicatorList] = useState([])
  const [indicatorResults, setIndicatorResults] = useState({})
  const [conditionals, setConditionals] = useState([])

  useEffect(() => {
    //fetch strats
    API.getStrategies()
      .then((strats) => setStrategies([...strats]))
      .catch((e) => console.log(e))

    //fetch price datas
    API.getPriceDatas()
      .then((priceDatas) => setPriceDatas([...priceDatas]))
      .catch((e) => console.log(e))

    //fetch price datas
    API.getIndicatorList()
      .then((list) => setIndicatorList([...list]))
      .catch((e) => console.log(e))

    API.getConditionals()
      .then((list) => setConditionals([...list]))
      .catch((e) => console.log(e))
  }, [])

  const submitNewStrat = async () => {
    try {
      //hit API and set loading
      setCreatingStrat(true)
      let newStrat = await API.addStrategy({ name: newStrategyName })
      if (newStrat) {
        setNewStrategyName("")
        setStrategies([...strategies, newStrat])
      }

      setCreatingStrat(false)
      setShowModal(false)
    } catch (err) {
      setCreatingStrat(false)
      setShowModal(false)

      console.log(err)
    }
  }

  const updateStrat = (strat) => {
    let index = strategies.findIndex(({ _id }) => _id == strat._id)
    strategies[index] = strat
    //adding price data would only occur to the selected strat
    setSelectedStrat(strat)
    setStrategies([...strategies])
  }
  const addChart = async ({ symbol, timeframe, _id }) => {
    if (!charts[symbol]) {
      charts[symbol] = {}
      indicatorResults[symbol] = {}
    }
    if (!charts[symbol][timeframe]) {
      charts[symbol][timeframe] = {}
      indicatorResults[symbol][timeframe] = {}
    }
    if (!charts[symbol][timeframe].data) {
      //load data
      let data = await API.getBackTestData({ symbol, timeframe })
      // console.log(data);
      charts[symbol][timeframe].data = data
      charts[symbol][timeframe].id = _id

      // addOHLC("close");
      // addOHLC("open");
      // addOHLC("high");
      // addOHLC("low");

      // function addOHLC(ohlc) {
      // 	updateIndicatorResults({
      // 		indicator: { _id: ohlc },
      // 		result: { result: data.map((d) => d[ohlc]) },
      // 		symbol,
      // 		timeframe,
      // 	});
      // }
    }
    setCharts({ ...charts })
  }

  const deleteIndicatorResults = ({ symbol, timeframe, indicator }) => {
    delete indicatorResults[symbol][timeframe][indicator._id]
    setIndicatorResults({ ...indicatorResults })
  }
  const updateIndicatorResults = ({ indicator, result, symbol, timeframe }) => {
    try {
      // debugger;
      if (!indicator || !indicator._id) return console.log("you done fucked up")
      if (!indicatorResults[symbol]) indicatorResults[symbol] = {}
      if (!indicatorResults[symbol][timeframe])
        indicatorResults[symbol][timeframe] = {}
      indicatorResults[symbol][timeframe][indicator._id] = {
        indicator,
        result,
      }

      //   console.log(indicatorResults)
      setIndicatorResults({ ...indicatorResults })
    } catch (err) {
      console.error(err)
    }
  }
  //   console.log(charts)
  //   console.log(indicatorResults)
  const GLOBAL = {
    API,
    addChart,
    charts,
    conditionals,
    creatingStrat,
    deleteIndicatorResults,
    indicatorList,
    indicatorResults,
    setIndicatorList,
    newStrategyName,
    priceDatas,
    selectedStrat,
    setCharts,
    setCreatingStrat,
    setIndicatorResults,
    setNewStrategyName,
    setPriceDatas,
    setSelectedStrat,
    setShowModal,
    setStrategies,
    setUpdatingIndicator,
    showModal,
    strategies,
    submitNewStrat,
    updateStrat,
    updatingIndicator,
    updateIndicatorResults,
  }

  return (
    <StratContext.Provider value={GLOBAL}>
      <Container>
        {/* Title */}
        <Title title="Strategy Builder" />
        {/* List of Strategies on the side */}
        <StratListContainer>
          {/* Button to add Strategy */}
          <AddThingBtn
            name={showModal ? "Cancel" : "Create New Strategy"}
            onClick={() => setShowModal(!showModal)}
          />
          {showModal && <AddStratModal />}
          <StrategiesList
            strategies={strategies}
            selectStrat={setSelectedStrat}
          />
        </StratListContainer>
        {selectedStrat && <StrategyWindow />}
        <div style={{ display: "flex" }}>
          <div>
            {!!Object.keys(charts).length &&
              Object.keys(charts).map((symbol) =>
                Object.keys(charts[symbol])
                  .map((timeframe) => (
                    <ChartsContainer key={`${symbol}${timeframe}`}>
                      <Chart symbol={symbol} timeframe={timeframe} />
                    </ChartsContainer>
                  ))
                  .flat()
              )}
          </div>
          <div>
            {selectedStrat && Object.keys(charts).length > 0 && (
              <RealDataSources />
            )}
          </div>
        </div>
      </Container>
    </StratContext.Provider>
  )
}

const ChartsContainer = styled.div`
  border: 1px solid green;
  width: 100%;
`
