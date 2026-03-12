import React, { useEffect, useMemo, useState } from "react";
import "chartjs-adapter-date-fns";
import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Legend,
    TimeScale,
} from "chart.js";
import API from "../../../../API";

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend, TimeScale);

const MAX_POINTS = 600;

const latestValueTagPlugin = {
    id: "latestValueTag",
    afterDatasetsDraw(chart) {
        const { ctx, chartArea, scales } = chart;
        const yScale = scales?.y;
        if (!ctx || !chartArea || !yScale) return;

        chart.data.datasets.forEach((dataset, datasetIndex) => {
            const points = dataset.data || [];
            const lastPoint = [...points].reverse().find((point) => Number.isFinite(point?.y));
            if (!lastPoint) return;

            const y = yScale.getPixelForValue(lastPoint.y);
            if (!Number.isFinite(y) || y < chartArea.top || y > chartArea.bottom) return;

            const label = formatCompactNumber(Number(lastPoint.y));
            if (!label) return;

            ctx.save();
            ctx.font = "10px sans-serif";
            const textWidth = ctx.measureText(label).width;
            const paddingX = 6;
            const tagHeight = 16;
            const tagWidth = textWidth + paddingX * 2;
            const x = chartArea.right - tagWidth - 2;
            const tagY = y - tagHeight / 2;

            ctx.fillStyle = dataset.borderColor || "#94a3b8";
            ctx.beginPath();
            ctx.roundRect(x, tagY, tagWidth, tagHeight, 4);
            ctx.fill();

            ctx.fillStyle = "#020617";
            ctx.textBaseline = "middle";
            ctx.fillText(label, x + paddingX, y);
            ctx.restore();
        });
    },
};

const CHARTS = [
    {
        id: "advanceDecline",
        title: "Advance / Decline",
        series: [
            { key: "$ADVN", label: "$ADVN", color: "#22c55e" },
            { key: "$DECN", label: "$DECN", color: "#ef4444" },
        ],
    },
    {
        id: "volumeBreadth",
        title: "Up / Down Volume",
        series: [
            { key: "$UVOL", label: "$UVOL", color: "#38bdf8" },
            { key: "$DVOL", label: "$DVOL", color: "#f97316" },
        ],
    },
    {
        id: "tick",
        title: "TICK",
        series: [
            { key: "$TICK", label: "$TICK", color: "#eab308" },
            { key: "avgTICK", label: "avgTICK", color: "#f8fafc" },
        ],
    },
    {
        id: "trin",
        title: "TRIN",
        series: [
            { key: "$TRIN", label: "$TRIN", color: "#a855f7" },
            { key: "avgTRIN", label: "avgTRIN", color: "#f8fafc" },
        ],
    },
    {
        id: "vix",
        title: "VIX",
        series: [{ key: "$VIX", label: "$VIX", color: "#f43f5e" }],
    },
];

function formatCompactNumber(value) {
    if (!Number.isFinite(value)) return "";
    if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}K`;
    if (Math.abs(value) >= 100) return value.toFixed(0);
    if (Math.abs(value) >= 10) return value.toFixed(1);
    return value.toFixed(2);
}

function MarketBreadthChart({ title, data, series, compact = false }) {
    const chartData = useMemo(
        () => ({
            datasets: series.map(({ key, label, color }) => ({
                label,
                data: data
                    .map((point) => ({
                        x: point.datetime,
                        y: Number(point[key]),
                    }))
                    .filter((point) => Number.isFinite(point.y)),
                borderColor: color,
                backgroundColor: color,
                borderWidth: key.startsWith("avg") ? 2.25 : 1.5,
                pointRadius: 0,
                pointHoverRadius: 2,
                tension: 0.15,
                spanGaps: true,
            })),
        }),
        [data, series]
    );

    const options = useMemo(
        () => ({
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            normalized: true,
            interaction: {
                mode: "index",
                intersect: false,
            },
            plugins: {
                legend: {
                    position: "top",
                    align: "start",
                    labels: {
                        color: "#d1d5db",
                        boxWidth: 10,
                        boxHeight: 10,
                        usePointStyle: true,
                        pointStyle: "line",
                        padding: compact ? 8 : 12,
                        font: {
                            size: compact ? 10 : 11,
                        },
                    },
                },
                title: {
                    display: true,
                    text: title,
                    align: "start",
                    color: "#f8fafc",
                    font: {
                        size: compact ? 11 : 13,
                        weight: "600",
                    },
                    padding: {
                        bottom: compact ? 6 : 10,
                    },
                },
                tooltip: {
                    callbacks: {
                        title(items) {
                            const value = items?.[0]?.parsed?.x;
                            if (!Number.isFinite(value)) return "";
                            return new Date(value).toLocaleTimeString([], {
                                hour: "numeric",
                                minute: "2-digit",
                            });
                        },
                        label(context) {
                            return `${context.dataset.label}: ${formatCompactNumber(context.parsed.y)}`;
                        },
                    },
                },
            },
            scales: {
                x: {
                    type: "time",
                    time: {
                        unit: "minute",
                    },
                    grid: {
                        color: "rgba(148, 163, 184, 0.12)",
                    },
                    ticks: {
                        color: "#94a3b8",
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 6,
                        font: {
                            size: compact ? 9 : 10,
                        },
                    },
                },
                y: {
                    position: "right",
                    grid: {
                        color: "rgba(148, 163, 184, 0.12)",
                    },
                    ticks: {
                        color: "#94a3b8",
                        maxTicksLimit: 5,
                        font: {
                            size: compact ? 9 : 10,
                        },
                        callback(value) {
                            return formatCompactNumber(Number(value));
                        },
                    },
                },
            },
        }),
        [title]
    );

    return (
        <div
            style={{
                background: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: "12px",
                padding: compact ? "6px 8px 4px" : "10px 12px 8px",
                minHeight: compact ? "145px" : "240px",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
            }}
        >
            <div style={{ height: compact ? "120px" : "210px" }}>
                <Line data={chartData} options={options} plugins={[latestValueTagPlugin]} />
            </div>
        </div>
    );
}

const MarketBreadth = ({ Socket, compact = false }) => {
    const [breadthData, setBreadthData] = useState([]);
    const [error, setError] = useState("");

    useEffect(() => {
        let isMounted = true;

        const load = async () => {
            try {
                const data = await API.fetchMarketBreadth({
                    limit: MAX_POINTS,
                    sort: { _id: -1 },
                    filter: {},
                });

                if (!isMounted) return;
                setBreadthData(Array.isArray(data) ? data.slice(-MAX_POINTS) : []);
            } catch (err) {
                if (!isMounted) return;
                setError(err?.message || "Failed to load market breadth");
            }
        };

        load();

        const handleBreadthUpdate = (update) => {
            const nextPoint = {
                datetime: Date.now(),
                ...update,
            };

            setBreadthData((current) => {
                const next = current.concat(nextPoint);
                return next.length > MAX_POINTS ? next.slice(next.length - MAX_POINTS) : next;
            });
        };

        Socket?.on("market-breadth", handleBreadthUpdate);

        return () => {
            isMounted = false;
            Socket?.off("market-breadth", handleBreadthUpdate);
        };
    }, [Socket]);

    if (error) {
        return <div style={{ color: "#fca5a5", padding: "16px" }}>{error}</div>;
    }

    if (!breadthData.length) {
        return <div style={{ color: "#cbd5e1", padding: "16px" }}>Loading market breadth...</div>;
    }

    return (
        <div
            style={{
                minHeight: compact ? "auto" : "100%",
                background: "#020617",
                padding: compact ? "6px 8px" : "16px",
            }}
        >
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: compact ? "repeat(5, minmax(0, 1fr))" : "repeat(auto-fit, minmax(320px, 1fr))",
                    gap: compact ? "8px" : "16px",
                    overflowX: compact ? "auto" : "visible",
                }}
            >
                {CHARTS.map((chart) => (
                    <MarketBreadthChart key={chart.id} title={chart.title} data={breadthData} series={chart.series} compact={compact} />
                ))}
            </div>
        </div>
    );
};

export default React.memo(MarketBreadth);
