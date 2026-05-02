import React, { useState, useCallback, useMemo } from "react";
import API from "../API";
import styled from "styled-components";
import StockPriceChart from "../charts/StockPriceChart";

// --- Presets -----------------------------------------------------------

const PRESETS = [
    {
        name: "Weekly Wheel v1",
        body: {
            frame: "daily",
            tickerFilters: [{ metric: "hasWeeklyExpirations", op: "eq", value: true }],
            filters: [
                { metric: "RSI20", op: "gte", value: 30 },
                { metric: "RSI20", op: "lte", value: 40 },
                { metric: "pctFromMA200", op: "gte", value: -3 },
                { metric: "pctFromMA200", op: "lte", value: 8 },
            ],
            dailyFilters: [
                { metric: "is52WeekLowBreakout", op: "eq", value: 0 },
                { metric: "pctAbove52WeekLow", op: "gte", value: 10 },
            ],
            fundamentalFilters: [
                { metric: "marketCap", op: "gte", value: 2000000000 },
                { metric: "avg10DaysVolume", op: "gte", value: 2000000 },
                { metric: "beta", op: "lte", value: 1.6 },
                { metric: "dividendYield", op: "gte", value: 2 },
            ],
            sort: { beta: 1 },
            limit: 75,
        },
    },
    {
        name: "Oversold Bounce",
        body: {
            frame: "daily",
            filters: [
                { metric: "rsi20Oversold", op: "eq", value: 1 },
                { metric: "pctBelowMA200", op: "gte", value: 10 },
            ],
            sort: { pctBelowMA200: -1 },
            limit: 50,
        },
    },
    {
        name: "Bullish MACD",
        body: {
            frame: "daily",
            filters: [{ metric: "macdBullCross", op: "eq", value: 1 }],
            sort: { MACDHist: -1 },
            limit: 50,
        },
    },
    {
        name: "Volatility Expansion",
        body: {
            frame: "daily",
            filters: [{ metric: "bbWidthTop10Pct", op: "eq", value: 1 }],
            sort: { bbWidthPercentile: -1 },
            limit: 50,
        },
    },
    {
        name: "Near 52-Week High",
        body: {
            frame: "daily",
            dailyFilters: [{ metric: "pctBelow52WeekHigh", op: "lte", value: 5 }],
            sort: { pctBelow52WeekHigh: 1 },
            limit: 50,
        },
    },
    {
        name: "52W High Breakout",
        body: {
            frame: "daily",
            dailyFilters: [{ metric: "is52WeekHighBreakout", op: "eq", value: 1 }],
            sort: { perf1MonthPct: -1 },
            limit: 50,
        },
    },
    {
        name: "Strong Momentum",
        body: {
            frame: "daily",
            dailyFilters: [{ metric: "perf3MonthPct", op: "gte", value: 30 }],
            sort: { perf3MonthPct: -1 },
            limit: 50,
        },
    },
    {
        name: "Volume Expansion",
        body: {
            frame: "daily",
            dailyFilters: [{ metric: "avgVolume10ChangePct", op: "gte", value: 25 }],
            sort: { avgVolume10ChangePct: -1 },
            limit: 50,
        },
    },
    {
        name: "Price > MA200",
        body: {
            frame: "daily",
            filters: [{ metric: "priceCrossedAboveMA200", op: "eq", value: 1 }],
            sort: { pctAboveMA200: -1 },
            limit: 50,
        },
    },
    {
        name: "RSI Oversold",
        body: {
            frame: "daily",
            filters: [{ metric: "rsi20Oversold", op: "eq", value: 1 }],
            sort: { RSI20: 1 },
            limit: 50,
        },
    },
    {
        name: "Gap Up + Perf",
        body: {
            frame: "daily",
            dailyFilters: [
                { metric: "gapFromPrevClosePct", op: "gte", value: 3 },
                { metric: "perf1MonthPct", op: "gte", value: 10 },
            ],
            sort: { gapFromPrevClosePct: -1 },
            limit: 50,
        },
    },
];

function getPresetMode(presetName) {
    if (presetName === "Weekly Wheel v1") return "wheel";
    return null;
}

function keepPresetSelectedOnEdit(presetName) {
    return presetName === "Weekly Wheel v1" ? presetName : null;
}

// --- Metric options grouped -------------------------------------------

const STATS_METRICS = [
    {
        group: "Trend",
        metrics: [
            "pctFromMA20",
            "pctFromMA50",
            "pctFromMA200",
            "pctBelowMA200",
            "pctAboveMA200",
            "priceAboveMA200",
            "priceBelowMA200",
            "priceCrossedAboveMA200",
            "priceCrossedBelowMA200",
            "ma20AboveMA200",
            "ma20BelowMA200",
            "ma20CrossedAboveMA200",
            "ma20CrossedBelowMA200",
        ],
    },
    {
        group: "Momentum",
        metrics: [
            "RSI5",
            "RSI20",
            "RSI50",
            "RSI100",
            "RSI200",
            "rsi5Overbought",
            "rsi5Oversold",
            "rsi20Overbought",
            "rsi20Oversold",
            "ROC2",
            "ROC5",
            "ROC10",
            "ROC20",
            "MACDLine",
            "MACDSignal",
            "MACDHist",
            "macdBullCross",
            "macdBearCross",
        ],
    },
    {
        group: "Volatility",
        metrics: [
            "currentAtr",
            "atrMin",
            "atrMax",
            "BBUpper",
            "BBMiddle",
            "BBLower",
            "BBWidth",
            "bbWidthPercentile",
            "bbWidthTop10Pct",
            "touchingUpperBand",
            "touchingLowerBand",
            "aboveUpperBand",
            "belowLowerBand",
        ],
    },
    { group: "Price", metrics: ["currentClose", "MA5", "MA20", "MA50", "MA100", "MA200", "MFI"] },
];

const DAILY_METRICS = [
    { group: "Performance", metrics: ["perf1MonthPct", "perf3MonthPct"] },
    { group: "Volume", metrics: ["avgVolume10", "avgVolumePrev10", "avgVolume10ChangePct"] },
    {
        group: "Levels",
        metrics: [
            "gapFromPrevClosePct",
            "high52Week",
            "low52Week",
            "pctBelow52WeekHigh",
            "pctAbove52WeekLow",
            "is52WeekHighBreakout",
            "is52WeekLowBreakout",
            "allTimeHigh",
            "allTimeLow",
            "pctBelowAllTimeHigh",
            "pctAboveAllTimeLow",
        ],
    },
];

const TICKER_METRICS = [
    {
        group: "Option Availability",
        metrics: ["hasWeeklyExpirations"],
    },
];

const BOOLEAN_METRICS = new Set(["hasWeeklyExpirations"]);

const FUNDAMENTAL_METRICS = [
    {
        group: "Size & Liquidity",
        metrics: ["marketCap", "marketCapFloat", "avg10DaysVolume", "avg1DayVolume", "avg3MonthVolume", "sharesOutstanding"],
    },
    {
        group: "Risk & Income",
        metrics: ["beta", "shortIntToFloat", "shortIntDayToCover", "dividendAmount", "dividendYield"],
    },
    {
        group: "Valuation & Quality",
        metrics: [
            "peRatio",
            "pegRatio",
            "pbRatio",
            "prRatio",
            "pcfRatio",
            "grossMarginTTM",
            "netProfitMarginTTM",
            "operatingMarginTTM",
            "returnOnEquity",
            "returnOnAssets",
            "returnOnInvestment",
            "quickRatio",
            "currentRatio",
            "interestCoverage",
            "totalDebtToCapital",
            "ltDebtToEquity",
            "totalDebtToEquity",
        ],
    },
    {
        group: "Growth",
        metrics: ["epsTTM", "epsChangePercentTTM", "epsChangeYear", "epsChange", "revChangeYear", "revChangeTTM", "revChangeIn"],
    },
];

const OPS = ["gt", "gte", "lt", "lte", "eq", "ne"];
const OP_LABELS = { gt: ">", gte: ">=", lt: "<", lte: "<=", eq: "=", ne: "!=" };
const FRAMES = ["daily", "30Min", "weekly"];

// --- Badge config ------------------------------------------------------

const FLAG_BADGES = {
    macdBullCross: { label: "MACD Bull", color: "#22c55e" },
    macdBearCross: { label: "MACD Bear", color: "#ef4444" },
    touchingUpperBand: { label: "Upper Band", color: "#f59e0b" },
    touchingLowerBand: { label: "Lower Band", color: "#3b82f6" },
    priceCrossedAboveMA200: { label: "Price > 200", color: "#22c55e" },
    priceCrossedBelowMA200: { label: "Price < 200", color: "#ef4444" },
    ma20CrossedAboveMA200: { label: "20 > 200", color: "#22c55e" },
    ma20CrossedBelowMA200: { label: "20 < 200", color: "#ef4444" },
    rsi5Oversold: { label: "RSI5 Oversold", color: "#3b82f6" },
    rsi20Oversold: { label: "RSI20 Oversold", color: "#3b82f6" },
    rsi5Overbought: { label: "RSI5 Overbought", color: "#ef4444" },
    rsi20Overbought: { label: "RSI20 Overbought", color: "#ef4444" },
    is52WeekHighBreakout: { label: "52W High!", color: "#22c55e" },
    is52WeekLowBreakout: { label: "52W Low!", color: "#ef4444" },
    bbWidthTop10Pct: { label: "BB Wide", color: "#f59e0b" },
    priceAboveMA200: { label: "Above 200", color: "#22c55e" },
    priceBelowMA200: { label: "Below 200", color: "#ef4444" },
};

// --- Default table columns ---------------------------------------------

const DEFAULT_COLUMNS = [
    { key: "symbol", label: "Symbol", root: true },
    { key: "name", label: "Name", src: "ticker", fmt: "str" },
    { key: "currentClose", label: "Close", root: true, fmt: "price" },
    { key: "sector", label: "Sector", src: "ticker", fmt: "str" },
    { key: "industry", label: "Industry", src: "ticker", fmt: "str" },
    { key: "marketCap", label: "Mkt Cap", src: "fundamentals", fmt: "bignum" },
    { key: "beta", label: "Beta", src: "fundamentals", fmt: "num" },
    { key: "dividendYield", label: "Div Yld", src: "fundamentals", fmt: "pct" },
    { key: "pctBelowMA200", label: "% < MA200", src: "metrics", fmt: "pct" },
    { key: "RSI20", label: "RSI20", src: "metrics", fmt: "num" },
    { key: "MACDHist", label: "MACD Hist", src: "metrics", fmt: "num" },
    { key: "bbWidthPercentile", label: "BB %ile", src: "metrics", fmt: "num" },
    { key: "perf1MonthPct", label: "1M Perf", src: "dailyMetrics", fmt: "pct" },
    { key: "perf3MonthPct", label: "3M Perf", src: "dailyMetrics", fmt: "pct" },
    { key: "avgVolume10ChangePct", label: "Vol Chg%", src: "dailyMetrics", fmt: "pct" },
    { key: "pctBelow52WeekHigh", label: "% < 52W H", src: "dailyMetrics", fmt: "pct" },
    { key: "avg10DaysVolume", label: "Avg Vol", src: "fundamentals", fmt: "bignum" },
];

// --- Helpers -----------------------------------------------------------

function fmtBigNum(val) {
    if (val >= 1e12) return `$${(val / 1e12).toFixed(1)}T`;
    if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
    if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
    if (val >= 1e3) return `${(val / 1e3).toFixed(1)}K`;
    return String(val);
}

function fmtVal(val, fmt) {
    if (val === undefined || val === null) return "--";
    if (fmt === "pct") return `${Number(val).toFixed(1)}%`;
    if (fmt === "price") return `$${Number(val).toFixed(2)}`;
    if (fmt === "num") return Number(val).toFixed(2);
    if (fmt === "bignum") return fmtBigNum(Number(val));
    if (fmt === "str") return String(val);
    return String(val);
}

function fmtOptionNumber(val, digits = 2) {
    if (val === undefined || val === null || Number.isNaN(Number(val))) return "--";
    return Number(val).toFixed(digits);
}

function fmtOptionPrice(val) {
    if (val === undefined || val === null || Number.isNaN(Number(val))) return "--";
    return `$${Number(val).toFixed(2)}`;
}

function getBidAskSpreadPct(contract) {
    const bid = Number(contract?.bid);
    const ask = Number(contract?.ask);
    const mid = (bid + ask) / 2;

    if (!Number.isFinite(bid) || !Number.isFinite(ask) || !Number.isFinite(mid) || mid <= 0) return null;
    return ((ask - bid) / mid) * 100;
}

function getVal(row, col) {
    if (col.root) return row[col.key];
    if (col.src === "metrics") return row.metrics?.[col.key];
    if (col.src === "dailyMetrics") return row.dailyMetrics?.[col.key];
    if (col.src === "ticker") return row.ticker?.[col.key];
    if (col.src === "fundamentals") return row.fundamentals?.[col.key];
    return undefined;
}

// --- Empty filter row --------------------------------------------------

const emptyFilter = () => ({ metric: "", op: "gte", value: "" });

// =======================================================================
// Component
// =======================================================================

export default function InterestingStocks() {
    // Request state
    const [frame, setFrame] = useState("daily");
    const [filters, setFilters] = useState([]);
    const [dailyFilters, setDailyFilters] = useState([]);
    const [tickerFilters, setTickerFilters] = useState([]);
    const [fundamentalFilters, setFundamentalFilters] = useState([]);
    const [sortField, setSortField] = useState("");
    const [sortDir, setSortDir] = useState(-1);
    const [limit, setLimit] = useState(50);

    // Response state
    const [results, setResults] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expandedRow, setExpandedRow] = useState(null);
    const [activePreset, setActivePreset] = useState(null);
    const [activeMode, setActiveMode] = useState(null);
    const [weeklyOptionTypeBySymbol, setWeeklyOptionTypeBySymbol] = useState({});
    const [weeklyOptionsBySymbol, setWeeklyOptionsBySymbol] = useState({});

    // Client-side column sort
    const [colSort, setColSort] = useState({ key: null, dir: 1 });

    const handleColumnSort = (col) => {
        setColSort((prev) => {
            if (prev.key === col.key) return { key: col.key, dir: prev.dir * -1 };
            return { key: col.key, dir: -1 };
        });
    };

    const getSelectedWeeklyOptionType = (symbol) => weeklyOptionTypeBySymbol[symbol] || "PUT";

    const sortedResults = useMemo(() => {
        if (!colSort.key || results.length === 0) return results;
        const col = DEFAULT_COLUMNS.find((c) => c.key === colSort.key);
        if (!col) return results;
        return [...results].sort((a, b) => {
            const av = getVal(a, col);
            const bv = getVal(b, col);
            if (av == null && bv == null) return 0;
            if (av == null) return 1;
            if (bv == null) return -1;
            if (typeof av === "string") return av.localeCompare(bv) * colSort.dir;
            return (av - bv) * colSort.dir;
        });
    }, [results, colSort]);

    // --- Build & send request -----------------------------------------

    const runQuery = useCallback(
        async (overrideBody) => {
            setLoading(true);
            setError(null);
            setExpandedRow(null);

            const body = overrideBody || {};
            if (!overrideBody) {
                body.frame = frame;
                body.limit = limit;

                const validFilters = filters.filter((f) => f.metric && f.value !== "");
                if (validFilters.length) body.filters = validFilters.map((f) => ({ metric: f.metric, op: f.op, value: Number(f.value) }));

                const validDaily = dailyFilters.filter((f) => f.metric && f.value !== "");
                if (validDaily.length) body.dailyFilters = validDaily.map((f) => ({ metric: f.metric, op: f.op, value: Number(f.value) }));

                const validTickerFilters = tickerFilters.filter((f) => f.metric && f.value !== "");
                if (validTickerFilters.length) {
                    body.tickerFilters = validTickerFilters.map((f) => ({
                        metric: f.metric,
                        op: f.op,
                        value: BOOLEAN_METRICS.has(f.metric) ? Boolean(Number(f.value)) : Number(f.value),
                    }));
                }

                const validFundamentals = fundamentalFilters.filter((f) => f.metric && f.value !== "");
                if (validFundamentals.length) {
                    body.fundamentalFilters = validFundamentals.map((f) => ({ metric: f.metric, op: f.op, value: Number(f.value) }));
                }

                if (sortField) body.sort = { [sortField]: sortDir };
            }

            try {
                const resp = await API.getInterestingStocks(body);
                if (resp && resp.results) {
                    setResults(resp.results);
                    setMeta(resp.meta);
                } else {
                    setResults([]);
                    setMeta(null);
                }
            } catch (err) {
                setError(err.message || "Request failed");
                setResults([]);
            } finally {
                setLoading(false);
            }
        },
        [frame, filters, dailyFilters, tickerFilters, fundamentalFilters, sortField, sortDir, limit],
    );

    // --- Preset handler ------------------------------------------------

    const handlePreset = (preset) => {
        setActivePreset(preset.name);
        setActiveMode(getPresetMode(preset.name));
        // Sync UI controls to match preset
        setFrame(preset.body.frame || "daily");
        setLimit(preset.body.limit || 50);
        setFilters((preset.body.filters || []).map((f) => ({ ...f, value: String(f.value) })));
        setDailyFilters((preset.body.dailyFilters || []).map((f) => ({ ...f, value: String(f.value) })));
        setTickerFilters((preset.body.tickerFilters || []).map((f) => ({ ...f, value: String(f.value) })));
        setFundamentalFilters((preset.body.fundamentalFilters || []).map((f) => ({ ...f, value: String(f.value) })));
        if (preset.body.sort) {
            const key = Object.keys(preset.body.sort)[0];
            setSortField(key);
            setSortDir(preset.body.sort[key]);
        } else {
            setSortField("");
            setSortDir(-1);
        }
        runQuery(preset.body);
    };

    const handleWeeklyOptionTypeChange = useCallback((symbol, contractType) => {
        setWeeklyOptionTypeBySymbol((prev) => ({ ...prev, [symbol]: contractType }));
        setWeeklyOptionsBySymbol((prev) => ({
            ...prev,
            [symbol]: {
                ...(prev[symbol] || {}),
                error: null,
                data: null,
            },
        }));
    }, []);

    const loadWeeklyOptions = useCallback(
        async (symbol) => {
            const contractType = weeklyOptionTypeBySymbol[symbol] || "PUT";

            setWeeklyOptionsBySymbol((prev) => ({
                ...prev,
                [symbol]: {
                    ...(prev[symbol] || {}),
                    loading: true,
                    error: null,
                    contractType,
                },
            }));

            try {
                const data = await API.getWeeklyOptionChain({
                    symbol,
                    contractType,
                    strikeCount: 5,
                });

                setWeeklyOptionsBySymbol((prev) => ({
                    ...prev,
                    [symbol]: {
                        loading: false,
                        error: null,
                        contractType,
                        data,
                    },
                }));
            } catch (err) {
                setWeeklyOptionsBySymbol((prev) => ({
                    ...prev,
                    [symbol]: {
                        ...(prev[symbol] || {}),
                        loading: false,
                        error: err.message || "Failed to load weekly options",
                    },
                }));
            }
        },
        [weeklyOptionTypeBySymbol],
    );

    // --- Filter row helpers --------------------------------------------

    const updateFilter = (list, setList, idx, field, val) => {
        const next = [...list];
        next[idx] = { ...next[idx], [field]: val };
        setList(next);
        setActivePreset((prev) => keepPresetSelectedOnEdit(prev));
    };

    const removeFilter = (list, setList, idx) => {
        setList(list.filter((_, i) => i !== idx));
        setActivePreset((prev) => keepPresetSelectedOnEdit(prev));
    };

    // --- Render --------------------------------------------------------

    const renderFilterRows = (list, setList, metricGroups, label) => (
        <FilterSection>
            <FilterSectionHeader>
                <FilterLabel>{label}</FilterLabel>
                <AddBtn onClick={() => setList([...list, emptyFilter()])}>+ Add</AddBtn>
            </FilterSectionHeader>
            {list.map((f, idx) => (
                <FilterRow key={idx}>
                    <Select value={f.metric} onChange={(e) => updateFilter(list, setList, idx, "metric", e.target.value)}>
                        <option value="">-- metric --</option>
                        {metricGroups.map((g) => (
                            <optgroup key={g.group} label={g.group}>
                                {g.metrics.map((m) => (
                                    <option key={m} value={m}>
                                        {m}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </Select>
                    <Select value={f.op} onChange={(e) => updateFilter(list, setList, idx, "op", e.target.value)} style={{ width: 70 }}>
                        {OPS.map((o) => (
                            <option key={o} value={o}>
                                {OP_LABELS[o]}
                            </option>
                        ))}
                    </Select>
                    <Input
                        type="number"
                        value={f.value}
                        onChange={(e) => updateFilter(list, setList, idx, "value", e.target.value)}
                        placeholder="value"
                        style={{ width: 80 }}
                    />
                    <RemoveBtn onClick={() => removeFilter(list, setList, idx)}>x</RemoveBtn>
                </FilterRow>
            ))}
        </FilterSection>
    );

    const renderBadges = (row) => {
        const badges = [];
        const allFlags = { ...(row.metrics || {}), ...(row.dailyMetrics || {}) };
        for (const [key, cfg] of Object.entries(FLAG_BADGES)) {
            if (allFlags[key] === 1) {
                badges.push(
                    <Badge key={key} color={cfg.color}>
                        {cfg.label}
                    </Badge>,
                );
            }
        }
        return badges;
    };

    const renderAroonHeatmap = (aroonStats) => {
        if (!aroonStats || typeof aroonStats !== "object") return null;
        // aroonStats has keys like "aroon5", "aroon10", "aroon20" each with up/down window data
        const periods = ["5", "10", "20"];
        const windows = ["5", "10", "20"];
        const hasSomeData = periods.some((p) => aroonStats[`aroon${p}`]);
        if (!hasSomeData) return null;

        const ratioColor = (val) => {
            if (val === undefined || val === null) return "#333";
            if (val > 0.5) return "#16a34a";
            if (val > 0.15) return "#22c55e55";
            if (val < -0.5) return "#dc2626";
            if (val < -0.15) return "#ef444455";
            return "#44444488";
        };

        return (
            <DetailSection>
                <DetailTitle>Aroon Trend</DetailTitle>
                <AroonTable>
                    <thead>
                        <tr>
                            <AroonTh></AroonTh>
                            {windows.map((w) => (
                                <AroonTh key={w} colSpan={2}>
                                    Win {w}
                                </AroonTh>
                            ))}
                        </tr>
                        <tr>
                            <AroonTh>Period</AroonTh>
                            {windows.map((w) => (
                                <React.Fragment key={w}>
                                    <AroonTh>Up</AroonTh>
                                    <AroonTh>Dn</AroonTh>
                                </React.Fragment>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {periods.map((p) => {
                            const data = aroonStats[`aroon${p}`];
                            if (!data) return null;
                            return (
                                <tr key={p}>
                                    <AroonTd>{p}</AroonTd>
                                    {windows.map((w) => {
                                        const upKey = `up_window${w}_ratio`;
                                        const downKey = `down_window${w}_ratio`;
                                        const upVal = data[upKey];
                                        const downVal = data[downKey];
                                        return (
                                            <React.Fragment key={w}>
                                                <AroonCell style={{ background: ratioColor(upVal) }}>
                                                    {upVal !== undefined ? upVal.toFixed(2) : "--"}
                                                </AroonCell>
                                                <AroonCell style={{ background: ratioColor(downVal != null ? -downVal : null) }}>
                                                    {downVal !== undefined ? downVal.toFixed(2) : "--"}
                                                </AroonCell>
                                            </React.Fragment>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </AroonTable>
            </DetailSection>
        );
    };

    const renderWeeklyOptions = (row) => {
        if (activeMode !== "wheel") return null;

        const symbol = row.symbol;
        const contractType = getSelectedWeeklyOptionType(symbol);
        const optionState = weeklyOptionsBySymbol[symbol] || {};
        const options = contractType === "CALL" ? optionState.data?.calls : optionState.data?.puts;

        return (
            <WeeklyOptionsPanel>
                <WeeklyOptionsHeader>
                    <WeeklyOptionsTitle>Weekly Options</WeeklyOptionsTitle>
                    <WeeklyOptionsControls>
                        <Select
                            value={contractType}
                            onChange={(e) => handleWeeklyOptionTypeChange(symbol, e.target.value)}
                            style={{ width: 90 }}
                        >
                            <option value="PUT">Puts</option>
                            <option value="CALL">Calls</option>
                        </Select>
                        <RunBtn onClick={() => loadWeeklyOptions(symbol)} disabled={optionState.loading}>
                            {optionState.loading ? "Loading..." : "Get Weekly Options"}
                        </RunBtn>
                    </WeeklyOptionsControls>
                </WeeklyOptionsHeader>

                {optionState.error && <WeeklyOptionsError>{optionState.error}</WeeklyOptionsError>}

                {optionState.data && (
                    <WeeklyOptionsMeta>
                        Exp {optionState.data.expDate} | Underlying {fmtOptionPrice(optionState.data.underlyingPrice)} | Showing 5{" "}
                        {contractType === "PUT" ? "puts" : "calls"}
                    </WeeklyOptionsMeta>
                )}

                {Array.isArray(options) && options.length > 0 && (
                    <WeeklyOptionsTable>
                        <thead>
                            <tr>
                                <AroonTh>Strike</AroonTh>
                                <AroonTh>Bid</AroonTh>
                                <AroonTh>Ask</AroonTh>
                                <AroonTh>Mark</AroonTh>
                                <AroonTh>Spread %</AroonTh>
                                <AroonTh>OI</AroonTh>
                                <AroonTh>Vol</AroonTh>
                                <AroonTh>IV</AroonTh>
                                <AroonTh>Delta</AroonTh>
                            </tr>
                        </thead>
                        <tbody>
                            {options.map((contract) => {
                                const spreadPct = getBidAskSpreadPct(contract);

                                return (
                                    <tr key={contract.symbol}>
                                        <AroonTd>{fmtOptionNumber(contract.strikePrice, 2)}</AroonTd>
                                        <AroonCell>{fmtOptionPrice(contract.bid)}</AroonCell>
                                        <AroonCell>{fmtOptionPrice(contract.ask)}</AroonCell>
                                        <AroonCell>{fmtOptionPrice(contract.mark)}</AroonCell>
                                        <AroonCell>{spreadPct == null ? "--" : `${spreadPct.toFixed(1)}%`}</AroonCell>
                                        <AroonCell>{contract.openInterest ?? "--"}</AroonCell>
                                        <AroonCell>{contract.totalVolume ?? "--"}</AroonCell>
                                        <AroonCell>{fmtOptionNumber(contract.volatility, 3)}</AroonCell>
                                        <AroonCell>{fmtOptionNumber(contract.delta, 3)}</AroonCell>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </WeeklyOptionsTable>
                )}

                {optionState.data && (!options || options.length === 0) && (
                    <WeeklyOptionsEmpty>
                        No {contractType.toLowerCase()} returned for {optionState.data.expDate}.
                    </WeeklyOptionsEmpty>
                )}
            </WeeklyOptionsPanel>
        );
    };

    const renderExpandedDetails = (row) => {
        const m = row.metrics || {};
        const d = row.dailyMetrics || {};
        const t = row.ticker || {};
        const f = row.fundamentals || {};

        const sections = [
            {
                title: "Company",
                items: [
                    ["Name", t.name],
                    ["Exchange", t.exchange],
                    ["Sector", t.sector],
                    ["Industry", t.industry],
                    ["Asset Type", t.assetType],
                    ["Weeklies", t.hasWeeklyExpirations != null ? (t.hasWeeklyExpirations ? "Yes" : "No") : null],
                ],
            },
            {
                title: "Fundamentals",
                items: [
                    ["Mkt Cap", f.marketCap != null ? fmtBigNum(f.marketCap) : null],
                    ["Float", f.marketCapFloat != null ? fmtBigNum(f.marketCapFloat) : null],
                    ["Beta", f.beta],
                    ["P/E", f.peRatio],
                    ["Short % Float", f.shortIntToFloat],
                    ["Short Days", f.shortIntDayToCover],
                    ["Div Yield", f.dividendYield],
                ],
            },
            {
                title: "Moving Averages",
                items: [
                    ["MA20", m.MA20],
                    ["MA50", m.MA50],
                    ["MA200", m.MA200],
                    ["% from MA20", m.pctFromMA20],
                    ["% from MA200", m.pctFromMA200],
                ],
            },
            {
                title: "RSI",
                items: [
                    ["RSI20", m.RSI20],
                    ["RSI50", m.RSI50],
                    ["RSI200", m.RSI200],
                ],
            },
            {
                title: "MACD",
                items: [
                    ["Line", m.MACDLine],
                    ["Signal", m.MACDSignal],
                    ["Hist", m.MACDHist],
                ],
            },
            {
                title: "Bollinger",
                items: [
                    ["Upper", m.BBUpper],
                    ["Lower", m.BBLower],
                    ["Width", m.BBWidth],
                    ["Width %ile", m.bbWidthPercentile],
                ],
            },
            {
                title: "Performance",
                items: [
                    ["1M", d.perf1MonthPct],
                    ["3M", d.perf3MonthPct],
                ],
            },
            {
                title: "Volume",
                items: [
                    [
                        "Avg Vol 10d",
                        f.avg10DaysVolume != null ? fmtBigNum(f.avg10DaysVolume) : d.avgVolume10 != null ? fmtBigNum(d.avgVolume10) : null,
                    ],
                    ["Avg Vol 3M", f.avg3MonthVolume != null ? fmtBigNum(f.avg3MonthVolume) : null],
                    ["Vol Change%", d.avgVolume10ChangePct],
                ],
            },
            {
                title: "Levels",
                items: [
                    ["52W High", f.high52 || d.high52Week],
                    ["52W Low", f.low52 || d.low52Week],
                    ["% < 52W H", d.pctBelow52WeekHigh],
                    ["% > 52W L", d.pctAbove52WeekLow],
                ],
            },
        ];
        return (
            <ExpandedRow>
                <ExpandedGrid>
                    {sections.map((s) => (
                        <DetailSection key={s.title}>
                            <DetailTitle>{s.title}</DetailTitle>
                            {s.items.map(([label, val]) => (
                                <DetailRow key={label}>
                                    <DetailLabel>{label}</DetailLabel>
                                    <DetailValue>
                                        {val !== undefined && val !== null ? (typeof val === "number" ? val.toFixed(2) : val) : "--"}
                                    </DetailValue>
                                </DetailRow>
                            ))}
                        </DetailSection>
                    ))}
                    {renderAroonHeatmap(row.aroonStats)}
                </ExpandedGrid>
                <BadgeRow>{renderBadges(row)}</BadgeRow>
                {renderWeeklyOptions(row)}
                <ChartsRow>
                    <ChartCol>
                        <ChartLabel>Daily</ChartLabel>
                        <ChartContainer>
                            <StockPriceChart symbol={row.symbol} timeframe="daily" height={320} fillContainer />
                        </ChartContainer>
                    </ChartCol>
                    <ChartCol>
                        <ChartLabel>Weekly</ChartLabel>
                        <ChartContainer>
                            <StockPriceChart symbol={row.symbol} timeframe="weekly" height={320} fillContainer />
                        </ChartContainer>
                    </ChartCol>
                </ChartsRow>
            </ExpandedRow>
        );
    };

    return (
        <Container>
            {/* Presets */}
            <PresetBar>
                {PRESETS.map((p) => (
                    <PresetBtn key={p.name} active={activePreset === p.name} onClick={() => handlePreset(p)}>
                        {p.name}
                    </PresetBtn>
                ))}
            </PresetBar>

            {/* Controls row */}
            <TopBar>
                <ControlGroup>
                    <Label>Frame</Label>
                    <Select
                        value={frame}
                        onChange={(e) => {
                            setFrame(e.target.value);
                            setActivePreset((prev) => keepPresetSelectedOnEdit(prev));
                        }}
                    >
                        {FRAMES.map((f) => (
                            <option key={f} value={f}>
                                {f}
                            </option>
                        ))}
                    </Select>
                </ControlGroup>
                <ControlGroup>
                    <Label>Sort</Label>
                    <Input
                        value={sortField}
                        onChange={(e) => {
                            setSortField(e.target.value);
                            setActivePreset((prev) => keepPresetSelectedOnEdit(prev));
                        }}
                        placeholder="metric"
                        style={{ width: 160 }}
                    />
                    <Select
                        value={sortDir}
                        onChange={(e) => {
                            setSortDir(Number(e.target.value));
                            setActivePreset((prev) => keepPresetSelectedOnEdit(prev));
                        }}
                        style={{ width: 70 }}
                    >
                        <option value={-1}>Desc</option>
                        <option value={1}>Asc</option>
                    </Select>
                </ControlGroup>
                <ControlGroup>
                    <Label>Limit</Label>
                    <Input
                        type="number"
                        value={limit}
                        onChange={(e) => {
                            setLimit(Number(e.target.value));
                            setActivePreset((prev) => keepPresetSelectedOnEdit(prev));
                        }}
                        style={{ width: 70 }}
                        min={1}
                        max={500}
                    />
                </ControlGroup>
                <RunBtn
                    onClick={() => {
                        runQuery();
                    }}
                    disabled={loading}
                >
                    {loading ? "Loading..." : "Run Screen"}
                </RunBtn>
            </TopBar>

            {/* Filters */}
            <FiltersContainer>
                {renderFilterRows(filters, setFilters, STATS_METRICS, "Stats Filters")}
                {renderFilterRows(dailyFilters, setDailyFilters, DAILY_METRICS, "Daily Filters")}
                {renderFilterRows(tickerFilters, setTickerFilters, TICKER_METRICS, "Ticker Filters")}
                {renderFilterRows(fundamentalFilters, setFundamentalFilters, FUNDAMENTAL_METRICS, "Fundamental Filters")}
            </FiltersContainer>

            {/* Error */}
            {error && <Alert>{error}</Alert>}

            {/* Meta */}
            {meta && (
                <MetaBar>
                    {meta.count} results | {meta.frame} | limit {meta.limit}
                </MetaBar>
            )}

            {/* Results table */}
            {results.length > 0 && (
                <TableWrap>
                    <Table>
                        <thead>
                            <tr>
                                {DEFAULT_COLUMNS.map((col) => (
                                    <Th key={col.key} sortable onClick={() => handleColumnSort(col)}>
                                        {col.label}
                                        {colSort.key === col.key ? (colSort.dir === 1 ? " ▲" : " ▼") : ""}
                                    </Th>
                                ))}
                                <Th>Flags</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedResults.map((row) => (
                                <React.Fragment key={row._id || row.symbol}>
                                    <Tr
                                        onClick={() => setExpandedRow(expandedRow === row.symbol ? null : row.symbol)}
                                        active={expandedRow === row.symbol}
                                    >
                                        {DEFAULT_COLUMNS.map((col) => (
                                            <Td key={col.key} highlight={col.key === "symbol"}>
                                                {col.key === "symbol" ? (
                                                    row.symbol
                                                ) : col.key === "name" ? (
                                                    <NameCell>{row.ticker?.description || "--"}</NameCell>
                                                ) : (
                                                    fmtVal(getVal(row, col), col.fmt)
                                                )}
                                            </Td>
                                        ))}
                                        <Td>
                                            <BadgeRow>{renderBadges(row)}</BadgeRow>
                                        </Td>
                                    </Tr>
                                    {expandedRow === row.symbol && (
                                        <tr>
                                            <ExpandedTd colSpan={DEFAULT_COLUMNS.length + 1}>{renderExpandedDetails(row)}</ExpandedTd>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </Table>
                </TableWrap>
            )}

            {!loading && results.length === 0 && meta && <Empty>No results. Try adjusting filters.</Empty>}
        </Container>
    );
}

// =======================================================================
// Styled Components
// =======================================================================

const Container = styled.div`
    padding: 1rem;
    background-color: #1a1a1a;
    color: #ffffff;
    min-height: 100vh;
`;

const PresetBar = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1rem;
`;

const PresetBtn = styled.button`
    padding: 0.4rem 0.75rem;
    border-radius: 0.35rem;
    border: 1px solid ${(p) => (p.active ? "#3b82f6" : "#444")};
    background: ${(p) => (p.active ? "#1e3a5f" : "#2d2d2d")};
    color: ${(p) => (p.active ? "#93c5fd" : "#ccc")};
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.15s;
    &:hover {
        border-color: #3b82f6;
        background: #1e3a5f;
    }
`;

const TopBar = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 1rem;
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: #202020;
    border: 1px solid #333;
    border-radius: 0.5rem;
`;

const ControlGroup = styled.div`
    display: flex;
    align-items: center;
    gap: 0.4rem;
`;

const Label = styled.span`
    font-size: 0.75rem;
    text-transform: uppercase;
    color: #9ca3af;
    letter-spacing: 0.04em;
`;

const FilterLabel = styled.span`
    font-size: 0.8rem;
    font-weight: 600;
    color: #d1d5db;
`;

const Select = styled.select`
    padding: 0.35rem 0.5rem;
    border-radius: 0.3rem;
    border: 1px solid #444;
    background: #1e1e1e;
    color: #e5e5e5;
    font-size: 0.8rem;
`;

const Input = styled.input`
    padding: 0.35rem 0.5rem;
    border-radius: 0.3rem;
    border: 1px solid #444;
    background: #1e1e1e;
    color: #e5e5e5;
    font-size: 0.8rem;
`;

const RunBtn = styled.button`
    padding: 0.45rem 1.25rem;
    border-radius: 0.35rem;
    border: 1px solid #3b82f6;
    background: #1d4ed8;
    color: #fff;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    &:hover {
        background: #2563eb;
    }
    &:disabled {
        opacity: 0.5;
        cursor: default;
    }
`;

const FiltersContainer = styled.div`
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
`;

const FilterSection = styled.div`
    flex: 1;
    min-width: 280px;
    padding: 0.75rem;
    background: #202020;
    border: 1px solid #333;
    border-radius: 0.5rem;
`;

const FilterSectionHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
`;

const FilterRow = styled.div`
    display: flex;
    gap: 0.4rem;
    align-items: center;
    margin-bottom: 0.35rem;
`;

const AddBtn = styled.button`
    padding: 0.2rem 0.6rem;
    border-radius: 0.25rem;
    border: 1px solid #444;
    background: #2d2d2d;
    color: #9ca3af;
    font-size: 0.75rem;
    cursor: pointer;
    &:hover {
        background: #3d3d3d;
    }
`;

const RemoveBtn = styled.button`
    padding: 0.2rem 0.45rem;
    border-radius: 0.25rem;
    border: 1px solid #555;
    background: transparent;
    color: #888;
    font-size: 0.75rem;
    cursor: pointer;
    &:hover {
        color: #ef4444;
        border-color: #ef4444;
    }
`;

const Alert = styled.div`
    padding: 0.75rem;
    border-radius: 0.5rem;
    background: #3b1818;
    border: 1px solid #592727;
    color: #ff8080;
    margin-bottom: 0.75rem;
`;

const MetaBar = styled.div`
    font-size: 0.75rem;
    color: #9ca3af;
    margin-bottom: 0.5rem;
    padding: 0.35rem 0.5rem;
    background: #252525;
    border-radius: 0.3rem;
    display: inline-block;
`;

const TableWrap = styled.div`
    overflow-x: auto;
    border: 1px solid #333;
    border-radius: 0.5rem;
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
`;

const Th = styled.th`
    text-align: left;
    padding: 0.6rem 0.75rem;
    background: #2d2d2d;
    border-bottom: 1px solid #444;
    color: #9ca3af;
    font-weight: 600;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    white-space: nowrap;
    cursor: ${(p) => (p.sortable ? "pointer" : "default")};
    user-select: none;
    &:hover {
        ${(p) => p.sortable && "color: #e5e5e5;"}
    }
`;

const Tr = styled.tr`
    cursor: pointer;
    background: ${(p) => (p.active ? "#1e293b" : "transparent")};
    &:hover {
        background: #252525;
    }
    &:not(:last-child) td {
        border-bottom: 1px solid #2a2a2a;
    }
`;

const Td = styled.td`
    padding: 0.5rem 0.75rem;
    color: ${(p) => (p.highlight ? "#93c5fd" : "#e5e5e5")};
    font-weight: ${(p) => (p.highlight ? 600 : 400)};
    font-family: ${(p) => (p.highlight ? "monospace" : "inherit")};
    white-space: nowrap;
`;

const ExpandedTd = styled.td`
    padding: 0;
    background: #1e1e1e;
`;

const ExpandedRow = styled.div`
    padding: 1rem;
`;

const ExpandedGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 1rem;
    margin-bottom: 0.75rem;
`;

const DetailSection = styled.div`
    padding: 0.65rem;
    background: #252525;
    border-radius: 0.4rem;
    border: 1px solid #333;
`;

const DetailTitle = styled.div`
    font-size: 0.7rem;
    text-transform: uppercase;
    color: #9ca3af;
    font-weight: 600;
    margin-bottom: 0.4rem;
    letter-spacing: 0.04em;
`;

const DetailRow = styled.div`
    display: flex;
    justify-content: space-between;
    padding: 0.15rem 0;
    font-size: 0.78rem;
`;

const DetailLabel = styled.span`
    color: #9ca3af;
`;

const DetailValue = styled.span`
    color: #e5e5e5;
    font-weight: 500;
`;

const BadgeRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
`;

const Badge = styled.span`
    display: inline-block;
    padding: 0.15rem 0.4rem;
    border-radius: 0.25rem;
    font-size: 0.65rem;
    font-weight: 600;
    background: ${(p) => p.color}22;
    color: ${(p) => p.color};
    border: 1px solid ${(p) => p.color}44;
    white-space: nowrap;
`;

const WeeklyOptionsPanel = styled.div`
    margin-top: 0.9rem;
    padding: 0.85rem;
    border: 1px solid #333;
    border-radius: 0.5rem;
    background: #202020;
`;

const WeeklyOptionsHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
`;

const WeeklyOptionsTitle = styled.div`
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #cbd5e1;
`;

const WeeklyOptionsControls = styled.div`
    display: flex;
    gap: 0.5rem;
    align-items: center;
`;

const WeeklyOptionsMeta = styled.div`
    margin-top: 0.5rem;
    font-size: 0.75rem;
    color: #9ca3af;
`;

const WeeklyOptionsError = styled.div`
    margin-top: 0.5rem;
    color: #fca5a5;
    font-size: 0.78rem;
`;

const WeeklyOptionsTable = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: 0.75rem;
    margin-top: 0.75rem;
`;

const WeeklyOptionsEmpty = styled.div`
    margin-top: 0.6rem;
    color: #9ca3af;
    font-size: 0.78rem;
`;

const ChartsRow = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
    margin-top: 0.75rem;
    @media (max-width: 1024px) {
        grid-template-columns: minmax(0, 1fr);
    }
`;

const ChartCol = styled.div`
    flex: 1;
    min-width: 0;
`;

const ChartLabel = styled.div`
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    color: #9ca3af;
    letter-spacing: 0.04em;
    margin-bottom: 0.25rem;
`;

const ChartContainer = styled.div`
    border: 1px solid #333;
    border-radius: 0.5rem;
    overflow: hidden;
    background: #111;
    height: clamp(350px, 34vw, 420px);
`;

const NameCell = styled.span`
    display: inline-block;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #9ca3af;
    font-size: 0.78rem;
`;

const AroonTable = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: 0.7rem;
    margin-top: 0.25rem;
`;

const AroonTh = styled.th`
    padding: 0.2rem 0.3rem;
    color: #9ca3af;
    font-weight: 500;
    text-align: center;
    border-bottom: 1px solid #3a3a3a;
`;

const AroonTd = styled.td`
    padding: 0.2rem 0.3rem;
    color: #d1d5db;
    text-align: center;
    font-weight: 600;
`;

const AroonCell = styled.td`
    padding: 0.2rem 0.3rem;
    color: #e5e5e5;
    text-align: center;
    font-weight: 500;
    font-size: 0.68rem;
    border-radius: 0.15rem;
`;

const Empty = styled.div`
    text-align: center;
    color: #9ca3af;
    padding: 3rem;
    font-size: 0.9rem;
`;
