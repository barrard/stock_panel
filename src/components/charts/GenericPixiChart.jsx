import React, { useRef, useEffect, useState } from "react";
import * as PIXI from "pixi.js";
import GenericDataHandler from "./GenericDataHandler";
import { TICKS } from "../../indicators/indicatorHelpers/TICKS";

function getNextTimeBar(data) {
    const { barType, barTypePeriod } = data;
    let time = barType === 1 ? 1 : barType === 2 ? 60 : barType === 3 ? 60 * 60 * 24 : 60 * 60 * 24 * 7;
    let nextTime = time * barTypePeriod * 1000;
    return nextTime;
}

export default function GenericPixiChart({
    // chartDataRef,
    // onDataUpdate,
    ohlcDatas = [],
    width = 1200,
    height = 600,
    symbol,
    fullSymbol = null,
    barType,
    barTypePeriod,
    loadData,
    Socket,
    onBarClick,
    // pixiApplicationRef,
    pixiDataRef,
    TouchGesture1Prop,
    TouchGesture2Prop,
    // newSymbolTimerRefProp,
    loadDataRefProp,
    // lastTradesRefProp,
    currentBarRefProp = {},
    tickSize,
    mainChartContainerHeight,
    options = { chartType: "candlestick" },
    lowerIndicators = [],
    margin = { top: 50, right: 100, left: 0, bottom: 40 },
    loadMoreData = () => {},
    onTimeRangeChange = null, // Optional callback for time range changes
    isLoading = false, // Loading state for data fetching
    name = "GenericPixiChart", // Name for logging purposes
    ...rest
}) {
    if (!fullSymbol) {
        fullSymbol = symbol;
    }
    tickSize = tickSize || TICKS()[symbol];
    mainChartContainerHeight = mainChartContainerHeight || height;
    // Use provided refs or create them if not provided
    const PixiAppRef = useRef();
    const PixiChartRef = useRef();
    // const pixiDataRef = useRef(pixiDataRef);
    const TouchGesture1 = useRef(TouchGesture1Prop);
    const TouchGesture2 = useRef(TouchGesture2Prop);
    const currentBarRef = useRef(currentBarRefProp);
    // const newSymbolTimerRef = useRef(newSymbolTimerRefProp);
    // const loadDataRef = useRef(loadDataRefProp);
    // const lastTradesRef = useRef(lastTradesRefProp || {});
    const tickSizeRef = useRef(tickSize);

    const [currentTimeBar, setCurrentTimeBar] = useState();

    // Mouse enter state for crosshair
    const [mouseEnter, setMouseEnter] = useState(false);
    const [touchMoveEvent, setTouchMoveEvent] = useState(false);
    const [longPressTimer, setLongPressTimer] = useState(false);
    const [gesture, setIsGesture] = useState(false);
    const [touch1, setTouch1] = useState(false);
    const [touch2, setTouch2] = useState(false);
    const [longPress, setLongPress] = useState(false);
    const [touch, setTouch] = useState(false);
    const [zoomGesture, setZoomGesture] = useState(false);
    const [openTradeWindow, setOpenTradeWindow] = useState(false);
    const [showResetButton, setShowResetButton] = useState(false);

    // Time range inputs - only used when onTimeRangeChange is provided
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [numDays, setNumDays] = useState("");
    const [useNumDays, setUseNumDays] = useState(true); // Toggle between numDays and endTime

    const clearLongPress = () => {
        clearInterval(longPressTimer);
        setLongPressTimer(false);
        setLongPress(false);
        setMouseEnter(false);
    };

    const clearGesture = () => {
        pixiDataRef.current.gesture = false;

        setIsGesture(false);
    };

    const checkGesture = (e) => {
        if (e.touches.length === 2) {
            TouchGesture1.current = e.touches[0];
            TouchGesture2.current = e.touches[1];
            setIsGesture(true);
            clearLongPress();
            pixiDataRef.current.gesture = true;
            return true;
        }
    };

    const error = !symbol;

    useEffect(() => {
        console.log("generic pixi?");

        // if (error) return;
        if (!PixiChartRef.current) return console.log("No PixiChartRef.current");

        const container = PixiChartRef.current;
        const rect = container.getBoundingClientRect();

        let { width, height } = rect;

        console.log(`GenericPixiChart init - ${name}`);

        PixiAppRef.current = new PIXI.Application({
            width,
            height,
            backgroundColor: 0x000,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
        });

        const canvas = PixiAppRef.current.view;
        canvas.style.display = "block"; // ✅ kills extra 6px gap
        canvas.style.width = "100%"; // follow container
        // canvas.style.height = "100%"; // follow container
        canvas.style.margin = "0";
        canvas.style.padding = "0";
        canvas.style.boxSizing = "border-box";
        canvas.style.imageRendering = "pixelated"; // you already had this

        // PixiAppRef.current.view.style["image-rendering"] = "pixelated";
        PixiAppRef.current.stage.interactive = true;

        PixiChartRef.current.appendChild(PixiAppRef.current.view);

        // this will handle scrolling/zooming events
        PixiChartRef.current?.addEventListener(
            "mousewheel",
            (e) => {
                e.preventDefault();
            },
            { passive: false }
        );
        debugger;

        pixiDataRef.current = new GenericDataHandler({
            ohlcDatas,
            pixiApp: PixiAppRef.current,
            currentBarRef,
            width,
            height,
            symbol,
            fullSymbol,
            margin,
            options,
            mainChartContainerHeight,
            tickSize: tickSizeRef.current,
            lowerIndicators,
            loadMoreData,
        });

        // Set up callback for manual scale changes
        pixiDataRef.current.onManualScaleChange = setShowResetButton;
        // setPixiData(_pixiData);

        let lastWidth = width;
        let lastHeight = height;
        // ResizeObserver to handle dynamic sizing
        const resizeCanvas = () => {
            const container = PixiChartRef.current;
            if (!container || !PixiAppRef.current) return;

            const width = Math.round(container.clientWidth);
            const height = Math.round(container.clientHeight);

            const widthIsDiff = Math.abs(width - lastWidth) > 20;
            const heightIsDiff = Math.abs(height - lastHeight) > 20;

            if (width && height && (widthIsDiff || heightIsDiff)) {
                // update Pixi buffer
                PixiAppRef.current.renderer.resize(width, height);

                // update your data handler scales / redraw
                pixiDataRef.current?.resize(width, height);
                lastWidth = width;
                lastHeight = height;
            }
        };

        // Call initially and on container resize
        // resizeCanvas();

        const resizeObserver = new ResizeObserver(resizeCanvas);
        resizeObserver.observe(PixiChartRef.current);

        // NOTE: Socket listeners moved to individual chart implementations
        // This prevents conflicts when multiple charts are open with different symbols/timeframes
        // Each chart component (BetterTickChart, PixiChartV2, etc.) should handle their own socket events
        // if (Socket) {
        //     Socket.on("timeBarUpdate", (data) => {
        //         if (data.symbol !== pixiDataRef.current.symbol.value) return;
        //         setCurrentTimeBar(data);
        //     });
        // }

        return () => {
            console.log("DESTROY PIXI CHART");

            resizeObserver.disconnect();

            if (PixiAppRef.current) {
                PixiAppRef.current.destroy(true, true);
                PixiAppRef.current = null;
            }
            if (pixiDataRef.current) {
                pixiDataRef.current.destroy();
                // setPixiData(null);
                pixiDataRef.current = null;
            }
            if (Socket) {
                Socket.off("timeBarUpdate");
            }
        };
    }, [symbol, barType?.value, barTypePeriod]);

    useEffect(() => {
        const data = currentTimeBar;
        // if (!data || !ohlcDatas.length || !pixiDataRef.current) return;
        if (!data || !pixiDataRef.current || !ohlcDatas?.length) return;
        data.timestamp = data.datetime = data.datetime * 1000;

        if (data.askVolume.high || data.bidVolume.high) {
            alert("high");
        } else {
            data.volume = data.askVolume.low + data.bidVolume.low;
        }

        if (
            parseInt(data.barType) !== parseInt(barType?.value) ||
            parseInt(data.barTypePeriod) !== parseInt(barTypePeriod) ||
            data.symbol !== symbol
        ) {
            return;
        }

        const lastBar = ohlcDatas.slice(-1)[0];
        const nextTimeBar = getNextTimeBar(data);
        pixiDataRef.current.updateCurrentPriceLabel(data.close);

        const newBar = {
            open: data.close,
            high: data.close,
            low: data.close,
            close: data.close,
            volume: 0,
            timestamp: data.timestamp + nextTimeBar,
        };

        // if (data.timestamp < lastBar.datetime + nextTimeBar) {
        //     //merge data
        //     lastBar.volume += data.volume;
        //     lastBar.high = lastBar.high < data.high ? data.high : lastBar.high;
        //     lastBar.low = lastBar.low < data.low ? data.low : lastBar.low;
        //     lastBar.close = lastBar.close;

        //     pixiDataRef.current.replaceLast(lastBar);

        //     setOhlcDatas((ohlcDatas) => {
        //         ohlcDatas[0] = lastBar;
        //         return [...ohlcDatas];
        //     });
        // } else {
        pixiDataRef.current.replaceLast(data);
        pixiDataRef.current.prependData(newBar);

        // setOhlcDatas((ohlcDatas) => {
        //     ohlcDatas[0] = lastBar;
        //     return [...ohlcDatas, newBar];
        // });
        // }
    }, [currentTimeBar]);

    // CROSSHAIR
    useEffect(() => {
        if (!pixiDataRef.current || !pixiDataRef.current.showCrosshair || !pixiDataRef.current.hideCrosshair) {
            debugger;
            return console.log("no pixidata?");
        }
        if (mouseEnter) {
            pixiDataRef.current.showCrosshair();
        } else {
            pixiDataRef.current.hideCrosshair();
        }
    }, [mouseEnter]);

    // Track previous ohlcDatas reference to detect when parent passes new array
    const prevOhlcDatasRef = useRef(ohlcDatas);

    // Update data handler when parent component provides completely new ohlcDatas array
    // This happens for: initial load, join changes, loadMoreData, etc.
    // This does NOT fire for real-time updates via setNewBar (which mutate the array directly)
    useEffect(() => {
        if (!pixiDataRef.current) return;

        // Check if this is a new array reference (parent set new state)
        const isNewArray = prevOhlcDatasRef.current !== ohlcDatas;

        if (isNewArray) {
            if (ohlcDatas) {
                console.log("[GenericPixiChart] New ohlcDatas array detected, updating chart");
                pixiDataRef.current.updateData(ohlcDatas);
            }
        }

        prevOhlcDatasRef.current = ohlcDatas;
    }, [ohlcDatas]);

    // Handle loading state overlay
    useEffect(() => {
        if (!pixiDataRef.current) return;

        if (isLoading) {
            pixiDataRef.current.drawLoadingOverlay?.();
        } else {
            pixiDataRef.current.clearLoadingOverlay?.();
        }

        // Cleanup on unmount
        return () => {
            if (pixiDataRef.current?.clearLoadingOverlay) {
                pixiDataRef.current.clearLoadingOverlay();
            }
        };
    }, [isLoading]);

    useEffect(() => {
        let touch1MoveDiff;
        const touch1X = TouchGesture1.current?.clientX;
        const touch2X = TouchGesture2.current?.clientX;
        if (touch1 && touch2) {
            const before = Math.abs(touch1 - touch2);
            const after = Math.abs(touch1X - touch2X);
            if (before > after) {
                pixiDataRef.current.zoomOut(before - after);
            } else if (before < after) {
                pixiDataRef.current.zoomIn(after - before);
            }
        }
        setTouch1(touch1X);

        setTouch2(touch2X);
    }, [TouchGesture1.current?.clientX, TouchGesture2.current?.clientX]);

    if (error) {
        return (
            <div style={{ border: "2px solid red", color: "#b91c1c", padding: 16, background: "#fef2f2" }}>
                <b>GenericPixiChart Error:</b> <br />
                <span>
                    Missing or invalid <code>symbol</code> prop. Please provide a symbol object with a <code>value</code> property.
                </span>
            </div>
        );
    }

    const handleResetScale = () => {
        if (pixiDataRef.current && pixiDataRef.current.yAxis) {
            pixiDataRef.current.yAxis.resetScale();
            pixiDataRef.current.draw();
        }
    };

    const handleTimeRangeSubmit = () => {
        if (!onTimeRangeChange || !startTime) {
            alert("Please provide a start date");
            return;
        }

        // Convert date string (YYYY-MM-DD) to timestamp at start of day (midnight)
        const startTimestamp = new Date(startTime + "T00:00:00").getTime();

        if (useNumDays) {
            // Using numDays mode
            if (!numDays || numDays <= 0) {
                alert("Please provide a valid number of days");
                return;
            }
            onTimeRangeChange({
                startTime: startTimestamp,
                numDays: parseInt(numDays),
            });
        } else {
            // Using endTime mode
            if (!endTime) {
                alert("Please provide an end date");
                return;
            }
            // Convert date string to timestamp at end of day (23:59:59.999)
            const endTimestamp = new Date(endTime + "T23:59:59.999").getTime();

            if (startTimestamp >= endTimestamp) {
                alert("Start date must be before end date");
                return;
            }

            onTimeRangeChange({
                startTime: startTimestamp,
                endTime: endTimestamp,
            });
        }
    };

    return (
        <div style={{ position: "relative", width: "100%" }}>
            {onTimeRangeChange && (
                <div
                    style={{
                        position: "absolute",
                        top: "10px",
                        left: "10px",
                        zIndex: 1000,
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                        background: "rgba(0, 0, 0, 0.7)",
                        padding: "8px",
                        borderRadius: "4px",
                        border: "1px solid #666",
                        flexWrap: "wrap",
                    }}
                >
                    <label style={{ color: "white", fontSize: "12px" }}>
                        Start Date:
                        <input
                            type="date"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            style={{
                                marginLeft: "4px",
                                padding: "4px",
                                background: "#222",
                                color: "white",
                                border: "1px solid #666",
                                borderRadius: "4px",
                                fontSize: "12px",
                            }}
                        />
                    </label>

                    <label style={{ color: "white", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                        <input
                            type="checkbox"
                            checked={useNumDays}
                            onChange={(e) => setUseNumDays(e.target.checked)}
                            style={{ cursor: "pointer" }}
                        />
                        Days:
                        <input
                            type="number"
                            min="1"
                            value={numDays}
                            onChange={(e) => setNumDays(e.target.value)}
                            disabled={!useNumDays}
                            placeholder="# days"
                            style={{
                                width: "60px",
                                padding: "4px",
                                background: useNumDays ? "#222" : "#111",
                                color: useNumDays ? "white" : "#666",
                                border: "1px solid #666",
                                borderRadius: "4px",
                                fontSize: "12px",
                            }}
                        />
                    </label>

                    <label style={{ color: "white", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                        <input
                            type="checkbox"
                            checked={!useNumDays}
                            onChange={(e) => setUseNumDays(!e.target.checked)}
                            style={{ cursor: "pointer" }}
                        />
                        End Date:
                        <input
                            type="date"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            disabled={useNumDays}
                            style={{
                                padding: "4px",
                                background: useNumDays ? "#111" : "#222",
                                color: useNumDays ? "#666" : "white",
                                border: "1px solid #666",
                                borderRadius: "4px",
                                fontSize: "12px",
                            }}
                        />
                    </label>

                    <button
                        onClick={handleTimeRangeSubmit}
                        style={{
                            padding: "4px 12px",
                            background: "#0066cc",
                            color: "white",
                            border: "1px solid #0052a3",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px",
                        }}
                    >
                        Load
                    </button>
                </div>
            )}
            {showResetButton && (
                <button
                    onClick={handleResetScale}
                    style={{
                        position: "absolute",
                        top: "10px",
                        right: "10px",
                        zIndex: 1000,
                        padding: "5px 10px",
                        background: "#333",
                        color: "white",
                        border: "1px solid #666",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                    }}
                >
                    Reset Scale
                </button>
            )}
            <div
                // className="col-6"
                ref={PixiChartRef}
                // style={{ border: "2px solid red" }}
                // onContextMenu={(e) => {
                //     e.preventDefault();
                //     console.log(`onContextMenu ${openTradeWindow}`);
                //     setOpenTradeWindow((v) => !v);
                // }}
                onMouseEnter={(e) => {
                    // console.log("onMouseEnter");
                    setMouseEnter(true);
                }}
                onTouchMove={(e) => {
                    // debugger;
                    // console.log("onTouchMove");
                    setTouchMoveEvent(e);
                    checkGesture(e);
                }}
                onTouchStart={(e) => {
                    checkGesture(e);
                    setTouch(true);
                    setMouseEnter(false);
                    pixiDataRef.current.touches++;

                    if (!longPressTimer) {
                        const _longPressTimer = setTimeout(() => {
                            console.log("long press");
                            setLongPress(true);
                            setMouseEnter(true);
                        }, 1000);

                        setLongPressTimer(_longPressTimer);
                    }
                }}
                onTouchEnd={() => {
                    setTouch(false);
                    clearGesture();
                    setTouchMoveEvent(false);
                    setTouch1(false);
                    setTouch2(false);
                    setZoomGesture(false);
                    clearLongPress();
                    pixiDataRef.current.touches--;
                }}
                onMouseLeave={() => {
                    // console.log("onMouseLeave");
                    clearLongPress();
                    setMouseEnter(false);
                    setLongPress(false);
                    setOpenTradeWindow(false);
                }}
                onPointerEnter={() => setMouseEnter(true)}
                onPointerLeave={() => setMouseEnter(false)}
                onWheel={(e) => {
                    if (e.deltaY > 0) {
                        // console.log("The user scrolled up");
                        pixiDataRef.current.zoomOut("scroll");
                    } else {
                        // console.log("The user scrolled down");
                        pixiDataRef.current.zoomIn("scroll");
                    }
                }}
                {...rest}
                style={{ width: "100%", touchAction: "none", padding: 0, margin: 0 }}
            />
        </div>
    );
}
