import React, { useState, useEffect, useCallback } from "react";
import styled from "styled-components";
import { eastCoastTime } from "../../../../../indicators/indicatorHelpers/IsMarketOpen";
import SpyChart, { defaultSpyIndicators } from "./SpyChart";

// Only the timeframes the server actually ships in the "spyCandles" payload
// (see TD_service_lite services/TD_Socket.js -> getSpyCandles handler).
const TIMEFRAMES = [
    { value: "spy1MinData", label: "1M" },
    { value: "spy5MinData", label: "5M" },
    { value: "spy30MinData", label: "30M" },
];

const ToolbarLabel = styled.span`
    color: #888;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-right: 4px;
`;

const ToolbarButton = styled.button`
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 500;
    line-height: 1.1;
    white-space: nowrap;
    border-radius: 3px;
    border: 1px solid ${(props) => (props.active ? props.activeColor || "#0088ff" : "#444")};
    background: ${(props) => (props.active ? props.activeColor || "#0088ff" : "transparent")};
    color: ${(props) => (props.active ? "#fff" : "#aaa")};
    cursor: pointer;
    transition:
        background 0.15s,
        color 0.15s,
        border-color 0.15s;

    &:hover {
        color: #fff;
        border-color: ${(props) => props.activeColor || "#0088ff"};
    }
`;

const ExpirationSelect = styled.select`
    background: #1e1e1e;
    color: #ccc;
    border: 1px solid #444;
    border-radius: 3px;
    font-size: 11px;
    padding: 3px 6px;
    cursor: pointer;
`;

function formatExpiration(expKey) {
    const [date, days] = expKey.split(":");
    const dateObj = new Date(date);
    const estObj = eastCoastTime(date);
    const monthShort = dateObj.toLocaleDateString("en-US", { month: "short" });
    return `${monthShort} ${estObj.date} (${days}d)`;
}

/**
 * Self-contained SPY chart panel for the main (futures) page.
 *
 * Owns the option-chain socket feed and the toolbar state (timeframe, indicators,
 * calls/puts) so the controls can live above the chart instead of inside it.
 */
export default function SpyPanel({ Socket, height = 300 }) {
    const [callsData, setCallsData] = useState(null);
    const [putsData, setPutsData] = useState(null);
    const [spyLevelOne, setSpyLevelOne] = useState(null);
    const [selectedExpiration, setSelectedExpiration] = useState(null);

    const [callsOrPuts, setCallsOrPuts] = useState("CALLS");
    const [timeframe, setTimeframe] = useState("spy1MinData");
    const [indicators, setIndicators] = useState(defaultSpyIndicators);

    const toggleIndicator = (id) => {
        setIndicators((prev) => prev.map((ind) => (ind.id === id ? { ...ind, enabled: !ind.enabled } : ind)));
    };

    useEffect(() => {
        Socket.on("spyOptionSnaps", (d) => {
            setCallsData(d?.callExpDateMap);
            setPutsData(d?.putExpDateMap);
        });

        Socket.on("spyLevelOne", (d) => {
            setSpyLevelOne(d);
        });

        return () => {
            Socket.off("spyOptionSnaps");
            Socket.off("spyLevelOne");
        };
    }, [Socket]);

    // Default to the nearest expiration
    useEffect(() => {
        if (!selectedExpiration && callsData) {
            setSelectedExpiration(Object.keys(callsData)[0]);
        }
    }, [selectedExpiration, callsData]);

    const expirations = useCallback(() => {
        const callExps = callsData ? Object.keys(callsData) : [];
        const putExps = putsData ? Object.keys(putsData) : [];
        return [...new Set([...callExps, ...putExps])].sort();
    }, [callsData, putsData])();

    const getCurrentStrikeData = useCallback(() => {
        if (!selectedExpiration) return { callsCurrentData: {}, putsCurrentData: {} };
        return {
            callsCurrentData: callsData?.[selectedExpiration] || {},
            putsCurrentData: putsData?.[selectedExpiration] || {},
        };
    }, [callsData, putsData, selectedExpiration]);

    return (
        <>
            <div className="platform-toolbar row">
                <div className="toolbar-group">
                    <ToolbarLabel>SPY</ToolbarLabel>
                    {TIMEFRAMES.map((tf) => (
                        <ToolbarButton key={tf.value} active={timeframe === tf.value} onClick={() => setTimeframe(tf.value)}>
                            {tf.label}
                        </ToolbarButton>
                    ))}
                </div>

                <div className="toolbar-divider" />

                <div className="toolbar-group">
                    {indicators.map((indicator) => (
                        <ToolbarButton
                            key={indicator.id}
                            active={indicator.enabled}
                            activeColor="#16a34a"
                            onClick={() => toggleIndicator(indicator.id)}
                        >
                            {indicator.name}
                        </ToolbarButton>
                    ))}
                </div>

                <div className="toolbar-divider" />

                <div className="toolbar-group">
                    <ToolbarButton
                        active={callsOrPuts === "CALLS"}
                        activeColor="#10b981"
                        onClick={() => setCallsOrPuts("CALLS")}
                    >
                        CALLS
                    </ToolbarButton>
                    <ToolbarButton active={callsOrPuts === "PUTS"} activeColor="#ef4444" onClick={() => setCallsOrPuts("PUTS")}>
                        PUTS
                    </ToolbarButton>
                </div>

                {expirations.length > 0 && (
                    <>
                        <div className="toolbar-divider" />
                        <div className="toolbar-group">
                            <ExpirationSelect
                                value={selectedExpiration || ""}
                                onChange={(e) => setSelectedExpiration(e.target.value)}
                            >
                                {expirations.map((expKey) => (
                                    <option key={expKey} value={expKey}>
                                        {formatExpiration(expKey)}
                                    </option>
                                ))}
                            </ExpirationSelect>
                        </div>
                    </>
                )}
            </div>

            <SpyChart
                height={height}
                Socket={Socket}
                spyLevelOne={spyLevelOne}
                getCurrentStrikeData={getCurrentStrikeData}
                callsOrPuts={callsOrPuts}
                callsData={callsData}
                putsData={putsData}
                timeframe={timeframe}
                setTimeframe={setTimeframe}
                indicators={indicators}
                setIndicators={setIndicators}
                hideControls={true}
            />
        </>
    );
}
