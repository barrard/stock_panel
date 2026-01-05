import React, { useEffect, useState, useRef } from "react";
import API from "./API";
import Select from "./charts/pixiChart/components/Select";
import GenericPixiChart from "./charts/GenericPixiChart";

const SECTOR_COLORS = {
    XLE: { color: 0xe74c3c, name: "Energy" },
    XLF: { color: 0x3498db, name: "Financials" },
    XLU: { color: 0x2ecc71, name: "Utilities" },
    XLI: { color: 0xf39c12, name: "Industrials" },
    XLK: { color: 0x9b59b6, name: "Technology" },
    XLB: { color: 0x1abc9c, name: "Materials" },
    XLP: { color: 0xe67e22, name: "Consumer Staples" },
    XLY: { color: 0x34495e, name: "Consumer Discretionary" },
    XLV: { color: 0x16a085, name: "Healthcare" },
    XLRE: { color: 0xd35400, name: "Real Estate" },
    XLC: { color: 0x8e44ad, name: "Communication Services" },
};

const TIMEFRAME_OPTIONS = [
    { value: "5m", name: "5 Minute" },
    { value: "daily", name: "Daily" },
    { value: "weekly", name: "Weekly" },
];

const PERIOD_OPTIONS = [
    { value: "1d", name: "1 Day" },
    { value: "1w", name: "1 Week" },
    { value: "1m", name: "1 Month" },
    { value: "3m", name: "3 Months" },
    { value: "6m", name: "6 Months" },
    { value: "1y", name: "1 Year" },
];

const VIEW_OPTIONS = [
    { value: "charts", name: "Charts" },
    { value: "heatmap", name: "Heat Map" },
    { value: "correlation", name: "Correlation Matrix" },
];

export default function SectorsPage({ Socket }) {
    const [timeframe, setTimeframe] = useState(TIMEFRAME_OPTIONS[1]); // Default to daily
    const [period, setPeriod] = useState(PERIOD_OPTIONS[3]); // Default to 3 months
    const [viewMode, setViewMode] = useState(VIEW_OPTIONS[0]); // Default to charts
    const [sectorData, setSectorData] = useState({});
    const [performanceData, setPerformanceData] = useState(null);
    const [correlationData, setCorrelationData] = useState(null);
    const [loading, setLoading] = useState(false);

    const pixiDataRefs = useRef({});

    // Initialize refs for each sector
    useEffect(() => {
        Object.keys(SECTOR_COLORS).forEach((sector) => {
            if (!pixiDataRefs.current[sector]) {
                pixiDataRefs.current[sector] = React.createRef();
            }
        });
    }, []);

    // Fetch sector chart data
    const fetchSectorData = async () => {
        setLoading(true);
        try {
            const data = await API.getSectorData({
                timeframe: timeframe.value,
                period: period.value,
            });
            console.log("Sector data:", data);
            setSectorData(data);
        } catch (err) {
            console.error("Error fetching sector data:", err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch performance metrics for heat map
    const fetchPerformanceData = async () => {
        setLoading(true);
        try {
            const data = await API.getSectorPerformance({
                period: period.value,
            });
            console.log("Performance data:", data);
            setPerformanceData(data);
        } catch (err) {
            console.error("Error fetching performance data:", err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch correlation matrix
    const fetchCorrelationData = async () => {
        setLoading(true);
        try {
            const data = await API.getSectorCorrelation({
                timeframe: timeframe.value,
                period: period.value,
            });
            console.log("Correlation data:", data);
            setCorrelationData(data);
        } catch (err) {
            console.error("Error fetching correlation data:", err);
        } finally {
            setLoading(false);
        }
    };

    // Load data based on view mode
    useEffect(() => {
        if (viewMode.value === "charts") {
            fetchSectorData();
        } else if (viewMode.value === "heatmap") {
            fetchPerformanceData();
        } else if (viewMode.value === "correlation") {
            fetchCorrelationData();
        }
    }, [timeframe, period, viewMode]);

    // Socket listener for real-time updates (only for 5m timeframe)
    useEffect(() => {
        if (timeframe.value === "5m" && viewMode.value === "charts") {
            Socket.on("sector-update", (data) => {
                console.log("Sector update:", data);
                const { symbol, bar } = data;

                if (pixiDataRefs.current[symbol]?.current) {
                    pixiDataRefs.current[symbol].current.setNewBar(bar);
                }
            });

            return () => {
                Socket.off("sector-update");
            };
        }
    }, [timeframe, viewMode]);

    const renderCharts = () => {
        return (
            <div className="row w-100">
                {Object.entries(SECTOR_COLORS).map(([sector, config]) => {
                    const data = sectorData[sector] || [];
                    if (!data.length) return null;

                    return (
                        <div
                            key={sector}
                            className="col-12 col-md-6 col-lg-4"
                            style={{ border: "1px solid #444", padding: "10px" }}
                        >
                            <h5 style={{ color: `#${config.color.toString(16)}` }}>
                                {sector} - {config.name}
                            </h5>
                            <GenericPixiChart
                                key={`${sector}-${timeframe.value}`}
                                ohlcDatas={data}
                                height={200}
                                symbol={sector}
                                pixiDataRef={pixiDataRefs.current[sector]}
                                tickSize={0.01}
                                options={{
                                    chartType: "candlestick",
                                }}
                                lowerIndicators={[
                                    {
                                        name: "Volume",
                                        type: "bar",
                                        lineKey: "volume",
                                        lineColor: config.color,
                                    },
                                ]}
                                margin={{ top: 10, right: 50, left: 0, bottom: 15 }}
                            />
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderHeatMap = () => {
        if (!performanceData) return <div>Loading...</div>;

        return (
            <div className="row w-100 justify-content-center">
                <div className="col-12">
                    <h3 className="text-center mb-4">Sector Performance Heat Map</h3>
                    <div className="row">
                        {Object.entries(performanceData).map(([sector, perf]) => {
                            const config = SECTOR_COLORS[sector];
                            if (!config) return null;

                            // Calculate color intensity based on performance
                            const getHeatColor = (value) => {
                                if (value > 0) {
                                    // Green for positive
                                    const intensity = Math.min(Math.abs(value) * 10, 100);
                                    return `rgba(46, 204, 113, ${intensity / 100})`;
                                } else {
                                    // Red for negative
                                    const intensity = Math.min(Math.abs(value) * 10, 100);
                                    return `rgba(231, 76, 60, ${intensity / 100})`;
                                }
                            };

                            return (
                                <div key={sector} className="col-6 col-md-4 col-lg-3 mb-3">
                                    <div
                                        style={{
                                            backgroundColor: getHeatColor(perf.percentChange),
                                            border: "1px solid #444",
                                            borderRadius: "8px",
                                            padding: "20px",
                                            textAlign: "center",
                                            minHeight: "150px",
                                            display: "flex",
                                            flexDirection: "column",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <h4>{sector}</h4>
                                        <p style={{ fontSize: "0.9em", margin: "5px 0" }}>{config.name}</p>
                                        <h3 style={{ margin: "10px 0", fontWeight: "bold" }}>
                                            {perf.percentChange > 0 ? "+" : ""}
                                            {perf.percentChange.toFixed(2)}%
                                        </h3>
                                        <p style={{ fontSize: "0.85em", color: "#ccc" }}>
                                            ${perf.currentPrice?.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    const renderCorrelationMatrix = () => {
        if (!correlationData) return <div>Loading...</div>;

        const sectors = Object.keys(SECTOR_COLORS);

        return (
            <div className="row w-100 justify-content-center">
                <div className="col-12">
                    <h3 className="text-center mb-4">Sector Correlation Matrix</h3>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr>
                                    <th style={{ border: "1px solid #444", padding: "10px" }}></th>
                                    {sectors.map((sector) => (
                                        <th
                                            key={sector}
                                            style={{
                                                border: "1px solid #444",
                                                padding: "10px",
                                                fontSize: "0.9em",
                                            }}
                                        >
                                            {sector}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sectors.map((rowSector) => (
                                    <tr key={rowSector}>
                                        <td
                                            style={{
                                                border: "1px solid #444",
                                                padding: "10px",
                                                fontWeight: "bold",
                                            }}
                                        >
                                            {rowSector}
                                        </td>
                                        {sectors.map((colSector) => {
                                            const correlation =
                                                correlationData[rowSector]?.[colSector] ?? 0;
                                            const intensity = Math.abs(correlation) * 100;
                                            const bgColor =
                                                correlation > 0
                                                    ? `rgba(46, 204, 113, ${intensity / 100})`
                                                    : `rgba(231, 76, 60, ${intensity / 100})`;

                                            return (
                                                <td
                                                    key={colSector}
                                                    style={{
                                                        border: "1px solid #444",
                                                        padding: "10px",
                                                        textAlign: "center",
                                                        backgroundColor: bgColor,
                                                        fontSize: "0.85em",
                                                    }}
                                                >
                                                    {correlation.toFixed(2)}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="container-fluid" style={{ padding: "20px" }}>
            <div className="row mb-4">
                <div className="col-12">
                    <h1>Market Sectors Analysis</h1>
                </div>
            </div>

            <div className="row mb-4">
                <div className="col-md-3">
                    <Select label="View Mode" value={viewMode} setValue={setViewMode} options={VIEW_OPTIONS} />
                </div>

                {viewMode.value === "charts" && (
                    <div className="col-md-3">
                        <Select
                            label="Timeframe"
                            value={timeframe}
                            setValue={setTimeframe}
                            options={TIMEFRAME_OPTIONS}
                        />
                    </div>
                )}

                <div className="col-md-3">
                    <Select label="Period" value={period} setValue={setPeriod} options={PERIOD_OPTIONS} />
                </div>
            </div>

            {loading ? (
                <div className="row">
                    <div className="col-12 text-center">
                        <h3>Loading...</h3>
                    </div>
                </div>
            ) : (
                <>
                    {viewMode.value === "charts" && renderCharts()}
                    {viewMode.value === "heatmap" && renderHeatMap()}
                    {viewMode.value === "correlation" && renderCorrelationMatrix()}
                </>
            )}
        </div>
    );
}
