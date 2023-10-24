import * as ChartJS from "chart.js";

// Chart.defaults.ohlc = Chart.defaults.bar; // Inherit properties from a bar chart

// Chart.controllers.ohlc = Chart.Element.extend({
class OhlcBars extends ChartJS.BarController {
    // dataElementType: Chart.elements.OHLC,

    draw() {
        // Custom OHLC drawing logic here
        const ctx = this.chart.ctx;
        const dataset = this.getDataset();

        for (let i = 0; i < dataset.data.length; i++) {
            const dataPoint = dataset.data[i];
            const x = this.getScaleForId(this.getDataset().xAxisID).getPixelForValue(dataPoint.datetime);
            const open = this.getScaleForId(this.getDataset().yAxisID).getPixelForValue(dataPoint.open);
            const high = this.getScaleForId(this.getDataset().yAxisID).getPixelForValue(dataPoint.high);
            const low = this.getScaleForId(this.getDataset().yAxisID).getPixelForValue(dataPoint.low);
            const close = this.getScaleForId(this.getDataset().yAxisID).getPixelForValue(dataPoint.close);

            ctx.strokeStyle = "black"; // Customize line color
            ctx.beginPath();
            ctx.moveTo(x, high);
            ctx.lineTo(x, low);
            ctx.stroke();

            ctx.fillStyle = dataPoint.close < dataPoint.open ? "red" : "green"; // Red for down bars, green for up bars
            ctx.fillRect(x - 2, open, 4, close - open);
        }
    }
}
// Chart.controllers.ohlc.override("bar");
OhlcBars.id = "ohlc";
OhlcBars.defaults = ChartJS.BarController.defaults;

export default OhlcBars;
