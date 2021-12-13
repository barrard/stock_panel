export default function drawPriceLevels(
    drawPriceLevels,
    chartSvg,
    ohlc,
    data,
    { xScale, yScale },
    margin,
    priceLevelSensitivity,
    innerWidth
) {
    console.log("drawPriceLevels");

    const highClassName = "importantPriceRangeHigh";
    const lowClassName = "importantPriceRangeLow";
    const priceLevelClassName = "importantPriceLevel";
    const nodesClassName = "nearByNodes";
    console.log(data);
    const priceLevels = data.priceLevels.reduce((acc, priceLevel) => {
        if (Array.isArray(priceLevel)) {
            //get the minimum timestamp
            let index = Math.min(...priceLevel.map((pl) => pl.index));
            //get the avg of all the priceLevel values
            let avg =
                priceLevel.reduce(
                    (acc, priceLevel) => acc + priceLevel.value,
                    0
                ) / priceLevel.length;
            return [...acc, { value: avg, index, nodes: priceLevel }];
        }
        //if not an array, then return the priceLevel value and timestamp
        return [...acc, { ...priceLevel, nodes: [priceLevel] }];
    }, []);

    console.log(priceLevels);

    chartSvg.selectAll(`.${highClassName}`).remove();
    chartSvg.selectAll(`.${lowClassName}`).remove();
    chartSvg.selectAll(`.${priceLevelClassName}`).remove();
    if (!drawPriceLevels) return;

    //APPEND High Node
    chartSvg
        .selectAll(`.${highClassName}`)
        .data(priceLevels)
        .enter()
        .append("rect")
        .attr("class", `${highClassName}`)
        .attr("x", (d) => xScale(d.index))
        .attr("y", (d) => {
            return (
                yScale(d.value) -
                Math.abs(
                    yScale(d.value) -
                        yScale(
                            d.value - d.value * (priceLevelSensitivity / 10000)
                        )
                ) +
                margin.top
            ); //100 is magic number?
        })
        .attr("height", (d) => {
            return Math.abs(
                yScale(d.value) -
                    yScale(d.value - d.value * (priceLevelSensitivity / 10000))
            ); //100 is magic number?
        })
        .attr("width", (d) => {
            return 9999999;
            // return xScale.domain()[1] - xScale.domain()[0];
        })
        .attr("fill", "url(#priceLevelGradientGreen)")
        .attr("stroke", "none")
        .attr("clip-path", "url(#mainChart-clipBox)") //CORRECTION
        // .on("mouseover", (d, i, n) => {
        //     console.log(d, n);
        //     chartSvg.selectAll(`.${nodesClassName}`).remove();
        //     // this.setAttribute("stroke", "red");
        //     // n.attr("stroke", "red");

        //     console.log(d);
        //     chartSvg
        //         .selectAll(`.${nodesClassName}`)
        //         .data(d.nodes)
        //         .enter()
        //         .append("circle")
        //         .attr("class", `${nodesClassName}`)
        //         .attr("r", 5)
        //         .attr("cx", (d) => xScale(d.index))
        //         .attr("cy", (d) => yScale(d.value) + margin.top)
        //         .attr("fill", "blue")
        //         .attr("stroke", "white")
        //         .attr("clip-path", "url(#mainChart-clipBox)") //CORRECTION
        //         .exit();
        // })
        // .on("mouseout", () => chartSvg.selectAll(`.${nodesClassName}`).remove())

        .exit();

    //APPEND Low Node
    chartSvg
        .selectAll(`.${lowClassName}`)
        .data(priceLevels)
        .enter()
        .append("rect")
        .attr("class", `${lowClassName}`)
        .attr("x", (d) => xScale(d.index))
        .attr("y", (d) => yScale(d.value) + margin.top)

        .attr("height", (d) => {
            return Math.abs(
                yScale(d.value) -
                    yScale(d.value - d.value * (priceLevelSensitivity / 10000))
            ); //10000 is magic number?
        })
        .attr("width", (d) => {
            return 100000;
            return xScale(xScale.range()[1] - d.index);
        })
        .attr("fill", "url(#priceLevelGradientRed)")
        .attr("stroke", "none")
        .attr("clip-path", "url(#mainChart-clipBox)") //CORRECTION
        // .on("mouseover", (d) => {
        //     console.log(d);
        //     chartSvg.selectAll(`.${nodesClassName}`).remove();

        //     chartSvg
        //         .selectAll(`.${nodesClassName}`)
        //         .data(d.nodes)
        //         .enter()
        //         .append("circle")
        //         .attr("class", `${nodesClassName}`)
        //         .attr("r", 5)
        //         .attr("cx", (d) => xScale(d.index))
        //         .attr("cy", (d) => yScale(d.value) + margin.top)
        //         .attr("fill", "blue")
        //         .attr("stroke", "white")
        //         .attr("clip-path", "url(#mainChart-clipBox)") //CORRECTION
        //         .exit();
        // })
        // .on("mouseout", () => chartSvg.selectAll(`.${nodesClassName}`).remove())
        .exit();

    //APPEND Price Level
    chartSvg
        .selectAll(`.${priceLevelClassName}`)
        .data(priceLevels)
        .enter()
        .append("line")
        .attr("class", `${priceLevelClassName}`)
        .attr("x1", (d) => xScale(d.index))
        .attr("x2", 9999999)
        .attr("y1", (d) => yScale(d.value) + margin.top)
        .attr("y2", (d) => yScale(d.value) + margin.top)
        .style("opacity", 0.7)

        .attr("stroke-width", 3)
        .attr("stroke", (d) => {
            return "lawngreen";
        })
        .attr("clip-path", "url(#mainChart-clipBox)") //CORRECTION
        .on("mouseover", (d) => {
            console.log(d);
            chartSvg.selectAll(`.${nodesClassName}`).remove();

            chartSvg
                .selectAll(`.${nodesClassName}`)
                .data(d.nodes)
                .enter()
                .append("circle")
                .attr("class", `${nodesClassName}`)
                .attr("r", 5)
                .attr("cx", (d) => xScale(d.index))
                .attr("cy", (d) => yScale(d.value) + margin.top)
                .attr("fill", (d) => (d.highLow === "high" ? "red" : "green"))
                .attr("stroke", "white")
                .attr("clip-path", "url(#mainChart-clipBox)") //CORRECTION
                .exit();
        })
        .on("mouseout", () => chartSvg.selectAll(`.${nodesClassName}`).remove())

        .exit();
}
