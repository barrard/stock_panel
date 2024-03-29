import { line, curveLinear } from "d3-shape";
import { toFixedIfNeed } from "../utilFuncs";
export function drawCrossHair({
    chartSvg,
    mouseX,
    mouseY,
    xScale,
    yScale,
    margin,
    height,
}) {
    let className = "crossHair";
    chartSvg.selectAll(`.${className}`).remove();

    //horizontal
    chartSvg
        .append("line")
        .attr("class", `${className}`)
        .style("stroke", "#000")
        .style("stroke-width", 2)
        .attr("pointer-events", "none")
        .attr("x1", xScale.range()[0])
        .attr("y1", mouseY)
        .attr("x2", xScale.range()[1])
        .attr("y2", mouseY);

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
        .attr("y2", yScale.range()[1] + margin.top);
}

let _dateIndex;
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
    const padding = 4;
    const fontSize = 12;
    let dateIndex = Math.floor(xScale.invert(mouseX));
    if (!data[dateIndex]) return;
    if (dateIndex === _dateIndex) return;
    _dateIndex = dateIndex;
    let label = new Date(
        data[dateIndex].timestamp || data[dateIndex].datetime
    ).toLocaleString();
    let className = "xAxisLabel";

    let textG = chartSvg.append("g").attr("class", `${className}`);
    let x = mouseX;
    let y = margin.top + height;

    if (hasBackground) {
        textBackground({
            className,
            chartSvg,
            x,
            y,
            shapeId: "bottom",
            padding,
        });
    }

    chartSvg.selectAll(`.${className}`).remove();
    textG = chartSvg.append("g").attr("class", `${className}`);

    textG
        .append("text")
        .attr("class", className)
        .attr("x", x)
        .attr("y", y + fontSize + (margin.bottom - fontSize) / 2)
        .text(label)
        .style("fill", "#FFFFFF")
        .attr("stroke", "none")

        .attr("font-size", fontSize + "px")
        .attr("text-anchor", "middle");
}

let _yLabel;
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
    let className = "yAxisLabel";
    let padding = 3;
    const fontSize = 12;
    mouseY = mouseY - margin.top;
    //which yScale and offset?
    if (mouseY < 0) return;
    let yScale;
    let yLabel;
    if (mouseY < mainChartHeight) {
        yScale = yScales["mainChart"].yScale;
        yLabel = yScale.invert(mouseY).toFixed(2);
    } else {
        let t = Math.floor(
            (mouseY - mainChartHeight) / indicatorHeight
        ).toFixed(0);
        let crypticScaleOffset = mainChartHeight + t * indicatorHeight;

        yScale = Object.values(yScales).filter(
            ({ yOffset }) => yOffset === crypticScaleOffset
        )[0];
        if (!yScale) {
            // ;
            return;
        }
        //this is not confusing?
        yScale = yScale.yScale;
        //how many multiples of indicatorHeight
        let whaaa = mouseY - mainChartHeight - t * indicatorHeight;
        yLabel = yScale.invert(whaaa).toFixed(2);
    }
    if (!yScale) return;

    if (yLabel === _yLabel) return;
    _yLabel = yLabel;

    let textG = chartSvg.append("g").attr("class", `${className}`);

    let [_, x] = xScale.range();
    x = x;
    let y = mouseY + margin.top;

    if (hasBackground) {
        textBackground({
            className,
            chartSvg,
            x,
            y,
            shapeId: "right",
            padding,
        });
    }

    chartSvg.selectAll(`.${className}`).remove();
    textG = chartSvg.append("g").attr("class", `${className}`);
    textG
        .append("text")
        .attr("class", className)
        .attr("x", x + padding)
        .attr("y", y)
        .text(yLabel)
        .attr("font-size", fontSize + "px")
        .attr("stroke", "none")
        .style("fill", "#FFFFFF")
        .attr("alignment-baseline", "middle");
}

function textBackground({ className, chartSvg, x, y, shapeId, padding }) {
    let h, w;
    let t = document.getElementsByClassName(className);
    if (t[0]) {
        w = t[0].getBoundingClientRect().width;
        h = t[0].getBoundingClientRect().height;
    } else return;
    className = `${className}-background`;
    chartSvg.selectAll(`.${className}`).remove();

    chartSvg
        .append("path")
        .attr("d", getAccessorPathData(shapeId, { x, y, w, h, padding }))
        .attr("fill", "green")
        .attr("class", className)
        .style("stroke-width", "1");
}

//background label path for axisAppends
function getAccessorPathData(shapeId, xy) {
    if (shapeId.toLowerCase().includes("left"))
        return axisMarkerTagAccessor(leftAxisMarkerTagLine(xy));
    if (shapeId.toLowerCase().includes("right"))
        return axisMarkerTagAccessor(rightAxisMarkerTagLine(xy));

    if (shapeId.toLowerCase().includes("bottom"))
        return axisMarkerTagAccessor(bottomAxisMarkerTagLine(xy));

    if (shapeId.toLowerCase().includes("top"))
        return axisMarkerTagAccessor(topAxisMarkerTagLine(xy));
}

const axisMarkerTagAccessor = line()
    .x((d) => d.x)
    .y((d) => d.y)
    .curve(curveLinear);

const leftAxisMarkerTagLine = (y) => [
    { x: 0, y: 0 + y },
    { x: -20, y: -10 + y },
    { x: -60, y: -10 + y },
    { x: -60, y: 10 + y },
    { x: -20, y: 10 + y },
    { x: 0, y: 0 + y },
];

const rightAxisMarkerTagLine = ({ y, x, w, h, padding }) => [
    { x: 0 + x, y: 0 + y },
    { x: x + 5, y: -(h / 2) + y - padding },
    { x: x + 60, y: -(h / 2) + y - padding },
    { x: x + 60, y: h / 2 + y },
    { x: x + 5, y: h / 2 + y },
    { x: x + 0, y: 0 + y },
];

const topAxisMarkerTagLine = (x) => [
    { x: x + 0, y: 0 },
    { x: x - 40, y: -4 },
    { x: x - 40, y: -20 },
    { x: x - 40, y: -20 },
    { x: x + 40, y: -20 },
    { x: x + 40, y: -20 },
    { x: x + 40, y: -4 },
    { x: x + 0, y: -0 },
];

const bottomAxisMarkerTagLine = ({ x, y, w, h, padding }) => [
    { x: x + 0, y: 0 + y },
    { x: x - (w / 2 + padding), y: padding + y },
    { x: x - (w / 2 + padding), y: padding + h + y + padding },

    { x: x + (w / 2 + padding), y: padding + h + y + padding },
    { x: x + (w / 2 + padding), y: padding + y },
    { x: x + 0, y: 0 + y },
];

let corner = 2;
//OHLC LABEL
export function appendOHLCVLabel({
    chartSvg,
    xScale,
    yScale,
    mouseX,
    margin,
    data,
}) {
    let width = 550;
    let height = 15;
    let strokeWidth = 2;
    let x;
    let y;
    if (corner > 3) corner = 0;
    switch (corner) {
        case 0:
            x = xScale.range()[0];

            y = yScale.range()[0];

            break;
        case 1:
            x = xScale.range()[0];

            y = yScale.range()[1] + strokeWidth;
            break;
        case 2:
            x = xScale.range()[1] - width - strokeWidth;

            y = yScale.range()[1] + strokeWidth;
            break;

        case 3:
            x = xScale.range()[1] - width - strokeWidth;

            y = yScale.range()[0];
            break;
        default:
            break;
    }
    let dateIndex = Math.floor(xScale.invert(mouseX));
    let className = "OHLCBox";
    const move = () => {
        corner++;
        appendOHLCVLabel({
            chartSvg,
            xScale,
            yScale,
            mouseX,
            margin,
            data,
        });
    };
    chartSvg.selectAll(`.${className}`).remove();
    let OHLCBoxG = chartSvg
        .append("g")
        .attr("class", className)
        .attr("transform", `translate(${x},${y})`);

    let rect = appendOHLCBox({
        OHLCBoxG,
        height,
        strokeWidth,
        width,
        move,
    });

    appendOHLCText({ OHLCBoxG, data: data[dateIndex], rect, move, dateIndex });
}

function appendOHLCText({ OHLCBoxG, data, rect, move, dateIndex }) {
    if (!data) return;
    const fontSize = 12;
    let time = new Date(data.timestamp || data.datetime).toLocaleString();
    let open = data.open;
    let close = data.close;
    let low = data.low;
    let high = data.high;
    let volume = data.volume;

    //   let OHLCString = `${time} | O:${open}| H:${high}| L:${low}| C:${close}| V:${volume}`
    let X = 0;
    const indexWidth = 20;
    const timeWidth = 70;
    const labelWidth = 11;
    const dataWidth = 25;
    appendText(`#${dateIndex}`, X);
    appendText(`| ${time}`, (X += indexWidth));
    appendText(`| O:`, (X += timeWidth));
    appendText(`${toFixedIfNeed(open)}`, (X += labelWidth));
    appendText(`| H:`, (X += dataWidth));
    appendText(`${toFixedIfNeed(high)}`, (X += labelWidth));
    appendText(`| L:`, (X += dataWidth));
    appendText(`${toFixedIfNeed(low)}`, (X += labelWidth));
    appendText(`| C:`, (X += dataWidth));
    appendText(`${toFixedIfNeed(close)}`, (X += labelWidth));
    appendText(`| V:`, (X += dataWidth));
    appendText(`${toFixedIfNeed(volume)}`, (X += labelWidth));

    function appendText(text, x = 0, color) {
        OHLCBoxG.append("g")
            .attr("transform", `translate(${x}, 0)`)

            .append("text")
            .text(text)
            .attr("x", x)
            .attr("dy", fontSize)
            .attr("font-size", fontSize)
            .style("fill", color || "white")
            .attr("stroke", "none")
            .on("click", move);

        // .attr("stroke", "black");
        // .attr("text-anchor", "middle");
    }
}

function appendOHLCBox({ OHLCBoxG, move, height, strokeWidth, width }) {
    OHLCBoxG.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("stroke-width", strokeWidth)
        .attr("stroke", "black")
        .attr("fill", "#333")
        .on("click", move);
}
