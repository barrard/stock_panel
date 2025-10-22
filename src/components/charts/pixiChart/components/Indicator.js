import { Graphics, Container, Rectangle, Text, TextMetrics, TextStyle } from "pixi.js";
import { extent, scaleLinear, select, zoom, zoomTransform, mouse } from "d3";
import PixiAxis from "./PixiAxis";
import { priceScaleValues } from "./utils.js";

export default class Indicator {
    constructor({ name, height, data, drawFn, chart, accessors, type, lineColor = 0x3b82f6, canGoNegative = false, lines = null }) {
        this.accessors = accessors;
        this.chart = chart;
        this.data = [];
        this.drawFn = drawFn;
        this.height = height;
        this.initialized = false;
        this.name = name;
        this.pointerOver = false;
        this.type = type;
        this.lineColor = lineColor;
        this.canGoNegative = canGoNegative;

        // Multi-line support
        this.lines = lines; // Array of line configs: [{ name, lineColor, lineKey, xKey }]

        // console.log(this.name);
    }

    init() {
        this.initialized = true;
        this.container = new Container();

        this.container.interactive = true;
        // this.container.eventMode = "static"; // or 'dynamic'
        // this.container.cursor = "pointer"; // Optional: change cursor on hover

        const { width, margin } = this.chart;
        const { left, right, bottom, top } = margin;
        this.hitArea = new Rectangle(0, 0, width - (left + right), this.height);
        this.container.hitArea = this.hitArea;

        // // Debug: visualize the hit area
        // const debugGraphics = new Graphics();
        // debugGraphics.beginFill(0xff0000, 0.3); // Semi-transparent red
        // debugGraphics.drawRect(0, 0, width - (left + right), this.height / 2);
        // debugGraphics.endFill();
        // this.container.addChild(debugGraphics); // Remove this after debugging

        this.scale = scaleLinear().range([this.height, 0]); //.range([height, indicatorHeight]);
        this.gfx = new Graphics();
        this.borderGfx = new Graphics();

        // Initialize current price label graphics
        this.currentPriceLabelAppendGfx = new Graphics();

        const style = new TextStyle({
            fontFamily: "Arial, sans-serif",
            fontSize: 10,
            fontWeight: "bold",
            fill: "#ffffff",
            // stroke: "#2c3e50",
            // strokeThickness: 3,
            // dropShadow: true,
            // dropShadowColor: "#000000",
            // dropShadowBlur: 4,
            // dropShadowAngle: Math.PI / 6,
            // dropShadowDistance: 1,
        });

        this.darkTextStyle = () => {
            return new TextStyle({
                fontFamily: "Arial",
                fontSize: this.chart.calculateCrosshairFontSize(),
                fontWeight: "bold",
                fill: 0x333333,
                align: "center",
            });
        };

        this.nameText = new Text(this.name, style);
        this.currentPriceTxtLabel = new Text("", this.darkTextStyle());
        this.currentPriceTxtLabel.anchor.y = 0.5;

        this.hitArea = new Rectangle(0, 0, width - (left + right), this.height);

        this.yAxis = new PixiAxis({
            chart: this.chart,
            type: "y",
            scale: this.scale,
            valueFinder: priceScaleValues,
            maxTicks: 5,
            tickSize: 1,
        });

        this.chart.height += this.height;
        this.chart.drawCrossHair();

        this.container.addChild(this.gfx);
        this.container.addChild(this.borderGfx);
        this.container.addChild(this.yAxis.tickLinesGfx);

        this.container.addChild(this.yAxis.container);
        this.container.addChild(this.nameText);
        this.container.addChild(this.currentPriceLabelAppendGfx);
        this.container.addChild(this.currentPriceTxtLabel);

        this.container.hitArea = this.hitArea;
        this.container
            .on("pointerover", (e) => {
                this.pointerOver = true;
                //tell the cross hair to use this scale....
                // console.log(`Pointer over ${this.name}, container.position.y: ${this.container.position.y}, hitArea:`, this.hitArea);

                this.chart.setYScale(this.scale);
                this.chart.yMouseOffset = this.container.position.y;
            })
            .on("pointerout", (e) => {
                this.pointerOver = false;

                this.chart.setYScale(false);
            })

            .on("pointermove", (e) => {
                if (!this.pointerOver) return;
                this.chart.onMouseMove(e);
            })
            .on("pointerdown", (e) => {
                this.chart.onMouseMove(e);
                this.chart.onDragStart();
            })
            .on("pointerup", () => {
                this.chart.onDragEnd();
            })
            .on("pointerupoutside", () => this.chart.onDragEnd());

        this.yAxis.container.position.x = width - (right + left);
        this.yAxis.container.position.y = 0;

        this.borderGfx.clear();
        this.borderGfx.lineStyle(3, 0xffffff, 1);

        const rightSide = width - (left + right);

        // Draw top dividing line
        this.borderGfx.moveTo(0, 0);
        this.borderGfx.lineTo(rightSide, 0);

        // Draw left side
        this.borderGfx.moveTo(0, 0);
        this.borderGfx.lineTo(0, this.height);

        // Draw bottom
        this.borderGfx.lineTo(rightSide, this.height);

        // Draw right side
        this.borderGfx.lineTo(rightSide, 0);
    }

    updateCurrentPriceLabel(value) {
        if (!value || !this.currentPriceLabelAppendGfx || !this.currentPriceTxtLabel) return;

        if (!this.lastValue) {
            this.lastValue = value;
        }

        const y = this.scale(value);

        // Determine appropriate decimal places based on scale range
        const [domainMin, domainMax] = this.scale.domain();
        const range = Math.abs(domainMax - domainMin);

        let decimalPlaces;
        if (range < 1) {
            decimalPlaces = 3;
        } else if (range < 10) {
            decimalPlaces = 2;
        } else if (range < 100) {
            decimalPlaces = 1;
        } else {
            decimalPlaces = 0;
        }

        const formattedValue = Number(value.toFixed(decimalPlaces)).toLocaleString(undefined, {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces,
        });

        const color = value > this.lastValue ? 0x00ff00 : value < this.lastValue ? 0xff0000 : 0xaaaaaa;

        this.currentPriceTxtLabel.y = y;
        this.currentPriceLabelAppendGfx.position.y = y;
        this.currentPriceTxtLabel.text = formattedValue;

        const { width, height } = TextMetrics.measureText(formattedValue, this.darkTextStyle());
        const padding = this.chart.calculateLabelPadding();
        const x = this.chart.width + padding - (this.chart.margin.left + this.chart.margin.right);

        this.currentPriceTxtLabel.x = x;
        this.currentPriceLabelAppendGfx.position.x = x;

        // Draw label background
        this.currentPriceLabelAppendGfx.clear();
        this.currentPriceLabelAppendGfx.beginFill(color);
        this.currentPriceLabelAppendGfx.lineStyle(1, 0x333333, 1);

        const coords = [
            { x: 0 - padding, y: 0 },
            { x: 0, y: -height / 2 },
            { x: width, y: -height / 2 },
            { x: width, y: height / 2 },
            { x: 0, y: height / 2 },
            { x: 0 - padding, y: 0 },
        ];

        this.currentPriceLabelAppendGfx.drawPolygon(coords.flatMap(c => [c.x, c.y]));
        this.currentPriceLabelAppendGfx.endFill();

        this.lastValue = value;
    }

    setupScales() {
        console.log(`[Indicator.setupScales] ${this.name} - type: ${this.type}, accessor: ${this.accessors}`);

        // Clear graphics for redraw
        this.gfx?.clear();

        let lowest, highest;

        // Multi-line indicator
        if (this.lines && this.lines.length > 0) {
            // Calculate extent across all lines
            let allValues = [];
            this.lines.forEach((lineConfig) => {
                const lineData = this.chart.slicedData.map((ohlc) => ohlc[lineConfig.lineKey]);
                allValues = allValues.concat(lineData.filter((v) => v != null && !isNaN(v)));
            });

            [lowest, highest] = extent(allValues);

            // For line charts, allow negative values by using actual extent
            if (this.canGoNegative || this.type === "line" || this.type === "multi-line") {
                // Keep as is
            } else {
                lowest = Math.min(0, lowest);
            }

            this.scale.domain([lowest, highest]);
            this.yAxis.render({ highest, lowest });

            // Draw each line
            this.lines.forEach((lineConfig) => {
                this.drawFn({
                    lineColor: lineConfig.lineColor,
                    lineWidth: lineConfig.lineWidth || 2,
                    yField: lineConfig.lineKey,
                    xScale: this.chart.xScale,
                    yScale: this.scale,
                    data: this.chart.slicedData,
                    chartData: this,
                    gfx: this.gfx,
                    skipClear: true, // Don't clear - we already cleared once at the top
                });
            });

            // Update current price label with the last value from the first line
            if (this.lines.length > 0 && this.chart.slicedData.length > 0) {
                const lastDataPoint = this.chart.slicedData[this.chart.slicedData.length - 1];
                const firstLineKey = this.lines[0].lineKey;
                if (lastDataPoint[firstLineKey] != null) {
                    this.updateCurrentPriceLabel(lastDataPoint[firstLineKey]);
                }
            }
        }
        // Single line/volume/candlestick indicator
        else {
            // For candlestick type, calculate extent from all OHLC fields
            if (this.type === "candlestick") {
                const openField = this.accessors.replace("Close", "Open");
                const highField = this.accessors.replace("Close", "High");
                const lowField = this.accessors.replace("Close", "Low");
                const closeField = this.accessors;

                console.log(`[Indicator.setupScales] Candlestick fields:`, { openField, highField, lowField, closeField });

                let allValues = [];
                this.chart.slicedData.forEach((bar, idx) => {
                    if (bar[openField] !== undefined && bar[openField] !== null) allValues.push(bar[openField]);
                    if (bar[highField] !== undefined && bar[highField] !== null) allValues.push(bar[highField]);
                    if (bar[lowField] !== undefined && bar[lowField] !== null) allValues.push(bar[lowField]);
                    if (bar[closeField] !== undefined && bar[closeField] !== null) allValues.push(bar[closeField]);

                    // Log first bar with data
                    if (idx === 0 && bar[closeField] !== undefined) {
                        console.log(`[Indicator.setupScales] First bar with data:`, {
                            open: bar[openField],
                            high: bar[highField],
                            low: bar[lowField],
                            close: bar[closeField]
                        });
                    }
                });

                console.log(`[Indicator.setupScales] Candlestick values collected: ${allValues.length}`);

                [lowest, highest] = extent(allValues);
                this.data = this.chart.slicedData.map((bar) => bar[closeField]); // For reference

                console.log(`[Indicator.setupScales] Scale domain: [${lowest}, ${highest}]`);
            } else {
                // Line or volume
                this.data = this.chart.slicedData.map((ohlc) => ohlc[this.accessors]);
                let [low, high] = extent(this.data);
                lowest = low;
                highest = high;
            }

            // For line/candlestick charts with canGoNegative, allow negative values
            // For volume charts, keep 0 as the minimum
            if (this.canGoNegative || this.type === "line" || this.type === "candlestick") {
                // Keep lowest as is
            } else {
                lowest = Math.min(0, lowest);
            }

            this.scale.domain([lowest, highest]);
            this.yAxis.render({ highest, lowest });

            // Draw single line, candlestick, or volume
            if (this.type === "line") {
                this.drawFn({
                    lineColor: this.lineColor,
                    lineWidth: 2,
                    yField: this.accessors,
                    xScale: this.chart.xScale,
                    yScale: this.scale,
                    data: this.chart.slicedData,
                    chartData: this,
                    gfx: this.gfx,
                });

                // Update current price label with the last value
                if (this.chart.slicedData.length > 0) {
                    const lastDataPoint = this.chart.slicedData[this.chart.slicedData.length - 1];
                    if (lastDataPoint[this.accessors] != null) {
                        this.updateCurrentPriceLabel(lastDataPoint[this.accessors]);
                    }
                }
            } else if (this.type === "candlestick") {
                console.log(`[Indicator.setupScales] Calling candlestick drawFn for ${this.name}`);
                this.drawFn({
                    xScale: this.chart.xScale,
                    yScale: this.scale,
                    data: this.chart.slicedData,
                    chartData: this,
                    gfx: this.gfx,
                });

                // Update current price label with the last close value
                if (this.chart.slicedData.length > 0) {
                    const lastDataPoint = this.chart.slicedData[this.chart.slicedData.length - 1];
                    if (lastDataPoint[this.accessors] != null) {
                        this.updateCurrentPriceLabel(lastDataPoint[this.accessors]);
                    }
                }
            } else {
                this.drawFn(this);

                // For volume indicators, update with last volume value
                if (this.chart.slicedData.length > 0 && this.accessors) {
                    const lastDataPoint = this.chart.slicedData[this.chart.slicedData.length - 1];
                    if (lastDataPoint[this.accessors] != null) {
                        this.updateCurrentPriceLabel(lastDataPoint[this.accessors]);
                    }
                }
            }
        }
    }
}
