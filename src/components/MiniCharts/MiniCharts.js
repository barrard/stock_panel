import React, { useState, useEffect, useRef } from "react";
// import styled from "styled-components";

import { MiniChart } from "./components";
import { TimeAndSales, LevelOne } from "./components/classes";
console.log("RUN THIS SHIT");

let levelOneCount = 0;
let timeAndSalesCount = 0;

const TS = new TimeAndSales();
const L1 = new LevelOne();
export default function MiniCharts({ Socket }) {
    // console.log("MiniCharts");
    const [update, setUpdate] = useState(0);
    const [currentZoom, setCurrentZoom] = useState();

    // on load hook
    useEffect(() => {
        console.log("Add socket listeners");

        Socket.on("timeAndSales", (timeAndSales) => {
            timeAndSalesCount++;
            TS.handelTimeAndSales(timeAndSales);
        });

        Socket.on("levelOne", (levelOne) => {
            levelOneCount++;
            L1.handleLevelOne(levelOne);
        });

        let timer = setInterval(() => {
            setUpdate((t) => t + 1);

            TS.compile();
            L1.compile();

            levelOneCount = 0;
            timeAndSalesCount = 0;
        }, 2000);

        return () => {
            clearInterval(timer);
            Socket.off("levelOne");
            Socket.off("timeAndSales");
        };
    }, []);

    let symbols = [
        "/ES",
        // "/NQ",
        // "/YM",
        // "/GC",
        //"/CL", "/RTY"
    ];

    let titles = [
        [`Trades Per Sec, `, ["bidSize", "askSize"]],
        [`Trade Vol Per Sec, `, ["bidSize", "askSize"]],
        [`Vol Weighted Per Sec, `, ["bidPrice", "askPrice"]],
        [`Vol Per Trades Per Sec, `, []],
        // [`Time between Trades Per Sec, `, ["bidSize", "askSize"]],
        // ["Price Change", ["bidSize", "askSize"]],
    ];

    let datas = [
        TS.tradeCountPerSecHistory,
        TS.tradeVolPerSecHistory,
        TS.volWeightedPerSecHistory,
        TS.volPerTradePerSecHistory,
        // tradeTimeChangeHistory,
        // tradePriceChangeHistory,
    ];

    let getTitle = (i, symbol, data) =>
        `${titles[i]} - ${symbol} :  ${
            data[symbol] ? data[symbol].slice(-1)[0] : ""
        }`;

    let getLevelOneData = (symbol, i) => {
        if (i === 0) {
            return L1.levelOneDataChangeHistory[symbol];
        } else if (i === 1) {
            return L1.levelOneDataHistory[symbol];
        } else if (i === 2) {
            return L1.levelOneDataHistory[symbol];
        } else if (i === 3) {
            return L1.levelOneDataChangeHistory[symbol];
        } else {
            return L1.levelOneDataHistory[symbol];
        }
    };

    let tradesPerSecCharts = symbols
        .map((symbol) => {
            return datas.map((data, i) => (
                <div key={`${symbol}-${i}`} className="white">
                    <p>{`${symbol} ${i}`}</p>
                    <MiniChart
                        currentZoom={currentZoom}
                        setCurrentZoom={setCurrentZoom}
                        data={data[symbol] ? [...data[symbol]] : []}
                        levelOneData={getLevelOneData(symbol, i)}
                        levelOneKeys={titles[i][1]}
                        title={getTitle(i, symbol, data)}
                    />
                </div>
            ));
        })
        .flat();

    return <>{tradesPerSecCharts}</>;
}
