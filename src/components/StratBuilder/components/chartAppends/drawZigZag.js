import { line } from "d3";
export default function drawZigZag(
    drawZigZag,
    chartSvg,
    ohlc,
    data,
    { xScale, yScale },
    margin,
    candleWidth,
    toggleZigzagRegression
) {
    // console.log(data);

    const zigZagLocalMinMaxClassName = "localMinMax-zigzag";
    const zigZagSwingHighClassName = "swingHighNodes";
    const zigZagSwingLowClassName = "swingLowNodes";
    const zigZagSwingHighLowClassName = "swingHighLow";
    const zigZagClassName = "ZIGZAG";
    // const wickClass = "candle-wick";

    chartSvg.selectAll(`.${zigZagLocalMinMaxClassName}`).remove();
    chartSvg.selectAll(`.${zigZagSwingHighClassName}`).remove();
    chartSvg.selectAll(`.${zigZagSwingLowClassName}`).remove();
    chartSvg.selectAll(`.${zigZagSwingHighLowClassName}`).remove();
    chartSvg.selectAll(`.${zigZagClassName}`).remove();
    if (!drawZigZag) return;

    const highs = data.zigZag.swings.filter((d) => d.name === "high");
    const lows = data.zigZag.swings.filter((d) => d.name === "low");
    const minMax = data.zigZag.smoothMinMax;

    //APPEND ZIGZAG LINE
    const myLine = line()
        .x((d, i) => {
            let x = xScale(d.index) + candleWidth / 2;
            return x;
        })
        .y((d) => {
            let y = yScale(d.val.y) + margin.top;
            return y;
        });

    chartSvg
        .selectAll(`.${zigZagClassName}`)
        .data([data.zigZag.swings])
        .join("path")
        .attr("class", `${zigZagClassName} clickable`)
        .attr("d", myLine)
        .attr("fill", "none")
        .attr("stroke-width", "3")
        .attr("stroke", (d) => {
            return d.name == "high" ? "red" : "green";
        })
        .style("opacity", 0.5)

        .attr("clip-path", "url(#mainChart-clipBox)") //CORRECTION

        .exit();

    //APPEND High Node
    chartSvg
        .selectAll(`.${zigZagSwingHighClassName}`)
        .data(highs)
        .enter()
        .append("circle")
        .attr("class", `${zigZagSwingHighClassName}`)
        .attr("r", toggleZigzagRegression ? 2 : 6)
        .attr("cx", (d) => xScale(d.index) + candleWidth / 2)
        .attr("cy", (d) => yScale(d.val.y) + margin.top)
        .attr("fill", "yellow")
        .attr("stroke", "none")
        .attr("stroke-width", 1)

        .attr("clip-path", "url(#mainChart-clipBox)") //CORRECTION

        .exit();

    //APPEND Low Node
    chartSvg
        .selectAll(`.${zigZagSwingLowClassName}`)
        .data(lows)
        .enter()
        .append("circle")
        .attr("class", `${zigZagSwingLowClassName}`)
        .attr("r", toggleZigzagRegression ? 2 : 6)
        .attr("cx", (d) => xScale(d.index) + candleWidth / 2)
        .attr("cy", (d) => yScale(d.val.y) + margin.top)
        .attr("fill", "purple")
        .attr("stroke", "white")
        .attr("stroke-width", 1)

        .attr("clip-path", "url(#mainChart-clipBox)") //CORRECTION

        .exit();
}
