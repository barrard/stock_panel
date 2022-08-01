import { line } from "d3";
import extrema from "../../../../indicators/indicatorHelpers/extrema";
import {
    slopeAndIntercept,
    xOfY,
    dropDuplicateMinMax,
} from "../../../../indicators/indicatorHelpers/utils.js";
export default function drawZigZagFibs(
    toggleZigzagFibs,
    chartSvg,
    ohlc,
    data,
    { xScale, yScale },
    margin,
    candleWidth,
    toggleZigZag
) {
    const fibBottomLineClassName = "fibBottomLine-zigZag";
    const fibLeftLineClassName = "fibLeftLine-zigZag";
    const priceLevelErrorClassName = `zigZagFibErrorLine`;
    const zigZagFibRetracementClassName = "zigZagFibRetracement-zigzag";

    const zigZagFibHighClassName = "fibHighs-zigzag";
    const zigZagFibLowClassName = "fibLows-zigzag";
    const zigZagFibGroupClassName = "zigZagFibGroup";
    const zigZagFibGroupIndexClassName = (i) =>
        `${zigZagFibGroupClassName} ${zigZagFibGroupClassName}-${i}`;

    chartSvg.selectAll(`.${zigZagFibGroupClassName}`).remove();
    chartSvg.selectAll(`.${zigZagFibHighClassName}`).remove();
    chartSvg.selectAll(`.${zigZagFibLowClassName}`).remove();

    chartSvg.selectAll(`.${zigZagFibRetracementClassName}`).remove();

    chartSvg.selectAll(`.${fibLeftLineClassName}`).remove();
    chartSvg.selectAll(`.${fibBottomLineClassName}`).remove();
    chartSvg.selectAll(`.${priceLevelErrorClassName}`).remove();

    console.log({ toggleZigzagFibs, toggleZigZag });
    if (!toggleZigzagFibs || !toggleZigZag) return;

    const zigZagFibsData = data.zigZagFibs;

    //make all fib lines
    const fibLines = [];
    zigZagFibsData.forEach((fibData) => {
        let x1 = fibData.firstPoint.index;
        let x2 = fibData.secondPoint.index;

        let y1 = fibData.firstPoint.val.y;
        let y2 = fibData.secondPoint.val.y;
        let { b, m, l } = slopeAndIntercept({ x1, x2, y1, y2 });
        const color =
            fibData.firstPoint.name === "high" ? "indianred" : "lawngreen";
        y1 = fibData._38;
        y2 = fibData._38;
        //find the y intercept
        x1 = xOfY({ m, b, y: y1 });
        let breaksAndHold = findTheBreakAndHolds({ x2, y2, ohlc, fibData });
        x2 = breaksAndHold[breaksAndHold.length - 1].x;

        fibLines.push({ x1, x2, y1, y2, color, fib: "38" });
        y1 = fibData._50;
        y2 = fibData._50;
        x1 = xOfY({ m, b, y: y1 });
        breaksAndHold = findTheBreakAndHolds({ x2, y2, ohlc, fibData });
        x2 = breaksAndHold[breaksAndHold.length - 1].x;
        fibLines.push({ x1, x2, y1, y2, color, fib: "50" });
        y1 = fibData._62;
        y2 = fibData._62;
        x1 = xOfY({ m, b, y: y1 });
        breaksAndHold = findTheBreakAndHolds({ x2, y2, ohlc, fibData });
        x2 = breaksAndHold[breaksAndHold.length - 1].x;

        fibLines.push({ x1, x2, y1, y2, color, fib: "62" });
    });

    function findTheBreakAndHolds({ x2, y2, ohlc, fibData }) {
        //if isResistance, we will look for prices to close ABOVE the value
        const isResistance = fibData.firstPoint.name === "high";
        const data = ohlc.slice(x2);
        let consecutiveCount = [];
        const holds = [];
        for (let x = 0; x < data.length; x++) {
            const { close } = data[x];

            if (isResistance) {
                if (close > y2) {
                    consecutiveCount.push({ y: y2, x: x + x2 });
                } else {
                    consecutiveCount = [];
                }
            } else {
                if (close < y2) {
                    consecutiveCount.push({ y: y2, x: x + x2 });
                } else {
                    consecutiveCount = [];
                }
            }

            if (consecutiveCount.length >= 3) {
                return consecutiveCount;
            }
        }
        consecutiveCount.push({ y: y2, x: x2 + 1000 });
        return consecutiveCount;
    }

    chartSvg
        .selectAll(`.${zigZagFibRetracementClassName}`)
        .data(fibLines)
        .enter()
        .append("line")
        .attr("class", `${zigZagFibRetracementClassName}`)
        .attr("x1", (d) => xScale(d.x1) + candleWidth / 2)
        .attr("x2", (d) => xScale(d.x2) + candleWidth / 2)
        .attr("y1", (d) => yScale(d.y1) + margin.top)
        .attr("y2", (d) => yScale(d.y2) + margin.top)
        .style("opacity", 0.7)

        .attr("stroke-width", 3)
        .attr("stroke", (d) => {
            return d.color;
            // if (d.fib === "38") return "blue";
            // if (d.fib === "50") return "green";
            // if (d.fib === "62") return "yellow";
        })
        .attr("clip-path", "url(#mainChart-clipBox)") //CORRECTION

        .exit();

    drawFibLine(zigZagFibsData, {
        className: zigZagFibHighClassName,
        // nodeClassName: zigZagFib_32ClassName,
        stroke: (d) =>
            d.firstPoint.name === "high" ? "indianred" : "lawngreen",
        ohlcData: ohlc,
    });

    //LEFT LINE
    chartSvg
        .selectAll(`.${fibLeftLineClassName}`)
        .data(zigZagFibsData)
        .enter()
        .append("line")
        .attr("class", `${fibLeftLineClassName}`)
        .attr("x1", (d) => xScale(d.firstPoint.index) + candleWidth / 2)
        .attr("x2", (d) => xScale(d.firstPoint.index) + candleWidth / 2)
        .attr("y1", (d) => yScale(d.firstPoint.val.y) + margin.top)
        .attr("y2", (d) => yScale(d.secondPoint.val.y) + margin.top)
        .style("opacity", 0.2)

        .attr("stroke-width", 3)
        .attr("stroke", "#aaa")
        .attr("clip-path", "url(#mainChart-clipBox)") //CORRECTION

        .exit();

    //BOTTOM LINE
    chartSvg
        .selectAll(`.${fibBottomLineClassName}`)
        .data(zigZagFibsData)
        .enter()
        .append("line")
        .attr("class", `${fibBottomLineClassName}`)
        .attr("x1", (d) => xScale(d.firstPoint.index) + candleWidth / 2)
        .attr("x2", (d) => xScale(d.secondPoint.index) + candleWidth / 2)
        .attr("y1", (d) => yScale(d.secondPoint.val.y) + margin.top)
        .attr("y2", (d) => yScale(d.secondPoint.val.y) + margin.top)
        .style("opacity", 0.2)

        .attr("stroke-width", 3)
        .attr("stroke", "#aaa")
        .attr("clip-path", "url(#mainChart-clipBox)") //CORRECTION

        .exit();

    function drawFibLine(lineData, opts = {}) {
        const ohlcData = opts.ohlcData || [];
        // const nodesClassName = opts.nodeClassName;

        chartSvg
            .selectAll(`.${opts.className}`)
            .data(lineData)
            .enter()
            .append("line")
            .attr("class", `${opts.className}`)
            .attr("x1", (d) => xScale(d.firstPoint.index) + candleWidth / 2)
            .attr("x2", (d) => xScale(d.secondPoint.index) + candleWidth / 2)
            .attr("y1", (d) => yScale(d.firstPoint.val.y) + margin.top)
            .attr("y2", (d) => yScale(d.secondPoint.val.y) + margin.top)
            .style("opacity", opts.opacity || 0.7)

            .attr("stroke-width", opts.strokeWidth || 3)
            .attr("stroke", opts.stroke)
            .attr("clip-path", "url(#mainChart-clipBox)") //CORRECTION

            .exit();
    }
}
