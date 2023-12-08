import React, { useEffect, useRef, useState, useMemo } from "react";

import API from "../../API";
import BackTesterStatus from "./components/BackTesterStatus";
import Trades from "./components/Trades";
import BTRC from "./components/BacktestResultsChart";
import moment from "moment";

const CONST = {
    getMoveGoingLimit: 1.5,
    valueAreaRange: 5,
    valueAreaOffset: 2,
    reEnterValueBuffer: 0,
    goodTimeStart: 9,
    goodTimeEnd: 16,
    totalDaysToGet: 3,
    daysOffset: 0,
};
export default function GptChart({ Socket }) {
    const [data, setData] = useState({
        seconds: [],
        largerTimeframes: {},
    });
    const [backtestResultsDate, setBacktestResultsDate] = useState("");
    const [results, setResults] = useState({ trades: [] });
    const [selectedTrades, setSelectedTrades] = useState([]);

    const [getMoveGoingLimit, setGetMoveGoingLimit] = useState(CONST.getMoveGoingLimit);
    const [valueAreaRange, setValueAreaRange] = useState(CONST.valueAreaRange);
    const [valueAreaOffset, setValueAreaOffset] = useState(CONST.valueAreaOffset);
    const [reEnterValueBuffer, setReEnterValueBuffer] = useState(CONST.reEnterValueBuffer);
    const [goodTimeStart, setGoodTimeStart] = useState(CONST.goodTimeStart);
    const [goodTimeEnd, setGoodTimeEnd] = useState(CONST.goodTimeEnd);
    const [totalDaysToGet, setTotalDays] = useState(CONST.totalDaysToGet);
    const [daysOffset, setDaysOffset] = useState(CONST.daysOffset);
    const [volSpikeLimit, setVolSpikeLimit] = useState(2);

    const backtestArgs = {
        getMoveGoingLimit,
        valueAreaRange,
        valueAreaOffset,
        reEnterValueBuffer,
        goodTimeStart,
        goodTimeEnd,
        totalDaysToGet,
        daysOffset,
        volSpikeLimit,
    };
    // async function getAndSetData() {
    //     const symbol = "ES";
    //     const from = 1671185580000;
    //     const to = 1671186720000;
    //     const data = await API.getTicksFrom({ symbol, from, to });
    //     const ticks = data.map((d) => d.ticks).flat();
    //     console.log(ticks);
    //     setData(ticks);
    // }

    useEffect(() => {
        setBacktestResultsDate("");

        setSelectedTrades([]);
    }, [results]);

    useEffect(() => {
        // BACK TESTER
        Socket.on("backtester-bars", (d) => {
            console.log(d);
            setData(d);
        });

        Socket.on("backtester-bar-update", (d) => {
            console.log(d);
        });

        Socket.on("backtest-results", (d) => {
            console.log(d);
            setResults(d);
        });

        // Socket.emit("to-backtester", {
        //     type: "weeklyData",
        // });

        return () => {
            Socket.off("backtester-bars");
            Socket.off("backtester-bar-update");
        };
    }, []);

    const PlantStatusesMemo = useMemo(
        () => <BackTesterStatus Socket={Socket} />,

        [Socket]
    );

    // const TradesMemo = useMemo(() => {
    //     return <Trades trades={results.trades} />;
    // }, [results.trades]);

    return (
        <div className="container">
            {PlantStatusesMemo}
            <div className="row">
                <h3>BACK TEST RESULTS</h3>
            </div>

            <div className="row ">
                <div className="col-sm-4 col-xl-2 col-xxl-2">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            // alert("Submit this");
                            Socket.emit("getBacktestResults", {
                                // type: "runValueAreaBacktest",
                                backtestArgs,
                            });
                        }}
                    >
                        <VariableInput inputClass="btn btn-primary" type="submit" value="Submit" />
                        <VariableInput
                            hint={`How many xTimes bigger than vol avg to trigger volume spike.`}
                            name="volSpikeLimit"
                            value={volSpikeLimit}
                            onChange={setVolSpikeLimit}
                        />
                        <VariableInput value={totalDaysToGet} hint={`How many to run backtest.`} name="totalDaysToGet" onChange={setTotalDays} />
                        <VariableInput value={daysOffset} hint={`How many days to offset start of backtest.`} name="daysOffset" onChange={setDaysOffset} />
                        <VariableInput
                            value={getMoveGoingLimit}
                            hint={`How many points must a bar move back towards value once outside to signal "Get the move going" Default 0.`}
                            name="getMoveGoingLimit"
                            onChange={setGetMoveGoingLimit}
                        />
                        <VariableInput hint={`How many points VAH and VAL span .`} name="valueAreaRange" value={valueAreaRange} onChange={setValueAreaRange} />
                        <VariableInput
                            hint={`How many points outside value to trigger "Outside" .`}
                            name="valueAreaOffset"
                            value={valueAreaOffset}
                            onChange={setValueAreaOffset}
                        />
                        <VariableInput
                            hint={`How many points inside value to trigger "Inside".`}
                            name="reEnterValueBuffer"
                            value={reEnterValueBuffer}
                            onChange={setReEnterValueBuffer}
                        />
                        <VariableInput
                            hint={`Hour After what time can trades trigger.`}
                            name="goodTimeStart"
                            value={goodTimeStart}
                            onChange={setGoodTimeStart}
                        />
                        <VariableInput hint={`Hour Before what time can trades trigger.`} name="goodTimeEnd" value={goodTimeEnd} onChange={setGoodTimeEnd} />
                    </form>
                </div>

                <div className="col border">
                    <BTRC.OneSecond trades={selectedTrades} guid={1} data={data} />

                    {data.largerTimeFrames && <BTRC.LargerTimeFrames trades={selectedTrades} guid={3} data={data} tf={1} />}
                    {data.largerTimeFrames && <BTRC.LargerTimeFrames trades={selectedTrades} guid={4} data={data} tf={5} />}
                    {data.largerTimeFrames && <BTRC.LargerTimeFrames trades={selectedTrades} guid={5} data={data} tf={15} />}
                    {data.largerTimeFrames && <BTRC.LargerTimeFrames trades={selectedTrades} guid={6} data={data} tf={30} />}
                </div>
                {/* <div className="col-sm-4 col-xxl-2">{TradesMemo}</div> */}
                <div className="col-sm-4 col-xxl-2">
                    <Trades
                        backtestResultsDate={backtestResultsDate}
                        trades={results.trades}
                        getBacktestDay={async (date) => {
                            if (backtestResultsDate === date) return;
                            const backtestDayData = await API.getBacktestDay({ symbol: "ES", exchange: "CME", date: encodeURIComponent(date) });
                            setBacktestResultsDate(date);
                            debugger;
                            setData(backtestDayData);
                            const filteredTrades = results.trades.filter((t) => {
                                return moment(t.datetimeOpen).isSame(moment(date), "day");
                            });
                            setSelectedTrades(filteredTrades);
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

function VariableInput(props) {
    const { inputClass = "", name, type = "number", value = 0, hint = null, onChange = () => {} } = props;

    // const [val, setVal] = useState(type === "number" ? parseInt(value) : value);
    // useEffect(() => {
    //     onChange(val);
    // }, [val]);

    return (
        <div className=" form-group text-break">
            {name && <label htmlFor={`variable-input-${name}`}>{name}</label>}
            <input onChange={(e) => onChange(e.target.value)} className={`form-control ${inputClass}`} type={type} value={value} />
            {hint && (
                <small id={`variable-input-${name}Help`} class=" text-break form-text text-muted">
                    {hint}
                </small>
            )}
        </div>
    );
}
