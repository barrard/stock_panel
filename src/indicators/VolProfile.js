let {
  mean,
  average,
  findMax,
  findMin,
  findMedian,
  meanDeviation,
  findDeviation,
} = require("./indicatorHelpers/MovingAverage.js");

module.exports = {
  VolProfile,
};
function VolProfile(OHLC_data,timeframe, bins) {
  
  if (timeframe === "1Min") {
    let volProfile = make1MinProfileData(OHLC_data, {}, bins);
    return volProfile;
  } else if (timeframe === "candle") {
    //spread the volume between high and low?, open close?
    //Probably wont do this but left it open
  }
}

function makeVolProfile(data, currentProfile) {
  let volumePriceProfile = currentProfile || {};
  data.forEach((minute) => {
    Object.keys(minute.footprint).forEach((price, i) => {
      if (!price) return;
      if(!volumePriceProfile[price]){
        volumePriceProfile[price]={ask:0, bid:0}
      }
      let {bid, ask} = minute.footprint[price]
      volumePriceProfile[price].bid +=bid
      volumePriceProfile[price].ask +=ask
      
    });
  });

  return volumePriceProfile;
}

//Make profile data with the tick data
function make1MinProfileData(tickMinutes, currentProfile, bins) {
  let volumePriceProfile = currentProfile || {};

  volumePriceProfile = makeVolProfile(tickMinutes, volumePriceProfile);
  // console.log({ volumePriceProfile, bins });
  let volPriceKeys = Object.keys(volumePriceProfile).map((price) => +price);
  //sorting low to high or high to low no matter
  let sortedVolPriceKeys = volPriceKeys.sort((a, b) => a - b);
  let keyValsLength = volPriceKeys.length;
  let barsPerBin = Math.round(keyValsLength / bins);
  //TODO work on error handling
  if (!barsPerBin) return { err: "Cannot" };
  if (barsPerBin * bins < keyValsLength) {
    let extra = keyValsLength - barsPerBin * bins;
    let addedBins = Math.ceil(extra / barsPerBin);
    bins += addedBins;
  }
  let binnedProfile = [];
  //Binning algo
  for (let iBin = 0; iBin < bins; iBin++) {
    let start = barsPerBin * iBin;
    let end = start + barsPerBin;
    let pricesInBin = sortedVolPriceKeys.slice(start, end);
    pricesInBin.forEach((price, iPrice) => {
      price = +price;
      if (!iPrice) {
        binnedProfile[iBin] = {
          bid: 0,
          ask: 0,
          high: 0,
          low: price,
        };
      }
      if (iPrice >= pricesInBin.length - 1) {
        binnedProfile[iBin].high = price;
      }
      let { bid, ask } = volumePriceProfile[price];
      if(bid<0){
        console.log('wtf')
      }
      binnedProfile[iBin].bid += bid;
      binnedProfile[iBin].ask += ask;
    });
  }
  //find the HVN, LVN and POC and the value area
  let HVN = [];
  let LVN = [];
  let POC = 0;
  let valueArea = [];

  let rawCounts = binnedProfile.map((bin) => {
    let { bid, ask } = bin;
    return bid+ask;
  });
  let totalVol = rawCounts.reduce((a, b) => a + b, 0);
  let avg = average(rawCounts);
  let max = findMax(rawCounts);
  let min = findMin(rawCounts);

  HVN = getHVNs(binnedProfile, max);
  LVN = getLVNs(binnedProfile, min);
  POC = getPOC(binnedProfile, rawCounts, max);

  valueArea = getValueArea(binnedProfile, volPriceKeys, rawCounts, totalVol);

  return { binnedProfile, HVN, LVN, POC, valueArea };
}

function getHVNs(bins, max) {
  //nodes over 90% avg
  let proximity = 0.9;
  let HVNs = bins.filter((bin) => {
    let { bid, ask } = bin;
    let total = bid+ask;
    return total / max >= proximity;
  });

  // console.log({ HVNs });
  return HVNs;
}

function getPOC(binnedProfile, rawCounts, max) {
  let index = rawCounts.findIndex((count) => count === max);
  return [binnedProfile[index]];
}

function getLVNs(bins, min) {
  //nodes under 10% avg
  let proximity = 0.9;
  let LVNs = bins.filter((bin) => {
    let { bid, ask } = bin;
    let total = ask + bid;
    return min / total >= proximity;
  });
  // console.log({ LVNs });
  return LVNs;
}

function getValueArea(binnedProfile, volPriceKeys, rawCounts, totalVol) {
  if (!binnedProfile) return console.log("Missing binned data");
  let halfTotal = Math.floor(totalVol / 2);
  // console.log(volPriceKeys);
  //round to the nearest quarter
  // let avg = (Math.round(average(volPriceKeys) * 4) / 4).toFixed(2);

  let meanBinIndex = 0;
  let meanCount = 0;
  while (meanCount < halfTotal) {
    meanCount += rawCounts[meanBinIndex];
    meanBinIndex++;
  }
  // console.log(meanBinIndex);
  // let { low, high } = binnedProfile[meanBinIndex];
  // let histogramMean = (low + high) / 2;
  // console.log({ histogramMean });

  //from the barCount, we know which bar is the VPOC
  //we need ot look at bar above and below and
  //decide which is larger adding up the vol until 70%

  let barAboveIndex = null;
  let barBelowIndex = null;
  let valueArea = [binnedProfile[meanBinIndex]];
  let valueAccumulation = rawCounts[meanBinIndex];
  let valueAreaCutoff = totalVol * 0.7;
  while (valueAccumulation < valueAreaCutoff) {
    if (barAboveIndex === null) barAboveIndex = meanBinIndex + 1;
    if (barBelowIndex === null) barBelowIndex = meanBinIndex - 1;
    // if (barBelowIndex < 0) {
    //   barBelowIndex = 0;
    // }
    // if (barAboveIndex >= rawCounts.length ) {
    //   barAboveIndex = rawCounts.length - 1;
    // }

    let barAbove = rawCounts[barAboveIndex];
    let barBelow = rawCounts[barBelowIndex];
    if (barAbove === undefined) {
      //add the bar below and increment
      valueArea.push(binnedProfile[barBelowIndex]);
      valueAccumulation += barBelow;
      barBelowIndex--;
    } else if (barBelow === undefined) {
      //add the bar above and increment
      valueArea.push(binnedProfile[barAboveIndex]);
      valueAccumulation += barAbove;
      barAboveIndex++;
    } else if (barBelow > barAbove) {
      valueArea.push(binnedProfile[barBelowIndex]);
      valueAccumulation += barBelow;
      barBelowIndex--;
    } else if (barBelow <= barAbove) {
      valueArea.push(binnedProfile[barAboveIndex]);
      valueAccumulation += barAbove;
      barAboveIndex++;
    } else {
      console.log("WTF THEY ARE EQUAL!?");
      throw "This wouldn't happen?  or would it?";
    }
  }

  return valueArea;

  // // let MD = meanDeviation(rawCounts)
  // // console.log(MD)
  // console.log(findDeviation(rawCounts))
  // console.log(findDeviation(volPriceKeys))
  // console.log(meanDeviation(volPriceKeys))
  // let priceRangeSTD = findDeviation(volPriceKeys)
  // let highDev = histogramMean+priceRangeSTD
  // let lowDev = histogramMean-priceRangeSTD
}
