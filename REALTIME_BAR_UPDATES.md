# Real-Time Bar Update Pattern

This document explains how to properly handle real-time bar updates with the distinction between **temporary bars** (in-progress) and **complete bars** (finalized).

## The Problem

When displaying a 1-minute chart:
- You receive 1-second updates (complete 1s bars) that should update the current temporary 1m bar
- When the minute completes, you receive a complete 1m bar that should replace the temporary bar

## GenericDataHandler Methods

### 1. `setNewBar(bar)` - Historical/Initial Data
Use for loading historical data or when you don't have a temporary bar.

```javascript
// Loading initial data
pixiDataRef.current.setNewBar(historicalBar);
```

### 2. `newTick(tick)` - Update Temporary Bar
Use for high-frequency updates (1s, tick data) that update the current incomplete bar.

```javascript
// 1-second price update
pixiDataRef.current.newTick({
    lastPrice: 4550.25,
    volume: 100,
    datetime: Date.now()
});
```

**What it does:**
- Creates a temporary bar if none exists
- Updates the last bar's high/low/close/volume
- Marks it as temporary (`isTemporary: true`)

### 3. `setCompleteBar(bar)` - Replace with Complete Bar
Use when your chart's timeframe completes (e.g., 1m bar finished).

```javascript
// Complete 1-minute bar received
pixiDataRef.current.setCompleteBar({
    open: 4550.00,
    high: 4551.50,
    low: 4549.75,
    close: 4550.25,
    volume: 5000,
    datetime: 1234567890000,
    symbol: "ES"
});
```

**What it does:**
- Replaces the temporary bar with accurate complete bar
- Clears `currentBar` flag
- Next `newTick()` will create a fresh temporary bar

## Example: 1-Minute Chart Implementation

```javascript
// In your chart component (e.g., SpyChart.js)

useEffect(() => {
    if (!pixiDataRef.current || !Socket) return;

    // 1. Listen for 1-second updates (for temporary bar)
    const liveBarUpdateEvent = `1s-${symbol}-LiveBarUpdate`;
    const handleLiveBarUpdate = (data) => {
        if (!pixiDataRef.current) return;

        // Update temporary bar with new price
        pixiDataRef.current.newTick({
            lastPrice: data.last || data.close,
            volume: data.volume || 0,
            datetime: data.datetime || Date.now()
        });
    };

    // 2. Listen for complete 1-minute bars
    const liveBarNewEvent = `1m-${symbol}-LiveBarNew`;
    const handleLiveBarNew = (data) => {
        console.log("Complete 1m bar received", data);

        // Replace temporary bar with complete bar
        pixiDataRef.current.setCompleteBar({
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close,
            volume: data.volume,
            datetime: data.datetime,
            timestamp: data.timestamp || data.datetime,
            symbol: data.symbol
        });
    };

    Socket.on(liveBarUpdateEvent, handleLiveBarUpdate);
    Socket.on(liveBarNewEvent, handleLiveBarNew);

    return () => {
        Socket.off(liveBarUpdateEvent, handleLiveBarUpdate);
        Socket.off(liveBarNewEvent, handleLiveBarNew);
    };
}, [symbol, Socket]);
```

## Example: Tick Chart with Bar Combining

For `BetterTickChart` where you receive 100-tick bars but display combined bars:

```javascript
// Raw 100-tick bars are complete
const handleNew100TickBar = (data) => {
    // Add to raw data
    rawDataRef.current.push(data);

    if (join === 1) {
        // No combining - use complete bar directly
        setCandleData(prev => [...prev, data]);
        pixiDataRef.current.setCompleteBar(data);
    } else {
        // Combining multiple bars - recombine
        const combined = combineBars(rawDataRef.current, join);
        const lastCombined = combined[combined.length - 1];

        // Check if this creates a new combined bar
        const isNewCombinedBar = rawDataRef.current.length % join === 1;

        if (isNewCombinedBar) {
            // New combined bar starts - set as complete
            setCandleData(combined);
            pixiDataRef.current.setCompleteBar(lastCombined);
        } else {
            // Still building current combined bar - treat as tick update
            setCandleData(combined);
            pixiDataRef.current.newTick({
                lastPrice: lastCombined.close,
                high: lastCombined.high,
                low: lastCombined.low,
                volume: 0, // Already included in combined
                datetime: lastCombined.datetime
            });
        }
    }
};

// 1-second updates for temporary bar
const handleLiveBarUpdate = (tick) => {
    pixiDataRef.current.newTick({
        lastPrice: tick.lastPrice,
        datetime: Date.now(),
    });
};
```

## Backend Event Naming Convention

Follow this pattern for socket events:

```javascript
// High-frequency updates (price feed for temporary bar)
`1s-${symbol}-LiveBarUpdate`      // 1-second complete bars
`new-100-${symbol}-tickBar`       // 100-tick complete bars

// Complete bar for chart's timeframe
`${timeframe}-${symbol}-LiveBarNew`   // e.g., "1m-ES-LiveBarNew", "5m-ES-LiveBarNew"
```

## Visual Distinction (Optional)

You can style temporary bars differently in the chart:

```javascript
// In GenericDataHandler drawAllCandles()
if (candle.isTemporary) {
    this.candleStickGfx.beginFill(0x333333, 0.5); // Dimmed/dotted style
} else {
    this.candleStickGfx.beginFill(isUp ? 0x00ff00 : 0xff0000); // Normal
}
```

## Key Benefits

1. **No duplicate bars** - temporary bar gets replaced, not appended
2. **Smooth updates** - chart updates in real-time with ticks
3. **Accurate history** - complete bars have server-validated OHLCV data
4. **Clear state** - `currentBar` flag tracks temporary status

## Debugging

Add logging to track bar lifecycle:

```javascript
console.log("[Chart] Tick update - temporary bar", pixiDataRef.current.currentBar);
console.log("[Chart] Complete bar received - replacing temporary");
console.log("[Chart] Total bars:", pixiDataRef.current.ohlcDatas.length);
```
