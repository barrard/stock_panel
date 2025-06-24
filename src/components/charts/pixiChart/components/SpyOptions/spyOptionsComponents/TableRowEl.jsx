import React, { useState } from "react";
import { TableRow, Lvl2Text, PutCell, CallCell, StrikeCellCenter, PutChangeCell, CallChangeCell, ChartTableRow } from "./styledComponents";
import OptionContractChart from "../OptionContractChart";
const formatPrice = (price) => {
    if (price === null || price === undefined) return "-";
    return price.toFixed(2);
};

const formatVolume = (volume) => {
    if (!volume) return "-";
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
    return volume.toString();
};

const formatPercent = (percent) => {
    if (percent === null || percent === undefined) return "-";
    const sign = percent >= 0 ? "+" : "";
    return `${sign}${percent.toFixed(2)}%`;
};

export default function TableRowEl({ putOption, strike, exp, callOption, putLvl2, callLvl2, spyLevelOne, Socket }) {
    const [showChart, setShowChart] = useState(false);
    const putBreakEven = strike - putOption?.last;
    const putBreakEvenPercent = ((putBreakEven - spyLevelOne?.lastPrice) / spyLevelOne?.lastPrice) * 100;
    const callBreakEven = strike + callOption?.last;
    const callBreakEvenPercent = ((callBreakEven - spyLevelOne?.lastPrice) / spyLevelOne?.lastPrice) * 100;

    const spyPutOptionContractChart = {
        // candleData: candleData.spy1MinData,
        height: 500,
        width: 600,
        spyLevelOne,
        Socket,
        symbol: "SPY",
        strike,
        putCall: "PUT",
        exp,
        tick: putOption,
    };

    const spyCallOptionContractChart = {
        // candleData: candleData.spy1MinData,
        height: 500,
        width: 600,
        spyLevelOne,
        Socket,
        symbol: "SPY",
        strike,
        putCall: "CALL",
        exp,
        tick: callOption,
    };

    return (
        <>
            <TableRow onClick={() => setShowChart(!showChart)}>
                {/* PUT Data (right-aligned) */}
                <PutChangeCell positive={putOption?.percentChange >= 0}>
                    {putOption ? formatPercent(putOption.percentChange) : "-"}
                </PutChangeCell>
                {/* <PutCell>{putOption?.delta ? putOption.delta.toFixed(3) : "-"}</PutCell> */}
                {/* <PutCell>{putOption?.volatility ? `${putOption.volatility.toFixed(1)}%` : "-"}</PutCell> */}
                <PutCell>{putOption ? formatVolume(putOption.openInterest) : "-"}</PutCell>
                <PutCell>{putOption ? formatVolume(putOption.totalVolume) : "-"}</PutCell>
                {/* UPDATED PUT ASK CELL */}
                <PutCell>
                    {putOption ? formatPrice(putOption.ask) : "-"}
                    {putLvl2?.askSideLevels?.[0] && <Lvl2Text>@{putLvl2.askSideLevels[0].size}</Lvl2Text>}
                </PutCell>{" "}
                <PutCell style={{ fontWeight: 500 }}>
                    {putOption ? formatPrice(putOption.last) : "-"}
                    {putOption?.gamma != undefined && <Lvl2Text>Gex {putOption.gamma}</Lvl2Text>}
                    <Lvl2Text>BE {putBreakEven.toFixed(2)}</Lvl2Text>
                    <Lvl2Text>BE% {putBreakEvenPercent.toFixed(2)}</Lvl2Text>
                </PutCell>
                {/* UPDATED PUT BID CELL */}
                <PutCell>
                    {putOption ? formatPrice(putOption.bid) : "-"}
                    {putLvl2?.bidSideLevels?.[0] && <Lvl2Text>@{putLvl2.bidSideLevels[0].size}</Lvl2Text>}
                </PutCell>
                {/* STRIKE (center) */}
                <StrikeCellCenter>{strike.toFixed(0)}</StrikeCellCenter>
                {/* CALL Data (left-aligned) */}
                {/* UPDATED CALL BID CELL */}
                <CallCell>
                    {callOption ? formatPrice(callOption.bid) : "-"}
                    {callLvl2?.bidSideLevels?.[0] && <Lvl2Text>@{callLvl2.bidSideLevels[0].size}</Lvl2Text>}
                </CallCell>{" "}
                <CallCell style={{ fontWeight: 500 }}>
                    {callOption ? formatPrice(callOption.last) : "-"}
                    {callOption?.gamma != undefined && <Lvl2Text>Gex {callOption.gamma}</Lvl2Text>}
                    <Lvl2Text>BE {callBreakEven.toFixed(2)}</Lvl2Text>
                    <Lvl2Text>BE% {callBreakEvenPercent.toFixed(2)}</Lvl2Text>
                </CallCell>
                {/* UPDATED CALL ASK CELL */}
                <CallCell>
                    {callOption ? formatPrice(callOption.ask) : "-"}
                    {callLvl2?.askSideLevels?.[0] && <Lvl2Text>@{callLvl2.askSideLevels[0].size}</Lvl2Text>}
                </CallCell>{" "}
                <CallCell>{callOption ? formatVolume(callOption.totalVolume) : "-"}</CallCell>
                <CallCell>{callOption ? formatVolume(callOption.openInterest) : "-"}</CallCell>
                {/* <CallCell>{callOption?.volatility ? `${callOption.volatility.toFixed(1)}%` : "-"}</CallCell> */}
                {/* <CallCell>{callOption?.delta ? callOption.delta.toFixed(3) : "-"}</CallCell> */}
                <CallChangeCell positive={callOption?.percentChange >= 0}>
                    {callOption ? formatPercent(callOption.percentChange) : "-"}
                </CallChangeCell>
            </TableRow>
            {showChart && (
                <ChartTableRow>
                    <td colSpan={13}>
                        {" "}
                        {/* Adjust the number based on your actual column count */}
                        <div className="row">
                            <div className="col-6">
                                <OptionContractChart {...spyPutOptionContractChart} />
                            </div>
                            <div className="col-6">
                                <OptionContractChart {...spyCallOptionContractChart} />
                            </div>
                        </div>
                    </td>
                </ChartTableRow>
            )}
        </>
    );
}
