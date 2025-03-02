export function addCandleSticks(drawData, chartWindow, candleWidth, timeScale, priceScale, candleHeightScale) {
    let candleStrokeWidth = candleWidth / 10;
    // addWicks()
    let candleWicks = chartWindow.selectAll(".candleStickWick").data(drawData);

    addCandleWicks(candleWicks, candleStrokeWidth, timeScale, priceScale);

    /* CANDLES STICKS */
    let candleSticks = chartWindow.selectAll(".candleStick").data(drawData);
    addCandleSticksBody(candleSticks, candleStrokeWidth, candleWidth, timeScale, priceScale, candleHeightScale);
}

export function addCandleWicks(candleWicks, candleStrokeWidth, timeScale, priceScale) {
    candleWicks.exit().remove();
    candleWicks
        .enter()
        .append("line")
        .merge(candleWicks)
        .attr("x1", (d) => timeScale(d.datetime))
        .attr("x2", (d) => timeScale(d.datetime))
        .attr("y1", (d) => priceScale(d.low))
        .attr("y2", (d) => priceScale(d.high))
        .attr("stroke", "white")
        .attr("stroke-width", candleStrokeWidth)
        .attr("class", "candleStickWick")
        .on(
            "mouseover",
            ({ open, high, close, low, datetime, tradingDay }) => 1 //console.log({ open, high, close, low, datetime, tradingDay })
        );
}

export function addCandleSticksBody(candleSticks, candleStrokeWidth, candleWidth, timeScale, priceScale, candleHeightScale) {
    let halfWidth = candleWidth / 2;

    candleSticks.exit().remove();
    candleSticks
        .enter()
        .append("rect")
        .merge(candleSticks)
        //   .on("mouseover", bubblyEvent)
        //   .on("mousemove", bubblyEvent)
        .attr("x", (d, i) => {
            let t = timeScale(d.datetime) - halfWidth;

            if (isNaN(t)) {
                // console.log({d, halfWidth, i})
            }
            return timeScale(d.datetime) - halfWidth;
        })
        .attr("y", (d) => priceScale(yCandleAccessor(d)))
        .attr("height", (d) => {
            const h = candleHeightScale(heightCandleAccessor(d));
            if (h === 0) return 1;
            else return h;
        })
        .attr("width", candleWidth)
        .attr("fill", (d) => candleFillAccessor(d))
        .attr("stroke", (d) => candleFillAccessor(d))
        .attr("stroke-width", candleStrokeWidth / 2)
        .on("mouseover", ({ open, high, close, low, datetime, tradingDay }) => 1)
        //console.log({ open, high, close, low, datetime:new Date(datetime), tradingDay })

        .attr("class", "candleStick");
}

function candleFillAccessor(d) {
    return d.close === d.open ? "black" : d.open > d.close ? "red" : "green";
}

function heightCandleAccessor(d) {
    const val = Math.abs(d.open - d.close);
    return val;
}

function yCandleAccessor(d) {
    if (d.open > d.close) return d.open;
    if (d.open < d.close) return d.close;
    return d.close;
}
