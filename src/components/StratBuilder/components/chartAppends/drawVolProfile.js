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
    console.log("ok");
    const profileBarClassName = "volProfileBar";

    const { yScale } = yScales;
    chartSvg.selectAll(`.${profileBarClassName}`).remove();

    if (!toggleVolProfile) return;
    const xScale = scaleLinear().range([
        width - (margin.left + margin.right),
        0,
    ]);
    const [profileMin, profileMax] = extent(
        Object.values(data).map((d) => parseFloat(d.toFixed(1)))
    );

    xScale.domain([0, profileMax]);

    chartSvg
        .selectAll(`.${profileBarClassName}`)
        .data(Object.keys(data))
        .enter()
        .append("rect")
        .attr("class", `${profileBarClassName}`)
        .attr("x", (d) => xScale(data[d]))
        .attr("width", (d) => xScale(0) - xScale(data[d]) + margin.left)
        .attr("y", (d) => yScale(parseFloat(d) + 0.9) + margin.top)
        .attr("height", (d) => {
            console.log(yScale.domain());
            console.log(yScale(yScale.domain()[0]));
            console.log(yScale(yScale.domain()[1] - 0.09));
            // yScale(d + 0.9) + margin.top
            debugger;
            return yScale(yScale.domain()[1] - 0.09);
        })
        // .style("opacity", 0.7)

        .attr("stroke-width", 3)
        .attr("stroke", (d) => {
            return "lawngreen";
        })
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

    return;
}
