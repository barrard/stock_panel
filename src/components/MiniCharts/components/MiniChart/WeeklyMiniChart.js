import React, { useRef, useState, useEffect } from "react";
import { StyledSVG, StyledXAxis, StyledYAxis } from "./components/styled";
import {
    axisRight,
    axisBottom,
    curveCardinal,
    extent,
    line,
    // scaleBand,
    scaleLinear,
    select,
    // zoom,
    // zoomTransform,
} from "d3";

import MyLine from "./MyLine";
import { addCandleWicks } from "../../../charts/chartHelpers/candleStickUtils";
import addClip from "./addClip";
export default function MiniChart({
    title,
    ohlc,
    width,
    height,
    weeklyPriceLevels,
}) {
    width = width || 1000;
    height = height || 200;
    let margin = {
        left: 0,
        right: 30,
        bottom: 20,
        top: 0,
    };
    let innerHeight = height - (margin.top + margin.bottom);
    let innerWidth = width - (margin.left + margin.right);
    let yScale = scaleLinear().range([innerHeight, margin.top]);
    let xScale = scaleLinear().range([margin.left, innerWidth]);
    let rScale = scaleLinear().range([1, 5]);

    const svgRef = useRef();
    const [chartSvg, setChartSvg] = useState(undefined);
    // const [currentZoom, setCurrentZoom] = useState();
    const [data, setData] = useState([]);
    const [xData, setXData] = useState([]);
    const [myLine, setMyLine] = useState(false);

    useEffect(() => {
        draw();
    }, [data, weeklyPriceLevels]);

    useEffect(() => {
        setChartSvg(() => {
            console.log("MINI CHART ON LOAD");
            const svgChart = svgRef.current;

            let myLine = new MyLine(xScale, yScale, svgChart.current);

            setMyLine(myLine);

            return select(svgChart);
        });
    }, [svgRef]);

    useEffect(() => {
        console.log(weeklyPriceLevels);
        setData(ohlc.map((d) => d.close));
        setXData(ohlc.map((d) => d.datetime));
    }, [ohlc]);

    const draw = () => {
        if (weeklyPriceLevels) {
            console.log({ weeklyPriceLevels });
        }
        if (!data || !data.length) return;
        console.log("draw data");
        let [yMin, yMax] = extent(data);

        xScale.domain([0 - 10, data.length - 1 + 10]);
        yScale.domain([yMin - yMin * 0.2, yMax + yMax * 0.2]);
        rScale.domain([yMin, yMax]);

        let xAxis = axisBottom(xScale)
            .tickValues([10, 50, 99])
            .tickFormat((d) => new Date(xData[d]).toDateString());
        let yAxis = axisRight(yScale).tickSize(-innerWidth);

        if (!chartSvg) return;

        addClip({ chartSvg, margin, innerWidth, innerHeight });

        chartSvg.select(".x-axis").call(xAxis);
        chartSvg.select(".y-axis").call(yAxis);
        let myLine = new MyLine(xScale, yScale, chartSvg, margin);

        myLine.draw(chartSvg, data, weeklyPriceLevels, xScale, yScale);
    };

    return (
        <div>
            <h3>{title}</h3>
            <StyledSVG width={width} height={height} ref={svgRef}>
                <defs />
                <StyledXAxis
                    margin={margin}
                    innerHeight={innerHeight}
                    className="x-axis white"
                />
                <StyledYAxis
                    width={width}
                    margin={margin}
                    className="y-axis white"
                />
            </StyledSVG>
        </div>
    );
}
