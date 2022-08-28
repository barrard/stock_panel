import { line } from "d3";

export default class MyLine {
    constructor(xScale, yScale, svgChart, margin) {
        this.xScale = xScale;
        this.yScale = yScale;
        this.svgChart = svgChart;
        this.chartLen = 99;
        this.margin = margin;
    }

    myLine = () => {
        return line()
            .x((d, i) => {
                let x = this.xScale(i);
                return x;
            })
            .y((d) => {
                let y = this.yScale(d);
                return y;
            });
    };
    indicatorLyLine = () => {
        console.log("mmmyyyy  llliiinnnneeeeS");
        return line()
            .x((d, i) => {
                let x = this.xScale(this.chartLen - i);
                return x;
            })
            .y((d, i) => {
                let y = this.yScale(d[this.chartLen - i]);
                return y;
            });
    };

    draw(chartSvg, data = [], weeklyPriceLevels, xScale, yScale) {
        if (!this.svgChart || !this.svgChart.selectAll) return;
        this.data = data;
        this.weeklyPriceLevels = weeklyPriceLevels;

        this.closeLine();

        this.drawIndicator("MA5", "tomato");
        this.drawIndicator("MA20", "salmon");
        this.drawIndicator("MA50", "red");
        this.drawIndicator("MA100", "blue");
        this.drawIndicator("MA200", "green");
        this.priceLevels("above", {
            className: "priceLevels_above",
            strokeWidth: 3,
            stroke: "darkRed",
        });
        this.priceLevels("below", {
            className: "priceLevels_above",
            strokeWidth: 3,
            stroke: "lawngreen",
        });
    }

    priceLevels(name, opts) {
        this.svgChart
            .selectAll(`.${opts.className}`)
            .data(this.weeklyPriceLevels.priceLevels?.[name] || [50])
            .enter()
            .append("line")
            .attr("class", `${opts.className}`)
            .attr("x1", this.xScale(0))
            .attr("x2", this.xScale(this.data.length - 1))
            .attr("y1", (d) => this.yScale(d) + this.margin.top)
            .attr("y2", (d) => this.yScale(d) + this.margin.top)
            .style("opacity", opts.opacity || 0.7)

            .attr("stroke-width", opts.strokeWidth || 3)
            .attr("stroke", (d) => opts.stroke || "darkRed")
            .attr("clip-path", "url(#mainChart-clipBox)"); //CORRECTION
    }

    closeLine() {
        this.svgChart.selectAll(`.close_line`).remove();

        this.drawLine("close_line", "red", this.data);
    }
    drawIndicator(name, color) {
        const data = this.weeklyPriceLevels[name];
        if (!data) {
            return console.log(`There is no weekly data for ${name}`);
        }
        const len = this.data.length - data.length;
        for (let x = 0; x < len; x++) {
            data.unshift(data[data.length - 1]);
        }
        this.drawLine(`Indicator_${name}`, color, data);
    }

    drawLine(className, color, data) {
        this.svgChart
            .selectAll(`.${className}`)
            .data([data])
            .join("path")
            .attr("class", `${className}`)
            .attr("d", this.myLine())
            .attr("fill", "none")
            .attr("stroke", color)
            .attr("clip-path", "url(#weekly-clipBox)") //CORRECTION
            .exit();
    }
}
