import React, { useState, useEffect, useRef, useCallback } from "react";
import GenericPixiChart from "../../../GenericPixiChart";
import API from "../../../../API";
import { IconButton } from "../../../../StratBuilder/components";
import IndicatorsBtns from "../IndicatorsBtns";
import { useToggleIndicator } from "../../../hooks/useToggleIndicator";

const BetterTickChart = (props) => {
    const { height = 400, symbol = "SPY", Socket, fullSymbolRef } = props;

    const pixiDataRef = useRef();
    const [candleData, setCandleData] = useState([]);
    const [join, setJoin] = useState(1);
    const rawDataRef = useRef([]);

    // Indicators configuration
    const [indicators, setIndicators] = useState([
        {
            id: "orders",
            name: "Orders",
            enabled: false,
            drawFunctionKey: "draw",
            instanceRef: null,
        },
        // Add more indicators here as needed
    ]);

    // Use custom hook for indicator toggling
    const toggleIndicator = useToggleIndicator(indicators, setIndicators, "tick");

    // Function to update indicator options
    const updateIndicatorOptions = useCallback((indicatorId, newOptions) => {
        console.log('[BetterTickChart updateIndicatorOptions] Called with:', indicatorId, newOptions);
        setIndicators((prevIndicators) => {
            return prevIndicators.map((ind) => {
                if (ind.id === indicatorId) {
                    const updatedIndicator = {
                        ...ind,
                        options: { ...ind.options, ...newOptions },
                    };

                    // If the indicator is enabled and has an instance, update it
                    if (updatedIndicator.enabled && updatedIndicator.instanceRef) {
                        const instance = updatedIndicator.instanceRef;
                        // Add specific update logic here based on indicator type
                    }

                    return updatedIndicator;
                }
                return ind;
            });
        });
    }, []);

    // Function to combine bars on the frontend
    const combineBars = (bars, joinValue) => {
        if (joinValue <= 1 || bars.length === 0) return bars;

        const combined = [];
        for (let i = 0; i < bars.length; i += joinValue) {
            const barsToJoin = bars.slice(i, i + joinValue);
            if (barsToJoin.length === 0) continue;

            const combinedBar = {
                open: barsToJoin[0].open,
                high: Math.max(...barsToJoin.map(b => b.high)),
                low: Math.min(...barsToJoin.map(b => b.low)),
                close: barsToJoin[barsToJoin.length - 1].close,
                volume: barsToJoin.reduce((sum, b) => sum + (b.volume || 0), 0),
                datetime: barsToJoin[barsToJoin.length - 1].datetime,
                timestamp: barsToJoin[barsToJoin.length - 1].timestamp || barsToJoin[barsToJoin.length - 1].datetime,
                symbol: barsToJoin[0].symbol,
            };
            combined.push(combinedBar);
        }
        return combined;
    };

    const fetchData = async (opts = {}) => {
        const data = await API.getCustomTicks(opts);
        console.log("BetterTickChart data loaded:", data);
        rawDataRef.current = data;
        const combined = combineBars(data, join);
        setCandleData(combined);
    };

    useEffect(() => {
        console.log("BetterTickChart loaded");
        fetchData({ symbol, limit: 2000 });

        Socket.on("better-tick", (data) => {
            console.log("better-tick", data);
            if (data.symbol !== symbol) return;

            // Add new bar to raw data
            rawDataRef.current.push(data);

            if (join === 1) {
                // No joining needed, just add the bar directly
                setCandleData(prev => [...prev, data]);
                if (pixiDataRef.current) {
                    pixiDataRef.current.setNewBar(data);
                    pixiDataRef.current.updateCurrentPriceLabel(data.close);
                }
            } else {
                // Determine which bars should be in the last combined bar
                const totalBars = rawDataRef.current.length;
                const lastCombinedStartIndex = Math.floor((totalBars - 1) / join) * join;
                const barsForLastCombined = rawDataRef.current.slice(lastCombinedStartIndex);
                const isNewCombinedBar = barsForLastCombined.length === 1; // First bar of a new combined bar

                const lastCombinedBar = {
                    open: barsForLastCombined[0].open,
                    high: Math.max(...barsForLastCombined.map(b => b.high)),
                    low: Math.min(...barsForLastCombined.map(b => b.low)),
                    close: barsForLastCombined[barsForLastCombined.length - 1].close,
                    volume: barsForLastCombined.reduce((sum, b) => sum + (b.volume || 0), 0),
                    datetime: barsForLastCombined[barsForLastCombined.length - 1].datetime,
                    timestamp: barsForLastCombined[barsForLastCombined.length - 1].timestamp || barsForLastCombined[barsForLastCombined.length - 1].datetime,
                    symbol: data.symbol,
                };

                if (isNewCombinedBar) {
                    // Add new combined bar
                    setCandleData(prev => [...prev, lastCombinedBar]);
                } else {
                    // Update existing combined bar
                    setCandleData(prev => {
                        const newData = [...prev];
                        newData[newData.length - 1] = lastCombinedBar;
                        return newData;
                    });
                }

                if (pixiDataRef.current) {
                    pixiDataRef.current.setNewBar(lastCombinedBar);
                    pixiDataRef.current.updateCurrentPriceLabel(lastCombinedBar.close);
                }
            }
        });

        return () => {
            Socket.off("better-tick");
        };
    }, [symbol, join]);

    // Effect to recombine bars when join value changes
    useEffect(() => {
        if (rawDataRef.current.length > 0) {
            const combined = combineBars(rawDataRef.current, join);
            setCandleData(combined);
        }
    }, [join]);

    if (!candleData?.length) {
        return <div>Loading Better Tick Chart...</div>;
    }

    const joinOptions = [1, 5, 10, 15, 20];

    const TickJoinBtn = ({ isActive, value, label }) => (
        <div className="col-auto">
            <IconButton
                borderColor={isActive ? "green" : false}
                title={label}
                onClick={() => setJoin(value)}
                text={label}
            />
        </div>
    );

    return (
        <div style={{ width: "100%" }}>
            <div className="row g-0">
                <div className="col-auto">
                    <IndicatorsBtns
                        indicators={indicators}
                        toggleIndicator={toggleIndicator}
                        timeframe="tick"
                        updateIndicatorOptions={updateIndicatorOptions}
                    />
                </div>
                {joinOptions.map((value) => (
                    <TickJoinBtn
                        key={value}
                        isActive={join === value}
                        value={value}
                        label={value === 1 ? "1" : `${value}`}
                    />
                ))}
            </div>
            <div style={{ border: "1px solid white", width: "100%" }}>
                <GenericPixiChart
                    ohlcDatas={candleData}
                    height={height}
                    symbol={symbol}
                    fullSymbolRef={fullSymbolRef}
                    pixiDataRef={pixiDataRef}
                    tickSize={0.01}
                    Socket={Socket}
                    options={{
                        withoutVolume: false,
                        chartType: "OHLC",
                    }}
                    margin={{ top: 50, right: 100, left: 0, bottom: 40 }}
                />
            </div>
        </div>
    );
};

export default BetterTickChart;
