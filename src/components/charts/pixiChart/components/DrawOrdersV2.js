import { Graphics, Container } from "pixi.js";
import { compileOrders, priceType } from "./utils";

export default class DrawOrdersV2 {
    constructor(dataHandler) {
        this.data = dataHandler;
        this.orders = [];
        this.initialized = false;
        this.missingPriceLogged = new Set();
        this.debugPrefix = "[DrawOrdersV2]";

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
        this.missingPriceLogged.clear();

        // Reset initialization flag so it can be re-initialized
        this.initialized = false;
    }

    resolvePrice(order, context) {
        const price =
            order?.fillPrice ??
            order?.avgFillPrice ??
            order?.triggerPrice ??
            order?.price ??
            order?.entryPrice ??
            order?.limitPrice ??
            order?.stopPrice;

        if (price === undefined) {
            const key = order?.basketId || `${context}-${Math.random()}`;
            if (!this.missingPriceLogged.has(key)) {
                this.missingPriceLogged.add(key);
                console.warn(`${this.debugPrefix} ${context} price missing`, {
                    basketId: order?.basketId,
                    status: order?.status,
                    reportType: order?.reportType,
                    completionReason: order?.completionReason,
                    order,
                });
            }
        }

        return price;
    }

    getTimestamp(order, fields = []) {
        for (const field of fields) {
            if (order?.[field]) {
                return Math.floor(order[field] * 1000);
            }
        }
        return null;
    }

    getStartTime(order) {
        return (
            this.getTimestamp(order, [
                "statusTime",
                "openTime",
                "triggerTime",
                "orderReceivedFromClientTime",
                "originalOrderReceivedFromClientTime",
                "orderSentToExchTime",
            ]) ?? (order?.ssboe ? Math.floor(order.ssboe * 1000) : null)
        );
    }

    getEndTime(order) {
        return this.getTimestamp(order, ["fillTime", "endTime", "cancelTime", "orderActiveTime", "statusTime", "triggerTime"]) ?? null;
    }

    draw(data) {
        if (data) {
            this.orders = data;
        }

        const ordersToDraw = this.orders;
        const basketCount = ordersToDraw ? Object.keys(ordersToDraw).length : 0;
        // console.log(`${this.debugPrefix} draw invoked`, {
        //     basketCount,
        //     hasGeometry: !!this.ordersGfx?._geometry,
        //     slicedData: this.data?.slicedData?.length || 0,
        // });

        if (!this.ordersGfx?._geometry || !ordersToDraw) {
            console.warn(`${this.debugPrefix} aborting draw - ordersGfx missing geometry or no orders object`);
            return;
        }

        this.ordersGfx.clear();
        debugger;
        Object.keys(ordersToDraw).forEach((basketId) => {
            let order = ordersToDraw[basketId];
            const originalOrder = [...order];
            debugger;
            if (Array.isArray(order)) {
                const compiled = compileOrders(order, {});
                order = compiled[basketId];
                if (!order) {
                    console.warn(`${this.debugPrefix} No compiled order for basket`, { basketId });
                    return;
                }
            }

            const normalizedPriceType = priceType(order.priceType);
            const IS_MARKET_ORDER = normalizedPriceType === "MARKET";
            const IS_LIMIT_ORDER = normalizedPriceType === "LIMIT";
            const IS_STOP_MARKET_ORDER = normalizedPriceType === "STOP_MARKET";
            const IS_STOP_LIMIT_ORDER = normalizedPriceType === "STOP_LIMIT";

            const status = (order.status || "").toLowerCase();
            const reportType = (order.reportType || "").toLowerCase();
            const completionReason = (order.completionReason || "").toUpperCase();

            const hasFill =
                Boolean(order.fillTime) ||
                Boolean(order.fillPrice) ||
                Boolean(order.avgFillPrice) ||
                Boolean(order.totalFillSize) ||
                reportType === "fill" ||
                status === "complete" ||
                order.isComplete ||
                completionReason === "F";

            const isCancelled =
                order.notifyType === "CANCEL" ||
                completionReason === "C" ||
                order.isCancelled ||
                reportType === "cancel" ||
                status.includes("cancel");

            const startTime = this.getStartTime(order);
            const endTime = this.getEndTime(order);
            const durationMs = startTime && endTime ? endTime - startTime : 0;
            const shouldDrawInstantFill = IS_MARKET_ORDER && hasFill && (!durationMs || durationMs < 1000);

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
            } else {
                console.warn(`${this.debugPrefix} Unhandled order type, defaulting to open marker`, {
                    basketId: order?.basketId,
                    priceType: order?.priceType,
                    status: order?.status,
                    completionReason: order?.completionReason,
                    originalOrder,
                });
                this.drawOpenMarker(order);
            }
        });
    }

    drawInstantFillMarker(order) {
        if (!this.ordersGfx?._geometry || !this.data.slicedData.length) return;

        const fillTime = this.getEndTime(order) || this.getStartTime(order);
        if (!fillTime) return;
        let index = this.data.slicedData.findIndex((d) => (d.timestamp || d.datetime) >= fillTime);
        if (index < 0) return;

        const x = this.data.xScale(index);
        const y = this.data.priceScale(this.resolvePrice(order, "drawInstantFillMarker"));
        if (y === undefined) return;

        const radius = 6;
        const color = order.transactionType === "BUY" || order.transactionType === 1 ? 0x00ff00 : 0xff0000;
        this.ordersGfx.lineStyle(2, color, 0.9);
        this.ordersGfx.beginFill(color, 0.5);
        this.ordersGfx.drawCircle(x, y, radius);
    }

    drawFilledMarker(order) {
        if (!this.ordersGfx?._geometry || !this.data.slicedData.length) {
            console.warn(`${this.debugPrefix} drawFilledMarker missing geometry or slicedData`);
            return;
        }

        const startTime = this.getStartTime(order);
        if (!startTime) {
            console.warn(`${this.debugPrefix} drawFilledMarker missing start time`, { basketId: order?.basketId });
            return;
        }

        let startIndex = this.data.slicedData.findIndex((d) => (d.timestamp || d.datetime) >= startTime);
        if (startIndex < 0) {
            console.warn(`${this.debugPrefix} drawFilledMarker could not find startIndex`, {
                startTime,
                firstBar: this.data.slicedData[0]?.timestamp || this.data.slicedData[0]?.datetime,
                lastBar:
                    this.data.slicedData[this.data.slicedData.length - 1]?.timestamp ||
                    this.data.slicedData[this.data.slicedData.length - 1]?.datetime,
            });
            return;
        }

        const startX = this.data.xScale(startIndex);
        const y = this.data.priceScale(this.resolvePrice(order, "drawFilledMarker"));
        if (y === undefined) {
            console.warn(`${this.debugPrefix} drawFilledMarker priceScale returned undefined`, {
                price: this.resolvePrice(order, "drawFilledMarker"),
                order,
            });
            return;
        }

        const radius = 5;
        const color = order.transactionType === "BUY" || order.transactionType === 1 ? 0x00ff00 : 0xff0000;

        // Draw start marker
        this.ordersGfx.lineStyle(2, color, 0.9);
        this.ordersGfx.beginFill(color, 0.1);
        this.ordersGfx.drawCircle(startX, y, radius);

        const endTime = this.getEndTime(order);
        if (endTime) {
            let endIndex = this.data.slicedData.findIndex((d) => (d.timestamp || d.datetime) >= endTime);
            if (endIndex < 0) {
                console.warn(`${this.debugPrefix} drawFilledMarker could not find endIndex`, {
                    endTime,
                });
                return;
            }

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
        if (!this.ordersGfx?._geometry || !this.data.slicedData.length) {
            console.warn(`${this.debugPrefix} drawCancelledMarker missing geometry or slicedData`);
            return;
        }

        const endTime = this.getEndTime(order);
        if (!endTime) {
            console.warn(`${this.debugPrefix} drawCancelledMarker missing end time`, { basketId: order?.basketId });
            return;
        }
        let endIndex = this.data.slicedData.findIndex((d) => (d.timestamp || d.datetime) >= endTime);
        if (endIndex < 0) {
            console.warn(`${this.debugPrefix} drawCancelledMarker could not find endIndex`, { endTime });
            return;
        }

        const endX = this.data.xScale(endIndex);
        const y = this.data.priceScale(this.resolvePrice(order, "drawCancelledMarker") ?? order.price);
        if (y === undefined) {
            console.warn(`${this.debugPrefix} drawCancelledMarker priceScale returned undefined`, {
                price: this.resolvePrice(order, "drawCancelledMarker"),
            });
            return;
        }

        const radius = 10;
        const color = order.transactionType === "BUY" || order.transactionType === 1 ? 0x00ff00 : 0xff0000;

        // Draw X
        const size = radius * 0.7;
        this.ordersGfx.lineStyle(2, color, 0.9);
        this.ordersGfx.moveTo(endX - size, y - size);
        this.ordersGfx.lineTo(endX + size, y + size);
        this.ordersGfx.moveTo(endX - size, y + size);
        this.ordersGfx.lineTo(endX + size, y - size);

        const openTime = this.getStartTime(order);
        if (openTime) {
            let openIndex = this.data.slicedData.findIndex((d) => (d.timestamp || d.datetime) >= openTime);
            if (openIndex >= 0) {
                const startX = this.data.xScale(openIndex);
                this.ordersGfx.lineStyle(3, color, 0.5);
                this.ordersGfx.moveTo(startX, y);
                this.ordersGfx.lineTo(endX, y);
            }
        }
    }

    drawOpenMarker(order) {
        if (!this.ordersGfx?._geometry || !this.data.slicedData.length) {
            console.warn(`${this.debugPrefix} drawOpenMarker missing geometry or slicedData`);
            return;
        }

        const startTime = this.getStartTime(order);
        if (!startTime) {
            console.warn(`${this.debugPrefix} drawOpenMarker missing start time`, { orderId: order?.basketId || order?.id });
            return;
        }

        let startIndex = this.data.slicedData.findIndex((d) => (d.timestamp || d.datetime) >= startTime);
        if (startIndex < 0) {
            console.warn(`${this.debugPrefix} drawOpenMarker could not find startIndex`, { startTime });
            return;
        }

        const startX = this.data.xScale(startIndex);
        const y = this.data.priceScale(this.resolvePrice(order, "drawOpenMarker"));
        if (y === undefined) {
            console.warn(`${this.debugPrefix} drawOpenMarker priceScale returned undefined`, {
                price: this.resolvePrice(order, "drawOpenMarker"),
                order,
            });
            return;
        }

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
