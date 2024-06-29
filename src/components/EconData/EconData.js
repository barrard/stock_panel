import React, { useEffect, useState, useRef } from "react";
import API from "../API";
import Chart from "chart.js/auto";
import { CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";

import "chartjs-adapter-date-fns";
import { enUS } from "date-fns/locale";
import zoomPlugin from "chartjs-plugin-zoom";

import Select from "../charts/pixiChart/components/Select";

// Register the date adapter
Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, zoomPlugin);

function getSentimentValue(sentiment) {
    switch (sentiment?.toLowerCase()) {
        case "low volatility expected":
            return 1;
        case "moderate volatility expected":
            return 2;
        case "high volatility expected":
            return 3;
        default:
            return 0; // For any unexpected sentiment values
    }
}

export default function EconData() {
    const [eventTypes, setEventTypes] = useState([]);
    const [selectedEventType, setSelectedEventType] = useState({ value: null, name: "Select" });
    const [eventInstances, setEventInstances] = useState([]);
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    async function getData() {
        const eventTypes = await API.getEconEventTypes();

        // Sort the eventTypes array
        eventTypes.sort((a, b) => {
            const sentimentA = getSentimentValue(a.sentiment);
            const sentimentB = getSentimentValue(b.sentiment);
            return sentimentB - sentimentA;
        });
        console.log(eventTypes);

        setEventTypes(eventTypes);
    }

    async function getEventInstances(eventType) {
        const instances = await API.getEconEventInstances(selectedEventType);
        // console.log(instances);
        setEventInstances(instances);
    }

    useEffect(() => {
        getData();
    }, []);

    useEffect(() => {
        if (selectedEventType.value) {
            getEventInstances(selectedEventType);
        }
    }, [selectedEventType]);

    useEffect(() => {
        if (eventInstances.length > 0) {
            renderChart();
        }
    }, [eventInstances]);

    function renderChart() {
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const ctx = chartRef.current.getContext("2d");

        const sortedData = eventInstances.sort((a, b) => new Date(a.date) - new Date(b.date));

        // console.log(sortedData);
        const chartData = {
            labels: sortedData.map((item) => new Date(item.date)), // Convert to Date objects
            datasets: [
                {
                    label: "Actual",
                    data: sortedData.map((item) => ({ x: new Date(item.date), y: parseFloat(item.actual) })),
                    borderColor: "rgb(75, 192, 192)",
                    tension: 0.1,
                },
                {
                    label: "Forecast",
                    data: sortedData.map((item) => ({ x: new Date(item.date), y: item.forecast ? parseFloat(item.forecast) : null })),
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
        <div className="row">
            {selectedEventType.value && <h2>{selectedEventType.name}</h2>}
            <div className="col-auto">
                <Select
                    label="Event Type"
                    value={selectedEventType}
                    setValue={setSelectedEventType}
                    options={eventTypes.map((et) => ({ value: et._id, name: et.event, time: et.time, sentiment: et.sentiment, eventLink: et.eventLink }))}
                />
            </div>
            {eventInstances.length > 0 && (
                <div className="col-10">
                    <canvas ref={chartRef} />
                    <button onClick={() => chartInstance.current.resetZoom()}>Reset Zoom</button>
                </div>
            )}
        </div>
    );
}
