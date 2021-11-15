import React, { useRef, useState, useEffect } from "react";
import { StyledSVG, StyledXAxis, StyledYAxis } from "./components/styled";
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
} from "d3";
export default function MiniChart({
    title,
    data,
    setCurrentZoom,
    currentZoom,
    levelOneData,
    levelOneKeys,
}) {
    let width = 1000;
    let height = 200;
    let margin = {
        left: 20,
        right: 40,
        bottom: 20,
        top: 20,
    };
    let innerHeight = height - (margin.top + margin.bottom);
    let innerWidth = width - (margin.left + margin.right);
    let yScale = scaleLinear().range([innerHeight, 0]);
    let xScale = scaleLinear().range([margin.left, innerWidth]);
    let rScale = scaleLinear().range([1, 5]);

    const svgRef = useRef();
    const [chartSvg, setChartSvg] = useState(undefined);

    useEffect(() => {
        draw();
    }, [data, currentZoom]);

    useEffect(() => {
        console.log("MINI CHART ON LOAD");
        setChartSvg(select(svgRef.current));
    }, []);

    const draw = () => {
        if (!data || !data.length) return;
        let [yMin, yMax] = extent(data);

        xScale.domain([0, data.length - 1]);
        yScale.domain([yMin - yMin * 0.0005, yMax + yMax * 0.0005]);
        rScale.domain([yMin, yMax]);

        if (currentZoom) {
            let newXScale = currentZoom.rescaleX(xScale);
            let [start, end] = newXScale.domain();

            xScale.domain(newXScale.domain());
            let [yMin, yMax] = extent([
                ...data.slice(Math.floor(start), Math.ceil(end)),
                ...levelOneKeys
                    .map((key) =>
                        [...levelOneData[key]].slice(
                            Math.floor(start),
                            Math.ceil(end)
                        )
                    )
                    .flat(),
            ]);

            yScale.domain([
                yMin ? yMin - yMin * 0.0005 : 0,
                yMax ? yMax + yMax * 0.0005 : 1,
            ]);
        }

        let xAxis = axisBottom(xScale).tickValues(
            xScale.domain().filter((d, i) => i % 10 === 0)
        );
        let yAxis = axisRight(yScale).tickSize(-innerWidth);
        // xAxis.attr('fill', 'white')

        if (!chartSvg) return;

        chartSvg.select(".x-axis").call(xAxis);
        chartSvg.select(".y-axis").call(yAxis);
        chartSvg.selectAll(".myLine").remove();
        levelOneKeys.forEach((levelOneProp) => {
            chartSvg.selectAll(`.${levelOneProp}_line`).remove();
        });

        const myLine = line()
            // .x((d, i) => xScale(new Date(d.x).toLocaleString()))
            .x((d, i) => {
                let x = xScale(i);
                return x;
            })
            .y((d) => {
                let y = yScale(d);
                return y;
            })
            .curve(curveCardinal);

        chartSvg
            .selectAll("circle")
            .data(data)
            .join("circle")
            // .attr("r", rScale)
            .attr("cx", (_, i) => xScale(i))
            .attr("cy", yScale)
            .attr("stroke", "red")
            .exit();

        levelOneKeys.forEach((levelOneProp) => {
            chartSvg
                .selectAll(`.${levelOneProp}_circle`)
                .data(levelOneData[levelOneProp])
                .join("circle")
                // .attr("r", rScale)
                .attr("cx", (_, i) => xScale(i))
                .attr("cy", yScale)
                .attr("stroke", levelOneProp.includes("bid") ? "green" : "red")
                .exit();

            chartSvg
                .selectAll(`.${levelOneProp}_line`)
                .data([levelOneData[levelOneProp]])
                .join("path")
                .attr("class", `${levelOneProp}_line`)
                .attr("d", myLine)
                .attr("fill", "none")
                .attr("stroke", levelOneProp.includes("bid") ? "green" : "red")
                // .attr("class", "new")
                .exit();
        });

        chartSvg
            .selectAll(".myLine")
            .data([data])
            .join("path")
            .attr("class", "myLine")
            .attr("d", myLine)
            .attr("fill", "none")
            .attr("stroke", "blue")
            // .attr("class", "new")
            .exit();

        const zoomBehavior = zoom()
            .scaleExtent([0.1, 10]) //zoom in and out limit
            .translateExtent([
                [0, 0],
                [width, height],
            ]) //pan left and right
            .on("zoom", () => {
                const zoomState = zoomTransform(chartSvg.node());
                setCurrentZoom(zoomState);
            });

        chartSvg.call(zoomBehavior);
    };

    return (
        <div>
            <h3>{title}</h3>
            <StyledSVG width={width} height={height} ref={svgRef}>
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
