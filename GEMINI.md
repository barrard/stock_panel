# Gemini - Notes and Patterns

This document contains notes and established patterns for developing and maintaining this project with Gemini.

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