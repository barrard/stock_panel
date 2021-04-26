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

export function appendChartPatterns(chartSvg, patterns, closeData) {
	patterns.forEach((pattern) => {
		debugger;
		let {
			xScale,
			yScale,
			data: {
				begIndex,
				result: { outInteger },
			},
			name,
			fullName,
			textSize = 16,
			color,
			yOffset,
			margin,
		} = pattern;
		debugger;

		let bullish = outInteger.reduce(
			(marks, val, i) => (val > 0 ? { ...marks, [i]: true } : marks),
			{}
		);
		let bearish = outInteger.reduce(
			(marks, val, i) => (val < 0 ? { ...marks, [i]: true } : marks),
			{}
		);

		let className = `bullish-${name}-pattern`;
		chartSvg.selectAll(`.${className}`).remove();
		appendPatternMarkers(
			chartSvg,
			Object.keys(bullish),
			className,
			"green",
			margin,
			yOffset,
			xScale,
			yScale,
			closeData,
			fullName
		);

		className = `bearish-${name}-pattern`;
		chartSvg.selectAll(`.${className}`).remove();
		appendPatternMarkers(
			chartSvg,
			Object.keys(bearish),
			className,
			"red",
			margin,
			yOffset,
			xScale,
			yScale,
			closeData,
			fullName
		);
	});
}

function appendPatternMarkers(
	chartSvg,
	data,
	className,
	color,
	margin,
	yOffset,
	xScale,
	yScale,
	closeData,
	fullName
) {
	let textSize = 20;
	let patternLabel = "pattern-label-u";
	chartSvg
		.selectAll(`.${className}`)
		.data(data)
		.enter()
		// .append("text")
		.append("circle")
		.attr("class", `${className}  clickable`)
		.attr("cx", (barIndex) => {
			let x = xScale(parseInt(barIndex));
			return x;
		})
		.attr("cy", (barIndex) => {
			let y = yScale(closeData[barIndex]) + (yOffset + margin.top);
			return y;
		})
		.attr("r", 5)
		// .text("\uf013")
		// .attr("stroke", "white")
		// .attr("stroke-width", "0.3px")
		.style("fill", color)
		.on("mouseover", function (a, e, i) {
			console.log(a);
			console.log(e);
			console.log(i);
			console.log(select(this));
			console.log(select(this).attr("cy"));
			console.log(select(this).attr("cx"));
			let x = select(this).attr("cx");
			let y = select(this).attr("cy");
			chartSvg
				.append("text")
				.attr("pointer-events", "none")
				.attr("class", `${patternLabel}`)
				.text(fullName)
				.attr("x", x + "px")
				.attr("y", y + "px")
				.attr("text-anchor", "middle")

				.attr("stroke", "white")
				.attr("stroke-width", "2px")
				.style("fill", "black")
				.style("font-size", textSize + "px");
		})
		.on("mouseout", function () {
			console.log(fullName);
			chartSvg.selectAll(`.${patternLabel}`).remove();
		});
	// .style("font-size", textSize + "px");
}
export function handleLineClick(e) {
	console.log(e);
}

export function clearSelectedLine(chartSvg) {
	let className = `selectedLine`;
	chartSvg.selectAll(`.${className}`).remove();
}
