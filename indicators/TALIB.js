const talib = require("../node_modules/talib/build/Release/talib");

module.exports = {
	test,
};

function test({ open, high, low, close, volume, data }) {
	console.log({ open, high, low, close, volume, data });

	console.log(talib.explain("CDL3WHITESOLDIERS"));
	var {
		begIndex,
		nbElement,
		result: { outInteger },
	} = talib.execute({
		startIdx: 0,
		endIdx: 12,
		name: "CDL3WHITESOLDIERS",
		high: high.slice(-12),
		low: low.slice(-12),
		close: close.slice(-12),
		open: open.slice(-12),
	});
	console.log({ outInteger, nbElement, begIndex });

	var {
		begIndex,
		nbElement,
		result: { outInteger },
	} = talib.execute({
		startIdx: 0,
		endIdx: high.length - 1,
		name: "CDL3WHITESOLDIERS",
		high: high,
		low: low,
		close: close,
		open: open,
	});
	// console.log({ outInteger, nbElement, begIndex });
}
