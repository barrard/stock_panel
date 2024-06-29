import React, { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

const EventChart = ({ data }) => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const ctx = chartRef.current.getContext("2d");

        const sortedData = data.sort((a, b) => new Date(a.date) - new Date(b.date));

        const chartData = {
            labels: sortedData.map((item) => item.date),
            datasets: [
                {
                    label: "Actual",
                    data: sortedData.map((item) => parseFloat(item.actual)),
                    borderColor: "rgb(75, 192, 192)",
                    tension: 0.1,
                },
                {
                    label: "Forecast",
                    data: sortedData.map((item) => (item.forecast ? parseFloat(item.forecast) : null)),
                    borderColor: "rgb(255, 99, 132)",
                    tension: 0.1,
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
                        time: {
                            unit: "year",
                        },
                        title: {
                            display: true,
                            text: "Date",
                        },
                    },
                    y: {
                        title: {
                            display: true,
                            text: "Value",
                        },
                    },
                },
                plugins: {
                    title: {
                        display: true,
                        text: "Actual vs Forecast Values Over Time",
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
                },
            },
        });

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [data]);

    return <canvas ref={chartRef} />;
};

export default EventChart;
