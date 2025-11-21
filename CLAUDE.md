# Gemini - Notes and Patterns

This document contains notes and established patterns for developing and maintaining this project with Gemini.

## Using the GenericPixiChart Component

`GenericPixiChart` is a reusable component designed to render high-performance financial charts using PIXI.js. It's built to be flexible, handling both historical data and real-time updates for various chart types like candlesticks and lines. It is used in components like `OptionContractChart.jsx`, `SpyChart.js`, and `PixiChartV2.js`.

### Core Usage Pattern

To use the chart, you need to provide it with data and, most importantly, a `ref` to interact with its underlying data handler.

**1. Essential Props:**

*   `ohlcDatas` (Array): The array of OHLC data points to be rendered.
*   `symbol` (String): The ticker symbol for the chart (e.g., "SPY").
*   `pixiDataRef` (React.RefObject): A ref created in the parent component. `GenericPixiChart` populates this ref with its `GenericDataHandler` instance, which is the primary API for interacting with the chart.

**2. Creating the Chart:**

In your parent component, create a ref and pass it to the chart.

```jsx
import React, { useRef, useState, useEffect } from "react";
import GenericPixiChart from "./GenericPixiChart";

const MyChartComponent = () => {
    const pixiDataRef = useRef();
    const [ohlcData, setOhlcData] = useState([]);
    const symbol = "SPY";

    useEffect(() => {
        // Fetch initial data and set it to ohlcData state
    }, []);

    // Example of a real-time update
    useEffect(() => {
        // When a new bar arrives...
        if (pixiDataRef.current) {
            pixiDataRef.current.setNewBar(newBar);
        }
    }, [newBar]);


    return (
        <GenericPixiChart
            key={symbol} // Important! See note below.
            ohlcDatas={ohlcData}
            symbol={symbol}
            pixiDataRef={pixiDataRef}
            height={500}
        />
    );
}
```

### Interacting with the Chart via `pixiDataRef`

The `pixiDataRef` is your gateway to controlling the chart after it has been rendered.

*   **Adding a new bar/data point:** `pixiDataRef.current.setNewBar(barObject)`
    This adds a complete new data point to the chart and redraws. This is the standard method for adding a new candlestick or a new point to a line chart.

*   **Updating the current bar with a tick:** `pixiDataRef.current.newTick(tickObject)`
    This is used for real-time candlestick charts where you want to update the `high`, `low`, and `close` of the last bar as new trades (ticks) come in, without creating a new bar each time.

*   **Updating the Price Label:** `pixiDataRef.current.updateCurrentPriceLabel(price)`
    This method explicitly updates the current price label shown on the Y-axis. This is useful in cases where the data update mechanism doesn't trigger it automatically (e.g., for line charts based on snapshots).

### Configuration and Customization

*   **Chart Type (`options` prop):** By default, the chart is a candlestick chart. You can change this via the `options` prop.
    ```jsx
    // Renders a line chart using the 'last' property of the data objects
    <GenericPixiChart
        options={{ chartType: "line", lineKey: "last" }}
        ...
    />
    ```

*   **Lower Indicators (`lowerIndicators` prop):** You can add standard indicators below the main chart (like Volume, RSI) by passing an array of configuration objects.

*   **Custom Overlays (`registerDrawFn`):** For complex graphical overlays (e.g., drawing strike prices or a Monte Carlo cone), you can use the `registerDrawFn('unique_name', drawingFunction)` method on the `pixiDataRef.current` instance. This allows you to inject custom PIXI.js drawing logic that will be executed on every chart render. See `SpyChart.js` for an example implementation.

### Important: Forcing Re-mounts with `key`

When the fundamental context of the chart changes (like the `symbol` or a major `timeframe` change), you **must** change the `key` prop on the `<GenericPixiChart>` component.

This forces React to unmount the old chart instance and mount a completely new one. It is a simple and effective way to ensure a clean state and prevent data from a previous chart from leaking into the new one.

```jsx
// The key ensures the chart is completely replaced when the symbol changes.
<GenericPixiChart key={symbol} symbol={symbol} ... />
```

**Important:** When the context changes (symbol, timeframe, etc.), you should also clear any local state in the parent component to ensure a clean data state:

```jsx
useEffect(() => {
    console.log("Symbol changed, clearing data");

    // Clear all local state/refs
    rawDataRef.current = [];
    setCandleData([]);
    tempBarRef.current = null;
    loadingRef.current = false;

    // Fetch new data for the new symbol
    fetchData({ symbol: symbol, limit: 2000 });
}, [symbol]);
```

The combination of `key` prop (forcing remount) and clearing local state ensures no stale data persists across context changes.

### Custom Timeframe Aggregation Pattern

When your chart needs to aggregate data in the parent component (e.g., combining tick bars into larger timeframes), follow this pattern:

**Use Case:** `BetterTickChart` receives 100-tick bars from the server but allows users to view combined bars (e.g., 5×100 = 500-tick bars).

**Pattern:**
1. **Raw Data Ref**: Maintain a ref with the "atomic" data as received from the server
2. **Derived State**: Compute aggregated/combined data from the raw ref and pass it to `GenericPixiChart`
3. **Reversible Transform**: Keep raw data so you can regenerate different aggregations without re-fetching

```jsx
const rawDataRef = useRef([]); // Source of truth: 100-tick bars from server
const [candleData, setCandleData] = useState([]); // Derived: combined bars
const [join, setJoin] = useState(1); // Aggregation factor

// Combine bars based on join value
const combineBars = (bars, joinValue) => {
    if (joinValue <= 1) return bars;
    // ... aggregation logic
};

// When new data arrives from socket
const handleNewBar = (data) => {
    rawDataRef.current.push(data); // Always update raw data
    const combined = combineBars(rawDataRef.current, join);
    setCandleData(combined);

    if (pixiDataRef.current) {
        pixiDataRef.current.setNewBar(lastCombinedBar);
    }
};

// When join factor changes, recombine from raw data
useEffect(() => {
    if (rawDataRef.current.length > 0) {
        const combined = combineBars(rawDataRef.current, join);
        setCandleData(combined);
    }
}, [join]);
```

**Why this pattern works:**
- GenericPixiChart remains agnostic to aggregation logic
- Raw data is preserved for reversible transformations
- No need to re-fetch from API when changing aggregation
- Clear separation between data source (raw) and view (combined)

## Chart Indicators with GenericPixiChart

When adding new indicators or graphical overlays to any chart that utilizes the `GenericPixiChart` component, a specific pattern must be followed to ensure they behave correctly with panning and zooming. This applies to components like `BackTestChartGeneric.jsx` and any other that uses `GenericPixiChart`.

**Problem:** Indicators drawn using the full dataset (`ohlcData`) may not pan and zoom correctly with the chart. The lines might appear static or move incorrectly when the chart's viewport changes. This is because their positions are calculated based on indices from the entire dataset, while the chart's scales (`xScale`) are dynamically updated by `GenericPixiChart` to reflect only the visible (sliced) data.

**Solution:** Indicator drawing logic must use `slicedData`, which represents the visible portion of the chart data managed by `GenericPixiChart`. This ensures that the indicator is drawn relative to the currently displayed data and scales, and therefore pans and zooms correctly with the main chart.

**Implementation Pattern:**

1.  **Data Source:** The drawing logic for an indicator (e.g., in a class like `DrawPivots`) should not rely on the full `ohlcData` for positioning calculations that involve the `xScale`. Instead, it should use the `slicedData`.

2.  **Accessing `slicedData`:** The `GenericPixiChart` component makes the `slicedData` available via the `pixiDataRef.current` object that is passed to it. The drawing methods within the indicator class should access it via `this.pixiDataRef.current.slicedData`. This `slicedData` might be an object containing the visible bars and a `startIndex` pointing to where the slice begins in the original `ohlcData`.

3.  **Coordinate Calculation:**
    *   Find the absolute index of a data point (e.g., where a pivot line should start) in the full `ohlcData`.
    *   Translate this absolute index to a relative index within the `slicedData`. This can be done by subtracting the `startIndex` of the slice.
    *   Use this relative index with the `xScale` to get the correct position on the chart.

This ensures that as the user pans and zooms (which changes `slicedData` and the `xScale` domain within `GenericPixiChart`), the indicator's position is recalculated correctly relative to the visible data.

### Creating Overlay Indicator Classes

When creating indicator overlay classes (like `DrawSuperTrend`, `DrawMovingAverages`), follow these patterns:

**1. Graphics Object Reuse (IMPORTANT):**

Do NOT create new `Graphics` objects on every draw. This causes GC pressure and performance issues.

```javascript
// ❌ BAD - creates/destroys Graphics every draw
drawAll() {
    this.container.removeChildren().forEach(child => child.destroy());
    const gfx = new Graphics();
    // ... draw
    this.container.addChild(gfx);
}

// ✅ GOOD - create once, clear and reuse
initContainer() {
    this.container = new Container();
    this.gfx = new Graphics(); // Create ONCE
    this.container.addChild(this.gfx);
    this.pixiDataRef.current.addToLayer(this.layer, this.container);
}

drawAll() {
    this.gfx.clear(); // Just clear, don't destroy
    // ... draw using this.gfx
}
```

**2. Self-Managing Data Updates:**

Indicators should track data length and recalculate when it changes (handles both new bars and historical data loading):

```javascript
constructor(ohlcData, pixiDataRef, layer = 0) {
    this.ohlcData = ohlcData;
    this.lastDataLength = 0;
    // ...
}

recalculateIndicators() {
    // Calculate indicator values for all bars
    // ...
    this.lastDataLength = this.ohlcData.length;
}

drawAll() {
    // Check if data length changed
    if (this.ohlcData && this.ohlcData.length !== this.lastDataLength) {
        this.recalculateIndicators();
    }

    this.gfx.clear();
    // ... draw
}
```

**3. Standard Class Structure:**

```javascript
import { Graphics, Container } from "pixi.js";

export default class DrawMyIndicator {
    constructor(ohlcData, pixiDataRef, layer = 0) {
        this.ohlcData = ohlcData;
        this.pixiDataRef = pixiDataRef;
        this.layer = layer;
        this.hasInit = false;
        this.lastDataLength = 0;

        this.init();
    }

    init() {
        if (this.hasInit) return;
        this.hasInit = true;
        this.initContainer();
        this.recalculateIndicators();
    }

    initContainer() {
        this.container = new Container();
        this.gfx = new Graphics();
        this.container.addChild(this.gfx);
        this.pixiDataRef.current.addToLayer(this.layer, this.container);
    }

    cleanup() {
        if (this.container) {
            this.pixiDataRef.current.removeFromLayer(this.layer, this.container);
            this.container.destroy({ children: true });
            this.container = null;
        }
    }

    recalculateIndicators() {
        if (!this.ohlcData || this.ohlcData.length === 0) {
            this.lastDataLength = 0;
            return;
        }
        // ... calculate indicator values
        this.lastDataLength = this.ohlcData.length;
    }

    drawAll() {
        if (!this.container || !this.gfx) return;

        if (this.ohlcData && this.ohlcData.length !== this.lastDataLength) {
            this.recalculateIndicators();
        }

        this.gfx.clear();

        const slicedData = this.pixiDataRef.current.slicedData;
        if (!slicedData || slicedData.length === 0) return;

        // Update scales
        this.xScale = this.pixiDataRef.current.xScale;
        this.priceScale = this.pixiDataRef.current.priceScale;

        // ... draw using slicedData and this.gfx
    }
}
```

**4. Registering with the Chart:**

In parent components, use the indicator with `registerDrawFn`:

```javascript
const instance = new DrawMyIndicator(candleData.bars, pixiDataRef, layer);
instance.drawAll();
pixiDataRef.current.registerDrawFn('myIndicator', instance.drawAll.bind(instance));

// Cleanup when disabling
pixiDataRef.current.unregisterDrawFn('myIndicator');
instance.cleanup();
```

See `DrawSuperTrend.js` for a complete example implementation.

## Chart Background Patterns

`GenericPixiChart` supports drawing custom background patterns to visually distinguish different time periods or market conditions. This is implemented through a session-based pre-calculation pattern for optimal performance.

### Built-in Market Hours Background

By default, charts automatically display different background colors for market hours (9:30 AM - 4:00 PM EST, weekdays) vs. after-hours/weekends:

- **Market Hours**: Light grey (`0x2a2a2a`) at 40% opacity
- **After Hours**: Dark grey/black (`0x0a0a0a`) at 60% opacity

**Customizing colors:**

```jsx
<GenericPixiChart
    options={{
        marketHoursColor: 0x2a2a2a,      // Hex color for market hours
        afterHoursColor: 0x0a0a0a,       // Hex color for after hours
        marketHoursAlpha: 0.4,           // Transparency (0-1)
        afterHoursAlpha: 0.6             // Transparency (0-1)
    }}
    ...
/>
```

**Disabling market hours background:**

To disable this feature, you can set both alpha values to 0:

```jsx
options={{ marketHoursAlpha: 0, afterHoursAlpha: 0 }}
```

### Performance Pattern: Session Pre-calculation

The market hours background uses a highly optimized pattern that should be followed for any similar background features:

**Key Principles:**

1. **Pre-calculate sessions once**: When data loads, scan through all bars ONCE and create an array of session objects:
   ```javascript
   // In GenericDataHandler
   this.marketHourSessions = [
       { type: "market", startIndex: 0, endIndex: 150 },
       { type: "afterhours", startIndex: 151, endIndex: 890 },
       { type: "market", startIndex: 891, endIndex: 1200 }
   ]
   ```

2. **Fast lookup during draw**: Instead of checking every bar on every draw, iterate through sessions and only draw rectangles for sessions overlapping the visible range.

3. **Incremental updates**: When new bars arrive, extend the last session or add a new one - no full recalculation needed.

4. **Smart caching**: Use a cache key to skip drawing if nothing changed:
   ```javascript
   const cacheKey = `${this.sliceStart}-${this.sliceEnd}-${this.width}-${this.mainChartContainerHeight}`;
   if (this._lastCacheKey === cacheKey) return;
   ```

### Implementing Custom Background Patterns

To add your own background pattern (e.g., highlighting specific sessions, earnings periods, or custom market conditions):

**1. Add calculation function in `GenericDataHandler.js`:**

```javascript
calculateCustomSessions() {
    if (!this.ohlcDatas || this.ohlcDatas.length === 0) {
        this.customSessions = [];
        return;
    }

    const sessions = [];
    let currentType = null;
    let sessionStart = 0;

    this.ohlcDatas.forEach((candle, i) => {
        // Your custom logic to determine session type
        const sessionType = yourCustomLogic(candle);

        if (sessionType !== currentType) {
            if (currentType !== null) {
                sessions.push({
                    type: currentType,
                    startIndex: sessionStart,
                    endIndex: i - 1,
                });
            }
            currentType = sessionType;
            sessionStart = i;
        }

        if (i === this.ohlcDatas.length - 1) {
            sessions.push({
                type: currentType,
                startIndex: sessionStart,
                endIndex: i,
            });
        }
    });

    this.customSessions = sessions;
}
```

**2. Add draw function:**

```javascript
drawCustomBackground() {
    if (!this.slicedData.length || !this.customGfx || !this.customSessions) {
        return;
    }

    // Cache to avoid redrawing unnecessarily
    const cacheKey = `${this.sliceStart}-${this.sliceEnd}-${this.width}-${this.mainChartContainerHeight}`;
    if (this._lastCustomCacheKey === cacheKey) return;
    this._lastCustomCacheKey = cacheKey;

    this.customGfx.clear();

    this.customSessions.forEach((session) => {
        // Skip sessions outside visible range
        if (session.endIndex < this.sliceStart || session.startIndex >= this.sliceEnd) {
            return;
        }

        // Calculate visible portion
        const visibleStart = Math.max(session.startIndex, this.sliceStart);
        const visibleEnd = Math.min(session.endIndex, this.sliceEnd - 1);

        // Convert to sliced coordinates
        const slicedStartIdx = visibleStart - this.sliceStart;
        const slicedEndIdx = visibleEnd - this.sliceStart;

        const startX = this.xScale(slicedStartIdx);
        const endX = this.xScale(slicedEndIdx);
        const width = endX - startX + this.candleWidth;

        // Draw based on session type
        const color = session.type === "typeA" ? 0xFF0000 : 0x0000FF;
        const alpha = 0.3;

        this.customGfx.beginFill(color, alpha);
        this.customGfx.drawRect(startX - this.candleWidth / 2, 0, width, this.mainChartContainerHeight);
        this.customGfx.endFill();
    });
}
```

**3. Initialize graphics in `initGraphics()`:**

```javascript
this.customGfx = new Graphics();
```

**4. Add to container in `initContainers()` (BEFORE layers):**

```javascript
this.mainChartContainer.addChild(this.customGfx);
```

**5. Call calculation in `init()` and `updateData()`:**

```javascript
this.calculateCustomSessions();
```

**6. Call draw function in `draw()`:**

```javascript
this.drawCustomBackground();
```

**7. Handle incremental updates in `setNewBar()`:**

```javascript
updateCustomSessionsForNewBar(bar) {
    if (!this.customSessions || this.customSessions.length === 0) {
        this.calculateCustomSessions();
        return;
    }

    const newBarIndex = this.ohlcDatas.length - 1;
    const newType = yourCustomLogic(bar);
    const lastSession = this.customSessions[this.customSessions.length - 1];

    if (lastSession.type === newType) {
        lastSession.endIndex = newBarIndex;
    } else {
        this.customSessions.push({
            type: newType,
            startIndex: newBarIndex,
            endIndex: newBarIndex,
        });
    }
}
```

### Alternative: Calculation-Based Backgrounds

For simpler cases where background changes can be determined by a pure calculation (without scanning data), you can calculate session types directly during draw:

```javascript
drawCalculatedBackground() {
    if (!this.slicedData.length || !this.customGfx) return;

    const cacheKey = `${this.sliceStart}-${this.sliceEnd}`;
    if (this._lastCalcCacheKey === cacheKey) return;
    this._lastCalcCacheKey = cacheKey;

    this.customGfx.clear();

    let currentType = null;
    let sessionStart = 0;

    this.slicedData.forEach((candle, i) => {
        // Simple calculation (e.g., based on volume threshold)
        const type = candle.volume > 1000000 ? "high" : "low";

        if (type !== currentType) {
            if (currentType !== null) {
                // Draw previous session
                const startX = this.xScale(sessionStart);
                const endX = this.xScale(i);
                const color = currentType === "high" ? 0x00FF00 : 0xFF0000;
                this.customGfx.beginFill(color, 0.2);
                this.customGfx.drawRect(startX, 0, endX - startX, this.mainChartContainerHeight);
                this.customGfx.endFill();
            }
            currentType = type;
            sessionStart = i;
        }

        // Handle last bar
        if (i === this.slicedData.length - 1) {
            const startX = this.xScale(sessionStart);
            const endX = this.xScale(i) + this.candleWidth;
            const color = currentType === "high" ? 0x00FF00 : 0xFF0000;
            this.customGfx.beginFill(color, 0.2);
            this.customGfx.drawRect(startX, 0, endX - startX, this.mainChartContainerHeight);
            this.customGfx.endFill();
        }
    });
}
```

This calculation-based approach works well when:
- The logic is simple (e.g., threshold checks)
- Sessions change frequently
- The performance impact is acceptable (still cached by slice range)

**When to use pre-calculation vs. calculation-based:**
- **Pre-calculation**: Best for expensive operations (timezone conversions, complex lookups) or stable sessions
- **Calculation-based**: Best for simple thresholds or frequently changing conditions

Both approaches use caching to ensure they only redraw when the visible data range changes.

## Drawing Orders on Charts with DrawOrdersV2

`DrawOrdersV2` is a class for rendering order markers (fills, cancellations, open orders) on `GenericPixiChart`. It handles various order states and displays them with appropriate visual markers.

### Basic Usage

```javascript
import DrawOrdersV2 from "./components/DrawOrdersV2";

// After chart is initialized
const ordersDrawer = new DrawOrdersV2(pixiDataRef.current);

// Draw orders (keyed by basketId)
ordersDrawer.draw({
    "basket123": orderData,
    "basket456": orderData2
});

// Cleanup when done
ordersDrawer.cleanup();
```

### Constructor

Unlike indicator classes that take `ohlcData` and `pixiDataRef`, `DrawOrdersV2` takes the `dataHandler` directly:

```javascript
constructor(dataHandler) {
    this.data = dataHandler;  // pixiDataRef.current
    // ...
}
```

It automatically adds itself to layer 2 (above candles, below crosshair).

### Order Data Format

Orders are passed as an object keyed by `basketId`. Each order can have these fields:

**Price fields** (resolved in priority order):
- `fillPrice`, `avgFillPrice`, `triggerPrice`, `price`, `entryPrice`, `limitPrice`, `stopPrice`

**Time fields**:
- Start: `statusTime`, `openTime`, `triggerTime`, `orderReceivedFromClientTime`, `ssboe`
- End: `fillTime`, `endTime`, `cancelTime`, `orderActiveTime`

**Status fields**:
- `status` - Order status string (e.g., "complete", "cancelled")
- `reportType` - e.g., "fill", "cancel"
- `completionReason` - e.g., "F" (filled), "C" (cancelled)
- `priceType` - Order type: "MARKET", "LIMIT", "STOP_MARKET", "STOP_LIMIT"
- `transactionType` - "BUY" or 1 for buy (green), "SELL" or other for sell (red)

### Visual Markers

The class draws different markers based on order state:

| Order State | Marker |
|-------------|--------|
| **Instant fill** (market order, <1s duration) | Filled circle at fill time |
| **Filled order** | Open circle at start → line → filled circle at end |
| **Cancelled order** | X marker at cancel time, with line from open time |
| **Open order** | Open circle at start → line → arrow at chart end |

Colors: Green (`0x00ff00`) for BUY, Red (`0xff0000`) for SELL.

### Integration Pattern

```javascript
// In parent component
const ordersRef = useRef(null);

useEffect(() => {
    if (pixiDataRef.current && !ordersRef.current) {
        ordersRef.current = new DrawOrdersV2(pixiDataRef.current);

        // Register draw function so it redraws on pan/zoom
        pixiDataRef.current.registerDrawFn('orders', () => {
            ordersRef.current.draw();
        });
    }

    return () => {
        if (ordersRef.current) {
            pixiDataRef.current.unregisterDrawFn('orders');
            ordersRef.current.cleanup();
            ordersRef.current = null;
        }
    };
}, [pixiDataRef.current]);

// Update orders when data changes
useEffect(() => {
    if (ordersRef.current && orders) {
        ordersRef.current.draw(orders);
    }
}, [orders]);
```

### Key Implementation Details

1. **Uses `slicedData` for positioning**: Orders are positioned by finding the index in `slicedData` where the order's timestamp matches, ensuring correct pan/zoom behavior.

2. **Time matching**: Uses `findIndex` to locate bars by comparing `timestamp` or `datetime` fields.

3. **Graphics reuse**: Creates `ordersGfx` once and clears it on each draw (follows the standard pattern).

4. **Order compilation**: If orders come as arrays, they are compiled using `compileOrders()` utility before drawing.