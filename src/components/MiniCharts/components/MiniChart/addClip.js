export default function addClip({ chartSvg, margin, innerWidth, innerHeight }) {
    const clip = chartSvg
        .select("defs")
        .append("clipPath")
        .attr("id", `weekly-clipBox`);

    clip.append("rect")
        .attr("class", `weekly-clipping`)
        .attr("x", margin.left)
        .attr("y", margin.top)
        .attr("width", innerWidth)
        .attr("height", innerHeight)
        .attr("fill", "none");
}
