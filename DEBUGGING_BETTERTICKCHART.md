# Debugging BetterTickChart

## Issue Fixed

**Problem**: Chart was listening for wrong event name
- **Server emits**: `new-tick100-ESZ5-tickBar`
- **Chart was listening for**: `new-100-ESZ5-tickBar` ❌
- **Chart now listens for**: `new-tick100-ESZ5-tickBar` ✅

## Expected Console Output

### On Chart Mount

You should see:
```
[BetterTickChart] render {symbol: "ES", fullSymbol: "ESZ5"}
[BetterTickChart] Setting up socket listeners {fullSymbol: "ESZ5", symbol: "ES", join: 1}
[BetterTickChart] Listening for event: "new-tick100-ESZ5-tickBar"
```

### When Server Sends Bar

You should see:
```
[BetterTickChart] ✅ Event "new-tick100-ESZ5-tickBar" received {
    dataSymbol: "ES",
    expectedSymbol: "ES",
    fullSymbol: "ESZ5",
    join: 1,
    rawDataLength: 150,
    data: {open: 6050, high: 6051, low: 6049.75, close: 6050.25, ...}
}
```

### If Symbol Mismatch

If the bar's symbol doesn't match (shouldn't happen normally):
```
[BetterTickChart] ❌ Symbol mismatch - data.symbol="YM" !== symbol="ES" - ignoring
```

### When Join = 1

```
[BetterTickChart] ✅ Event received (showing complete bar details)
// No additional combining logs
```

### When Join > 1 (e.g., join = 5)

#### New Combined Bar Starting
```
[BetterTickChart] New combined bar starting {open: ..., high: ..., low: ..., close: ...}
```

#### Updating Existing Combined Bar
```
[BetterTickChart] Updating combined bar {open: ..., high: ..., low: ..., close: ...}
```

## Debugging Steps

### 1. Verify Event Name

In browser console, check what events the server is emitting:

```javascript
// Add this temporarily to see ALL socket events
const oldEmit = Socket.emit;
const oldOn = Socket.on;

Socket.on = function(event, handler) {
    if (event.includes('tick') || event.includes('ESZ5')) {
        console.log('📡 Listening for:', event);
    }
    return oldOn.apply(this, arguments);
};

// Monitor incoming events
Socket.onAny((event, ...args) => {
    if (event.includes('tick') || event.includes('ESZ5')) {
        console.log('📥 Received:', event, args[0]);
    }
});
```

### 2. Check Symbol Values

```javascript
// In BetterTickChart component, add:
console.log({
    propsSymbol: props.symbol,
    propsFullSymbol: props.fullSymbol,
    computedFullSymbol: fullSymbol,
    expectedEvent: `new-tick100-${fullSymbol}-tickBar`
});
```

### 3. Verify Server Event Format

Your server should emit:

```javascript
// Backend - when 100 ticks complete
io.emit(`new-tick100-${fullSymbol}-tickBar`, {
    symbol: "ES",        // Short symbol
    open: 6050.00,
    high: 6051.25,
    low: 6049.75,
    close: 6050.25,
    volume: 100,
    datetime: Date.now(),
    timestamp: Date.now()
});
```

**Important**: `data.symbol` should be the SHORT symbol ("ES"), not the full symbol ("ESZ5").

### 4. Check Socket Connection

```javascript
console.log('Socket connected?', Socket.connected);
console.log('Socket ID:', Socket.id);
```

## Common Issues

### Issue 1: No Events Received

**Symptoms**: No logs showing "Event received"

**Possible causes**:
1. Event name mismatch - check server vs. client event names
2. Socket not connected
3. Symbol mismatch in event name (ESZ5 vs. ES)

**Fix**:
```javascript
// Check what the server is ACTUALLY emitting
// In your server code, add:
console.log('Emitting:', `new-tick100-${fullSymbol}-tickBar`);
```

### Issue 2: Symbol Mismatch Warning

**Symptoms**: See "❌ Symbol mismatch" in console

**Possible causes**:
1. Server sending full symbol ("ESZ5") in `data.symbol` instead of short symbol ("ES")
2. Props passing wrong symbol

**Fix**: Ensure server sends:
```javascript
{
    symbol: "ES",  // NOT "ESZ5"
    ...
}
```

### Issue 3: Chart Not Updating

**Symptoms**: Events received but chart doesn't update

**Possible causes**:
1. `pixiDataRef.current` is null
2. `candleData` state not updating
3. GenericPixiChart not rendering

**Debug**:
```javascript
// In handleNew100TickBar, after the updates:
console.log('After update:', {
    rawDataLength: rawDataRef.current.length,
    candleDataLength: candleData.length,
    hasPixiRef: !!pixiDataRef.current,
    lastBar: candleData[candleData.length - 1]
});
```

### Issue 4: Join Not Working

**Symptoms**: Combined bars not showing correctly when join > 1

**Debug**:
```javascript
console.log('Join logic:', {
    join,
    totalBars: rawDataRef.current.length,
    lastCombinedStartIndex: Math.floor((rawDataRef.current.length - 1) / join) * join,
    isNewCombinedBar: rawDataRef.current.length % join === 1
});
```

## Server Event Patterns

### Tick Chart Events

| Event | When | Example |
|-------|------|---------|
| `new-tick100-${fullSymbol}-tickBar` | Every 100 ticks | `new-tick100-ESZ5-tickBar` |
| `1s-${fullSymbol}-LiveBarUpdate` | Every second | `1s-ESZ5-LiveBarUpdate` |

### Time-Based Chart Events

| Event | When | Example |
|-------|------|---------|
| `${timeframe}-${symbol}-LiveBarNew` | Bar completes | `1m-ES-LiveBarNew` |
| `1s-${symbol}-LiveBarUpdate` | Every second | `1s-ES-LiveBarUpdate` |

## Testing Checklist

- [ ] Console shows "Listening for event: new-tick100-ESZ5-tickBar"
- [ ] Console shows "✅ Event received" when bars arrive
- [ ] No symbol mismatch warnings
- [ ] `rawDataRef.current.length` increases
- [ ] `candleData.length` increases (or stays same when combining)
- [ ] Chart visually updates with new bars
- [ ] Changing join value recombines bars correctly
- [ ] 1s live updates work (temporary bar updates)

## Quick Test

Open browser console and run:

```javascript
// Force emit a test bar
Socket.emit('new-tick100-ESZ5-tickBar', {
    symbol: 'ES',
    open: 6050,
    high: 6051,
    low: 6049,
    close: 6050.5,
    volume: 100,
    datetime: Date.now(),
    timestamp: Date.now()
});
```

You should see the chart update immediately.
