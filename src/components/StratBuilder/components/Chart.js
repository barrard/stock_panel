import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
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

export default function MiniChart({ data, title }) {
	const svgRef = useRef();
	const [chartSvg, setChartSvg] = useState(undefined);
	const [currentZoom, setCurrentZoom] = useState();

	useEffect(() => {
		draw();
	}, [data, currentZoom, chartSvg]);

	useEffect(() => {
		setChartSvg(select(svgRef.current));
	}, []);

	const getYMinMax = (data, indicators) => {
		let [_, dataMax] = extent(data, (d) => d.high);
		let [dataMin, __] = extent(data, (d) => d.low);

		return [dataMin, dataMax];
	};

	const draw = () => {
		if (!data || !data.length) return;
		let [yMin, yMax] = getYMinMax(data);

		xScale.domain([0, data.length - 1]);
		yScale.domain([yMin - yMin * 0.0005, yMax + yMax * 0.0005]);

		if (currentZoom) {
			let newXScale = currentZoom.rescaleX(xScale);
			let [start, end] = newXScale.domain();

			xScale.domain(newXScale.domain());
			let [yMin, yMax] = getYMinMax(data.slice(Math.floor(start), Math.ceil(end)));

			yScale.domain([yMin ? yMin - yMin * 0.0005 : 0, yMax ? yMax + yMax * 0.0005 : 1]);
		}

		let xAxis = axisBottom(xScale).tickValues(xScale.domain().filter((d, i) => i % 10 === 0));
		let yAxis = axisRight(yScale).tickSize(-innerWidth);

		if (!chartSvg) return;

		chartSvg.select(".x-axis").call(xAxis);
		chartSvg.select(".y-axis").call(yAxis);
		chartSvg.selectAll(".myLine").remove();

		const myLine = line()
			.x((d, i) => {
				let x = xScale(i);
				return x;
			})
			.y((d) => {
				let y = yScale(d.close);
				return y;
			})
			.curve(curveCardinal);

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
		<div className="white">
			<div>{title}</div>
			<StyledSVG ref={svgRef}>
				<StyledXAxis className="x-axis white" />
				<StyledYAxis className="y-axis white" />
			</StyledSVG>
		</div>
	);
}

const StyledSVG = styled.svg`
	border: 1px solid red;
	width: ${width}px;
	height: ${height}px;
	background: #444;
`;

const StyledXAxis = styled.g`
	user-select: none;
	transform: translate(${margin.left}px, ${innerHeight}px);
`;

const StyledYAxis = styled.g`
	user-select: none;
	transform: translate(${width - margin.right}px);
`;
