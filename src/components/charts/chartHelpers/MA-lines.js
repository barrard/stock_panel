//making moving averages cool again
import { sum, mean, median, deviation } from "d3-array";
import { drawLine } from "./drawLine.js";
import { add_MA_data_action } from "../../../redux/actions/stock_actions.js";
import { line } from "d3-shape";

const close = (d) => d.close || d;

/* Makes the data for given  Moving Average*/
export function makeEMA(EMA_val, data) {
    if (!data) return;
    EMA_val = parseInt(EMA_val); //EMA_val is a string, the number of days on average
    const multiplier = 2 / (EMA_val + 1);

    let EMAdata = [];
    data.forEach((d, i) => {
        if (i === 0) return;
        if (i <= EMA_val) {
            let values = data.slice(0, i + 1);
            let valuesMean = mean(values, close);
            EMAdata.push({ x: data[i].timestamp || i, y: parseFloat(valuesMean.toFixed(3)) });
        } else {
            let prevEMA = EMAdata[EMAdata.length - 1].y;
            let close = d.close || d;
            let emaCalc = (close - prevEMA) * multiplier + prevEMA;
            emaCalc = parseFloat(emaCalc.toFixed(3));

            EMAdata.push({ x: d.timestamp, y: emaCalc });
        }
    });

    return EMAdata;
}

export function drawMALine(chartWindow, emaData, MA_value, { timeScale, priceScale }) {
    //   console.log(emaData);
    //   console.log({ MA_value, emaData });
    let MA_className = `ema${MA_value} emaLine`;
    let scales = { priceScale, timeScale };

    drawLine(chartWindow, emaData[MA_value], MA_className, scales);
}

export function drawColoredSuperTrend(chartWindow, values, className, { timeScale, priceScale }) {
    let start = new Date().getTime();
    values = values.filter((d) => {
        return d.superTrend && d.superTrend.superTrend;
    });
    console.log(`Time = ${new Date().getTime() - start}`);
    let redLineFunc = line()
        .defined((d) => {
            return d.close < d.superTrend.superTrend;
        })
        .x((d) => timeScale(d.timestamp))
        .y((d) => priceScale(d.superTrend.superTrend));

    let redLinePath = chartWindow.selectAll(`.${className}Red`).data([values]);
    // redLinePath.exit().remove();

    redLinePath.enter().append("path").merge(redLinePath).attr("class", `${className}Red superTrend`).attr("stroke-width", 6).attr("d", redLineFunc).attr("stroke", "red").attr("fill", "none");

    let greenLineFunc = line()
        .defined((d) => {
            return d.close > d.superTrend.superTrend;
        })
        .x((d) => timeScale(d.timestamp))
        .y((d) => priceScale(d.superTrend.superTrend));

    let greenLinePath = chartWindow.selectAll(`.${className}Green`).data([values]);
    // greenLinePath.exit().remove();

    greenLinePath.enter().append("path").merge(greenLinePath).attr("class", `${className}Green superTrend`).attr("stroke-width", 6).attr("d", greenLineFunc).attr("stroke", "green").attr("fill", "none");

    let xLineFunc = line()
        // .defined((d, i)=>{
        //   debugger
        //   return  d[i-10]
        // })
        .x((d) => timeScale(d.timestamp))
        .y((d) => priceScale(d.superTrend.superTrend));

    let xLinePath = chartWindow.selectAll(`.${className}X`).data([values]);
    // xLinePath.exit().remove();

    xLinePath.enter().append("path").merge(xLinePath).attr("class", `${className}X superTrend`).attr("stroke-width", 2).attr("d", xLineFunc).attr("stroke", "#666").attr("fill", "none");
}
