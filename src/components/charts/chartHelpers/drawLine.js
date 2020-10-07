// import { selectAll } from "d3-selection";
import { line } from "d3-shape";

export function drawSimpleLine(
  chartWindow,
  values,
  className,
  { timeScale, priceScale },
  { x, y, nestedY, color, groupName }
) {
  
  let start = new Date().getTime()

  values = values.filter(d=>{
    if(nestedY){
      return d[y] && d[y][nestedY]
    }else{
      return d[y]
    }
  })
  // console.log(`Time = ${new Date().getTime()- start}`)
  let lineFunc = line()
    .x((d) => timeScale(d[x]))
    .y((d) => (nestedY ? priceScale(d[y][nestedY]) : priceScale(d[y])));

  let linePath = chartWindow.selectAll(`.${className}`).data([values]);
  //   linePath.exit().remove();

  linePath
    .enter()
    .append("path")
    .merge(linePath)
    .attr("class", `${className} ${groupName||''}`)
    .attr("stroke-width", 3)
    .attr("d", lineFunc)
    .attr("stroke", color)
    .attr("fill", 'none');
}

export function drawLine(
  chartWindow,
  values,
  className,
  { timeScale, priceScale }
) {
  //   console.log(values);

  let lineFunc = line()
    .x((d) => timeScale(d.x))
    .y((d) => priceScale(d.y));

  let linePath = chartWindow.selectAll(`.${className}`).data([values]);
  //   linePath.exit().remove();

  linePath
    .enter()
    .append("path")
    .merge(linePath)
    .attr("class", `line ${className}`)
    .attr("stroke-width", 3)
    .attr("d", lineFunc);
}
