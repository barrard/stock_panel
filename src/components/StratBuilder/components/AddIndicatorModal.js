import React, { useState, useEffect } from "react";
import { LoadingButton } from "./components";
import API from "../../API";
import StratContext from "../StratContext";
import { getGroups } from "./utilFuncs";
import ChartContext from "./ChartContext";

import {
    SelectIndicatorGroup,
    SelectIndicatorName,
    InputTypes,
    IndicatorInputs,
    InputDataPreset,
    InputRealDataSource,
    MA_Options,
    Ind_Input,
    MA_SELECT,
    LineColors,
} from "./IndicatorComponents";

let PATTERN_RESULTS = {
    rankings: [],
    results: {},
};
export default function AddIndicatorModal({
    symbol,
    timeframe,
    setAddIndicators,
}) {
    const [indicatorName, setIndicatorName] = useState({
        name: "",
        fullName: "",
    });
    const [selectedGroup, setSelectedGroup] = useState("");
    const [groupLIst, setGroupLIst] = useState([]);
    const [indicatorOpts, setIndicatorOpts] = useState({});
    const [indicator, setIndicator] = useState(false);
    const [selectedInput, setSelectedInput] = useState(["close"]);
    const [loadingIndicator, setLoadingIndicator] = useState(false);
    const [variablePeriods, setVariablePeriods] = useState([]);
    const [color, setColor] = useState({});
    const [patternResults, setPatternResults] = useState(PATTERN_RESULTS);
    const {
        indicatorList,
        setSelectedStrat,
        selectedStrat,
        charts,
        strategies,
        setStrategies,
        updateIndicatorResults,
    } = React.useContext(StratContext);
    let { selectedPatternResults, setSelectedPatternResults } =
        React.useContext(ChartContext);

    useEffect(() => {
        // console.log("IndicatorModal OPEN");
        // console.log(talib)
        setGroupLIst(getGroups(indicatorList));

        return () => {
            // console.log("IndicatorModal close bye");
        };
    }, []);

    useEffect(() => {
        let colors = {};
        if (!indicator.outputs?.length) return;
        indicator.outputs.forEach((line) => (colors[line["name"]] = "red"));
        setColor(colors);
    }, [indicator.outputs]);

    const addIndicator = async () => {
        try {
            let { data, id } = charts[symbol][timeframe];
            setLoadingIndicator(true);
            // console.log({
            // 	selectedInput,
            // 	indicator,
            // 	indicatorOpts,
            // 	indicatorName,
            // });
            let options = {};
            for (let name in indicatorOpts) {
                options[name] = indicatorOpts[name].defaultValue;
            }
            //is this "inReal"?
            // let isInReal;
            // if (indicator.inputs[0].name === "inReal") isInReal = true;
            let dataInputs = {};
            let selectedInputs = {};
            Object.keys(selectedInput).forEach((input) => {
                selectedInputs[input] = selectedInput[input];
                dataInputs[input] = data.map((d) => d[selectedInput[input]]);
            });

            let resp = await API.submitIndicator({
                selectedStrat: selectedStrat._id,
                indicatorOpts,
                indicatorName,
                options,
                inputs: indicator.inputs,
                dataInputs,
                selectedInputs,
                priceDataId: id,
                color,
                variablePeriods,
            });
            setLoadingIndicator(false);

            if (resp) {
                //lets assume this all worked, so we can close the indicator model
                setAddIndicators(false);
                let { newIndicator, result } = resp;

                //ADD indicator data
                updateIndicatorResults({
                    symbol,
                    timeframe,
                    indicator: newIndicator,
                    result,
                });

                let stratIndex = strategies.findIndex(
                    (strat) => strat._id === selectedStrat._id
                );
                strategies[stratIndex].indicators.push(newIndicator);
                setStrategies([...strategies]);
                setSelectedStrat({ ...strategies[stratIndex] });
            }
        } catch (err) {
            setLoadingIndicator(false);
            console.log(err);
        }
    };

    // console.log({
    // 	selectedPatternResults,
    // });
    return (
        <div>
            <div>
                <button
                    onClick={async () => {
                        let results = await API.getAllChartPatterns(
                            charts[symbol][timeframe]
                        );
                        if (!results || !results.results) {
                            return console.error("no results?!");
                        }

                        results = results.results;
                        let rankings = [];
                        for (let line in results) {
                            let patternCount = {
                                patternName: line,
                                count: 0,
                            };
                            // console.log(results[line]);
                            // console.log(results[line].result);
                            results[line].result.outInteger.forEach((v) =>
                                v !== 0 ? patternCount.count++ : undefined
                            );
                            rankings.push(patternCount);
                        }
                        rankings = rankings.sort((a, b) => b.count - a.count);
                        if (rankings.length) {
                            PATTERN_RESULTS = { rankings, results };
                        }
                        setPatternResults({ rankings, results });
                    }}
                >
                    Get all Patterns
                </button>
                {patternResults.rankings.length > 0 && (
                    <select
                        name=""
                        id=""
                        value={selectedPatternResults.pattern}
                        onChange={(e) => {
                            setSelectedPatternResults({
                                pattern: e.target.value,
                                result: patternResults.results[e.target.value],
                            });
                        }}
                    >
                        {patternResults.rankings.map((rank) => (
                            <option
                                key={rank.patternName}
                                value={rank.patternName}
                            >{`${rank.patternName} ${rank.count}`}</option>
                        ))}
                    </select>
                )}
            </div>
            <SelectIndicatorGroup
                setSelectedGroup={setSelectedGroup}
                groupLIst={groupLIst}
                setIndicatorName={setIndicatorName}
                selectedGroup={selectedGroup}
            />
            {selectedGroup && (
                <SelectIndicatorName
                    setIndicatorName={setIndicatorName}
                    indicatorList={indicatorList}
                    setIndicator={setIndicator}
                    indicatorName={indicatorName}
                    setIndicatorOpts={setIndicatorOpts}
                    setSelectedInput={setSelectedInput}
                    selectedGroup={selectedGroup}
                />
            )}
            {indicatorName.name && (
                <>
                    <IndicatorInputs
                        indicatorOpts={indicatorOpts}
                        setIndicatorOpts={setIndicatorOpts}
                    />
                    <InputTypes
                        indicator={indicator}
                        setSelectedInput={setSelectedInput}
                        selectedInput={selectedInput}
                        setVariablePeriods={setVariablePeriods}
                        variablePeriods={variablePeriods}
                    />

                    <LineColors
                        indicator={indicator}
                        color={color}
                        setColor={setColor}
                    />
                </>
            )}
            <LoadingButton
                disabled={!indicatorName.name}
                loading={loadingIndicator}
                name="Add Indicator"
                submit={() => addIndicator()}
            />
        </div>
    );
}
