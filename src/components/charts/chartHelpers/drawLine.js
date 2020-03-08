// import { selectAll } from "d3-selection";
import { line } from "d3-shape";

export function drawLine(
  chartWindow,
  values,
  className,
  { timeScale, priceScale }
) {
//   console.log(values);

  let lineFunc = line()
    .x(d => timeScale(d.x))
    .y(d => priceScale(d.y));

  let linePath = chartWindow.selectAll(`.${className}`).data([values]);
//   linePath.exit().remove();

  linePath
    .enter()
    .append("path")
    .merge(linePath)
    .attr("class", `line ${className}`)
    .attr("d", lineFunc);
}
