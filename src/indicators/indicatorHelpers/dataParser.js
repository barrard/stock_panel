module.exports = {
    parseOHLC,
    maxDiffFromPrice,
  };
  
  function parseOHLC(data) {
    return data.map((d) => ({
      open: +d.open,
      close: +d.close,
      high: +d.high,
      low: +d.low,
      volume: +d.volume,
      timestamp: +d.timestamp,
    }));
  }
  
  /**
   *
   * @param {array} indicatorValues array of {x,y}
   * @param {array} OHLC_data array of open, high, low, close objects
   */
  function maxDiffFromPrice(indicatorValues, OHLC_data) {
    let percDiffArray = [];
    let percDiffCount = {};
    //assume we want the y value from the indicator array
    indicatorValues.forEach(({ y }, i) => {
      let { absMax, maxVal, price, change, MAval } = getMaxPercDiff(
        y,
        OHLC_data[i],
        percDiffArray.slice(-1)[0]
      );
      percDiffArray.push({
        x: +OHLC_data[i].timestamp,
        y: +absMax,
        maxVal,
        price,
        change,MAval
      });
      if (!percDiffCount[absMax]) {
        percDiffCount[absMax] = 0;
      }
      percDiffCount[absMax]++;
    });
  
    //change the count to percentage of time
    percDiffCount = Object.keys(percDiffCount).map((percDiff) => {
      let perc = +((percDiffCount[percDiff] / OHLC_data.length) * 100).toFixed(2);
      return { percDiff: +percDiff, percAmount: perc };
    });
  
    percDiffCount.sort((a, b) => b.percAmount - a.percAmount);
  
    //   console.log({ percDiffCount });
    return { percDiffCount, percDiffArray };
  }
  
  function getMaxPercDiff(value, OHLC, prevData) {
    let { high, low } = OHLC;
    low = +low;
    high = +high;
    let absMaxVal;
    let maxVal;
    let price;
    let change;
  
    let maxHigh = high - value;
    let maxLow = low - value;
  
    let absMaxHigh = Math.abs(high - value);
    let absMaxLow = Math.abs(low - value);
  
    if (absMaxHigh > absMaxLow) {
      maxVal = maxHigh;
      absMaxVal = absMaxHigh;
      price = high;
    }
    else if (absMaxHigh < absMaxLow) {
      price = low;
      maxVal = maxLow;
      absMaxVal = absMaxLow;
    } else {
      price = low//its that same as the high
      maxVal = maxHigh;
      absMaxVal = absMaxHigh;
    }
    let prevPrice;
    if (!prevData) prevPrice = 0;
    else prevPrice = prevData.price;
  
    change = price - prevPrice;
  
    return {
      absMax: +((absMaxVal / value) * 100).toFixed(1),
      maxVal,
      price,
      change,
      MAval:value
    };
  }
  