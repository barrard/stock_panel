export const TradeMarker = ({that, partialOHLCdata, scales, chartWindow })=>{


let {timeScale, priceScale} = scales


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
      let { entryTime, exitTime, exitPrice, entryPrice } = data;
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
      let { entryTime, exitTime, exitPrice, entryPrice } = data;
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

    let symbol = that.props.stock_data.search_symbol;
    let trades = that.props.stock_data.commodityTrades[symbol];
    //All trades must have these
    trades = trades.filter(d=>{
        let { entryTime, exitTime, exitPrice, entryPrice } = d;
        if(entryTime&&exitTime&&entryPrice&&exitPrice) return d
    })
    let tradeEntry = chartWindow
      .selectAll(`.${"tradeEntryMarkers"}`)
      .data(trades);
    // if(!tradeEntry.length) return
    // console.log(tradeEntry)

    tradeEntry.exit().remove();
    tradeEntry
      .enter()
      .append("path")
      .merge(tradeEntry)

      // .attr('class', 'dirArrow')
      .attr("transform", (d) => {
        let { entryTime, exitTime, exitPrice, entryPrice } = d;
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
      .data(trades);

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
}




function showTradeDetails(data, chartWindow, { priceScale, timeScale }) {
    console.log('this works')
    //TODO
    // .tradeMarkerDetails
    // console.log(data)
  }
