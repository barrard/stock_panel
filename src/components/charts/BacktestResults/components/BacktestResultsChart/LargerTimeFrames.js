import React, { useEffect } from "react";
import Chart from "chart.js/auto";
import moment from "moment";
import tradeMarker from "../chartPlugins/TradeMarker";

const candlesSticks = {
    id: "candlesticks",
};

export default function LargerTimeFrames(props) {
    console.log(props);
    const ohlc = props.data.largerTimeFrames?.[props.tf].map((d) => ({ ...d, dt: d.datetime }));
    const trades = props.trades;

    // const ohlc = props.data.seconds;
    const volumeData = ohlc.map((d) => ({ volume: d.volume, time: d.datetime }));
    const priceData = ohlc.map((d) => ({ o: d.open, c: d.close, time: d.datetime }));
    const VALData = ohlc.map((d) => ({ val: d.valueAreaHigh, time: d.datetime }));
    const VAHData = ohlc.map((d) => ({ vah: d.valueAreaLow, time: d.datetime }));
    const VPOCData = ohlc.map((d) => ({ vpoc: d.VPOC, time: d.datetime }));
    const hasVolMomo = ohlc.find((d) => d.volMomo);
    let volMomo = [];
    if (hasVolMomo) {
        volMomo = ohlc.map((d) => ({ volMomo: d.volMomo, time: d.datetime }));
        console.log({ volMomo });
    }

    useEffect(() => {
        const datasets = [
            {
                // yAxisID: "price",
                data: ohlc,
                // borderColor: "blue",
                // borderWidth: 2,
                // pointRadius: 0,
                id: "ohlc",
            },

            {
                yAxisID: "price",
                data: VPOCData.map((row) => row.vpoc),
                type: "line",
                borderColor: "blue",
                borderWidth: 2,
                pointRadius: 0,
                id: "VPOC",
            },
            {
                data: VALData.map((row) => row.val),

                yAxisID: "price",
                type: "line",
                borderColor: "red",
                borderWidth: 2,
                pointRadius: 0,
                id: "VAL",
            },
            {
                data: VAHData.map((row) => row.vah),

                yAxisID: "price",
                type: "line",
                borderColor: "green",
                borderWidth: 2,
                pointRadius: 0,
                id: "VAH",
            },
            {
                // label: "Acquisitions by year",
                data: priceData.map((row) => row.c),
                yAxisID: "price",
                type: "line",
                borderColor: "yellow",
                borderWidth: 2,
                pointRadius: 0,
                id: "close",
            },
            {
                // label: "Acquisitions by year",
                data: volumeData.map((row) => row.volume),
                backgroundColor: "yellow",
                yAxisID: "volume",
                id: "volume",
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
        ];
        if (hasVolMomo) {
            datasets.push({
                id: "volMomo",
                yAxisID: "volMomo",
                data: volMomo.map((row) => row.volMomo),
                type: "line",
                borderColor: "blue",
                borderWidth: 2,
                pointRadius: 0,
            });
        }
        const chartData = {
            labels: volumeData.map((row) => row.time),
            datasets,
        };
        const chartConfig = {
            type: "bar",
            options: {
                scales: {
                    x: {
                        ticks: {
                            callback: function (value) {
                                return moment(this.getLabelForValue(value)).format("HH:mm");
                            },
                        },
                    },
                    volume: {
                        position: "left",
                        ticks: {
                            callback: (value) => nFormatter(value, 1),
                        },

                        beginAtZero: true,
                        stack: "d",
                        stackWeight: 1,
                        type: "linear",
                        // offset: true,
                    },
                    price: {
                        beginAtZero: false,
                        type: "linear",
                        position: "left",
                        ticks: {
                            callback: function (value) {
                                return formatter.format(value);
                            },
                        },
                        stack: "d",
                        stackWeight: 4,
                        // offset: true,
                        // grid: {
                        //     borderColor: "#fff",
                        // },
                    },
                    ...(hasVolMomo && {
                        volMomo: {
                            beginAtZero: false,
                            type: "linear",
                            position: "left",
                            ticks: {
                                callback: (value) => nFormatter(value, 1),
                            },
                            stack: "d",
                            stackWeight: 2,
                            // offset: true,
                        },
                    }),
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
            plugins: [candlesSticks, tradeMarker],
        };
        const myChart = new Chart(document.getElementById("backtestResultsChart" + props.guid), chartConfig);

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
