import { line } from "d3";
export default function drawZigZag(
    drawZigZag,
    chartSvg,
    ohlc,
    data,
    { xScale, yScale },
    margin,
    candleWidth
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

    //APPEND minMax
    // chartSvg
    //     .selectAll(`.${zigZagSwingHighLowClassName}`)
    //     .data(minMax)
    //     .enter()
    //     .append("circle")
    //     .attr("class", `${zigZagSwingHighLowClassName}`)
    //     .attr("r", 5)
    //     .attr("cx", (d) => xScale(d.index))
    //     .attr("cy", (d) => yScale(d.val.y) + margin.top)
    //     .attr("fill", (d) =>
    //         d.name === "high"
    //             ? "red"
    //             : d.name === "low"
    //             ? "green"
    //             : d.name === "both"
    //             ? "blue"
    //             : "pink"
    //     )
    //     .attr("stroke", "yellow")
    //     .attr("clip-path", "url(#mainChart-clipBox)") //CORRECTION
    //     .exit();

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
        // .attr("pointer-events", "stroke")

        // .attr("pointer-events", "auto")
        // .on("mouseenter", function () {
        //     this.classList.add("selectedLine");
        // })
        // .on("mouseleave", function () {
        //     this.classList.remove("selectedLine");
        // })
        // .on("click", (e) => {
        //     openLineSettings(yScales[key], yScales[key].name, key);
        // })
        .attr("clip-path", "url(#mainChart-clipBox)") //CORRECTION

        .exit();

    //append local min max
    //APPEND smoothMinMax Node
    // chartSvg
    //     .selectAll(`.${zigZagLocalMinMaxClassName}`)
    //     .data(data.zigZag.smoothMinMax)
    //     .enter()
    //     .append("circle")
    //     .attr("class", `${zigZagLocalMinMaxClassName}`)
    //     .attr("r", 4)
    //     .attr("cx", (d) => xScale(d.index) + candleWidth / 2)
    //     .attr("cy", (d) => {
    //         if (d.val.y) {
    //             return yScale(d.val.y) + margin.top;
    //         } else {
    //             return yScale(d.val.high) + margin.top;
    //         }
    //     })
    //     .attr("fill", (d) => {
    //         if (d.name === "both") {
    //             return "blue";
    //         } else {
    //             return "goldenrod";
    //         }
    //     })
    //     .attr("stroke", "none")
    //     .attr("stroke-width", 1)

    //     .attr("clip-path", "url(#mainChart-clipBox)") //CORRECTION

    //     .exit();

    //APPEND High Node
    chartSvg
        .selectAll(`.${zigZagSwingHighClassName}`)
        .data(highs)
        .enter()
        .append("circle")
        .attr("class", `${zigZagSwingHighClassName}`)
        .attr("r", 6)
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
        .attr("r", 6)
        .attr("cx", (d) => xScale(d.index) + candleWidth / 2)
        .attr("cy", (d) => yScale(d.val.y) + margin.top)
        .attr("fill", "purple")
        .attr("stroke", "white")
        .attr("stroke-width", 1)

        .attr("clip-path", "url(#mainChart-clipBox)") //CORRECTION

        .exit();
}
