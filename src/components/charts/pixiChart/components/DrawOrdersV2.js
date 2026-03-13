import { Graphics, Container, Text, TextStyle } from "pixi.js";
import { compileOrders, priceType } from "./utils";

const ORDER_TOOLTIP_STYLE = new TextStyle({
    fontFamily: "Arial",
    fontSize: 11,
    fill: 0xffffff,
    wordWrap: true,
    wordWrapWidth: 280,
    lineHeight: 16,
});

export default class DrawOrdersV2 {
    constructor(dataHandler) {
        this.data = dataHandler;
        this.orders = [];
        this.initialized = false;
        this.missingPriceLogged = new Set();
        this.debugPrefix = "[DrawOrdersV2]";

        this.container = new Container();
        this.ordersGfx = new Graphics();
        this.tooltipContainer = new Container();
        this.container.addChild(this.ordersGfx);
        this.container.addChild(this.tooltipContainer);

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
        this.clearTooltip();

        // Reset initialization flag so it can be re-initialized
        this.initialized = false;
    }

    clearTooltip() {
        if (!this.tooltipContainer) return;
        this.tooltipContainer.removeChildren().forEach((child) => {
            child.destroy?.();
        });
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
            if (order?.completionReason == "FA" || (order?.status == "open" && order?.priceType == "MARKET")) {
                return;
            }
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
        return (
            this.getTimestamp(order, ["cancelTime", "endTime", "fillTime", "completeTime", "orderActiveTime", "statusTime", "triggerTime", "openTime"]) ??
            null
        );
    }

    normalizeBasketId(value) {
        if (value === undefined || value === null || value === "") return null;
        return String(value);
    }

    parseLinkedBasketIds(value) {
        if (!value) return [];
        if (Array.isArray(value)) {
            return value.map((item) => this.normalizeBasketId(item)).filter(Boolean);
        }
        if (typeof value === "string") {
            return value
                .split(",")
                .map((item) => this.normalizeBasketId(item.trim()))
                .filter(Boolean);
        }
        return [];
    }

    formatTooltipTime(value) {
        if (value === undefined || value === null || value === "") return null;
        const numericValue = Number(value);
        const timestamp = Number.isFinite(numericValue) ? (numericValue < 1e12 ? numericValue * 1000 : numericValue) : new Date(value).getTime();
        if (!Number.isFinite(timestamp)) return String(value);
        return new Date(timestamp).toLocaleString();
    }

    resolveDisplayPrice(order) {
        const price = this.resolvePrice(order, "tooltip");
        if (price === undefined || price === null || Number.isNaN(Number(price))) return null;
        return Number(price).toFixed(2);
    }

    getBracketRole(order, basketId, parentOrder) {
        if (!order) return "unknown";

        const normalizedBasketId = this.normalizeBasketId(order?.basketId ?? basketId);
        const normalizedOriginalId = this.normalizeBasketId(order?.originalBasketId);
        const normalizedPriceType = priceType(order?.priceType) || order?.priceType;

        if (!normalizedOriginalId || normalizedOriginalId === normalizedBasketId) {
            return "entry";
        }

        if (
            normalizedBasketId === this.normalizeBasketId(parentOrder?.stopBasketId) ||
            normalizedPriceType === "STOP_MARKET" ||
            normalizedPriceType === "STOP_LIMIT" ||
            (order?.triggerPrice !== undefined && order?.triggerPrice !== null && normalizedPriceType !== "LIMIT")
        ) {
            return "stop";
        }

        if (
            normalizedBasketId === this.normalizeBasketId(parentOrder?.targetBasketId) ||
            normalizedPriceType === "LIMIT"
        ) {
            return "target";
        }

        return "unknown";
    }

    getBracketRoleColor(role) {
        switch (role) {
            case "entry":
                return 0xffffff;
            case "target":
                return 0x22c55e;
            case "stop":
                return 0xef4444;
            default:
                return 0xffd166;
        }
    }

    buildOrderTooltipLines(order) {
        if (!order) return ["No order data"];

        const lines = [];
        const basketId = this.normalizeBasketId(order.basketId);
        if (basketId) lines.push(`basketId: ${basketId}`);

        const statusFields = [
            ["status", order.status],
            ["reportType", order.reportType],
            ["completionReason", order.completionReason],
            ["priceType", priceType(order.priceType) || order.priceType],
            ["originalBasketId", this.normalizeBasketId(order.originalBasketId)],
            ["targetBasketId", this.normalizeBasketId(order.targetBasketId)],
            ["stopBasketId", this.normalizeBasketId(order.stopBasketId)],
            ["linkedBasketIds", order.linkedBasketIds],
        ];

        statusFields.forEach(([label, value]) => {
            if (value !== undefined && value !== null && value !== "") {
                lines.push(`${label}: ${value}`);
            }
        });

        const timeFields = [
            ["open", order.openTime ?? order.orderActiveTime ?? order.statusTime ?? order.orderReceivedFromClientTime],
            ["filled", order.fillTime],
            ["closed", order.endTime ?? order.completeTime],
            ["cancelled", order.cancelTime ?? order.cancelPendingTime ?? order.cancelReceivedFromClientTime],
            ["rejected", order.rejected ? "true" : null],
        ];

        timeFields.forEach(([label, value]) => {
            if (value !== undefined && value !== null && value !== "") {
                lines.push(`${label}: ${label === "rejected" ? value : this.formatTooltipTime(value)}`);
            }
        });

        const displayPrice = this.resolveDisplayPrice(order);
        if (displayPrice) {
            lines.push(`price: ${displayPrice}`);
        }

        const priorityKeys = new Set([
            "basketId",
            "status",
            "reportType",
            "completionReason",
            "priceType",
            "originalBasketId",
            "targetBasketId",
            "stopBasketId",
            "linkedBasketIds",
            "openTime",
            "orderActiveTime",
            "statusTime",
            "orderReceivedFromClientTime",
            "fillTime",
            "endTime",
            "completeTime",
            "cancelTime",
            "cancelPendingTime",
            "cancelReceivedFromClientTime",
            "rejected",
            "price",
            "fillPrice",
            "avgFillPrice",
            "triggerPrice",
        ]);

        Object.keys(order)
            .filter((key) => !priorityKeys.has(key))
            .slice(0, 8)
            .forEach((key) => {
                const value = order[key];
                if (value === undefined || value === null || value === "") return;
                if (typeof value === "object") return;
                lines.push(`${key}: ${value}`);
            });

        return lines;
    }

    drawOrderTooltip(marker) {
        if (!marker?.anchor || !marker?.order) return;

        const tooltipText = new Text(this.buildOrderTooltipLines(marker.order).join("\n"), ORDER_TOOLTIP_STYLE);
        const padding = 8;
        const tooltipWidth = tooltipText.width + padding * 2;
        const tooltipHeight = tooltipText.height + padding * 2;
        const tooltipX = 8;
        const tooltipY = 8;

        this.ordersGfx.beginFill(0x0b1020, 0.94);
        this.ordersGfx.lineStyle(1, 0xffffff, 0.85);
        this.ordersGfx.drawRoundedRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 6);
        this.ordersGfx.endFill();

        tooltipText.x = tooltipX + padding;
        tooltipText.y = tooltipY + padding;
        this.tooltipContainer.addChild(tooltipText);
    }

    findBarIndexForTimestamp(timestamp, options = {}) {
        const { clampBeforeStart = false, clampAfterEnd = true } = options;
        const bars = this.data?.slicedData;
        if (!Array.isArray(bars) || !bars.length || !Number.isFinite(timestamp)) return -1;

        const firstTimestamp = bars[0]?.timestamp ?? bars[0]?.datetime;
        const lastTimestamp = bars[bars.length - 1]?.timestamp ?? bars[bars.length - 1]?.datetime;

        if (clampAfterEnd && Number.isFinite(lastTimestamp) && timestamp >= lastTimestamp) {
            return bars.length - 1;
        }

        if (Number.isFinite(firstTimestamp) && timestamp < firstTimestamp) {
            return clampBeforeStart ? 0 : -1;
        }

        let matchingIndex = -1;
        for (let index = 0; index < bars.length; index += 1) {
            const barTimestamp = bars[index]?.timestamp ?? bars[index]?.datetime;
            if (!Number.isFinite(barTimestamp)) continue;

            if (barTimestamp <= timestamp) {
                matchingIndex = index;
                continue;
            }

            break;
        }

        return matchingIndex;
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
        this.clearTooltip();
        const compiledOrders = new Map();
        const markerAnchors = new Map();

        Object.keys(ordersToDraw).forEach((basketId) => {
            let order = ordersToDraw[basketId];
            const originalOrder = [...order];

            if (Array.isArray(order)) {
                const compiled = compileOrders(order, {});
                order = compiled[basketId];
                if (!order) {
                    console.warn(`${this.debugPrefix} No compiled order for basket`, { basketId });
                    return;
                }
            }

            const normalizedBasketId = this.normalizeBasketId(order?.basketId ?? basketId);
            if (normalizedBasketId) {
                compiledOrders.set(normalizedBasketId, order);
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
                const anchor = this.drawCancelledMarker(order);
                if (anchor && normalizedBasketId) markerAnchors.set(normalizedBasketId, anchor);
            } else if (hasFill) {
                if (shouldDrawInstantFill) {
                    const anchor = this.drawInstantFillMarker(order);
                    if (anchor && normalizedBasketId) markerAnchors.set(normalizedBasketId, anchor);
                } else {
                    const anchor = this.drawFilledMarker(order);
                    if (anchor && normalizedBasketId) markerAnchors.set(normalizedBasketId, anchor);
                }
            } else if (IS_LIMIT_ORDER || IS_STOP_MARKET_ORDER || IS_STOP_LIMIT_ORDER || IS_MARKET_ORDER) {
                const anchor = this.drawOpenMarker(order);
                if (anchor && normalizedBasketId) markerAnchors.set(normalizedBasketId, anchor);
            } else {
                console.warn(`${this.debugPrefix} Unhandled order type, defaulting to open marker`, {
                    basketId: order?.basketId,
                    priceType: order?.priceType,
                    status: order?.status,
                    completionReason: order?.completionReason,
                    originalOrder,
                });
                const anchor = this.drawOpenMarker(order);
                if (anchor && normalizedBasketId) markerAnchors.set(normalizedBasketId, anchor);
            }
        });

        this.drawBracketConnectors(compiledOrders, markerAnchors);
        this.drawHoveredBracketGroup(compiledOrders, markerAnchors);
        this.drawHoveredOrderTooltip(compiledOrders, markerAnchors);
    }

    drawBracketConnectors(compiledOrders, markerAnchors) {
        if (!compiledOrders?.size || !markerAnchors?.size) return;

        compiledOrders.forEach((entryOrder, basketId) => {
            const entryAnchor = this.getPreferredAnchorPoint(markerAnchors.get(basketId), ["open", "fill", "cancel"]);
            if (!entryAnchor) return;

            const targetBasketId = this.normalizeBasketId(entryOrder?.targetBasketId);
            const stopBasketId = this.normalizeBasketId(entryOrder?.stopBasketId);
            const childIds = [targetBasketId, stopBasketId].filter(Boolean);

            childIds.forEach((childId, index) => {
                let childAnchor = this.getPreferredAnchorPoint(markerAnchors.get(childId), ["open", "fill", "cancel"]);
                let childOrder = compiledOrders.get(childId);

                if (!childAnchor) {
                    const fallbackChildId = [...compiledOrders.entries()].find(([, candidate]) => {
                        return this.normalizeBasketId(candidate?.originalBasketId) === basketId && this.normalizeBasketId(candidate?.basketId) !== basketId;
                    })?.[0];
                    if (fallbackChildId) {
                        childAnchor = this.getPreferredAnchorPoint(markerAnchors.get(fallbackChildId), ["open", "fill", "cancel"]);
                        childOrder = compiledOrders.get(fallbackChildId);
                    }
                }

                if (!childAnchor) return;

                const childRole = this.getBracketRole(childOrder, childId, entryOrder);
                const connectorColor = this.getBracketRoleColor(childRole);
                const connectorX = childAnchor.x;
                const connectorStartY = Math.min(entryAnchor.y, childAnchor.y);
                const connectorEndY = Math.max(entryAnchor.y, childAnchor.y);

                this.ordersGfx.lineStyle(1.5, connectorColor, 0.7);
                this.ordersGfx.moveTo(connectorX, connectorStartY);
                this.ordersGfx.lineTo(connectorX, connectorEndY);

                this.ordersGfx.lineStyle(1, connectorColor, 0.35);
                this.ordersGfx.moveTo(entryAnchor.x, entryAnchor.y);
                this.ordersGfx.lineTo(connectorX, entryAnchor.y);
            });
        });
    }

    resolveBracketGroupIds(basketId, compiledOrders) {
        const normalizedBasketId = this.normalizeBasketId(basketId);
        if (!normalizedBasketId || !compiledOrders?.size) return [];

        const order = compiledOrders.get(normalizedBasketId);
        const parentId = this.normalizeBasketId(order?.originalBasketId) ?? normalizedBasketId;
        const parentOrder = compiledOrders.get(parentId) ?? order;
        const parentLinkedIds = this.parseLinkedBasketIds(parentOrder?.linkedBasketIds);
        const hoveredLinkedIds = this.parseLinkedBasketIds(order?.linkedBasketIds);

        const explicitIds = [
            parentId,
            this.normalizeBasketId(parentOrder?.targetBasketId),
            this.normalizeBasketId(parentOrder?.stopBasketId),
            ...parentLinkedIds,
            ...hoveredLinkedIds,
        ].filter(Boolean);

        const fallbackChildIds = [...compiledOrders.entries()]
            .filter(([, candidate]) => {
                const candidateId = this.normalizeBasketId(candidate?.basketId);
                const candidateOriginalId = this.normalizeBasketId(candidate?.originalBasketId);
                const candidateLinkedIds = this.parseLinkedBasketIds(candidate?.linkedBasketIds);

                return (
                    candidateOriginalId === parentId ||
                    candidateLinkedIds.includes(parentId) ||
                    parentLinkedIds.includes(candidateId) ||
                    hoveredLinkedIds.includes(candidateId)
                );
            })
            .map(([candidateId]) => this.normalizeBasketId(candidateId))
            .filter(Boolean);

        return [...new Set([...explicitIds, ...fallbackChildIds])];
    }

    getPreferredAnchorPoint(anchor, preferredRoles = []) {
        if (!anchor) return null;

        const hoverPoints = Array.isArray(anchor.hoverPoints) && anchor.hoverPoints.length ? anchor.hoverPoints : [{ x: anchor.x, y: anchor.y, role: "default" }];
        for (const role of preferredRoles) {
            const match = hoverPoints.find((point) => point.role === role && Number.isFinite(point.x) && Number.isFinite(point.y));
            if (match) return match;
        }

        return hoverPoints.find((point) => Number.isFinite(point.x) && Number.isFinite(point.y)) ?? null;
    }

    drawHoveredBracketGroup(compiledOrders, markerAnchors) {
        if (!this.data?.crosshair || !Number.isFinite(this.data?.mouseX) || !Number.isFinite(this.data?.mouseY)) return;

        const visibleMarkers = [...markerAnchors.entries()]
            .flatMap(([basketId, anchor]) => {
                const hoverPoints = Array.isArray(anchor?.hoverPoints) && anchor.hoverPoints.length ? anchor.hoverPoints : [{ x: anchor?.x, y: anchor?.y }];
                return hoverPoints.map((point) => ({
                    basketId,
                    x: point.x,
                    y: point.y,
                    role: point.role,
                    anchor,
                }));
            })
            .filter((marker) => Number.isFinite(marker.x) && Number.isFinite(marker.y));

        if (!visibleMarkers.length) return;

        const hoverMarker = visibleMarkers.find((marker) => {
            const hitbox = 10;
            return Math.abs(marker.x - this.data.mouseX) <= hitbox && Math.abs(marker.y - this.data.mouseY) <= hitbox;
        });

        if (!hoverMarker) return;

        const groupIds = this.resolveBracketGroupIds(hoverMarker.basketId, compiledOrders);
        if (groupIds.length <= 1) return;

        const debugGroupState = groupIds.map((groupId) => ({
            basketId: groupId,
            hasOrder: compiledOrders.has(groupId),
            hasAnchor: markerAnchors.has(groupId),
            order: compiledOrders.get(groupId),
        }));

        const debugSignature = JSON.stringify(
            debugGroupState.map(({ basketId, hasOrder, hasAnchor, order }) => ({
                basketId,
                hasOrder,
                hasAnchor,
                originalBasketId: this.normalizeBasketId(order?.originalBasketId),
                targetBasketId: this.normalizeBasketId(order?.targetBasketId),
                stopBasketId: this.normalizeBasketId(order?.stopBasketId),
                price: order?.price,
                triggerPrice: order?.triggerPrice,
                fillPrice: order?.fillPrice,
                avgFillPrice: order?.avgFillPrice,
                status: order?.status,
                reportType: order?.reportType,
            }))
        );

        if (this.lastHoveredGroupDebug !== debugSignature) {
            this.lastHoveredGroupDebug = debugSignature;
            console.log(`${this.debugPrefix} hovered bracket group`, debugGroupState);
        }

        const hoveredGroupMarkers = groupIds
            .map((groupId) => ({
                basketId: groupId,
                order: compiledOrders.get(groupId),
                anchor: markerAnchors.get(groupId),
            }))
            .filter((item) => item.anchor);

        const hoveredOrder = compiledOrders.get(hoverMarker.basketId);
        const parentId = this.normalizeBasketId(hoveredOrder?.originalBasketId) ?? this.normalizeBasketId(hoverMarker.basketId);
        const entryItem =
            hoveredGroupMarkers.find(({ basketId }) => this.normalizeBasketId(basketId) === parentId) ??
            hoveredGroupMarkers.find(({ basketId, order }) => this.getBracketRole(order, basketId, compiledOrders.get(parentId)) === "entry");

        if (!entryItem) return;

        hoveredGroupMarkers.forEach(({ basketId, order, anchor }) => {
            const role = this.getBracketRole(order, basketId, entryItem.order);
            const color = this.getBracketRoleColor(role);
            const radius = role === "entry" ? 18 : 12;
            this.ordersGfx.lineStyle(2.5, color, 0.95);
            this.ordersGfx.beginFill(color, 0.12);
            const highlightPoint = role === "entry" ? this.getPreferredAnchorPoint(anchor, ["open", "fill", "cancel"]) : this.getPreferredAnchorPoint(anchor, ["open", "fill", "cancel"]);
            if (!highlightPoint) return;
            this.ordersGfx.drawCircle(highlightPoint.x, highlightPoint.y, radius);
        });

        const entryPoint = this.getPreferredAnchorPoint(entryItem.anchor, ["open", "fill", "cancel"]);
        if (!entryPoint) return;

        hoveredGroupMarkers.forEach(({ basketId, order, anchor }) => {
            if (basketId === entryItem.basketId) return;
            const childOpenPoint = this.getPreferredAnchorPoint(anchor, ["open", "fill", "cancel"]);
            if (!childOpenPoint) return;
            const role = this.getBracketRole(order, basketId, entryItem.order);
            const color = this.getBracketRoleColor(role);
            this.ordersGfx.lineStyle(2.25, color, 0.95);
            this.ordersGfx.moveTo(childOpenPoint.x, childOpenPoint.y);
            this.ordersGfx.lineTo(childOpenPoint.x, entryPoint.y);
            this.ordersGfx.moveTo(entryPoint.x, entryPoint.y);
            this.ordersGfx.lineTo(childOpenPoint.x, entryPoint.y);
        });
    }

    drawHoveredOrderTooltip(compiledOrders, markerAnchors) {
        if (!this.data?.crosshair || !Number.isFinite(this.data?.mouseX) || !Number.isFinite(this.data?.mouseY)) return;

        const visibleMarkers = [...markerAnchors.entries()]
            .flatMap(([basketId, anchor]) => {
                const hoverPoints = Array.isArray(anchor?.hoverPoints) && anchor.hoverPoints.length ? anchor.hoverPoints : [{ x: anchor?.x, y: anchor?.y }];
                return hoverPoints.map((point) => ({
                    basketId,
                    anchor: {
                        x: point.x,
                        y: point.y,
                    },
                    order: compiledOrders.get(basketId),
                    role: point.role,
                }));
            })
            .filter((marker) => marker.order && Number.isFinite(marker.anchor?.x) && Number.isFinite(marker.anchor?.y));

        if (!visibleMarkers.length) return;

        const hoverMarker = visibleMarkers.find((marker) => {
            const hitbox = 10;
            return Math.abs(marker.anchor.x - this.data.mouseX) <= hitbox && Math.abs(marker.anchor.y - this.data.mouseY) <= hitbox;
        });

        if (!hoverMarker) return;
        this.drawOrderTooltip(hoverMarker);
    }

    drawInstantFillMarker(order) {
        if (!this.ordersGfx?._geometry || !this.data.slicedData.length) return;

        const fillTime = this.getEndTime(order) || this.getStartTime(order);
        if (!fillTime) return;
        let index = this.findBarIndexForTimestamp(fillTime, { clampBeforeStart: true });
        if (index < 0) return;

        const x = this.data.xScale(index);
        const y = this.data.priceScale(this.resolvePrice(order, "drawInstantFillMarker"));
        if (y === undefined) return;

        const radius = 6;
        const color = order.transactionType === "BUY" || order.transactionType === 1 ? 0x00ff00 : 0xff0000;
        this.ordersGfx.lineStyle(2, color, 0.9);
        this.ordersGfx.beginFill(color, 0.5);
        this.ordersGfx.drawCircle(x, y, radius);
        return {
            x,
            y,
            hoverPoints: [{ x, y, role: "fill" }],
        };
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

        let startIndex = this.findBarIndexForTimestamp(startTime, { clampBeforeStart: true });
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
        const hoverPoints = [{ x: startX, y, role: "open" }];

        if (endTime) {
            let endIndex = this.findBarIndexForTimestamp(endTime, { clampBeforeStart: true });
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
            hoverPoints.push({ x: endX, y, role: "fill" });
        }

        return { x: startX, y, hoverPoints };
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
        let endIndex = this.findBarIndexForTimestamp(endTime, { clampBeforeStart: true });
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
        const openTime = this.getStartTime(order);
        let startX = null;

        // Draw X
        const size = radius * 0.7;
        this.ordersGfx.lineStyle(2, color, 0.9);
        this.ordersGfx.moveTo(endX - size, y - size);
        this.ordersGfx.lineTo(endX + size, y + size);
        this.ordersGfx.moveTo(endX - size, y + size);
        this.ordersGfx.lineTo(endX + size, y - size);

        if (openTime) {
            let openIndex = this.findBarIndexForTimestamp(openTime, { clampBeforeStart: true });
            if (openIndex >= 0) {
                startX = this.data.xScale(openIndex);

                // Draw smaller "order opened" marker at the original placement time.
                this.ordersGfx.lineStyle(2, color, 0.9);
                this.ordersGfx.beginFill(color, 0.1);
                this.ordersGfx.drawCircle(startX, y, 5);

                this.ordersGfx.lineStyle(3, color, 0.5);
                this.ordersGfx.moveTo(startX, y);
                this.ordersGfx.lineTo(endX, y);
            }
        }

        return {
            x: Number.isFinite(startX) ? startX : endX,
            y,
            hoverPoints: [
                ...(Number.isFinite(startX) ? [{ x: startX, y, role: "open" }] : []),
                { x: endX, y, role: "cancel" },
            ],
        };
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

        let startIndex = this.findBarIndexForTimestamp(startTime, { clampBeforeStart: true });
        if (startIndex < 0) {
            console.warn(`${this.debugPrefix} drawOpenMarker could not find startIndex`, { startTime });
            return;
        }

        const startX = this.data.xScale(startIndex);
        const y = this.data.priceScale(this.resolvePrice(order, "drawOpenMarker"));
        if (y === undefined) {
            if (order.priceType == "MARKET") {
                return; // we dont know the fill price yet
            }
            console.warn(`${this.debugPrefix} drawOpenMarker priceScale returned undefined`, {
                price: this.resolvePrice(order, "drawOpenMarker"),
                order,
            });
            return;
        }

        const isBracketEntry = order?.isBracketOrder && !this.normalizeBasketId(order?.originalBasketId);
        const radius = isBracketEntry ? 14 : 10;
        const color = order.transactionType === "BUY" || order.transactionType === 1 ? 0x00ff00 : 0xff0000;

        // Draw start marker
        this.ordersGfx.lineStyle(isBracketEntry ? 3 : 2, color, 0.95);
        this.ordersGfx.beginFill(color, isBracketEntry ? 0.18 : 0.1);
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

        return {
            x: startX,
            y,
            hoverPoints: [{ x: startX, y, role: "open" }],
        };
    }
}
