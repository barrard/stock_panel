import { select } from "d3-selection";

import diff from "../extrema.js";






export function appendMinMaxMarkers(that,minMaxValues, scales ) {
    if (!that.state.visibleIndicators.minMaxMarkers)
      return console.log("minMaxMarkers not turned on");

    let svg = select(that.state.chartRef.current);
    let chartWindow = svg.select(".chartWindow");
    // console.log({ name });

  
      let maxValues = minMaxValues.maxValues;
      appendMarker(
        maxValues,
        'red',
        5,
        `max${'high'}MarkerGroup`,
        chartWindow, scales
      );
  

      let minValues = minMaxValues.minValues;

      appendMarker(
        minValues,
        'green',
        5,
        `min${'low'}MarkerGroup`,
        chartWindow, scales
      );

  }



function appendMarker(data, color, r, classAttr, chartWindow, {timeScale, priceScale}) {
    let markers = chartWindow.selectAll(`.${classAttr}`).data(data);
    markers.exit().remove();
    markers
      .enter()
      .append("circle")
      .merge(markers)
      .attr("cx", d => timeScale(d.x))
      .attr("cy", d => priceScale(d.y))
      .attr("r", r)
      .attr("fill", color)
      .attr("stroke", "white")
      .attr("class", (d, i) => `${classAttr} minMaxMarkers `)
    //   .on("mouseover", function(d) {
    //     console.log(d)
    //     })
    //   .on("mouseleave", (d)=>console.log(d));

    }

/**
 * 
 * @param {Array} data Array of {x:timestamp,y:value} values 
 * @param {Number} tolerance Amount of values to look forward and back
 * @param {Boolean} minMaxMostRecentData Decide to change tolerance to get results for end of data 
 */
  export function runMinMax(data, xKey = 'timestamp', yKey,tolerance, minMaxMostRecentData = false ){
       // console.log({ tolerance, minMaxMostRecentData });

       let xValues = data.map((d)=> d[xKey])
       let yValues = data.map((d)=> d[yKey])
    //    console.log({xValues, yValues})
    let minMaxValues = {
        maxValues: [],
      minValues: [] ,
    };
    // console.log({ highs: this.state.highs, data: this.props.data });

    var { minValues, maxValues } = diff.minMax(
      xValues,
      yValues,
      tolerance,
      minMaxMostRecentData
    );

    minMaxValues.maxValues = maxValues;
    minMaxValues.minValues = minValues;

    return minMaxValues;
  }