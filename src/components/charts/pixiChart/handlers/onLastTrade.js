export default function onLastTrade({ setLastTrade, setOhlcDatas, pixiData }) {
    return (message) => {
        // if (!ohlcDatas.length) return;

        const {
            aggressor,
            tradePrice,
            tradeSize,
            vwap,
            timestamp: seconds,
        } = message;

        const timestamp = seconds * 1000 + 1000 * 60; //Need to add code to check the barType and period
        const lastOhlc = pixiData.ohlcDatas.slice(-1)[0];

        if (!lastOhlc) {
            return;
        }

        const min = new Date(timestamp).getMinutes();
        const ohlcDataLastMin = new Date(lastOhlc.timestamp).getMinutes();
        // if (min !== ohlcDataLastMin) {
        //     const data = {
        //         open: tradePrice,
        //         high: tradePrice,
        //         low: tradePrice,
        //         close: tradePrice,
        //         volume: tradeSize,
        //         timestamp,
        //     };
        //     setLastTrade(message);
        //     setOhlcDatas((ohlcDatas) => ohlcDatas.concat([data]));
        //     pixiData.prependData(data);
        // } else {
        const close = tradePrice;
        lastOhlc.volume += tradeSize;
        lastOhlc.close = close;
        if (lastOhlc.low > close) lastOhlc.low = close;
        if (lastOhlc.high < close) lastOhlc.high = close;

        pixiData.replaceLast(lastOhlc);
        pixiData.updateCurrentPriceLabel(tradePrice);
        // }
    };
}
