import { Graphics, Container, Rectangle, Text, TextMetrics, TextStyle } from "pixi.js";

export default class PixiAxis {
    constructor({ chart, type, scale, values, valueAccessor = (v) => v, valueFinder, maxTicks, tickSize, dragScale = false }) {
        this.chart = chart;
        this.tickSize = tickSize;
        // this.textStyle = PixiChart.textStyle;
        this.type = type;
        this.scale = scale;
        this.values = values;
        this.maxTicks = maxTicks || 40;

        this.valueFinder = valueFinder;
        this.valueAccessor = valueAccessor.bind(this);

        // Calculate font size based on margin
        const margin = this.chart.margin || this.chart.options?.margin || {};
        const fontSize = this.calculateFontSize(margin);

        this.textStyle = new TextStyle({
            fontFamily: "Arial",
            fontSize: fontSize,
            fontWeight: "bold",
            fill: 0xffffff,
            align: "center",
        });
        this.tickLabels = [];

        this.dragScale = dragScale;

        // Drag state management
        this.isDragging = false;
        this.lastMouseY = null;
        this.dragSensitivity = 0.01; // Adjust this to control drag sensitivity

        return this.init();
    }

    calculateFontSize(margin) {
        // Scale font size based on the relevant margin dimension
        // Y-axis uses right margin, X-axis uses bottom margin
        const relevantMargin = this.type === "y" ? (margin.right || 100) : (margin.bottom || 40);

        // Base calculation: scale proportionally
        // Default: right: 100 -> fontSize: 16, bottom: 40 -> fontSize: 16
        const baseFontSize = this.type === "y" ? 16 : 16;
        const baseMargin = this.type === "y" ? 100 : 40;

        const scaledSize = (relevantMargin / baseMargin) * baseFontSize;

        // Clamp between min and max values
        return Math.max(10, Math.min(20, scaledSize));
    }

    init() {
        const { margin, height, width } = this.chart;
        // const { margin, height, width } = this.chart.options || this.chart;
        const { left, right, top, bottom } = margin;
        this.container = new Container();

        if (this.dragScale || true) {
            this.container.interactive = true;
            console.log("adddd eveentss");
            this.setHitArea();
            this.backgroundGfx
                .on("mousewheel", (e) => {
                    console.log("wheeeel");
                })
                .on("scroll", (e) => {
                    console.log("wheeeel");
                })

                .on("mousedown", (e) => {
                    console.log("mousedown");
                    this.onDragStart(e);
                })
                .on("pointerdown", (e) => {
                    console.log("pointerdown");
                    this.onDragStart(e);
                })
                .on("pointerup", () => {
                    console.log("pointerup");
                    this.onDragEnd();
                })
                .on("pointerupoutside", () => {
                    console.log("pointerupoutside");
                    this.onDragEnd();
                })
                .on("pointermove", (e) => {
                    // console.log("pointermove");
                    this.onDrag(e);
                })
                .on("dblclick", () => {
                    this.resetScale();
                });
        }
        this.tickLinesGfx = new Graphics();
        // this.testGfx = new Graphics();
        this.tickLinesGfx.lineStyle(1, 0xffffff, 1);
        // this.testGfx.lineStyle(1, 0xffffff, 1);

        // Make tick lines non-interactive so they don't block drag events
        this.tickLinesGfx.interactive = false;
        this.tickLinesGfx.interactiveChildren = false;

        this.container.addChild(this.tickLinesGfx);

        //make 6 ticks, could be configured?
        for (let x = 0; x < this.maxTicks; x++) {
            const priceTxtLabel = new Text("", this.textStyle);
            priceTxtLabel.anchor[this.type] = 0.5;

            // Make text labels completely non-interactive so they don't block drag events
            priceTxtLabel.interactive = false;
            priceTxtLabel.interactiveChildren = false;
            priceTxtLabel.buttonMode = false;
            priceTxtLabel.cursor = "default";

            // this.chart.pixiApp.stage.addChild(priceTxtLabel);

            this.container.addChild(priceTxtLabel);

            this.tickLabels.push(priceTxtLabel);
        }

        return this;
    }

    render(opts = {}) {
        let { highest, lowest, values } = opts;
        if (highest) this.highest = highest;
        if (!highest && this.highest) highest = this.highest;
        if (lowest) this.lowest = lowest;
        if (!lowest && this.lowest) lowest = this.lowest;
        if (values) this.values = values;
        if (!values && this.values) values = this.values;

        try {
            if (this.tickLinesGfx?._geometry) this.tickLinesGfx?.clear();
            if (!this.container) return;
        } catch (error) {
            return console.log("catching a buzz");
        }

        let customValues, textValues;
        if (this.valueFinder) {
            customValues = this.valueFinder({ highest, lowest, values });
        }

        const oppositeAxis = this.type === "x" ? "y" : "x";
        // const start = Math.floor(highest);
        for (let count = 0; count < this.maxTicks; count++) {
            let value; //= start - sixths * count;
            const priceTxtLabel = this.tickLabels[count];

            if (!this?.container?.removeChild) return;
            this.container.removeChild(priceTxtLabel);

            if (customValues) {
                value = customValues[count];
            }
            if (!value) {
                continue;
            }
            if (!priceTxtLabel || !priceTxtLabel.transform) {
                continue;
            }

            //TEXT LABEL POSITION
            // if (this.valueAccessor) {
            //     priceTxtLabel[this.type] = value;
            //     this.addTickLine(value);
            // } else {
            const _val = this.scale(value);
            priceTxtLabel[this.type] = _val;
            this.addTickLine(_val);

            // }

            let printLabel = false;
            if (textValues) {
                if (textValues[value]) {
                    printLabel = true;
                }
            } else {
                printLabel = true;
            }

            if (printLabel) {
                //LABEL PRINTED VALUE
                value = this.valueAccessor(value);
                priceTxtLabel.text = value;

                // Position text labels based on margin size
                const margin = this.chart.margin || this.chart.options?.margin || {};
                if (this.type === "y") {
                    // Scale X offset based on right margin (base: 100 -> 20px, min: 50 -> 10px)
                    const xOffset = Math.max(5, (margin.right || 100) * 0.2);
                    priceTxtLabel.x = xOffset;
                    priceTxtLabel.anchor.x = 0; // Left-align the text
                } else {
                    // Scale Y offset based on bottom margin (base: 40 -> 10px, min: 15 -> 4px)
                    const yOffset = Math.max(3, (margin.bottom || 40) * 0.25);
                    priceTxtLabel[oppositeAxis] = yOffset;
                }

                this.container.addChild(priceTxtLabel);
            }
        }
    }

    addTickLine(value) {
        // console.log(`draw line at ${value}`);
        if (!this.chart.margin && !this.chart.options.margin) {
            alert("No margin??");
            return;
        }
        if (!this.tickLinesGfx?.lineStyle || !this.tickLinesGfx?._lineStyle) {
            return;
        }
        const { left, right, top, bottom } = this.chart.options?.margin || this.chart.margin;
        this.tickLinesGfx.lineStyle(1, 0xffffff, 0.3);
        if (this.type === "x") {
            this.tickLinesGfx.moveTo(value, -this.chart.innerHeight());
            this.tickLinesGfx.lineTo(value, 0);
        } else if (this.type === "y") {
            this.tickLinesGfx.moveTo(-this.chart.innerWidth(), value);
            this.tickLinesGfx.lineTo(0, value);
        } else {
            alert("HUH?");
        }
    }

    setHitArea() {
        const { margin, height, width } = this.chart || !this.chart.options;
        const { left, right, top, bottom } = margin;
        if (!this?.container) return;
        this.backgroundGfx = new Graphics();

        //add hit area for pointer events

        this.backgroundGfx.interactive = true;
        this.container.interactiveMousewheel = true;
        // Use a transparent fill so it still catches events but is invisible
        this.backgroundGfx.beginFill(0x365456, 0.01); // Very low alpha

        if (this.type === "y") {
            // Draw background slightly larger to ensure it covers all text
            this.backgroundGfx.drawRect(-10, -10, right + 20, height - (top + bottom) + 20);
            // this.hitArea = new Rectangle(width - right, top, right, height - (top + bottom));
        } else if (this.type === "x") {
            // Draw background slightly larger to ensure it covers all text
            this.backgroundGfx.drawRect(-10, -10, width - (left + right) + 20, bottom + 20);
            // this.hitArea = new Rectangle(0, 0, width - (left + right), bottom);
        }
        this.backgroundGfx.endFill();

        // Add background graphics LAST so it's on top and catches all events
        this.container.addChild(this.backgroundGfx);

        // Force the container to only respond to events within the background area
        if (this.type === "y") {
            this.container.hitArea = new Rectangle(-10, -10, right + 20, height - (top + bottom) + 20);
        } else if (this.type === "x") {
            this.container.hitArea = new Rectangle(-10, -10, width - (left + right) + 20, bottom + 20);
        }

        console.log("setting hit area axis");
    }

    onDragStart(e) {
        if (this.type !== "y") return; // Only handle Y-axis dragging for now

        this.isDragging = true;
        this.lastMouseY = e.data.global.y;
        this.chart.setManualYScale(true); // Prevent automatic Y scale recalculation
        this.chart.setIsVerticalZooming(true);
        console.log("Y-axis drag started");
    }

    onDragEnd() {
        if (this.type !== "y") return;

        this.isDragging = false;
        this.lastMouseY = null;
        // Keep manual scale active - user can double-click to reset if needed
        console.log("Y-axis drag ended");
        this.chart.setIsVerticalZooming(false);
    }

    onDrag(e) {
        // console.log(this.isDragging);
        if (this.type !== "y" || !this.isDragging || this.lastMouseY === null) return;

        const currentMouseY = e.data.global.y;
        const deltaY = currentMouseY - this.lastMouseY;

        // Convert pixel movement to scale adjustment
        this.adjustYScale(deltaY);

        this.lastMouseY = currentMouseY;
    }

    adjustYScale(deltaY) {
        // Get current domain
        const currentDomain = this.chart.priceScale.domain();
        const [lowest, highest] = currentDomain;
        const range = highest - lowest;

        // Calculate zoom factor based on deltaY and sensitivity
        // Negative deltaY (moving up) should zoom in, positive should zoom out
        const zoomFactor = 1 + deltaY * this.dragSensitivity;

        // Calculate the center point of current domain
        const center = (lowest + highest) / 2;

        // Calculate new range based on zoom
        const newRange = range * zoomFactor;

        // Calculate new bounds around the center
        const newLowest = center - newRange / 2;
        const newHighest = center + newRange / 2;

        // Update the price scale domain directly
        this.chart.priceScale.domain([newLowest, newHighest]);

        // Re-render the axis with new domain
        this.render({ highest: newHighest, lowest: newLowest });

        // Trigger chart redraw without recalculating Y domain
        this.chart.draw();
    }

    resetScale() {
        if (this.type !== "y") return;

        // Reset manual scale override
        this.chart.setManualYScale(false);

        // Force recalculation of scale domain based on visible data
        this.chart.setupPriceScales();

        console.log("Y-axis scale reset to auto");
    }
}
