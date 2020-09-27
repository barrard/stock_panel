export default DrawLine;

function DrawLine({
  // that,
  chartWindow,
  dataPoints,
  markerClass,
  name,
  scales,
  options,
}) {
  let strokeWidth = options.strokeWidth || 5;
  let color = options.color || "yellow";
  let dasharray = options.dasharray || '';
  let { yScale, xScale } = scales;
  let Lines = chartWindow.selectAll(`.${markerClass}`).data(dataPoints);

  Lines.exit().remove();
  Lines.enter()
    .append("line")
    .merge(Lines)

    .attr("y1", (d) => yScale(d.y1))

    .attr("x1", (d) => xScale(d.x1))
    .attr("x2", (d) => xScale(d.x2))
    .attr("y2", (d) => yScale(d.y2))
    .attr("stroke-width", strokeWidth)
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round")
    .attr("stroke-dasharray", dasharray)

    .attr("stroke", (d) => {
      return color;
    })
    .attr("class", () => `${markerClass} ${name}`)
    .on("click", function (d) {
      console.log("click");
    });

    if (options.mouseover) {
      //   console.log('applyingmouseover')
      Lines.on("mouseover", options.mouseover);
    }

  if (options.mouseout) {
    Lines.on("mouseout", options.mouseout);
  }
}
