import React, { useMemo } from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const hasNumericValue = (value) => typeof value === "number" && !Number.isNaN(value);
const formatDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const normalizePeriod = (value) => {
    if (!value) return null;
    const upper = String(value).toUpperCase();
    if (/^Q[1-4]$/.test(upper)) {
        return upper;
    }
    if (upper === "FY" || upper === "FYE") {
        return "FY";
    }
    if (upper.startsWith("Q") && upper.length > 1 && !Number.isNaN(Number(upper[1]))) {
        return `Q${upper[1]}`;
    }
    return upper;
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

const buildQuarterLabel = (filing, fallbackLabel, index) => {
    if (!filing) return fallbackLabel;

    const periodFocus = normalizePeriod(filing.DocumentFiscalPeriodFocus);
    const periodDate = extractValidDate(
        filing.periodOfReport,
        filing.PeriodOfReport,
        filing.DocumentPeriodEndDate,
        filing.reportDate,
        filing.filingDate
    );
    const periodDateFormatted = periodDate ? formatDate(periodDate) : null;

    const fiscalYear = filing.DocumentFiscalYearFocus || (periodDate ? periodDate.getFullYear() : null);
    const baseParts = [];
    if (fiscalYear) baseParts.push(fiscalYear);
    if (periodFocus) baseParts.push(periodFocus);

    let baseLabel = baseParts.join(" ");
    if (!baseLabel) {
        if (filing.quarter) {
            baseLabel = filing.quarter;
        } else if (periodDateFormatted) {
            baseLabel = periodDateFormatted;
        } else if (filing.ticker && filing.latestQuarter) {
            baseLabel = filing.latestQuarter;
        } else {
            baseLabel = fallbackLabel || `Q${index + 1}`;
        }
    }

    const documentType = filing.DocumentType || filing.documentType || filing.form || filing.formType;
    return {
        display: documentType ? `${baseLabel} - ${documentType}` : baseLabel,
        fiscalYear: fiscalYear ?? null,
        periodFocus: periodFocus ?? null,
        documentType: documentType ?? null,
        periodDate: periodDateFormatted,
        periodTimestamp: periodDate ? periodDate.getTime() : null,
        baseLabel,
    };
};

const QuarterlyTrendsChart = ({ height = 400, symbol, filings = [] }) => {
    const points = useMemo(() => {
        if (!Array.isArray(filings) || filings.length === 0) {
            return [];
        }

        const normalized = filings.map((filing, index) => {
            const revenueRaw = filing.Revenues ?? filing.revenue;
            const netIncomeRaw = filing.NetIncomeLoss ?? filing.netIncome;
            const grossMargin = filing.GrossMargin ?? filing.grossMargin;
            const operatingMargin = filing.OperatingMargin ?? filing.operatingMargin;
            const labelInfo = buildQuarterLabel(filing, null, index);

            const filedDate = extractValidDate(filing.filed_date, filing.filingDate, filing.dateFiled);

            return {
                quarter: labelInfo.display,
                metadata: {
                    ...labelInfo,
                    filedDate: filedDate ? formatDate(filedDate) : null,
                    filedTimestamp: filedDate ? filedDate.getTime() : null,
                },
                revenue: revenueRaw != null ? revenueRaw / 1e9 : null,
                netIncome: netIncomeRaw != null ? netIncomeRaw / 1e9 : null,
                grossMargin: grossMargin ?? null,
                operatingMargin: operatingMargin ?? null,
            };
        });

        const sorted = normalized.sort((a, b) => {
            const aTime = a.metadata.periodTimestamp ?? a.metadata.filedTimestamp ?? 0;
            const bTime = b.metadata.periodTimestamp ?? b.metadata.filedTimestamp ?? 0;
            return bTime - aTime;
        });

        const limited = sorted.slice(0, 8);

        return limited.reverse();
    }, [filings]);

    if (!symbol) {
        return <div style={{ padding: "1rem", color: "#9ca3af" }}>No symbol provided</div>;
    }

    if (points.length === 0) {
        return <div style={{ padding: "1rem", color: "#9ca3af" }}>No quarterly data available</div>;
    }

    const labels = points.map((point) => point.quarter);
    const revenueValues = points.map((point) => (point.revenue != null ? Number(point.revenue) : null));
    const netIncomeValues = points.map((point) => (point.netIncome != null ? Number(point.netIncome) : null));
    const grossMarginValues = points.map((point) => (point.grossMargin != null ? Number(point.grossMargin) : null));
    const operatingMarginValues = points.map((point) => (point.operatingMargin != null ? Number(point.operatingMargin) : null));

    const datasetsConfig = [
        {
            id: "revenue",
            label: "Revenue (Billions USD)",
            data: revenueValues,
            borderColor: "#3b82f6",
            backgroundColor: "#3b82f6",
            yAxisID: "yRevenue",
            spanGaps: true,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 5,
            fill: false,
        },
        {
            id: "netIncome",
            label: "Net Income (Billions USD)",
            data: netIncomeValues,
            borderColor: "#f59e0b",
            backgroundColor: "#f59e0b",
            yAxisID: "yRevenue",
            spanGaps: true,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 5,
            fill: false,
        },
        {
            id: "grossMargin",
            label: "Gross Margin (%)",
            data: grossMarginValues,
            borderColor: "#10b981",
            backgroundColor: "#10b981",
            yAxisID: "yMargin",
            spanGaps: true,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 5,
            fill: false,
        },
        {
            id: "operatingMargin",
            label: "Operating Margin (%)",
            data: operatingMarginValues,
            borderColor: "#8b5cf6",
            backgroundColor: "#8b5cf6",
            yAxisID: "yMargin",
            spanGaps: true,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 5,
            fill: false,
        },
    ];

    const datasets = datasetsConfig.filter((dataset) => dataset.data.some(hasNumericValue));

    if (datasets.length === 0) {
        return <div style={{ padding: "1rem", color: "#9ca3af" }}>No quarterly metrics available for charting</div>;
    }

    const revenueExtents = revenueValues.filter(hasNumericValue);
    const marginExtents = [...grossMarginValues, ...operatingMarginValues].filter(hasNumericValue);
    const marginMin = marginExtents.length > 0 ? Math.min(...marginExtents) : 0;
    const marginMax = marginExtents.length > 0 ? Math.max(...marginExtents) : 50;

    const firstPeriod = points[0]?.metadata?.baseLabel;
    const lastPeriod = points[points.length - 1]?.metadata?.baseLabel;
    const summaryParts = [`Showing ${labels.length} filings`];
    if (firstPeriod && lastPeriod) {
        summaryParts.push(`Periods: ${firstPeriod} -> ${lastPeriod}`);
    }
    if (revenueExtents.length > 0) {
        summaryParts.push(
            `Revenue range: $${Math.min(...revenueExtents).toFixed(2)}B - $${Math.max(...revenueExtents).toFixed(2)}B`
        );
    }
    const summaryText = summaryParts.join(" | ");

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
            mode: "nearest",
        },
        plugins: {
            legend: {
                display: true,
                position: "bottom",
                labels: {
                    color: "#d1d5db",
                },
            },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const datasetLabel = context.dataset?.label || "";
                        const value = context.parsed?.y;
                        if (value == null) {
                            return datasetLabel;
                        }
                        if (context.dataset?.yAxisID === "yMargin") {
                            return `${datasetLabel}: ${value.toFixed(1)}%`;
                        }
                        return `${datasetLabel}: $${value.toFixed(2)}B`;
                    },
                    afterBody: (items) => {
                        if (!items || items.length === 0) return;
                        const { dataIndex } = items[0];
                        const detail = points[dataIndex]?.metadata;
                        if (!detail) return;
                        const lines = [];
                        if (detail.periodDate) {
                            lines.push(`Period: ${detail.periodDate}`);
                        }
                        if (detail.documentType) {
                            lines.push(`Document: ${detail.documentType}`);
                        }
                        if (detail.fiscalYear && detail.periodFocus) {
                            lines.push(`Fiscal: ${detail.fiscalYear} ${detail.periodFocus}`);
                        }
                        return lines;
                    },
                },
            },
        },
        scales: {
            x: {
                ticks: {
                    color: "#9ca3af",
                },
                grid: {
                    color: "rgba(75, 85, 99, 0.2)",
                },
            },
            yRevenue: {
                type: "linear",
                position: "left",
                ticks: {
                    color: "#9ca3af",
                    callback: (value) => `$${Number(value).toFixed(1)}B`,
                },
                grid: {
                    color: "rgba(75, 85, 99, 0.2)",
                },
            },
            yMargin: {
                type: "linear",
                position: "right",
                beginAtZero: marginMin >= 0,
                suggestedMin: marginMin < 0 ? marginMin * 1.15 : undefined,
                suggestedMax: marginMax > 0 ? Math.min(marginMax * 1.15, 120) : 50,
                ticks: {
                    color: "#9ca3af",
                    callback: (value) => `${value}%`,
                },
                grid: {
                    drawOnChartArea: false,
                },
            },
        },
    };

    const chartData = {
        labels,
        datasets,
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", minHeight: `${height}px` }}>
            <div style={{ padding: "0.25rem 0.5rem", color: "#9ca3af", fontSize: "0.8rem" }}>{summaryText}</div>
            <div style={{ flex: 1, position: "relative", minHeight: `${Math.max(height - 40, 240)}px` }}>
                <Line options={chartOptions} data={chartData} />
            </div>
        </div>
    );
};

export default QuarterlyTrendsChart;
