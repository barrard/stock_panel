import diff from "../extrema.js";

export function appendRegressionLines(
  that,
  chartWindow,
  dataPoints,{xKey, yKey},
  errLimit,//decmial percentage
  scales, options
) {

  if (!that.state.visibleIndicators.regressionLines) return console.log('regressionLines not turned on');
  let { xScale, yScale } = scales;
  let {addedHeight}  = options
  addedHeight = addedHeight || 0
//   console.log({dataPoints})
   dataPoints = dataPoints.map(d=> ({x:d[xKey], y:d[yKey]}))
//    console.log({errLimit})
//    console.log(dataPoints.slice(-1)[0].y)
//    errLimit = errLimit * dataPoints.slice(-1)[0].y
    // console.log({errLimit})
   let regressionLines = diff.regressionAnalysis(dataPoints, errLimit);
   let {m, length } = regressionLines.slice(-1)[0]
   let lastSlope = m
   let lastLength = length

   console.log({lastLength, lastSlope})


   let plottedRegressionLines = chartWindow
    .selectAll(`.${"regressionLines"}`)
    .data(regressionLines);

  plottedRegressionLines.exit().remove();
  plottedRegressionLines
    .enter()
    .append("line")
    .merge(plottedRegressionLines)

    .attr("y1", (d) => {
        // console.log(d.y1)
        // console.log(d.y1 === NaN)
        // console.log(d.y1 === 'NaN')
        // if(yScale(d.y1)+addedHeight === NaN) console.log('fuuk')
        // if(yScale(d.y1)+addedHeight === 'NaN') console.log('fuuk')
        // if(typeof(yScale(d.y1)+addedHeight) === 'NaN') console.log('fuuk')
        // if(typeof(yScale(d.y1)+addedHeight) === NaN) console.log('fuuk')
        return yScale(d.y1)+addedHeight
    })

    .attr("x1", (d) => xScale(d.x1))
    .attr("x2", (d) => xScale(d.x2))
    .attr("y2", (d) => {
        // if(yScale(d.y2)+addedHeight==='NaN'){
        //     console.log(d.y2)
        //     return 1
        // }
        return yScale(d.y2)+addedHeight
    })
    .attr("stroke-width", 5)
    .attr("stroke", (d) => {
      return "yellow";
    })
    .attr("class", `regressionLines`)
    .style("opacity", 0.5)
    .on("click", function (d) {
      console.log("click");
    })
    .on("mouseover", function (d) {
    //   console.log(d);
      // this.classList.add("hoveredRegressionLine");
      //   that.regressionNearbyPoints(d, chartWindow, {
      //     priceScale,
      //     timeScale
      //   });
    })
    .on("mouseout", function () {
      //   this.classList.remove("hoveredRegressionLine");
      //   chartWindow.selectAll(".regressionNearbyPoint").remove();
      // console.log("remove");
    });
}
