export default function onLastTrade({ setLastTrade, setOhlcDatas, pixiData, tickBar = false, lastTradesRef }) {
    return (message) => {
        const { avgVolPerSecond, tradePrice, volume, lastTradeData } = message;
        if (lastTradesRef?.current?.[message.symbol]) {
            lastTradesRef.current[message.symbol] = { ...lastTradesRef.current[message.symbol], ...message };
        }
        if (message.symbol !== pixiData.symbol.value) return;

        const lastOhlc = pixiData.ohlcDatas.slice(-1)[0];
        if (!lastOhlc) {
            return;
        }

        const close = tradePrice;
        lastOhlc.close = close;
        lastOhlc.volume += volume;
        if (lastTradeData?.vwap) {
            lastOhlc.vwap = lastTradeData.vwap;
        }
        pixiData.replaceLast(lastOhlc);
        pixiData.updateCurrentPriceLabel(tradePrice);
        setLastTrade(message);
    };
}
