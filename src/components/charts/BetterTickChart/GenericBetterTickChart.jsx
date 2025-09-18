import React, { useState, useEffect, useRef } from "react";
import GenericPixiChart from "../GenericPixiChart";
import API from "../../API";

const GenericBetterTickChart = (props) => {
    const { Socket, height = 500 } = props;

    // always need to make a ref for pixiDataRef
    const pixiDataRef = useRef();

    //most charts handle timeframe with barType and barTypePeriod
    // barType 1 = seconds, 2 = minutes, 3 = hours, 4 = days
    const [barType, setBarType] = useState("1");
    // barTypePeriod is the number of barType units
    const [barTypePeriod, setBarTypePeriod] = useState("60");
    //human readable timeframe
    const [timeframe, setTimeframe] = useState("1m");

    //place to store ohlc data
    const [ohlcData, setOhlcData] = useState([]);

    // the symbol of the chart
    const [symbol, setSymbol] = useState("ES");
    //contorlls various indicators
    const [indicators, setIndicators] = useState([
        // { id: "monteCarlo", name: "Monte Carlo", enabled: true, drawFunctionKey: "drawHistogramHeatmap", instanceRef: null },
        // { id: "strikes", name: "Strike Lines", enabled: true, drawFunctionKey: "drawAllStrikeLines", instanceRef: null },
    ]);

    //toggles the indicators on and off
    const toggleIndicator = (id) => {
        setIndicators((prevIndicators) =>
            prevIndicators.map((indicator) => (indicator.id === id ? { ...indicator, enabled: !indicator.enabled } : indicator))
        );
    };

    //function to get Data
    async function fetchLiveDataAndUpdate() {
        const liveData = await API.rapi_requestLiveBars({
            // barType,
            // barTypePeriod,
            timeframe,
            symbol: symbol,
            // exchange: getExchangeFromSymbol(symbol),
        });
        console.log(liveData);
        liveData.forEach((d) => {
            d.datetime = d.datetime * 1000;
            if (d.volume.low) {
                d.totalVol = d.volume.low;
            }
        });

        //merge and remove duplicate datetime with data.bars
        const mergedBars = [...ohlcData, ...liveData].reduce((acc, bar) => {
            if (!acc.find((b) => b.datetime === bar.datetime)) {
                acc.push(bar);
            }
            return acc;
        }, []);
        setOhlcData(mergedBars);
    }

    const addBar = (newBar) => {
        debugger;
        pixiDataRef?.current?.setNewBar(newBar);
    };
    const updateBar = (tick) => {
        pixiDataRef?.current?.newTick(tick);
    };
    //main on load to get data
    useEffect(() => {
        //get data from OHLC_Compiler thing
        fetchLiveDataAndUpdate();

        const liveBarNew = `${timeframe}-${symbol}-LiveBarNew`;
        Socket.on(liveBarNew, (newBar) => {
            addBar(newBar);
        });
        const liveBarUpdate = `1s-${symbol}-LiveBarUpdate`;
        Socket.on(liveBarUpdate, (tick) => {
            updateBar(tick);
        });

        return () => {
            Socket.off(liveBarNew);
            Socket.off(liveBarUpdate);
        };
    }, [symbol, timeframe]);

    return (
        <>
            {!ohlcData?.length ? (
                <div>Loading... {symbol}</div>
            ) : (
                <GenericPixiChart
                    key={symbol}
                    ohlcDatas={ohlcData}
                    height={height}
                    symbol={symbol}
                    barType={barType}
                    barTypePeriod={barTypePeriod}
                    pixiDataRef={pixiDataRef}
                />
            )}
        </>
    );
};

export default GenericBetterTickChart;
