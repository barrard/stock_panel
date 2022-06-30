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

    const halfWidth = (width - (margin.left + margin.right)) / 2;
    if (!toggleVolProfile) return;
    const xScale = scaleLinear().range([halfWidth, 0]);
    const [profileMin, profileMax] = extent(
        Object.values(volProfile).map((d) => parseFloat(d.toFixed(1)))
    );

    xScale.domain([0, profileMax]);

    //Profile Bars
    chartSvg
        .selectAll(`.${profileBarClassName}`)
        .data(Object.keys(volProfile))
        .enter()
        .append("rect")
        .attr("class", `${profileBarClassName}`)
        .attr("x", (d) => xScale(volProfile[d]) + halfWidth)
        .attr("width", (d) => xScale(0) - xScale(volProfile[d]) + margin.left)
        .attr("y", (d) => yScale(parseFloat(d) + 0.09) + margin.top)
        .attr("height", (d) => yScale(yScale.domain()[1] - 0.09))
        .style("opacity", 0.5)

        .attr("stroke-width", 3)
        .attr("stroke", "none")
        .attr("fill", "teal")
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
        //         .attr("fill", (d) => (d.highLow === "high" ? "red" : "green"))
        //         .attr("stroke", "white")
        //         .attr("clip-path", "url(#mainChart-clipBox)") //CORRECTION
        //         .exit();
        // })
        // .on("mouseout", () => chartSvg.selectAll(`.${nodesClassName}`).remove())

        .exit();

    debugger;
    //valueArea High
    //APPEND Price Level
    chartSvg
        .selectAll(`.${valueAreaClassName}`)
        .data([parseFloat(valueAreaHigh) + 0.09, parseFloat(valueAreaLow)])
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
        .data([parseFloat(POC) + 0.05])
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
