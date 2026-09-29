import React, { useState, memo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "../../../StratBuilder/components";
import { GiAirZigzag, GiHistogram, GiAmplitude } from "react-icons/gi";
import { IoIosReorder } from "react-icons/io";
import { CgReadme } from "react-icons/cg";
import { AiOutlineTransaction, AiFillCloseCircle } from "react-icons/ai";
import { MdLayers, MdTrendingUp } from "react-icons/md";
import styled from "styled-components";
import Input from "./Input";
import ColorSchemeEditor from "./ColorSchemeEditor";

const SineWavesIcon = ({ size = 24, stroke = "#fff" }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        role="img"
        aria-label="Moving averages icon"
    >
        <path
            d="M2 15 C4 11 6 11 8 15 S12 19 14 15 18 11 20 15 22 19 24 15"
            stroke={stroke}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.6"
        />
        <path
            d="M2 10 C4 6 6 6 8 10 S12 14 14 10 18 6 20 10 22 14 24 10"
            stroke={stroke}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M2 5 C4 1 6 1 8 5 S12 9 14 5 18 1 20 5 22 9 24 5"
            stroke={stroke}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.4"
        />
    </svg>
);

// import Select from "./Select";

function IndicatorsBtns(props) {
    const {
        // Legacy props (for old PixiChart v1)
        setDrawZigZag,
        setDrawMarketProfile,
        setDrawOrderBook,
        toggleZigZag,
        toggleMarketProfile,
        toggleOrderbook,
        togglePivotLines,
        setDrawPivotLines,
        setDrawOrders,
        toggleOrders,
        // New data-driven props (for PixiChartV2)
        indicators,
        toggleIndicator,
        timeframe,
        updateIndicatorOptions,
    } = props;

    // Determine if using new data-driven approach
    const isDataDriven = indicators && toggleIndicator;

    const [optsWindow, setOptsWindow] = useState(null); // Store indicator object, not string
    const [tempOptions, setTempOptions] = useState({}); // Temporary options for editing
    const [optsPosition, setOptsPosition] = useState({ top: 0, left: 0 });
    const longPressTimerRef = useRef(null);
    const suppressNextClickRef = useRef(false);

    // Memoize onChange callback to prevent ColorSchemeEditor from re-rendering
    const handleColorSchemeChange = useCallback(
        (newScheme) => {
            setTempOptions((prev) => ({ ...prev, colorScheme: newScheme }));
        },
        []
    );

    function positionOptionsWindow(anchorEl) {
        if (!anchorEl || typeof window === "undefined") return;
        const rect = anchorEl.getBoundingClientRect();
        const popupWidth = Math.min(600, window.innerWidth - 16);
        const popupHeight = Math.min(520, window.innerHeight - 16);
        const left = Math.max(8, Math.min(rect.left, window.innerWidth - popupWidth - 8));
        let top = rect.bottom + 6;

        if (top + popupHeight > window.innerHeight) {
            top = Math.max(8, rect.top - popupHeight - 6);
        }

        setOptsPosition({ top, left });
    }

    function openOptions(indicator, anchorEl) {
        if (!indicator?.options) return;
        positionOptionsWindow(anchorEl);
        setTempOptions({ ...indicator.options });
        setOptsWindow(indicator);
    }

    function clearLongPressTimer() {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }

    function startLongPress(indicator, anchorEl) {
        clearLongPressTimer();
        if (!indicator?.options) return;

        longPressTimerRef.current = setTimeout(() => {
            suppressNextClickRef.current = true;
            openOptions(indicator, anchorEl);
        }, 550);
    }

    // Icon mapping for indicators
    const iconMap = {
        liquidityHeatmap: <CgReadme />, // Book icon for order book/liquidity
        zigZag: <GiAirZigzag />,
        marketProfile: <GiAmplitude />,
        orderbook: <CgReadme />,
        orders: <AiOutlineTransaction />,
        depthSignals: <MdLayers />,
        pivotLines: <IoIosReorder />,
        superTrend: <MdTrendingUp />,
        priceLevels: <IoIosReorder />,
        fibonacci: <GiAmplitude />,
        trendlines: <MdTrendingUp />,
        movingAverages: <SineWavesIcon />,
    };

    // Render data-driven buttons
    if (isDataDriven) {
        return (
            <div className="row g-0 relative">
                {optsWindow && typeof document !== "undefined" && createPortal(
                    <OptionsWindow
                        indicator={optsWindow}
                        tempOptions={tempOptions}
                        optsPosition={optsPosition}
                        setTempOptions={setTempOptions}
                        setOptsWindow={setOptsWindow}
                        updateIndicatorOptions={updateIndicatorOptions}
                        onColorSchemeChange={handleColorSchemeChange}
                    />,
                    document.body
                )}
                {indicators.map((indicator) => {
                    // Check if indicator should be shown for current timeframe
                    const shouldShow = !indicator.shouldEnable || indicator.shouldEnable(timeframe);
                    if (!shouldShow) return null;

                    const icon = iconMap[indicator.id] || <GiHistogram />;

                    return (
                        <div
                            key={indicator.id}
                            className="col-auto"
                            onTouchStart={(e) => startLongPress(indicator, e.currentTarget)}
                            onTouchEnd={clearLongPressTimer}
                            onTouchCancel={clearLongPressTimer}
                            onMouseDown={(e) => {
                                if (e.button === 0) startLongPress(indicator, e.currentTarget);
                            }}
                            onMouseUp={clearLongPressTimer}
                            onMouseLeave={clearLongPressTimer}
                        >
                            <IconButton
                                borderColor={indicator.enabled ? "green" : false}
                                title={indicator.name}
                                onClick={() => {
                                    if (suppressNextClickRef.current) {
                                        suppressNextClickRef.current = false;
                                        return;
                                    }
                                    toggleIndicator(indicator.id);
                                }}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    openOptions(indicator, e.currentTarget);
                                }}
                                rIcon={icon}
                            />
                        </div>
                    );
                })}
            </div>
        );
    }

    // Fallback to legacy props (for old PixiChart v1)
    return (
        <div className="row g-0 relative">
            {optsWindow && typeof document !== "undefined" && createPortal(
                <OptionsWindow
                    indicator={optsWindow}
                    tempOptions={tempOptions}
                    optsPosition={optsPosition}
                    setTempOptions={setTempOptions}
                    setOptsWindow={setOptsWindow}
                    updateIndicatorOptions={updateIndicatorOptions}
                    onColorSchemeChange={handleColorSchemeChange}
                />,
                document.body
            )}
            {setDrawOrders && (
                <div className="col-auto">
                    <IconButton
                        borderColor={toggleOrders ? "green" : false}
                        title="Orders"
                        onClick={() => setDrawOrders(!toggleOrders)}
                        rIcon={<AiOutlineTransaction />}
                    />
                </div>
            )}

            {setDrawZigZag && (
                <div className="col-auto">
                    <IconButton
                        borderColor={toggleZigZag ? "green" : false}
                        title="ZigZag"
                        onContextMenu={(e) => {
                            e.preventDefault();
                            console.log("Right click");
                            setTempOptions({});
                            setOptsWindow({ id: "ZigZag", name: "ZigZag", options: {} });
                        }}
                        onClick={(e) => {
                            setDrawZigZag(!toggleZigZag);
                        }}
                        rIcon={<GiAirZigzag />}
                    />
                </div>
            )}

            {setDrawMarketProfile && (
                <div className="col-auto">
                    <IconButton
                        borderColor={toggleMarketProfile ? "green" : false}
                        title="Market Profile"
                        onClick={() => setDrawMarketProfile(!toggleMarketProfile)}
                        rIcon={<GiAmplitude />}
                    />
                </div>
            )}

            {setDrawOrderBook && (
                <div className="col-auto">
                    <IconButton
                        borderColor={toggleOrderbook ? "green" : false}
                        title="Order Book"
                        onClick={() => setDrawOrderBook(!toggleOrderbook)}
                        rIcon={<CgReadme />}
                    />
                </div>
            )}

            {setDrawPivotLines && (
                <div className="col-auto">
                    <IconButton
                        borderColor={togglePivotLines ? "green" : false}
                        title="Pivot Lines"
                        onClick={() => setDrawPivotLines(!togglePivotLines)}
                        rIcon={<IoIosReorder />}
                    />
                </div>
            )}
        </div>
    );
}

const OptsWindowContainer = styled.div`
    width: min(600px, calc(100vw - 16px));
    min-width: min(500px, calc(100vw - 16px));
    min-height: 250px;
    max-height: calc(100vh - 16px);
    overflow-y: auto;
    border: 2px solid #666;
    background: #222;
    position: fixed;
    top: ${(props) => props.top || 0}px;
    left: ${(props) => props.left || 0}px;
    z-index: 2147483000;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    padding-bottom: 10px;
    touch-action: manipulation;
`;

const Position = styled.div`
    top: ${(props) => props.top || 0};
    right: 0;
    color: #fff;
    border: 2px solid #666;
    background: #333;
    position: absolute;
    z-index: 2147483001;
`;

function GenericOptions({ indicator, tempOptions, setTempOptions }) {
    const fields = indicator?.options?.fields || [];
    if (!fields.length) return null;

    return (
        <div>
            {fields.map((field) => {
                const value = tempOptions[field.key] ?? indicator.options[field.key];
                if (field.type === "checkbox") {
                    return (
                        <label key={field.key} style={{ display: "flex", alignItems: "center", gap: "8px", margin: "10px", color: "#fff", fontSize: "12px" }}>
                            <input
                                type="checkbox"
                                checked={!!value}
                                onChange={(e) => setTempOptions((prev) => ({ ...prev, [field.key]: e.target.checked }))}
                            />
                            {field.label}
                        </label>
                    );
                }

                return (
                    <label key={field.key} style={{ display: "block", margin: "10px", color: "#fff" }}>
                        <span style={{ display: "block", marginBottom: "5px", fontSize: "12px", color: "#aaa", fontWeight: "bold" }}>
                            {field.label}
                        </span>
                        <input
                            type={field.type || "text"}
                            min={field.min}
                            max={field.max}
                            step={field.step}
                            value={value ?? ""}
                            onChange={(e) => {
                                const nextValue = field.type === "number" && e.target.value !== "" ? parseFloat(e.target.value) : e.target.value;
                                setTempOptions((prev) => ({ ...prev, [field.key]: nextValue }));
                            }}
                            style={{
                                width: "100%",
                                padding: "8px",
                                borderRadius: "4px",
                                border: "1px solid #555",
                                background: "#333",
                                color: "#fff",
                                fontSize: "13px",
                            }}
                        />
                    </label>
                );
            })}
        </div>
    );
}

function OptionsContent({ indicator, tempOptions, setTempOptions, onColorSchemeChange }) {
    if (!indicator || !indicator.options) {
        return <div>No options available</div>;
    }

    switch (indicator.id) {
        case "liquidityHeatmap":
            return (
                <div>
                    <label style={{ display: "block", marginBottom: "15px", padding: "10px", color: "#fff" }}>
                        <span style={{ display: "block", marginBottom: "5px", fontSize: "12px", color: "#aaa", fontWeight: "bold" }}>
                            Visualization Mode:
                        </span>
                        <select
                            value={tempOptions.visualizationMode || "volume"}
                            onChange={(e) => setTempOptions((prev) => ({ ...prev, visualizationMode: e.target.value }))}
                            style={{
                                width: "100%",
                                padding: "8px",
                                borderRadius: "4px",
                                border: "1px solid #555",
                                background: "#333",
                                color: "#fff",
                                fontSize: "13px",
                            }}
                        >
                            <option value="volume">Volume</option>
                            <option value="orders">Orders</option>
                            <option value="ratio">Size/Order</option>
                        </select>
                    </label>

                    <ColorSchemeEditor
                        colorScheme={tempOptions.colorScheme || indicator.options.colorScheme}
                        onChange={onColorSchemeChange}
                    />
                </div>
            );
        case "ZigZag":
            return (
                <>
                    <Input />
                    <Input />
                </>
            );
        default:
            if (indicator.options.fields) {
                return (
                    <GenericOptions
                        indicator={indicator}
                        tempOptions={tempOptions}
                        setTempOptions={setTempOptions}
                    />
                );
            }
            return <div>No options available</div>;
    }
}

function OptionsWindow({
    indicator,
    tempOptions,
    optsPosition,
    setTempOptions,
    setOptsWindow,
    updateIndicatorOptions,
    onColorSchemeChange,
}) {
    const handleOK = () => {
        console.log("[IndicatorsBtns] handleOK called - optsWindow:", indicator?.id, "tempOptions:", tempOptions);
        console.log("[IndicatorsBtns] updateIndicatorOptions exists:", !!updateIndicatorOptions);
        if (indicator?.id && updateIndicatorOptions) {
            updateIndicatorOptions(indicator.id, tempOptions);
        }
        setOptsWindow(null);
    };

    return (
        <OptsWindowContainer top={optsPosition.top} left={optsPosition.left}>
            <Position>
                <IconButton borderColor={false} title="Close" onClick={() => setOptsWindow(null)} rIcon={<AiFillCloseCircle />} />
            </Position>
            <h4 style={{ color: "#fff", padding: "10px", margin: 0 }}>{indicator?.name || "Options"}</h4>
            <OptionsContent
                indicator={indicator}
                tempOptions={tempOptions}
                setTempOptions={setTempOptions}
                onColorSchemeChange={onColorSchemeChange}
            />
            <button className="btn" onClick={handleOK} style={{ margin: "10px", color: "#fff", backgroundColor: "green" }}>
                Apply
            </button>
        </OptsWindowContainer>
    );
}

// Export memoized component to prevent re-renders from parent updates
export default memo(IndicatorsBtns);
