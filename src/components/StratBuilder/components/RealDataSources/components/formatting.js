import React from "react";
import { toFixedIfNeed } from "../../utilFuncs";
import { StyledDataTail, SmallLabel } from "./styled";
import { IsSelectable } from "../../styled";

const styles = {
    alignCenter: { display: "flex", alignItems: "center" },
};

let tailLen = -10;
export const ShowDataTail = ({ data, type }) => {
    if (!data) return <></>;
    let isTime = type === "timestamp";
    // console.log(data, type)
    return (
        <div style={styles.alignCenter}>
            <SmallLabel>{type} : </SmallLabel>
            {data.slice(tailLen).map((d, i) => (
                <StyledDataTail
                    color={ohlcColor(d, type)}
                    key={i}
                    title={d[type]}
                >{`${toFixedIfNeed(d[type], isTime)}, `}</StyledDataTail>
            ))}
            ....
        </div>
    );
};

export const ShowArrayTail = ({ data, type, color }) => {
    return (
        <div>
            <SmallLabel color={color}>{type} : </SmallLabel>
            {data.slice(tailLen).map((d, i) => (
                <React.Fragment key={i}>
                    <StyledDataTail title={d}>{`${toFixedIfNeed(
                        d
                    )}, `}</StyledDataTail>
                </React.Fragment>
            ))}
            ....
        </div>
    );
};

function ohlcColor(d, type) {
    // console.log({ d, type });
    if (type === "volume" || type === "timestamp") {
        // console.log("todo volume");
    } else {
        const open = d["open"];
        const high = d["high"];
        const low = d["low"];
        const close = d["close"];
        // console.log({ open, high, low, close });
        if (type === "high") return "red";
        if (type === "low") return "green";
        const openHighDiff = high - open;
        const closeHighDiff = high - close;
        const openLowDiff = open - low;
        const closeLowDiff = close - low;
        const openCloseDiff = Math.abs(open - close);

        debugger;
        if (type === "open") {
            if (openLowDiff < openHighDiff && openLowDiff < openCloseDiff) {
                return "red";
            } else if (
                openHighDiff < openLowDiff &&
                openHighDiff < openCloseDiff
            ) {
                return "green";
            } else return "yellow";
        } else if (type === "close") {
            if (closeLowDiff < closeHighDiff && closeLowDiff < openCloseDiff) {
                return "red";
            } else if (
                closeHighDiff < closeLowDiff &&
                closeHighDiff < openCloseDiff
            ) {
                return "green";
            } else return "yellow";
        }
        return "red";
    }
}
