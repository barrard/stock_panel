import { extent, scaleLinear, select, zoom, zoomTransform, mouse, interpolateNumber, interpolateLab } from "d3";
import { utils } from "pixi.js";

//Liquidity markers
const liquidityDraw = {
    id: "liquidity",
    afterDatasetsDraw: (chart, args, plugins) => {
        const liquidityData = chart.data.datasets.find((d) => d.id === "liquidity");
        const ohlcData = chart.data.datasets.find((d) => d.id === "ohlc");
        if (!liquidityData?.data?.length || !ohlcData?.data?.length) return;
        const {
            ctx,
            chartArea: { top, bottom, left, right, width, height },
            scales: { x, price: y },
        } = chart;
        // debugger;
        let barWidth;
        const colors = ["black", "blue", "green", "yellow", "red"];
        const liquidityHeight = 1; //1 point for ES
        let barCount = 0; // liquidityHeight deprecated for 4000, 40001 //Todo this is close * tick * tickSizeLiquidity ( 0.25 * 4 = 1 + close)
        const barHeight = y.getPixelForValue(0) - y.getPixelForValue(1);

        liquidityData.data.forEach((liquidity, l) => {
            if (Array.isArray(liquidity.liquidity)) return;

            // console.log(liquidity);
            const start = ohlcData.data.findIndex((ohlc) => ohlc.dt >= liquidity.time);

            if (start == undefined) {
                console.error("index not found");
                // debugger;
            }

            const startPx = x.getPixelForValue(start);
            if (!barWidth) {
                const endPx = x.getPixelForValue(start + 1);
                barWidth = endPx - startPx;
            }
            const vals = Object.values(liquidity.liquidity);
            const prices = Object.keys(liquidity.liquidity).sort((a, b) => a - b);
            const findNan = prices.find((p) => isNaN(p));
            if (findNan) {
                console.log(findNan);
                debugger;
            }
            const [min, max] = extent(vals);
            if (!min || !max) {
                console.log({ min, max });
                debugger;
            }
            const total = max - min;
            const totalDiff = Math.ceil(total / colors.length - 1);
            const colorFns = [];
            colors.forEach((color, i) => {
                if (i === 0) return;
                // if (i === colors.length - 1) return;
                const colorScale = scaleLinear().range([0, 1]);
                colorScale.domain([totalDiff * (i - 1), totalDiff * i]);
                colorFns.push((size) => {
                    return interpolateLab(colors[i - 1], colors[i])(colorScale(size));
                });
            });

            prices.forEach((price, i) => {
                try {
                    const x = startPx;
                    const top = y.getPixelForValue(price);
                    const liquidityVal = liquidity.liquidity[price];

                    let colorFnIndex = Math.floor((liquidityVal / totalDiff).toFixed(2));
                    if (colorFnIndex >= colorFns.length) {
                        colorFnIndex = colorFns.length - 1;
                    }
                    const colorFn = colorFns[colorFnIndex];
                    if (!colorFn || typeof colorFn !== "function") {
                        alert("buuuuug");
                        return;
                    }
                    let color = colorFn(liquidityVal); // "rgb(142, 92, 109)"
                    color = color.replace(")", "");
                    color += ", 0.2)"; //alpha

                    ctx.fillStyle = color;

                    ctx.fillRect(x, top, barWidth, barHeight);
                    barCount++;
                } catch (err) {
                    console.error(err);
                }
            });
            return;
        });
        console.log(barCount);
    },
};

export default liquidityDraw;
