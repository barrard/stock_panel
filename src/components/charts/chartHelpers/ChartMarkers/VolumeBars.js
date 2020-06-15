import { select } from "d3-selection";
import { extent } from "d3-array";

import diff from "../extrema.js";
import { line } from "d3";
export { VolumeBars, VolumeProfileBars };

function VolumeProfileBars({
  that,
  chartWindow,
  dataPoints,
  markerClass,
  name,
  scales,
  options,
}) {
  let { volProfileScale, priceScale } = scales;
  let {
    priceMin,
    priceMax,
    tickSize,
    innerWidth,
    innerHeight,
    opacity,
  } = options;

  let volPriceKeys = Array.from(Object.keys(dataPoints));

  volPriceKeys = volPriceKeys.filter((v) => v >= priceMin && v <= priceMax);
  volPriceKeys = volPriceKeys.map((v) => +v);
  let volProfileValues = volPriceKeys.map(
    (volPriceKey) => dataPoints[volPriceKey]
  );
  // console.log({ volProfileValues });
  let rawVolProfileValues = volProfileValues.map(
    ({ up, down, neutral }) => up + down + neutral
  );
  let [volProfileMin, volProfileMax] = extent(rawVolProfileValues);

  volProfileScale.domain([volProfileMax, 0]);

  // debugger;

  //NEUTRAL VOLUME PROFILE
  let volProfileBarsNeutral = chartWindow
    .selectAll(".volProfileBarNeutral")
    .data(volPriceKeys);
  // console.log({ dataPoints });
  volProfileBarsNeutral.exit().remove();
  volProfileBarsNeutral
    .enter()
    .append("rect")
    .merge(volProfileBarsNeutral)
    .attr("class", "volProfileBarNeutral volumeProfile")
    .attr("x", (price) => {
      let { up, down, neutral } = dataPoints[price];
      let l = up + down + neutral;
      let val = volProfileScale(l);
      return val;
    })
    .attr("y", (price) => {
      let val = price + tickSize / 2;
      let y = priceScale(val);
      return y;
    })
    .attr("height", (price) => {
      let h = priceScale(price) - priceScale(price + tickSize);
      if (h < 0) console.log(`${h} is less that 0 at price ${price}`);
      return h;
    })
    .attr("pointer-events", "none")
    .attr("opacity", opacity)
    .attr("width", function (price) {
      let x = this.getAttribute("x");
      let width = innerWidth - x;
      return width;
    })
    .attr("fill", "grey")
    .attr("stroke", "#666")
    .attr("stroke-width", function () {
      return this.getAttribute("height") / 10;
    });

  //DOWN VOLUME PROFILE
  let volProfileBarsDown = chartWindow
    .selectAll(".volProfileBarDown")
    .data(volPriceKeys);
  //   console.log({volProfileValues})
  volProfileBarsDown.exit().remove();
  volProfileBarsDown
    .enter()
    .append("rect")
    .merge(volProfileBarsDown)
    .attr("class", "volProfileBarDown volumeProfile")
    .attr("x", (price) => {
        // debugger
      let { up, down } = dataPoints[price];
      let l = up + down;
      let val = volProfileScale(l);
      return val;
    })
    .attr("y", (_, i) => priceScale(volPriceKeys[i] + tickSize / 2))
    .attr("height", (price) => {
      let h = priceScale(price) - priceScale(price + tickSize);
      if (h < 0) console.log(`${h} is less that 0 at price ${price}`);
      return h;
    })
    .attr("pointer-events", "none")

    .attr("opacity", opacity)
    .attr("width", function (price) {
      let x = this.getAttribute("x");
      let width = innerWidth - x;
      return width;
    })
    .attr("fill", "red")
    .attr("stroke", "#666")
    .attr("stroke-width", function () {
      return this.getAttribute("height") / 10;
    });

  //UP VOL PROFILE
  let volProfileBarsUp = chartWindow
    .selectAll(".volProfileBarUp")
    .data(volPriceKeys);
  //   console.log({volProfileValues})
  volProfileBarsUp.exit().remove();
  volProfileBarsUp
    .enter()
    .append("rect")
    .merge(volProfileBarsUp)
    .attr("class", "volProfileBarUp volumeProfile")
    .attr("x", (price) => {
      let { up } = dataPoints[price];
      let l = up;
      let val = volProfileScale(l);
      return val;
    })
    .attr("y", (_, i) => priceScale(volPriceKeys[i] + tickSize / 2))
    .attr("height", (price) => {
      let h = priceScale(price) - priceScale(price + tickSize);
      if (h < 0) console.log(`${h} is less that 0 at price ${price}`);
      return h;
    })
    .attr("pointer-events", "none")

    .attr("opacity", 0.6)
    .attr("width", function (price) {
      let x = this.getAttribute("x");
      let width = innerWidth - x;
      return width;
    })
    .attr("fill", "green")
    .attr("stroke", "#666")
    .attr("stroke-width", function () {
      return this.getAttribute("height") / 10;
    });
}

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

  let barWidth = options.innerWidth / dataPoints.length;
  let opacity = options.opacity || 0.5;
  let strokeWidth = barWidth / 10;
  let volBars = chartWindow.selectAll(`.${markerClass}`).data(dataPoints);

  volBars.exit().remove();
  volBars
    .enter()
    .append("rect")
    .merge(volBars)
    .attr("class", `${markerClass} volumeBars` )
    .attr(
      "x",
      (d) => timeScale(d.timestamp) - options.innerWidth / dataPoints.length / 2
    )
    .attr("y", (d) => {
      // debugger
      // console.log(d)
      return volScale(d.volume)
    })
    .attr("height", (d, i) => {
      let h = options.innerHeight - volScale(d.volume);
      if (h < 0) h = 0;
      return h;
    })
    .attr("opacity", opacity)
    .attr("pointer-events", "none")

    .attr("width", (d, i) => barWidth)
    .attr("fill", (d, i) => volBarFill(d))
    .attr("stroke", "#666")
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
  return d.close === d.open ? "#666" : d.open > d.close ? "red" : "green";
}
