# Sectors API Specification

This document defines the backend API endpoints required for the Sectors feature.

## Overview

The Sectors feature provides visualization and analysis of market sector ETFs (XLE, XLF, XLU, XLI, XLK, XLB, XLP, XLY, XLV, XLRE, XLC). It supports multiple timeframes, performance tracking, and correlation analysis.

## Sector Symbols

The following sector ETF symbols should be supported:

| Symbol | Sector Name |
|--------|-------------|
| XLE | Energy |
| XLF | Financials |
| XLU | Utilities |
| XLI | Industrials |
| XLK | Technology |
| XLB | Materials |
| XLP | Consumer Staples |
| XLY | Consumer Discretionary |
| XLV | Healthcare |
| XLRE | Real Estate |
| XLC | Communication Services |

---

## Endpoints

### 1. Get Sector Chart Data

**Endpoint:** `GET /API/sectors/data`

**Description:** Returns OHLCV (Open, High, Low, Close, Volume) data for all sector ETFs based on the specified timeframe and period.

**Query Parameters:**
- `timeframe` (string, required): The timeframe for the data
  - Allowed values: `"5m"`, `"daily"`, `"weekly"`
- `period` (string, required): The time period to fetch data for
  - Allowed values: `"1d"`, `"1w"`, `"1m"`, `"3m"`, `"6m"`, `"1y"`

**Response Format:**

```json
{
  "XLE": [
    {
      "timestamp": 1704067200000,
      "datetime": 1704067200000,
      "open": 84.25,
      "high": 85.10,
      "low": 84.05,
      "close": 84.92,
      "volume": 15234567
    },
    ...
  ],
  "XLF": [
    {
      "timestamp": 1704067200000,
      "datetime": 1704067200000,
      "open": 38.50,
      "high": 38.75,
      "low": 38.35,
      "close": 38.68,
      "volume": 42567890
    },
    ...
  ],
  ...
}
```

**Response Notes:**
- Each sector symbol should be a key in the response object
- Each sector's value should be an array of OHLCV objects
- `timestamp` and `datetime` should be Unix timestamps in milliseconds
- Data should be sorted chronologically (oldest to newest)
- The number of bars returned depends on the timeframe and period combination

**Example Request:**
```
GET /API/sectors/data?timeframe=daily&period=3m
```

**Implementation Notes:**
- For `timeframe="5m"`: Return 5-minute bars
- For `timeframe="daily"`: Return daily bars
- For `timeframe="weekly"`: Return weekly bars
- Period determines how far back to fetch data:
  - `"1d"`: 1 day of data
  - `"1w"`: 1 week of data
  - `"1m"`: 1 month of data
  - `"3m"`: 3 months of data
  - `"6m"`: 6 months of data
  - `"1y"`: 1 year of data

---

### 2. Get Sector Performance Metrics

**Endpoint:** `GET /API/sectors/performance`

**Description:** Returns performance metrics for all sectors over the specified period. Used for heat map visualization.

**Query Parameters:**
- `period` (string, required): The time period to calculate performance over
  - Allowed values: `"1d"`, `"1w"`, `"1m"`, `"3m"`, `"6m"`, `"1y"`

**Response Format:**

```json
{
  "XLE": {
    "percentChange": 5.23,
    "currentPrice": 84.92,
    "startPrice": 80.71,
    "high": 86.50,
    "low": 79.25
  },
  "XLF": {
    "percentChange": -2.15,
    "currentPrice": 38.68,
    "startPrice": 39.53,
    "high": 40.25,
    "low": 38.10
  },
  ...
}
```

**Response Fields:**
- `percentChange` (number): Percentage change from start of period to current price
  - Formula: `((currentPrice - startPrice) / startPrice) * 100`
- `currentPrice` (number): Most recent closing price
- `startPrice` (number): Closing price at the start of the period
- `high` (number): Highest price during the period
- `low` (number): Lowest price during the period

**Example Request:**
```
GET /API/sectors/performance?period=1m
```

**Implementation Notes:**
- Calculate metrics based on daily closing prices
- For `"1d"` period, use intraday data if available
- All prices should be rounded to 2 decimal places
- Percentage change should be rounded to 2 decimal places

---

### 3. Get Sector Correlation Matrix

**Endpoint:** `GET /API/sectors/correlation`

**Description:** Returns a correlation matrix showing the correlation coefficients between all sector pairs over the specified period. Used to identify which sectors move together.

**Query Parameters:**
- `timeframe` (string, required): The timeframe for correlation calculation
  - Allowed values: `"5m"`, `"daily"`, `"weekly"`
- `period` (string, required): The time period to calculate correlation over
  - Allowed values: `"1d"`, `"1w"`, `"1m"`, `"3m"`, `"6m"`, `"1y"`

**Response Format:**

```json
{
  "XLE": {
    "XLE": 1.00,
    "XLF": 0.65,
    "XLU": 0.32,
    "XLI": 0.78,
    "XLK": 0.54,
    "XLB": 0.71,
    "XLP": 0.28,
    "XLY": 0.62,
    "XLV": 0.45,
    "XLRE": 0.38,
    "XLC": 0.51
  },
  "XLF": {
    "XLE": 0.65,
    "XLF": 1.00,
    "XLU": 0.41,
    ...
  },
  ...
}
```

**Response Notes:**
- Each sector is a key in the outer object
- Each sector's value is an object with correlation values to all sectors (including itself)
- Correlation values range from -1.0 (perfect negative correlation) to 1.0 (perfect positive correlation)
- Diagonal values (sector correlated with itself) should always be 1.00
- Matrix should be symmetric (XLE→XLF correlation = XLF→XLE correlation)
- Values should be rounded to 2 decimal places

**Example Request:**
```
GET /API/sectors/correlation?timeframe=daily&period=3m
```

**Calculation Method:**
Use **Pearson correlation coefficient** on percentage returns:

1. For each sector, calculate daily returns:
   ```
   return[i] = (close[i] - close[i-1]) / close[i-1]
   ```

2. Calculate correlation between two sector return series using Pearson's formula:
   ```
   correlation(X, Y) = covariance(X, Y) / (stddev(X) * stddev(Y))
   ```

**Implementation Notes:**
- Use closing prices for return calculation
- Remove any bars where one or more sectors have missing data
- Minimum recommended data points for reliable correlation: 20 bars
- Consider caching results as correlation calculations can be computationally expensive

---

## WebSocket Events (Optional - for Real-Time Updates)

### Event: `sector-update`

**Description:** Emitted when new bar data is available for any sector (typically for 5-minute timeframe).

**Payload:**

```json
{
  "symbol": "XLE",
  "bar": {
    "timestamp": 1704067500000,
    "datetime": 1704067500000,
    "open": 84.92,
    "high": 85.15,
    "low": 84.88,
    "close": 85.10,
    "volume": 125678
  }
}
```

**Notes:**
- Only emit updates for active subscriptions
- Typically used for 5-minute timeframe real-time updates
- Client should handle updates by calling `pixiDataRef.current.setNewBar(bar)`

---

## Data Source Recommendations

### Option 1: Use Existing Stock Data Tables
If you already have stock data tables/collections:
- Query data for the 11 sector ETF symbols
- Apply the same timeframe/period logic used for individual stocks
- Aggregate data as needed for weekly timeframes

### Option 2: Dedicated Sector Data Collection
Create a separate collection/table optimized for sector data:
- Pre-calculate and store daily/weekly aggregations
- Pre-calculate correlation matrices for common period combinations
- Index on `symbol` and `timestamp` for fast queries

### Option 3: External API Integration
Use a financial data API (e.g., Alpha Vantage, IEX Cloud, Polygon.io):
- Fetch sector ETF data on-demand
- Cache results to reduce API calls
- Consider rate limits and pricing

---

## Error Handling

All endpoints should return appropriate HTTP status codes and error messages:

**400 Bad Request:**
```json
{
  "error": "Invalid timeframe. Must be one of: 5m, daily, weekly"
}
```

**404 Not Found:**
```json
{
  "error": "No data found for the specified period"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to fetch sector data",
  "details": "Database connection error"
}
```

---

## Performance Considerations

1. **Caching:**
   - Daily and weekly data changes infrequently - cache aggressively
   - 5-minute data should have shorter cache TTL (1-5 minutes)
   - Consider caching correlation matrices (expensive to calculate)

2. **Database Indexing:**
   - Index on `(symbol, timestamp)` for fast range queries
   - Consider compound indexes for common query patterns

3. **Pagination:**
   - Not strictly necessary for these endpoints given limited data volume
   - Maximum ~252 bars for 1 year of daily data per sector
   - Maximum ~52 bars for 1 year of weekly data per sector

4. **Data Volume:**
   - 1 year of 5-minute data = ~28,000 bars per sector × 11 sectors = ~308,000 bars
   - Consider limiting 5-minute queries to shorter periods (max 1 month)

---

## Testing Checklist

- [ ] All timeframe values work correctly ("5m", "daily", "weekly")
- [ ] All period values work correctly ("1d", "1w", "1m", "3m", "6m", "1y")
- [ ] Data is properly sorted chronologically
- [ ] All 11 sector symbols return data
- [ ] Correlation matrix is symmetric
- [ ] Diagonal correlation values are 1.00
- [ ] Performance metrics calculate correctly
- [ ] Error cases return appropriate status codes
- [ ] WebSocket events emit correctly (if implemented)
- [ ] Response times are acceptable (<2 seconds for most queries)

---

## Future Enhancements

Consider these features for future iterations:

1. **Relative Strength Analysis:** Compare sector performance to S&P 500
2. **Historical Comparisons:** Compare current performance to historical averages
3. **Sector Rotation Detection:** Identify shifts in sector leadership
4. **Custom Sector Baskets:** Allow users to create custom sector groupings
5. **Intraday Correlation:** Real-time correlation tracking during trading hours
6. **Sector News/Events:** Integrate news feeds for sector-moving events
