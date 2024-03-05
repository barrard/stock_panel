export default function onLastTrade({ setLastTrade, setOhlcDatas, pixiData }) {
    return (message) => {
        // if (!ohlcDatas.length) return;
        const { aggressor, tradePrice, tradeSize, vwap, timestamp: seconds, lastTradeData } = message;
        const lastOhlc = pixiData.ohlcDatas.slice(-1)[0];
        // totalVol = lastOhlc.volume;
        if (!lastOhlc) {
            return;
        }

        console.log(new Date(lastTradeData.datetime).toLocaleTimeString());
        console.log(new Date(lastOhlc.datetime).toLocaleTimeString());
        console.log(lastOhlc);
        if (!lastTradeData.tickCount == 100) {
        }
        lastOhlc.volume += lastTradeData.volume;

        // const timestamp = seconds * 1000 + 1000 * 60; //Need to add code to check the barType and period

        // const min = new Date(timestamp).getMinutes();
        // const ohlcDataLastMin = new Date(lastOhlc.timestamp).getMinutes();
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
        // lastOhlc.volume = totalVol + tempVol;
        lastOhlc.close = close;
        if (lastOhlc.low > lastTradeData.low) lastOhlc.low = lastTradeData.low;
        if (lastOhlc.high < lastTradeData.high) lastOhlc.high = lastTradeData.high;
        // console.log(lastOhlc);
        pixiData.replaceLast(lastOhlc);
        pixiData.updateCurrentPriceLabel(tradePrice);
        // }
    };
}
