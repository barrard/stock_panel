import React, { useState } from "react";
import StratContext from "../../../StratContext";
import { StyledTargetResult, StyledTargetItem } from "./Styled";
import { LoadingButton } from "../../../components";

import {
    getOhlcResults,
    findIndicatorResults,
    getPriceResults,
    getIndicatorResults,
    formatRange,
    evalConditional,
} from "./utils";
export default function ConditionalItem({ item }) {
    let { target1, target2, equality } = item;

    const [deleting, setDeleting] = useState(false);
    const [hover, setHover] = useState(false);
    //get the data?
    let {
        API,
        charts,
        indicatorResults,
        setConditionals,
        conditionals,
        chartConditionals,
    } = React.useContext(StratContext);

    console.log(charts);
    let applyToChart = chartConditionals[item._id] ? true : false;

    let target1Value, target2Value;

    if (target1.type === "indicator") {
        let results = findIndicatorResults(target1, indicatorResults);
        if (!results) return <></>;
        target1Value = getIndicatorResults(results, target1);
    } else if (target1.type === "value") {
        target1Value = target1.indexOrRangeValue;
    } else if (target1.type === "OHLC") {
        let results = getOhlcResults(target1, charts);
        target1Value = getPriceResults(target1, results);
    }
    //target 2

    if (target2.type === "indicator") {
        let results = findIndicatorResults(target2, indicatorResults);
        if (!results) return <></>;
        target2Value = getIndicatorResults(results, target2);
    } else if (target2.type === "value") {
        target2Value = target2.indexOrRangeValue;
    } else if (target2.type === "OHLC") {
        let results = getOhlcResults(target2, charts);
        target2Value = getPriceResults(target2, results);
    }
    //   console.log({ target1Value, target2Value })
    //eval before formatting the values
    let currentResult = evalConditional({
        equality,
        val1: target1Value,
        val2: target2Value,
    });

    if (Array.isArray(target1Value)) target1Value = formatRange(target1Value);
    if (Array.isArray(target2Value)) target2Value = formatRange(target2Value);

    const deleteConditional = async () => {
        let resp = await API.deleteConditional(item);
        console.log(resp);
        setConditionals(conditionals.filter((c) => c._id !== item._id));
    };
    const DeleteBtn = () => {
        return (
            <LoadingButton
                disabled={false}
                loading={deleting}
                submit={deleteConditional}
                name={"X"}
            />
        );
    };
    return (
        <div
            style={{
                border: "1px solid white",
                margin: "1em 0",
                display: "flex",
                alignItems: "center",
            }}
        >
            <div
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
                style={{
                    transition: "all 0.3s ease",
                    width: "80%",
                    boxShadow:
                        hover && applyToChart
                            ? `inset 0em 0em 1em gold`
                            : hover
                            ? "inset 0em 0em 1em blue"
                            : applyToChart
                            ? `inset 0em 0em 1em ${
                                  currentResult ? "green" : "red"
                              }`
                            : "none",
                    cursor: applyToChart ? "pointer" : "inherit",
                }}
            >
                <div style={{ display: "flex" }}>
                    <StyledTargetItem>{item.name}</StyledTargetItem>
                    <StyledTargetItem>{target1.symbol}</StyledTargetItem>
                    <StyledTargetItem>{target1.timeframe}</StyledTargetItem>
                    <StyledTargetItem>{target1Value}</StyledTargetItem>
                </div>
                <div style={{ display: "flex" }}>
                    <StyledTargetItem>{item.name}</StyledTargetItem>
                    <StyledTargetItem>{target2.symbol}</StyledTargetItem>
                    <StyledTargetItem>{target2.timeframe}</StyledTargetItem>
                    <StyledTargetItem>{target2Value}</StyledTargetItem>
                </div>
            </div>
            <StyledTargetResult color={currentResult ? "green" : "red"}>
                {currentResult ? "True" : "False"}
            </StyledTargetResult>
            <DeleteBtn item={item} />
        </div>
    );
}
