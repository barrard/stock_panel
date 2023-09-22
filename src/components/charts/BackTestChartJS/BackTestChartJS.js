// import React, { useEffect, useState, useRef } from "react";

// import { Chart as ChartJS } from "chart.js";
// import "chartjs-chart-financial";
// // import annotationPlugin from "chartjs-plugin-annotation";
// // import zoomPlugin from "chartjs-plugin-zoom";
// // import financialCharts from "chartjs-chart-financial";

// // import API from "../../API";

// // ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, annotationPlugin, zoomPlugin, financialCharts);

// export default function BackTestChartJS({ Socket, data }) {
//     data = parseData(data);

//     const canvas = document.getElementById("financialChart");
//     const ctx = canvas.getContext("2d");
//     new Chart(ctx, {
//         type: "candlestick",
//         data: {
//             datasets: [
//                 {
//                     label: "Financial Data",
//                     data: [
//                         { t: "2023-09-01", o: 100, h: 120, l: 90, c: 110 },
//                         { t: "2023-09-02", o: 110, h: 130, l: 100, c: 120 },
//                         // Add more data points here
//                     ],
//                 },
//             ],
//         },
//         options: {
//             scales: {
//                 x: {
//                     type: "time",
//                 },
//                 y: {
//                     beginAtZero: false,
//                 },
//             },
//         },
//     });
//     return (
//         <>
//             <h1>BasicLineSeries</h1>
//             <canvas id="financialChart" width="400" height="200"></canvas>
//         </>
//     );
// }

// function parseData(data) {
//     return data.map((d) => {
//         const { open, high, low, close, datetime, volume } = d;
//         return {
//             open,
//             high,
//             low,
//             close,
//             date: datetime,
//             volume,
//         };
//     });
// }
