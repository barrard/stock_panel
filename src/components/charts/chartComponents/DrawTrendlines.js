import * as PIXI from "pixi.js";

const trendlineColors = {
    higher: 0x00ff00, // green
    lower: 0xff0000, // red
    equal: 0xffff00, // yellow
};

export default class DrawTrendlines {
    constructor(pixiDataRef, trendlineData) {
        this.pixiDataRef = pixiDataRef;
        this.trendlineData = trendlineData;
        this.gfx = new PIXI.Graphics();
        this.pixiDataRef.current.addToLayer(2, this.gfx); // Add to a layer, e.g., layer 2
        this.draw = this.draw.bind(this);
    }

    draw() {
        this.gfx.clear();
        const { slicedData, xScale, priceScale } = this.pixiDataRef.current;
        if (!this.trendlineData || !this.trendlineData.length || !slicedData || !slicedData.length) {
            return;
        }

        const minMaxData = this.trendlineData[0]?.minMax;
        if (!minMaxData) return;

        const { highLowerHighs, highLowerLows } = minMaxData;

        this.drawLines(highLowerHighs, 'high');
        this.drawLines(highLowerLows, 'low');
    }

    drawLines(trendlines, priceKey) {
        if (!trendlines || !trendlines.length) {
            return;
        }
        const { slicedData, xScale, priceScale } = this.pixiDataRef.current;

        // Create a map for quick lookup of datetime to index in slicedData
        const datetimeToIndex = new Map(
            slicedData.map((bar, index) => [bar.datetime, index])
        );

        let lastX = null;
        let lastY = null;

        trendlines.forEach((point, i) => {
            const { data, name } = point;
            if (!data) return;

            const { datetime } = data;
            const priceValue = data[priceKey];
            const index = datetimeToIndex.get(datetime);

            if (index !== undefined) {
                const x = xScale(index);
                const y = priceScale(priceValue);
                const color = trendlineColors[name] || 0xffffff; // Default to white

                if (lastX !== null && lastY !== null) {
                    this.gfx.lineStyle(2, color);
                    this.gfx.moveTo(lastX, lastY);
                    this.gfx.lineTo(x, y);
                }

                lastX = x;
                lastY = y;
            }
        });
    }

    destroy() {
        this.pixiDataRef.current.removeFromLayer(2, this.gfx);
        this.gfx.destroy();
    }
}