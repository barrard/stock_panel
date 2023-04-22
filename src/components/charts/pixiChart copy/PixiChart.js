import React, { useRef, useEffect, useState } from "react";
import { toastr } from "react-redux-toastr";

import API from "../../../components/API";
import * as PIXI from "pixi.js";
import { GiAirZigzag, GiHistogram, GiAmplitude } from "react-icons/gi";

import { extent, scaleLinear, select, zoom, zoomTransform, mouse } from "d3";

import { IconButton } from "../../StratBuilder/components";
import { Flex } from "../../StratBuilder/components/chartComponents/styled";

import PixiData from "./components/DataHandler";

export default function PixiChart({ Socket }) {
    //TODO really set this
    const [width, setWidth] = useState(Math.floor(window.innerWidth * 0.9));
    //TODO cjould be input
    // const [height, setHeight] = useState(1000);
    //should be another window
    // const [volHeight, setVolHeight] = useState(300);
    const [mouseEnter, setMouseEnter] = useState(false);
    const [pixiData, setPixiData] = useState();

    //Pixi Application
    const PixiAppRef = useRef();
    //the ui element
    const PixiChartRef = useRef();
    //TouchGestures (2)
    const TouchGesture1 = useRef();
    const TouchGesture2 = useRef();
    const newSymbolTimerRef = useRef();
    // const pixiDataRef = useRef();

    const [ohlcDatas, setOhlcDatas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [longPressTimer, setLongPressTimer] = useState(false);
    //TESTING VALUES
    const [longPress, setLongPress] = useState(false);
    const [touch, setTouch] = useState(false);
    const [move, setMove] = useState(false);
    const [gesture, setIsGesture] = useState(false);
    const [touch1, setTouch1] = useState(false);
    const [touch2, setTouch2] = useState(false);
    const [touchMoveEvent, setTouchMoveEvent] = useState(false);
    const [currentMinute, setCurrentMinute] = useState(false);

    const [timeAndSales, setTimeAndSales] = useState([]);
    const [zoomGesture, setZoomGesture] = useState(false);
    const [toggleZigZag, setDrawZigZag] = useState(false);
    const [toggleMarketProfile, setDrawMarketProfile] = useState(false);
    const [timeframe, setTimeframe] = useState("1Min");
    const [_symbol, setSymbol] = useState("/ES");
    const [symbolInputDisabled, setSymbolInputDisabled] = useState(false);

    const [accountPnLPositionUpdate, setAccountPnLPositionUpdate] = useState(
        {}
    );
    const [instrumentPnLPositionUpdate, setInstrumentPnLPositionUpdate] =
        useState({});
    const [orderTraderCount, setOrderTraderCount] = useState({});

    //Fn to load ohlc data
    const loadData = ({
        startDate = new Date().getTime(),
        withTicks = false,
        timeframe,
        symbol = _symbol,
    }) => {
        if (loading) {
            return console.log("No can, I stay loading");
        }
        // console.log("Loading data");
        setLoading(_symbol);

        // startDate = startDate || new Date().getTime();
        API.getBackTestData({
            symbol,
            timeframe,
            startDate,
            withTicks,
        }).then((_ohlcDatas) => {
            if (!_ohlcDatas?.length) {
                setOhlcDatas([]);
                setPixiData([]);
                setSymbolInputDisabled(false);

                return;
            }

            // _ohlcDatas = _ohlcDatas.slice(-10);

            console.log(_ohlcDatas.length);

            setOhlcDatas((ohlcDatas) => {
                const allOhlcData = _ohlcDatas.concat(ohlcDatas);
                setPixiData((pixiData) => {
                    setSymbolInputDisabled(false);
                    if (!pixiData?.init) return; //WHY???
                    pixiData.init(_ohlcDatas);
                    return pixiData;
                });

                return allOhlcData;
            });
            setLoading(false);
        });
    };
    useEffect(() => {
        if (!pixiData?.disableIndicator) return;
        pixiData.disableIndicator("zigZag");
    }, [toggleZigZag]);

    useEffect(() => {
        if (!pixiData) return;
        pixiData.disableIndicator("marketProfile");
    }, [toggleMarketProfile]);

    //on load get data
    useEffect(() => {
        //request data
        if (ohlcDatas.length === 0) {
            // loadData({ withTicks: false, timeframe });
        }
        PixiAppRef.current = new PIXI.Application({
            width,
            // height,
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
            symbol: _symbol,
            // height,
            // volHeight,
            tickSize: 0.25,
            timeframe,
            margin: {
                top: 50,
                right: 100,
                left: 0,
                bottom: 40,
            },
        });

        setPixiData(pixiData);
        // pixiDataRef.current = pixiData;

        // Socket.on("timeAndSales", (timeAndSales) => {
        //     const data = timeAndSales.filter((ts) => ts.key.includes(_symbol));
        //     setTimeAndSales(data);
        // });
        // Socket.on("CHART_FUTURES", (data) => {
        //     console.log("CHART_FUTURES");
        //     const contractSymbol = Object.keys(data).find((key) =>
        //         key.includes(_symbol)
        //     );
        //     data = data[contractSymbol];
        //     // console.log(data);
        // });
        // Socket.on("current_minute_data", (data) => {
        //     setCurrentMinute(data);
        // });
        Socket.on("lastTrade", (message) => {
            // console.log(message);
            // setPixiData((pixiData) =>
            // if (pixiDataRef.current.updateCurrentPriceLabel) {
            //     console.log(pixiDataRef.current.updateCurrentPriceLabel);
            //     debugger;
            pixiData.updateCurrentPriceLabel(message.tradePrice);
            // }
            // );
        });

        Socket.on("rapi-message", (message) => {
            toastr.success(message);
        });

        Socket.on("AccountPnLPositionUpdate", (message) => {
            // console.log(message);
            setAccountPnLPositionUpdate(message);
        });

        Socket.on("InstrumentPnLPositionUpdate", (message) => {
            // console.log(message);
            debugger;
            setInstrumentPnLPositionUpdate(message);
        });
        Socket.on("orderTracker", (orderTrackerCount) =>
            setOrderTraderCount(orderTrackerCount)
        );

        return () => {
            // On unload stop the application
            PixiAppRef.current.destroy(true, true);
            PixiAppRef.current = null;
            pixiData.destroy();
            setPixiData(false);
            Socket.off("lastTrade");
            Socket.off("rapi-message");
            Socket.off("AccountPnLPositionUpdate");
            Socket.off("InstrumentPnLPositionUpdate");
            Socket.off("orderTracker");
        };
    }, []);

    useEffect(() => {
        if (!pixiData || !pixiData.showCrosshair || !pixiData.hideCrosshair)
            return console.log("no pixidata?");
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
        if (!ohlcDatas.length) return;
        if (!currentMinute) return;
        const data = currentMinute[_symbol.slice(1)];
        const lastOhlc = ohlcDatas.slice(-1)[0];
        if (!data) return;

        const dataTime = new Date(data.timestamp).getMinutes();
        const lastDataTime = new Date(lastOhlc.timestamp).getMinutes();
        const sameTime = dataTime === lastDataTime;
        if (!sameTime) {
            setOhlcDatas((ohlcDatas) => ohlcDatas.concat([data]));
            pixiData.prependData(data);
        }
    }, [currentMinute]);

    useEffect(() => {
        if (!ohlcDatas.length) return;
        if (!timeAndSales.length) return;
        const lastOhlc = ohlcDatas.slice(-1)[0];
        const updatedLastOhlc = timeAndSales.reduce((acc, timeAndSales) => {
            const close = timeAndSales["2"];
            lastOhlc.volume += timeAndSales["3"];
            lastOhlc.close = close;
            if (lastOhlc.low > close) lastOhlc.low = close;
            if (lastOhlc.high < close) lastOhlc.high = close;
            return lastOhlc;
        }, lastOhlc);

        pixiData.replaceLast(updatedLastOhlc);
        pixiData.updateCurrentPriceLabel(updatedLastOhlc.close);
    }, [timeAndSales]);

    useEffect(() => {
        let touch1MoveDiff;
        if (touch1 && touch2) {
            const before = Math.abs(touch1 - touch2);
            const after = Math.abs(
                TouchGesture1.current?.clientX - TouchGesture2.current?.clientX
            );
            if (before > after) {
                pixiData.zoomOut(before - after);
            } else if (before < after) {
                pixiData.zoomIn(after - before);
            }
        }
        setTouch1(TouchGesture1.current?.clientX);

        setTouch2(TouchGesture2.current?.clientX);
    }, [TouchGesture1.current?.clientX, TouchGesture2.current?.clientX]);

    useEffect(() => {
        if (!pixiData) return;

        setOhlcDatas([]);
        pixiData.setTimeframe(timeframe);
        pixiData.loadMoreData();
    }, [timeframe]);

    useEffect(() => {
        // if (!newSymbolTimerRef?.current) return;
        if (newSymbolTimerRef?.current) {
            clearInterval(newSymbolTimerRef.current);
        }
        newSymbolTimerRef.current = setTimeout(() => {
            setSymbolInputDisabled(true);

            if (loading !== _symbol) {
                loadData({
                    startDate: new Date().getTime(),
                    symbol: _symbol,
                    timeframe,
                });
            } else {
                alert(`Not loading ${_symbol}`);
                setSymbolInputDisabled(false);
            }
        }, 1000);
    }, [_symbol]);

    const clearLongPress = () => {
        clearInterval(longPressTimer);
        setLongPressTimer(false);
        setLongPress(false);
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

    const handleTimeframe = (e) => {
        setTimeframe(e.target.value);
    };

    const updateSymbol = (e) => {
        const value = e.target.value;
        console.log(value);
        setSymbol(value);
    };

    return (
        <>
            <div className="row">
                <div className="col-6">
                    <Flex>
                        <IconButton
                            borderColor={toggleZigZag ? "green" : false}
                            title="ZigZag"
                            onClick={() => setDrawZigZag(!toggleZigZag)}
                            rIcon={<GiAirZigzag />}
                        />

                        <IconButton
                            borderColor={toggleMarketProfile ? "green" : false}
                            title="Market Profile"
                            onClick={() =>
                                setDrawMarketProfile(!toggleMarketProfile)
                            }
                            rIcon={<GiAmplitude />}
                        />
                        <select
                            onChange={handleTimeframe}
                            name="timeframe"
                            id=""
                        >
                            <option value="1Min">1Min</option>
                            <option value="5Min">5Min</option>
                            <option value="10Min">10Min</option>
                            <option value="15Min">15Min</option>
                        </select>
                    </Flex>
                    <Flex>
                        <div className="row border ml-1">
                            <div className="col-6">
                                <label htmlFor="symbol">Symbol</label>
                            </div>
                            <div className="col">
                                <input
                                    disabled={symbolInputDisabled}
                                    type="text"
                                    value={_symbol}
                                    onChange={updateSymbol}
                                />
                            </div>
                        </div>
                    </Flex>
                </div>
                <div className="col-6">
                    <div className="row">
                        <div className="col-6">
                            P&L = {instrumentPnLPositionUpdate.openPositionPnl}
                        </div>
                        <div className="col-6">
                            dayClosedPnl ={" "}
                            {instrumentPnLPositionUpdate.dayClosedPnl}
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-6">
                            netQuantity ={" "}
                            {instrumentPnLPositionUpdate.netQuantity}
                        </div>
                        <div className="col-6">
                            avgOpenFillPrice =
                            {instrumentPnLPositionUpdate.avgOpenFillPrice}
                        </div>
                    </div>

                    <div className="row">
                        <div className="col-6">
                            fillBuyQty ={" "}
                            {instrumentPnLPositionUpdate.fillBuyQty}
                        </div>
                        <div className="col-6">
                            fillSellQty ={" "}
                            {instrumentPnLPositionUpdate.fillSellQty}
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-6">
                            bigPlayers: {orderTraderCount.bigPlayer}
                        </div>
                        <div className="col-6">
                            orderDelta: {orderTraderCount.orderDelta}
                        </div>
                    </div>
                </div>
            </div>
            <div
                onMouseEnter={(e) => {
                    setMouseEnter(true);
                }}
                onTouchMove={(e) => {
                    setTouchMoveEvent(e);
                    checkGesture(e);
                }}
                onTouchStart={(e) => {
                    checkGesture(e);
                    setTouch(true);
                    setMouseEnter(false);
                    pixiData.touches++;

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
                    pixiData.touches--;
                }}
                onMouseLeave={() => {
                    clearLongPress();
                    setMouseEnter(false);
                    setLongPress(false);
                }}
                onPointerEnter={() => setMouseEnter(true)}
                onPointerLeave={() => setMouseEnter(false)}
                onWheel={(e) => {
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
                    border: "2px solid red",
                }}
            />
        </>
    );
}
