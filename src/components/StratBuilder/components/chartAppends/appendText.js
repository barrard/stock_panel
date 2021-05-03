export function removeIndicatorName(chartSvg, fullName, key) {
	let badChars = ["/", "'", '"', "(", ")", "*", ":"];
	let _fullName = fullName;
	badChars.forEach((bad) => (_fullName = _fullName.split(bad).join("")));

	_fullName = _fullName.split(" ").join("-");
	const className = `${_fullName}-${key}-fullName-indicator-label`;
	chartSvg.selectAll(`.${className}`).remove();
}

export function appendIndicatorName(
	chartSvg,
	margin,
	yScales,
	setLineSettings
) {
	const textSize = 20;

	let mainChartCount = 0;

	for (let key in yScales) {
		let {
			name,
			axis,
			yScale,
			color,
			yOffset,
			data,
			group,
			fullName,
		} = yScales[key];
		let y = yOffset + margin.top + textSize;
		let x = margin.left;

		// console.log({ mainChartCount, group, name, fullName });
		if (group === "Overlap Studies" || group === "Pattern Recognition") {
			y += mainChartCount * textSize;
			mainChartCount++;
		}

		let badChars = ["/", "'", '"', "(", ")", "*", ":"];
		let _fullName = fullName;
		badChars.forEach((bad) => (_fullName = _fullName.split(bad).join("")));

		_fullName = _fullName.split(" ").join("-");
		const className = `${_fullName}-${key}-fullName-indicator-label`;
		chartSvg.selectAll(`.${className}`).remove();

		let textG = chartSvg
			.append("g")
			.attr("class", `${className} clickable`);

		let label = textG
			.append("text")
			.attr("x", x)
			.attr("y", y)
			.attr("pointer-events", "visibleFill")
			// .attr('font-family', 'FontAwesome')
			.text(fullName)
			.style("font-size", textSize + "px")
			.attr("stroke", "none")
			// .attr("stroke-width", "0.1px")
			.style("fill", color);
		let h, w;
		let t = document.getElementsByClassName(className);
		if (t[0]) {
			w = t[0].getBoundingClientRect().width;
			h = t[0].getBoundingClientRect().height;
		}
		let background;
		label.on("mouseover", function () {
			background = chartSvg.append("rect");
			background
				.attr("x", x)
				.attr("y", y - (h - 5))
				.attr("width", w)
				.attr("height", h)
				.style("stroke", "blue")
				.style("stroke-width", "3")
				.style("fill", "none");
		});
		label.on("mouseout", function () {
			background.remove();
		});
		textG //the Cog Icon
			.append("text")
			.attr("class", "fa clickable")
			.attr("x", w + 22)
			.attr("y", y)
			// .attr('font-family', 'FontAwesome')
			.text("\uf013")
			.attr("stroke", "white")
			.attr("stroke-width", "0.3px")
			.style("fill", "black")
			.style("font-size", textSize + "px")
			.on("click", () => setLineSettings(yScales[key], "outReal", key));
	}
}
