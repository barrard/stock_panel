import { Graphics, Container, Rectangle, Text, TextMetrics, TextStyle, utils } from "pixi.js";

export default class drawStrikes {
    constructor(data, pixiDataRef, callsOrPuts, currentUnderlyingPrice) {
        this.data = data;
        this.pixiDataRef = pixiDataRef;
        this.callsOrPuts = callsOrPuts;
        this.currentUnderlyingPrice = currentUnderlyingPrice;
        this.hasInit = false;
        this.init();
    }
    init() {
        if (this.hasInit) return;
        this.hasInit = true;
        this.initStrikePriceLines();
    }

    // In your initialization/setup code:
    initStrikePriceLines() {
        console.log("init lines");
        // Create the graphics object for strike lines
        this.strikeLinesGfx = new Graphics();
        // Add to your main chart container
        this.pixiDataRef.current.mainChartContainer.addChild(this.strikeLinesGfx);
    }

    getCurrentStrikeData() {
        return this.data;
    }

    cleanup() {
        if (this.strikeLinesGfx) {
            // Remove from parent container
            if (this.strikeLinesGfx.parent) {
                this.strikeLinesGfx.parent.removeChild(this.strikeLinesGfx);
            }
            // Destroy the graphics object safely
            try {
                this.strikeLinesGfx.destroy();
            } catch (error) {
                console.warn("Graphics object already destroyed:", error);
            }
            this.strikeLinesGfx = null;
        }
    }

    drawAllStrikeLines() {
        if (!this.strikeLinesGfx) {
            return;
        }

        const strikeData = this.getCurrentStrikeData();
        if (!strikeData || (!strikeData.callsCurrentData && !strikeData.putsCurrentData)) {
            return;
        }

        const data = this.callsOrPuts === "CALLS" ? strikeData.callsCurrentData : strikeData.putsCurrentData;

        try {
            this.strikeLinesGfx.clear(); // This will now clear everything
        } catch (err) {
            return err;
        }

        const lineWidth = 1;
        const lineAlpha = 0.7;

        if (data) {
            const lineColor = this.callsOrPuts === "CALLS" ? 0x00ff00 : 0xff0000;
            const zoneColor = this.callsOrPuts === "CALLS" ? 0x00ff00 : 0xff0000;

            // Chart width
            const chartWidth =
                this.pixiDataRef.current.width - (this.pixiDataRef.current.margin.left + this.pixiDataRef.current.margin.right);

            // Loop through each strike price
            Object.keys(data).forEach((strikePrice) => {
                const optionsAtStrike = data[strikePrice];
                if (optionsAtStrike && optionsAtStrike.length > 0) {
                    const optionData = optionsAtStrike[0];
                    const strike = parseFloat(strikePrice);
                    const lastPrice = optionData.last;
                    if (lastPrice > 1) return;

                    // Calculate breakeven price
                    let breakEvenPrice;
                    if (this.callsOrPuts === "CALLS") {
                        breakEvenPrice = strike + lastPrice;
                    } else {
                        breakEvenPrice = strike - lastPrice;
                    }

                    // Get Y positions
                    const strikeY = this.pixiDataRef.current.priceScale(strike);
                    const breakEvenY = this.pixiDataRef.current.priceScale(breakEvenPrice);

                    // Create fade zone around breakeven line
                    const zoneHeight = 2; // Total pixels above and below breakeven
                    const fadeSteps = 6; // Number of fade layers

                    // Draw fade zone with multiple layers
                    for (let i = 0; i < fadeSteps; i++) {
                        const stepHeight = zoneHeight / fadeSteps;
                        const alpha = 0.5 * (1 - i / fadeSteps); // Fade from 0.5 to 0

                        this.strikeLinesGfx.beginFill(zoneColor, alpha);

                        // Draw layer above breakeven
                        this.strikeLinesGfx.drawRect(0, breakEvenY - stepHeight * (i + 1), chartWidth, stepHeight);

                        // Draw layer below breakeven
                        this.strikeLinesGfx.drawRect(0, breakEvenY + stepHeight * i, chartWidth, stepHeight);

                        this.strikeLinesGfx.endFill();
                    }

                    // Draw the strike line (thinner, more subtle)
                    this.strikeLinesGfx.lineStyle(lineWidth, lineColor, lineAlpha * 0.6);
                    this.strikeLinesGfx.moveTo(0, strikeY);
                    this.strikeLinesGfx.lineTo(chartWidth, strikeY);

                    // Draw the breakeven line (prominent, on top of fade zone)
                    this.strikeLinesGfx.lineStyle(2, lineColor, 0.9);
                    this.strikeLinesGfx.moveTo(0, breakEvenY);
                    this.strikeLinesGfx.lineTo(chartWidth, breakEvenY);
                }
            });
        }
    }
}
