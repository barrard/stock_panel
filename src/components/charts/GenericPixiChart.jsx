import React, { useRef, useEffect, useState } from "react";
import * as PIXI from "pixi.js";
import GenericDataHandler from "./GenericDataHandler";

function getNextTimeBar(data) {
    const { barType, barTypePeriod } = data;
    let time = barType === 1 ? 1 : barType === 2 ? 60 : barType === 3 ? 60 * 60 * 24 : 60 * 60 * 24 * 7;
    let nextTime = time * barTypePeriod * 1000;
    return nextTime;
}

export default function GenericPixiChart({
    chartDataRef,
    onDataUpdate,
    ohlcDatas = [],
    width = 1200,
    height = 600,
    symbol,
    fullSymbolRef: fullSymbolRefProp,
    barType,
    barTypePeriod,
    // loadData,
    Socket,
    onBarClick,
    // pixiApplicationRef,
    pixiDataRef,
    TouchGesture1Prop,
    TouchGesture2Prop,
    // newSymbolTimerRefProp,
    // loadDataRefProp,
    // lastTradesRefProp,
    currentBarRefProp = {},
    tickSize,
    mainChartContainerHeight = 400,
    options = { chartType: "candlestick" },
    lowerIndicators = [],
    ...rest
}) {
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
    // const fullSymbolRef = useRef(fullSymbolRefProp);
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
        console.log("GenericPixiChart init");
        console.log({ width, height });
        console.log({ width, height });
        console.log({ width, height });

        PixiAppRef.current = new PIXI.Application({
            width,
            height,
            backgroundColor: 0x333333,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
        });
        PixiAppRef.current.view.style["image-rendering"] = "pixelated";
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

        pixiDataRef.current = new GenericDataHandler({
            ohlcDatas,
            pixiApp: PixiAppRef.current,
            currentBarRef,
            width,
            height,
            symbol,
            margin: { top: 50, right: 100, left: 0, bottom: 40 },
            options,
            mainChartContainerHeight,
            tickSize: tickSizeRef.current,
            lowerIndicators,
        });
        // setPixiData(_pixiData);

        if (Socket) {
            Socket.on("timeBarUpdate", (data) => {
                if (data.symbol !== pixiDataRef.current.symbol.value) return;
                setCurrentTimeBar(data);
            });
        }

        return () => {
            console.log("DESTROY PIXI CHART");

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
    }, [symbol, barType.value, barTypePeriod]);

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

    return (
        <div
            className="col-6"
            ref={PixiChartRef}
            style={{ border: "2px solid red" }}
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
        />
    );
}
