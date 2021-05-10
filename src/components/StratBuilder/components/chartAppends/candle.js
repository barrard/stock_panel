export function drawOHLC(chartSvg, data, xScale, yScale, candleCount, margin) {
  const className = "OHLC"
  const wickClass = "candle-wick"
  // yScale: scaleLinear().range([mainChartHeight, 0])
  let xRange = xScale.range()

  chartSvg.selectAll(`.${className}`).remove()
  chartSvg.selectAll(`.${wickClass}`).remove()
  const width = (xRange[1] - xRange[0]) / candleCount

  //APPEND WICK
  chartSvg
    .selectAll(`.${wickClass}`)
    .data(data)
    .enter()
    .append("line")
    .attr("class", `${wickClass}`)
    .style("stroke", "#000")
    .style("stroke-width", width / 10)
    .attr("x1", (_, i) => xScale(i))
    .attr("y1", (d) => yScale(d.high) + margin.top)
    .attr("x2", (_, i) => xScale(i))
    .attr("y2", (d) => yScale(d.low) + margin.top)

  //CANDLE BODY
  chartSvg
    .selectAll(`.${className}`)
    .data(data)
    .enter()
    .append("rect")
    .attr("class", `${className}`)
    .attr("x", (_, i) => xScale(i) - width / 2)
    .attr("y", (d) => candleY(d) + margin.top)
    .attr("width", width + "px")
    .attr("stroke-width", width / 20)
    .attr("fill", barColor)
    .attr("height", barHeight)
    .attr("stroke", "black")
    .on("mouseenter", function () {
      this.classList.add("selectedCandle")
    })
    .on("mouseleave", function () {
      this.classList.remove("selectedCandle")
    })
  function candleY(d) {
    let isUp = d.close > d.open
    let y = yScale(d.open)
    if (isUp) {
      y = yScale(d.close)
    }
    return y
  }
  function barHeight(d) {
    let isFlat = d.close === d.open
    let isUp = d.close > d.open
    let height = width / 10
    if (isUp) {
      height = yScale(d.open) - yScale(d.close)
    } else if (!isFlat) {
      height = yScale(d.close) - yScale(d.open)
    }
    return height
  }
  function barColor(d) {
    let isFlat = d.close === d.open
    let isUp = d.close > d.open
    let color = "black"
    if (isUp) {
      color = "green"
    } else if (!isFlat) {
      color = "red"
    }
    return color
  }
}
