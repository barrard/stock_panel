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

export function drawOHLC(chartSvg, data, xScale, yScale, candleCount, margin) {
	const className = "OHLC";
	const wickClass = "candle-wick";
	// yScale: scaleLinear().range([mainChartHeight, 0])
	let xRange = xScale.range();

	chartSvg.selectAll(`.${className}`).remove();
	chartSvg.selectAll(`.${wickClass}`).remove();
	const width = (xRange[1] - xRange[0]) / candleCount;

	//APPEND WICK
	chartSvg
		.selectAll(`.${wickClass}`)
		.data(data)
		.enter()
		.append("line")
		.attr("class", `${wickClass}`)
		.style("stroke", "#000")
		.style("stroke-width", width / 10)
		.attr("x1", (_, i) => xScale(i))
		.attr("y1", (d) => yScale(d.high) + margin.top)
		.attr("x2", (_, i) => xScale(i))
		.attr("y2", (d) => yScale(d.low) + margin.top);

	chartSvg
		.selectAll(`.${className}`)
		.data(data)
		.enter()
		.append("rect")
		.attr("class", `${className}`)
		.attr("x", (_, i) => xScale(i) - width / 2)
		.attr("y", (d) => candleY(d) + margin.top)
		.attr("width", width + "px")
		.attr("stroke-width", width / 20)
		.attr("fill", barColor)
		.attr("height", barHeight)
		.attr("stroke", "black")
		.on("mouseenter", function () {
			this.classList.add("selectedCandle");
		})
		.on("mouseleave", function () {
			this.classList.remove("selectedCandle");
		});
	function candleY(d) {
		let isUp = d.close > d.open;
		let y = yScale(d.open);
		if (isUp) {
			y = yScale(d.close);
		}
		return y;
	}
	function barHeight(d) {
		let isFlat = d.close === d.open;
		let isUp = d.close > d.open;
		let height = yScale(0) - yScale(0.01);
		if (isUp) {
			height = yScale(d.open) - yScale(d.close);
		} else if (!isFlat) {
			height = yScale(d.close) - yScale(d.open);
		}
		return height;
	}
	function barColor(d) {
		let isFlat = d.close === d.open;
		let isUp = d.close > d.open;
		let height = "black";
		if (isUp) {
			height = "green";
		} else if (!isFlat) {
			height = "red";
		}
		return height;
	}
}

function appendCandle(
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
