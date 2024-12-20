import React, { useEffect, useState, useRef } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import { Bar } from "react-chartjs-2";
import annotationPlugin from "chartjs-plugin-annotation";
import zoomPlugin from "chartjs-plugin-zoom";

import { filtersNameMap, findDistribution } from "../fundamentalsUtils";

import { Range } from "react-range";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, annotationPlugin, zoomPlugin);
export default function DistroChart(props) {
    const chartRef = useRef(null);
    const { fundamentals, name, appliedFilters, setAppliedFilters, deviations, filteredStocks, setFilteredStocks, data = {} } = props;
    const [min, setMin] = useState(0);
    const [max, setMax] = useState(50);
    // const [data, setData] = useState({});
    const [range, setRange] = useState([0, 100]);
    const [startingRange, setStartingRange] = useState([0, 100]);

    const [labels, setLabels] = useState([]);
    const [values, setValues] = useState([]);

    const hasAppliedFilter = appliedFilters[name];

    useEffect(() => {
        const labels = Object.keys(data).sort((a, b) => a - b);
        const values = labels.map((l) => data[l]);
        if (labels.length < 1) return;
        const range = [Math.min(...labels), Math.max(...labels)];
        if (range[0] === range[1]) {
            debugger;
            range[0] = 0;
            range[1] = 1;
        }
        setRange(range);
        setStartingRange(range);
        setMin(range[0]);
        setMax(range[1]);
        setValues(values);
        setLabels(labels);
    }, [data]);

    useEffect(() => {
        if (min === startingRange[0] && max === startingRange[1]) return;
    }, [min, max]);

    function onZoom(chart) {
        const { minIndex, maxIndex } = chart.scales.x;
        console.log({ minIndex, maxIndex });
    }

    const options = {
        chartArea: {
            // height: 1000,
        },
        responsive: true,
        layout: {
            // padding: 10,
        },
        plugins: {
            legend: {
                position: "top",
            },
            title: {
                display: true,
                text: `${filtersNameMap[name].name} Bar Chart`,
            },
            annotation: {
                annotations: {
                    maxLine: {
                        // Indicates the type of annotation
                        type: "line",
                        yMin: 0, //Math.min(...values),
                        yMax: Math.max(...values),
                        xMin: max,
                        xMax: max,
                        borderColor: "lawngreen",
                        borderWidth: 4,
                    },
                    minLine: {
                        // Indicates the type of annotation
                        type: "line",
                        yMin: 0, //Math.min(...values),
                        yMax: Math.max(...values),
                        xMin: min,
                        xMax: min,
                        borderColor: "darkred",
                        borderWidth: 4,
                    },
                },
            },
            zoom: {
                pan: {
                    enabled: true,
                    threshold: 0.1,

                    mode: "x",
                    onPanComplete: ({ chart }) => {
                        console.log("onPanComplete");
                        onZoom(chart);
                    },
                },
                zoom: {
                    wheel: {
                        enabled: true,
                    },
                    pinch: {
                        enabled: true,
                    },
                    mode: "x",
                },
            },
        },

        scales: {
            x: {
                type: "linear",
                // grace: -2,
                bounds: "data",
                min: range[0] - 0.1,
                max: range[1] + 0.1,
                ticks: {
                    // padding: 0,
                    backdropPadding: 10,
                },
                grid: {
                    // offset: true,
                    // drawBorder: true,
                    // borderColor: "red",
                },
            },
            y: {
                ticks: {
                    // padding: 0,
                },
            },
        },
    };

    const distroData = {
        labels,
        datasets: [
            {
                label: "Dataset 1",
                data: values,
                backgroundColor: "red",
            },
        ],
    };

    function onChange(value) {
        setMin(value[0]);

        setMax(value[1]);
    }

    function onFinalChangeMinMaxFilter(values) {
        setAppliedFilters((appliedFilters) => {
            const newFilter = {
                ...appliedFilters,
                [name]: values,
            };
            return newFilter;
        });
    }

    if (!labels.length) {
        return <></>;
    }

    return (
        <>
            {/* {values.length > 0 && ( */}
            <Bar ref={chartRef} options={options} data={distroData} />
            {/* // )} */}

            <MyRange values={[min, max]} min={range[0]} max={range[1]} onChange={onChange} onFinalChange={onFinalChangeMinMaxFilter} />
            {appliedFilters[name] !== undefined && (
                <button
                    onClick={() => {
                        setAppliedFilters((appliedFilters) => {
                            const newFilter = {
                                ...appliedFilters,
                            };

                            delete newFilter[name];

                            setRange(startingRange);
                            setFilteredStocks({});
                            return newFilter;
                        });
                    }}
                >
                    CLEAR
                </button>
            )}
        </>
    );
}

function MyRange(props) {
    return (
        <Range
            step={0.1}
            min={props.min}
            max={props.max}
            values={props.values}
            onChange={props.onChange}
            onFinalChange={props.onFinalChange}
            renderTrack={({ props, children }) => {
                // console.log(props, children);
                return (
                    <div
                        style={{
                            ...props.style,
                            height: "4px",
                            width: "100%",
                            display: "flex",
                            justifyContent: "center",
                        }}
                    >
                        <div
                            {...props}
                            style={{
                                ...props.style,
                                height: "4px",
                                width: "100%",
                                margin: "0 2.9em 0 4.7em",
                                backgroundColor: "red",
                            }}
                        >
                            {children}
                        </div>
                    </div>
                );
            }}
            renderThumb={({ props }) => {
                return (
                    <div
                        {...props}
                        style={{
                            ...props.style,
                            height: "22px",
                            width: "22px",
                            borderRadius: "50%",
                            border: `2px solid ${props.key == 0 ? "red" : "green"}`,
                            backgroundColor: "#666",
                        }}
                    />
                );
            }}
        />
    );
}
