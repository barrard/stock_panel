# Release Notes - Chart Indicators & Sectors Update

**Date:** January 2026
**Version:** Latest

## Overview

This release introduces a comprehensive suite of chart overlay indicators, a new Sectors analysis page, enhanced order visualization, and significant improvements to the charting infrastructure.

---

## New Features

### 1. Chart Indicator Overlay System

Three new indicator overlay classes following best practices for performance and pan/zoom compatibility:

#### DrawMovingAverages
**File:** `src/components/charts/drawFunctions/DrawMovingAverages.js`

Renders exponential moving averages (EMAs) on any chart using `GenericPixiChart`.

**Features:**
- Configurable periods (default: 20, 50, 200)
- Color-coded lines (Green: 20, Orange: 50, Red: 200)
- Pre-calculation pattern for optimal performance
- Automatic recalculation when data changes
- Graphics object reuse (no GC pressure)

**Usage:**
```javascript
import DrawMovingAverages from "./components/charts/drawFunctions/DrawMovingAverages";

// Initialize with periods
const maIndicator = new DrawMovingAverages(
    candleData,      // OHLC data array
    pixiDataRef,     // Chart data handler ref
    [20, 50, 200],   // Periods to calculate
    0                // Layer (0 = below candles)
);

// Register with chart for pan/zoom updates
pixiDataRef.current.registerDrawFn('movingAverages', maIndicator.drawAll.bind(maIndicator));

// Cleanup when disabling
pixiDataRef.current.unregisterDrawFn('movingAverages');
maIndicator.cleanup();
```

**Key Implementation Details:**
- Uses `makeEMA()` from indicator helpers
- Calculates all periods once on full dataset
- Draws only visible portion using `slicedData`
- Automatically recalculates when data length changes

---

#### DrawSuperTrend
**File:** `src/components/charts/drawFunctions/DrawSuperTrend.js`

Renders the SuperTrend indicator with dynamic color coding based on trend direction.

**Features:**
- Color changes based on price position (Green: bullish, Red: bearish)
- Self-managing data updates (tracks data length changes)
- Efficient Graphics object reuse
- Integrated ATR and SuperTrend calculation

**Usage:**
```javascript
import DrawSuperTrend from "./components/charts/drawFunctions/DrawSuperTrend";

const superTrend = new DrawSuperTrend(
    candleData,   // OHLC data array
    pixiDataRef,  // Chart data handler ref
    0             // Layer
);

pixiDataRef.current.registerDrawFn('superTrend', superTrend.drawAll.bind(superTrend));

// Cleanup
pixiDataRef.current.unregisterDrawFn('superTrend');
superTrend.cleanup();
```

**How It Works:**
1. Calculates trading range using `calcTradingRange()`
2. Generates SuperTrend values using `makeSuperTrendData()`
3. Draws line segments with color based on close vs. SuperTrend
4. Recalculates automatically on new bars

---

#### DrawSessionRangeZones
**File:** `src/components/charts/drawFunctions/DrawSessionRangeZones.js`

Visualizes expected price ranges for overnight (ON) and regular trading hours (RTH) sessions based on historical average ranges.

**Features:**
- Separate zones for ON and RTH sessions
- Dynamic zone expansion as price moves
- Color-coded backgrounds (Blue: ON, Orange: RTH)
- Per-bar zone calculation for accurate rendering

**Usage:**
```javascript
import DrawSessionRangeZones from "./components/charts/drawFunctions/DrawSessionRangeZones";

const sessionZones = new DrawSessionRangeZones(
    candleData,           // OHLC data array
    avgON_dailyRange,     // Average overnight range (e.g., 15.5 points)
    avgRTH_dailyRange,    // Average RTH range (e.g., 42.0 points)
    pixiDataRef,          // Chart data handler ref
    0                     // Layer (below candles)
);

pixiDataRef.current.registerDrawFn('sessionZones', sessionZones.drawAll.bind(sessionZones));

// Cleanup
pixiDataRef.current.unregisterDrawFn('sessionZones');
sessionZones.cleanup();
```

**Zone Logic:**
1. Starts centered on session open price ± (range / 2)
2. Expands if price exceeds half-range boundary
3. Caps expansion at full average range
4. Maintains fixed range height as it shifts

**Visual Settings:**
- ON Color: `0x1e3a8a` (dark blue) at 20% opacity
- RTH Color: `0xf59e0b` (orange) at 20% opacity

---

### 2. Sectors Analysis Page

**File:** `src/components/SectorsPage.jsx`
**API Spec:** `SECTORS_API_SPEC.md`

A new comprehensive sectors analysis page for tracking and visualizing market sector ETF performance.

**Supported Sectors:**
- XLE - Energy
- XLF - Financials
- XLU - Utilities
- XLI - Industrials
- XLK - Technology
- XLB - Materials
- XLP - Consumer Staples
- XLY - Consumer Discretionary
- XLV - Healthcare
- XLRE - Real Estate
- XLC - Communication Services

**Features:**
- Multi-timeframe support (5-minute, daily, weekly)
- Performance heat maps
- Correlation matrix visualization
- Interactive charts for each sector
- Period selection (1d, 1w, 1m, 3m, 6m, 1y)

**Required API Endpoints:**

1. **GET /API/sectors/data** - Fetch OHLCV data for all sectors
   ```
   ?timeframe=daily&period=3m
   ```

2. **GET /API/sectors/performance** - Get performance metrics
   ```
   ?period=1m
   ```

3. **GET /API/sectors/correlation** - Get correlation matrix
   ```
   ?timeframe=daily&period=3m
   ```

See `SECTORS_API_SPEC.md` for complete API documentation.

---

### 3. Enhanced Order Visualization

**File:** `src/components/charts/pixiChart/components/DrawOrdersV2.js`

Significantly enhanced order drawing with better visual markers and state handling.

**Improvements:**
- Instant fill detection (market orders <1s duration)
- Distinct markers for different order states:
  - **Filled**: Open circle → line → filled circle
  - **Cancelled**: X marker with line from open time
  - **Open/Active**: Open circle → line → arrow
  - **Instant fill**: Single filled circle
- Better time field resolution (supports multiple field names)
- Improved price field detection
- Color coding: Green (BUY), Red (SELL)

**Order Field Prioritization:**

Price fields (in order):
1. `fillPrice`
2. `avgFillPrice`
3. `triggerPrice`
4. `price`
5. `entryPrice`
6. `limitPrice`
7. `stopPrice`

Time fields (start):
1. `statusTime`
2. `openTime`
3. `triggerTime`
4. `orderReceivedFromClientTime`
5. `ssboe`

Time fields (end):
1. `fillTime`
2. `endTime`
3. `cancelTime`
4. `orderActiveTime`

---

### 4. Futures Order Execution

**File:** `src/components/charts/pixiChart/components/sendFuturesOrder.js`

New utility for submitting futures orders via the Rithmic API.

**Usage:**
```javascript
import sendFuturesOrder from "./components/sendFuturesOrder";

const response = await sendFuturesOrder({
    transactionType: 1,        // 1 = buy, 2 = sell
    priceType: 1,              // 1 = Limit, 4 = Stop Market
    limitPrice: 5850.25,
    symbolData: {
        fullSymbol: "ESZ4",    // Contract symbol
        exchange: "CME"        // Exchange
    }
});
```

**Future Support (commented):**
- Bracket orders (`bracketType: 6`)
- Target ticks (`targetTicks`)
- Stop loss ticks (`stopTicks`)
- Trailing stops (`trailingStopTicks`)
- OCO orders (`ocoData`)

---

### 5. Market Hours Background Pattern

**File:** `src/components/charts/GenericDataHandler.js`

Added automatic market hours background shading to all `GenericPixiChart` instances.

**Features:**
- Pre-calculated session pattern (optimized performance)
- Distinguishes market hours (9:30 AM - 4:00 PM EST) from after-hours
- Smart caching to avoid redundant redraws
- Customizable colors and opacity

**Default Colors:**
- Market hours: `0x2a2a2a` at 40% opacity (light grey)
- After hours: `0x0a0a0a` at 60% opacity (dark grey/black)

**Customization:**
```javascript
<GenericPixiChart
    options={{
        marketHoursColor: 0x2a2a2a,
        afterHoursColor: 0x0a0a0a,
        marketHoursAlpha: 0.4,
        afterHoursAlpha: 0.6
    }}
    ...
/>
```

**Disable:**
```javascript
options={{ marketHoursAlpha: 0, afterHoursAlpha: 0 }}
```

**Implementation Pattern:**
- Session pre-calculation on data load
- Incremental updates on new bars
- Fast lookup during draw (no per-bar checks)
- Cache key optimization

See CLAUDE.md section "Chart Background Patterns" for implementation details.

---

## Enhancements

### GenericPixiChart Improvements

**File:** `src/components/charts/GenericPixiChart.jsx`

- Market hours background rendering
- Better options handling for background colors
- Improved layer management for background graphics

### BackTestChartGeneric Integration

**File:** `src/components/charts/BacktestChart/BackTestChartGeneric/BackTestChartGeneric.jsx`

- Integrated DrawSuperTrend indicator
- Integrated DrawMovingAverages indicator
- Integrated DrawSessionRangeZones
- Toggle buttons for indicator visibility
- Liquidity ratio data integration

**New Indicator Controls:**
- SuperTrend toggle
- Moving Averages toggle
- Session Zones toggle
- Proper cleanup on unmount

### BetterTickChart Refactoring

**File:** `src/components/charts/pixiChart/components/BetterTickChart/BetterTickChart.jsx`

- Improved bar combination logic
- Better handling of join factor changes
- Cleaner raw data management
- Enhanced real-time update handling

### Enhanced Liquidity Ratios Hook

**File:** `src/components/charts/hooks/useLiquidityRatios.js`

- Expanded liquidity calculation logic
- Better session detection
- Improved data handling

---

## Documentation Updates

### CLAUDE.md

Added comprehensive sections:

1. **Chart Indicators with GenericPixiChart**
   - Problem statement (pan/zoom compatibility)
   - Solution pattern using `slicedData`
   - Coordinate calculation guidelines

2. **Creating Overlay Indicator Classes**
   - Graphics object reuse pattern
   - Self-managing data updates
   - Standard class structure
   - Registration pattern

3. **Chart Background Patterns**
   - Built-in market hours background
   - Performance pattern: Session pre-calculation
   - Implementing custom background patterns
   - Calculation-based backgrounds
   - When to use each approach

4. **Drawing Orders on Charts with DrawOrdersV2**
   - Constructor pattern differences
   - Order data format
   - Visual marker reference table
   - Integration pattern

### New API Specification

**File:** `SECTORS_API_SPEC.md`

Complete API specification for the Sectors feature including:
- Endpoint definitions
- Request/response formats
- Calculation methods (especially correlation)
- Performance considerations
- Error handling
- Testing checklist
- Future enhancements

---

## Refactoring & Deprecations

### GptChart Deprecation

**Files moved to:** `src/components/charts/_GptChart/`

The GptChart component has been deprecated (indicated by underscore prefix). Use `GenericPixiChart` with custom draw functions instead.

**Migration Path:**
1. Replace GptChart with GenericPixiChart
2. Convert custom rendering to draw function classes
3. Register draw functions using `registerDrawFn()`

---

## Bug Fixes

- Fixed DrawMinMax unnecessary imports
- Improved order rendering edge cases
- Better handling of missing order time fields
- Fixed session zone calculation for edge cases
- Corrected date label alignment for candle bodies

---

## Performance Optimizations

1. **Indicator Pre-calculation:**
   - All indicators calculate once on full dataset
   - Only slicing/drawing on pan/zoom (no recalc)
   - Automatic recalc only when data length changes

2. **Graphics Object Reuse:**
   - Create Graphics objects once
   - Clear and reuse instead of destroy/recreate
   - Eliminates garbage collection pressure

3. **Session Caching:**
   - Market hours sessions pre-calculated
   - Cache keys prevent redundant draws
   - Incremental updates on new bars

4. **Smart Layer Management:**
   - Background rendered below all layers
   - Proper z-ordering for indicators
   - Efficient container hierarchy

---

## Migration Guide

### For Indicator Developers

**Old Pattern (Don't use):**
```javascript
drawAll() {
    this.container.removeChildren().forEach(child => child.destroy());
    const gfx = new Graphics();
    // ... draw
    this.container.addChild(gfx);
}
```

**New Pattern (Use this):**
```javascript
initContainer() {
    this.container = new Container();
    this.gfx = new Graphics(); // Create once
    this.container.addChild(this.gfx);
    this.pixiDataRef.current.addToLayer(this.layer, this.container);
}

drawAll() {
    this.gfx.clear(); // Reuse, don't destroy
    // ... draw using this.gfx
}
```

### For Chart Users

**Adding Moving Averages:**
```javascript
const [showMA, setShowMA] = useState(false);
const maInstanceRef = useRef(null);

useEffect(() => {
    if (showMA && pixiDataRef.current && !maInstanceRef.current) {
        maInstanceRef.current = new DrawMovingAverages(
            candleData,
            pixiDataRef,
            [20, 50, 200],
            0
        );
        pixiDataRef.current.registerDrawFn(
            'movingAverages',
            maInstanceRef.current.drawAll.bind(maInstanceRef.current)
        );
    } else if (!showMA && maInstanceRef.current) {
        pixiDataRef.current.unregisterDrawFn('movingAverages');
        maInstanceRef.current.cleanup();
        maInstanceRef.current = null;
    }
}, [showMA, candleData]);
```

---

## Testing Notes

### What to Test

1. **Indicator Overlays:**
   - [ ] Moving averages render correctly on all timeframes
   - [ ] SuperTrend color changes accurately with trend
   - [ ] Session zones expand/contract as expected
   - [ ] All indicators pan and zoom correctly
   - [ ] No performance degradation with multiple indicators

2. **Sectors Page:**
   - [ ] All 11 sectors load data
   - [ ] Timeframe switching works
   - [ ] Period selection updates correctly
   - [ ] Performance metrics calculate accurately
   - [ ] Correlation matrix displays properly

3. **Order Visualization:**
   - [ ] Market orders show instant fill markers
   - [ ] Limit orders show open circle → line → fill
   - [ ] Cancelled orders show X marker
   - [ ] Color coding works (green/red)

4. **Market Hours Background:**
   - [ ] Background shading displays correctly
   - [ ] Session transitions are accurate
   - [ ] Custom colors work
   - [ ] Can be disabled with alpha: 0

---

## Known Issues

1. **DrawSessionRangeZones:**
   - Contains a `debugger;` statement at line 133 (should be removed in production)

2. **Sectors API:**
   - Backend endpoints not yet implemented
   - SectorsPage component ready but needs API integration

3. **Future Order Features:**
   - Bracket orders, OCO orders, trailing stops commented out
   - Awaiting full implementation

---

## Dependencies

No new external dependencies added. Uses existing:
- PIXI.js (for rendering)
- React (hooks, refs)
- Existing indicator calculation utilities

---

## Breaking Changes

**None.** All changes are additive and backward compatible.

Deprecated features:
- `GptChart` (moved to `_GptChart/` but still functional)

---

## Credits

**Commits included in this release:**
- ba44df0 - Moving averages on indicators
- d9e99a7 - Send order from trade window
- 06140fb - Debugging drawOrders
- 5c84cf9 - Refactor supertrend
- e7026b1 - Updated icon for super trend tick and v2 chart
- 1f89e9c - Applied super trend tick and v2 chart
- 49fe9f4 - Added draw super trend and applied to backtest chart
- 7ca4571 - Edit the date label to match start of candle body
- 2404060 - Deprecated gptChart, added avg expected zone backtest chart
- 4537810 - Bug fix, new orders view

---

## Next Steps

1. **Backend Implementation:**
   - Implement the 3 Sectors API endpoints
   - Set up sector ETF data collection
   - Configure correlation calculation pipeline

2. **Production Cleanup:**
   - Remove `debugger;` statement from DrawSessionRangeZones
   - Complete futures order bracket/OCO implementation
   - Add comprehensive error handling

3. **Future Enhancements:**
   - Additional indicators (Bollinger Bands, MACD, etc.)
   - Indicator configuration UI (customize periods, colors)
   - Sector rotation analysis
   - Historical backtesting with indicators

---

## Support

For questions or issues:
- Check `CLAUDE.md` for implementation patterns
- Review `SECTORS_API_SPEC.md` for API details
- See individual class files for usage examples
