import React, {
  useState,
  useEffect,
  useRef,
  useContext,
  createContext,
} from "react"
import styled from "styled-components"
import {
  axisRight,
  axisBottom,
  curveCardinal,
  extent,
  line,
  scaleBand,
  scaleLinear,
  select,
  zoom,
  zoomTransform,
  mouse,
} from "d3"
import {
  faEye,
  faPlusSquare,
  faTrashAlt,
  faPencilAlt,
  faEyeSlash,
  faWindowClose,
  faTimes,
} from "@fortawesome/free-solid-svg-icons"

import { MA_SELECT, LineColors } from "./IndicatorComponents"
import AddIndicatorModal from "./AddIndicatorModal"
import { IconButton, LoadingButton } from "./components"
import StratContext from "../StratContext"
import API from "../../API"
import { MA_TYPE_OPTS } from "./IndicatorComponents"
import {
  appendChartPatterns,
  appendIndicatorName,
  removeIndicatorName,
  handleLineClick,
  drawOHLC,
  drawCrossHair,
  appendXLabel,
  appendYLabel,
  drawXAxis,
  drawYAxis,
  appendOHLCVLabel,
} from "./chartAppends"
import ChartContext from "./ChartContext"
let width = 1000

export default function Chart({ symbol, timeframe }) {
  let margin = {
    left: 20,
    right: 50,
    bottom: 20,
    top: 20,
  }
  let indicatorHeight = 100
  let mainChartHeight = 250

  const {
    charts,
    setCharts,
    setSelectedStrat,
    selectedStrat,
    indicatorResults,
    updateIndicatorResults,
    deleteIndicatorResults,
  } = useContext(StratContext)
  const { data, id: priceDataId } = charts[symbol][timeframe]
  let candleCount = data.length
  const title = `${symbol} ${timeframe}`
  const svgRef = useRef()
  const [height, setHeight] = useState(mainChartHeight)
  const [chartSvg, setChartSvg] = useState(undefined)
  const [currentZoom, setCurrentZoom] = useState()
  const [addIndicators, setAddIndicators] = useState(false)
  const [indicatorCount, setIndicatorCount] = useState(0)
  const [lineSettings, setLineSettings] = useState({})
  const [selectedPatternResults, setSelectedPatternResults] = useState({})

  // const [indicatorColors, setIndicatorColors] = useState({
  // 	mainChart: "yellow",
  // });
  let innerWidth = width - (margin.left + margin.right)
  let xScale = scaleLinear().range([margin.left, innerWidth])
  const [yScales, setYScales] = useState({
    mainChart: {
      yScale: scaleLinear().range([mainChartHeight, 0]),
      xScale,
      data: data,
      sliceData: {},
      color: { close: "yellow" },
      margin,
      height: mainChartHeight,
      name: "mainChart",
      fullName: `${symbol} OHLC ${timeframe}`,
      yOffset: 0,
      group: "Overlap Studies",
    },
  })

  let innerHeight = height - (margin.top + margin.bottom)

  let chartIndicators = selectedStrat.indicators.filter(
    (ind) => ind.priceData === priceDataId
  )

  useEffect(() => {
    let _height = 250
    let _indicatorCount = 0
    let indicators = indicatorResults[symbol][timeframe]
    for (let _id in indicators) {
      let {
        indicator: { name, fullName, outputs, color },
        result: { result, group },
      } = indicators[_id]
      let isOverlap = group === "Overlap Studies"
      let isCandle = group === "Pattern Recognition"
      let isMainChart = isOverlap || isCandle
      let yScale, yOffset

      //SCALE IS ALREADY ADDED
      if (yScales[_id]) {
        if (!isMainChart) {
          _indicatorCount++
          _height += indicatorHeight
        }

        continue
      }

      if (isOverlap || isCandle) {
        yScale = yScales["mainChart"].yScale
        yOffset = 0
      } else {
        yScale = scaleLinear().range([indicatorHeight, 0])
        yOffset = mainChartHeight + _indicatorCount * indicatorHeight
        console.log(yOffset)
      }
      yScales[_id] = {
        color,
        name,
        fullName,
        yScale,
        xScale,
        margin,
        yOffset,
        height: indicatorHeight,
        data: result,
        sliceData: {},
        group: group,
        outputs: outputs,
      }
      // indicatorColors[name] = color;
      if (!isOverlap && !isCandle) {
        _height += indicatorHeight
        _indicatorCount++
      }
    }
    // setIndicatorColors(indicatorColors);
    setYScales({ ...yScales })
    setHeight(_height)
    setIndicatorCount(_indicatorCount)

    draw()
  }, [Object.keys(indicatorResults[symbol][timeframe]).length])

  innerHeight = height - (margin.top + margin.bottom)

  useEffect(() => {
    draw()
  }, [data, currentZoom, chartSvg, yScales, selectedPatternResults.pattern])

  useEffect(() => {
    setChartSvg(select(svgRef.current))
    //fetch indicator results
    chartIndicators.forEach(async (ind) => {
      fetchAndUpdateIndicatorResults(ind)
    })
  }, [])

  const fetchAndUpdateIndicatorResults = async (ind) => {
    let inputs = {}
    ind.inputs.forEach((inp) => {
      let { name } = inp
      if (name.includes("inReal")) {
        let flag = ind.selectedInputs[name]
        inputs[name] = data.map((d) => d[flag])
      } else if (name === "inPeriods") {
        inputs[name] = ind.variablePeriods
      } else if (inp.flags) {
        Object.values(inp.flags).map((flag) => {
          inputs[flag] = data.map((d) => d[flag])
        })
      } else {
        console.log("ok")
      }
    })
    let results = await API.getIndicatorResults(ind, inputs)
    if (!results || results.err) {
      console.log(results)
      console.log("err?")
      return
    }
    console.log(results)
    updateIndicatorResults({
      indicator: ind,
      result: results.result,
      symbol,
      timeframe,
    })
    setYScales((yScales) => {
      if (yScales[ind._id]) {
        yScales[ind._id].data = results.result.result
      }
      return { ...yScales }
    })
    draw()
  }

  const getYMinMax = (data) => {
    if (Array.isArray(data)) {
      let [_, dataMax] = extent(data, (d) => d.high)
      let [dataMin, __] = extent(data, (d) => d.low)
      return [dataMin, dataMax]
    } else if (data.result) {
      let { result } = data
      data = Object.keys(result)
        .map((lineName) => result[lineName])
        .flat()
      let [dataMin, dataMax] = extent(data, (d) => d)

      return [dataMin, dataMax]
    }
  }

  const padLeft = (data) => {
    let paddedLines = {}
    for (let lineName in data.result) {
      let leftPadding = []
      if (data.begIndex) {
        let startVal = data.result[lineName][0]
        for (let x = 0; x < data.begIndex; x++) {
          leftPadding.push(startVal)
        }

        paddedLines[lineName] = [...leftPadding, ...data.result[lineName]]
      } else {
        paddedLines[lineName] = data.result[lineName]
      }
    }
    return paddedLines
  }

  const draw = () => {
    if (!data || !data.length) return

    xScale.domain([0, data.length - 1])

    if (currentZoom) {
      let newXScale = currentZoom.rescaleX(xScale)
      let [start, end] = newXScale.domain()
      xScale.domain(newXScale.domain())
      if (start < 0) start = 0

      //this is just to get the minMax scale
      let mainChartData = {}
      for (let key in yScales) {
        let { data, group, yScale } = yScales[key]
        yScales[key].xScale = xScale
        if (group === "Overlap Studies") {
          if (data.result) {
            let paddedLines = padLeft(data)
            for (let lineName in paddedLines) {
              yScales[key].sliceData[lineName] = paddedLines[lineName]
              mainChartData[lineName] = paddedLines[lineName].slice(
                Math.floor(start),
                Math.ceil(end)
              )
            }
          } else {
            //wheres my close?
            mainChartData.high = data
              .map((d) => d.high)
              .slice(Math.floor(start), Math.ceil(end))
            mainChartData.low = data
              .map((d) => d.low)
              .slice(Math.floor(start), Math.ceil(end))
          }
        } else if (group === "Pattern Recognition") {
          continue //candle patterns will be charted as markers
        } else {
          let tempLineData = {}
          let paddedLines = padLeft(data)
          for (let lineName in paddedLines) {
            yScales[key].sliceData[lineName] = paddedLines[lineName]
            tempLineData[lineName] = paddedLines[lineName].slice(
              Math.floor(start),
              Math.ceil(end)
            )
          }

          let [yMin, yMax] = getYMinMax({ result: tempLineData })

          yScale.domain([yMin, yMax])
        }
      }
      candleCount = mainChartData.high.length
      let [yMin, yMax] = getYMinMax({ result: mainChartData })
      yScales["mainChart"].yScale.domain([yMin, yMax])
    } else {
      //   NO ZOOM YET
      let mainChartData = {}
      for (let key in yScales) {
        let { data, group, yScale } = yScales[key]
        // if (group === "Cycle Indicators") {
        // ;
        // }
        if (group === "Overlap Studies") {
          if (!data) {
            return
          }
          if (data.result) {
            for (let lineName in data.result) {
              mainChartData[lineName] = data.result[lineName]
            }
          } else {
            //OHLC data
            mainChartData.close = data.map((d) => d.close)
          }
        } else if (group === "Pattern Recognition") {
          continue //candle patterns will be charted as markers
        } else {
          // ;
          let [yMin, yMax] = getYMinMax(data)

          yScale.domain([yMin, yMax])
        }
      }

      let [yMin, yMax] = getYMinMax({ result: mainChartData })
      yScales["mainChart"].yScale.domain([yMin, yMax])
    }

    //CALLING THE MAIN X-Scale
    // let [start, end] = xScale.domain();
    // let slicedOHLC = yScales["mainChart"].data.slice(
    // 	Math.floor(start),
    // 	Math.ceil(end)
    // );
    // console.log(slicedOHLC);

    //RETURN IF THERE IS NO SVG
    if (!chartSvg) return
    drawXAxis({ xScale, data, chartSvg, className: "x-axis" })
    //CALLING ALL Y-SCALE
    for (let key in yScales) {
      // let { name, yScale } = yScales[key];

      drawYAxis({ yScales, chartSvg, key, innerWidth })
      // yScales[key].axis = axisRight(yScale).tickSize(
      // 	-innerWidth
      // );
      // if (name === "mainChart") {
      // 	//TRY TO CALL THIS Y-AXIS JUST ONCE
      // 	chartSvg.select(`.${name}-${key}-y-axis`).call(axis);
      // } else if (group !== "Overlap Studies") {
      // 	//ALL OVER NON-MAIN CHART Y_AXES
      // 	// chartSvg.select(`.${name}-${key}-y-axis`).call(axis);
      // 	drawYAxis({axis, yScale, chartSvg, className:`${name}-${key}-y-axis`})

      // }
    }

    chartSvg.on("mousemove", function () {
      let [mouseX, mouseY] = mouse(this)
      let chartData = {
        chartSvg,
        indicatorHeight,
        mainChartHeight,
        mouseX,
        mouseY,
        xScale,
        data,
        margin,
        height,
        yScales,
        yScale: yScales["mainChart"].yScale,
      }

      drawCrossHair({
        ...chartData,
      })
      appendXLabel({
        ...chartData,
        hasBackground: true,
      })

      appendYLabel({
        ...chartData,
        hasBackground: true,
      })
      appendOHLCVLabel({
        ...chartData,
      })
    })

    //STORE CHART PATTERNS
    let chartPatterns = []
    let closeData = []
    //CALLING EACH Y-SCALE AND DRAWING INDICATOR LINE
    for (let key in yScales) {
      let {
        name,
        axis,
        yScale,
        xScale,
        color,
        yOffset,
        data,
        group,
        fullName,
      } = yScales[key]
      if (group === "Pattern Recognition") {
        debugger
        chartPatterns.push(yScales[key])
        continue
      }
      //LINES FOR THE CHART
      let lines = {}
      if (!data.result) {
        //ASSUMED OHLC
        //drawOHLC
        drawOHLC(chartSvg, data, xScale, yScale, candleCount, margin)
        // lines.close = closeData = data.map((d) => d.close);
      } else {
        //ASSUMED INDICATOR
        let paddedLines = padLeft(data)
        lines = { ...lines, ...paddedLines }
      }
      //NAME IS TALIB INDICATOR NAME
      // if (name === "mainChart") {
      // 	//TRY TO CALL THIS Y-AXIS JUST ONCE
      // 	chartSvg.select(`.${name}-${key}-y-axis`).call(axis);
      // } else if (group !== "Overlap Studies") {
      // 	//ALL OVER NON-MAIN CHART Y_AXES
      // 	chartSvg.select(`.${name}-${key}-y-axis`).call(axis);
      // }

      //LOOP OVER ALL LINES AND DRAW
      for (let lineName in lines) {
        let lineData = lines[lineName]
        let lineColor = color[lineName]
        // console.log(lineData);

        let className = `${lineName}-${key}-myLine`
        // let className = `${lineName}-myLine ${group}-lineGroup ${name}-indicatorName`;
        chartSvg.selectAll(`.${className}`).remove()
        className = `${className} indicator-${key}`
        const myLine = line()
          .x((d, i) => {
            let x = xScale(i)
            return x
          })
          .y((d) => {
            let y = yScale(d.close || d) + yOffset + margin.top
            return y
          })

        chartSvg
          .selectAll(`.${className}`)
          .data([lineData])
          .join("path")
          .attr("class", `${className} clickable`)
          .attr("d", myLine)
          .attr("fill", "none")
          .attr("stroke-width", "3")
          .attr("stroke", lineColor || "red")
          .attr("pointer-events", "stroke")

          .attr("pointer-events", "auto")
          .on("mouseenter", function () {
            this.classList.add("selectedLine")
          })
          .on("mouseleave", function () {
            this.classList.remove("selectedLine")
          })
          .on("click", (e) => {
            debugger
            openLineSettings(yScales[key], yScales[key].name, key)
          })
          .exit()
      }
    }

    //APPEND CHART PATTERNS
    appendChartPatterns(chartSvg, chartPatterns, data)

    //ADD FULL_NAME TO CHART
    appendIndicatorName(chartSvg, margin, yScales, setLineSettings)

    //APPEND selectedPatternResults,
    if (selectedPatternResults.pattern) {
      let someData = [
        {
          ...yScales.mainChart,
          data: selectedPatternResults.result,
          fullName: selectedPatternResults.pattern,
        },
      ]
      appendChartPatterns(chartSvg, someData, data)
    }

    const zoomBehavior = zoom()
      .scaleExtent([0.1, 100]) //zoom in and out limit
      .translateExtent([
        [0, 0],
        [width, height],
      ]) //pan left and right
      .on("zoom", () => {
        const zoomState = zoomTransform(chartSvg.node())
        setCurrentZoom(zoomState)
      })

    chartSvg.call(zoomBehavior)
  }

  function openLineSettings(indicatorData, lineName, key) {
    //toggle, and set
    setLineSettings({ indicatorData, lineName, key })
  }
  const CloseChart = () => {
    return (
      <IconButton
        title={"Close Chart"}
        onClick={() => {
          delete charts[symbol][timeframe]
          setCharts({ ...charts })
        }}
        icon={faWindowClose}
      />
    )
  }

  let indicatorList = React.useMemo(
    () =>
      chartIndicators.map((ind) => {
        console.log(ind)
        return (
          <IndicatorItem
            fetchAndUpdateIndicatorResults={fetchAndUpdateIndicatorResults}
            key={ind._id}
            ind={ind}
          />
        )
      }),
    [selectedStrat.indicators.length]
  )

  const STATE = {
    draw,
    chartSvg,
    chartIndicators,
    setLineSettings,
    yScales,
    lineSettings,
    setYScales,
    fetchAndUpdateIndicatorResults,
    selectedPatternResults,
    setSelectedPatternResults,
  }

  return (
    <ChartContext.Provider value={STATE}>
      <div className="white">
        <div>
          {title} <CloseChart />
        </div>

        <Flex>
          <IconButton
            title="Add Indicator"
            onClick={() => setAddIndicators(!addIndicators)}
            icon={faPlusSquare}
          />
        </Flex>
        {addIndicators && (
          <AddIndicatorModal
            setAddIndicators={setAddIndicators}
            symbol={symbol}
            timeframe={timeframe}
          />
        )}
        <div style={{ border: "1px solid blue", position: "relative" }}>
          {lineSettings.lineName && <LineSettings />}
          <StyledSVG margin={margin} height={height} ref={svgRef}>
            {Object.keys(yScales).map((key) => {
              let { name, yOffset, group } = yScales[key]
              if (
                name !== "mainChart" &&
                (group === "Overlap Studies" || group === "Pattern Recognition")
              ) {
                return <React.Fragment key={key}></React.Fragment>
              }
              return (
                <StyledYAxis
                  key={key}
                  yOffset={yOffset}
                  width={width}
                  margin={margin}
                  className={`${name}-${key}-y-axis white`}
                />
              )
            })}
            <StyledXAxis
              margin={margin}
              height={height}
              className="x-axis white"
            />
          </StyledSVG>
        </div>

        <div>INDICATORS</div>
        <div>{indicatorList}</div>
      </div>
    </ChartContext.Provider>
  )
}

const Small = styled.span`
  font-size: 10px;
  padding: 0.2em;
  cursor: default;
  /* background-color: #333; */
  &:hover {
    background-color: #666;
  }
`

const StyledSVG = styled.svg`
  border: 1px solid red;
  width: ${width}px;
  height: ${({ height, margin }) => height + margin.top + margin.bottom}px;
  background: #444;
`

const StyledXAxis = styled.g`
  user-select: none;
  transform: ${({ margin, height }) =>
    `translate(${margin.left}px, ${height + margin.bottom}px)`};
`

const StyledYAxis = styled.g`
  user-select: none;
  transform: ${({ yOffset, width, margin }) =>
    `translate(${width - margin.right}px, ${yOffset + margin.top}px)`};
`

const Flex = styled.div`
  display: flex;
`

const IndicatorItem = ({ ind }) => {
  const [edit, setEdit] = useState(false)
  const [show, setShow] = useState(false)
  let {
    selectedStrat,
    setSelectedStrat,
    setStrategies,
    strategies,
    API,
    deleteIndicatorResults,
  } = useContext(StratContext)
  let {
    chartSvg,
    yScales,
    setYScales,
    fetchAndUpdateIndicatorResults,
  } = useContext(ChartContext)
  let { _id, fullName, priceData } = ind
  return (
    <div key={_id}>
      {fullName}{" "}
      <IconButton
        title={show ? "Hide" : "Show"}
        onClick={() => setShow(!show)}
        icon={show ? faEye : faEyeSlash}
      />
      <IconButton
        title="Delete"
        onClick={async () => {
          await API.deleteIndicator(ind, selectedStrat)
          let { symbol, timeframe } = selectedStrat.priceData.filter(
            ({ _id }) => _id === priceData
          )[0]
          //pull the data from strat
          selectedStrat.indicators = selectedStrat.indicators.filter(
            ({ _id: id }) => id !== _id
          )
          delete yScales[_id]
          setYScales({ ...yScales })

          let stratIndex = strategies.findIndex(
            (strat) => strat._id === selectedStrat._id
          )
          strategies[stratIndex] = selectedStrat
          setStrategies([...strategies])
          setSelectedStrat({ ...selectedStrat })

          deleteIndicatorResults({
            symbol,
            timeframe,
            indicator: ind,
          })
          chartSvg.selectAll(`.indicator-${_id}`).remove()
          removeIndicatorName(chartSvg, fullName, _id)
        }}
        icon={faTrashAlt}
      />
      <IconButton
        title="Edit"
        onClick={() => setEdit(!edit)}
        icon={faPencilAlt}
      />
      {ind.optInputs && (
        <OptInputs
          fetchAndUpdateIndicatorResults={fetchAndUpdateIndicatorResults}
          setEdit={setEdit}
          edit={edit}
          ind={ind}
        />
      )}
      {Object.keys(ind.selectedInputs).length &&
        Object.keys(ind.selectedInputs).map((i) => (
          <Small key={`${ind._id}-${i}`} title={i}>
            {ind.selectedInputs[i].slice(0, 1).toUpperCase()}
          </Small>
        ))}
    </div>
  )
}

const OptInputs = ({ edit, ind, setEdit, fetchAndUpdateIndicatorResults }) => {
  let data = ind.optInputs
  const [values, setValues] = useState(data)
  let { updatingIndicator, setUpdatingIndicator, API } = useContext(
    StratContext
  )

  return (
    <>
      <EditableIndOpts
        data={data}
        setEdit={setEdit}
        values={values}
        setValues={setValues}
        edit={edit}
      />
      {edit && (
        <Small>
          <IconButton
            title={"Cancel"}
            onClick={() => setEdit(false)}
            icon={faTimes}
          />
          <LoadingButton
            disabled={updatingIndicator}
            loading={updatingIndicator}
            name="Update Indicator"
            submit={async () => {
              setUpdatingIndicator(true)
              console.log("UPDATE")
              let resp = await API.updateIndicatorOpts({
                ...values,
                _id: ind._id,
              })
              if (!resp.indicator) {
                return console.error("ERR")
              }
              await fetchAndUpdateIndicatorResults(resp.indicator)

              setUpdatingIndicator(false)
              setEdit(false)
            }}
          />
        </Small>
      )}
    </>
  )
}

const EditableIndOpts = ({ data, setEdit, values, setValues, edit }) => {
  return (
    <>
      {Object.keys(data).map((name) => {
        let { hint, displayName, defaultValue } = data[name]

        return (
          <Small onClick={() => setEdit(true)} key={name} title={hint}>
            {displayName}
            {" : "}
            {edit && displayName !== "MA Type" && (
              <input
                type={"number"}
                style={{}}
                value={values[name].defaultValue}
                onChange={(e) => {
                  values[name].defaultValue = e.target.value
                  setValues({
                    ...values,
                  })
                }}
              />
            )}
            {edit && displayName === "MA Type" && (
              <MA_SELECT
                name={name}
                indicatorOpts={values}
                setIndicatorOpts={setValues}
              />
            )}

            {!edit && displayName === "MA Type" && MA_TYPE_OPTS[defaultValue]}
            {!edit && displayName !== "MA Type" && defaultValue}
          </Small>
        )
      })}
    </>
  )
}

function LineSettings() {
  const [color, setColor] = useState({})
  let { setLineSettings, lineSettings, chartIndicators, draw } = useContext(
    ChartContext
  )
  console.log(color)
  console.log(lineSettings)
  let { key, lineName, indicatorData } = lineSettings
  //now i need to find the ind in chartIndicators
  console.log(chartIndicators)
  debugger
  let chartIndicator = chartIndicators.filter(({ _id }) => _id === key)[0]
  console.log({ chartIndicator })

  useEffect(() => {
    setColor(indicatorData.color)
    console.log("set color")
  }, [chartIndicator.color])

  useEffect(() => {
    let isNew = false
    for (let line in color) {
      if (indicatorData.color[line] !== color[line]) isNew = true
    }
    if (isNew) {
      debugger
      indicatorData.color = color
      console.log("set color")
      API.updateLineColor(key, color)

      draw()
    }
  }, [color])

  return (
    <LineSettingsModalContainer>
      {/* <CreateModal /> */}
      <button onClick={() => setLineSettings({})}>{"X"}</button>
      <p>{lineSettings.lineName}</p>
      <p>{lineSettings.indicatorData.fullName}</p>
      <IndicatorItem key={key} ind={chartIndicator} />
      <LineColors
        indicator={chartIndicator}
        color={color}
        setColor={setColor}
      />
      {/* some line detailrs */}
    </LineSettingsModalContainer>
  )
}

const LineSettingsModalContainer = styled.div`
  top: 20%;
  left: 10%;
  position: absolute;
  /* width: 300px;
	height: 300px; */
  background-color: #333;
  border: 1px solid #fff;
`
