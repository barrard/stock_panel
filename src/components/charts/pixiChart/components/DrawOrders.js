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
import { priceType } from "./utils";

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
            const IS_MARKET_ORDER = priceType(order.priceType) === "MARKET" || order.priceType === "MARKET";
            const IS_LIMIT_ORDER = priceType(order.priceType) === "LIMIT" || order.priceType === "LIMIT";
            const IS_STOP_MARKET_ORDER = priceType(order.priceType) === "STOP_MARKET" || order.priceType === "STOP_MARKET";
            const IS_STOP_LIMIT_ORDER = priceType(order.priceType) === "STOP_LIMIT" || order.priceType === "STOP_LIMIT";
            const status = String(order.status || "").toLowerCase();
            const reportType = String(order.reportType || "").toLowerCase();
            const completionReason = String(order.completionReason || "").toUpperCase();
            const hasFill =
                completionReason === "F" ||
                Boolean(order.fillTime) ||
                Boolean(order.fillPrice) ||
                Boolean(order.avgFillPrice) ||
                status === "complete" ||
                order.isComplete ||
                reportType === "fill";
            const isCancelled =
                order.notifyType === "CANCEL" ||
                completionReason === "C" ||
                order.isCancelled ||
                reportType === "cancel" ||
                status.includes("cancel");
            const isRejected = order.rejected || reportType === "reject" || status.includes("reject");
            const startTime = this.getPrimaryTime(order, [
                "statusTime",
                "openTime",
                "triggerTime",
                "orderReceivedFromClientTime",
                "originalOrderReceivedFromClientTime",
                "ssboe",
            ]);
            const endTime = this.getPrimaryTime(order, ["fillTime", "endTime", "completeTime", "cancelTime", "statusTime", "ssboe"]);
            const durationMs = startTime && endTime ? endTime - startTime : 0;
            const shouldDrawInstantFill = IS_MARKET_ORDER && hasFill && (!durationMs || durationMs < 1000);

            if (isRejected) return;
            if (isCancelled) {
                this.drawCancelledMarker(order);
            } else if (hasFill) {
                if (shouldDrawInstantFill) {
                    this.drawInstantFillMarker(order);
                } else {
                    this.drawFilledMarker(order);
                }
            } else if (IS_LIMIT_ORDER || IS_STOP_MARKET_ORDER || IS_STOP_LIMIT_ORDER || IS_MARKET_ORDER) {
                this.drawOpenMarker(order);
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

    getPrimaryTime(order, fields = []) {
        for (const field of fields) {
            const value = order?.[field];
            if (value === undefined || value === null || value === "") continue;
            const numericValue = Number(value);
            if (Number.isFinite(numericValue)) {
                return numericValue * 1000;
            }
        }
        return null;
    }

    resolveDisplayPrice(order) {
        return order?.fillPrice ?? order?.avgFillPrice ?? order?.triggerPrice ?? order?.price ?? order?.limitPrice ?? order?.stopPrice;
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

        const statusTime = this.getPrimaryTime(order, ["statusTime", "openTime", "triggerTime", "fillTime", "ssboe"]);
        if (!Number.isFinite(statusTime)) return;

        let startIndex = this.data.slicedData.findIndex((d) => d.timestamp >= statusTime);
        if (startIndex < 0) return;

        const startX = this.data.xScale(startIndex);
        const y = this.data.priceScale(this.resolveDisplayPrice(order));
        if (y === undefined) return;

        const radius = 5;
        const color = order.transactionType === "BUY" || order.transactionType === 1 ? 0x00ff00 : 0xff0000;

        // Draw start marker
        this.ordersGfx.lineStyle(2, color, 0.9);
        this.ordersGfx.beginFill(color, 0.1);
        this.ordersGfx.drawCircle(startX, y, radius);

        const finishTime = this.getPrimaryTime(order, ["fillTime", "endTime", "completeTime", "statusTime", "ssboe"]);
        if (finishTime) {
            const endTime = finishTime;
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

    drawInstantFillMarker(order) {
        if (!this.ordersGfx?._geometry || !this.data.slicedData.length) return;

        const eventTime = this.getPrimaryTime(order, ["fillTime", "endTime", "statusTime", "ssboe"]);
        if (!Number.isFinite(eventTime)) return;

        const index = this.data.slicedData.findIndex((d) => d.timestamp >= eventTime);
        if (index < 0) return;

        const x = this.data.xScale(index);
        const y = this.data.priceScale(this.resolveDisplayPrice(order));
        if (y === undefined) return;

        const radius = 5;
        const color = order.transactionType === "BUY" || order.transactionType === 1 ? 0x00ff00 : 0xff0000;
        this.ordersGfx.lineStyle(2, color, 0.9);
        this.ordersGfx.beginFill(color, 0.5);
        this.ordersGfx.drawCircle(x, y, radius);
    }

    drawCancelledMarker(order) {
        if (!this.ordersGfx?._geometry || !this.data.slicedData.length) return;

        const endTime = this.getPrimaryTime(order, ["cancelTime", "endTime", "statusTime", "ssboe"]);
        if (!Number.isFinite(endTime)) return;

        let endIndex = this.data.slicedData.findIndex((d) => d.timestamp >= endTime);
        if (endIndex < 0) return;

        const endX = this.data.xScale(endIndex);
        const y = this.data.priceScale(this.resolveDisplayPrice(order));
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

        const openTime = this.getPrimaryTime(order, ["openTime", "statusTime", "triggerTime", "ssboe"]);
        if (openTime) {
            let openIndex = this.data.slicedData.findIndex((d) => d.timestamp >= openTime);

            const startX = this.data.xScale(openIndex);

            // Draw connecting line
            this.ordersGfx.lineStyle(3, color, 0.5);
            this.ordersGfx.moveTo(startX, y);
            this.ordersGfx.lineTo(endX, y);
        }
    }

    drawOpenMarker(order) {
        if (!this.ordersGfx?._geometry || !this.data.slicedData.length) return;

        const startTime = this.getPrimaryTime(order, ["statusTime", "openTime", "triggerTime", "orderReceivedFromClientTime", "ssboe"]);
        if (!Number.isFinite(startTime)) return;
        let startIndex = this.data.slicedData.findIndex((d) => d.timestamp >= startTime);
        if (startIndex < 0) return;

        const startX = this.data.xScale(startIndex);
        // debugger;
        const y = this.data.priceScale(this.resolveDisplayPrice(order));
        if (y === undefined) return;

        const radius = 10;
        const color = order.transactionType === "BUY" || order.transactionType === 1 ? 0x00ff00 : 0xff0000;

        // Draw start marker
        this.ordersGfx.lineStyle(2, color, 0.9);
        this.ordersGfx.beginFill(color, 0.1);
        this.ordersGfx.drawCircle(startX, y, radius);

        const finishTime = this.getPrimaryTime(order, ["endTime", "fillTime", "completeTime", "statusTime"]);
        if (finishTime) {
            const endTime = finishTime;
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
