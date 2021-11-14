import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import {
    axisRight,
    axisBottom,
    curveCardinal,
    extent,
    line,
    scaleBand,
    scaleLinear,
    select,
    zoom,
    zoomTransform,
} from "d3";
import API from "./API.js";

console.log("RUN THIS SHIT");
let tradeCountPerSecHistory = {};
let tradeVolPerSecHistory = {};
let volWeightedPerSecHistory = {};
let volPerTradePerSecHistory = {};
let tradePriceChangeHistory = {};
let tradeTimeChangeHistory = {};

let tradeCountPerSec = {};
let tradeVolPerSec = {};
let volWeightedPerSec = {};
let volPerTradePerSec = {};
let tradePriceChange = {};
let tradeVolumeChanges = {};
let tradeTimeDiffs = {};

let lastLevelOneData = {};
let levelOneDataChangeArrays = {};
let levelOneDataArrays = {};

let lastTradePrice = {};
let lastTradeTime = {};
// let lastTradeVol = {};

let levelOneCount = 0;
let timeAndSalesCount = 0;
export default function MiniCharts({ Socket }) {
    // console.log("MiniCharts");
    const [levelOneData, setLevelOneData] = useState({});
    const [currentZoom, setCurrentZoom] = useState();

    // on load hook
    useEffect(() => {
        console.log("Add socket listeners");
        Socket.on("levelOne", (levelOne) => {
            levelOneCount++;
            // let levelOneDataChange = {};
            setLevelOneData({ ...levelOne });
            let levelOneData = handleLevelOne(levelOne);
            console.log({ levelOneData });

            Object.entries(levelOneData).forEach(([symbol, data]) => {
                if (!lastLevelOneData[symbol]) {
                    lastLevelOneData[symbol] = {};
                    // levelOneDataChange[symbol] = {};
                    levelOneDataChangeArrays[symbol] = {};
                    levelOneDataArrays[symbol] = {};
                }

                Object.keys(data).forEach((prop) => {
                    if (!levelOneDataChangeArrays[symbol][prop]) {
                        levelOneDataChangeArrays[symbol][prop] = [];
                        levelOneDataArrays[symbol][prop] = [];
                    }
                    let val = data[prop];
                    if (val === undefined) return;
                    // if (val === undefined) {
                    //     if (lastLevelOneData[symbol][prop] === undefined) {
                    //         debugger;
                    //         val = 0;
                    //     } else {
                    //         val = lastLevelOneData[symbol][prop];
                    //     }
                    // }
                    levelOneDataArrays[symbol][prop].push(val);
                    let lastVal = lastLevelOneData[symbol][prop];
                    if (lastVal && val) {
                        let delta = val - lastVal;
                        levelOneDataChangeArrays[symbol][prop].push(delta);
                        // levelOneDataChange[symbol][prop] = delta;
                    } else {
                        // levelOneDataChangeArrays[symbol][prop].push(0);
                    }

                    lastLevelOneData[symbol][prop] = val;
                });
            });

            // levelOneDataChange.timestamp = new Date().toLocaleString();
            // levelOneDataChangeArrays.push(levelOneDataChange);
            console.log({
                levelOneDataChangeArrays,
                lastLevelOneData,
                levelOneDataArrays,
            });
        });

        Socket.on("timeAndSales", (timeAndSales) => {
            timeAndSalesCount++;
            let {
                timeSalesData,
                tradeVol,
                tradeCount,
                volWeightedTradePrice,
                volPerTrade,
            } = handelTimeAndSales(timeAndSales);
            // console.log({ timeSalesData, tradeVol, tradeCount, volWeightedTradePrice, volPerTrade });
            for (let symbol in tradeCount) {
                if (!tradeCountPerSec[symbol]) tradeCountPerSec[symbol] = 0;
                tradeCountPerSec[symbol] += tradeCount[symbol];
            }

            for (let symbol in tradeVol) {
                if (!tradeVolPerSec[symbol]) tradeVolPerSec[symbol] = 0;
                tradeVolPerSec[symbol] += tradeVol[symbol];
            }
            for (let symbol in volWeightedTradePrice) {
                if (!volWeightedPerSec[symbol]) volWeightedPerSec[symbol] = 0;
                volWeightedPerSec[symbol] = volWeightedPerSec[symbol]
                    ? (volWeightedPerSec[symbol] +
                          volWeightedTradePrice[symbol]) /
                      2
                    : volWeightedTradePrice[symbol];
            }

            for (let symbol in volPerTrade) {
                if (!volPerTradePerSec[symbol]) volPerTradePerSec[symbol] = 0;
                volPerTradePerSec[symbol] += volPerTradePerSec[symbol]
                    ? (volPerTrade[symbol] + volPerTradePerSec[symbol]) / 2
                    : volPerTrade[symbol];
            }
        });
        return () => {
            Socket.off("levelOne");
            Socket.off("timeAndSales");
        };
    }, []);
    let symbols = [
        "/ES",
        // "/NQ",
        // "/YM",
        // "/GC",
        //"/CL", "/RT"
    ];
    let titles = [
        [`Trades Per Sec, `, ["bidSize", "askSize"]],
        [`Trade Vol Per Sec, `, ["bidSize", "askSize"]],
        [`Vol Weighted Per Sec, `, ["bidPrice", "askPrice"]],
        [`Vol Per Trades Per Sec, `, ["bidSize", "askSize"]],
        // [`Time between Trades Per Sec, `, ["bidSize", "askSize"]],
        // ["Price Change", ["bidSize", "askSize"]],
    ];
    let datas = [
        tradeCountPerSecHistory,
        tradeVolPerSecHistory,
        volWeightedPerSecHistory,
        volPerTradePerSecHistory,
        // tradeTimeChangeHistory,
        // tradePriceChangeHistory,
    ];
    let getTitle = (i, symbol, data) =>
        `${titles[i]} - ${symbol} :  ${
            data[symbol] ? data[symbol].slice(-1)[0] : ""
        }`;
    let getLevelOneData = (
        levelOneDataArrays,
        levelOneDataChangeArrays,
        symbol,
        i
    ) => {
        if (i === 0) {
            return levelOneDataChangeArrays[symbol];
        } else if (i === 1) {
            return levelOneDataArrays[symbol];
        } else if (i === 2) {
            return levelOneDataArrays[symbol];
        } else if (i === 3) {
            return levelOneDataChangeArrays[symbol];
        } else {
            return levelOneDataArrays[symbol];
        }
    };

    let tradesPerSecCharts = symbols
        .map((symbol) => {
            return datas.map((data, i) => (
                <div key={`${symbol}-${i}`} className="white">
                    <MiniChart
                        currentZoom={currentZoom}
                        setCurrentZoom={setCurrentZoom}
                        data={data[symbol] ? [...data[symbol]] : []}
                        levelOneData={getLevelOneData(
                            levelOneDataArrays,
                            levelOneDataChangeArrays,
                            symbol,
                            i
                        )}
                        levelOneKeys={titles[i][1]}
                        title={getTitle(i, symbol, data)}
                    />
                </div>
            ));
        })
        .flat();

    return <>{tradesPerSecCharts}</>;
}

function handelTimeAndSales(timeSalesArray) {
    let timeSalesData = {};
    // console.log(timeSalesArray);
    if (Array.isArray(timeSalesArray)) {
        let tradeCount = {};
        let tradeVol = {};
        let volWeightedTradePrice = {};
        let volPerTrade = {};

        timeSalesArray.forEach((data) => parseTimeSales(data, timeSalesData));

        Object.keys(timeSalesData).forEach((symbol) =>
            getStats(
                symbol,
                timeSalesData,
                tradeVol,
                tradeCount,
                volWeightedTradePrice,
                volPerTrade
            )
        );
        return {
            timeSalesData,
            tradeVol,
            tradeCount,
            volWeightedTradePrice,
            volPerTrade,
        };
    } else console.error("ERROR!  timeSales is not an array");
}

function getStats(
    symbol,
    obj,
    tradeVol,
    tradeCount,
    volWeightedTradePrice,
    volPerTrade
) {
    let arrayData = obj[symbol];

    arrayData.forEach((timeSandSale) => {
        // console.log(timeSandSale.lastPrice);

        if (!tradeCount[symbol]) {
            tradeCount[symbol] = 0;
            volWeightedTradePrice[symbol] = 0;
            tradeVol[symbol] = 0;
            volPerTrade[symbol] = 0;
        }
        tradeCount[symbol]++;
        tradeVol[symbol] += timeSandSale.lastSize;
        volWeightedTradePrice[symbol] +=
            timeSandSale.lastPrice * timeSandSale.lastSize;

        if (!tradePriceChange[symbol]) {
            tradeVolumeChanges[symbol] = [];
            tradePriceChange[symbol] = [];
            tradeTimeDiffs[symbol] = [];
            lastTradePrice[symbol] = timeSandSale.lastPrice;
            lastTradeTime[symbol] = timeSandSale.tradeTime;
        }

        // if (!lastTradePrice[symbol]) {
        // 	// lastTradeVol[symbol] = timeSandSale.lastSize;
        // }
        let lastPrice = lastTradePrice[symbol]; //Note this is the LAST trade price
        let tradeTime = lastTradeTime[symbol]; //Note this is the LAST trade time
        // let lastSize = lastTradeVol[symbol]; //Note this is the LAST trade volume
        if (lastPrice) {
            let delta = timeSandSale.lastPrice - lastPrice;
            tradePriceChange[symbol].push(delta);
            lastTradePrice[symbol] = timeSandSale.lastPrice;
        }
        if (tradeTime) {
            let delta = timeSandSale.tradeTime - tradeTime;
            tradeTimeDiffs[symbol].push(delta);
            lastTradeTime[symbol] = timeSandSale.tradeTime;
        }

        // if (lastSize) {
        // let delta = timeSandSale.lastSize - lastSize;
        tradeVolumeChanges[symbol].push(timeSandSale.lastSize);
        // lastTradeVol[symbol] = timeSandSale.lastSize;
        // }
    });

    volWeightedTradePrice[symbol] /= tradeVol[symbol];

    volPerTrade[symbol] = tradeVol[symbol] / tradeCount[symbol];
}

function handleLevelOne(levelOneArray) {
    let obj = {};
    if (Array.isArray(levelOneArray)) {
        levelOneArray.forEach((levelOne) => parseLevelOne(levelOne, obj));
    }
    return obj;
}

function parseLevelOne(data, obj) {
    let symbol = data["key"].substring(0, 3);
    let bidPrice = data["1"];
    let askPrice = data["2"];
    let lastPrice = data["3"];
    let bidSize = data["4"];
    let askSize = data["5"];
    obj[symbol] = { bidPrice, askPrice, askSize, bidSize, lastPrice };
}

function parseTimeSales(data, obj) {
    let symbol = data["key"].substring(0, 3);
    if (!obj[symbol]) obj[symbol] = [];
    let tradeTime = data[1];
    let lastPrice = data[2];
    let lastSize = data[3];
    let lastSequence = data[4];
    obj[symbol].push({ lastPrice, tradeTime, lastSize, lastSequence });
}

let timer = setInterval(() => {
    // console.log("TIMER");
    //all these objects have the same shape i think
    for (let symbol in tradeCountPerSec) {
        //all these objects should be better contained and defined
        if (!tradeCountPerSecHistory[symbol]) {
            tradeCountPerSecHistory[symbol] = [];
            tradeVolPerSecHistory[symbol] = [];
            volWeightedPerSecHistory[symbol] = [];
            volPerTradePerSecHistory[symbol] = [];
            tradeTimeChangeHistory[symbol] = [];
            tradePriceChangeHistory[symbol] = [];
        }

        //this is the trades per second
        tradeCountPerSecHistory[symbol].push(tradeCountPerSec[symbol]);
        //after pushing to the array,
        tradeCountPerSec[symbol] = 0;

        tradeVolPerSecHistory[symbol].push(tradeVolPerSec[symbol]);
        tradeVolPerSec[symbol] = 0;

        if (volWeightedPerSec[symbol]) {
            volWeightedPerSecHistory[symbol].push(volWeightedPerSec[symbol]);
        }
        volWeightedPerSec[symbol] = 0;

        volPerTradePerSecHistory[symbol].push(volPerTradePerSec[symbol]);
        volPerTradePerSec[symbol] = 0;

        if (tradeTimeDiffs[symbol].length) {
            tradeTimeChangeHistory[symbol].push(
                tradeTimeDiffs[symbol].reduce(
                    (total, timeDiff) => Math.abs(timeDiff) + total,
                    0
                ) / tradeTimeDiffs[symbol].length
            );
        } else {
            tradeTimeChangeHistory[symbol].push(0);
        }

        tradeTimeDiffs[symbol] = [];
        tradePriceChange[symbol].forEach((priceDiff, index) => {
            let volDiff = tradeVolumeChanges[symbol][index];
        });

        if (tradePriceChange[symbol].length) {
            tradePriceChangeHistory[symbol].push(
                tradePriceChange[symbol].reduce(
                    (total, priceDiff) => Math.abs(priceDiff) + total,
                    0
                ) / tradePriceChange[symbol].length
            );
        } else {
            tradePriceChangeHistory[symbol].push(0);
        }

        tradeVolumeChanges[symbol] = [];
        tradePriceChange[symbol] = [];
    }

    //bidAsk data???
    // console.log({ levelOneCount, timeAndSalesCount });
    // console.log({ lastLevelOneData });
    // console.log({ lastTradeTime });
    // console.log({ tradeTimeDiffs });

    // console.log({ lastLevelOneData });
    // console.log({ levelOneDataArrays });
    // console.log({ levelOneDataChangeArrays });

    levelOneCount = 0;
    timeAndSalesCount = 0;
}, 1000);

let width = 1000;
let height = 200;
let margin = {
    left: 20,
    right: 40,
    bottom: 20,
    top: 20,
};
let innerHeight = height - (margin.top + margin.bottom);
let innerWidth = width - (margin.left + margin.right);

let yScale = scaleLinear().range([innerHeight, 0]);
let xScale = scaleLinear().range([margin.left, innerWidth]);
let rScale = scaleLinear().range([1, 5]);

function MiniChart({
    title,
    data,
    setCurrentZoom,
    currentZoom,
    levelOneData,
    levelOneKeys,
}) {
    const svgRef = useRef();
    const [chartSvg, setChartSvg] = useState(undefined);

    useEffect(() => {
        draw();
    }, [data, currentZoom]);

    useEffect(() => {
        console.log("MINI CHART ON LOAD");
        setChartSvg(select(svgRef.current));
    }, []);

    const draw = () => {
        if (!data || !data.length) return;
        let [yMin, yMax] = extent(data);

        xScale.domain([0, data.length - 1]);
        yScale.domain([yMin - yMin * 0.0005, yMax + yMax * 0.0005]);
        rScale.domain([yMin, yMax]);

        if (currentZoom) {
            let newXScale = currentZoom.rescaleX(xScale);
            let [start, end] = newXScale.domain();

            xScale.domain(newXScale.domain());
            let [yMin, yMax] = extent([
                ...data.slice(Math.floor(start), Math.ceil(end)),
                ...levelOneKeys
                    .map((key) =>
                        [...levelOneData[key]].slice(
                            Math.floor(start),
                            Math.ceil(end)
                        )
                    )
                    .flat(),
            ]);

            yScale.domain([
                yMin ? yMin - yMin * 0.0005 : 0,
                yMax ? yMax + yMax * 0.0005 : 1,
            ]);
        }

        let xAxis = axisBottom(xScale).tickValues(
            xScale.domain().filter((d, i) => i % 10 === 0)
        );
        let yAxis = axisRight(yScale).tickSize(-innerWidth);
        // xAxis.attr('fill', 'white')

        if (!chartSvg) return;

        chartSvg.select(".x-axis").call(xAxis);
        chartSvg.select(".y-axis").call(yAxis);
        chartSvg.selectAll(".myLine").remove();
        levelOneKeys.forEach((levelOneProp) => {
            chartSvg.selectAll(`.${levelOneProp}_line`).remove();
        });

        const myLine = line()
            // .x((d, i) => xScale(new Date(d.x).toLocaleString()))
            .x((d, i) => {
                let x = xScale(i);
                return x;
            })
            .y((d) => {
                let y = yScale(d);
                return y;
            })
            .curve(curveCardinal);

        chartSvg
            .selectAll("circle")
            .data(data)
            .join("circle")
            // .attr("r", rScale)
            .attr("cx", (_, i) => xScale(i))
            .attr("cy", yScale)
            .attr("stroke", "red")
            .exit();

        levelOneKeys.forEach((levelOneProp) => {
            chartSvg
                .selectAll(`.${levelOneProp}_circle`)
                .data(levelOneData[levelOneProp])
                .join("circle")
                // .attr("r", rScale)
                .attr("cx", (_, i) => xScale(i))
                .attr("cy", yScale)
                .attr("stroke", levelOneProp.includes("bid") ? "green" : "red")
                .exit();

            chartSvg
                .selectAll(`.${levelOneProp}_line`)
                .data([levelOneData[levelOneProp]])
                .join("path")
                .attr("class", `${levelOneProp}_line`)
                .attr("d", myLine)
                .attr("fill", "none")
                .attr("stroke", levelOneProp.includes("bid") ? "green" : "red")
                // .attr("class", "new")
                .exit();
        });

        chartSvg
            .selectAll(".myLine")
            .data([data])
            .join("path")
            .attr("class", "myLine")
            .attr("d", myLine)
            .attr("fill", "none")
            .attr("stroke", "blue")
            // .attr("class", "new")
            .exit();

        const zoomBehavior = zoom()
            .scaleExtent([0.1, 10]) //zoom in and out limit
            .translateExtent([
                [0, 0],
                [width, height],
            ]) //pan left and right
            .on("zoom", () => {
                const zoomState = zoomTransform(chartSvg.node());
                setCurrentZoom(zoomState);
            });

        chartSvg.call(zoomBehavior);
    };

    return (
        <div>
            <h3>{title}</h3>
            <StyledSVG ref={svgRef}>
                <StyledXAxis className="x-axis white" />
                <StyledYAxis className="y-axis white" />
            </StyledSVG>
        </div>
    );
}

const StyledSVG = styled.svg`
    border: 1px solid red;
    width: ${width}px;
    height: ${height}px;
    background: #444;
`;

const StyledXAxis = styled.g`
    user-select: none;
    transform: translate(${margin.left}px, ${innerHeight}px);
`;

const StyledYAxis = styled.g`
    user-select: none;
    transform: translate(${width - margin.right}px);
`;
