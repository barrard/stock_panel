# Order Ingestion Normalization Note

This note documents the two current order ingestion paths that feed `pixi-chart`, and where a shared normalizer should be introduced so DB-loaded orders and socket-delivered orders produce the same client shape.

## Current ingestion paths

### 1. Initial API load

Client entry point:
- [src/components/charts/pixiChart/PixiChart.js](/home/dave-big-desktop/code/stock_application/stock_panel/src/components/charts/pixiChart/PixiChart.js)
- `getOrders()` around lines 267-284

Client API wrapper:
- [src/components/API.js](/home/dave-big-desktop/code/stock_application/stock_panel/src/components/API.js)
- `getOrders()` around lines 165-177

Server route:
- [../TD_service_lite/server.js](/home/dave-big-desktop/code/stock_application/TD_service_lite/server.js)
- `POST /API/get-orders/` around lines 182-190

Server controller:
- [../TD_service_lite/controllers/RithmicOrdersController.js](/home/dave-big-desktop/code/stock_application/TD_service_lite/controllers/RithmicOrdersController.js)
- `getOrders()` around lines 5-38

What happens:
- the client calls `API.getOrders()`
- the server returns Mongo `RithmicOrderModel` rows for recent basket IDs
- the client groups that array by `basketId` in `PixiChart.js`
- downstream drawing code later relies on `compileOrders()` in [src/components/charts/pixiChart/components/utils.js](/home/dave-big-desktop/code/stock_application/stock_panel/src/components/charts/pixiChart/components/utils.js)

Important characteristic:
- this path returns persisted DB objects, typically `lean()` Mongo records

### 2. Socket update path

Client socket listener:
- [src/components/charts/pixiChart/PixiChart.js](/home/dave-big-desktop/code/stock_application/stock_panel/src/components/charts/pixiChart/PixiChart.js)
- `Socket.on("ordersShown", ...)` around lines 598-608

Server socket emitters:
- [../TD_service_lite/services/rapi/util/handleOrderPlant.js](/home/dave-big-desktop/code/stock_application/TD_service_lite/services/rapi/util/handleOrderPlant.js)
- `addOrderShown(order)` around lines 1571-1579
- `addBracketOrderShown(order)` around lines 1582-1590

What happens:
- server emits `ordersShown` with a payload shaped like `{ [basketId]: order }`
- client mutates the in-memory `orders` map and pushes the raw socket order into the existing basket array
- chart drawing then consumes a mix of DB-loaded event objects and live socket event objects

Important characteristic:
- this path emits live order plant objects directly
- it is likely not identical to the DB row shape returned from `/API/get-orders/`

## Why this is causing problems

The chart code currently mixes two related but not guaranteed identical event formats:

- DB history rows from `/API/get-orders/`
- live socket order objects from `ordersShown`

That affects:
- timestamp fields: `ssboe`, `datetime`, `statusTime`, `fillTime`, `openTime`
- linkage fields: `basketId`, `originalBasketId`, `linkedBasketIds`, `targetBasketId`, `stopBasketId`
- price fields: `price`, `fillPrice`, `avgFillPrice`, `triggerPrice`
- status fields: `status`, `reportType`, `completionReason`, `priceType`

This mismatch explains symptoms like:
- missing marker prices
- orders snapping oddly in time
- bracket linkage only partially resolving
- hover/grouping logic finding some but not all related orders

## Recommended normalization strategy

### Best long-term fix: normalize on the server

Add one shared order-event normalizer in the server project, then use it in both places:

- before returning data from `RithmicOrdersController.getOrders()`
- before emitting `ordersShown` in `handleOrderPlant.js`

Suggested server location:
- `../TD_service_lite/services/rapi/util/normalizeOrderEvent.js`

Suggested usage points:
- [../TD_service_lite/controllers/RithmicOrdersController.js](/home/dave-big-desktop/code/stock_application/TD_service_lite/controllers/RithmicOrdersController.js)
- [../TD_service_lite/services/rapi/util/handleOrderPlant.js](/home/dave-big-desktop/code/stock_application/TD_service_lite/services/rapi/util/handleOrderPlant.js)

That way the client receives one consistent event schema from both ingestion paths.

### Acceptable short-term fix: normalize on the client before state write

If server cleanup is delayed, add one client normalizer and run both paths through it before `setOrders(...)`.

Suggested client location:
- new file: [src/components/charts/pixiChart/components/normalizeOrderEvent.js](/home/dave-big-desktop/code/stock_application/stock_panel/src/components/charts/pixiChart/components/normalizeOrderEvent.js)

Suggested call sites:
- API load path in [src/components/charts/pixiChart/PixiChart.js](/home/dave-big-desktop/code/stock_application/stock_panel/src/components/charts/pixiChart/PixiChart.js)
- socket `ordersShown` listener in [src/components/charts/pixiChart/PixiChart.js](/home/dave-big-desktop/code/stock_application/stock_panel/src/components/charts/pixiChart/PixiChart.js)

## Minimum normalized fields to guarantee

Every order event sent to the chart should have a stable normalized shape for:

- `basketId`
- `originalBasketId`
- `linkedBasketIds`
- `targetBasketId`
- `stopBasketId`
- `status`
- `reportType`
- `completionReason`
- `priceType`
- `transactionType`
- `price`
- `triggerPrice`
- `fillPrice`
- `avgFillPrice`
- `quantity`
- `totalFillSize`
- `totalUnfilledSize`
- one canonical event timestamp in milliseconds

Suggested canonical timestamp:
- `eventTimestampMs`

Then the chart can derive other display/draw timestamps from one consistent source instead of trying to infer from mixed fields.

## Practical next step

Implement the shared normalizer first on the server, then simplify client drawing code to assume:

- all order timestamps are in ms
- all bracket linkage ids are strings
- all relevant prices are already promoted onto the normalized event

That should reduce a lot of the current `DrawOrdersV2` heuristics.
