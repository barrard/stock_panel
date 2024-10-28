import React, { useEffect, useRef, useState, useMemo } from "react";
import Chart from "./classes/BacktestChartClass";
import API from "../../API";
import BackTesterStatus from "./components/BackTesterStatus";
import { GetSymbolBtn, SetIndicatorBtn } from "./components/styled";
import { TICKS } from "../../../indicators/indicatorHelpers/TICKS";
// import BackTestCharJs from "../BackTestChartJS";
const events = ["zoomed", "drag-end", "zoomed-end", "pinch-end"];

export default function GptChart({ Socket }) {
    const PixiChartRef = useRef();
    const PixiRef = useRef();
    const [enableMinMax, setEnableMinMax] = useState(true);
    const [enablePivots, setEnablePivots] = useState(true);
    const [enableCombinedKeyLevels, setEnableCombinedKeyLevels] = useState(true);
    const [symbol, setSymbol] = useState("ES");

    const [data, setData] = useState([]);
    const [eventsData, setEventsData] = useState({});

    const [chart, setChart] = useState(false);

    // async function getAndSetData() {
    //     const symbol = "ES";
    //     const from = 1671185580000;
    //     const to = 1671186720000;
    //     const data = await API.getTicksFrom({ symbol, from, to });
    //     const ticks = data.map((d) => d.ticks).flat();
    //     console.log(ticks);
    //     setData(ticks);
    // }

    function startBackTest() {
        Socket.emit("to-backtester", {
            type: "start-backtest",
            time: 0,
        });
    }

    useEffect(() => {
        if (PixiRef.current) return;
        const options = {
            symbol,
            events,
            setEventsData,
            height: 700,
            width: 900,
            PixiChartRef,
            tickSize: TICKS()[symbol],
            enableCombinedKeyLevels,
            enableMinMax,
            enablePivots,
            margin: {
                top: 10,
                left: 10,
                right: 100,
                bottom: 40,
            },
        }; // Configuration options

        const chart = new Chart(data, options);
        PixiRef.current = chart;
        PixiChartRef.current?.addEventListener(
            "mousewheel",
            (e) => {
                e.preventDefault();
            },
            { passive: false }
        );

        // getAndSetData();

        // BACK TESTER
        Socket.on("backtester-bars", (d) => {
            debugger;
            console.log(d);
            setData(d);
        });

        Socket.on("backtester-bar-update", (d) => {
            console.log(d);
        });

        Socket.emit("to-backtester", {
            type: "weeklyData",
        });

        return () => {
            Socket.off("backtester-bars");
            PixiRef.current.destroy();
            PixiRef.current = null;
        };
    }, []);

    async function getBacktestData(symbol) {
        const data = await API.getBacktestData(symbol);
        setData(data);
    }

    useEffect(() => {
        console.log("data updated.");
        if (data?.bars?.length && PixiRef.current) {
            PixiRef.current.setData(data);
            const tickSize = TICKS()[symbol];
            debugger;
            PixiRef.current.setupChart({ tickSize, indicators: { enableCombinedKeyLevels, enableMinMax, enablePivots } });
        } else {
            console.log("no can");
            console.log("data", data);
            console.log("PixiRef", PixiRef);
        }
    }, [data, PixiRef.current, enableCombinedKeyLevels, enableMinMax, enablePivots, symbol]);

    const viewportEvents = events.map((name) => {
        return DisplayEvent({ name, eventData: eventsData[name] });
    });

    const PlantStatusesMemo = useMemo(
        () => <BackTesterStatus Socket={Socket} />,

        [Socket]
    );

    const indicatorsBtnStructrure = [
        { group: "drawMinMax", enabled: enableMinMax, labels: [""] },

        { group: "drawPivots", enabled: enablePivots, labels: [""] },
        { group: "drawCombinedKeyLevels", enabled: enableCombinedKeyLevels, labels: [""] },
    ];

    return (
        <div className="container">
            {/* <BackTestCharJs /> */}
            {PlantStatusesMemo}
            <div>
                <button onClick={startBackTest}>START</button>
            </div>
            <div className="row">
                <div className="col-auto">
                    <GetSymbolBtn enabled={symbol == "ES"} setSymbol={setSymbol} getData={getBacktestData} symbol="ES" />
                </div>

                <div className="col-auto">
                    <GetSymbolBtn enabled={symbol == "CL"} setSymbol={setSymbol} getData={getBacktestData} symbol="CL" />
                </div>
                <div className="col-auto">
                    <GetSymbolBtn enabled={symbol == "NQ"} setSymbol={setSymbol} getData={getBacktestData} symbol="NQ" />
                </div>
                <div className="col-auto">
                    <GetSymbolBtn enabled={symbol == "GC"} setSymbol={setSymbol} getData={getBacktestData} symbol="GC" />
                </div>
                <div className="col-auto">
                    <GetSymbolBtn enabled={symbol == "YM"} setSymbol={setSymbol} getData={getBacktestData} symbol="YM" />
                </div>
            </div>
            <div className="row">
                <div className="col">
                    <div ref={PixiChartRef}></div>
                </div>
                <div className="col">
                    <SetIndicatorBtn onClick={() => setEnableCombinedKeyLevels(!enableCombinedKeyLevels)} indicatorName="CombinedKeyLevels" enabled={enableCombinedKeyLevels} />
                    <SetIndicatorBtn onClick={() => setEnableMinMax(!enableMinMax)} indicatorName="MinMax" enabled={enableMinMax} />
                    <SetIndicatorBtn onClick={() => setEnablePivots(!enablePivots)} indicatorName="Pivots" enabled={enablePivots} />
                </div>
            </div>
            <div>
                {/* <h3>stats</h3> */}
                {/* <div className="row">{viewportEvents}</div> */}
                {/* {DisplayEvent(events)} */}
                {/* {events.name} */}
            </div>
        </div>
    );
}

function DisplayEvent(data) {
    const [name, setName] = useState(data.name);

    console.log(name);
    if (data.eventData) {
        console.log(data.eventData);
        console.log("viewport.scale.x", data.eventData?.viewport?.scale?.x);
        console.log("viewport.scale.y", data.eventData?.viewport?.scale?.y);
        console.log("viewport.x", data.eventData?.viewport?.x);
        console.log("viewport.y", data.eventData?.viewport?.y);
        if (data.eventData?.screen?.scale) {
            console.log("screen.scale.x", data.eventData?.screen?.scale?.x);
            console.log("screen.scale.y", data.eventData?.screen?.scale?.y);
        }
        console.log("screen.x", data.eventData?.screen?.x);
        console.log("screen.y", data.eventData?.screen?.y);
        if (data.eventData?.world?.scale) {
            console.log("world.scale.x", data.eventData?.world?.scale?.x);
            console.log("world.scale.y", data.eventData?.world?.scale?.y);
        }
        console.log("world.x", data.eventData?.world?.x);
        console.log("world.y", data.eventData?.world?.y);
    }
    return (
        <div key={name} className="col">
            {name}
            <div
                style={{
                    opacity: data.eventData?.x ? 1 : 0.1,
                }}
            >
                <h4>Event</h4>
                <p>
                    X: {Math.floor(data.eventData?.x)} Y: {Math.floor(data.eventData?.y)}
                </p>
                <p>
                    Scale: x - {Math.floor(data.eventData?.scale?._x * 100) / 100} y - {Math.floor(data.eventData?.scale?._y * 100) / 100}
                </p>
            </div>

            <div
                style={{
                    opacity: data.eventData?.screen ? 1 : 0.1,
                }}
            >
                <h4>Screen</h4>
                <p>
                    X: {Math.floor(data.eventData?.screen?.x)} Y: {Math.floor(data.eventData?.screen?.y)}
                </p>
                <p>
                    Scale: x - {Math.floor(data.eventData?.screen?.scale?._x * 100) / 100} y - {Math.floor(data.eventData?.screen?.scale?._y * 100) / 100}
                </p>
            </div>
            <div
                style={{
                    opacity: data.eventData?.world ? 1 : 0.1,
                }}
            >
                <h4>World</h4>
                <p>
                    X: {Math.floor(data.eventData?.world?.x)} Y: {Math.floor(data.eventData?.world?.y)}
                </p>
                <p>
                    Scale: x - {Math.floor(data.eventData?.world?.scale?._x * 100) / 100} y - {Math.floor(data.eventData?.world?.scale?._y * 100) / 100}
                </p>
            </div>

            <div
                style={{
                    opacity: data.eventData?.viewport ? 1 : 0.1,
                }}
            >
                <h4>Viewport</h4>
                <p>
                    X: {Math.floor(data.eventData?.viewport?.x)} Y: {Math.floor(data.eventData?.viewport?.y)}
                </p>
                <p>
                    Scale: x - {Math.floor(data.eventData?.viewport?.scale?._x * 100) / 100} y - {Math.floor(data.eventData?.viewport?.scale?._y * 100) / 100}
                </p>
            </div>
        </div>
    );
}
