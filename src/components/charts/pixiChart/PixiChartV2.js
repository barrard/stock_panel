import React, { useState, useEffect, useRef } from "react";
import GenericPixiChart from "../GenericPixiChart";
import API from "../../API";
// import drawStrikes from "./drawStrikes";
// import MonteCarloCone from "./monteCarloSimulation";
// import TimeframeSelector from "./spyOptionsComponents/TimeframeSelector";
// import IndicatorSelector from "../../../reusableChartComponents/IndicatorSelector";
const PixiChartV2 = (props) => {
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

    //useEffect for updating the chart based on indicator toggling
    //TODO, make this into some kind of easy to use hook
    //indicator 1
    // useEffect(() => {
    //     const monteCarloIndicator = indicators.find((ind) => ind.id === "monteCarlo");
    //     if (!monteCarloIndicator) return; // Should not happen if initialized correctly

    //     if (!newSpyMinuteBar || !pixiDataRef.current) return;
    //     pixiDataRef.current.setNewBar(newSpyMinuteBar);

    //     if (monteCarloIndicator.enabled && candleData && pixiDataRef.current) {
    //         const monteCarlo = new MonteCarloCone(pixiDataRef, candleData);
    //         const results = monteCarlo.updateSimulation();
    //         // monteCarlo.drawHistogramHeatmap();

    //         // Update instanceRef in state
    //         setIndicators((prevIndicators) =>
    //             prevIndicators.map((ind) => (ind.id === "monteCarlo" ? { ...ind, instanceRef: monteCarlo } : ind))
    //         );

    //         pixiDataRef.current.registerDrawFn(monteCarloIndicator.drawFunctionKey, monteCarlo.drawHistogramHeatmap.bind(monteCarlo));

    //         return () => {
    //             pixiDataRef.current?.unregisterDrawFn(monteCarloIndicator.drawFunctionKey);
    //             // Use the instanceRef for cleanup if it exists
    //             const currentMonteCarloInstance = indicators.find((ind) => ind.id === "monteCarlo")?.instanceRef;
    //             if (currentMonteCarloInstance && currentMonteCarloInstance.cleanup) {
    //                 currentMonteCarloInstance.cleanup();
    //             }
    //             // Clear instanceRef in state on cleanup
    //             setIndicators((prevIndicators) =>
    //                 prevIndicators.map((ind) => (ind.id === "monteCarlo" ? { ...ind, instanceRef: null } : ind))
    //             );
    //         };
    //     } else if (!monteCarloIndicator.enabled) {
    //         // If disabled, ensure it's cleaned up
    //         pixiDataRef.current?.unregisterDrawFn(monteCarloIndicator.drawFunctionKey);
    //         const currentMonteCarloInstance = indicators.find((ind) => ind.id === "monteCarlo")?.instanceRef;
    //         if (currentMonteCarloInstance && currentMonteCarloInstance.cleanup) {
    //             currentMonteCarloInstance.cleanup();
    //         }
    //         // Clear instanceRef in state
    //         setIndicators((prevIndicators) => prevIndicators.map((ind) => (ind.id === "monteCarlo" ? { ...ind, instanceRef: null } : ind)));
    //     }
    // }, [newSpyMinuteBar, pixiDataRef.current, candleData]);
    //indicator2
    // useEffect(() => {
    //     const strikesIndicator = indicators.find((ind) => ind.id === "strikes");
    //     if (!strikesIndicator) return; // Should not happen if initialized correctly

    //     if (!getCurrentStrikeData || !pixiDataRef.current || !spyLevelOne?.lastPrice) return;

    //     if (strikesIndicator.enabled) {
    //         const data = getCurrentStrikeData();
    //         const spyPrice = spyLevelOne.lastPrice;
    //         const strikes = new drawStrikes(data, pixiDataRef, callsOrPuts, spyPrice);
    //         strikes.drawAllStrikeLines();

    //         // Update instanceRef in state
    //         setIndicators((prevIndicators) => prevIndicators.map((ind) => (ind.id === "strikes" ? { ...ind, instanceRef: strikes } : ind)));

    //         pixiDataRef.current.registerDrawFn(strikesIndicator.drawFunctionKey, strikes.drawAllStrikeLines.bind(strikes));

    //         return () => {
    //             pixiDataRef.current?.unregisterDrawFn(strikesIndicator.drawFunctionKey);
    //             const currentStrikesInstance = indicators.find((ind) => ind.id === "strikes")?.instanceRef;
    //             if (currentStrikesInstance && currentStrikesInstance.cleanup) {
    //                 currentStrikesInstance.cleanup();
    //             }
    //             // Clear instanceRef in state on cleanup
    //             setIndicators((prevIndicators) =>
    //                 prevIndicators.map((ind) => (ind.id === "strikes" ? { ...ind, instanceRef: null } : ind))
    //             );
    //         };
    //     } else if (!strikesIndicator.enabled) {
    //         // If disabled, ensure it's cleaned up
    //         pixiDataRef.current?.unregisterDrawFn(strikesIndicator.drawFunctionKey);
    //         const currentStrikesInstance = indicators.find((ind) => ind.id === "strikes")?.instanceRef;
    //         if (currentStrikesInstance && currentStrikesInstance.cleanup) {
    //             currentStrikesInstance.cleanup();
    //         }
    //         // Clear instanceRef in state
    //         setIndicators((prevIndicators) => prevIndicators.map((ind) => (ind.id === "strikes" ? { ...ind, instanceRef: null } : ind)));
    //     }
    // }, [pixiDataRef.current, callsOrPuts, underlyingData, callsData, putsData, lvl2Data, getCurrentStrikeData, spyLevelOne]);

    //method for handling new pice data
    // useEffect(() => {
    //     if (!pixiDataRef.current || !spyLevelOne) return;
    //     pixiDataRef.current.newTick(spyLevelOne);
    //     setLastSpyLevelOne(spyLevelOne);
    // }, [spyLevelOne, pixiDataRef.current]);

    //function to get Data
    async function fetchLiveDataAndUpdate() {
        const liveData = await API.rapi_requestLiveBars({
            // barType,
            // barTypePeriod,
            timeframe,
            symbol: symbol,
            // exchange: getExchangeFromSymbol(symbol),
        });
        // console.log(liveData);
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
            // setNewSpyMinuteBar(d);
            //add this to ohlcData
            console.log("new live bar", newBar);
            addBar(newBar);
        });
        const liveBarUpdate = `1s-${symbol}-LiveBarUpdate`;
        Socket.on(liveBarUpdate, (tick) => {
            //update last ohlcBar
            // console.log("tick", tick);
            updateBar(tick);
        });

        return () => {
            Socket.off(liveBarNew);
            Socket.off(liveBarUpdate);
        };
    }, [symbol, timeframe]);

    return (
        <>
            {/* <TimeframeSelector setTimeframe={setTimeframe} timeframe={timeframe} />
            <IndicatorSelector indicators={indicators} toggleIndicator={toggleIndicator} /> */}
            {!ohlcData?.length ? (
                <div>Loading... {symbol}</div>
            ) : (
                <GenericPixiChart
                    //always add a unique key to force remount on changes to important props
                    key={symbol} //symbol works well for as the key
                    ohlcDatas={ohlcData}
                    // width={width}
                    height={height}
                    symbol={symbol}
                    // fullSymbolRef={fullSymbolRef}
                    barType={barType}
                    barTypePeriod={barTypePeriod}
                    // loadData={loadData}
                    pixiDataRef={pixiDataRef}
                    // tickSize={tickSize}
                />
            )}
        </>
    );
};

export default PixiChartV2;
