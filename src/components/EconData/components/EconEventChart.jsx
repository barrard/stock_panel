import React, { useRef, useEffect } from "react";
import Chart from "chart.js/auto";
import "chartjs-adapter-date-fns";
import { enUS } from "date-fns/locale";
import zoomPlugin from "chartjs-plugin-zoom";
import { CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";

// Register the date adapter
Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, zoomPlugin);

export default function EconEventChart({ eventInstances }) {
    const chartInstance = useRef(null);

    const chartRef = useRef(null);

    useEffect(() => {
        console.log("chartRef.current", chartRef.current);
        if (!chartRef.current) return;
        console.log("chartRef.current", chartRef.current);

        if (eventInstances.length > 0) {
            console.log("chartRef.current", chartRef.current);

            renderChart();
        }
    }, [eventInstances, chartRef.current]);

    function renderChart() {
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const ctx = chartRef.current.getContext("2d");

        const sortedData = eventInstances.sort((a, b) => new Date(a.date) - new Date(b.date));

        const diffs = sortedData.map((item) => ({
            x: new Date(item.date),
            y: item.forecast && item.actual ? parseFloat(item.actual) - parseFloat(item.forecast) : 0,
            // y: Math.random() * 100,
        }));
        const down = (ctx, value) => (ctx.p0.raw?.y > ctx.p1.raw?.y ? value : undefined);
        const up = (ctx, value) => (ctx.p0.raw?.y < ctx.p1.raw?.y ? value : undefined);
        // console.log(sortedData);
        const chartData = {
            labels: sortedData.map((item) => new Date(item.date)), // Convert to Date objects
            datasets: [
                {
                    label: "Diff",
                    clip: 0,
                    data: diffs,
                    type: "line",
                    point: "red",
                    segment: {
                        borderColor: (ctx) => up(ctx, "green") || down(ctx, "red") || "gray",
                        backgroundColor: (ctx) => up(ctx, "green") || down(ctx, "red") || "gray",
                    },

                    pointBackgroundColor: function (context) {
                        const value = context.raw?.y;
                        return value < 0 ? "red" : "green";
                    },
                    pointBorderColor: function (context) {
                        const value = context.raw?.y;
                        return value < 0 ? "red" : "green";
                    },
                    pointRadius: 4,
                    fill: false,
                    yAxisID: "y1",
                    tension: 0, // Set to 0 for straight lines between points
                },
                {
                    label: "Diff",
                    data: diffs,
                    type: "bar",
                    borderColor: function (context) {
                        const value = context.raw.y;
                        return value < 0 ? "red" : "green";
                    },
                    backgroundColor: function (context) {
                        const value = context.raw.y;
                        return value < 0 ? "rgba(255, 0, 0, 0.5)" : "rgba(0, 255, 0, 0.5)";
                    },
                    yAxisID: "y1",
                    borderWidth: 1, // Reduced from 10 to make the color more visible
                    barPercentage: 1,
                    categoryPercentage: 1,
                },
                {
                    label: "Actual",
                    data: sortedData.map((item) => ({ x: new Date(item.date), y: parseFloat(item.actual) })),
                    borderColor: "rgb(75, 192, 192)",
                    tension: 0.1,
                    yAxisID: "y", // This assigns the dataset to the new y-axis
                },
                {
                    label: "Forecast",
                    data: sortedData.map((item) => ({ x: new Date(item.date), y: item.forecast ? parseFloat(item.forecast) : null })),
                    borderColor: "rgb(255, 99, 132)",
                    tension: 0.1,
                    yAxisID: "y", // This assigns the dataset to the new y-axis
                },
            ],
        };

        chartInstance.current = new Chart(ctx, {
            type: "line",
            data: chartData,

            options: {
                responsive: true,
                scales: {
                    x: {
                        type: "time",
                        // time: {
                        //     unit: "month",
                        // },
                        // min: new Date().getTime() - 1000 * 60 * 60 * 24 * 1000,
                        // max: new Date(),
                        adapters: {
                            date: {
                                locale: enUS,
                            },
                        },
                        title: {
                            display: true,
                            text: "Date",
                        },
                    },

                    y1: {
                        categoryPercentage: 0,
                        barPercentage: 0,
                        beginAtZero: false,

                        type: "linear",
                        position: "left",
                        barThickness: 120,
                        stack: "d",
                        stackWeight: 4,
                        title: {
                            display: true,
                            text: "Difference",
                        },
                    },
                    y: {
                        title: {
                            display: true,
                            text: "Value",
                        },
                        stack: "d",
                        stackWeight: 5,
                    },
                },
                plugins: {
                    annotation: {
                        annotations: {
                            line1: {
                                type: "line",
                                yMin: 0,
                                yMax: 0,
                                borderColor: "rgba(111,111,111, 0.3)",
                                borderWidth: 2,
                                yScaleID: "y1", // This should match the yAxisID of your Diff dataset
                            },
                        },
                    },

                    title: {
                        display: true,
                        text: "Actual vs Forecast Values Over Time",
                    },
                    crosshair: {
                        line: {
                            color: "#F66", // crosshair line color
                            width: 1, // crosshair line width
                        },
                        sync: {
                            enabled: true, // enable trace line syncing with other charts
                            group: 1, // chart group
                            suppressTooltips: false, // suppress tooltips when showing a synced tracer
                        },
                        zoom: {
                            enabled: true, // enable zooming
                            zoomboxBackgroundColor: "rgba(66,133,244,0.2)", // background color of zoom box
                            zoomboxBorderColor: "#48F", // border color of zoom box
                            zoomButtonText: "Reset Zoom", // reset zoom button text
                            zoomButtonClass: "reset-zoom", // reset zoom button class
                        },
                        callbacks: {
                            beforeZoom: () =>
                                function (start, end) {
                                    // called before zoom, return false to prevent zoom
                                    return true;
                                },
                            afterZoom: () =>
                                function (start, end) {
                                    // called after zoom
                                },
                        },
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                let label = context.dataset.label || "";
                                if (label) {
                                    label += ": ";
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y.toFixed(3);
                                }
                                return label;
                            },
                        },
                    },
                    zoom: {
                        zoom: {
                            wheel: {
                                enabled: true,
                            },
                            pinch: {
                                enabled: true,
                            },
                            mode: "x",
                        },
                        pan: {
                            enabled: true,
                            mode: "x",
                        },
                        limits: {
                            x: { min: "original", max: "original" },
                            y: { min: "original", max: "original" },
                        },
                    },
                },
            },
        });
    }

    return (
        <>
            <canvas ref={chartRef} />
            <button onClick={() => chartInstance.current.resetZoom()}>Reset Zoom</button>
        </>
    );
}
