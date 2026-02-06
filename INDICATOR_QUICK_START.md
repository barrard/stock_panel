# Indicator Quick Start Guide

A practical guide for using the new indicator overlay classes with GenericPixiChart.

---

## Quick Reference: Available Indicators

| Indicator | Purpose | Visual |
|-----------|---------|--------|
| **DrawMovingAverages** | EMAs (20, 50, 200 periods) | Colored lines (Green/Orange/Red) |
| **DrawSuperTrend** | Trend following indicator | Line that changes color with trend |
| **DrawSessionRangeZones** | Expected price ranges | Colored zones (Blue: ON, Orange: RTH) |

---

## Basic Pattern (All Indicators)

```javascript
import React, { useRef, useState, useEffect } from "react";
import GenericPixiChart from "./GenericPixiChart";
import DrawMovingAverages from "./drawFunctions/DrawMovingAverages";

function MyChart() {
    const pixiDataRef = useRef();
    const [candleData, setCandleData] = useState([]);
    const [showIndicator, setShowIndicator] = useState(false);
    const indicatorRef = useRef(null);

    // Toggle indicator on/off
    useEffect(() => {
        if (showIndicator && pixiDataRef.current && !indicatorRef.current) {
            // Create indicator instance
            indicatorRef.current = new DrawMovingAverages(
                candleData,
                pixiDataRef,
                [20, 50, 200],  // Parameters
                0               // Layer
            );

            // Register with chart for pan/zoom updates
            pixiDataRef.current.registerDrawFn(
                'myIndicator',
                indicatorRef.current.drawAll.bind(indicatorRef.current)
            );
        } else if (!showIndicator && indicatorRef.current) {
            // Cleanup when disabling
            pixiDataRef.current.unregisterDrawFn('myIndicator');
            indicatorRef.current.cleanup();
            indicatorRef.current = null;
        }
    }, [showIndicator, candleData]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (indicatorRef.current) {
                pixiDataRef.current?.unregisterDrawFn('myIndicator');
                indicatorRef.current.cleanup();
            }
        };
    }, []);

    return (
        <div>
            <button onClick={() => setShowIndicator(!showIndicator)}>
                Toggle Indicator
            </button>
            <GenericPixiChart
                ohlcDatas={candleData}
                symbol="SPY"
                pixiDataRef={pixiDataRef}
                height={500}
            />
        </div>
    );
}
```

---

## Moving Averages

### Constructor
```javascript
new DrawMovingAverages(ohlcData, pixiDataRef, periods, layer)
```

**Parameters:**
- `ohlcData` - Array of OHLC bar objects
- `pixiDataRef` - React ref to GenericDataHandler
- `periods` - Array of periods (default: `[20, 50, 200]`)
- `layer` - Z-index layer (default: `0`)

### Colors (Default)
- 20-period: Green (`0x00ff00`)
- 50-period: Orange (`0xffaa00`)
- 200-period: Red (`0xff0000`)

### Custom Colors
To use custom colors, modify the `colors` object after construction:

```javascript
const ma = new DrawMovingAverages(candleData, pixiDataRef, [20, 50, 200]);
ma.colors[20] = 0x00ffff;  // Cyan for 20-period
ma.colors[50] = 0xffff00;  // Yellow for 50-period
ma.colors[200] = 0xff00ff; // Magenta for 200-period
```

### Custom Periods
```javascript
// Only show 9 and 21 EMAs
const ma = new DrawMovingAverages(candleData, pixiDataRef, [9, 21]);

// Must define colors for custom periods
ma.colors[9] = 0x00ff00;
ma.colors[21] = 0xff0000;
```

---

## SuperTrend

### Constructor
```javascript
new DrawSuperTrend(ohlcData, pixiDataRef, layer)
```

**Parameters:**
- `ohlcData` - Array of OHLC bar objects
- `pixiDataRef` - React ref to GenericDataHandler
- `layer` - Z-index layer (default: `0`)

### Colors (Default)
- Bullish (price > SuperTrend): Green (`0x00ff00`)
- Bearish (price < SuperTrend): Red (`0xff0000`)

### Configuration
```javascript
const st = new DrawSuperTrend(candleData, pixiDataRef);

// Customize colors
st.bullishColor = 0x00ffff;  // Cyan
st.bearishColor = 0xff00ff;  // Magenta

// Customize line width
st.lineWidth = 4;  // Default is 3
```

### Notes
- Automatically calculates ATR (Average True Range)
- Uses existing `makeSuperTrendData()` calculation
- Self-manages recalculation when data changes

---

## Session Range Zones

### Constructor
```javascript
new DrawSessionRangeZones(
    ohlcData,
    avgON_dailyRange,
    avgRTH_dailyRange,
    pixiDataRef,
    layer
)
```

**Parameters:**
- `ohlcData` - Array of OHLC bar objects
- `avgON_dailyRange` - Average overnight range in points (e.g., `15.5`)
- `avgRTH_dailyRange` - Average RTH range in points (e.g., `42.0`)
- `pixiDataRef` - React ref to GenericDataHandler
- `layer` - Z-index layer (default: `0`)

### Usage Example
```javascript
// For ES futures (typical ranges)
const zones = new DrawSessionRangeZones(
    candleData,
    15.5,  // Overnight typically 15-20 points
    42.0,  // RTH typically 40-50 points
    pixiDataRef,
    0
);
```

### Colors (Default)
- Overnight: Dark Blue (`0x1e3a8a`) at 20% opacity
- RTH: Orange (`0xf59e0b`) at 20% opacity

### Customization
```javascript
const zones = new DrawSessionRangeZones(candleData, 15.5, 42.0, pixiDataRef);

// Customize colors
zones.onColor = 0x0000ff;    // Blue
zones.onAlpha = 0.3;         // 30% opacity

zones.rthColor = 0xff0000;   // Red
zones.rthAlpha = 0.25;       // 25% opacity
```

### How Zones Work
1. Starts centered on session open ± (range / 2)
2. Expands upward if price exceeds top boundary
3. Expands downward if price exceeds bottom boundary
4. Capped at full average range width
5. Maintains fixed height as it shifts up/down

---

## Layer System

Layers control drawing order (z-index). Lower numbers render first (behind).

**Recommended Layers:**
- `-1` - Behind candles (backgrounds)
- `0` - With candles (most indicators)
- `1` - Above candles (overlays)
- `2` - Top layer (orders, crosshair)

### Example: Multiple Indicators
```javascript
// Session zones behind everything
const zones = new DrawSessionRangeZones(candleData, 15.5, 42.0, pixiDataRef, -1);

// Moving averages with candles
const ma = new DrawMovingAverages(candleData, pixiDataRef, [20, 50], 0);

// SuperTrend above candles
const st = new DrawSuperTrend(candleData, pixiDataRef, 1);
```

---

## Multiple Indicators Example

```javascript
function AdvancedChart() {
    const pixiDataRef = useRef();
    const [candleData, setCandleData] = useState([]);

    // Toggle states
    const [showMA, setShowMA] = useState(false);
    const [showST, setShowST] = useState(false);
    const [showZones, setShowZones] = useState(false);

    // Indicator refs
    const maRef = useRef(null);
    const stRef = useRef(null);
    const zonesRef = useRef(null);

    // Moving Averages
    useEffect(() => {
        if (showMA && pixiDataRef.current && !maRef.current) {
            maRef.current = new DrawMovingAverages(candleData, pixiDataRef, [20, 50, 200], 0);
            pixiDataRef.current.registerDrawFn('ma', maRef.current.drawAll.bind(maRef.current));
        } else if (!showMA && maRef.current) {
            pixiDataRef.current.unregisterDrawFn('ma');
            maRef.current.cleanup();
            maRef.current = null;
        }
    }, [showMA, candleData]);

    // SuperTrend
    useEffect(() => {
        if (showST && pixiDataRef.current && !stRef.current) {
            stRef.current = new DrawSuperTrend(candleData, pixiDataRef, 1);
            pixiDataRef.current.registerDrawFn('st', stRef.current.drawAll.bind(stRef.current));
        } else if (!showST && stRef.current) {
            pixiDataRef.current.unregisterDrawFn('st');
            stRef.current.cleanup();
            stRef.current = null;
        }
    }, [showST, candleData]);

    // Session Zones
    useEffect(() => {
        if (showZones && pixiDataRef.current && !zonesRef.current) {
            zonesRef.current = new DrawSessionRangeZones(candleData, 15.5, 42.0, pixiDataRef, -1);
            pixiDataRef.current.registerDrawFn('zones', zonesRef.current.drawAll.bind(zonesRef.current));
        } else if (!showZones && zonesRef.current) {
            pixiDataRef.current.unregisterDrawFn('zones');
            zonesRef.current.cleanup();
            zonesRef.current = null;
        }
    }, [showZones, candleData]);

    // Cleanup all on unmount
    useEffect(() => {
        return () => {
            if (maRef.current) {
                pixiDataRef.current?.unregisterDrawFn('ma');
                maRef.current.cleanup();
            }
            if (stRef.current) {
                pixiDataRef.current?.unregisterDrawFn('st');
                stRef.current.cleanup();
            }
            if (zonesRef.current) {
                pixiDataRef.current?.unregisterDrawFn('zones');
                zonesRef.current.cleanup();
            }
        };
    }, []);

    return (
        <div>
            <div className="controls">
                <button onClick={() => setShowMA(!showMA)}>
                    {showMA ? 'Hide' : 'Show'} Moving Averages
                </button>
                <button onClick={() => setShowST(!showST)}>
                    {showST ? 'Hide' : 'Show'} SuperTrend
                </button>
                <button onClick={() => setShowZones(!showZones)}>
                    {showZones ? 'Hide' : 'Show'} Session Zones
                </button>
            </div>
            <GenericPixiChart
                ohlcDatas={candleData}
                symbol="ES"
                pixiDataRef={pixiDataRef}
                height={600}
            />
        </div>
    );
}
```

---

## Real-Time Updates

Indicators automatically handle real-time data updates. When you add a new bar:

```javascript
// Add new bar to data
const newBar = { open: 5850, high: 5852, low: 5848, close: 5851, ... };
pixiDataRef.current.setNewBar(newBar);

// Indicators detect data length change and recalculate automatically
// No manual intervention needed
```

**How it works:**
1. Indicator tracks `lastDataLength`
2. On `drawAll()`, checks if length changed
3. If changed, calls `recalculateIndicators()`
4. Then draws the updated values

---

## Troubleshooting

### Indicator not showing
```javascript
// Make sure chart is initialized first
if (pixiDataRef.current) {
    const indicator = new DrawSuperTrend(candleData, pixiDataRef);
    pixiDataRef.current.registerDrawFn('st', indicator.drawAll.bind(indicator));
}
```

### Indicator not panning/zooming correctly
```javascript
// Must use .bind() when registering
pixiDataRef.current.registerDrawFn(
    'myIndicator',
    indicator.drawAll.bind(indicator)  // .bind() is critical!
);
```

### Indicator persists after toggling off
```javascript
// Must cleanup properly
pixiDataRef.current.unregisterDrawFn('myIndicator');
indicator.cleanup();  // Don't forget this!
```

### Multiple indicators overlapping
```javascript
// Use different layers
const zones = new DrawSessionRangeZones(candleData, 15.5, 42.0, pixiDataRef, -1);
const ma = new DrawMovingAverages(candleData, pixiDataRef, [20, 50], 0);
const st = new DrawSuperTrend(candleData, pixiDataRef, 1);
```

### Colors not showing
```javascript
// Define colors for all custom periods
const ma = new DrawMovingAverages(candleData, pixiDataRef, [9, 21]);
ma.colors[9] = 0x00ff00;   // Must define!
ma.colors[21] = 0xff0000;  // Must define!
```

---

## Performance Tips

1. **Reuse indicator instances** - Don't recreate on every render
2. **Use refs to store instances** - Prevents recreation
3. **Register draw functions once** - Not on every effect run
4. **Clean up properly** - Prevents memory leaks
5. **Use appropriate layers** - Reduces overdraw

### Good Pattern
```javascript
const indicatorRef = useRef(null);

useEffect(() => {
    if (enabled && !indicatorRef.current) {
        // Create once
        indicatorRef.current = new DrawSuperTrend(candleData, pixiDataRef);
        pixiDataRef.current.registerDrawFn('st', indicatorRef.current.drawAll.bind(indicatorRef.current));
    }
}, [enabled, candleData]);
```

### Bad Pattern
```javascript
useEffect(() => {
    // DON'T: Creates new instance every render
    const indicator = new DrawSuperTrend(candleData, pixiDataRef);
    pixiDataRef.current.registerDrawFn('st', indicator.drawAll.bind(indicator));
    // Missing cleanup!
}, [candleData]);
```

---

## Creating Your Own Indicator

See `CLAUDE.md` section "Creating Overlay Indicator Classes" for the full pattern.

**Minimal template:**

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
        // Calculate your indicator values here
        this.lastDataLength = this.ohlcData.length;
    }

    drawAll() {
        if (!this.container || !this.gfx) return;

        // Auto-recalculate if data changed
        if (this.ohlcData && this.ohlcData.length !== this.lastDataLength) {
            this.recalculateIndicators();
        }

        this.gfx.clear();

        // Update scales
        this.xScale = this.pixiDataRef.current.xScale;
        this.priceScale = this.pixiDataRef.current.priceScale;

        // Get visible data
        const slicedData = this.pixiDataRef.current.slicedData;
        if (!slicedData || slicedData.length === 0) return;

        // Draw using slicedData, xScale, priceScale
    }
}
```

---

## See Also

- **CLAUDE.md** - Comprehensive patterns and best practices
- **RELEASE_NOTES.md** - Full changelog and features
- **SECTORS_API_SPEC.md** - Sectors API documentation
- Individual indicator source files for implementation details
