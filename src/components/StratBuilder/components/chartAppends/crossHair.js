import { line, curveLinear } from "d3-shape"

export function drawCrossHair({
  chartSvg,
  mouseX,
  mouseY,
  xScale,
  yScale,
  margin,
  height,
}) {
  let className = "crossHair"
  chartSvg.selectAll(`.${className}`).remove()

  //horizontal
  chartSvg
    .append("line")
    .attr("class", `${className}`)
    .style("stroke", "#000")
    .style("stroke-width", 2)
    .attr("pointer-events", "none")
    .attr("x1", xScale.range()[0])
    .attr("y1", mouseY)
    .attr("x2", xScale.range()[1] + margin.left)
    .attr("y2", mouseY)

  //vertical
  chartSvg
    .append("line")
    .attr("class", `${className}`)
    .style("stroke", "#000")
    .attr("pointer-events", "none")
    .style("stroke-width", 2)
    .attr("x1", mouseX)
    .attr("y1", margin.top + height)
    .attr("x2", mouseX)
    .attr("y2", yScale.range()[1] + margin.top)
}

let _dateIndex
export function appendXLabel({
  chartSvg,
  mouseX,
  mouseY,
  data,
  xScale,
  yScale,
  margin,
  height,
  hasBackground,
}) {
  const padding = 4
  const fontSize = 12
  let dateIndex = Math.floor(xScale.invert(mouseX))
  if (!data[dateIndex]) return
  if (dateIndex === _dateIndex) return
  _dateIndex = dateIndex
  let label = new Date(data[dateIndex].timestamp).toLocaleString()
  let className = "xAxisLabel"

  let textG = chartSvg.append("g").attr("class", `${className}`)
  let x = mouseX
  let y = margin.top + height

  if (hasBackground) {
    textBackground({
      className,
      chartSvg,
      x,
      y,
      shapeId: "bottom",
      padding,
    })
  }

  chartSvg.selectAll(`.${className}`).remove()
  textG = chartSvg.append("g").attr("class", `${className}`)

  textG
    .append("text")
    .attr("class", className)
    .attr("x", x)
    .attr("y", y + fontSize + (margin.bottom - fontSize) / 2)
    .text(label)
    .attr("font-size", fontSize + "px")
    .attr("text-anchor", "middle")
}

let _yLabel
export function appendYLabel({
  mainChartHeight,
  indicatorHeight,
  chartSvg,
  mouseX,
  mouseY,
  data,
  xScale,
  yScales,
  margin,
  height,
  hasBackground,
}) {
  let className = "yAxisLabel"
  let padding = 3
  const fontSize = 12
  mouseY = mouseY - margin.top
  //which yScale and offset?
  if (mouseY < 0) return
  let yScale
  let yLabel
  if (mouseY < mainChartHeight) {
    yScale = yScales["mainChart"].yScale
    yLabel = yScale.invert(mouseY).toFixed(2)
  } else {
    console.log({ mouseY, mainChartHeight, indicatorHeight })
    //look for some scale with offset mouseY - mainChartHeight = ?
    console.log(mouseY - mainChartHeight)
    console.log((mouseY - mainChartHeight) / indicatorHeight)
    let t = Math.floor((mouseY - mainChartHeight) / indicatorHeight).toFixed(0)
    let crypticScaleOffset = mainChartHeight + t * indicatorHeight
    console.log(t, crypticScaleOffset)
    yScale = Object.values(yScales).filter(
      ({ yOffset }) => yOffset === crypticScaleOffset
    )[0]
    if (!yScale) {
      // ;
      return
    }
    //this is not confusing?
    yScale = yScale.yScale
    //how many multiples of indicatorHeight
    let whaaa = mouseY - mainChartHeight - t * indicatorHeight
    yLabel = yScale.invert(whaaa).toFixed(2)
  }
  if (!yScale) return

  if (yLabel === _yLabel) return
  _yLabel = yLabel

  let textG = chartSvg.append("g").attr("class", `${className}`)

  let [_, x] = xScale.range()
  x = x + margin.left
  let y = mouseY + margin.top

  if (hasBackground) {
    textBackground({
      className,
      chartSvg,
      x,
      y,
      shapeId: "right",
      padding,
    })
  }

  chartSvg.selectAll(`.${className}`).remove()
  textG = chartSvg.append("g").attr("class", `${className}`)
  textG
    .append("text")
    .attr("class", className)
    .attr("x", x + padding)
    .attr("y", y)
    .text(yLabel)
    .attr("font-size", fontSize + "px")
    .attr("alignment-baseline", "middle")
}

function textBackground({ className, chartSvg, x, y, shapeId, padding }) {
  let h, w
  let t = document.getElementsByClassName(className)
  if (t[0]) {
    w = t[0].getBoundingClientRect().width
    h = t[0].getBoundingClientRect().height
  } else return
  className = `${className}-background`
  chartSvg.selectAll(`.${className}`).remove()

  chartSvg
    .append("path")
    .attr("d", getAccessorPathData(shapeId, { x, y, w, h, padding }))
    .attr("fill", "green")
    .attr("class", className)
    .style("stroke-width", "1")
}

//background label path for axisAppends
function getAccessorPathData(shapeId, xy) {
  if (shapeId.toLowerCase().includes("left"))
    return axisMarkerTagAccessor(leftAxisMarkerTagLine(xy))
  if (shapeId.toLowerCase().includes("right"))
    return axisMarkerTagAccessor(rightAxisMarkerTagLine(xy))

  if (shapeId.toLowerCase().includes("bottom"))
    return axisMarkerTagAccessor(bottomAxisMarkerTagLine(xy))

  if (shapeId.toLowerCase().includes("top"))
    return axisMarkerTagAccessor(topAxisMarkerTagLine(xy))
}

const axisMarkerTagAccessor = line()
  .x((d) => d.x)
  .y((d) => d.y)
  .curve(curveLinear)

const leftAxisMarkerTagLine = (y) => [
  { x: 0, y: 0 + y },
  { x: -20, y: -10 + y },
  { x: -60, y: -10 + y },
  { x: -60, y: 10 + y },
  { x: -20, y: 10 + y },
  { x: 0, y: 0 + y },
]

const rightAxisMarkerTagLine = ({ y, x, w, h, padding }) => [
  { x: 0 + x, y: 0 + y },
  { x: x + 5, y: -(h / 2) + y - padding },
  { x: x + 60, y: -(h / 2) + y - padding },
  { x: x + 60, y: h / 2 + y },
  { x: x + 5, y: h / 2 + y },
  { x: x + 0, y: 0 + y },
]

const topAxisMarkerTagLine = (x) => [
  { x: x + 0, y: 0 },
  { x: x - 40, y: -4 },
  { x: x - 40, y: -20 },
  { x: x - 40, y: -20 },
  { x: x + 40, y: -20 },
  { x: x + 40, y: -20 },
  { x: x + 40, y: -4 },
  { x: x + 0, y: -0 },
]

const bottomAxisMarkerTagLine = ({ x, y, w, h, padding }) => [
  { x: x + 0, y: 0 + y },
  { x: x - (w / 2 + padding), y: padding + y },
  { x: x - (w / 2 + padding), y: padding + h + y + padding },

  { x: x + (w / 2 + padding), y: padding + h + y + padding },
  { x: x + (w / 2 + padding), y: padding + y },
  { x: x + 0, y: 0 + y },
]

//OHLC LABEL
export function appendOHLCVLabel({
  chartSvg,
  xScale,
  yScale,
  mouseX,
  margin,
  data,
}) {
  let width = 475
  let height = 15
  let strokeWidth = 2
  let x = xScale.range()[1] + margin.left - width - strokeWidth / 2
  let y = yScale.range()[1] + margin.top + strokeWidth / 2
  let dateIndex = Math.floor(xScale.invert(mouseX))
  let className = "OHLCBox"
  chartSvg.selectAll(`.${className}`).remove()
  let OHLCBoxG = chartSvg
    .append("g")
    .attr("class", className)
    .attr("transform", `translate(${x},${y})`)

  let rect = appendOHLCBox({
    OHLCBoxG,
    height,
    strokeWidth,
    width,
  })

  appendOHLCText({ OHLCBoxG, data: data[dateIndex], rect })
}

function appendOHLCText({ OHLCBoxG, data, rect }) {
  if (!data) return
  const fontSize = 12
  console.log(data)
  let time = new Date(data.timestamp).toLocaleString()
  let open = data.open
  let close = data.close
  let low = data.low
  let high = data.high
  let volume = data.volume

  let OHLCString = `${time} | O:${open}| H:${high}| L:${low}| C:${close}| V:${volume}`
  console.log(OHLCString)

  appendText(time, 0)
  appendText(`| O:`, 140)
  appendText(`${open}`, 160)
  appendText(`| H:`, 210)
  appendText(`${high}`, 230)
  appendText(`| L:`, 280)
  appendText(`${low}`, 300)
  appendText(`| C:`, 350)
  appendText(`${close}`, 370)
  appendText(`| V:`, 420)
  appendText(`${volume}`, 440)

  function appendText(text, x, color) {
    OHLCBoxG.append("g")
      .attr("transform", `translateX(${x})`)

      .append("text")
      .text(text)
      .attr("x", x)
      .attr("dy", fontSize)
      .attr("font-size", fontSize)
      .style("fill", color || "white")
      .attr("stroke", "none")
    // .attr("stroke", "black");
    // .attr("text-anchor", "middle");
  }
}

function appendOHLCBox({
  OHLCBoxG,

  height,
  strokeWidth,
  width,
}) {
  OHLCBoxG.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("stroke-width", strokeWidth)
    .attr("stroke", "black")
    .attr("fill", "#333")
}
