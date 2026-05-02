# Interesting Stocks API

This document describes the screener endpoint used to find stocks with interesting technical or price/volume conditions.

This file should be treated as the frontend handoff document for building the screener UI.

The endpoint is intended for:

- backend testing
- frontend integration
- building saved screener presets

## Endpoint

`POST /API/interesting-stocks`

Example local URL:

`http://localhost:<port>/API/interesting-stocks`

## Frontend Handoff Summary

Frontend should build a page around a single API call:

- `POST /API/interesting-stocks`

The UI should let the user:

- choose a timeframe
- add one or more stats filters
- add one or more daily-history filters
- add one or more ticker filters
- add one or more fundamentals filters
- choose a sort field
- choose a result limit
- render the returned rows as either a table or card list

The simplest initial implementation is:

- a left filter panel
- a top bar with timeframe, sort, and limit
- a results table
- optional saved preset buttons above the table

## Current Frontend Notes

The current `/screener` page in `stock_panel` now includes:

- stats filters
- daily-history filters
- fundamentals filters
- saved presets including `Weekly Wheel v1`
- row expansion with daily and weekly charts

When the active preset is `Weekly Wheel v1`, the expanded row also shows a manual `Get Weekly Options` action.

That button calls a related backend endpoint:

- `GET /API/options/weekly-chain/:symbol?contractType=PUT|CALL|ALL&strikeCount=5`

This is intentionally a one-shot request for the screener UI.

It does not modify or replace the existing background options polling loop in `TD_service_lite/services/TD_Options.js`.

## Related Weekly Options Endpoint

This endpoint exists to support the wheel workflow from the screener page.

### Endpoint

`GET /API/options/weekly-chain/:symbol`

### Query Params

- `contractType`
  - optional
  - values: `PUT`, `CALL`, `ALL`
  - default: `ALL`
- `strikeCount`
  - optional
  - default: `5` for the screener use case

### Behavior

- the server computes the Friday expiration for the current week
- if the request happens after Friday has passed, it rolls to next Friday
- the response includes normalized `calls` and `puts` arrays
- contracts are trimmed to the nearest strikes around the underlying price

### Response Shape

```json
{
  "symbol": "PFE",
  "expDate": "2026-04-03",
  "underlyingPrice": 31.42,
  "interestRate": 0.043,
  "volatility": 0.221,
  "contractType": "PUT",
  "strikeCount": 5,
  "calls": [],
  "puts": [
    {
      "symbol": "PFE   260403P00031000",
      "strikePrice": 31,
      "bid": 0.41,
      "ask": 0.44,
      "last": 0.43,
      "mark": 0.43,
      "totalVolume": 812,
      "openInterest": 2134,
      "volatility": 0.247,
      "delta": -0.42,
      "gamma": 0.12,
      "theta": -0.08,
      "vega": 0.03,
      "daysToExpiration": 4,
      "inTheMoney": false
    }
  ],
  "options": [
    {
      "symbol": "PFE   260403P00031000",
      "strikePrice": 31,
      "bid": 0.41,
      "ask": 0.44,
      "last": 0.43,
      "mark": 0.43,
      "totalVolume": 812,
      "openInterest": 2134,
      "volatility": 0.247,
      "delta": -0.42,
      "gamma": 0.12,
      "theta": -0.08,
      "vega": 0.03,
      "daysToExpiration": 4,
      "inTheMoney": false
    }
  ]
}
```

## Suggested Frontend Build Order

1. Add a basic form that posts the request body to `/API/interesting-stocks`
2. Render `results` in a sortable table
3. Add support for multiple filter rows
4. Group metrics in the UI into `stats` and `daily`
5. Add saved presets such as `oversold`, `breakout`, and `bullish MACD`

## Purpose

This endpoint screens over the symbols already being collected by the current stock data pipeline.

It can use:

- `StockDataStatsModel` metrics for stats-based screening
- `StockData` daily bars for daily-history derived screening

It does not currently use raw `30Min` bar history inside the endpoint. `30Min` support here comes from the precomputed stats stored in `StockDataStatsModel`.

## Request Body

```json
{
  "frame": "daily",
  "filters": [
    { "metric": "pctBelowMA200", "op": "gte", "value": 20 }
  ],
  "dailyFilters": [
    { "metric": "perf3MonthPct", "op": "gte", "value": 30 }
  ],
  "tickerFilters": [
    { "metric": "hasWeeklyExpirations", "op": "eq", "value": 1 }
  ],
  "fundamentalFilters": [
    { "metric": "beta", "op": "lte", "value": 1.6 }
  ],
  "sort": {
    "beta": 1
  },
  "limit": 25,
  "symbols": ["AAPL", "MSFT"],
  "excludeSymbols": ["SPY"]
}
```

## Request Fields

### `frame`

Optional.

Typical values:

- `30Min`
- `daily`
- `weekly`

This filters the `StockDataStatsModel` documents by timeframe.

### `filters`

Optional array of stats-based filters.

These operate on metrics from `StockDataStatsModel`.

Each filter object:

```json
{
  "metric": "pctBelowMA200",
  "op": "gte",
  "value": 20
}
```

### `dailyFilters`

Optional array of daily-history filters.

These are computed from `StockData` daily bars at request time.

Each filter object uses the same shape as `filters`.

### `fundamentalFilters`

Optional array of fundamentals-based filters.

These operate on numeric fields from the joined `StockFundamentals` document.

Each filter object uses the same shape as `filters`.

### `tickerFilters`

Optional array of ticker-based filters.

These operate on numeric or boolean-as-`0/1` fields from the joined `Tickers` document.

Each filter object uses the same shape as `filters`.

### `sort`

Optional object.

Use `1` for ascending or `-1` for descending.

Example:

```json
{
  "perf3MonthPct": -1
}
```

### `limit`

Optional.

Default: `50`

Max: `500`

### `symbols`

Optional array of symbols to include.

### `excludeSymbols`

Optional array of symbols to exclude.

## Supported Operators

- `gt`
- `gte`
- `lt`
- `lte`
- `eq`
- `ne`

## Stats-Based Metrics

These come from `StockDataStatsModel`.

### Latest indicator values

- `currentClose`
- `atrMin`
- `atrMax`
- `MA5`
- `MA20`
- `MA50`
- `MA100`
- `MA200`
- `ma5`
- `ma20`
- `ma50`
- `ma100`
- `ma200`
- `MFI`
- `mfi`
- `RSI5`
- `RSI20`
- `RSI50`
- `RSI100`
- `RSI200`
- `rsi5`
- `rsi20`
- `rsi50`
- `rsi100`
- `rsi200`
- `ROC2`
- `ROC5`
- `ROC10`
- `ROC20`
- `roc2`
- `roc5`
- `roc10`
- `roc20`
- `currentAtr`
- `MACDLine`
- `MACDSignal`
- `MACDHist`
- `macdLine`
- `macdSignal`
- `macdHist`
- `BBUpper`
- `BBMiddle`
- `BBLower`
- `BBWidth`
- `bbUpper`
- `bbMiddle`
- `bbLower`
- `bbWidth`

### Stats-based scalar flags

- `macdBullCross`
- `macdBearCross`
- `bbWidthPercentile`
- `bbWidthTop10Pct`
- `touchingUpperBand`
- `touchingLowerBand`
- `aboveUpperBand`
- `belowLowerBand`
- `priceAboveMA200`
- `priceBelowMA200`
- `priceCrossedAboveMA200`
- `priceCrossedBelowMA200`
- `ma20AboveMA200`
- `ma20BelowMA200`
- `ma20CrossedAboveMA200`
- `ma20CrossedBelowMA200`
- `rsi5Overbought`
- `rsi5Oversold`
- `rsi20Overbought`
- `rsi20Oversold`

### Derived moving-average distance metrics

- `pctFromMA5`
- `pctFromMA20`
- `pctFromMA50`
- `pctFromMA100`
- `pctFromMA200`
- `pctBelowMA5`
- `pctBelowMA20`
- `pctBelowMA50`
- `pctBelowMA100`
- `pctBelowMA200`
- `pctAboveMA5`
- `pctAboveMA20`
- `pctAboveMA50`
- `pctAboveMA100`
- `pctAboveMA200`

## Daily-History Metrics

These are computed from `StockData` daily bars when `dailyFilters` are used or when sorting by one of these fields.

- `perf1MonthPct`
- `perf3MonthPct`
- `avgVolume10`
- `avgVolumePrev10`
- `avgVolume10ChangePct`
- `gapFromPrevClosePct`
- `high52Week`
- `low52Week`
- `allTimeHigh`
- `allTimeLow`
- `pctFrom52WeekHigh`
- `pctBelow52WeekHigh`
- `pctFrom52WeekLow`
- `pctAbove52WeekLow`
- `is52WeekHighBreakout`
- `is52WeekLowBreakout`
- `pctFromAllTimeHigh`
- `pctBelowAllTimeHigh`
- `pctFromAllTimeLow`
- `pctAboveAllTimeLow`

## Fundamental Metrics

These come from the joined `StockFundamentals` document.

- `closePrice`
- `high52`
- `low52`
- `marketCap`
- `marketCapFloat`
- `avg10DaysVolume`
- `avg1DayVolume`
- `avg3MonthVolume`
- `beta`
- `shortIntToFloat`
- `shortIntDayToCover`
- `peRatio`
- `pegRatio`
- `pbRatio`
- `prRatio`
- `pcfRatio`
- `grossMarginTTM`
- `netProfitMarginTTM`
- `operatingMarginTTM`
- `returnOnEquity`
- `returnOnAssets`
- `returnOnInvestment`
- `quickRatio`
- `currentRatio`
- `interestCoverage`
- `totalDebtToCapital`
- `ltDebtToEquity`
- `totalDebtToEquity`
- `epsTTM`
- `epsChangePercentTTM`
- `epsChangeYear`
- `epsChange`
- `revChangeYear`
- `revChangeTTM`
- `revChangeIn`
- `sharesOutstanding`
- `bookValuePerShare`
- `dividendAmount`
- `dividendYield`

## Ticker Metrics

These come from the joined `Tickers` document.

- `52WkHigh`
- `52WkLow`
- `closePrice`
- `hasWeeklyExpirations`

## Aroon Notes

`aroonStats` is currently returned as a summary object, not as a simple bullish/bearish flag.

The intent of this object is to capture pattern over time rather than only the latest raw Aroon reading.

Why this exists:

- `Aroon Up` and `Aroon Down` are separate lines
- those lines rotate around each other over time
- a single snapshot can miss whether the stock is trending, reversing, or chopping
- the current summary tries to preserve recent behavior across multiple Aroon periods

Current implementation:

- Aroon is calculated for periods `5`, `10`, and `20`
- for each period, the pipeline checks recent windows of `5`, `10`, and `20`
- for each window it tracks how often the line was above `50`
- for each window it tracks how often the line was below `50`
- it also creates a ratio value from `-1` to `1`

Conceptually:

- values near `1` suggest that line spent most of the recent window above `50`
- values near `-1` suggest that line spent most of the recent window below `50`
- values near `0` suggest a mixed or transitional state

Intended interpretation ideas:

- bullish trend:
  - `Aroon Up` stays above `50` often
  - `Aroon Down` stays below `50` often
- bearish trend:
  - `Aroon Down` stays above `50` often
  - `Aroon Up` stays below `50` often
- flat / mixed:
  - both lines spend time on both sides of `50`
  - ratios are closer to `0`

Why this may be useful on the frontend:

- you can render the current `aroonStats` object to look for repeatable patterns
- this may help identify visually meaningful trend-state combinations before we hard-code simplified flags
- it gives a way to experiment with multi-period Aroon behavior without changing the backend first

Suggested frontend display ideas:

- show one compact Aroon card in the row detail panel
- group by Aroon period: `5`, `10`, `20`
- within each period, show:
  - recent `up` values
  - recent `down` values
  - ratio values for recent windows
- use color:
  - green for bullish bias
  - red for bearish bias
  - neutral gray for mixed states
- consider a small heatmap where:
  - rows are Aroon periods
  - columns are lookback windows
  - cell color is driven by the ratio value

Example exploratory questions for frontend review:

- do strong uptrends show persistent positive `Aroon Up` dominance across `5`, `10`, and `20`?
- do weak or choppy names show ratio clustering near `0`?
- do reversals show shorter-period Aroon flipping before longer-period Aroon?
- does the shape of the matrix reveal cleaner states than raw price action alone?

Important:

- `aroonStats` is currently best treated as exploratory visualization data
- it is not yet normalized into simple screener flags
- once useful visual patterns are confirmed, those patterns should be converted into pipeline flags for easier querying

## Response Shape

```json
{
  "meta": {
    "frame": "daily",
    "limit": 25,
    "count": 2,
    "filters": [
      { "metric": "pctBelowMA200", "op": "gte", "value": 20 }
    ],
    "dailyFilters": [
      { "metric": "perf3MonthPct", "op": "gte", "value": 30 }
    ],
    "fundamentalFilters": [
      { "metric": "beta", "op": "lte", "value": 1.6 }
    ],
    "sort": {
      "beta": 1,
      "symbol": 1
    },
    "includeDailyMetrics": true,
    "includeTickerData": true,
    "includeFundamentalsData": true
  },
  "results": [
    {
      "_id": "69099d3afd07a4c2ca14461c",
      "symbol": "AMPX",
      "frame": "daily",
      "dayDate": "3/26/2026",
      "updatedAt": "2026-03-27T05:28:43.755Z",
      "createdAt": "2025-11-04T06:29:14.667Z",
      "currentClose": 17.0896,
      "priceLevels": {},
      "stochasticStats": {},
      "aroonStats": {},
      "metrics": {
        "currentClose": 17.0896,
        "MA20": 18.21,
        "MA50": 19.48,
        "MA200": 21.73,
        "RSI200": 81.3,
        "pctBelowMA200": 21.35,
        "MACDLine": 0.42,
        "MACDSignal": 0.31,
        "MACDHist": 0.11,
        "macdBullCross": 1,
        "BBUpper": 17.45,
        "BBLower": 15.92,
        "BBWidth": 9.18,
        "bbWidthPercentile": 94.2,
        "touchingUpperBand": 0,
        "priceCrossedAboveMA200": 1,
        "ma20AboveMA200": 1,
        "rsi20Overbought": 1
      },
      "dailyMetrics": {
        "perf1MonthPct": 12.8,
        "perf3MonthPct": 34.1,
        "avgVolume10ChangePct": 28.4,
        "gapFromPrevClosePct": 3.2,
        "pctBelow52WeekHigh": 4.7
      },
      "ticker": {
        "symbol": "AMPX",
        "name": "Amprius Technologies, Inc.",
        "description": "Battery technology company",
        "exchange": "NYSE",
        "sector": "Industrials",
        "industry": "Electrical Equipment",
        "assetType": "EQUITY",
        "closePrice": 17.08
      },
      "fundamentals": {
        "symbol": "AMPX",
        "marketCap": 1450000000,
        "marketCapFloat": 1220000000,
        "avg10DaysVolume": 6800000,
        "avg3MonthVolume": 5900000,
        "high52": 17.93,
        "low52": 2.31,
        "beta": 1.85,
        "shortIntToFloat": 12.6
      }
    }
  ]
}
```

## Frontend Contract

Each result row has three levels of data:

- root fields
  - `symbol`
  - `frame`
  - `dayDate`
  - `updatedAt`
  - `currentClose`
- `metrics`
  - precomputed technical/statistical values from `StockDataStatsModel`
- `dailyMetrics`
  - values derived from daily `StockData`
- `ticker`
  - reference/company metadata from `Tickers`
- `fundamentals`
  - fundamentals and liquidity data from `StockFundamentals`

Frontend should not assume every field exists.

Important:

- missing metrics should be displayed as blank or `--`
- missing metrics should not be displayed as `0`
- boolean flags are returned as `1` or `0`
- percent fields are numeric percentages, not decimal fractions
- `ticker` may be `null`
- `fundamentals` may be `null`

## Joined Reference Data

Each screener row now includes joined data from:

- `Tickers` collection as `result.ticker`
- `StockFundamentals` collection as `result.fundamentals`

### `ticker` object

Current schema fields include:

- `symbol`
- `name`
- `description`
- `exchange`
- `sector`
- `industry`
- `ipoYear`
- `assetType`
- `closePrice`
- `cusip`
- `cik`
- `52WkHigh`
- `52WkLow`
- `filerStatus`
- `fiscalYearEnd`
- `next10QExpectedDate`
- `next10KExpectedDate`
- `lastProcessedFilingDate`
- `lastProcessedFilingGuid`
- `updatedAt`

Most useful frontend display fields from `ticker`:

- `name`
- `description`
- `exchange`
- `sector`
- `industry`
- `assetType`
- `closePrice`

### `fundamentals` object

Current schema fields include:

- `symbol`
- `high52`
- `low52`
- `marketCap`
- `marketCapFloat`
- `avg10DaysVolume`
- `avg1DayVolume`
- `avg3MonthVolume`
- `beta`
- `shortIntToFloat`
- `shortIntDayToCover`
- `peRatio`
- `pegRatio`
- `pbRatio`
- `prRatio`
- `pcfRatio`
- `grossMarginTTM`
- `netProfitMarginTTM`
- `operatingMarginTTM`
- `returnOnEquity`
- `returnOnAssets`
- `returnOnInvestment`
- `quickRatio`
- `currentRatio`
- `interestCoverage`
- `totalDebtToCapital`
- `ltDebtToEquity`
- `totalDebtToEquity`
- `epsTTM`
- `epsChangePercentTTM`
- `epsChangeYear`
- `epsChange`
- `revChangeYear`
- `revChangeTTM`
- `revChangeIn`
- `sharesOutstanding`
- `bookValuePerShare`
- `dividendAmount`
- `dividendYield`
- `dividendDate`
- `dividendPayAmount`
- `dividendPayDate`
- `nextDividendPayDate`
- `nextDividendDate`
- `updatedAt`

Most useful frontend display fields from `fundamentals`:

- `marketCap`
- `marketCapFloat`
- `avg10DaysVolume`
- `avg3MonthVolume`
- `high52`
- `low52`
- `beta`
- `shortIntToFloat`
- `shortIntDayToCover`
- `peRatio`
- `dividendYield`

## Recommended Display Patterns

### Basic Table

Recommended default columns:

- `symbol`
- `currentClose`
- `pctBelowMA200`
- `RSI20`
- `MACDHist`
- `bbWidthPercentile`
- `perf1MonthPct`
- `perf3MonthPct`
- `avgVolume10ChangePct`
- `pctBelow52WeekHigh`
- `ticker.exchange`
- `ticker.sector`
- `fundamentals.marketCap`
- `fundamentals.avg10DaysVolume`

### Flags / Badges

These fields work well as small badges:

- `macdBullCross`
- `macdBearCross`
- `touchingUpperBand`
- `touchingLowerBand`
- `priceCrossedAboveMA200`
- `priceCrossedBelowMA200`
- `ma20CrossedAboveMA200`
- `ma20CrossedBelowMA200`
- `rsi5Oversold`
- `rsi20Oversold`
- `rsi5Overbought`
- `rsi20Overbought`

Recommended badge labels:

- `MACD Bull`
- `MACD Bear`
- `Upper Band`
- `Lower Band`
- `Price > 200`
- `Price < 200`
- `20 > 200`
- `20 < 200`
- `RSI Oversold`
- `RSI Overbought`

### Detail Drawer / Row Expansion

For a clicked symbol, show a small details panel with:

- symbol
- company name
- exchange
- sector / industry
- timeframe
- updated time
- current close
- MA20 / MA50 / MA200
- RSI20 / RSI50 / RSI200
- MACDLine / MACDSignal / MACDHist
- BBUpper / BBLower / BBWidth / bbWidthPercentile
- perf1MonthPct / perf3MonthPct
- avgVolume10 / avgVolume10ChangePct
- high52Week / low52Week
- marketCap / avg10DaysVolume / beta / short interest

## Suggested UI Grouping

### Group 1: Trend

- `pctFromMA20`
- `pctFromMA50`
- `pctFromMA200`
- `priceAboveMA200`
- `priceBelowMA200`
- `priceCrossedAboveMA200`
- `priceCrossedBelowMA200`
- `ma20AboveMA200`
- `ma20BelowMA200`
- `ma20CrossedAboveMA200`
- `ma20CrossedBelowMA200`

### Group 2: Momentum

- `RSI5`
- `RSI20`
- `RSI50`
- `RSI100`
- `RSI200`
- `rsi5Overbought`
- `rsi5Oversold`
- `rsi20Overbought`
- `rsi20Oversold`
- `ROC2`
- `ROC5`
- `ROC10`
- `ROC20`
- `MACDLine`
- `MACDSignal`
- `MACDHist`
- `macdBullCross`
- `macdBearCross`

### Group 3: Volatility

- `currentAtr`
- `atrMin`
- `atrMax`
- `BBUpper`
- `BBMiddle`
- `BBLower`
- `BBWidth`
- `bbWidthPercentile`
- `bbWidthTop10Pct`
- `touchingUpperBand`
- `touchingLowerBand`
- `aboveUpperBand`
- `belowLowerBand`

### Group 4: Price / Volume History

- `perf1MonthPct`
- `perf3MonthPct`
- `avgVolume10`
- `avgVolumePrev10`
- `avgVolume10ChangePct`
- `gapFromPrevClosePct`
- `high52Week`
- `low52Week`
- `pctBelow52WeekHigh`
- `pctAbove52WeekLow`
- `is52WeekHighBreakout`
- `is52WeekLowBreakout`
- `allTimeHigh`
- `allTimeLow`
- `pctBelowAllTimeHigh`
- `pctAboveAllTimeLow`

## Frontend Notes

The frontend should treat the response as:

- `meta`: request summary
- `results`: screener rows
- `results[].metrics`: stats-based values
- `results[].dailyMetrics`: daily-history derived values

Recommended frontend behavior:

- allow the user to choose a `frame`
- build a list of filter rows using `metric`, `op`, and `value`
- separate stats filters from daily filters in the UI
- support sorting by one metric at a time first
- show missing values as blank, not zero
- allow users to save request bodies as presets
- treat `1`/`0` flag fields as booleans in the UI
- format percentage fields with `%`
- format `updatedAt` in local time

## Frontend Request Examples

### Minimal request

```json
{
  "frame": "daily",
  "limit": 25
}
```

### Stats-only request

```json
{
  "frame": "30Min",
  "filters": [
    { "metric": "pctBelowMA200", "op": "gte", "value": 20 },
    { "metric": "rsi20Oversold", "op": "eq", "value": 1 }
  ],
  "sort": {
    "pctBelowMA200": -1
  },
  "limit": 25
}
```

### Mixed stats + daily request

```json
{
  "frame": "daily",
  "filters": [
    { "metric": "macdBullCross", "op": "eq", "value": 1 }
  ],
  "dailyFilters": [
    { "metric": "perf3MonthPct", "op": "gte", "value": 20 }
  ],
  "sort": {
    "perf3MonthPct": -1
  },
  "limit": 50
}
```

## Suggested Presets For Frontend

### Oversold Bounce

```json
{
  "frame": "daily",
  "filters": [
    { "metric": "rsi20Oversold", "op": "eq", "value": 1 },
    { "metric": "pctBelowMA200", "op": "gte", "value": 10 }
  ],
  "sort": {
    "pctBelowMA200": -1
  },
  "limit": 50
}
```

### Bullish MACD

```json
{
  "frame": "daily",
  "filters": [
    { "metric": "macdBullCross", "op": "eq", "value": 1 }
  ],
  "sort": {
    "MACDHist": -1
  },
  "limit": 50
}
```

### Volatility Expansion

```json
{
  "frame": "daily",
  "filters": [
    { "metric": "bbWidthTop10Pct", "op": "eq", "value": 1 }
  ],
  "sort": {
    "bbWidthPercentile": -1
  },
  "limit": 50
}
```

### Near 52-Week High

```json
{
  "frame": "daily",
  "dailyFilters": [
    { "metric": "pctBelow52WeekHigh", "op": "lte", "value": 5 }
  ],
  "sort": {
    "pctBelow52WeekHigh": 1
  },
  "limit": 50
}
```

## Frontend Edge Cases

- Some long-lookback weekly values may be missing because there is not enough weekly history
- `dailyMetrics` may be absent or empty when not requested/needed
- some symbols will have incomplete data for longer lookback indicators
- sorting by a field with many missing values will naturally push missing rows lower
- filter rows with missing values will exclude those symbols

## Example Queries

### 1. Oversold relative to MA200 on 30-minute stats

```json
{
  "frame": "30Min",
  "filters": [
    { "metric": "pctBelowMA200", "op": "gte", "value": 20 },
    { "metric": "RSI200", "op": "lte", "value": 30 }
  ],
  "sort": {
    "pctBelowMA200": -1
  },
  "limit": 25
}
```

### 2. Overbought names on daily stats

```json
{
  "frame": "daily",
  "filters": [
    { "metric": "RSI200", "op": "gte", "value": 70 },
    { "metric": "pctAboveMA50", "op": "gte", "value": 10 }
  ],
  "sort": {
    "RSI200": -1
  },
  "limit": 25
}
```

### 3. Strong 3-month momentum

```json
{
  "frame": "daily",
  "dailyFilters": [
    { "metric": "perf3MonthPct", "op": "gte", "value": 30 }
  ],
  "sort": {
    "perf3MonthPct": -1
  },
  "limit": 50
}
```

### 4. Volume expansion over the last 10 days

```json
{
  "frame": "daily",
  "dailyFilters": [
    { "metric": "avgVolume10ChangePct", "op": "gte", "value": 25 }
  ],
  "sort": {
    "avgVolume10ChangePct": -1
  },
  "limit": 50
}
```

### 5. Near 52-week high

```json
{
  "frame": "daily",
  "dailyFilters": [
    { "metric": "pctBelow52WeekHigh", "op": "lte", "value": 5 }
  ],
  "sort": {
    "pctBelow52WeekHigh": 1
  },
  "limit": 50
}
```

### 6. Fresh 52-week high breakout

```json
{
  "frame": "daily",
  "dailyFilters": [
    { "metric": "is52WeekHighBreakout", "op": "eq", "value": 1 }
  ],
  "sort": {
    "perf1MonthPct": -1
  },
  "limit": 50
}
```

### 7. Gap-up names with strong recent performance

```json
{
  "frame": "daily",
  "dailyFilters": [
    { "metric": "gapFromPrevClosePct", "op": "gte", "value": 3 },
    { "metric": "perf1MonthPct", "op": "gte", "value": 10 }
  ],
  "sort": {
    "gapFromPrevClosePct": -1
  },
  "limit": 50
}
```

### 8. Mixed query: deeply below MA200 but improving

```json
{
  "frame": "daily",
  "filters": [
    { "metric": "pctBelowMA200", "op": "gte", "value": 20 }
  ],
  "dailyFilters": [
    { "metric": "perf1MonthPct", "op": "gte", "value": 10 }
  ],
  "sort": {
    "perf1MonthPct": -1
  },
  "limit": 50
}
```

### 9. Fresh MACD bull cross

```json
{
  "frame": "daily",
  "filters": [
    { "metric": "macdBullCross", "op": "eq", "value": 1 }
  ],
  "sort": {
    "MACDHist": -1
  },
  "limit": 50
}
```

### 10. Wide Bollinger bands near the upper band

```json
{
  "frame": "daily",
  "filters": [
    { "metric": "bbWidthPercentile", "op": "gte", "value": 90 },
    { "metric": "touchingUpperBand", "op": "eq", "value": 1 }
  ],
  "sort": {
    "bbWidthPercentile": -1
  },
  "limit": 50
}
```

### 11. Fresh price cross above MA200

```json
{
  "frame": "daily",
  "filters": [
    { "metric": "priceCrossedAboveMA200", "op": "eq", "value": 1 }
  ],
  "sort": {
    "pctAboveMA200": -1
  },
  "limit": 50
}
```

### 12. MA20 crossed above MA200

```json
{
  "frame": "daily",
  "filters": [
    { "metric": "ma20CrossedAboveMA200", "op": "eq", "value": 1 }
  ],
  "sort": {
    "pctAboveMA20": -1
  },
  "limit": 50
}
```

### 13. RSI oversold screen

```json
{
  "frame": "daily",
  "filters": [
    { "metric": "rsi20Oversold", "op": "eq", "value": 1 }
  ],
  "sort": {
    "RSI20": 1
  },
  "limit": 50
}
```

## cURL Example

```bash
curl -X POST http://localhost:<port>/API/interesting-stocks \
  -H "Content-Type: application/json" \
  -d '{
    "frame": "daily",
    "dailyFilters": [
      { "metric": "perf3MonthPct", "op": "gte", "value": 30 }
    ],
    "sort": {
      "perf3MonthPct": -1
    },
    "limit": 25
  }'
```

## Current Limits

- `30Min` support is stats-based only
- raw intraday event screening is not part of this endpoint
- the endpoint screens the collected symbol universe, not the entire market

## TODO

- add cleaner Aroon pattern detection flags to the stats pipeline
- derive query-friendly fields such as:
  - `aroonTrendUp`
  - `aroonTrendDown`
  - `aroonFlat`
  - `aroonMixed`
  - optional `aroonStrength`
- keep the existing `aroonStats` summary object, but add a simpler interpretation layer for screener queries
