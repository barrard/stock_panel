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
} from "d3";
import { drawOHLC, drawVolume } from "../chartAppends";
export default function drawIndicator({
    yScales,
    key,
    chartPatterns,
    candleWidth,
    chartSvg,
    setLineSettings,
    mainChartHeight,
    margin,
    padLeft,
}) {
    let { name, axis, yScale, xScale, color, yOffset, data, group, fullName } =
        yScales[key];

    // console.log(yScale.range());
    // console.log(yOffset);
    // console.log(xScale.range());

    function openLineSettings(indicatorData, lineName, key) {
        //toggle, and set
        setLineSettings({ indicatorData, lineName, key });
    }

    if (group === "Pattern Recognition") {
        chartPatterns.push(yScales[key]);
        return;
    }
    //LINES FOR THE CHART
    let lines = {};
    if (!data.result) {
        // debugger
        // console.log(candleWidth);
        if (group === "Volume") {
            // console.log("draw volume");
            let OHLC = yScales.mainChart.data;
            drawVolume(
                chartSvg,
                yScales[key],
                candleWidth,
                mainChartHeight,
                OHLC
            );
        } else {
            //ASSUMED OHLC
            //drawOHLC
            drawOHLC(chartSvg, data, xScale, yScale, candleWidth, margin);
            // lines.close = closeData = data.map((d) => d.close);
        }
    } else {
        //ASSUMED INDICATOR
        let paddedLines = padLeft(data);
        lines = { ...lines, ...paddedLines };
    }

    //LOOP OVER ALL LINES AND DRAW
    for (let lineName in lines) {
        let lineData = lines[lineName];
        let lineColor = color[lineName];
        // console.log(lineData);

        let className = `${lineName}-${key}-myLine`;
        // let className = `${lineName}-myLine ${group}-lineGroup ${name}-indicatorName`;
        chartSvg.selectAll(`.${className}`).remove();
        className = `${className} indicator-${key}`;
        const myLine = line()
            .x((d, i) => {
                let x = xScale(i);
                return x;
            })
            .y((d) => {
                let y = yScale(d.close || d) + yOffset + margin.top;
                return y;
            });

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
                this.classList.add("selectedLine");
            })
            .on("mouseleave", function () {
                this.classList.remove("selectedLine");
            })
            .on("click", (e) => {
                openLineSettings(yScales[key], yScales[key].name, key);
            })
            .attr("clip-path", `url(#${key}-clipBox)`)

            .exit();
    }
}
