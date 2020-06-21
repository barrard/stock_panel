import React from "react";
import { axisBottom, axisLeft, axisRight, axisTop } from "d3-axis";
import { select } from "d3-selection";
import { line, curveLinear } from "d3-shape";
import { timeParse, timeFormat } from "d3-time-format";

//const formatTime = timeFormat("%X"); // "11:12:56 PM"
const formatTime = timeFormat("%c"); // "11:12:56 PM"

export const DrawCrossHair = (chartWindow)=>{
  var crosshair = chartWindow.append("g").attr("class", "line");
  // create horizontal line
  crosshair
    .append("line")
    .attr("id", "crosshairX")
    .attr("class", "crosshair");

  // create vertical line
  crosshair
    .append("line")
    .attr("id", "crosshairY")
    .attr("class", "crosshair");

    return crosshair
}
export const drawAxisAnnotation = (tagId, scale, xy, svg, axisClass) => {

  //Remove any first

  svg.select(`#${tagId}`).remove();
  svg.select(`#${tagId}Text`).remove();

  let axisG = svg.select(`.${axisClass}`)
  addAxisAnnotationElements(axisG, tagId)

  let value
  //current means this will be a price and not a px val
  if(tagId.includes("current")){
    
    //the current value is already a price
    //so no need to invert
    value = xy
    xy = scale(xy)
  }

  else{
    //this will be a px value so must
    //invert to a price value
    value = scale.invert(xy);

  }
  // console.log(value)
  // value = formatTime(value);
  // console.log(value)

  if (tagId.includes("Time")) {
    //   value = value.toFixed(3);
    //   if (String(value).length > 6) value = parseFloat(value).toFixed(2);
    // } else {
    /* need to have time formatting */
    value = formatTime(value);
  }else if(tagId.includes('Vol')){
    value = parseInt(value)
  }
  // console.log(String(value).length);
  // console.log({ value: value });
  // console.log(`place a marker at ${xy} with value ${value}`);
  svg
    .select(`#${tagId}`)
    .attr("class", "axisAnnotation")
    .attr("d", getAccessorPathData(tagId, xy))
    .style("display", "block")
    .attr("fill", "green");
  setTagText(value, xy, tagId, svg);
};

function setTagText(value, xy, tagId, svg) {

  let tagText = svg.select(`#${tagId}Text`);
// console.log('st tag')
  tagText
    .text(value)
    .attr("font-size", "1.3em")
    .style("display", "block");

  if (tagId.toLowerCase().includes("left")) tagText.attr("y", xy + 4).attr("x",-15);
  if (tagId.toLowerCase().includes("right")) tagText.attr("y", xy + 4).attr("x", 15);

  //   case "top":
  //     tagText.attr("y", 0 - 6).attr("x", xy);

  if (tagId.toLowerCase().includes("top")) tagText.attr("y", 0 - 6).attr("x", xy);
  if (tagId.toLowerCase().includes("bottom")) tagText.attr("y", +15).attr("x", xy);
}


export function addAxisAnnotationElements(axisG, ID){
  axisG
  .append("path")
  .attr("id", `${ID}`)
  // .attr("stroke", "blue")
  .attr("stroke-width", 2);
axisG.append("text").attr("id", `${ID}Text`);
}

export function removeAllAxisAnnotations(svg) {
  hideElements(svg, [
    "#leftPriceTag",
    "#leftPriceTagText",
    "#rightPriceTag",
    "#rightPriceTagText",
    "#rightVolumeTag",
    "#rightVolumeTagText",
    "#leftVolumeTag",
    "#leftVolumeTagText",
    "#leftVolTag",
    "#leftVolTagText",
    '#rightIndicatorTag',
    '#rightIndicatorTagText',
    
    "#topTimeTag",
    "#topTimeTagText",
    "#topVolProfileTag",
    "#topVolProfileTagText",
    "#bottomTimeTag",
    "#bottomTimeTagText"
  ]);
}
export const hideElements = (svg, elements) => {
  elements.map(el => svg.select(el).style("display", "none"));
};

function getAccessorPathData(tagId, xy) {
  if (tagId.toLowerCase().includes("left"))
    return axisMarkerTagAccessor(leftAxisMarkerTagLine(xy));
  if (tagId.toLowerCase().includes("right"))
    return axisMarkerTagAccessor(rightAxisMarkerTagLine(xy));

    if (tagId.toLowerCase().includes("bottom"))
    return axisMarkerTagAccessor(bottomAxisMarkerTagLine(xy));

    if (tagId.toLowerCase().includes("top"))
    return axisMarkerTagAccessor(topAxisMarkerTagLine(xy));
  }

const axisMarkerTagAccessor = line()
  .x(d => d.x)
  .y(d => d.y)
  .curve(curveLinear);

const leftAxisMarkerTagLine = y => [
  { x: 0, y: 0 + y },
  { x: -20, y: -10 + y },
  { x: -60, y: -10 + y },
  { x: -60, y: 10 + y },
  { x: -20, y: 10 + y },
  { x: 0, y: 0 + y }
];

const rightAxisMarkerTagLine = y => [
  { x: 0, y: 0 + y },
  { x: 20, y: -10 + y },
  { x: 60, y: -10 + y },
  { x: 60, y: 10 + y },
  { x: 20, y: 10 + y },
  { x: 0, y: 0 + y }
];

const topAxisMarkerTagLine = x => [
  { x: x + 0, y: 0 },
  { x: x - 40, y: -4 },
  { x: x - 40, y: -20 },
  { x: x - 40, y: -20 },
  { x: x + 40, y: -20 },
  { x: x + 40, y: -20 },
  { x: x + 40, y: -4 },
  { x: x + 0, y: -0 }
];

const bottomAxisMarkerTagLine = x => [
  { x: x + 0, y: 0 },
  { x: x - 70, y: 4 },
  { x: x - 70, y: 20 },

  { x: x + 70, y: 20 },
  { x: x + 70, y: 4 },
  { x: x + 0, y: 0 }
];
