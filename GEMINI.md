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