import React, { useState, useEffect, useRef } from "react";
import GenericPixiChart from "../../../GenericPixiChart";
import API from "../../../../API";
// import drawStrikes from "./drawStrikes";
// import MonteCarloCone from "./monteCarloSimulation";

const breadthKeys = {
    // $ADVN: {
    //     ticks: 0.01,
    // },
    // $COMPX: {
    //     ticks: 0.01,
    // },
    // $DECN: {
    //     ticks: 0.01,
    // },
    // $DJC: {
    //     ticks: 0.01,
    // },
    // $DJI: {
    //     ticks: 0.01,
    // },
    // $DJT: {
    //     ticks: 0.01,
    // },
    // $DVOL: {
    //     ticks: 0.01,
    // },
    // $GDMOC: {
    //     ticks: 0.01,
    // },
    // $NDX: {
    //     ticks: 0.01,
    // },
    // $NYA: {
    //     ticks: 0.01,
    // },
    // $OEX: {
    //     ticks: 0.01,
    // },
    // $R25I: {
    //     ticks: 0.01,
    // },
    // $RUI: {
    //     ticks: 0.01,
    // },
    // $RUT: {
    //     ticks: 0.01,
    // },
    $SPX: {
        ticks: 0.01,
    },
    // $TICK: {
    //     ticks: 0.01,
    // },
    // $TRIN: {
    //     ticks: 0.01,
    // },
    // $UVOL: {
    //     ticks: 0.01,
    // },
    // $VIX: {
    //     ticks: 0.01,
    // },
    // avgTICK: {
    //     ticks: 0.01,
    // },
    // avgTRIN: {
    //     ticks: 0.01,
    // },
    // createdAt: {
    //     ticks: 0.01,
    // },
    // tick: {
    //     ticks: 0.01,
    // },
    // trin: {
    //     ticks: 0.01,
    // },
};
const MarketBreadth = (props) => {
    const {
        // width = 800,
        height = 60,
        symbol = "SPY",
        Socket,
        fullSymbolRef,
        spyLevelOne,
        strike,
        putCall,
        exp,
        getCurrentStrikeData,
        callsOrPuts,
        tick,
        // ...rest
    } = props;

    // Default bar type and period for GenericPixiChart
    const barType = { value: 2, name: "Minutes" };
    const barTypePeriod = 1;
    const tickSize = 0.01;

    // const pixiApplicationRef = useRef();
    const pixiDataRef = useRef();

    const lastTotalVolumeRef = useRef();

    const [candleData, setCandleData] = useState({});
    //TODO add a way to toggle the 5 min data?   Set to 1 minute
    // const [timeframe, setTimeframe] = useState("4Seconds");

    const [lastSpyLevelOne, setLastSpyLevelOne] = useState(null);
    const [newSpyMinuteBar, setNewSpyMinuteBar] = useState(null);

    const fetchData = async (opts = {}) => {
        const data = await API.fetchMarketBreadth(opts);
        console.log(data);

        //process data

        const cleanArrays = {};
        debugger;
        data.forEach((entry) => {
            Object.keys(breadthKeys).forEach((key) => {
                if (!cleanArrays[key]) {
                    cleanArrays[key] = [];
                }
                cleanArrays[key]?.push({ datetime: entry.datetime, value: entry[key] });
            });
        });

        console.log(cleanArrays);

        // candleData = cleanSnaps;
        setCandleData(cleanArrays);
    };

    useEffect(() => {
        if (!tick || !pixiDataRef.current) return;
        // const lastBar = pixiDataRef.current.ohlcDatas.slice(-1)[0];
        const lastVolume = lastTotalVolumeRef.current || tick.totalVolume;
        tick.volume = tick.totalVolume - lastVolume;
        tick.totalVol = tick.totalVolume;
        tick.lastPrice = tick.last;

        pixiDataRef.current.setNewBar(tick);
        pixiDataRef.current.updateCurrentPriceLabel(tick.lastPrice);
        lastTotalVolumeRef.current = tick.totalVolume;

        if (candleData && pixiDataRef.current) {
            // const monteCarlo = new MonteCarloCone(pixiDataRef, candleData);
            // const results = monteCarlo.updateSimulation();
            // monteCarlo.drawHistogramHeatmap();

            // Register for redraws
            // pixiDataRef.current.registerDrawFn("drawHistogramHeatmap", monteCarlo.drawHistogramHeatmap.bind(monteCarlo));

            return () => {
                // pixiDataRef.current?.unregisterDrawFn("drawHistogramHeatmap");
                // monteCarlo.cleanup();
            };
        }
    }, [tick, pixiDataRef.current]);

    // useEffect(() => {
    //     if (!pixiDataRef.current || !spyLevelOne) return;
    //     // pixiDataRef.current.newTick(spyLevelOne);
    //     // setLastSpyLevelOne(spyLevelOne);
    // }, [spyLevelOne, pixiDataRef.current]);

    //     useEffect(() => {
    //     if (!pixiDataRef.current || !spyLevelOne) return;
    //     // pixiDataRef.current.newTick(spyLevelOne);
    //     setLastSpyLevelOne(spyLevelOne);
    // }, [tick, pixiDataRef.current]);

    useEffect(() => {
        console.log("MarketBreadth loaded");
        fetchData({ limit: 1000, sort: { _id: -1 }, filter: {} });

        Socket.on("market-breadth", (data) => {
            debugger;
            console.log("market-breadth", data);
            const datetime = new Date().getTime();
            Object.keys(breadthKeys).forEach((key) => {
                const tick = { datetime, value: data[key] };
                candleData[key].push(tick);
                pixiDataRef.current.setNewBar(tick);
                pixiDataRef.current.updateCurrentPriceLabel(tick.value);
            });
            setCandleData({ ...candleData });
        });

        return () => {
            Socket.off("market-breadth");
        };
    }, []);

    if (!candleData?.["$SPX"]?.length) {
        return <div>Loading... </div>;
    }
    let key = "$SPX";
    return (
        <>
            {/* // <div className="row w-100 ">
        //     {Object.keys(breadthKeys).map((key) => (
			//         <div style={{ width: "100px", border: "1px solid white" }} className="col  border-white" key={key}> */}
            <p>{key}</p>
            <GenericPixiChart
                ohlcDatas={candleData[key]}
                // width={100}
                // height={200}
                symbol={key}
                fullSymbolRef={fullSymbolRef}
                barType={barType}
                barTypePeriod={barTypePeriod}
                // loadData={loadData}
                pixiDataRef={pixiDataRef}
                tickSize={breadthKeys[key].ticks}
                options={{ withoutVolume: false, chartType: "line", lineKey: "value", xKey: "datetime", lineColor: 0xffa500 }}
            />
            {/* //         </div>
			//     ))}
			// </div>
			*/}
        </>
    );
};

export default MarketBreadth;
