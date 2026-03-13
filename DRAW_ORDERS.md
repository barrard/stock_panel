# DrawOrders Notes

This note documents the current state of order data as consumed by:

- [DrawOrdersV2.js](/home/dave-big-desktop/code/stock_application/stock_panel/src/components/charts/pixiChart/components/DrawOrdersV2.js)
- [utils.js](/home/dave-big-desktop/code/stock_application/stock_panel/src/components/charts/pixiChart/components/utils.js) via `compileOrders()`

The main issue today is that the chart behaves better with live socket order events than it does after a reload using DB-backed historical order events.

## Two data shapes

### 1. Live socket order shape

Client listener:
- [PixiChart.js](/home/dave-big-desktop/code/stock_application/stock_panel/src/components/charts/pixiChart/PixiChart.js)
- `Socket.on("ordersShown", ...)`

Server emitter:
- [handleOrderPlant.js](/home/dave-big-desktop/code/stock_application/TD_service_lite/services/rapi/util/handleOrderPlant.js)
- `addOrderShown(order)`
- `addBracketOrderShown(order)`

Observed behavior:
- bracket grouping usually works better here
- target / stop / entry relationships are more recoverable
- hover grouping can often find all related legs

Likely reasons:
- event flow arrives incrementally in order lifecycle sequence
- linkage fields are still present or easier to infer from nearby events
- timestamps and state transitions are closer to the original live order plant payload

Typical useful fields seen on live data:
- `basketId`
- `originalBasketId`
- `linkedBasketIds`
- `status`
- `reportType`
- `priceType`
- `triggerPrice`
- `price`
- `fillPrice`
- `avgFillPrice`
- `openTime`
- `fillTime`
- `endTime`
- `cancelTime`
- `ssboe`

### 2. DB / reload order shape

Client load path:
- [PixiChart.js](/home/dave-big-desktop/code/stock_application/stock_panel/src/components/charts/pixiChart/PixiChart.js)
- `getOrders()`

Client API wrapper:
- [API.js](/home/dave-big-desktop/code/stock_application/stock_panel/src/components/API.js)
- `getOrders()`

Server route/controller:
- [server.js](/home/dave-big-desktop/code/stock_application/TD_service_lite/server.js)
- [RithmicOrdersController.js](/home/dave-big-desktop/code/stock_application/TD_service_lite/controllers/RithmicOrdersController.js)

Observed behavior:
- bracket grouping becomes inconsistent after reload
- some child legs disappear from hover/highlight grouping
- some orders compile without enough data to draw price/time anchors
- some records fall into `order not handled` in `compileOrders()`

## Concrete example of problematic DB event

This example was observed during reload and logged as `order not handled`:

```js
{
  accountId: "7PV2310_SIM",
  basketId: "2478648124",
  exchange: "CME",
  fcmId: "PhillipUSA",
  ibId: "EdgeClear",
  manualOrAuto: "AUTO",
  notifyType: "CANCELLATION_FAILED",
  priceType: undefined,
  reportText: "The order management system rejected request",
  ssboe: 1773401810,
  status: "Cancellation Failed",
  symbol: "MESH6",
  templateId: 351,
  text: "The order management system rejected request",
  transactionType: "SELL",
  usecs: 107432,
  userId: "7PV2310_SIM"
}
```

Why this is problematic for draw-order logic:
- no price field
- no fill/open/cancel canonical timestamp field besides `ssboe`
- no explicit bracket linkage fields
- represents an administrative failure/status event, not a clean order lifecycle milestone

This kind of event should not become the primary compiled representation for the basket.

## Current symptoms traced to shape mismatch

When the chart is fed live socket data:
- bracket highlight usually works
- entry / target / stop can often be grouped correctly

After reload from DB:
- `compileOrders()` may hit `order not handled`
- administrative events can dominate the basket’s compiled state
- price and time anchors can be lost
- stop or target legs may not show up in grouping even though they existed live

## Current draw-order assumptions

`DrawOrdersV2` now assumes it can eventually recover:
- one entry anchor
- one target child anchor
- one stop child anchor

It also now distinguishes:
- structural relationship: `entry open -> child open`
- lifecycle relationship: `child open -> child fill/cancel`

That logic works only if the compiled basket still contains:
- usable linkage ids
- usable open/fill/cancel timestamps
- a drawable price

## Alignment goal

We need one normalized event shape that is identical whether orders arrive from:

- live socket `ordersShown`
- DB-backed `/API/get-orders/`

The chart should not have to care which path produced the event.

## Recommended canonical fields

Every normalized order event should provide:

- `basketId` as string
- `originalBasketId` as string or null
- `linkedBasketIds` as array of strings
- `targetBasketId` as string or null
- `stopBasketId` as string or null
- `status`
- `reportType`
- `completionReason`
- `priceType`
- `transactionType`
- `price`
- `triggerPrice`
- `fillPrice`
- `avgFillPrice`
- `eventTimestampMs`
- `openTimestampMs`
- `fillTimestampMs`
- `cancelTimestampMs`
- `closeTimestampMs`

## Important rule for compiler behavior

Administrative or informational events such as:
- `Cancellation Failed`
- rejected / failed cancellation attempts
- status-only records with no linkage and no drawable price

should be merged into basket history but should not overwrite richer prior order state if that richer state already exists in the same basket.

## Next review step

When revisiting this system, start with:

1. [ORDER_INGESTION_NORMALIZATION_NOTE.md](/home/dave-big-desktop/code/stock_application/stock_panel/ORDER_INGESTION_NORMALIZATION_NOTE.md)
2. [DRAW_ORDERS.md](/home/dave-big-desktop/code/stock_application/stock_panel/DRAW_ORDERS.md)
3. [utils.js](/home/dave-big-desktop/code/stock_application/stock_panel/src/components/charts/pixiChart/components/utils.js)
4. [DrawOrdersV2.js](/home/dave-big-desktop/code/stock_application/stock_panel/src/components/charts/pixiChart/components/DrawOrdersV2.js)

The right long-term fix is to normalize order events once, upstream, and let the chart draw from one stable schema.
