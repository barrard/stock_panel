import { Graphics, Container, Rectangle, Text, TextMetrics, TextStyle, utils } from "pixi.js";

export default class DrawCombinedKeyLevels {
    constructor(data, pixiDataRef) {
        this.data = data;
        this.pixiDataRef = pixiDataRef;
        this.hasInit = false;
        this.textLabels = []; // Array to store text labels for cleanup
        this.chartWidth = this.pixiDataRef.current.width - (this.pixiDataRef.current.margin.left + this.pixiDataRef.current.margin.right);

        this.init();
    }
    init() {
        console.log("DrawCombinedKeyLevels init");
        if (this.hasInit) return;
        console.log("hasInit false, running init");
        this.hasInit = true;
        this.initCombinedKeyLevels();
        this.xScale = this.pixiDataRef.current.xScale;
        this.priceScale = this.pixiDataRef.current.priceScale;
    }

    // In your initialization/setup code:
    initCombinedKeyLevels() {
        console.log("init combine key levels");
        // Create the graphics object for strike lines
        this.combinedKeyLevelsGfx = new Graphics();
        this.combinedKeyLevelsGfx.interactive = true;
        this.combinedKeyLevelsGfx.buttonMode = true;
        // Add to your main chart container
        this.pixiDataRef.current.addToLayer(0, this.combinedKeyLevelsGfx);
    }

    getCombinedKeyLevels() {
        //might have some logic here to filter or process data
        return this.data;
    }

    cleanup() {
        debugger;
        // Clean up text labels
        this.textLabels.forEach((label) => {
            if (label.parent) {
                label.parent.removeChild(label);
            }
            try {
                label.destroy();
            } catch (error) {
                console.warn("Text label already destroyed:", error);
            }
        });
        this.textLabels = [];

        if (this.combinedKeyLevelsGfx) {
            // Remove from parent container
            this.combinedKeyLevelsGfx.clear(); // This will now clear everything

            if (this.combinedKeyLevelsGfx.parent) {
                this.combinedKeyLevelsGfx.parent.removeChild(this.combinedKeyLevelsGfx);
            }
            // Destroy the graphics object safely
            try {
                this.combinedKeyLevelsGfx.destroy();
            } catch (error) {
                console.warn("Graphics object already destroyed:", error);
            }
            this.combinedKeyLevelsGfx = null;
        }
    }

    // Helper method to create text labels
    createTextLabel(text, x, y, style = {}) {
        const defaultStyle = new TextStyle({
            fontFamily: "Arial",
            fontSize: 12,
            fill: this.callsOrPuts === "CALLS" ? 0x00ff00 : 0xff0000,
            stroke: 0x000000,
            strokeThickness: 1,
            ...style,
        });

        const textLabel = new Text(text, defaultStyle);
        textLabel.x = x;
        textLabel.y = y;

        // Add to main chart container
        this.pixiDataRef.current.addToLayer(0, textLabel);

        this.textLabels.push(textLabel);

        return textLabel;
    }
    drawRect(gfx, data) {
        gfx.drawRect(data.x, data.y, data.w, data.h);
    }
    drawZoneLevel(level) {
        debugger;
        const x1 = this.chartWidth - this.chartWidth * 0.25;
        const x2 = this.chartWidth;
        const gfx = this.combinedKeyLevelsGfx;

        // const x1 =
        // const x2 =
        const y1 = level.highest;
        const y2 = level.lowest;
        const opacity = level.opacity;
        debugger;
        const hasLvn = level.labels.find((item) => item.includes("lvn"));

        gfx.beginFill(hasLvn ? 0x00c8ff : 0xffaa00, opacity);

        const data = {
            x: x1,
            y: this.priceScale(y1),
            w: x2 - x1,
            h: this.priceScale(y2) - this.priceScale(y1),
        };

        this.drawRect(gfx, data);
        gfx.endFill();
        // this.combinedKeyLevelsContainer.addChild(gfx);
        gfx.on("mouseover", (e, t) => {
            console.log("mouseove");
            console.log({ e, t });
            console.log(level);
        });

        // Define a mouseout event
        gfx.on("mouseout", (e, t) => {
            console.log("mouseout");
            console.log({ e, t });
            console.log(level);
        });
    }

    drawAllCombinedLevels() {
        console.log("drawAllCombinedLevels");
        debugger;
        if (!this.combinedKeyLevelsGfx) {
            return;
        }

        const combinedKeyLevels = this.getCombinedKeyLevels();
        if (!combinedKeyLevels) {
            return;
        }

        const data = combinedKeyLevels;

        try {
            this.combinedKeyLevelsGfx.clear(); // This will now clear everything
            // return;
        } catch (err) {
            return err;
        }

        // Clean up existing text labels
        this.textLabels.forEach((label) => {
            if (label.parent) {
                label.parent.removeChild(label);
            }
            try {
                label.destroy();
            } catch (error) {
                console.warn("Text label already destroyed:", error);
            }
        });

        this.textLabels = [];

        if (data) {
            data.forEach((level) => {
                this.drawZoneLevel(level);
            });
        }
    }
}
