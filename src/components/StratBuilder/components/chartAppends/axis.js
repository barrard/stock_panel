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

export function drawXAxis({ className, xScale, data, chartSvg }) {
	let xAxis = axisBottom(xScale)
		.ticks(3)
		.tickFormat((d) => {
			if (!data[d]) return;
			return new Date(data[d].timestamp).toLocaleString();
		});

	chartSvg.select(`.${className}`).call(xAxis);
}

export function drawYAxis({ key, yScales, innerWidth, chartSvg }) {
	let { name, yScale, group } = yScales[key];
	let className = `${name}-${key}-y-axis`;
	yScales[key].axis = axisRight(yScale).tickSize(-innerWidth);
	if (name === "mainChart") {
		//TRY TO CALL THIS Y-AXIS JUST ONCE
		chartSvg.select(`.${className}`).call(yScales[key].axis);
	} else if (group !== "Overlap Studies") {
		//ALL OVER NON-MAIN CHART Y_AXES
		// chartSvg.select(`.${name}-${key}-y-axis`).call(axis);

		chartSvg.select(`.${className}`).call(yScales[key].axis);
	}

	chartSvg.select(`.${className}`).call(yScales[key].axis);
}
