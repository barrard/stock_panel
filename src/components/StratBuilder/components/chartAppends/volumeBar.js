export function drawVolume(
    chartSvg,
    yScales,
    candleWidth,
    mainChartHeight,
    OHLC
) {
    let { data, xScale, yScale, margin, yOffset, height } = yScales;
    const className = "VOLUME-BAR";

    // yScale: scaleLinear().range([mainChartHeight, 0])
    let xRange = xScale.range();

    chartSvg.selectAll(`.${className}`).remove();
    const width = candleWidth;

    //CANDLE BODY
    chartSvg
        .selectAll(`.${className}`)
        .data(data)
        .enter()
        .append("rect")
        .attr("class", `${className}`)
        .attr("x", (_, i) => xScale(i) - width / 2)
        .attr("y", (d) => height + yOffset + margin.top - (height - yScale(d)))
        .attr("width", width + "px")
        .attr("stroke-width", width / 20)
        .attr("fill", (_, i) => barColor(OHLC[i]))
        .attr("height", (d) => height - yScale(d))
        .attr("stroke", "black")
        .on("mouseenter", function () {
            this.classList.add("selectedCandle");
        })
        .on("mouseleave", function () {
            this.classList.remove("selectedCandle");
        })
        .attr("clip-path", "url(#mainChartVolume-clipBox)"); //CORRECTION

    function barColor(d) {
        let isFlat = d.close === d.open;
        let isUp = d.close > d.open;
        let color = "black";
        if (isUp) {
            color = "green";
        } else if (!isFlat) {
            color = "red";
        }
        return color;
    }
}

// function candleY(d) {
//   let isUp = d.close > d.open
//   let y = yScale(d.open)
//   if (isUp) {
//     y = yScale(d.close)
//   }
//   return y
// }
// function barHeight(d) {
//   let isFlat = d.close === d.open
//   let isUp = d.close > d.open
//   let height = width / 10
//   if (isUp) {
//     height = yScale(d.open) - yScale(d.close)
//   } else if (!isFlat) {
//     height = yScale(d.close) - yScale(d.open)
//   }
//   return height
// }
