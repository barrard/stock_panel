import { line } from "d3";
import extrema from "../../../../indicators/indicatorHelpers/extrema";
export default function drawZigZagRegression(
    toggleZigzagRegression,
    chartSvg,
    ohlc,
    data,
    { xScale, yScale },
    margin,
    candleWidth
) {
    const zigZagRegressionHighClassName = "regressionHighs-zigzag";
    const zigZagRegressionLowClassName = "regressionLows-zigzag";

    const zigZagRegressionHighPointsClassName =
        "zigZagRegressionHighPoints-zigzag";
    const zigZagRegressionLowPointsClassName =
        "zigZagRegressionLowPoints-zigzag";

    const priceLevelErrorClassName = `zigZagRegressionErrorLine`;

    chartSvg.selectAll(`.${zigZagRegressionHighClassName}`).remove();
    chartSvg.selectAll(`.${zigZagRegressionLowClassName}`).remove();

    chartSvg.selectAll(`.${zigZagRegressionHighPointsClassName}`).remove();
    chartSvg.selectAll(`.${zigZagRegressionLowPointsClassName}`).remove();
    chartSvg.selectAll(`.${priceLevelErrorClassName}`).remove();

    if (!toggleZigzagRegression) return;

    const highs = data.regressionZigZag.regressionHighLines;
    const lows = data.regressionZigZag.regressionLowLines;

    drawRegressionLine(highs, {
        className: zigZagRegressionHighClassName,
        nodeClassName: zigZagRegressionHighPointsClassName,
        stroke: "lawngreen",
        ohlcData: ohlc,
    });

    drawRegressionLine(lows, {
        className: zigZagRegressionLowClassName,
        nodeClassName: zigZagRegressionLowPointsClassName,
        stroke: "indianred",
        ohlcData: ohlc,
    });

    function drawRegressionLine(lineData, opts = {}) {
        const ohlcData = opts.ohlcData || [];
        const nodesClassName = opts.nodeClassName;

        chartSvg
            .selectAll(`.${opts.className}`)
            .data(lineData)
            .enter()
            .append("line")
            .attr("class", `${opts.className}`)
            .attr("x1", (d) => xScale(d.x1) + candleWidth / 2)
            .attr("x2", (d) => xScale(d.x2) + candleWidth / 2)
            .attr("y1", (d) => yScale(d.y1) + margin.top)
            .attr("y2", (d) => yScale(d.y2) + margin.top)
            .style("opacity", opts.opacity || 0.7)

            .attr("stroke-width", opts.strokeWidth || 3)
            .attr("stroke", (d) => opts.stroke || "lawngreen")
            .attr("clip-path", "url(#mainChart-clipBox)") //CORRECTION
            .on("mouseover", function (lineData, i) {
                this.classList.add("selectedLine");

                console.log(lineData);
                chartSvg.selectAll(`.${nodesClassName}`).remove();

                chartSvg
                    .selectAll(`.${nodesClassName}`)
                    .data(lineData.nearbyPoints)
                    .enter()
                    .append("circle")
                    .attr("class", `${nodesClassName}`)
                    .attr("r", 7)
                    .attr("cx", (d, i) => {
                        const dotX = xScale(d.x) + candleWidth / 2;
                        const regressionY = lineData.m * d.x + lineData.b;

                        let length = extrema.pythagorean(
                            dotX,
                            dotX,
                            regressionY,
                            d.y
                        );
                        console.log(length);
                        chartSvg
                            .selectAll(`.${`${priceLevelErrorClassName}${i}`}`)
                            .data([d])
                            .enter()
                            .append("line")
                            .attr(
                                "class",
                                `${`${priceLevelErrorClassName}${i} ${priceLevelErrorClassName}`}`
                            )
                            .attr("x1", (d) => xScale(d.x) + candleWidth / 2)
                            .attr("x2", (d) => xScale(d.x) + candleWidth / 2)
                            .attr("y1", (d) => yScale(regressionY) + margin.top)
                            .attr("y2", (d) => yScale(d.y) + margin.top)
                            .attr("stroke-width", opts.strokeWidth || 3)
                            .attr("stroke", (d) => "goldenrod")
                            .attr("clip-path", "url(#mainChart-clipBox)"); //CORRECTION

                        return dotX;
                    })
                    .attr("cy", (d) => yScale(d.y) + margin.top)
                    .attr("fill", opts.stroke)
                    .attr("stroke", "white")
                    .attr("clip-path", "url(#mainChart-clipBox)") //CORRECTION
                    .exit();
            })
            .on("mouseout", function (lineData) {
                this.classList.remove("selectedLine");

                chartSvg.selectAll(`.${nodesClassName}`).remove();
                lineData.nearbyPoints.forEach((_, i) =>
                    chartSvg
                        .selectAll(`.${`${priceLevelErrorClassName}${i}`}`)
                        .remove()
                );
            })

            .exit();
    }
}
