import React, { useEffect } from "react";
import Chart from "chart.js/auto";
import moment from "moment";

export default function BacktestResultsChart(props) {
    console.log(props);
    const ohlc = props.data.largerTimeFrames?[1];
    // const ohlc = props.data.seconds;
    const volumeData = ohlc.map((d) => ({ volume: d.bVol + d.aVol, time: d.dt }));
    const priceData = ohlc.map((d) => ({ o: d.o, c: d.c, time: d.dt }));

    useEffect(() => {
        const myChart = new Chart(document.getElementById("backtestResultsChart"), {
            type: "bar",
            options: {
                scales: {
                    x: {
                        // max: 5000,
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
                                debugger;
                                debugger;
                                return formatter.format(value);
                            },
                        },
                        // labels: priceData.map((d) => d.o),
                        stack: "d",
                        stackWeight: 2,
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
                },
            },
            data: {
                labels: volumeData.map((row) => row.time),
                datasets: [
                    {
                        // label: "Acquisitions by year",
                        data: priceData.map((row) => row.c),
                        backgroundColor: "yellow",
                        yAxisID: "price",
                        type: "line",
                    },
                    {
                        // label: "Acquisitions by year",
                        data: volumeData.map((row) => row.volume),
                        backgroundColor: "yellow",
                        yAxisID: "volume",
                    },
                ],
            },
        });

        return () => {
            myChart.destroy();
        };
    }, [props.data]);

    return (
        <div>
            <canvas id="backtestResultsChart"></canvas>
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
    style: "currency",
    currency: "USD",

    // These options are needed to round to whole numbers if that's what you want.
    //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
    //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
});
