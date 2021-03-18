const talib = require("../node_modules/talib/build/Release/talib");
const { windowAvg, rateOfChange, exceedsDeviationLimit, average } = require("./indicatorHelpers/MovingAverage.js");

const indicatorName = "tradingRange";
const ATR_PERIOD = 14;
module.exports = {
	// addAllATR_data,
	singleTradingRange,
	calcTradingRange,
	ATR_indicatorVals,
	ATR_Analysis,
	addNewTradingRange,
	considerTradingRange,
};

function considerTradingRange(data) {
	let currentData = data.slice(-1)[0];
	// console.log(currentData.tradingRange)
	// console.log(currentData.close)
	let { open, close, high, low, ATR, timestamp } = currentData;
	//variable to decide 'close' to range
	const CLOSE_RANGE = 0.8;
	const AT_RANGE = 0.98;
	const BEYOND_RANGE = 1.18;
	let currentRange = Math.abs(high - low);
	let proximity = currentRange / ATR;
	if (!currentRange || !ATR) {
		proximity = 0;
	} else {
		let d = "bug";
	}
	let gettingClose = CLOSE_RANGE - proximity > 0 ? false : true;

	let atRange = AT_RANGE - proximity > 0 ? false : true;

	let beyondRange = BEYOND_RANGE - proximity > 0 ? false : true;
	let priceLocation = high - close > close - low ? "low" : "high";
	return {
		timestamp,
		gettingClose,
		atRange,
		beyondRange,
		priceLocation,
	};
}

function addNewTradingRange({ data, open, high, low, close }) {
	let { result } = talib.execute({
		startIdx: 0,
		endIdx: close.length - 1,
		name: "ATR",
		high,
		low,
		close,
		optInTimePeriod: ATR_PERIOD,
	});
	let atr = result.outReal.slice(-1)[0];
	// let prevClose = data.slice(-2)[0].close;
	// let TR = singleTradingRange({ d: data.slice(-1)[0], prevClose });
	// if (!data[data.length - 1].expectedRange) {
	//   addExpectedRange(data.slice(-ATR_PERIOD));
	// }
	// // console.log(TR);
	// data[data.length - 1][indicatorName] = TR;
	// let window = data.slice(-ATR_PERIOD);
	// let atr = window.map((d) => d[indicatorName]);
	// atr = average(atr);

	data[data.length - 1]["ATR"] = atr;
	addExpectedRange(data.slice(-1));

	return data;
}

// function addAllATR_data(data) {
//   ATR_indicatorVals(ohlc);
// }

function ATR_Analysis(avgTradingWindow, tickMinutes, dailyData) {
	// console.log(dailyAtrData);
	//see how price reacts when it gets near trading ranges of daily

	//one type of analysis is the rate of change
	// let rateOfChangeWindow = 2;
	let indicatorKey = `tradingRange`;
	// let rateOfChangeData = rateOfChange(atr_data, rateOfChangeWindow, indicatorKey);
	let deviationWindow = avgTradingWindow;
	let deviationLimit = {
		highSigmas: [4],
		lowSigmas: [10],
	};
	//find the deviation of ATR intraday
	var { aboveSigmas, belowSigmas } = exceedsDeviationLimit(
		tickMinutes,
		indicatorKey,
		deviationWindow,
		deviationLimit
	);

	tickMinutes.aboveSigmas = aboveSigmas;
	tickMinutes.belowSigmas = belowSigmas;

	//find the deviation of ATR daily
	var { aboveSigmas, belowSigmas } = exceedsDeviationLimit(dailyData, indicatorKey, deviationWindow, deviationLimit);

	dailyData.aboveSigmas = aboveSigmas;
	dailyData.belowSigmas = belowSigmas;
	//no what?
	//we have times when the STD was sigmas above or below
	return { tickMinutes, dailyData };
}

function addExpectedRange(data) {
	data.forEach((todaysData, iTodaysData) => {
		todaysData.expectedRange = {};
		if (!todaysData["ATR"]) return;

		let { open, high, low, close, ATR } = todaysData;
		//we may expect some resistance at open+range = about 3050
		let maxExpectedTopRange = open + ATR;
		let maxExpectedBottomRange = open - ATR;
		todaysData.expectedRange.top = maxExpectedTopRange;
		todaysData.expectedRange.bottom = maxExpectedBottomRange;
	});
	return data;
}

function ATR_indicatorVals(ohlc) {
	// console.log(ohlc);
	// window = window || 14;

	ohlc = calcTradingRange(ohlc);
	ohlc = addExpectedRange(ohlc);

	//get some kind of average
	return ohlc;
}

function calcTradingRange({ data, open, high, low, close }) {
	// fill an array with ATR values
	// let allTradingRange = [];
	const optInTimePeriod = ATR_PERIOD;

	let { result } = talib.execute({
		startIdx: 0,
		endIdx: close.length - 1,
		name: "ATR",
		high,
		low,
		close,
		optInTimePeriod,
	});

	result.outReal.forEach((atr, iAtr) => {
		let iD = iAtr + optInTimePeriod;
		let d = data[iD];

		d["ATR"] = atr;
	});
	return data;
}

function singleTradingRange({ d, prevClose }) {
	let timestamp = d.timestamp;
	let h = d.high;
	let l = d.low;
	//Current high minus the previous close
	let highTR = Math.abs(h - prevClose);
	// Current low minus the previous close
	let lowTR = Math.abs(l - prevClose);
	// Current high minus the current low
	let rangeTR = h - l;
	let tradingRange = Math.max(...[highTR, lowTR, rangeTR]);
	if (!prevClose) tradingRange = rangeTR;
	// let tradingRange = (highTR + lowTR + rangeTR) / 3;
	return tradingRange;
}
