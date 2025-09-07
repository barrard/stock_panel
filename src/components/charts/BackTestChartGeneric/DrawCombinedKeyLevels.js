import { Graphics, Container, Text, TextStyle } from "pixi.js";

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
        if (this.hasInit) return;
        this.hasInit = true;
        this.initCombinedKeyLevels();
        this.xScale = this.pixiDataRef.current.xScale;
        this.priceScale = this.pixiDataRef.current.priceScale;
    }

    initCombinedKeyLevels() {
        // Use a container to hold individual graphics for each level
        this.combinedKeyLevelsContainer = new Container();
        this.pixiDataRef.current.addToLayer(0, this.combinedKeyLevelsContainer);
    }

    getCombinedKeyLevels() {
        return this.data;
    }

    cleanup() {
        // Clean up text labels
        this.textLabels.forEach((label) => label.destroy());
        this.textLabels = [];

        // Destroy the container, which will also destroy all its children (the level graphics)
        if (this.combinedKeyLevelsContainer) {
            this.combinedKeyLevelsContainer.destroy({ children: true });
            this.combinedKeyLevelsContainer = null;
        }
    }

    createTextLabel(text, x, y, style = {}) {
        const defaultStyle = new TextStyle({
            fontFamily: "Arial",
            fontSize: 12,
            fill: 0xffffff, // Using white as a neutral default color
            stroke: 0x000000,
            strokeThickness: 2, // Increased for better readability
            ...style,
        });

        const textLabel = new Text(text, defaultStyle);
        textLabel.x = x;
        textLabel.y = y;

        this.pixiDataRef.current.addToLayer(0, textLabel);
        this.textLabels.push(textLabel);
        return textLabel;
    }

    drawRect(gfx, data) {
        gfx.drawRect(data.x, data.y, data.w, data.h);
    }

    drawZoneLevel(level) {
        const x1 = this.chartWidth - this.chartWidth * 0.25;
        const x2 = this.chartWidth;
        const y1 = level.highest;
        const y2 = level.lowest;
        const opacity = level.opacity;
        const hasLvn = level.labels.find((item) => item.includes("lvn"));

        const rectData = {
            x: x1,
            y: this.priceScale(y1),
            w: x2 - x1,
            h: this.priceScale(y2) - this.priceScale(y1),
        };

        // Create a new Graphics object for each rectangle to make it individually interactive
        const gfx = new Graphics();
        gfx.beginFill(hasLvn ? 0x00c8ff : 0xffaa00, opacity);
        this.drawRect(gfx, rectData);
        gfx.endFill();

        // Enable interaction for this specific graphic
        gfx.interactive = true;
        gfx.buttonMode = true;

        // Add event listeners directly to this graphic object
        gfx.on("mouseover", (event) => {
            // Clear any labels from a previous hover
            this.textLabels.forEach(label => label.destroy());
            this.textLabels = [];
    
            const xPos = rectData.x - 10; // 10px left of the rectangle
            let yPos = rectData.y;
    
            level.labels.forEach(labelText => {
                const textLabel = this.createTextLabel(labelText, xPos, yPos);
                textLabel.anchor.set(1, 0); // Align text to the right
                yPos += textLabel.height + 2; // Stack labels vertically with a 2px gap
            });
        });

        gfx.on("mouseout", (event) => {
            // When mouse leaves, destroy all the temporary labels
            this.textLabels.forEach(label => label.destroy());
            this.textLabels = [];
        });

        // Add the new graphic to our container
        this.combinedKeyLevelsContainer.addChild(gfx);
    }

    drawAllCombinedLevels() {
        if (!this.combinedKeyLevelsContainer) {
            return;
        }

        // Clear the container by removing and destroying all children from the previous draw
        this.combinedKeyLevelsContainer.removeChildren().forEach(child => child.destroy());

        // Clean up any separate text labels
        this.textLabels.forEach((label) => label.destroy());
        this.textLabels = [];

        const combinedKeyLevels = this.getCombinedKeyLevels();
        if (combinedKeyLevels) {
            combinedKeyLevels.forEach((level) => {
                this.drawZoneLevel(level);
            });
        }
    }
}
