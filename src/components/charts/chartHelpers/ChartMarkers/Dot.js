import { selectAll } from "d3-selection";

export default appendDot

function appendDot(
  data,
  color,
  radius,
  markerClass, name,
  chartWindow,
  scales
) {

    // console.log({data,
    //     color,
    //     radius,
    //     markerClass,
    //     chartWindow,name,
    //     scales})
  let markers = chartWindow.selectAll(`.${markerClass}`).data(data);
//   console.log(markers)
//   console.log(data)
  let { timeScale, priceScale } = scales;
  markers.exit().remove();
  markers
    .enter()
    .append("circle")
    .merge(markers)
    .attr("cx", (d) => timeScale(d.x))
    .attr("cy", (d) => priceScale(d.y))
    .attr("r", radius)
    .attr("fill", color)
    .attr("stroke", "white")
    .attr("class", (d, i) => `${markerClass} ${name}`)
    .on("mouseover", function (d) {
      console.log(d);
    });
  //   .on("mouseleave", this.removeLine);
  // .style("filter", "url(#drop-shadow)");
}

