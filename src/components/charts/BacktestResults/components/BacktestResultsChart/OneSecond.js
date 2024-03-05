import React, { useEffect } from "react";
import Chart from "chart.js/auto";
import moment from "moment";

import tradeMarker from "../chartPlugins/TradeMarker";

export default function BacktestResultsChart(props = {}) {
    console.log(props);
    // const ohlc = props.data.largerTimeFrames?[1];
    const ohlc = props.data.seconds;
    const trades = props.trades;
    const volumeData = ohlc.map((d) => ({ y: d.bVol + d.aVol, x: d.dt }));
    const priceData = ohlc.map((d) => ({ o: d.o, c: d.c, y: d.c, x: d.dt }));
    const ma200 = getMA(priceData, 600);
    // const _200Ma = priceData.map((d) => ({ o: d.o, c: d.c, time: d.dt }));
    const VALData = ohlc.map((d) => ({ y: d.valueAreaLow, x: d.datetime }));
    const VAHData = ohlc.map((d) => ({ y: d.valueAreaHigh, x: d.datetime }));
    const VPOCData = ohlc.map((d) => ({ y: d.VPOC, x: d.datetime }));

    function getMA(data, period) {
        const ma = new Array(period);

        for (let x = period; x < data.length; x++) {
            let slicedData = data.slice(x - period, x);
            const prices = slicedData.map((d) => d.y);
            const avg = prices.reduce((acc, p) => (acc += p), 0) / prices.length;
            ma.push({ x: data[x].x, y: avg });
        }
        return ma;
    }

    useEffect(() => {
        const chartData = {
            labels: volumeData.map((row) => row.x),
            datasets: [
                {
                    // yAxisID: "price",
                    data: ohlc,
                    // borderColor: "blue",
                    // borderWidth: 2,
                    // pointRadius: 0,
                    id: "ohlc",
                    parsing: false,
                },

                {
                    yAxisID: "price",
                    data: VPOCData.map((row) => row.y),
                    type: "line",
                    borderColor: "blue",
                    borderWidth: 2,
                    pointRadius: 0,
                    id: "VPOC",
                    // parsing: false,
                },
                {
                    data: VALData.map((row) => row.y),

                    yAxisID: "price",
                    type: "line",
                    borderColor: "green",
                    borderWidth: 2,
                    pointRadius: 0,
                    id: "VAL",
                    // parsing: false,
                },

                {
                    data: ma200.map((row) => row.y),

                    yAxisID: "price",
                    type: "line",
                    borderColor: "pink",
                    borderWidth: 1,
                    pointRadius: 0,
                    id: "ma200",
                    // parsing: false,
                },

                {
                    data: VAHData.map((row) => row.y),

                    yAxisID: "price",
                    type: "line",
                    borderColor: "red",
                    borderWidth: 2,
                    pointRadius: 0,
                    id: "VAH",
                    // parsing: false,
                },
                {
                    // label: "Acquisitions by year",
                    data: priceData.map((row) => row.y),
                    yAxisID: "price",
                    type: "line",
                    borderColor: "yellow",
                    borderWidth: 2,
                    pointRadius: 0,
                    id: "close",
                    // parsing: false,
                },
                {
                    // label: "Acquisitions by year",
                    data: volumeData.map((row) => row.y),
                    backgroundColor: "yellow",
                    yAxisID: "volume",
                    id: "volume",
                    // parsing: false,
                },
                {
                    yAxisID: "price",
                    data: trades,
                    type: "line",
                    // borderColor: "blue",
                    // borderWidth: 2,
                    // pointRadius: 0,
                    id: "trades",
                },
            ],
        };
        const config = {
            type: "bar",
            options: {
                scales: {
                    x: {
                        // max: 5,
                        ticks: {
                            callback: function (value) {
                                return moment(this.getLabelForValue(value)).format("HH:mm");
                            },
                        },
                    },
                    volume: {
                        position: "left",
                        // max: 500,
                        ticks: {
                            callback: (value) => nFormatter(value, 1),
                        },

                        beginAtZero: true,
                        stack: "d",
                        stackWeight: 1,
                        type: "linear",
                    },
                    price: {
                        beginAtZero: false,
                        type: "linear",
                        position: "left",
                        // max: 500,
                        ticks: {
                            callback: function (value) {
                                return formatter.format(value);
                            },
                        },
                        // labels: priceData.map((d) => d.o),
                        stack: "d",
                        stackWeight: 4,
                        offset: true,
                        // grid: {
                        //     borderColor: "#fff",
                        // },
                    },
                },
                animation: false,
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        enabled: false,
                    },

                    zoom: {
                        pan: {
                            enabled: true,
                            threshold: 0.1,

                            mode: "x",
                            onPanComplete: ({ chart }) => {
                                console.log("onPanComplete");
                                // onZoom(chart);
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
            },
            data: chartData,
            plugins: [tradeMarker],
        };
        const myChart = new Chart(document.getElementById("backtestResultsChart" + props.guid), config);

        return () => {
            myChart.destroy();
        };
    }, [props.data, trades]);

    return (
        <div>
            <canvas id={"backtestResultsChart" + props.guid}></canvas>
        </div>
    );
}

function nFormatter(num, digits) {
    const lookup = [
        { value: 1, symbol: "" },
        { value: 1e3, symbol: "k" },
        { value: 1e6, symbol: "M" },
        { value: 1e9, symbol: "G" },
        { value: 1e12, symbol: "T" },
        { value: 1e15, symbol: "P" },
        { value: 1e18, symbol: "E" },
    ];
    const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
    var item = lookup
        .slice()
        .reverse()
        .find(function (item) {
            return num >= item.value;
        });
    return item ? (num / item.value).toFixed(digits).replace(rx, "$1") + item.symbol : "0";
}

// Create our number formatter.
const formatter = new Intl.NumberFormat("en-US", {
    // style: "currency",
    // currency: "USD",

    // These options are needed to round to whole numbers if that's what you want.
    minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
    //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
});
