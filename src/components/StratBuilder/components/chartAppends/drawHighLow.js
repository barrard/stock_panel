export function drawHighLows(
    drawHighLow,
    chartSvg,
    ohlc,
    data,
    { xScale, yScale },
    margin
) {
    // console.log(data);
    const highClassName = "highNodes";
    const lowClassName = "lowNodes";
    // const wickClass = "candle-wick";

    chartSvg.selectAll(`.${highClassName}`).remove();
    chartSvg.selectAll(`.${lowClassName}`).remove();
    if (!drawHighLow) return;

    //APPEND High Node
    chartSvg
        .selectAll(`.${highClassName}`)
        .data(data.highNodes)
        .enter()
        .append("circle")
        .attr("class", `${highClassName}`)
        .attr("r", 5)
        .attr("cx", (d) => xScale(d.index))
        .attr("cy", (d) => yScale(d.high) + margin.top)
        .attr("fill", "red")
        .attr("stroke", "white")
        .attr("clip-path", "url(#mainChart-clipBox)") //CORRECTION
        .exit();

    //APPEND Low Node
    chartSvg
        .selectAll(`.${lowClassName}`)
        .data(data.lowNodes)
        .enter()
        .append("circle")
        .attr("class", `${lowClassName}`)
        .attr("r", 5)
        .attr("cx", (d) => xScale(d.index))
        .attr("cy", (d) => yScale(d.low) + margin.top)
        .attr("fill", "green")
        .attr("stroke", "white")
        .attr("clip-path", "url(#mainChart-clipBox)") //CORRECTION
        .exit();
}
