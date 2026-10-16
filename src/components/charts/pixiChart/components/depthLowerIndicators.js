import { drawLine, drawIndicatorCandlestick, createHistogramDrawFn, createDualHistogramDrawFn } from "./drawFns";

// Order-book (depth) lower panels shared by PixiChartV2 and BetterTickChart. The bar fields come from
// useLiquidityRatios (book ratios, cancellations, majah counts) and the depth summary merge (depthSignalCumulative).

export const LIQUIDITY_MA_LINE_COLOR = 0xffd966;

const BID_CANDLE_COLORS = {
	up: 0x66ff66,
	down: 0x1b5e20,
	ma: 0x00b050,
};
const ASK_CANDLE_COLORS = {
	up: 0xff9999,
	down: 0xaa1f1f,
	ma: 0xcc3333,
};

export const BID_ASK_SIZE_RATIO_CONFIGS = [
	{
		id: "bid",
		openField: "bidSizeOrderRatioOpen",
		highField: "bidSizeOrderRatioHigh",
		lowField: "bidSizeOrderRatioLow",
		closeField: "bidSizeOrderRatioClose",
		maField: "bidSizeOrderRatioMA20",
		upColor: BID_CANDLE_COLORS.up,
		downColor: BID_CANDLE_COLORS.down,
		maColor: BID_CANDLE_COLORS.ma,
	},
	{
		id: "ask",
		openField: "askSizeOrderRatioOpen",
		highField: "askSizeOrderRatioHigh",
		lowField: "askSizeOrderRatioLow",
		closeField: "askSizeOrderRatioClose",
		maField: "askSizeOrderRatioMA20",
		upColor: ASK_CANDLE_COLORS.up,
		downColor: ASK_CANDLE_COLORS.down,
		maColor: ASK_CANDLE_COLORS.ma,
	},
];

export const NEAR_FULL_RATIO_CONFIGS = [
	{
		id: "near",
		openField: "nearPriceRatioOpen",
		highField: "nearPriceRatioHigh",
		lowField: "nearPriceRatioLow",
		closeField: "nearPriceRatioClose",
		maField: "nearPriceRatioMA20",
		upColor: 0x00aa00,
		downColor: 0xaa0000,
	},
	{
		id: "fullBook",
		openField: "fullBookRatioOpen",
		highField: "fullBookRatioHigh",
		lowField: "fullBookRatioLow",
		closeField: "fullBookRatioClose",
		maField: "fullBookRatioMA20",
		upColor: 0x0088ff,
		downColor: 0xff6600,
	},
];

export const createCandlesWithMovingAverageDrawFn = ({
	openField,
	highField,
	lowField,
	closeField,
	upColor,
	downColor,
	maField,
	maColor = LIQUIDITY_MA_LINE_COLOR,
	maLineWidth = 2,
	overlayLines = [],
}) => {
	return (opts) => {
		const { chartData, data } = opts;

		drawIndicatorCandlestick({
			...opts,
			openField,
			highField,
			lowField,
			closeField,
			upColor,
			downColor,
		});

		drawLine({
			...opts,
			lineColor: maColor,
			lineWidth: maLineWidth,
			yField: maField,
			skipClear: true,
		});

		overlayLines.forEach((overlayLine) => {
			if (!overlayLine?.yField || typeof overlayLine.dataBuilder !== "function") {
				return;
			}

			drawLine({
				...opts,
				data: overlayLine.dataBuilder(data, { ...opts, chartData }),
				lineColor: overlayLine.lineColor ?? 0xffffff,
				lineWidth: overlayLine.lineWidth ?? 2,
				yField: overlayLine.yField,
				skipClear: true,
			});
		});
	};
};

export const createMultiCandlesWithMovingAverageDrawFn = (configs = []) => {
	return (opts) => {
		if (!Array.isArray(configs) || configs.length === 0) return;

		configs.forEach((config, index) => {
			drawIndicatorCandlestick({
				...opts,
				openField: config.openField,
				highField: config.highField,
				lowField: config.lowField,
				closeField: config.closeField,
				upColor: config.upColor,
				downColor: config.downColor,
				skipClear: index !== 0,
			});

			if (config.maField) {
				drawLine({
					...opts,
					lineColor: config.maColor || LIQUIDITY_MA_LINE_COLOR,
					lineWidth: config.maLineWidth ?? 2,
					yField: config.maField,
					skipClear: true,
				});
			}
		});
	};
};

const cancellationPanel = ({ name, height, prefix, colors, centerZero }) => ({
	name,
	height,
	type: "volume",
	accessors: `${prefix}AbovePriceCancellationCountClose`,
	extentFields: [`${prefix}AbovePriceCancellationCountClose`, `${prefix}BelowPriceCancellationCountNegative`],
	...(centerZero && { centerZero: true }),
	drawFn: createDualHistogramDrawFn({
		positiveField: `${prefix}AbovePriceCancellationCountClose`,
		negativeField: `${prefix}BelowPriceCancellationCountNegative`,
		positiveMAField: `${prefix}AbovePriceCancellationCountMA20`,
		negativeMAField: `${prefix}BelowPriceCancellationCountMA20`,
		...colors,
	}),
	canGoNegative: true,
});

// Book ratios, depth cumulative, cancellations and majah counts, in PixiChartV2's order.
// centerZero puts the cancellation histograms' zero line mid-panel (the tick chart's style).
export const buildDepthLowerIndicators = ({ centerZero = false } = {}) => [
	{
		name: "Near vs Full Book Ratio",
		height: 120,
		type: "candlestick",
		accessors: "nearPriceRatioClose",
		candlestickSets: NEAR_FULL_RATIO_CONFIGS,
		drawFn: createMultiCandlesWithMovingAverageDrawFn(NEAR_FULL_RATIO_CONFIGS),
		canGoNegative: false,
	},
	{
		name: "Bid/Ask Order Ratio",
		height: 100,
		type: "candlestick",
		accessors: "bidOrderToAskOrderRatioClose",
		drawFn: createCandlesWithMovingAverageDrawFn({
			openField: "bidOrderToAskOrderRatioOpen",
			highField: "bidOrderToAskOrderRatioHigh",
			lowField: "bidOrderToAskOrderRatioLow",
			closeField: "bidOrderToAskOrderRatioClose",
			upColor: 0x00ffaa, // Cyan-green
			downColor: 0xff00aa, // Magenta
			maField: "bidOrderToAskOrderRatioMA20",
		}),
		canGoNegative: false,
	},
	{
		name: "Bid/Ask Size Order Ratio",
		height: 120,
		type: "candlestick",
		accessors: "bidSizeOrderRatioClose",
		candlestickSets: BID_ASK_SIZE_RATIO_CONFIGS,
		drawFn: createMultiCandlesWithMovingAverageDrawFn(BID_ASK_SIZE_RATIO_CONFIGS),
		canGoNegative: false,
	},
	{
		name: "Depth Cumulative",
		height: 90,
		type: "line",
		accessors: "depthSignalCumulative",
		lineColor: 0xfdd835,
		canGoNegative: true,
	},
	cancellationPanel({
		name: "Uber Near Cancellation",
		height: 100,
		prefix: "uberNear",
		centerZero,
		colors: {
			positiveColor: 0x00c853,
			negativeColor: 0xd50000,
			positiveMAColor: 0xc5ffb7,
			negativeMAColor: 0xffcdd2,
		},
	}),
	cancellationPanel({
		name: "Near Price Cancellation",
		height: 90,
		prefix: "near",
		centerZero,
		colors: {
			positiveColor: 0x66ff66,
			negativeColor: 0xff6666,
			positiveMAColor: 0xd4ffd4,
			negativeMAColor: 0xffd6d6,
		},
	}),
	cancellationPanel({
		name: "Far Price Cancellation",
		height: 90,
		prefix: "far",
		centerZero,
		colors: {
			positiveColor: 0x00bcd4,
			negativeColor: 0xff7043,
			positiveMAColor: 0xb2ebf2,
			negativeMAColor: 0xffccbc,
		},
	}),
	{
		name: "Majah Chasah",
		height: 90,
		type: "volume",
		accessors: "majahChasahClose",
		drawFn: createHistogramDrawFn({
			barColor: 0x00ffaa,
			maField: "majahChasahMA20",
			maColor: 0x88ffee,
		}),
		canGoNegative: false,
	},
	{
		name: "Majah Runnah",
		height: 90,
		type: "volume",
		accessors: "majahRunnahClose",
		drawFn: createHistogramDrawFn({
			barColor: 0x66ff66,
			maField: "majahRunnahMA20",
			maColor: 0xbbffbb,
		}),
		canGoNegative: false,
	},
];
