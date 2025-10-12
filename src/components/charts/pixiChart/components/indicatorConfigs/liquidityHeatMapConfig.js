const liquidityHeatMapConfig = {
    id: "liquidityHeatMapConfig",
    name: "Liquidity Heatmap",
    enabled: false,
    drawFunctionKey: "draw",
    instanceRef: null,
    manualDraw: true, // Only draw on socket updates (every 2 seconds), not on pan/zoom
    // Only enable for 1m/5m timeframes
    shouldEnable: (timeframe) => timeframe === "1m" || timeframe === "5m",
    options: {
        visualizationMode: "volume", // 'volume', 'orders', or 'ratio'
        colorScheme: {
            name: "Bookmap Style",
            colorStops: [
                { color: "#000033", threshold: 0 },
                { color: "#000066", threshold: 15 },
                { color: "#0000ff", threshold: 30 },
                { color: "#00ff00", threshold: 60 },
                { color: "#ffff00", threshold: 90 },
                { color: "#ff8800", threshold: 120 },
                { color: "#ff0000", threshold: 180 },
                { color: "#ffffff", threshold: 250 },
            ],
        },
    },
};

export default liquidityHeatMapConfig;
