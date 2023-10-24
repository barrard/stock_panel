import React, { useEffect, useState, useRef } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import { Chart as ChartComponent, Bar, Line } from "react-chartjs-2";
import annotationPlugin from "chartjs-plugin-annotation";
import zoomPlugin from "chartjs-plugin-zoom";
import API from "../../API";
import styled from "styled-components";
import { CandlestickController, CandlestickElement, OhlcController, OhlcElement } from "chartjs-chart-financial";

import { Range } from "react-range";

ChartJS.register(CandlestickController, CandlestickElement, OhlcController, OhlcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, annotationPlugin, zoomPlugin);
export default function BetterTickChart(props) {
    const chartRef = useRef(null);

    const [originalData, setOriginalData] = useState([]);
    const [data, setData] = useState([]);

    const [labels, setLabels] = useState([]);
    // const [values, setValues] = useState([]);

    async function loadData() {
        const customTicks = await API.getCustomTicks();
        console.log(customTicks);
        const ohlcData = customTicks.map((d) => ({
            o: d.open,
            h: d.high,
            l: d.low,
            c: d.close,
            x: new Date(d.datetime),
        }));
        debugger;
        setData(ohlcData);
        setOriginalData(customTicks);
    }
    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        const labels = data.map((d) => d.t);
        if (labels.length < 1) return;

        // setValues(data);
        setLabels(labels);
        debugger;
    }, [data]);

    function onZoom(chart) {
        const { minIndex, maxIndex } = chart.scales.x;
    }

    const ohlcData = {
        labels,
        datasets: [
            {
                label: "Stock Price",
                data: data,
                type: "ohlc", // change to 'ohlc' if you prefer
            },
        ],
    };

    const options = {
        legend: {
            display: false, // Disable the legend
        },
        tooltips: {
            enabled: false, // Disable tooltips
        },
        animation: false,
        responsive: true,

        plugins: {
            legend: {
                position: "top",
            },
            title: {
                display: true,
                text: `${"tick"} Bar Chart`,
            },
            annotation: {
                annotations: {
                    // maxLine: {
                    //     // Indicates the type of annotation
                    //     type: "line",
                    //     yMin: 0, //Math.min(...values),
                    //     yMax: Math.max(...values),
                    //     xMin: max,
                    //     xMax: max,
                    //     borderColor: "lawngreen",
                    //     borderWidth: 4,
                    // },
                    // minLine: {
                    //     // Indicates the type of annotation
                    //     type: "line",
                    //     yMin: 0, //Math.min(...values),
                    //     yMax: Math.max(...values),
                    //     xMin: min,
                    //     xMax: min,
                    //     borderColor: "darkred",
                    //     borderWidth: 4,
                    // },
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
                bounds: "data",
            },
        },
    };

    if (!labels.length) {
        return <></>;
    }

    return (
        <div>
            <ChartContainer>
                <ChartComponent type="ohlc" data={ohlcData} options={options} />
                {/* <ChartJS ref={chartRef} options={options} data={distroData} type="ohlc" /> */}
            </ChartContainer>
        </div>
    );
}

const ChartContainer = styled.div`
    width: 900px;
    position: relative;
    height: 550px;
    border: 1px solid red;
`;
