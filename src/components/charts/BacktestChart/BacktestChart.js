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
        // Socket.emit("to-backtester", {
        //     type: "start-backtest",
        //     time: 0,
        // });
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
    }, [Socket]);

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

            <div className="row">{symbol && data && <BacktestChartGeneric {...backTestChartData} />}</div>
            <div></div>
        </div>
    );
}
