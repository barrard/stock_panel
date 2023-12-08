//Trade markers
const tradeMarker = {
    id: "tradeMarker",
    afterDatasetsDraw: (chart, args, plugins) => {
        const tradeData = chart.data.datasets.find((d) => d.id === "trades");
        const ohlcData = chart.data.datasets.find((d) => d.id === "ohlc");
        if (!tradeData?.data?.length || !ohlcData?.data?.length) return;
        const {
            ctx,
            chartArea: { top, bottom, left, right, width, height },
            scales: { x, price: y },
        } = chart;

        tradeData.data.forEach((trade) => {
            console.log(trade);
            const indexOpen = ohlcData.data.findIndex((ohlc) => ohlc.dt >= trade.datetimeOpen);
            const indexClose = ohlcData.data.findIndex((ohlc) => ohlc.dt >= trade.datetimeClose);
            if (indexOpen == undefined || indexClose == undefined) {
                console.error("index not found");
            }
            const R = 10;
            const xOpen = x.getPixelForValue(indexOpen);
            const yOpen = y.getPixelForValue(trade.enter);
            ctx.save();
            ctx.beginPath();
            ctx.arc(xOpen, yOpen, R, 0, Math.PI * 2);
            ctx.fillStyle = trade.buySell == "Buy" ? "green" : "red";
            ctx.fill();
            ctx.closePath();

            const xClose = x.getPixelForValue(indexClose);
            const yClose = y.getPixelForValue(trade.exit);
            ctx.beginPath();
            ctx.arc(xClose, yClose, R, 0, Math.PI * 2);
            ctx.fillStyle = trade.buySell == "Buy" ? "red" : "green";
            ctx.fill();
            ctx.closePath();

            const yTarget = y.getPixelForValue(trade.target);
            const yStop = y.getPixelForValue(trade.stop);
        });
        // ctx.save();
        // ctx.beginPath();
        // ctx.arc(x.getPixelForValue(2000), top, 20, 0, Math.PI * 2);
        // ctx.fillStyle = "black"; // or any color you prefer
        // ctx.fill();
        // ctx.closePath();
    },
};

module.exports = tradeMarker;
