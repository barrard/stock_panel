import { scaleLinear, scaleTime } from "d3-scale";
import { extent, max, min } from "d3-array";

export default function drawVolProfile(
    toggleVolProfile,
    chartSvg,
    data,
    yScales,
    margin,
    width
) {
    const profileBarClassName = "volProfileBar";
    const valueAreaClassName = "valueArea";
    const POC_ClassName = "POC_VolProfile";
    const { volProfile, valueAreaHigh, valueAreaLow, POC } = data;
    const { yScale } = yScales;
    chartSvg.selectAll(`.${profileBarClassName}`).remove();
    chartSvg.selectAll(`.${valueAreaClassName}`).remove();
    chartSvg.selectAll(`.${POC_ClassName}`).remove();

    const innerWidth = width - (margin.left + margin.right);
    const halfWidth = innerWidth * 0.5;
    if (!toggleVolProfile) return;

    const xScale = scaleLinear().range([
        halfWidth + margin.left,
        width - margin.right,
    ]);
    const [profileMin, profileMax] = extent(Object.values(volProfile));

    xScale.domain([profileMax, 0]);

    const height =
        yScale(yScale.domain()[0]) - yScale(yScale.domain()[0] + 0.01);

    //Profile Bars
    chartSvg
        .selectAll(`.${profileBarClassName}`)
        .data(Object.keys(volProfile))
        .enter()
        .append("rect")
        .attr("class", `${profileBarClassName}`)
        .attr("x", (d) => {
            return xScale(volProfile[d]);
        })
        .attr("width", (d) => xScale(0) - xScale(volProfile[d]))
        .attr("y", (d) => {
            return yScale(parseFloat(d) + 0.005) + margin.top;
        })
        .attr("height", (d) => height)

        .style("opacity", 0.5)

        .attr("stroke-width", 0.1)
        .attr("stroke", "black")
        .attr("fill", "teal")
        // .attr("clip-path", "url(#mainChart-clipBox)") //CORRECTION

        .exit();

    // chartSvg.selectAll(`.${"test_profilCirc"}`).remove();

    // chartSvg
    //     .selectAll(".test_profilCirc")
    //     .attr("class", `${"test_profilCirc"}`)
    //     .data(Object.keys(volProfile))
    //     .join("circle")
    //     .attr("r", 3)
    //     .attr("cx", (d) => xScale(volProfile[d]))
    //     .attr("cy", (d) => yScale(parseFloat(d - 0.01)) + margin.top)
    //     .attr("stroke-width", 2)
    //     .attr("stroke", "red")

    //     .exit();

    // chartSvg.selectAll(`.${"test_profileText"}`).remove();

    // chartSvg

    //     .selectAll(".test_profileText")

    //     .data(Object.keys(volProfile))
    //     .enter()

    //     .append("text")
    //     .attr("class", `${"test_profileText"}`)

    //     .text((d) => volProfile[d])
    //     .attr("x", (d) => xScale(volProfile[d]))
    //     .attr("y", (d) => yScale(parseFloat(d)) + margin.top)
    //     .attr("font-size", "1.5em")
    //     .style("fill", "white")
    //     .attr("text-anchor", "middle")

    //     .attr("stroke", "none");

    // chartSvg.selectAll(`.${"test_profileText2"}`).remove();

    // chartSvg

    //     .selectAll(".test_profileText2")

    //     .data(Object.keys(volProfile))
    //     .enter()

    //     .append("text")
    //     .attr("class", `${"test_profileText2"}`)

    //     .text((d) => d)
    //     .attr("x", (d) => xScale(volProfile[d]) - 100)
    //     .attr("y", (d) => yScale(parseFloat(d)) + margin.top)
    //     .attr("font-size", "1.5em")
    //     .style("fill", "#aaa")
    //     .attr("text-anchor", "middle")

    //     .attr("stroke", "none");

    //valueArea High
    //APPEND Price Level
    chartSvg
        .selectAll(`.${valueAreaClassName}`)
        .data([parseFloat(valueAreaHigh), parseFloat(valueAreaLow)])
        .enter()
        .append("line")
        .attr("class", `${valueAreaClassName}`)
        .attr("x1", (d) => halfWidth)
        .attr("x2", 9999999)
        .attr("y1", (d) => {
            return yScale(d) + margin.top;
        })
        .attr("y2", (d) => {
            return yScale(d) + margin.top;
        })
        .style("opacity", 0.7)

        .attr("stroke-width", 3)
        .attr("stroke", (d) => {
            return "goldenrod";
        })
        .attr("clip-path", "url(#mainChart-clipBox)") //CORRECTION
        //  .on("mouseover", (d) => {
        // 	 console.log(d);
        // 	 chartSvg.selectAll(`.${nodesClassName}`).remove();

        // 	 chartSvg
        // 		 .selectAll(`.${nodesClassName}`)
        // 		 .data(d.nodes)
        // 		 .enter()
        // 		 .append("circle")
        // 		 .attr("class", `${nodesClassName}`)
        // 		 .attr("r", 5)
        // 		 .attr("cx", (d) => xScale(d.index))
        // 		 .attr("cy", (d) => yScale(d.value) + margin.top)
        // 		 .attr("fill", (d) => (d.highLow === "high" ? "red" : "green"))
        // 		 .attr("stroke", "white")
        // 		 .attr("clip-path", "url(#mainChart-clipBox)") //CORRECTION
        // 		 .exit();
        //  })
        //  .on("mouseout", () => chartSvg.selectAll(`.${nodesClassName}`).remove())

        .exit();

    //POC
    //APPEND Price Level
    chartSvg
        .selectAll(`.${POC_ClassName}`)
        .data([parseFloat(POC)])
        .enter()
        .append("line")
        .attr("class", `${POC_ClassName}`)
        .attr("x1", (d) => halfWidth)
        .attr("x2", 9999999)
        .attr("y1", (d) => {
            return yScale(d) + margin.top;
        })
        .attr("y2", (d) => {
            return yScale(d) + margin.top;
        })
        // .style("opacity", 0.7)

        .attr("stroke-width", 3)
        .attr("stroke", (d) => {
            return "indianred";
        })
        .attr("clip-path", "url(#mainChart-clipBox)") //CORRECTION
        //  .on("mouseover", (d) => {
        // 	 console.log(d);
        // 	 chartSvg.selectAll(`.${nodesClassName}`).remove();

        // 	 chartSvg
        // 		 .selectAll(`.${nodesClassName}`)
        // 		 .data(d.nodes)
        // 		 .enter()
        // 		 .append("circle")
        // 		 .attr("class", `${nodesClassName}`)
        // 		 .attr("r", 5)
        // 		 .attr("cx", (d) => xScale(d.index))
        // 		 .attr("cy", (d) => yScale(d.value) + margin.top)
        // 		 .attr("fill", (d) => (d.highLow === "high" ? "red" : "green"))
        // 		 .attr("stroke", "white")
        // 		 .attr("clip-path", "url(#mainChart-clipBox)") //CORRECTION
        // 		 .exit();
        //  })
        //  .on("mouseout", () => chartSvg.selectAll(`.${nodesClassName}`).remove())

        .exit();

    return;
}
