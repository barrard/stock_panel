import { select } from "d3-selection";

import diff from "../extrema.js";
import { scaleBand } from "d3";

export function appendVolProfileBar({
  data,
  className,
  classItem,
  color,
  chartWindow,
  scales,
  x,
  y,
  width,
  height,
  options,
}) {
  let { opacity, strokeWidth } = options || {};
  let { timeScale, priceScale } = scales;
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
    .attr("fill", color.fill)
    .attr("stroke", color.stroke)
    .attr(
      "stroke-width",
      strokeWidth ||
        function () {
          return this.getAttribute("height") / 10;
        }
    );
}
