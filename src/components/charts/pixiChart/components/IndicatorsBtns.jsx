import React, { useState, memo } from "react";
import { IconButton } from "../../../StratBuilder/components";
import { GiAirZigzag, GiHistogram, GiAmplitude } from "react-icons/gi";
import { IoIosReorder } from "react-icons/io";
import { CgReadme } from "react-icons/cg";
import { AiOutlineTransaction, AiFillCloseCircle } from "react-icons/ai";
import { MdLayers } from "react-icons/md";
import styled from "styled-components";
import Input from "./Input";

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

    function showOptions(indicator) {
        if (!indicator || !indicator.options) {
            return <div>No options available</div>;
        }

        switch (indicator.id) {
            case "liquidityHeatmap":
                return (
                    <div style={{ padding: "10px" }}>
                        <label style={{ display: "block", marginBottom: "15px", color: "#fff" }}>
                            <span style={{ display: "block", marginBottom: "5px" }}>Visualization Mode:</span>
                            <select
                                value={tempOptions.visualizationMode || "volume"}
                                onChange={(e) => setTempOptions({ ...tempOptions, visualizationMode: e.target.value })}
                                style={{
                                    width: "100%",
                                    padding: "8px",
                                    borderRadius: "4px",
                                    border: "1px solid #555",
                                    background: "#333",
                                    color: "#fff",
                                    fontSize: "14px",
                                }}
                            >
                                <option value="volume">Volume</option>
                                <option value="orders">Orders</option>
                                <option value="ratio">Size/Order</option>
                            </select>
                        </label>

                        <label style={{ display: "block", marginBottom: "10px", color: "#fff" }}>
                            <span style={{ display: "block", marginBottom: "5px" }}>Thresholds:</span>
                            <input
                                type="text"
                                value={tempOptions.thresholds?.join(", ") || ""}
                                onChange={(e) => {
                                    const values = e.target.value
                                        .split(",")
                                        .map((v) => parseFloat(v.trim()))
                                        .filter((v) => !isNaN(v));
                                    setTempOptions({ ...tempOptions, thresholds: values });
                                }}
                                placeholder="0, 10, 20, 30..."
                                style={{
                                    width: "100%",
                                    padding: "8px",
                                    borderRadius: "4px",
                                    border: "1px solid #555",
                                    background: "#333",
                                    color: "#fff",
                                    fontSize: "14px",
                                }}
                            />
                            <small style={{ color: "#aaa", display: "block", marginTop: "5px" }}>
                                Comma-separated values for color thresholds
                            </small>
                        </label>
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
                return <div>No options available</div>;
        }
    }

    const OptionsWindow = () => {
        const handleOK = () => {
            console.log("[IndicatorsBtns] handleOK called - optsWindow:", optsWindow?.id, "tempOptions:", tempOptions);
            console.log("[IndicatorsBtns] updateIndicatorOptions exists:", !!updateIndicatorOptions);
            if (optsWindow && updateIndicatorOptions) {
                updateIndicatorOptions(optsWindow.id, tempOptions);
            }
            setOptsWindow(null);
        };

        return (
            <OptsWindowContainer>
                <Position>
                    <IconButton borderColor={false} title="Close" onClick={() => setOptsWindow(null)} rIcon={<AiFillCloseCircle />} />
                </Position>
                <h4 style={{ color: "#fff", padding: "10px", margin: 0 }}>{optsWindow?.name || "Options"}</h4>
                {showOptions(optsWindow)}
                <button className="btn" onClick={handleOK} style={{ margin: "10px", color: "#fff", backgroundColor: "green" }}>
                    Apply
                </button>
            </OptsWindowContainer>
        );
    };
    // Icon mapping for indicators
    const iconMap = {
        liquidityHeatmap: <CgReadme />, // Book icon for order book/liquidity
        zigZag: <GiAirZigzag />,
        marketProfile: <GiAmplitude />,
        orderbook: <CgReadme />,
        orders: <AiOutlineTransaction />,
        pivotLines: <IoIosReorder />,
    };

    // Render data-driven buttons
    if (isDataDriven) {
        return (
            <div className="row g-0 relative">
                {optsWindow && <OptionsWindow />}
                {indicators.map((indicator) => {
                    // Check if indicator should be shown for current timeframe
                    const shouldShow = !indicator.shouldEnable || indicator.shouldEnable(timeframe);
                    if (!shouldShow) return null;

                    const icon = iconMap[indicator.id] || <GiHistogram />;

                    return (
                        <div key={indicator.id} className="col-auto">
                            <IconButton
                                borderColor={indicator.enabled ? "green" : false}
                                title={indicator.name}
                                onClick={() => toggleIndicator(indicator.id)}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    if (indicator.options) {
                                        setTempOptions({ ...indicator.options }); // Copy current options
                                        setOptsWindow(indicator);
                                    }
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
            {optsWindow && <OptionsWindow />}
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
                            setOptsWindow("ZigZag");
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
    min-width: 350px;
    min-height: 250px;
    border: 2px solid #666;
    background: #222;
    position: absolute;
    z-index: 10000;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    padding-bottom: 10px;
`;

const Position = styled.div`
    top: ${(props) => props.top || 0};
    right: 0;
    color: #fff;
    border: 2px solid #666;
    background: #333;
    position: absolute;
    z-index: 10000;
`;

// Export memoized component to prevent re-renders from parent updates
export default memo(IndicatorsBtns);
