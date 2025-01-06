import {
    Graphics,
    Container,
    Rectangle,
    Text,
    TextMetrics,
    TextStyle,
    utils,
    // CLEAR_MODES,
} from "pixi.js";
import { extent, max, min } from "d3-array";

import { scaleLinear } from "d3";

import { eastCoastTime, isRTH } from "../../../../indicators/indicatorHelpers/IsMarketOpen";

export default class DrawOrders {
    constructor(dataHandler) {
        this.data = dataHandler;
        this.orders = [];

        this.container = new Container();

        this.ordersGfx = new Graphics();
        this.container.addChild(this.ordersGfx);
    }

    draw(data) {
        this.orders = data;
        if (!this.ordersGfx?._geometry || !this.orders) {
            return;
        }

        this.ordersGfx.clear();
        // debugger;
        Object.keys(this.orders).forEach((basketId) => {
            const order = this.orders[basketId];
            if (order.completionReason == "F") {
                this.drawFilledMarker(order);
            } else if ((order.statusTime && order.priceType !== "MARKET" && !order.isComplete) || (order.triggerTime && !order.isComplete && !order.isCancelled)) {
                // debugger;
                this.drawOpenMarker(order);
            } else if (order.fillTime) {
                this.drawFilledMarker(order);
            } else if (order.notifyType === "CANCEL" || order.completionReason === "C" || order.isCancelled) {
                // console.log(order);
                // this.drawCancelledMarker(order);
                this.drawFilledMarker(order);
            } else {
                console.log(order);
                // debugger;
            }
            // else if (order.status === "complete") {
            //     this.drawMarker(order);
            // } else if (order.status === "trigger pending") {
            //     // debugger;
            //     this.drawStop(order);
            // } else if (order.status === "Cancellation Failed") {
            //     // this.drawStop(order);
            //     console.log("Cancellation Failed and we dont care");
            // }
            // else {
            //     // debugger;
            //     // console.log(order);
            // }
        });
    }

    drawStop(order) {
        if (!this.ordersGfx?._geometry || !this.data.slicedData.length) return;

        const time = Math.floor(order.ssboe * 1000);
        let endIndex = this.data.slicedData.findIndex((d) => d.timestamp > time);

        if (endIndex < 0) {
            return; //TODO don't just hide it,....
            // endIndex = this.data.slicedData.length - 1;
        }

        const x = this.data.xScale(endIndex);
        debugger;
        const y = this.data.priceScale(order.triggerPrice || order.price || order.fillPrice);
        const radius = 6; //this.data.priceScale(0) - this.data.priceScale(1);
        // console.log({ radius });
        const color = order.transactionType === "BUY" ? 0x00ff00 : 0xff0000;
        this.ordersGfx.beginFill(color, 0.5);
        this.ordersGfx.lineStyle(2, color, 0.9);

        this.ordersGfx.drawCircle(x, y, radius);
    }

    drawMarker(order) {
        if (!this.ordersGfx?._geometry || !this.data.slicedData.length) return;

        const time = Math.floor(Math.floor(order.ssboe / 100) * 100000);
        let endIndex = this.data.slicedData.findIndex((d) => d.timestamp > time);

        if (endIndex < 0) {
            return;
            endIndex = this.data.slicedData.length - 1;
        }

        const x = this.data.xScale(endIndex);

        const price = order.price || order.avgFillPrice;
        const y = this.data.priceScale(price);
        const radius = 6; //this.data.priceScale(0) - this.data.priceScale(1);
        // console.log({ radius });
        const color = order.transactionType === "BUY" || order.transactionType === 1 ? 0x00ff00 : 0xff0000;
        this.ordersGfx.beginFill(color, 0.5);
        this.ordersGfx.lineStyle(2, color, 0.9);
        if (order.completionReason === "C" || order.reportType == "cancel") {
            const size = 6;
            this.ordersGfx.moveTo(x - size, y - size);
            this.ordersGfx.lineTo(x + size, y + size);

            this.ordersGfx.moveTo(x + size, y + size);
            this.ordersGfx.lineTo(x - size, y - size);
        } else {
            this.ordersGfx.drawCircle(x, y, radius);
        }
    }
    drawFilledMarker(order) {
        if (!this.ordersGfx?._geometry || !this.data.slicedData.length) return;

        const statusTime = Math.floor((order.statusTime || order.openTime) * 1000);

        let startIndex = this.data.slicedData.findIndex((d) => d.timestamp >= statusTime);
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
            let endIndex = this.data.slicedData.findIndex((d) => d.timestamp >= endTime);
            if (endIndex < 0) return;

            const endX = this.data.xScale(endIndex);

            // Draw connecting line
            this.ordersGfx.lineStyle(3, color, 0.5);
            this.ordersGfx.moveTo(startX, y);
            this.ordersGfx.lineTo(endX, y);

            if (order.isCancelled) {
                // Draw X
                const size = radius * 0.7;
                this.ordersGfx.lineStyle(2, color, 0.9);
                this.ordersGfx.moveTo(endX - size, y - size);
                this.ordersGfx.lineTo(endX + size, y + size);
                this.ordersGfx.moveTo(endX - size, y + size);
                this.ordersGfx.lineTo(endX + size, y - size);
            } else if (order.isComplete) {
                // Draw filled circle
                this.ordersGfx.beginFill(color, 0.5);
                this.ordersGfx.lineStyle(2, color, 0.9);
                this.ordersGfx.drawCircle(endX, y, radius);
            }
        }
    }

    // drawCancelledMarker(order) {
    //     if (!this.ordersGfx?._geometry || !this.data.slicedData.length) return;

    //     const endTime = Math.floor(order.endTime * 1000);

    //     let endIndex = this.data.slicedData.findIndex((d) => d.timestamp >= endTime);
    //     if (endIndex < 0) return;

    //     const endX = this.data.xScale(endIndex);
    //     const y = this.data.priceScale(order.price);
    //     if (y === undefined) return;
    //     const radius = 10;
    //     const color = order.transactionType === "BUY" || order.transactionType === 1 ? 0x00ff00 : 0xff0000;

    //     // Draw X
    //     const size = radius * 0.7;
    //     this.ordersGfx.lineStyle(2, color, 0.9);
    //     this.ordersGfx.moveTo(endX - size, y - size);
    //     this.ordersGfx.lineTo(endX + size, y + size);
    //     this.ordersGfx.moveTo(endX - size, y + size);
    //     this.ordersGfx.lineTo(endX + size, y - size);

    //     if (order.openTime) {
    //         const openTime = Math.floor(order.openTime * 1000);
    //         let openIndex = this.data.slicedData.findIndex((d) => d.timestamp >= openTime);

    //         const startX = this.data.xScale(openIndex);

    //         // Draw connecting line
    //         this.ordersGfx.lineStyle(3, color, 0.5);
    //         this.ordersGfx.moveTo(startX, y);
    //         this.ordersGfx.lineTo(endX, y);
    //     }
    // }

    drawOpenMarker(order) {
        if (!this.ordersGfx?._geometry || !this.data.slicedData.length) return;

        const startTime = Math.floor(order.statusTime * 1000);
        let startIndex = this.data.slicedData.findIndex((d) => d.timestamp >= startTime);
        if (startIndex < 0) return;

        const startX = this.data.xScale(startIndex);
        // debugger;
        const y = this.data.priceScale(order.fillPrice || order.avgFillPrice || order.triggerPrice || order.price);
        if (y === undefined) return;

        const radius = 10;
        const color = order.transactionType === "BUY" || order.transactionType === 1 ? 0x00ff00 : 0xff0000;

        // Draw start marker
        this.ordersGfx.lineStyle(2, color, 0.9);
        this.ordersGfx.beginFill(color, 0.1);
        this.ordersGfx.drawCircle(startX, y, radius);

        if (order.endTime) {
            const endTime = Math.floor(order.endTime * 1000);
            let endIndex = this.data.slicedData.findIndex((d) => d.timestamp >= endTime);
            if (endIndex < 0) return;

            const endX = this.data.xScale(endIndex);

            // Draw connecting line
            this.ordersGfx.lineStyle(3, color, 0.5);
            this.ordersGfx.moveTo(startX, y);
            this.ordersGfx.lineTo(endX, y);

            if (order.isCancelled) {
                // Draw X
                const size = radius * 0.7;
                this.ordersGfx.lineStyle(2, color, 0.9);
                this.ordersGfx.moveTo(endX - size, y - size);
                this.ordersGfx.lineTo(endX + size, y + size);
                this.ordersGfx.moveTo(endX - size, y + size);
                this.ordersGfx.lineTo(endX + size, y - size);
            } else if (order.isComplete) {
                // Draw filled circle
                this.ordersGfx.beginFill(color, 0.5);
                this.ordersGfx.lineStyle(2, color, 0.9);
                this.ordersGfx.drawCircle(endX, y, radius);
            }
        } else {
            // Draw connecting line to the end of the chart
            const endX = this.data.xScale(this.data.slicedData.length - 1); // Get the x-coordinate of the last data point
            this.ordersGfx.lineStyle(3, color, 0.5);
            this.ordersGfx.moveTo(startX, y);
            this.ordersGfx.lineTo(endX, y);

            // Optionally, you might want to add a marker to indicate it's an ongoing order
            // For example, an arrow or a dashed line extension
            this.ordersGfx.lineStyle(2, color, 0.3);
            const arrowSize = radius * 0.7;
            this.ordersGfx.moveTo(endX - arrowSize, y - arrowSize);
            this.ordersGfx.lineTo(endX, y);
            this.ordersGfx.lineTo(endX - arrowSize, y + arrowSize);
        }
    }
}
