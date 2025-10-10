import { Graphics, Container } from "pixi.js";

export default class DrawOrdersV2 {
    constructor(dataHandler) {
        this.data = dataHandler;
        this.orders = [];
        this.initialized = false;

        this.container = new Container();
        this.ordersGfx = new Graphics();
        this.container.addChild(this.ordersGfx);

        // Initialize and add to layer
        this.init();
    }

    init() {
        if (this.initialized) return;

        // Add container to the chart at layer 2 (above candles, below crosshair)
        this.data.addToLayer(2, this.container);
        this.initialized = true;
    }

    cleanup() {
        // Remove from parent before destroying
        if (this.container && this.container.parent) {
            this.container.parent.removeChild(this.container);
        }

        // Destroy container
        if (this.container && !this.container._destroyed) {
            this.container.destroy({ children: true });
        }

        // Clear data
        this.orders = [];

        // Reset initialization flag so it can be re-initialized
        this.initialized = false;
    }

    draw(data) {
        this.orders = data;
        if (!this.ordersGfx?._geometry || !this.orders) {
            return;
        }

        this.ordersGfx.clear();

        Object.keys(this.orders).forEach((basketId) => {
            const order = this.orders[basketId];

            if (order.completionReason == "F" || order.fillTime) {
                this.drawFilledMarker(order);
            } else if (order.notifyType === "CANCEL" || order.completionReason === "C" || order.isCancelled) {
                this.drawCancelledMarker(order);
            } else {
                this.drawOpenMarker(order);
            }
        });
    }

    drawFilledMarker(order) {
        if (!this.ordersGfx?._geometry || !this.data.slicedData.length) return;

        const statusTime = Math.floor((order.statusTime || order.openTime) * 1000);
        let startIndex = this.data.slicedData.findIndex((d) => (d.timestamp || d.datetime) >= statusTime);
        if (startIndex < 0) return;

        const startX = this.data.xScale(startIndex);
        const y = this.data.priceScale(order.fillPrice || order.avgFillPrice || order.triggerPrice || order.price);
        if (y === undefined) return;

        const radius = 5;
        const color = order.transactionType === "BUY" || order.transactionType === 1 ? 0x00ff00 : 0xff0000;

        // Draw start marker
        this.ordersGfx.lineStyle(2, color, 0.9);
        this.ordersGfx.beginFill(color, 0.1);
        this.ordersGfx.drawCircle(startX, y, radius);

        if (order.fillTime || order.endTime) {
            const endTime = Math.floor((order.fillTime || order.endTime) * 1000);
            let endIndex = this.data.slicedData.findIndex((d) => (d.timestamp || d.datetime) >= endTime);
            if (endIndex < 0) return;

            const endX = this.data.xScale(endIndex);

            // Draw connecting line
            this.ordersGfx.lineStyle(3, color, 0.5);
            this.ordersGfx.moveTo(startX, y);
            this.ordersGfx.lineTo(endX, y);

            // Draw filled circle at end
            this.ordersGfx.beginFill(color, 0.5);
            this.ordersGfx.lineStyle(2, color, 0.9);
            this.ordersGfx.drawCircle(endX, y, radius);
        }
    }

    drawCancelledMarker(order) {
        if (!this.ordersGfx?._geometry || !this.data.slicedData.length) return;

        const endTime = Math.floor(order.endTime * 1000);
        let endIndex = this.data.slicedData.findIndex((d) => (d.timestamp || d.datetime) >= endTime);
        if (endIndex < 0) return;

        const endX = this.data.xScale(endIndex);
        const y = this.data.priceScale(order.price);
        if (y === undefined) return;

        const radius = 10;
        const color = order.transactionType === "BUY" || order.transactionType === 1 ? 0x00ff00 : 0xff0000;

        // Draw X
        const size = radius * 0.7;
        this.ordersGfx.lineStyle(2, color, 0.9);
        this.ordersGfx.moveTo(endX - size, y - size);
        this.ordersGfx.lineTo(endX + size, y + size);
        this.ordersGfx.moveTo(endX - size, y + size);
        this.ordersGfx.lineTo(endX + size, y - size);

        if (order.openTime) {
            const openTime = Math.floor(order.openTime * 1000);
            let openIndex = this.data.slicedData.findIndex((d) => (d.timestamp || d.datetime) >= openTime);

            const startX = this.data.xScale(openIndex);

            // Draw connecting line
            this.ordersGfx.lineStyle(3, color, 0.5);
            this.ordersGfx.moveTo(startX, y);
            this.ordersGfx.lineTo(endX, y);
        }
    }

    drawOpenMarker(order) {
        if (!this.ordersGfx?._geometry || !this.data.slicedData.length) return;

        const startTime = Math.floor(order.statusTime * 1000);
        let startIndex = this.data.slicedData.findIndex((d) => (d.timestamp || d.datetime) >= startTime);
        if (startIndex < 0) return;

        const startX = this.data.xScale(startIndex);
        const y = this.data.priceScale(order.fillPrice || order.avgFillPrice || order.triggerPrice || order.price);
        if (y === undefined) return;

        const radius = 10;
        const color = order.transactionType === "BUY" || order.transactionType === 1 ? 0x00ff00 : 0xff0000;

        // Draw start marker
        this.ordersGfx.lineStyle(2, color, 0.9);
        this.ordersGfx.beginFill(color, 0.1);
        this.ordersGfx.drawCircle(startX, y, radius);

        // Draw connecting line to the end of the chart
        const endX = this.data.xScale(this.data.slicedData.length - 1);
        this.ordersGfx.lineStyle(3, color, 0.5);
        this.ordersGfx.moveTo(startX, y);
        this.ordersGfx.lineTo(endX, y);

        // Draw arrow to indicate it's an ongoing order
        this.ordersGfx.lineStyle(2, color, 0.3);
        const arrowSize = radius * 0.7;
        this.ordersGfx.moveTo(endX - arrowSize, y - arrowSize);
        this.ordersGfx.lineTo(endX, y);
        this.ordersGfx.lineTo(endX - arrowSize, y + arrowSize);
    }
}
