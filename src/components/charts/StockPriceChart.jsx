import React, { useState, useEffect, useRef } from "react";
import GenericPixiChart from "./GenericPixiChart";
import API from "../API";

const StockPriceChart = (props) => {
    const { height = 400, symbol, timeframe = "daily", fillContainer = false, showVolume = true } = props;

    const pixiDataRef = useRef();
    const [ohlcData, setOhlcData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const containerStyle = {
        width: "100%",
        height: fillContainer ? "100%" : typeof height === "number" ? `${height}px` : height,
    };

    // Fetch stock price data from MongoDB stockDatas collection
    useEffect(() => {
        let isMounted = true;

        async function fetchStockData() {
            if (!symbol) return;

            setIsLoading(true);
            try {
                console.log(`[StockPriceChart] Fetching ${timeframe} data for ${symbol}`);

                // Query stockDatas collection
                const response = await API.getStockDatas({
                    query: {
                        symbol: symbol,
                        frame: timeframe,
                        // datetime: {
                        //     $gte: startDate.toISOString(),
                        //     $lte: endDate.toISOString(),
                        // },
                    },
                    sort: { datetime: 1 }, // Sort ascending by date
                    limit: 0, // No limit, get all matching
                });

                if (!isMounted) return;

                console.log(`[StockPriceChart] Received ${response?.length || 0} bars for ${symbol}`);

                if (Array.isArray(response) && response.length > 0) {
                    // Process the data to ensure proper format
                    const processedData = response.map((bar) => ({
                        open: bar.open,
                        high: bar.high,
                        low: bar.low,
                        close: bar.close,
                        volume: bar.volume || 0,
                        timestamp: new Date(bar.datetime).getTime(),
                        datetime: new Date(bar.datetime).getTime(),
                    }));
                    setOhlcData(processedData);
                } else {
                    console.warn(`[StockPriceChart] No data found for ${symbol} in stockDatas collection`);
                    setOhlcData([]);
                }
            } catch (err) {
                console.error(`[StockPriceChart] Failed to load stock data for ${symbol}:`, err);
                setOhlcData([]);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        fetchStockData();

        return () => {
            isMounted = false;
        };
    }, [symbol, timeframe]);

    if (!symbol) {
        return (
            <div style={containerStyle}>
                <div style={{ padding: "1rem", color: "#9ca3af" }}>No symbol provided</div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div style={containerStyle}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
                    <span style={{ color: "#d1d5db" }}>Loading stock chart...</span>
                </div>
            </div>
        );
    }

    if (ohlcData.length === 0) {
        return (
            <div style={containerStyle}>
                <div style={{ display: "flex", alignItems: "center", width: "100%", height: "100%", padding: "1rem", color: "#9ca3af" }}>
                    No stock price data available for {symbol}
                </div>
            </div>
        );
    }

    return (
        <div style={containerStyle}>
            <GenericPixiChart
                key={`${symbol}-${timeframe}`}
                ohlcDatas={ohlcData}
                symbol={symbol}
                pixiDataRef={pixiDataRef}
                height={height}
                fitContainerHeight={fillContainer}
                options={{
                    chartType: "candlestick",
                    marketHoursAlpha: 0,
                    afterHoursAlpha: 0,
                    withoutVolume: !showVolume,
                }}
                isLoading={isLoading}
            />
        </div>
    );
};

export default StockPriceChart;
