export default function onLastTrade({ setLastTrade, setOhlcDatas, pixiData, tickBar = false }) {
    return (message) => {
        const { avgVolPerSecond, tradePrice, volume, vwap } = message;

        if (message.symbol !== pixiData.symbol.value) return;

        const lastOhlc = pixiData.ohlcDatas.slice(-1)[0];
        if (!lastOhlc) {
            return;
        }

        const close = tradePrice;
        lastOhlc.close = close;
        lastOhlc.volume += volume;
        if (vwap) {
            lastOhlc.vwap = vwap;
        }
        pixiData.replaceLast(lastOhlc);
        pixiData.updateCurrentPriceLabel(tradePrice);
    };
}
