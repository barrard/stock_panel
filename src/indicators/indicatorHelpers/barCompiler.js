export {
    compileTickData
}



function compileTickData(tickData, mins) {
    // console.log(tickData, mins)
    let firstMins = tickData.slice(0, mins);
    let startIndex = firstMins.findIndex((min, iMin) => {
      let t = new Date(min.timestamp).getMinutes();
      return t % mins === 0;
    });
    // console.log(startIndex)
    for (let x = 0; x < startIndex; x++) {
      tickData.shift();
    }
  
    //firs should module 5
    let startCheck = new Date(tickData[0].timestamp).getMinutes() % mins === 0;
    if (!startCheck) {
      while (!startCheck) {
        tickData.shift();
        if(!tickData.length)return
        startCheck = new Date(tickData[0].timestamp).getMinutes() % mins === 0;
      }
      // throw new Error("Not the right start point");
    }
    let compiledData = [];
    let compiledBar = {};
    let nextBarTimestamp = 0;
    let tickDataLength = tickData.length;
    for (let x = 0; x < tickDataLength; x++) {
      let d = tickData[x];
      let startCheck = new Date(d.timestamp).getMinutes() % mins === 0;
  
      if (startCheck || nextBarTimestamp <= d.timestamp) {
        if (compiledBar.timestamp) {
          if (new Date(compiledBar.timestamp).getMinutes() % mins !== 0) {
            throw new Error({ message: "compiling data error" });
          }
          compiledData.push({ ...compiledBar });
        }
        let zeroDate = new Date(d.timestamp);
        let minutes = new Date(zeroDate).getMinutes();
        minutes = minutes - (minutes % mins);
        zeroDate = new Date(zeroDate).setMinutes(minutes);
        zeroDate = new Date(zeroDate).setSeconds(0);
        compiledBar = {};
        compiledBar.timeframe = `${mins}Min`;
        compiledBar.symbol = d.symbol;
        compiledBar.open = d.open;
        compiledBar.high = d.high;
        compiledBar.low = d.low;
        compiledBar.volume = d.volume;
        compiledBar.close = d.close;
        compiledBar.timestamp = zeroDate;
        compiledBar.minCount = 1;
        compiledBar.dateTime = new Date(zeroDate).toLocaleString();
        nextBarTimestamp = compiledBar.timestamp + 1000 * 60 * mins;
        if (firstMins.length === 1) {
          return [compiledBar];
        } else {
          continue;
        }
      }
  
      let { open, high, low, volume } = d;
      if (high > compiledBar.high) compiledBar.high = high;
      if (low < compiledBar.low) compiledBar.low = low;
      compiledBar.volume += volume;
      compiledBar.minCount++;
      compiledBar.close = d.close;
      if (x === tickDataLength - 1) {
        // console.log(`all done compiling ${mins}Min data`);
        compiledData.push(compiledBar);
      }
    }
    // console.log(compiledData)
    return compiledData;
  }