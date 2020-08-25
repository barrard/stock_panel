import DrawLine from "./Line.js";

export const TradeMarker = ({ that, partialOHLCdata, scales, chartWindow }) => {
  let { timeScale, priceScale } = scales;
  let xScale = timeScale
  let yScale = priceScale
  scales = {xScale, yScale}
  let xMax = new Date(timeScale.domain()[1]).getTime();

  let symbol = that.props.stock_data.search_symbol;
  let trades = that.props.stock_data.commodityTrades[symbol];
  //don't do anything if there aren't any trades
  if (!trades) return;
  /**
     * id(pin):"5e833a02a693dc4122d7355f"
buyOrSell(pin):"Buy"
symbol(pin):"ES"
entryPrice(pin):2584
stop(pin):2580.326
target(pin):2595.0213
entryTime(pin):1585658369836
__v(pin):0
MaxPL(pin):11.25
PL(pin):11.25
exitPrice(pin):2595.25
exitTime(pin):1585659963841
     */
  let candleWidth = that.state.innerWidth / partialOHLCdata.length;
  function entryArrow(data) {
    let { entryTime, entryPrice } = data;
    
    if(!entryPrice)entryPrice = data.order_limit
    if(!entryTime)entryTime = data.orderTime
    let x = timeScale(entryTime);
    let y = priceScale(entryPrice);

    let scaler = 3.5;
    if (candleWidth < 20) scaler = 2.5;
    if (candleWidth < 6) scaler = 1.5;
    // x = x + (candleWidth*2)
    return `M ${x}, ${y}
                  l ${scaler * 5}, ${scaler * -3.75}
                  l ${scaler * 0}, ${scaler * 2.5}
                  l ${scaler * 7.5}, ${scaler * 0}
                  l ${scaler * 0}, ${scaler * 2.5}
                  l ${scaler * -7.5}, ${scaler * 0}
                  l ${scaler * 0}, ${scaler * 2.5} z`;
  }

  function exitArrow(data) {
    let { exitTime, exitPrice } = data;
    if (!exitPrice || !exitTime) return;
    let x = timeScale(exitTime);
    let y = priceScale(exitPrice);
    let scaler = 3.5;
    if (candleWidth < 15) scaler = 2.5;
    if (candleWidth < 6) scaler = 1.5;
    return `M ${x}, ${y}
                  l ${scaler * 5}, ${scaler * -3.75}
                  l ${scaler * 0}, ${scaler * 2.5}
                  l ${scaler * 7.5}, ${scaler * 0}
                  l ${scaler * 0}, ${scaler * 2.5}
                  l ${scaler * -7.5}, ${scaler * 0}
                  l ${scaler * 0}, ${scaler * 2.5} z`;
  }

  function PL_color({ PL }) {
    return PL > 0 ? "green" : "red";
  }
  function buyOrSellColor({ buyOrSell }) {
    if (buyOrSell === "Buy") return "green";
    else return "red";
  }

  //All trades must have these
  let tradeEnters = trades.filter((d) => {
    let { entryTime, entryPrice } = d;
    if (entryTime && entryPrice) return d;
  });
  
  let tradeExits = trades.filter((d) => {
    let { exitTime, exitPrice } = d;
    if (exitTime && exitPrice) return d;
  });

  let tradeOrders = trades.filter((d) => {
    if (d.orderStatus ==='Open') return d;
  });


  



  let tradeEntry = chartWindow
    .selectAll(`.${"tradeEntryMarkers"}`)
    .data(tradeEnters);
  // if(!tradeEntry.length) return
  // console.log(tradeEntry)

  tradeEntry.exit().remove();
  tradeEntry
    .enter()
    .append("path")
    .merge(tradeEntry)

    // .attr('class', 'dirArrow')
    .attr("transform", (d) => {
      let { entryTime, entryPrice } = d;
      let x = timeScale(entryTime);
      let y = priceScale(entryPrice);
      return `rotate(${180}, ${x}, ${y})`;
    })
    .attr("d", (d) => entryArrow(d))

    .attr("fill", (d) => buyOrSellColor(d))

    .attr("stroke", "black")
    .attr("class", `tradeMarkers tradeEntryMarkers`)
    .style("opacity", 0.9)
    .on("click", function (d) {
      console.log("click");
    })
    .on("mouseover", function (d) {
      // console.log(d);
      this.classList.add("hoveredTradeMarker");
      showTradeDetails(d, chartWindow, {
        priceScale,
        timeScale,
      });
    })
    .on("mouseout", function () {
      this.classList.remove("hoveredTradeMarker");
      chartWindow.selectAll(".tradeMarkerDetails").remove();
      // console.log("remove");
    });

  let tradeExit = chartWindow
    .selectAll(`.${"tradeExitMarkers"}`)
    .data(tradeExits);

  tradeExit.exit().remove();
  tradeExit
    .enter()
    .append("path")
    .merge(tradeExit)

    // .attr('class', 'dirArrow')

    .attr("d", (d) => exitArrow(d))

    .attr("fill", (d) => PL_color(d))

    .attr("stroke", "black")
    .attr("class", `tradeMarkers tradeExitMarkers`)
    .style("opacity", 0.9)
    .on("click", function (d) {
      console.log("click");
    })
    .on("mouseover", function (d) {
      // console.log(d);
      // this.classList.add("hoveredTradeMarker");
      showTradeDetails(d, chartWindow, {
        priceScale,
        timeScale,
      });
    })
    .on("mouseout", function () {
      // this.classList.remove("hoveredTradeMarker");
      chartWindow.selectAll(".tradeMarkerDetails").remove();
      // console.log("remove");
    });



    //ORDERS
    let tradeOrder = chartWindow
    .selectAll(`.${"tradeOrderMarkers"}`)
    .data(tradeOrders);
  // if(!tradeOrder.length) return
  // console.log(tradeOrder)

  tradeOrder.exit().remove();
  tradeOrder
    .enter()
    .append("path")
    .merge(tradeOrder)

    // .attr('class', 'dirArrow')
    .attr("transform", (d) => {
      let { orderTime, order_limit } = d;
      let x = timeScale(orderTime);
      let y = priceScale(order_limit);
      return `rotate(${180}, ${x}, ${y})`;
    })
    .attr("d", (d) => entryArrow(d))

    .attr("fill", 'blue')

    .attr("stroke", "blue")
    .attr("class", `tradeMarkers tradeOrderMarkers`)
    .style("opacity", 0.9)
    .on("click", function (d) {
      console.log("click");
    })
    .on("mouseover", function (d) {
      // console.log(d);
      this.classList.add("hoveredTradeMarker");
      showTradeDetails(d, chartWindow, {
        priceScale,
        timeScale,
      });
    })
    .on("mouseout", function () {
      this.classList.remove("hoveredTradeMarker");
      chartWindow.selectAll(".tradeMarkerDetails").remove();
      // console.log("remove");
    });

    //line extension from order
    let options = {
      strokeWidth: 5,
      color: "blue",
    };
    // Target Line
    let tradeOrderExtensions = tradeOrders.map(d=>({
      
        x1: d.orderTime,
        y1: d.order_limit,
        x2: xMax,
        y2: d.order_limit,
      
    }))
    DrawLine({
      that: null,
      dataPoints: tradeOrderExtensions,
      chartWindow,
      markerClass: "tradeOrderLine",
      name: "tradeMarkerDetails",
      scales,
      options,
    });
};

function showTradeDetails(data, chartWindow, { priceScale, timeScale }) {
  console.log("this works");
  let xScale = timeScale;
  let yScale = priceScale;
  let scales = { xScale, yScale };
  //TODO
  // highlightFibLines(d, i, lowToHigh, chartWindow, scales);

  // console.log({d, i, swings})
  // console.log({ scales });
  //draw these lines?

  console.log(data);
  /**
   * MaxPL: 0
PL: 0
buyOrSell: "Sell"
entryPrice: 3360.25
entryTime: 1597910509712
exitPrice: 0
exitTime: 0
instrumentType: "commodity"
orderStatus: "Filled"
orderTime: 1597910509712
order_limit: 3350.75
order_stop: 3362.75
order_target: 3352.75
order_type: "Market"
   */
  ;
  let xMax = new Date(xScale.domain()[1]).getTime();
  let { entryTime, entryPrice, exitTime, order_target, order_stop, orderTime, order_limit } = data;
  let options = {
    strokeWidth: 5,
    color: "green",
  };
  // Target Line
  DrawLine({
    that: null,
    dataPoints: [
      {
        x1: entryTime ? entryTime:orderTime,
        y1: order_target,
        x2: exitTime? exitTime:xMax,
        y2: order_target,
      },
      {
        x1: entryTime ? entryTime:orderTime,
        y1: entryPrice ? entryPrice:order_limit,
        x2: entryTime ? entryTime:orderTime,
        y2: order_target,
      },
    ],
    chartWindow,
    markerClass: "tradeMarkerTargetLine",
    name: "tradeMarkerDetails",
    scales,
    options,
  });
  // Stop Line
  options = {
    strokeWidth: 5,
    color: "red",
  };
  DrawLine({
    that: null,
    dataPoints: [
      {
        x1: entryTime? entryTime:orderTime,
        y1: order_stop,
        x2: exitTime? exitTime:xMax,
        y2: order_stop,
      },
      {
        x1: entryTime? entryTime:orderTime,
        y1: entryPrice?entryPrice:order_limit,
        x2: entryTime? entryTime:orderTime,
        y2: order_stop,
      },
    ],
    chartWindow,
    markerClass: "tradeMarkerStopLine",
    name: "tradeMarkerDetails",
    scales,
    options,
  });
}
