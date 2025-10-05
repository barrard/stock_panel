import React, { useEffect, useState, useMemo } from "react";
import BacktestChartGeneric from "./BackTestChartGeneric";
import API from "../../API";
import BackTesterStatus from "./components/BackTesterStatus";
import { GetSymbolBtn } from "./components/styled";

export default function GptChart({ Socket }) {
    const [symbol, setSymbol] = useState("ES");

    const [data, setData] = useState([]);

    function startBackTest() {
        alert("not yet implemented");
        return;
        Socket.emit("to-backtester", {
            type: "start-backtest",
            time: 0,
        });
    }

    useEffect(() => {
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
            Socket.off("backtester-bar-update");
        };
    }, []);

    async function getBacktestData(symbol) {
        setData(null);
        const data = await API.getBacktestData(symbol);
        setData(data);
    }

    const PlantStatusesMemo = useMemo(
        () => <BackTesterStatus Socket={Socket} />,

        [Socket]
    );

    const backTestChartData = {
        height: 400,
        width: 1500,
        data,
        Socket,
        symbol,
    };

    return (
        <div className="container">
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
            {/* <div className="col">
                <SetIndicatorBtn
                    onClick={() => setEnableCombinedKeyLevels(!enableCombinedKeyLevels)}
                    indicatorName="CombinedKeyLevels"
                    enabled={enableCombinedKeyLevels}
                />
                <SetIndicatorBtn onClick={() => setEnableMinMax(!enableMinMax)} indicatorName="MinMax" enabled={enableMinMax} />
                <SetIndicatorBtn onClick={() => setEnablePivots(!enablePivots)} indicatorName="Pivots" enabled={enablePivots} />
            </div> */}
            <div className="row">
                {/* <div className="col">
                    <div ref={OldPixiChartRef}></div>
                </div> */}
                {symbol && data && <BacktestChartGeneric {...backTestChartData} />}
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
                    Scale: x - {Math.floor(data.eventData?.screen?.scale?._x * 100) / 100} y -{" "}
                    {Math.floor(data.eventData?.screen?.scale?._y * 100) / 100}
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
                    Scale: x - {Math.floor(data.eventData?.world?.scale?._x * 100) / 100} y -{" "}
                    {Math.floor(data.eventData?.world?.scale?._y * 100) / 100}
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
                    Scale: x - {Math.floor(data.eventData?.viewport?.scale?._x * 100) / 100} y -{" "}
                    {Math.floor(data.eventData?.viewport?.scale?._y * 100) / 100}
                </p>
            </div>
        </div>
    );
}
