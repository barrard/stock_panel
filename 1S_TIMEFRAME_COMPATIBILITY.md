# 1-Second Timeframe Chart Compatibility

## Question: Would a 1s timeframe chart work with this pattern?

**Answer: YES!** The pattern works perfectly for 1-second charts, but you need to understand the event flow.

## How It Works

### For a 1-Second Chart

When you display a **1s chart**, here's what happens:

1. **Backend sends**: `1s-${symbol}-LiveBarNew` when each 1s bar **completes**
2. **Backend sends**: Sub-second updates (if available) via some high-frequency event
3. **Chart receives**: Complete 1s bars + optional tick updates

### Event Flow Example

```javascript
// In PixiChartV2 with timeframe = "1s"
const timeframe = "1s";

useEffect(() => {
    // Listen for COMPLETE 1s bars
    const liveBarNew = `1s-${symbol.value}-LiveBarNew`;
    const handleLiveBarNew = (completeBar) => {
        console.log("Complete 1s bar received", completeBar);

        // Replace temporary bar with complete 1s bar
        pixiDataRef.current.setCompleteBar(completeBar);
    };
    Socket.on(liveBarNew, handleLiveBarNew);

    // Listen for sub-second tick updates (if your backend provides them)
    const tickUpdate = `tick-${symbol.value}-Update`;  // or whatever event name
    const handleTickUpdate = (tick) => {
        // Update temporary bar within the current second
        pixiDataRef.current.newTick(tick);
    };
    Socket.on(tickUpdate, handleTickUpdate);

    return () => {
        Socket.off(liveBarNew, handleLiveBarNew);
        Socket.off(tickUpdate, handleTickUpdate);
    };
}, [symbol.value, timeframe]);
```

## Current Implementation Status

### ✅ Works Now

**PixiChartV2** already supports any timeframe dynamically:

```javascript
// In PixiChartV2.js - lines 358-395
const liveBarNew = `${timeframe}-${symbol.value}-LiveBarNew`;  // ← timeframe is dynamic!
```

So you can already set `timeframe = "1s"` and it will:
- Listen for `1s-ES-LiveBarNew` (complete 1s bars)
- Listen for `1s-ES-LiveBarUpdate` (sub-second price updates)
- Work exactly like any other timeframe

### Timeframe Options

The pattern supports **any timeframe** your backend emits:

| Timeframe | Complete Bar Event | Tick Update Event |
|-----------|-------------------|-------------------|
| `1s` | `1s-ES-LiveBarNew` | `tick-ES-Update` (if available) |
| `1m` | `1m-ES-LiveBarNew` | `1s-ES-LiveBarUpdate` |
| `5m` | `5m-ES-LiveBarNew` | `1s-ES-LiveBarUpdate` |
| `1h` | `1h-ES-LiveBarNew` | `1s-ES-LiveBarUpdate` |

## What You Need from Backend

For 1s charts to work optimally, your backend should emit:

### Required:
```javascript
// When each second completes
Socket.emit(`1s-${symbol}-LiveBarNew`, {
    open: 4550.00,
    high: 4550.25,
    low: 4549.75,
    close: 4550.00,
    volume: 150,
    datetime: 1234567890000,  // Start of the second
    symbol: "ES"
});
```

### Optional (for smoother updates):
```javascript
// On every trade/tick (multiple times per second)
Socket.emit(`tick-${symbol}-Update`, {
    lastPrice: 4550.15,
    volume: 5,
    datetime: 1234567890500,  // Mid-second timestamp
    symbol: "ES"
});
```

## Example Usage

### Setting Up a 1s Chart

```javascript
// In your chart component
const [timeframe, setTimeframe] = useState("1s");

// That's it! PixiChartV2 handles the rest
<GenericPixiChart
    ohlcDatas={ohlcData}
    timeframe={timeframe}
    symbol={symbol}
    pixiDataRef={pixiDataRef}
    Socket={Socket}
    height={500}
/>
```

### Switching Timeframes Dynamically

```javascript
<TimeFrameBtns
    timeframe={timeframe}
    setTimeframe={setTimeframe}
    options={[
        { value: "1s", label: "1s" },
        { value: "5s", label: "5s" },
        { value: "1m", label: "1m" },
        { value: "5m", label: "5m" },
    ]}
/>
```

## Performance Considerations

### 1s Charts Generate High Data Volume

- **1 minute** = 60 bars
- **1 hour** = 3,600 bars
- **1 day** = 86,400 bars (!)

### Recommendations:

1. **Limit history**: Load fewer historical bars for 1s charts
   ```javascript
   const limit = timeframe === "1s" ? 500 : 2000;
   await API.getOHLC({ symbol, timeframe, limit });
   ```

2. **Use manual Y scale**: Enable for better control
   ```javascript
   options={{ manualYScale: true }}
   ```

3. **Consider aggregation**: For longer views, aggregate to higher timeframes

## Testing Your 1s Chart

1. **Backend check**: Verify your server emits `1s-${symbol}-LiveBarNew`
   ```bash
   # In your backend logs, you should see:
   Emitting: 1s-ES-LiveBarNew
   ```

2. **Frontend check**: Listen in your chart component
   ```javascript
   useEffect(() => {
       Socket.on(`1s-${symbol.value}-LiveBarNew`, (bar) => {
           console.log("[1s Bar]", bar);
       });
   }, []);
   ```

3. **Verify bar completion**: Each bar should arrive ~1 second apart

## Summary

**YES, 1s timeframe charts work perfectly** with the new pattern! The key is:

1. Backend must emit `${timeframe}-${symbol}-LiveBarNew` for completed bars
2. Frontend `PixiChartV2` dynamically listens to the correct event
3. Pattern handles temporary bars and complete bars the same way regardless of timeframe

The beauty of this design is that **timeframe is just a string** - as long as your backend emits the right events, any timeframe works!
