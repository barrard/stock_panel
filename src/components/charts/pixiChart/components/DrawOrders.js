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

import {
    eastCoastTime,
    isRTH,
} from "../../../../indicators/indicatorHelpers/IsMarketOpen";

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

        Object.keys(this.orders).forEach((basketId) => {
            const order = this.orders[basketId];
            if (order.status === "open") {
                this.drawOpenMarker(order);
            } else if (order.status === "complete") {
                this.drawMarker(order);
            } else if (order.status === "trigger pending") {
                this.drawStop(order);
            } else {
                console.log(order);
            }
        });
    }

    drawStop(order) {
        if (!this.ordersGfx?._geometry || !this.data.slicedData.length) return;

        const time = Math.floor(order.ssboe * 1000);
        let endIndex = this.data.slicedData.findIndex(
            (d) => d.timestamp > time
        );

        if (endIndex < 0) {
            return;
            endIndex = this.data.slicedData.length - 1;
        }

        const x = this.data.xScale(endIndex);

        const y = this.data.priceScale(order.triggerPrice);
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
        let endIndex = this.data.slicedData.findIndex(
            (d) => d.timestamp > time
        );

        if (endIndex < 0) {
            return;
            endIndex = this.data.slicedData.length - 1;
        }

        const x = this.data.xScale(endIndex);

        const price = order.price || order.avgFillPrice;
        const y = this.data.priceScale(price);
        const radius = 6; //this.data.priceScale(0) - this.data.priceScale(1);
        // console.log({ radius });
        const color =
            order.transactionType === "BUY" || order.transactionType === 1
                ? 0x00ff00
                : 0xff0000;
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

    drawOpenMarker(order) {
        if (!this.ordersGfx?._geometry || !this.data.slicedData.length) return;

        const time = Math.floor(order.ssboe * 1000);
        let endIndex = this.data.slicedData.findIndex(
            (d) => d.timestamp >= time
        );

        if (endIndex < 0) {
            return;
            endIndex = this.data.slicedData.length - 1;
        }

        const x = this.data.xScale(endIndex);

        const y = this.data.priceScale(order.price);
        const radius = 10; //this.data.priceScale(0) - this.data.priceScale(1);
        // console.log({ radius });
        const color = order.transactionType === "BUY" ? 0x00ff00 : 0xff0000;
        // this.ordersGfx.beginFill(color, 0.5);
        this.ordersGfx.lineStyle(2, color, 0.9);
        this.ordersGfx.beginFill(color, 0.1);

        this.ordersGfx.drawCircle(x, y, radius);
    }
}
