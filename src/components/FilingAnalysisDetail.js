import React, { useEffect, useState, useMemo } from "react";
import { useHistory, useParams } from "react-router-dom";
import styled from "styled-components";
import API from "./API";
import StockPriceChart from "./charts/StockPriceChart";
import QuarterlyTrendsChart from "./charts/QuarterlyTrendsChart";

const Container = styled.div`
    padding: 1.5rem;
    background-color: #1a1a1a;
    color: #ffffff;
    min-height: 100vh;
`;

const Header = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.5rem;
`;

const Title = styled.h1`
    margin: 0;
    font-size: 1.75rem;
    font-weight: 700;
    letter-spacing: 0.03em;
`;

const BackButton = styled.button`
    background: none;
    border: 1px solid #444444;
    color: #e5e7eb;
    border-radius: 0.4rem;
    padding: 0.4rem 0.75rem;
    font-size: 0.85rem;
    cursor: pointer;
    transition: border-color 0.15s ease, color 0.15s ease;

    &:hover {
        border-color: #818cf8;
        color: #c7d2fe;
    }
`;

const ActionButton = styled.button`
    background: ${(props) => (props.loading ? "#374151" : "#3b82f6")};
    border: 1px solid ${(props) => (props.loading ? "#4b5563" : "#2563eb")};
    color: #ffffff;
    border-radius: 0.4rem;
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: ${(props) => (props.loading ? "not-allowed" : "pointer")};
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;

    &:hover {
        background: ${(props) => (props.loading ? "#374151" : "#2563eb")};
        border-color: ${(props) => (props.loading ? "#4b5563" : "#1d4ed8")};
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const LoadingState = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 40vh;
    font-size: 1rem;
    color: #d1d5db;
`;

const Alert = styled.div`
    padding: 1rem;
    border-radius: 0.5rem;
    background-color: #3b1818;
    border: 1px solid #592727;
    color: #ff8080;
`;

const ScoreGrid = styled.div`
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    margin-bottom: 1.5rem;
`;

const ScoreCard = styled.div`
    padding: 1rem;
    border-radius: 0.6rem;
    border: 1px solid #2f2f2f;
    background: #202020;
    border-left: 4px solid ${(props) => (props.variant === "positive" ? "#16a34a" : "#dc2626")};
`;

const ScoreHeading = styled.div`
    font-size: 0.8rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #9ca3af;
    margin-bottom: 0.5rem;
`;

const ScoreValue = styled.div`
    font-size: 2rem;
    font-weight: 700;
    color: #ffffff;
`;

const ScoreLabel = styled.div`
    font-size: 0.85rem;
    font-weight: 600;
    color: ${(props) => props.color || "#f9fafb"};
`;

const ScoreMeta = styled.div`
    margin-top: 0.5rem;
    font-size: 0.8rem;
    color: #9ca3af;
`;

const InfoBadge = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: #1e1e1e;
    border: 1px solid #2f2f2f;
    border-radius: 0.4rem;
    font-size: 0.85rem;
    color: #d1d5db;
`;

const InfoLabel = styled.span`
    color: #9ca3af;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
`;

const InfoValue = styled.span`
    color: #ffffff;
    font-weight: 500;
`;

const SignalsSection = styled.div`
    display: grid;
    gap: 1.5rem;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    margin-bottom: 1.5rem;
`;

const SignalsColumn = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
`;

const ColumnTitle = styled.h2`
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0;
`;

const SignalCard = styled.div`
    padding: 0.9rem;
    border-radius: 0.5rem;
    border: 1px solid #2f2f2f;
    background: #1e1e1e;
`;

const SignalTitle = styled.div`
    font-size: 0.9rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
`;

const SignalMessage = styled.div`
    font-size: 0.85rem;
    color: #d1d5db;
`;

const SignalFooter = styled.div`
    margin-top: 0.5rem;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #9ca3af;
`;

const TrendsSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1rem;
`;

const TrendsHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
`;

const TrendsTitle = styled.h2`
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
`;

const TrendsSummary = styled.div`
    font-size: 0.85rem;
    color: #9ca3af;
`;

const TrendsTable = styled.table`
    width: 100%;
    border-collapse: collapse;
    background: #1e1e1e;
    border-radius: 0.5rem;
    overflow: hidden;
`;

const TrendsHeadCell = styled.th`
    text-align: left;
    padding: 0.75rem;
    font-size: 0.75rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    background: #242424;
    color: #9ca3af;
    border-bottom: 1px solid #2f2f2f;
`;

const TrendsCell = styled.td`
    padding: 0.7rem 0.75rem;
    font-size: 0.85rem;
    border-bottom: 1px solid #2a2a2a;
    color: #e5e7eb;

    &:last-child {
        white-space: nowrap;
    }
`;

const TrendChangeSection = styled.div`
    margin-bottom: 1.5rem;
    border: 1px solid #2f2f2f;
    border-radius: 0.5rem;
    background: #1e1e1e;
    padding: 1rem;
`;

const TrendChangeHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.75rem;
`;

const TrendChangeTitle = styled.h2`
    margin: 0;
    font-size: 1.05rem;
    font-weight: 600;
`;

const TrendChangeSummary = styled.div`
    font-size: 0.8rem;
    color: #9ca3af;
`;

const TrendChangeTable = styled.table`
    width: 100%;
    border-collapse: collapse;
    margin-top: 1rem;
`;

const TrendChangeHeadCell = styled.th`
    text-align: left;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.6rem 0.75rem;
    color: #9ca3af;
    border-bottom: 1px solid #2f2f2f;
`;

const TrendChangeCell = styled.td`
    padding: 0.65rem 0.75rem;
    font-size: 0.85rem;
    border-bottom: 1px solid #2a2a2a;
    color: #e5e7eb;
`;

const TrendChangeSubtle = styled.div`
    font-size: 0.7rem;
    color: #9ca3af;
`;

const TrendChangeBadge = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 3rem;
    border-radius: 9999px;
    padding: 0.125rem 0.5rem;
    font-size: 0.7rem;
    font-weight: 600;
    color: ${(props) => props.color || "#e5e7eb"};
    background: ${(props) => props.background || "rgba(55, 65, 81, 0.25)"};
`;

const LatestQuarterSection = styled.div`
    margin: 1.5rem 0;
    border: 1px solid #2f2f2f;
    border-radius: 0.5rem;
    background: #1e1e1e;
    padding: 1rem;
`;

const LatestQuarterHeader = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 1rem;
`;

const LatestQuarterTitle = styled.h2`
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
`;

const LatestQuarterMeta = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    font-size: 0.8rem;
    color: #9ca3af;
`;

const LatestMetricGrid = styled.div`
    display: grid;
    gap: 0.85rem;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
`;

const LatestMetricCard = styled.div`
    border: 1px solid #2f2f2f;
    border-radius: 0.45rem;
    padding: 0.85rem;
    background: #111827;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
`;

const LatestMetricLabel = styled.div`
    font-size: 0.75rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #9ca3af;
`;

const LatestMetricValue = styled.div`
    font-size: 1rem;
    font-weight: 600;
    color: ${(props) => props.color || "#f9fafb"};
`;

const LatestMetricSubtle = styled.div`
    font-size: 0.75rem;
    color: #9ca3af;
`;

const StatusPill = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.125rem 0.6rem;
    border-radius: 9999px;
    font-size: 0.7rem;
    font-weight: 600;
    color: ${(props) => props.color || "#111827"};
    background: ${(props) => props.background || "#f3f4f6"};
`;

const EmptyState = styled.div`
    font-size: 0.85rem;
    color: #9ca3af;
`;

const ChartSection = styled.div`
    margin-bottom: 1.5rem;
    border: 1px solid #2f2f2f;
    border-radius: 0.5rem;
    background: #1e1e1e;
    padding: 1rem;
`;

const ChartTitle = styled.h2`
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
    font-weight: 600;
`;

const formatPercent = (value) => {
    if (value === null || value === undefined || Number.isNaN(value)) return "–";
    return `${Number(value).toFixed(1)}%`;
};

const formatBillions = (value) => {
    if (value === null || value === undefined || Number.isNaN(value)) return "–";
    return `$${(Number(value) / 1e9).toFixed(2)}B`;
};

const formatCurrency = (value) => {
    if (value === null || value === undefined || Number.isNaN(value)) return "–";
    return `$${Number(value).toFixed(2)}`;
};

const formatRatio = (value, digits = 2) => {
    if (value === null || value === undefined || Number.isNaN(value)) return "–";
    return Number(value).toFixed(digits);
};

const formatQuarterLabel = (filing) => {
    if (!filing) return "–";
    if (filing.quarter) return filing.quarter;
    if (filing.DocumentFiscalYearFocus && filing.DocumentFiscalPeriodFocus) {
        return `${filing.DocumentFiscalYearFocus}-${filing.DocumentFiscalPeriodFocus}`;
    }
    if (filing.ticker && filing.latestQuarter) return filing.latestQuarter;
    return filing.DocumentPeriodEndDate || filing.filed_date || "–";
};

const formatDate = (dateString) => {
    if (!dateString) return "–";
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
        return "–";
    }
};

const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
});

const formatCompactCurrency = (value) => {
    if (value === null || value === undefined || Number.isNaN(value)) return "–";
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return "–";
    return compactCurrencyFormatter.format(numeric);
};

const formatPercentFlexible = (value) => {
    if (value === null || value === undefined || Number.isNaN(value)) return "–";
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return "–";
    const needsScaling = Math.abs(numeric) <= 1;
    const scaled = needsScaling ? numeric * 100 : numeric;
    return `${scaled.toFixed(Math.abs(scaled) >= 10 ? 1 : 2)}%`;
};

const formatRunway = (value) => {
    if (value === null || value === undefined || Number.isNaN(value)) return "–";
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return "–";
    if (!Number.isFinite(numeric)) return "–";
    if (numeric < 0) return `~${Math.abs(numeric).toFixed(1)} qtrs (deficit)`;
    if (numeric >= 10) return `${numeric.toFixed(0)} quarters`;
    if (numeric >= 1) return `${numeric.toFixed(1)} quarters`;
    return "<1 quarter";
};

const TREND_METRIC_ORDER = [
    "revenue",
    "netIncome",
    "freeCashFlow",
    "operatingCashFlow",
    "eps",
    "grossMargin",
    "operatingMargin",
    "netMargin",
    "roa",
    "roe",
    "ros",
    "assetTurnover",
    "currentRatio",
];

const TREND_METRIC_CONFIG = {
    revenue: { label: "Revenue", formatValue: formatBillions },
    netIncome: { label: "Net Income", formatValue: formatBillions },
    freeCashFlow: { label: "Free Cash Flow", formatValue: formatBillions },
    operatingCashFlow: { label: "Operating Cash Flow", formatValue: formatBillions },
    eps: { label: "Earnings Per Share", formatValue: formatCurrency },
    grossMargin: { label: "Gross Margin", formatValue: formatPercent },
    operatingMargin: { label: "Operating Margin", formatValue: formatPercent },
    netMargin: { label: "Net Margin", formatValue: formatPercent },
    currentRatio: { label: "Current Ratio", formatValue: (value) => formatRatio(value, 2) },
    roa: { label: "Return on Assets", formatValue: formatPercent },
    roe: { label: "Return on Equity", formatValue: formatPercent },
    ros: { label: "Return on Sales", formatValue: formatPercent },
    assetTurnover: { label: "Asset Turnover", formatValue: (value) => formatRatio(value, 2) },
};

const parseQuarterToDate = (label) => {
    if (!label || typeof label !== "string") return null;
    const clean = label.trim().toUpperCase();

    const match = clean.match(/^(\d{4})[-\s]?Q([1-4])$/);
    if (match) {
        const year = Number(match[1]);
        const quarter = Number(match[2]);
        const month = quarter * 3 - 1;
        return new Date(Date.UTC(year, month, 1));
    }

    const fyMatch = clean.match(/^(\d{4})[-\s]?FY$/);
    if (fyMatch) {
        const year = Number(fyMatch[1]);
        return new Date(Date.UTC(year, 11, 31));
    }

    const reversedFyMatch = clean.match(/^FY[-\s]?(\d{4})$/);
    if (reversedFyMatch) {
        const year = Number(reversedFyMatch[1]);
        return new Date(Date.UTC(year, 11, 31));
    }

    const date = new Date(label);
    if (!Number.isNaN(date.getTime())) {
        return date;
    }
    return null;
};

const extractValidDate = (...values) => {
    for (const value of values) {
        if (!value) continue;
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) {
            return date;
        }
    }
    return null;
};

const formatPercentChange = (value) => {
    if (value === null || value === undefined || Number.isNaN(value)) return "–";
    const numeric = Number(value);
    const sign = numeric > 0 ? "+" : numeric < 0 ? "−" : "";
    const absolute = Math.abs(numeric).toFixed(Math.abs(numeric) >= 10 ? 1 : 2);
    return `${sign}${absolute}%`;
};

const getChangeBadgeProps = (value) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return { text: "–", color: "#9ca3af", background: "rgba(75, 85, 99, 0.25)" };
    }

    const numeric = Number(value);
    const text = formatPercentChange(numeric);
    if (numeric > 0) {
        return { text, color: "#10b981", background: "rgba(16, 185, 129, 0.12)" };
    }
    if (numeric < 0) {
        return { text, color: "#f87171", background: "rgba(248, 113, 113, 0.12)" };
    }
    return { text, color: "#e5e7eb", background: "rgba(107, 114, 128, 0.25)" };
};

const normalizeTrendSeries = (series = []) => {
    if (!Array.isArray(series)) return [];
    const normalized = series
        .map((entry, index) => {
            if (entry === null || entry === undefined) return null;
            if (typeof entry === "number") {
                return {
                    quarter: null,
                    value: entry,
                    change: null,
                    timestamp: null,
                    index,
                    raw: entry,
                };
            }

            const quarter = entry.quarter || entry.period || entry.label || entry.name || null;
            const value = entry.value !== undefined ? entry.value : entry.amount !== undefined ? entry.amount : entry.metric ?? null;
            const numericValue = value !== null && value !== undefined ? Number(value) : null;
            const change =
                entry.change !== undefined
                    ? entry.change
                    : entry.delta !== undefined
                    ? entry.delta
                    : entry.qoq !== undefined
                    ? entry.qoq
                    : entry.yoy !== undefined
                    ? entry.yoy
                    : entry.percent !== undefined
                    ? entry.percent
                    : null;
            const numericChange = change !== null && change !== undefined ? Number(change) : null;

            const periodDate = extractValidDate(
                entry.periodDate,
                entry.periodOfReport,
                entry.period_end || entry.periodEnd,
                entry.documentPeriodEndDate,
                entry.reportDate,
                entry.filingDate,
                entry.date
            );
            const parsedQuarterDate = parseQuarterToDate(quarter);
            const timestamp = (periodDate || parsedQuarterDate)?.getTime() ?? null;

            return {
                quarter,
                value: Number.isNaN(numericValue) ? null : numericValue,
                change: Number.isNaN(numericChange) ? null : numericChange,
                timestamp,
                index,
                raw: entry,
            };
        })
        .filter(Boolean);

    normalized.sort((a, b) => {
        const aScore = a.timestamp ?? Number.MAX_SAFE_INTEGER - a.index;
        const bScore = b.timestamp ?? Number.MAX_SAFE_INTEGER - b.index;
        return bScore - aScore;
    });

    return normalized;
};

const buildTrendRows = (trends) => {
    if (!trends) return [];

    const qoqGroup = trends.qoq || trends.trends || {};
    const yoyGroup = trends.yoy || {};

    const metricKeys = new Set([...Object.keys(qoqGroup || {}), ...Object.keys(yoyGroup || {})]);
    const filteredKeys = Array.from(metricKeys).filter((key) => TREND_METRIC_CONFIG[key]);
    filteredKeys.sort((a, b) => {
        const aIndex = TREND_METRIC_ORDER.indexOf(a);
        const bIndex = TREND_METRIC_ORDER.indexOf(b);
        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
    });

    return filteredKeys.map((key) => {
        const config = TREND_METRIC_CONFIG[key];
        const qoqSeries = normalizeTrendSeries(qoqGroup[key]);
        const yoySeries = normalizeTrendSeries(yoyGroup[key]);
        const latestQoQ = qoqSeries[0] || null;
        const latestYoY = yoySeries[0] || null;
        const latestValueSource = latestQoQ || latestYoY || null;

        return {
            key,
            label: config.label,
            latestValue: latestValueSource ? config.formatValue(latestValueSource.value) : "–",
            latestQuarter: latestValueSource?.quarter || "–",
            qoqChange: latestQoQ?.change ?? null,
            qoqQuarter: latestQoQ?.quarter || null,
            yoyChange: latestYoY?.change ?? null,
            yoyQuarter: latestYoY?.quarter || null,
        };
    });
};

export default function FilingAnalysisDetail() {
    const { ticker } = useParams();
    const history = useHistory();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [gatheringFilings, setGatheringFilings] = useState(false);
    const [tickerData, setTickerData] = useState(null);

    useEffect(() => {
        let isMounted = true;
        async function fetchAnalysis() {
            setLoading(true);
            try {
                const response = await API.getFilingAnalysisFull(ticker);
                if (!isMounted) return;
                setData(response);
                setError(null);
            } catch (err) {
                if (!isMounted) return;
                setData(null);
                setError(err.message || "Unable to load filing analysis.");
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        if (ticker) {
            fetchAnalysis();
        }

        return () => {
            isMounted = false;
        };
    }, [ticker]);

    // Fetch ticker metadata
    useEffect(() => {
        let isMounted = true;
        async function fetchTickerData() {
            try {
                const response = await API.getTickerData(ticker);
                if (!isMounted) return;
                setTickerData(response);
            } catch (err) {
                console.error(`[FilingAnalysis] Failed to load ticker data for ${ticker}:`, err);
                setTickerData(null);
            }
        }

        if (ticker) {
            fetchTickerData();
        }

        return () => {
            isMounted = false;
        };
    }, [ticker]);

    const filings = useMemo(() => {
        const directFilings = data?.trends?.filings;
        const qoqFilings = data?.trends?.qoq?.filings;
        const yoyFilings = data?.trends?.yoy?.filings;
        const fallback = directFilings || qoqFilings || yoyFilings || [];
        return Array.isArray(fallback) ? fallback : [];
    }, [data]);

    const trendRows = useMemo(() => buildTrendRows(data?.trends), [data]);

    const latestSnapshot = useMemo(() => {
        if (!filings.length) return null;
        const filing = filings[0];
        if (!filing) return null;

        const pick = (...keys) => {
            for (const key of keys) {
                if (filing[key] !== undefined && filing[key] !== null) {
                    return filing[key];
                }
            }
            return null;
        };

        const freeCashFlow = pick("FreeCashFlow", "freeCashFlow");
        const fcfMargin = pick("FCFMargin", "freeCashFlowMargin");
        const assetTurnover = pick("AssetTurnover", "assetTurnover");
        const shortTermDebtRatio = pick("ShortTermDebtRatio", "shortTermDebtRatio");
        const longTermDebtRatio = pick("LongTermDebtRatio", "longTermDebtRatio");
        const quarterlyCashBurn = pick("QuarterlyCashBurn", "quarterlyCashBurn");
        const runwayQuarters = pick("RunwayQuarters", "runwayQuarters");
        const negativeEquity = pick("NegativeEquity", "negativeEquity");
        const equityDeficit = pick("EquityDeficit", "equityDeficit");

        const quarterLabel = formatQuarterLabel(filing);
        const filedDate = formatDate(pick("filed_date", "filingDate", "filedDate"));

        const metrics = [
            {
                key: "freeCashFlow",
                label: "Free Cash Flow",
                value: freeCashFlow !== null ? formatCompactCurrency(freeCashFlow) : "–",
                sub: fcfMargin !== null ? `Margin: ${formatPercentFlexible(fcfMargin)}` : null,
                badge:
                    freeCashFlow !== null
                        ? {
                              text: freeCashFlow >= 0 ? "Positive" : "Negative",
                              color: freeCashFlow >= 0 ? "#10b981" : "#f87171",
                              background: freeCashFlow >= 0 ? "rgba(16, 185, 129, 0.12)" : "rgba(248, 113, 113, 0.12)",
                          }
                        : null,
            },
            {
                key: "assetTurnover",
                label: "Asset Turnover",
                value: assetTurnover !== null ? formatRatio(assetTurnover, 2) : "–",
                sub: assetTurnover !== null ? "Revenue per $1 of assets" : null,
            },
            {
                key: "debtMix",
                label: "Debt Structure",
                value:
                    shortTermDebtRatio !== null || longTermDebtRatio !== null
                        ? `${shortTermDebtRatio !== null ? formatPercentFlexible(shortTermDebtRatio) : "–"} ST / ${
                              longTermDebtRatio !== null ? formatPercentFlexible(longTermDebtRatio) : "–"
                          } LT`
                        : "–",
                sub: shortTermDebtRatio !== null || longTermDebtRatio !== null ? "Short-term vs long-term debt" : null,
            },
            {
                key: "cashBurn",
                label: "Cash Burn & Runway",
                value: quarterlyCashBurn !== null ? formatCompactCurrency(quarterlyCashBurn) : "–",
                sub: runwayQuarters !== null ? `Runway: ${formatRunway(runwayQuarters)}` : null,
            },
            {
                key: "equityHealth",
                label: "Equity Health",
                value:
                    negativeEquity === true
                        ? equityDeficit !== null
                            ? formatCompactCurrency(equityDeficit)
                            : "Deficit"
                        : negativeEquity === false
                        ? "Positive"
                        : "–",
                valueColor: negativeEquity === true ? "#f87171" : undefined,
                badge:
                    negativeEquity !== null
                        ? {
                              text: negativeEquity ? "Negative Equity" : "Healthy Equity",
                              color: negativeEquity ? "#f87171" : "#34d399",
                              background: negativeEquity ? "rgba(248, 113, 113, 0.12)" : "rgba(52, 211, 153, 0.12)",
                          }
                        : null,
                sub:
                    negativeEquity === true && equityDeficit !== null
                        ? "Deficit amount shown"
                        : negativeEquity === false
                        ? "Assets exceed liabilities"
                        : null,
            },
        ].filter((metric) => metric.value !== "–" || metric.sub || metric.badge);

        if (!metrics.length) return null;

        return {
            quarter: quarterLabel,
            filedDate,
            metrics,
        };
    }, [filings]);

    const handleGatherFilings = async () => {
        setGatheringFilings(true);
        try {
            console.log(`[FilingAnalysis] Gathering filings for ${ticker}...`);
            const response = await API.gatherFilings(ticker);
            console.log(`[FilingAnalysis] Gather filings response:`, response);

            // Log the response details
            if (response?.status) {
                console.log(`[FilingAnalysis] Status: ${response.status}`);
            }
            if (response?.message) {
                console.log(`[FilingAnalysis] Message: ${response.message}`);
            }
            if (response?.symbol) {
                console.log(`[FilingAnalysis] Symbol: ${response.symbol}`);
            }
            if (response?.count !== undefined) {
                console.log(`[FilingAnalysis] Gathered ${response.count} filings`);
            }
            if (response?.filings && Array.isArray(response.filings)) {
                console.log(`[FilingAnalysis] Filings:`, response.filings);
                console.log(
                    `[FilingAnalysis] Filing details:`,
                    response.filings.map((f) => ({
                        form: f.form,
                        filingDate: f.filingDate,
                        reportDate: f.reportDate,
                        accessionNumber: f.accessionNumber,
                    }))
                );
            }

            // After gathering, refresh the analysis data if successful
            if (response?.status === "success") {
                console.log(`[FilingAnalysis] Refreshing analysis data...`);
                const refreshedData = await API.getFilingAnalysisFull(ticker);
                setData(refreshedData);
                console.log(`[FilingAnalysis] Analysis data refreshed`);
            }
        } catch (err) {
            console.error(`[FilingAnalysis] Error gathering filings:`, err);
            console.error(`[FilingAnalysis] Error details:`, {
                message: err.message,
                stack: err.stack,
                response: err.response,
            });
        } finally {
            setGatheringFilings(false);
        }
    };

    if (loading) {
        return (
            <Container>
                <Header>
                    <BackButton onClick={() => history.push("/pick-list")}>← Back to Pick Lists</BackButton>
                    <Title>{ticker?.toUpperCase()} Filing Analysis</Title>
                </Header>
                <LoadingState>Loading filing analysis…</LoadingState>
            </Container>
        );
    }

    if (error) {
        return (
            <Container>
                <Header>
                    <BackButton onClick={() => history.push("/pick-list")}>← Back to Pick Lists</BackButton>
                    <Title>{ticker?.toUpperCase()} Filing Analysis</Title>
                </Header>
                <Alert>{error}</Alert>
            </Container>
        );
    }

    if (!data) {
        return (
            <Container>
                <Header>
                    <BackButton onClick={() => history.push("/pick-list")}>← Back to Pick Lists</BackButton>
                    <Title>{ticker?.toUpperCase()} Filing Analysis</Title>
                </Header>
                <EmptyState>No analysis data available.</EmptyState>
            </Container>
        );
    }

    const acceleration = data.acceleration || {};
    const deterioration = data.deterioration || {};

    return (
        <Container>
            <Header>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <BackButton onClick={() => history.push("/pick-list")}>← Back to Pick Lists</BackButton>
                    <ActionButton onClick={handleGatherFilings} disabled={gatheringFilings} loading={gatheringFilings}>
                        {gatheringFilings ? (
                            <>
                                <span>⏳</span>
                                <span>Gathering...</span>
                            </>
                        ) : (
                            <>
                                <span>🔄</span>
                                <span>Check for New Filings</span>
                            </>
                        )}
                    </ActionButton>
                </div>
                <Title>{ticker?.toUpperCase()} Filing Analysis</Title>
            </Header>

            {/* Ticker Info Section */}
            {tickerData && (
                <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
                    {tickerData.next10QExpectedDate && (
                        <InfoBadge>
                            <InfoLabel>Next 10-Q:</InfoLabel>
                            <InfoValue>{formatDate(tickerData.next10QExpectedDate)}</InfoValue>
                        </InfoBadge>
                    )}
                    {tickerData.next10KExpectedDate && (
                        <InfoBadge>
                            <InfoLabel>Next 10-K:</InfoLabel>
                            <InfoValue>{formatDate(tickerData.next10KExpectedDate)}</InfoValue>
                        </InfoBadge>
                    )}
                    {tickerData.sector && (
                        <InfoBadge>
                            <InfoLabel>Sector:</InfoLabel>
                            <InfoValue>{tickerData.sector}</InfoValue>
                        </InfoBadge>
                    )}
                    {tickerData.industry && (
                        <InfoBadge>
                            <InfoLabel>Industry:</InfoLabel>
                            <InfoValue>{tickerData.industry}</InfoValue>
                        </InfoBadge>
                    )}
                </div>
            )}

            {/* Stock Price Chart */}
            <ChartSection>
                <ChartTitle>
                    {ticker?.toUpperCase()} - {tickerData.description} Stock Price - Weekly
                </ChartTitle>
                <StockPriceChart timeframe="weekly" symbol={ticker} height={400} />
                <ChartTitle>
                    {ticker?.toUpperCase()} - {tickerData.description} Stock Price - Daily
                </ChartTitle>
                <StockPriceChart timeframe="daily" symbol={ticker} height={400} />
                {/*
                <StockPriceChart timeframe="30Min" symbol={ticker} height={400} /> */}
            </ChartSection>

            <ScoreGrid>
                <ScoreCard variant="positive">
                    <ScoreHeading>Acceleration Score</ScoreHeading>
                    <ScoreValue>{acceleration.score ?? "–"}</ScoreValue>
                    <ScoreLabel color="#34d399">{acceleration.strength?.toUpperCase() || "N/A"}</ScoreLabel>
                    <ScoreMeta>{acceleration.signalCount ?? 0} positive signals</ScoreMeta>
                    <ScoreMeta>Latest quarter: {acceleration.latestQuarter || "–"}</ScoreMeta>
                </ScoreCard>
                <ScoreCard variant="negative">
                    <ScoreHeading>Deterioration Score</ScoreHeading>
                    <ScoreValue>{deterioration.score ?? "–"}</ScoreValue>
                    <ScoreLabel color="#f87171">{deterioration.severity?.toUpperCase() || "N/A"}</ScoreLabel>
                    <ScoreMeta>{deterioration.signalCount ?? 0} warning signals</ScoreMeta>
                    <ScoreMeta>Latest quarter: {deterioration.latestQuarter || "–"}</ScoreMeta>
                </ScoreCard>
            </ScoreGrid>

            {latestSnapshot && (
                <LatestQuarterSection>
                    <LatestQuarterHeader>
                        <LatestQuarterTitle>Latest Quarter Snapshot</LatestQuarterTitle>
                        <LatestQuarterMeta>
                            {latestSnapshot.quarter && <span>Period: {latestSnapshot.quarter}</span>}
                            {latestSnapshot.filedDate && <span>Filed: {latestSnapshot.filedDate}</span>}
                        </LatestQuarterMeta>
                    </LatestQuarterHeader>
                    <LatestMetricGrid>
                        {latestSnapshot.metrics.map((metric) => (
                            <LatestMetricCard key={metric.key}>
                                <LatestMetricLabel>{metric.label}</LatestMetricLabel>
                                <LatestMetricValue color={metric.valueColor}>{metric.value}</LatestMetricValue>
                                {metric.badge && (
                                    <StatusPill color={metric.badge.color} background={metric.badge.background}>
                                        {metric.badge.text}
                                    </StatusPill>
                                )}
                                {metric.sub && <LatestMetricSubtle>{metric.sub}</LatestMetricSubtle>}
                            </LatestMetricCard>
                        ))}
                    </LatestMetricGrid>
                </LatestQuarterSection>
            )}

            <SignalsSection>
                <SignalsColumn>
                    <ColumnTitle>Positive Signals</ColumnTitle>
                    {acceleration.signals?.length ? (
                        acceleration.signals.map((signal, idx) => (
                            <SignalCard key={`positive-${idx}`}>
                                <SignalTitle>{signal.type?.replace(/_/g, " ") || "Signal"}</SignalTitle>
                                <SignalMessage>{signal.message}</SignalMessage>
                                <SignalFooter>
                                    {signal.strength ? `${signal.strength.toUpperCase()} • ` : ""}
                                    Score {signal.score ?? "–"}
                                </SignalFooter>
                            </SignalCard>
                        ))
                    ) : (
                        <EmptyState>No notable acceleration signals.</EmptyState>
                    )}
                </SignalsColumn>
                <SignalsColumn>
                    <ColumnTitle>Warning Signals</ColumnTitle>
                    {deterioration.signals?.length ? (
                        deterioration.signals.map((signal, idx) => (
                            <SignalCard key={`warning-${idx}`}>
                                <SignalTitle>{signal.type?.replace(/_/g, " ") || "Signal"}</SignalTitle>
                                <SignalMessage>{signal.message}</SignalMessage>
                                <SignalFooter>
                                    {signal.severity ? `${signal.severity.toUpperCase()} • ` : ""}
                                    Score {signal.score ?? "–"}
                                </SignalFooter>
                            </SignalCard>
                        ))
                    ) : (
                        <EmptyState>No significant deterioration signals.</EmptyState>
                    )}
                </SignalsColumn>
            </SignalsSection>

            {trendRows.length > 0 && (
                <TrendChangeSection>
                    <TrendChangeHeader>
                        <TrendChangeTitle>Trend Change Snapshot</TrendChangeTitle>
                        <TrendChangeSummary>Latest values with quarter-over-quarter and year-over-year shifts</TrendChangeSummary>
                    </TrendChangeHeader>
                    <TrendChangeTable>
                        <thead>
                            <tr>
                                <TrendChangeHeadCell>Metric</TrendChangeHeadCell>
                                <TrendChangeHeadCell>Latest Value</TrendChangeHeadCell>
                                <TrendChangeHeadCell>QoQ Change</TrendChangeHeadCell>
                                <TrendChangeHeadCell>YoY Change</TrendChangeHeadCell>
                            </tr>
                        </thead>
                        <tbody>
                            {trendRows.map((row) => {
                                const qoqBadge = getChangeBadgeProps(row.qoqChange);
                                const yoyBadge = getChangeBadgeProps(row.yoyChange);
                                const hasQoQ = row.qoqChange !== null && row.qoqChange !== undefined;
                                const hasYoY = row.yoyChange !== null && row.yoyChange !== undefined;

                                return (
                                    <tr key={row.key}>
                                        <TrendChangeCell>
                                            <div>{row.label}</div>
                                            {row.latestQuarter && row.latestQuarter !== "–" && (
                                                <TrendChangeSubtle>Latest: {row.latestQuarter}</TrendChangeSubtle>
                                            )}
                                        </TrendChangeCell>
                                        <TrendChangeCell>{row.latestValue || "–"}</TrendChangeCell>
                                        <TrendChangeCell>
                                            {hasQoQ ? (
                                                <>
                                                    <TrendChangeBadge color={qoqBadge.color} background={qoqBadge.background}>
                                                        {qoqBadge.text}
                                                    </TrendChangeBadge>
                                                    {row.qoqQuarter && <TrendChangeSubtle>Period: {row.qoqQuarter}</TrendChangeSubtle>}
                                                </>
                                            ) : (
                                                <span>–</span>
                                            )}
                                        </TrendChangeCell>
                                        <TrendChangeCell>
                                            {hasYoY ? (
                                                <>
                                                    <TrendChangeBadge color={yoyBadge.color} background={yoyBadge.background}>
                                                        {yoyBadge.text}
                                                    </TrendChangeBadge>
                                                    {row.yoyQuarter && <TrendChangeSubtle>Period: {row.yoyQuarter}</TrendChangeSubtle>}
                                                </>
                                            ) : (
                                                <span>–</span>
                                            )}
                                        </TrendChangeCell>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </TrendChangeTable>
                </TrendChangeSection>
            )}

            {/* Quarterly Trends Chart */}
            {filings.length > 0 && (
                // <div className="row flex_center">
                //     <div className="col-sm-6 flex_center">
                <ChartSection>
                    <ChartTitle>Quarterly Trends - Revenue & Margins (Last 8 Quarters)</ChartTitle>
                    <QuarterlyTrendsChart symbol={ticker} filings={filings} height={400} />
                </ChartSection>
                //     </div>
                // </div>
            )}

            <TrendsSection>
                <TrendsHeader>
                    <TrendsTitle>Quarterly Metrics Table</TrendsTitle>
                    <TrendsSummary>
                        Covering {data.trends?.quarterCount || (filings.length ? filings.length : "–")} quarters • Latest filing{" "}
                        {acceleration.latestFilingDate || deterioration.latestFilingDate || "–"}
                    </TrendsSummary>
                </TrendsHeader>
                {filings.length ? (
                    <TrendsTable>
                        <thead>
                            <tr>
                                <TrendsHeadCell>Quarter</TrendsHeadCell>
                                <TrendsHeadCell>Filing Date</TrendsHeadCell>
                                <TrendsHeadCell>Revenue</TrendsHeadCell>
                                <TrendsHeadCell>Net Income</TrendsHeadCell>
                                <TrendsHeadCell>Gross Margin</TrendsHeadCell>
                                <TrendsHeadCell>Operating Margin</TrendsHeadCell>
                                <TrendsHeadCell>Net Margin</TrendsHeadCell>
                                <TrendsHeadCell>Current Ratio</TrendsHeadCell>
                            </tr>
                        </thead>
                        <tbody>
                            {filings.slice(0, 8).map((filing, idx) => (
                                <tr key={idx}>
                                    <TrendsCell>{formatQuarterLabel(filing)}</TrendsCell>
                                    <TrendsCell>{formatDate(filing.filed_date || filing.filingDate)}</TrendsCell>
                                    <TrendsCell>{formatBillions(filing.Revenues ?? filing.revenue)}</TrendsCell>
                                    <TrendsCell>{formatBillions(filing.NetIncomeLoss ?? filing.netIncome)}</TrendsCell>
                                    <TrendsCell>{formatPercent(filing.GrossMargin ?? filing.grossMargin)}</TrendsCell>
                                    <TrendsCell>{formatPercent(filing.OperatingMargin ?? filing.operatingMargin)}</TrendsCell>
                                    <TrendsCell>{formatPercent(filing.NetMargin ?? filing.netMargin)}</TrendsCell>
                                    <TrendsCell>
                                        {filing.CurrentRatio !== undefined ? Number(filing.CurrentRatio).toFixed(2) : "–"}
                                    </TrendsCell>
                                </tr>
                            ))}
                        </tbody>
                    </TrendsTable>
                ) : (
                    <EmptyState>No quarterly filings returned.</EmptyState>
                )}
            </TrendsSection>
        </Container>
    );
}
