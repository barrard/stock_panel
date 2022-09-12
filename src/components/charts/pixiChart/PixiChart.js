import React, { useRef, useEffect, useState } from "react";
import API from "../../../components/API";
import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";

import { axisBottom, axisRight, axisLeft, axisTop } from "d3-axis";
// import { scaleLinear, scaleTime, scaleBand } from "d3-scale";
import { extent, scaleLinear, select, zoom, zoomTransform, mouse } from "d3";

import PixiData from "./components/DataHandler";

export default function PixiChart() {
    //TODO really set this
    const [width, setWidth] = useState(window.innerWidth * 0.9);
    //TODO cjould be input
    const [height, setHeight] = useState(600);
    //should be another window
    const [volHeight, setVolHeight] = useState(300);
    const [mouseEnter, setMouseEnter] = useState(false);
    const [pixiData, setPixiData] = useState();

    //Pixi Application
    const PixiAppRef = useRef();
    //the ui element
    const PixiChartRef = useRef();
    //TouchGestures (2)
    const TouchGesture1 = useRef();
    const TouchGesture2 = useRef();

    const [ohlcDatas, setOhlcDatas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [longPressTimer, setLongPressTimer] = useState(false);
    //TESTING VALUES
    const [longPress, setLongPress] = useState(false);
    const [touch, setTouch] = useState(false);
    const [move, setMove] = useState(false);
    const [startingTimer, setStartingTimer] = useState(false);
    const [gesture, setIsGesture] = useState(false);
    const [hasTimer, setHasTimer] = useState(false);
    const [events, setEvents] = useState(false);
    const [touchMove, setTouchMove] = useState(false);
    const [touch1, setTouch1] = useState(false);
    const [touch2, setTouch2] = useState(false);
    const [touchMoveEvent, setTouchMoveEvent] = useState(false);

    const [zoomGesture, setZoomGesture] = useState(false);

    //Fn to load ohlc data
    const loadData = ({ startDate, withTicks }) => {
        if (loading) {
            return console.log("No can, I stay loading");
        }
        console.log("Loading data");
        setLoading(true);
        startDate = startDate || new Date().getTime();
        API.getBackTestData({
            symbol: "/ES",
            timeframe: "1Min",
            startDate,
            withTicks,
        }).then((_ohlcDatas) => {
            console.log(_ohlcDatas);
            setPixiData((pixiData) => {
                console.log(pixiData);
                pixiData.init(_ohlcDatas);
                return pixiData;
            });
            setOhlcDatas((ohlcDatas) => {
                return _ohlcDatas.concat(ohlcDatas);
            });

            setLoading(false);
        });
    };

    //on load get data
    useEffect(() => {
        //request data
        if (ohlcDatas.length === 0) {
            loadData({ withTicks: false });
        }
        PixiAppRef.current = new PIXI.Application({
            width,
            height,
            backgroundColor: 0x333333,
            antialias: true,
        });
        PixiAppRef.current.stage.interactive = true;

        // On first render add app to DOM
        PixiChartRef.current.appendChild(PixiAppRef.current.view);

        const pixiData = new PixiData({
            ohlcDatas,
            // viewPort: viewportRef.current,
            pixiApp: PixiAppRef.current,
            loadData,
            width,
            height,
            volHeight,
        });

        setPixiData(pixiData);

        // // create viewport
        // viewportRef.current = new Viewport({
        //     screenWidth: width,
        //     screenHeight: height,
        //     worldWidth: width,
        //     worldHeight: height,
        //     interaction: PixiAppRef.current.renderer.plugins.interaction, // the interaction module is important for wheel to work properly when renderer.view is placed or scaled
        //     passiveWheel: false,
        //     stopPropagation: true,
        // }); //.clamp({ top: 0, left: 0, right: 8000, bottom: 8000 });

        // viewportRef.current
        //     .drag()
        //     .wheel()
        //     .pinch()
        //     .decelerate()
        //     .on("clicked", console.log);

        // //Zoom and pan events
        // viewportRef.current.on("zoomed", ({ type, viewport }) => {
        //     console.log("hitArea");
        //     console.log(viewport.hitArea);
        //     console.log("lastViewport");
        //     console.log(viewport.lastViewport);
        //     viewport.scaleY = 0;
        //     viewport.scaleX = 0;
        // });

        // // viewportRef.current.on("moved", ({ type, viewport }) => {
        // //     console.log("hitArea");
        // //     console.log(viewport.hitArea);
        // //     console.log("lastViewport");
        // //     console.log(viewport.lastViewport);
        // // });

        // PixiAppRef.current.stage.addChild(viewportRef.current);

        return () => {
            // On unload stop the application
            PixiAppRef.current.destroy(true, true);
            PixiAppRef.current = null;
            pixiData.destroy();
            setPixiData(false);
        };
    }, []);

    useEffect(() => {
        if (!pixiData) return console.log("no pixidata?");
        if (mouseEnter) {
            pixiData.showCrosshair();
        } else {
            pixiData.hideCrosshair();
        }
    }, [mouseEnter]);

    useEffect(() => {
        if (!pixiData) return;
        pixiData.longPress = longPress;
    }, [longPress]);

    //Fn to handle new data
    useEffect(() => {
        if (!ohlcDatas.length || !PixiAppRef.current) return;

        pixiData.draw();
    }, [ohlcDatas, PixiAppRef.current]);

    useEffect(() => {
        let touch1MoveDiff;
        if (touch1 && touch2) {
            const before = Math.abs(touch1 - touch2);
            const after = Math.abs(
                TouchGesture1.current?.clientX - TouchGesture2.current?.clientX
            );
            if (before > after) {
                setZoomGesture(`zoom out ${before - after}`);
                pixiData.zoomOut(before - after);
            } else if (before < after) {
                pixiData.zoomIn(after - before);
                setZoomGesture(`zoom in ${after - before}`);
            }
        }
        setTouch1(TouchGesture1.current?.clientX);

        setTouch2(TouchGesture2.current?.clientX);
    }, [TouchGesture1.current?.clientX, TouchGesture2.current?.clientX]);

    const clearLongPress = () => {
        clearInterval(longPressTimer);
        setLongPressTimer(false);
        setLongPress(false);
        setStartingTimer(false);
        setMouseEnter(false);
    };

    const clearGesture = () => {
        pixiData.gesture = false;

        setIsGesture(false);
    };

    const checkGesture = (e) => {
        if (e.touches.length === 2) {
            TouchGesture1.current = e.touches[0];
            TouchGesture2.current = e.touches[1];
            setIsGesture(true);
            clearLongPress();
            pixiData.gesture = true;
            return true;
        }
    };

    const printEvents = (e) => {
        let str = "";
        for (let k in e) {
            if (k === "touches") {
                addTouches(e[k]);
            } else {
                // str += `${k}: ${e[k]} - \n`;
            }
        }

        function addTouches(touches) {
            if (!touches) return;
            debugger;
            Array.from(touches).forEach((touch) => {
                // for (let k in touch) {
                // if (typeof e[k] === "object") {
                //     addTouch(e[k]);
                // } else {
                str += `${"clientX"}: ${touch["clientX"]} - \n`;
                // }
                // }
            });
        }

        return str;
    };

    return (
        <>
            {loading && <> LOADING......</>}
            {pixiData?.mouseX && (
                <> pixiData?.mouseX - {pixiData?.mouseX}......</>
            )}
            <br />
            {touch && <> touch......</>}

            <br />
            {gesture && <> gesture......</>}

            <br />
            {touchMove && <> touchMove......</>}

            <br />
            {touch1 && <> touch1 - {touch1}......</>}

            <br />
            {touch2 && <> touch2 - {touch2}......</>}

            <br />
            {touchMoveEvent && (
                <> touchMoveEvent - {touchMoveEvent.clientX}......</>
            )}

            <br />
            {events && (
                <p style={{ whiteSpace: "pre-line" }}> {printEvents(events)}</p>
            )}
            {zoomGesture && <>zoomGesture - {zoomGesture}</>}
            {/* 
            {move && <> move......</>}
            {longPressTimer && <> longPressTimer......</>}
            {startingTimer && <> startingTimer......</>}
            {mouseEnter && <> mouseEnter......</>}
            {hasTimer && <> hasTimer......</>}
            {!hasTimer && <> NOhasTimer......</>} */}
            <div
                onMouseEnter={(e) => {
                    // console.log(e);
                    setMouseEnter(true);
                    // setTouch(true);
                }}
                // onTouchMove={(e) => {
                //     setTouchMove(true);
                //     checkGesture(e);
                // }}
                onTouchMove={(e) => {
                    setTouchMove(true);
                    setTouchMoveEvent(e);
                    checkGesture(e);
                }}
                onTouchStart={(e) => {
                    checkGesture(e);
                    setTouch(true);
                    setMouseEnter(false);
                    setEvents(e);
                    pixiData.touches++;
                    // pixiData.setMouse(e);

                    if (!longPressTimer) {
                        setStartingTimer(true);
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
                    setTouchMove(false);
                    setTouchMoveEvent(false);

                    setTouch1(false);
                    setTouch2(false);
                    setZoomGesture(false);
                    clearLongPress();
                    pixiData.touches = 0;
                }}
                onMouseLeave={() => {
                    clearLongPress();
                    setMouseEnter(false);
                    setLongPress(false);
                }}
                onPointerEnter={() => setMouseEnter(true)}
                onPointerLeave={() => setMouseEnter(false)}
                onWheel={(e) => {
                    // setEvents(e);
                    if (e.deltaY > 0) {
                        // console.log("The user scrolled up");
                        pixiData.zoomOut("scroll");
                    } else {
                        // console.log("The user scrolled down");
                        pixiData.zoomIn("scroll");
                    }
                }}
                ref={PixiChartRef}
                style={{
                    // padding: "0 9em",
                    width,
                    height,
                    border: "2px solid red",
                }}
            />
        </>
    );
}
