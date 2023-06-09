import React, { useEffect, useState, useRef } from "react";
import API from "../../../components/API";
import { getMarketOpen, getMarketClose } from "../../../indicators/indicatorHelpers/IsMarketOpen";
import moment from "moment";

import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";
import { Scatter } from "react-chartjs-2";
import Select from "../pixiChart/components/Select";

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);
const timePeriods = [5, 15, 30, 60];
const rgbValues = ["rgb(200, 128, 100)", "rgb(112, 200, 100)", "rgb(110, 100, 200)", "rgb(163, 100, 200)"];

const RGB = timePeriods.reduce((acc, time, i) => {
    acc[time] = rgbValues[i];
    return acc;
}, {});

const colors = timePeriods.reduce((acc, time, i) => {
    acc[time] = { line: getBrighterColor(RGB[time])[0], scatter: getBrighterColor(RGB[time])[1] };

    return acc;
}, {});

export default function BidAskStats() {
    const [scatterData, setScatterData] = useState(
        timePeriods.reduce((acc, time, i) => {
            acc[time] = [];
            return acc;
        }, {})
    );
    const [lineData, setLineData] = useState(
        timePeriods.reduce((acc, time, i) => {
            acc[time] = [];
            return acc;
        }, {})
    );
    const [liquidityValue, setLiquidityValue] = useState({ value: "bidOrderToAskOrderRatio" });
    const todaysOpen = getMarketOpen();
    const todaysClose = getMarketClose();

    let days = 0;

    const skipToday = moment().isAfter(todaysClose) ? 0 : 1;

    useEffect(() => {
        Object.keys(scatterData).forEach((time) => {
            const { slope, yIntercept, error } = calculateBestFitLine(scatterData[time], liquidityValue.value);
            console.log({ slope, yIntercept, error, days });

            const min = Math.min(...scatterData[time].map((sd) => sd.returns));
            const max = Math.max(...scatterData[time].map((sd) => sd.returns));

            const range = createRangeArray(min, max, 0.5);

            lineData[time] = range.map((x) => {
                const y = slope * x + yIntercept;
                return { x, y };
            });
        });

        setLineData({ ...lineData });
    }, [scatterData, days, liquidityValue]);

    async function getData(getDays) {
        while (days < getDays) {
            const start = todaysOpen
                .clone()
                .subtract(days + skipToday, "day")
                .valueOf();
            const finish = todaysClose
                .clone()
                .subtract(days + skipToday, "day")
                .valueOf();
            const symbol = "ES";
            const exchange = "CME";
            const type = 1;
            const period = 1;

            const data = await API.getFromRedis({
                symbol,
                exchange,
                start,
                finish,
                type,
                period,
            });

            await addOrderFlowDataToTicks({ ticks: data, start, finish });

            if (data?.length) {
                const compiled = processData(data);
                Object.keys(scatterData).forEach((time) => {
                    scatterData[time] = [...scatterData[time], ...compiled[time]];
                });

                setScatterData(scatterData);
            }
            days++;
        }
    }

    function processData(data) {
        //partition into 15 min
        const startTime = moment(data[0].datetime);
        const nextTime = timePeriods.reduce((acc, time, i) => {
            acc[time] = startTime.clone().add(time, "minutes");
            return acc;
        }, {});

        const compiled = timePeriods.reduce((acc, time, i) => {
            acc[time] = [];
            return acc;
        }, {});
        let compileIndex = timePeriods.reduce((acc, time, i) => {
            acc[time] = 0;
            return acc;
        }, {});
        let startPrice = timePeriods.reduce((acc, time, i) => {
            acc[time] = null;
            return acc;
        }, {});
        let secondData;

        function reduceData(secondData, time) {
            //compilie this

            const returns = secondData.close - startPrice[time];
            const bidSizeOrderRatio = compiled[time][compileIndex[time]].reduce((acc, v) => acc + v.bidSizeOrderRatio, 0) / compiled[time][compileIndex[time]].length;
            const askSizeOrderRatio = compiled[time][compileIndex[time]].reduce((acc, v) => acc + v.askSizeOrderRatio, 0) / compiled[time][compileIndex[time]].length;
            const bidSizeToAskSizeRatio = compiled[time][compileIndex[time]].reduce((acc, v) => acc + v.bidSizeToAskSizeRatio, 0) / compiled[time][compileIndex[time]].length;
            const nearPriceBidSizeToAskSizeRatio = compiled[time][compileIndex[time]].reduce((acc, v) => acc + v.nearPriceBidSizeToAskSizeRatio, 0) / compiled[time][compileIndex[time]].length;
            const bidOrderToAskOrderRatio = compiled[time][compileIndex[time]].reduce((acc, v) => acc + v.bidOrderToAskOrderRatio, 0) / compiled[time][compileIndex[time]].length;
            const bidSizeToAskSizeRatioMA = compiled[time][compileIndex[time]].reduce((acc, v) => acc + v.bidSizeToAskSizeRatioMA, 0) / compiled[time][compileIndex[time]].length;
            const nearPriceBidSizeToAskSizeRatioMA = compiled[time][compileIndex[time]].reduce((acc, v) => acc + v.nearPriceBidSizeToAskSizeRatioMA, 0) / compiled[time][compileIndex[time]].length;
            const tick = compiled[time][compileIndex[time]].reduce((acc, v) => acc + v.tick, 0) / compiled[time][compileIndex[time]].length;
            const trin = compiled[time][compileIndex[time]].reduce((acc, v) => acc + v.trin, 0) / compiled[time][compileIndex[time]].length;
            const avgTICK = compiled[time][compileIndex[time]].reduce((acc, v) => acc + v.avgTICK, 0) / compiled[time][compileIndex[time]].length;
            const avgTRIN = compiled[time][compileIndex[time]].reduce((acc, v) => acc + v.avgTRIN, 0) / compiled[time][compileIndex[time]].length;

            if (!compiled[time][compileIndex[time]].length) {
                compiled[time][compileIndex[time]] = compiled[time][compileIndex[time] - 1];
            } else {
                compiled[time][compileIndex[time]] = {
                    bidSizeOrderRatio,
                    askSizeOrderRatio,
                    bidSizeToAskSizeRatio,
                    nearPriceBidSizeToAskSizeRatio,
                    bidOrderToAskOrderRatio,
                    bidSizeToAskSizeRatioMA,
                    nearPriceBidSizeToAskSizeRatioMA,
                    tick,
                    trin,
                    avgTICK,
                    avgTRIN,
                    returns,
                };
            }
            nextTime[time] = nextTime[time].add(time, "minutes");
            startPrice[time] = secondData.open;
            compileIndex[time]++;
        }
        for (let x = 0; x < data.length; x++) {
            secondData = data[x];
            const datetime = secondData.datetime;
            if (!startPrice[timePeriods[0]]) {
                timePeriods.reduce((acc, time, i) => {
                    acc[time] = secondData.open;
                    return acc;
                }, startPrice);
            }
            if (!secondData.orderFlowData) continue;
            const { bidSizeOrderRatio, askSizeOrderRatio, bidSizeToAskSizeRatio, nearPriceBidSizeToAskSizeRatio, bidOrderToAskOrderRatio, bidSizeToAskSizeRatioMA, nearPriceBidSizeToAskSizeRatioMA, tick, trin, avgTICK, avgTRIN } = secondData.orderFlowData;
            // if (bidSizeToAskSizeRatio === undefined) continue;
            Object.keys(nextTime).forEach((time) => {
                if (moment(datetime).isAfter(nextTime[time])) {
                    reduceData(secondData, time);
                }
                if (!compiled[time][compileIndex[time]]) {
                    compiled[time][compileIndex[time]] = [];
                }
                compiled[time][compileIndex[time]].push({
                    bidSizeOrderRatio,
                    askSizeOrderRatio,
                    bidSizeToAskSizeRatio,
                    nearPriceBidSizeToAskSizeRatio,
                    bidOrderToAskOrderRatio,
                    bidSizeToAskSizeRatioMA,
                    nearPriceBidSizeToAskSizeRatioMA,
                    tick,
                    trin,
                    avgTICK,
                    avgTRIN,
                });
            });
        }

        Object.keys(nextTime).forEach((time) => {
            reduceData(secondData, time);
        });

        return compiled;
    }

    async function addOrderFlowDataToTicks({ ticks, start, finish }) {
        const liquidityOrderFlow = await API.getOrderFlow({
            start,
            end: finish,
        });

        let tickIndex = 0;
        for (let x = 0; x < liquidityOrderFlow.length; x++) {
            const liquidityDataTime = new Date(liquidityOrderFlow[x].createdAt).getTime();
            tickIndex = findTick({ tickIndex, ticks, liquidityDataTime, x });
        }

        function findTick({ tickIndex, ticks, liquidityDataTime, x }) {
            for (let t = tickIndex; t < ticks.length; t++) {
                const tickDataTime = new Date(ticks[t].datetime).getTime();
                if (tickDataTime >= liquidityDataTime) {
                    ticks[t].orderFlowData = liquidityOrderFlow[x];
                    tickIndex = t;
                    return t;
                }
            }
        }
    }

    useEffect(() => {
        getData(30);
    }, []);

    const options = {
        // scales: {
        //     y: {
        //         beginAtZero: true,
        //     },
        // },
    };

    const DATA = [];
    const t_Static = timePeriods.reduce((acc, time, i) => {
        acc[time] = 0;
        return acc;
    }, {});
    Object.keys(scatterData).forEach((time) => {
        console.log(lineData[time]);

        const tStatistic = calculateTStatistic(scatterData[time], { x: "returns", y: liquidityValue });

        DATA.push({
            label: `Scatter Data ${time} T-Static:${tStatistic}`,
            data: scatterData[time].map((d, i, arr) => {
                if (d.returns == undefined) {
                }
                return {
                    x: d.returns,
                    y: d[liquidityValue.value],
                };
            }),
            backgroundColor: colors[time].scatter,
            type: "scatter",
        });
        DATA.push({
            label: `Line Data ${time}`,
            data: lineData[time],
            type: "line",
            fill: false, // Set to true if you want to fill the area under the line
            backgroundColor: colors[time].line, // Customize the color
            borderColor: colors[time].line, // Customize the border color
        });
    });

    const data = {
        datasets: DATA,
    };

    return (
        <div
            style={{
                width: 800,
                height: 700,
            }}
        >
            <Scatter options={options} data={data} />;
            <Select
                label="Liquidity Type"
                value={liquidityValue}
                setValue={setLiquidityValue}
                options={[
                    { value: "bidSizeOrderRatio", name: "bidSizeOrderRatio" },
                    { value: "askSizeOrderRatio", name: "askSizeOrderRatio" },
                    { value: "bidSizeToAskSizeRatio", name: "bidSizeToAskSizeRatio" },
                    { value: "nearPriceBidSizeToAskSizeRatio", name: "nearPriceBidSizeToAskSizeRatio" },
                    { value: "bidOrderToAskOrderRatio", name: "bidOrderToAskOrderRatio" },
                    { value: "bidSizeToAskSizeRatioMA", name: "bidSizeToAskSizeRatioMA" },
                    { value: "nearPriceBidSizeToAskSizeRatioMA", name: "nearPriceBidSizeToAskSizeRatioMA" },
                    { value: "tick", name: "tick" },
                    { value: "trin", name: "trin" },
                    { value: "avgTICK", name: "avgTICK" },
                    { value: "avgTRIN", name: "avgTRIN" },
                ]}
            />
        </div>
    );
}

function calculateBestFitLine(coordinates, key) {
    // Calculate the sum of x, y, x^2, and xy
    let sumX = 0;
    let sumY = 0;
    let sumXSquared = 0;
    let sumXY = 0;

    for (let i = 0; i < coordinates.length; i++) {
        const { [key]: y, returns: x } = coordinates[i];
        sumX += x;
        sumY += y;
        sumXSquared += x * x;
        sumXY += x * y;
    }

    const n = coordinates.length;

    // Calculate the slope (m) and y-intercept (b) of the best-fit line
    const slope = (n * sumXY - sumX * sumY) / (n * sumXSquared - sumX * sumX);
    const yIntercept = (sumY - slope * sumX) / n;

    // Calculate the error (sum of squared residuals)
    let sumSquaredResiduals = 0;

    for (let i = 0; i < coordinates.length; i++) {
        const { returns: x, [key]: y } = coordinates[i];
        const predictedY = slope * x + yIntercept;
        const residual = y - predictedY;
        sumSquaredResiduals += residual * residual;
    }

    // Return the slope, y-intercept, and error as an object
    return {
        slope,
        yIntercept,
        error: sumSquaredResiduals,
    };
}

function createRangeArray(min, max, interval) {
    const rangeArray = [];

    for (let i = min; i <= max; i += interval) {
        rangeArray.push(i);
    }

    return rangeArray;
}

function getBrighterColor(color) {
    // Extract the RGB values from the color string
    const rgbRegex = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i;
    const match = color.match(rgbRegex);

    if (match) {
        // Extract the individual RGB values
        const red = parseInt(match[1]);
        const green = parseInt(match[2]);
        const blue = parseInt(match[3]);

        // Increase the RGB values by 20% to get a brighter color
        const brighterRed = Math.min(Math.round(red * 0.8), 255);
        const brighterGreen = Math.min(Math.round(green * 0.8), 255);
        const brighterBlue = Math.min(Math.round(blue * 0.8), 255);

        // Construct the brighter color string in RGB format
        const brighterColor = `rgb(${brighterRed}, ${brighterGreen}, ${brighterBlue})`;

        // Return the original color and the brighter color
        return [color, brighterColor];
    }

    // If the color format is not RGB, return null or throw an error
    return null;
}

function calculateTStatistic(coordinates, { x, y }) {
    const xValues = coordinates.map((coord) => coord[x]);
    const yValues = coordinates.map((coord) => coord[y.value]);

    const meanX = calculateMean(xValues);
    const meanY = calculateMean(yValues);

    const n = coordinates.length;
    const diffSum = coordinates.reduce((sum, coord) => sum + Math.pow(coord[x] - coord[y.value], 2), 0);
    const standardError = Math.sqrt(diffSum / (n - 1));

    const tStatistic = (meanX - meanY) / (standardError * Math.sqrt(2 / n));

    return tStatistic;
}

function calculateMean(values) {
    const sum = values.reduce((sum, value) => sum + value, 0);
    return sum / values.length;
}
