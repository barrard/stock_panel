import React, { useEffect, useState, useRef } from "react";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import annotationPlugin from "chartjs-plugin-annotation";
import zoomPlugin from "chartjs-plugin-zoom";

import { filtersNameMap, findDistribution } from "../fundamentalsUtils";

import { Range } from "react-range";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    annotationPlugin,
    zoomPlugin
);
export default function DistroChart(props) {
    const chartRef = useRef(null);
    const {
        fundamentals,
        name,
        appliedFilters,
        setAppliedFilters,
        deviations,
        filteredStocks,
        setFilteredStocks,
        data = {},
    } = props;
    const [min, setMin] = useState(0);
    const [max, setMax] = useState(50);
    // const [data, setData] = useState({});
    const [range, setRange] = useState([0, 100]);
    const [startingRange, setStartingRange] = useState([0, 100]);

    const [labels, setLabels] = useState([]);
    const [values, setValues] = useState([]);

    const hasAppliedFilter = appliedFilters[name];

    useEffect(() => {
        if (!chartRef.current) return;
        // console.log(chartRef);
        // const { ctx, chartArea, scales } = chartRef.current;
        // const chartWidth = chartArea.right - chartArea.left;
        // const chartHeight = chartArea.bottom - chartArea.top;
        // const gradient = ctx.createLinearGradient(
        //     chartArea.left,
        //     0,
        //     chartArea.right,
        //     0
        // );

        // const zero = scales.x.getPixelForValue(0);
        // const start = scales.x.getPixelForValue(-3);
        // const end = scales.x.getPixelForValue(6);
        // console.log({ zero, start, end });
    }, [chartRef.current]);

    // useEffect(() => {
    //     setData(
    //         findDistribution({
    //             fundamentals,
    //             name,
    //             appliedFilters,
    //             deviations,
    //             filteredStocks,
    //         })
    //     );
    // }, [fundamentals, appliedFilters]);

    useEffect(() => {
        const labels = Object.keys(data).sort((a, b) => {
            // console.log("sorting");
            return a - b;
        });

        const values = labels.map((l) => data[l]);
        if (labels.length < 1) return;
        const range = [Math.min(...labels), Math.max(...labels)];
        // debugger;
        // console.log(range);
        setRange(range);
        setStartingRange(range);
        setMin(range[0]);
        setMax(range[1]);
        setValues(values);
        setLabels(labels);
    }, [data]);

    useEffect(() => {
        if (min === startingRange[0] && max === startingRange[1]) return;
        console.log({ min, max });
    }, [min, max]);

    // console.log({ labels, values, range, min, max });

    function onZoom(chart) {
        console.log("SHE ZOOM");
        console.log(chart);
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

    const d = {
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
        console.log(value);
        setMin(value[0]);

        setMax(value[1]);
    }

    function onFinalChangeMinMaxFilter(values) {
        setAppliedFilters((appliedFilters) => {
            const newFilter = {
                ...appliedFilters,
                [name]: values,
            };
            debugger;
            return newFilter;
        });
    }

    if (!labels.length) {
        return <></>;
    }

    return (
        <>
            {/* {values.length > 0 && ( */}
            <Bar ref={chartRef} options={options} data={d} />
            {/* // )} */}

            <MyRange
                values={[min, max]}
                min={range[0]}
                max={range[1]}
                onChange={onChange}
                onFinalChange={onFinalChangeMinMaxFilter}
            />
            {appliedFilters[name] !== undefined && (
                <button
                    onClick={() => {
                        setAppliedFilters((appliedFilters) => {
                            const newFilter = {
                                ...appliedFilters,
                            };

                            delete newFilter[name];
                            // setMin(startingRange[0]);
                            // setMax(startingRange[1]);
                            setRange(startingRange);
                            debugger;
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
                            border: `2px solid ${
                                props.key == 0 ? "red" : "green"
                            }`,
                            backgroundColor: "#666",
                        }}
                    />
                );
            }}
        />
    );
}
