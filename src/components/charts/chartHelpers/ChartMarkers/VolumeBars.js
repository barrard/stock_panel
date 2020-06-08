import { select } from "d3-selection";

import diff from "../extrema.js";
import { line } from "d3";

export default VolumeBars;

function VolumeBars({
  that,
  chartWindow,
  dataPoints,
  markerClass,
  name,
  scales,
  options,
}) {


    let { volScale, timeScale } = scales;

     debugger
    let barWidth = options.innerWidth / dataPoints.length;
    let strokeWidth = barWidth / 10;
    let volBars = chartWindow.selectAll(`.${markerClass}`).data(dataPoints);

    volBars.exit().remove();
    volBars
      .enter()
      .append("rect")
      .merge(volBars)
      .attr("class", markerClass)
      .attr(
        "x",
        (d) =>
          timeScale(d.timestamp) -
          options.innerWidth / dataPoints.length / 2
      )
      .attr("y", (d) => volScale(d.volume))
      .attr("height", (d, i) => {
        let h = options.innerHeight - volScale(d.volume);
        if (h < 0) h = 0;
        return h;
      })
      .attr("opacity", 0.5)
      .attr("pointer-events", "none")

      .attr("width", (d, i) => barWidth)
      .attr("fill", (d, i) => volBarFill(d))
      .attr("stroke", "black")
      .attr("stroke-width", strokeWidth);





  if (options.mouseover) {
    //   console.log('applyingmouseover')
    volBars.on("mouseover", options.mouseover);
  }

  if (options.mouseout) {
    volBars.on("mouseout", options.mouseout);
  }
}


function volBarFill(d) {
    return d.close === d.open ? "black" : d.open > d.close ? "red" : "green";
  }