

export function appendVolProfileBar({
  data,
  className,
  classItem,
  color,stroke,
  chartWindow,
  x,
  y,
  width,
  height,
  options,
}) {
  let { opacity, strokeWidth } = options || {};
  // VOLUME PROFILE
  let volProfileBars = chartWindow.selectAll(`.${classItem}`).data(data);
  volProfileBars.exit().remove();
  volProfileBars
    .enter()
    .append("rect")
    .merge(volProfileBars)
    .attr("class", `${className} ${classItem}`)
    .attr("x", x)
    .attr("y", y)
    .attr("height", height)
    .attr("pointer-events", "none")

    .attr("opacity", opacity || 0.3)
    .attr("width", width)
    .attr("fill", color)
    .attr("stroke", stroke)
    .attr(
      "stroke-width",
      strokeWidth ||
        function () {
          return this.getAttribute("height") / 10;
        }
    );
}
