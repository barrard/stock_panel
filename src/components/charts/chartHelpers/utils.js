
export function priceRangeRed(defs) {
    let gradient = defs
      .append("linearGradient")
      .attr("id", "priceLevelGradientRed")
      .attr("gradientTransform", "rotate(90)");
    gradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-opacity", ".4")
      .attr("stop-color", "red");
  
    gradient
      .append("stop")
      .attr("stop-color", "red")
      .attr("offset", "20%")
      .attr("stop-opacity", "0.1");
  
    gradient
      .append("stop")
      .attr("stop-color", "red")
      .attr("offset", "50%")
      .attr("stop-opacity", "0.0");
  }
  
  export function priceRangeGreen(defs) {
    let gradient = defs
      .append("linearGradient")
      .attr("id", "priceLevelGradientGreen")
      .attr("gradientTransform", "rotate(90)");
    gradient
      .append("stop")
      .attr("stop-color", "green")
      .attr("offset", "50%")
      .attr("stop-opacity", "0.0");
  
    gradient
      .append("stop")
      .attr("stop-color", "green")
      .attr("offset", "80%")
      .attr("stop-opacity", "0.2");
  
    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-opacity", "0.4")
      .attr("stop-color", "green");
  }
  
  export function dropShadow(defs) {
    // filters go in defs element
  
    // create filter with id #drop-shadow
    // height=130% so that the shadow is not clipped
    var filter = defs
      .append("filter")
      .attr("id", "drop-shadow")
      .attr("height", "130%");
  
    // SourceAlpha refers to opacity of graphic that this filter will be applied to
    // convolve that with a Gaussian with standard deviation 3 and store result
    // in blur
    filter
      .append("feGaussianBlur")
      .attr("in", "SourceAlpha")
      .attr("stdDeviation", 3);
  
    // translate output of Gaussian blur to the right and downwards with 2px
    // store result in offsetBlur
    filter
      .append("feOffset")
      .attr("dx", 2)
      .attr("dy", 2)
      .attr("result", "offsetBlur");
  
    // Control opacity of shadow filter
    var feTransfer = filter.append("feComponentTransfer");
  
    feTransfer.append("feFuncA").attr("type", "linear").attr("slope", 0.2);
  
    // overlay original SourceGraphic over translated blurred opacity by using
    // feMerge filter. Order of specifying inputs is important!
    var feMerge = filter.append("feMerge");
  
    feMerge.append("feMergeNode").attr("in", "offsetBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");
  }
  
  export function doZoomIn({ partialOHLCdata }, mouseZoomPOS) {
    let firstHalf = partialOHLCdata.slice(
      0,
      partialOHLCdata.length * mouseZoomPOS + 1
    );
    let secondHalf = partialOHLCdata.slice(
      partialOHLCdata.length * -(1 - mouseZoomPOS)
    );
  
    let firstHalfCandleZoom = parseInt(
      firstHalf.length < 10 ? 0 : firstHalf.length * 0.05 || 1
    );
    let secondHalfCandleZoom = parseInt(
      secondHalf.length < 11 ? 0 : secondHalf.length * 0.05 || 1
    );
    firstHalf = firstHalf.slice(firstHalfCandleZoom, firstHalf.length);
    secondHalf = secondHalf.slice(
      0,
      secondHalf.length - 1 - secondHalfCandleZoom
    );
    let data = [...firstHalf, ...secondHalf];
    return data;
  }
  
  export function doZoomOut({
    allOHLCdata,
    partialOHLCdata,
    xName = "timestamp",
  }) {
    if (!allOHLCdata || !partialOHLCdata) return;
    let candleZoom = parseInt(partialOHLCdata.length * 0.05) || 1;
  
    let first = partialOHLCdata[0];
    let last = partialOHLCdata[partialOHLCdata.length - 1];
    if (!first || !last) return; //fail safe?
    let firstIndex = allOHLCdata.findIndex((d) => d[xName] === first[xName]);
    let lastIndex = allOHLCdata.findIndex((d) => d[xName] === last[xName]);
    // console.log({firstIndex, lastIndex})
    let newFirstData = allOHLCdata.slice(firstIndex - candleZoom, firstIndex);
    let newLastData = allOHLCdata.slice(lastIndex, lastIndex + candleZoom);
    // data = partialOHLCdata.slice(candleZoom, partialOHLCdata.length -candleZoom)
    let data = [...newFirstData, ...partialOHLCdata, ...newLastData];
    return data;
  }
  