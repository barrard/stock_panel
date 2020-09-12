import { extent } from "d3-array";

import { appendVolProfileBar } from "../ChartMarkers/VolProfileBar.js";
export { VolumeBars, VolumeProfileBars };

function plotVolProfileDetails({
  valueArea,
  POC,
  HVN,
  LVN,
  chartWindow,
  scales,
  options,
}) {
  //POC should be an array of just one item, sum up the parts for a max
  let { ask, bid } = POC[0];
  let volProfileMax = ask + bid;
  let { volProfileScale, priceScale } = scales;
  let { innerWidth } = options;

  //mark the LVN
  let markHVN = chartWindow.selectAll(".volProfileHVN").data(HVN);
  // console.log({ dataPoints });
  markHVN.exit().remove();
  markHVN
    .enter()
    .append("rect")
    .merge(markHVN)
    .attr("class", "volProfileHVN volumeProfile")
    .attr("x", (bin) => {
      let { ask, bid } = bin;
      let l = ask + bid;
      let val = volProfileScale(l);
      return val;
    })
    .attr("y", (bin) => {
      let val = bin.high;
      let y = priceScale(val);

      return y;
    })
    .attr("height", (bin) => {
      let h = priceScale(bin.low) - priceScale(bin.high);
      // let h = priceScale(price) - priceScale(price + tickSize);
      // if (h < 0) console.log(`${h} is less that 0 at price ${price}`);

      return h;
    })
    .attr("pointer-events", "none")
    .attr("opacity", 0.2)
    .attr("width", function (price) {
      let x = this.getAttribute("x");
      let width = innerWidth - x;

      return width;
    })
    .attr("fill", "orange")
    .attr("stroke", "orange")
    .attr("stroke-width", function () {
      return this.getAttribute("height") / 10;
    });

  //mark the LVN
  let markLVN = chartWindow.selectAll(".volProfileLVN").data(LVN);
  // console.log({ dataPoints });
  markLVN.exit().remove();
  markLVN
    .enter()
    .append("rect")
    .merge(markLVN)
    .attr("class", "volProfileLVN volumeProfile")
    .attr("x", (bin) => {
      let { ask, bid } = bin;
      let l = ask + bid;
      let val = volProfileScale(l);
      return val;
    })
    .attr("y", (bin) => {
      let val = bin.high;
      let y = priceScale(val);

      return y;
    })
    .attr("height", (bin) => {
      let h = priceScale(bin.low) - priceScale(bin.high);
      // let h = priceScale(price) - priceScale(price + tickSize);
      // if (h < 0) console.log(`${h} is less that 0 at price ${price}`);

      return h;
    })
    .attr("pointer-events", "none")
    .attr("opacity", 0.2)
    .attr("width", function (price) {
      let x = this.getAttribute("x");
      let width = innerWidth - x;

      return width;
    })
    .attr("fill", "blue")
    .attr("stroke", "deepskyblue")
    .attr("stroke-width", function () {
      return this.getAttribute("height") / 10;
    });

  //Mark the Value area
  let markValueArea = chartWindow
    .selectAll(".volProfileValueArea")
    .data(valueArea);
  // console.log({ dataPoints });
  markValueArea.exit().remove();
  markValueArea
    .enter()
    .append("rect")
    .merge(markValueArea)
    .attr("class", "volProfileValueArea volumeProfile")
    .attr("x", (bin) => {
      // let { ask, bid } = bin;
      // let l = ask + bid;
      let val = volProfileScale(volProfileMax);

      return val;
    })
    .attr("y", (bin) => {
      let val = bin.high;
      let y = priceScale(val);
      return y;
    })
    .attr("height", (bin) => {
      let h = priceScale(bin.low) - priceScale(bin.high);
      // let h = priceScale(price) - priceScale(price + tickSize);
      // if (h < 0) console.log(`${h} is less that 0 at price ${price}`);

      return h;
    })
    .attr("pointer-events", "none")
    .attr("opacity", 0.1)
    .attr("width", function (price) {
      let x = this.getAttribute("x");
      let width = innerWidth - x;
      return width;
    })
    .attr("fill", "yellow")
    .attr("stroke", "yellow");
  // .attr("stroke-width", function () {
  //   return this.getAttribute("height") / 10;
  // });

  //mark the POC
  let markPOC = chartWindow.selectAll(".volProfilePOC").data(POC);
  // console.log({ dataPoints });
  markPOC.exit().remove();
  markPOC
    .enter()
    .append("rect")
    .merge(markPOC)
    .attr("class", "volProfilePOC volumeProfile")
    .attr("x", (bin) => {
      let { ask, bid } = bin;
      let l = ask + bid;
      let val = volProfileScale(l);
      return val;
    })
    .attr("y", (bin) => {
      let val = bin.high;
      let y = priceScale(val);

      return y;
    })
    .attr("height", (bin) => {
      let h = priceScale(bin.low) - priceScale(bin.high);
      // let h = priceScale(price) - priceScale(price + tickSize);
      // if (h < 0) console.log(`${h} is less that 0 at price ${price}`);

      return h;
    })
    .attr("pointer-events", "none")
    .attr("opacity", 0.2)
    .attr("width", function (price) {
      let x = this.getAttribute("x");
      let width = innerWidth - x;

      return width;
    })
    .attr("fill", "pink")
    .attr("stroke", "goldenrod")
    .attr("stroke-width", function () {
      return this.getAttribute("height") / 10;
    });
}

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

  let { binnedProfile, HVN, LVN, POC, valueArea } = dataPoints;
  let bins = binnedProfile;
  let rawBinProfileValues = bins.map(({ ask, bid }) => ask + bid);
  let [volProfileMin, volProfileMax] = extent(rawBinProfileValues);

  volProfileScale.domain([volProfileMax, 0]);

  //NEUTRAL VOLUME PROFILE
  appendVolProfileBar({
    data: bins,
    stroke: "#666",
    color: ({ ask, bid }) => {
      let fill = ask > bid ? "red" : "green";
      return fill;
    },
    className: "volumeProfile",
    classItem: "volProfileBarNeutral",
    chartWindow,
    scales,
    x: (bin) => {
      let { ask, bid } = bin;
      return volProfileScale(ask + bid);
    },
    y: (bin) => priceScale(bin.high),
    height: (bin) => priceScale(bin.low) - priceScale(bin.high),
    width: function (price) {
      let x = this.getAttribute("x");
      let width = innerWidth - x;
      return width;
    },
  });

  //DOWN VOLUME PROFILE
  // appendVolProfileBar({
  //   data: bins,
  //   color: { fill: "red", stroke: "#666" },
  //   className: "volumeProfile",
  //   classItem: "volProfileBarDown",
  //   chartWindow,
  //   scales,
  //   x: (bin) => {
  //     let { ask } = bin;
  //     return volProfileScale(ask);
  //   },
  //   y: (bin) => priceScale(bin.high),
  //   height: (bin) => priceScale(bin.low) - priceScale(bin.high),
  //   width: function (price) {
  //     let x = this.getAttribute("x");
  //     let width = innerWidth - x;
  //     return width;
  //   },
  // });

  //UP VOL PROFILE
  // appendVolProfileBar({
  //   data: bins,
  //   color: { fill: "green", stroke: "#666" },
  //   className: "volumeProfile",
  //   classItem: "volProfileBarUp",
  //   chartWindow,
  //   scales,
  //   x: (bin) => {
  //     let { bid } = bin;
  //     return volProfileScale(bid );
  //   },
  //   y: (bin) => priceScale(bin.high),
  //   height: (bin) => priceScale(bin.low) - priceScale(bin.high),
  //   width: function (price) {
  //     let x = this.getAttribute("x");
  //     let width = innerWidth - x;
  //     return width;
  //   },
  //   options:{opacity:0.6}
  // });

  plotVolProfileDetails({
    valueArea,
    POC,
    HVN,
    LVN,
    chartWindow,
    scales,
    options,
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
  let fill = options.fill;
  let x = options.x;
  let y = options.y;
  let height = options.height;
  let strokeWidth = options.strokeWidth || barWidth / 10;

  let volBars = chartWindow.selectAll(`.${markerClass}`).data(dataPoints);

  volBars.exit().remove();
  volBars
    .enter()
    .append("rect")
    .merge(volBars)
    .attr("class", `${markerClass} volumeBars`)
    .attr(
      "x",
      x ||
        ((d) =>
          timeScale(d.timestamp) - options.innerWidth / dataPoints.length / 2)
    )
    .attr("y", y || ((d) => volScale(d.volume)))
    .attr(
      "height",
      height ||
        ((d, i) => {
          let h = options.innerHeight - volScale(d.volume);
          if (h < 0) h = 0;
          return h;
        })
    )
    .attr("opacity", opacity)
    .attr("pointer-events", "none")

    .attr("width", (d, i) => barWidth)
    .attr("fill", (d, i) => fill || volBarFill(d))
    .attr("stroke", "#666")
    .attr(
      "stroke-width",
      strokeWidth ||
        function () {
          return this.getAttribute("height") / 10;
        }
    );

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
