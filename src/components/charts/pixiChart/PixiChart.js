import React, { useRef, useEffect, useState, useMemo } from "react";
import { toastr } from "react-redux-toastr";

import API from "../../../components/API";
import * as PIXI from "pixi.js";
import { GiAirZigzag, GiHistogram, GiAmplitude } from "react-icons/gi";
import { IoIosReorder } from "react-icons/io";

import { extent, scaleLinear, select, zoom, zoomTransform, mouse } from "d3";

import { IconButton } from "../../StratBuilder/components";
import { Flex } from "../../StratBuilder/components/chartComponents/styled";

import PixiData from "./components/DataHandler";
import TradeControls from "./components/TradeControls";
import OrdersList from "./components/OrdersList";
import Select from "./components/Select";
import Input from "./components/Input";
import PnL_AndOrderFlowStats from "./components/PnL_AndOrderFlowStats";
import { parseBarTypeTimeFrame } from "./components/utils";
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

    const [rerender, setRerender] = useState({});

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
    const [toggleOrderbook, setDrawOrderBook] = useState(false);
    const [timeframe, setTimeframe] = useState({
        barType: 2,
        barTypePeriod: 1,
        name: "1Min",
    });
    const [barType, setBarType] = useState({
        value: 1,
        name: "Seconds",
    });
    const [barTypePeriod, setBarTypePeriod] = useState(60);
    const [barTypeInput, setBarTypeInput] = useState({
        value: 1,
        name: "Second",
    });
    const [barTypePeriodInput, setBarTypePeriodInput] = useState(60);
    const [symbol, setSymbol] = useState({ name: "ESM3", value: "ESM3" });
    const [exchange, setExchange] = useState({ value: "CME", name: "CME" });
    const [symbolInput, setSymbolInput] = useState({
        value: "ESM3",
        name: "ESM3",
    });
    const [exchangeInput, setExchangeInput] = useState({
        value: "CME",
        name: "CME",
    });
    const [symbolInputDisabled, setSymbolInputDisabled] = useState(false);

    const [accountPnLPositionUpdate, setAccountPnLPositionUpdate] = useState(
        {}
    );
    const [instrumentPnLPositionUpdate, setInstrumentPnLPositionUpdate] =
        useState({});
    const [orderTrackerCount, setOrderTrackerCount] = useState({});
    const [currentTimeBar, setCurrentTimeBar] = useState();
    const [orders, setOrders] = useState(undefined);
    const [lastTrade, setLastTrade] = useState({});

    //Fn to load ohlc data
    const loadData = ({
        // barType = 2,
        // barTypePeriod = 1,
        startIndex, //= new Date().getTime() - 1000 * 60 * 60 * 24,
        finishIndex = new Date().getTime(),
        // symbol = symbol,
        // exchange = exchange,
    }) => {
        if (loading) {
            return console.log("No can, I stay loading");
        }
        startIndex =
            startIndex ||
            finishIndex -
                parseBarTypeTimeFrame({
                    barType: barType.value,
                    barTypePeriod,
                });

        // console.log("Loading data");
        setLoading(symbol);

        // startDate = startDate || new Date().getTime();
        API.rapi_requestBars({
            symbol: symbol.value,
            exchange: exchange.value,
            barType: barType.value,
            barTypePeriod,
            startIndex,
            finishIndex,
        }).then(async (_ohlcDatas) => {
            if (!_ohlcDatas?.length) {
                // setOhlcDatas([]);
                // setPixiData([]);
                // setSymbolInputDisabled(false);

                return await loadData({ finishIndex: startIndex });
            }

            _ohlcDatas.forEach((d) => {
                if (d.askVolume.high || d.bidVolume.high) {
                    alert("high");
                } else {
                    d.volume = d.askVolume.low + d.bidVolume.low;
                }
                d.timestamp = d.datetime = d.datetime * 1000;
                d.dateTime = new Date(d.timestamp).toLocaleString();
            });

            // _ohlcDatas = _ohlcDatas.slice(-10);

            console.log(_ohlcDatas.length);

            setOhlcDatas((ohlcDatas) => {
                const allOhlcData = _ohlcDatas.concat(ohlcDatas);
                setPixiData((pixiData) => {
                    setSymbolInputDisabled(false);
                    if (!pixiData?.init) return alert("WHY??"); //WHY???
                    pixiData.init(_ohlcDatas);
                    return pixiData;
                });

                return allOhlcData;
            });
            setLoading(false);
        });
    };
    useEffect(() => {
        const data = currentTimeBar;
        if (!data || !ohlcDatas.length || !pixiData) return;
        data.timestamp = data.datetime = data.datetime * 1000;
        if (data.askVolume.high || data.bidVolume.high) {
            alert("high");
        } else {
            data.volume = data.askVolume.low + data.bidVolume.low;
        }
        console.log(new Date(data.timestamp).toLocaleString());
        console.log(data);
        const min = new Date(data.timestamp).getMinutes();
        for (let x = ohlcDatas.length - 1; x > -1; x--) {
            const element = ohlcDatas[x];
            const ohlcDataLastMin = new Date(element.timestamp).getMinutes();

            if (ohlcDataLastMin === min) {
                console.log("Found Minute at " + x);
                pixiData.replaceLast(data, x);
                setOhlcDatas((ohlcDatas) => {
                    ohlcDatas[x] = data;
                    return [...ohlcDatas];
                });

                return;
            }
        }
        console.error("WHUT");

        // alert("whut");
    }, [currentTimeBar]);

    useEffect(() => {
        console.log({ orders });
    }, [orders]);

    useEffect(() => {
        if (!pixiData?.disableIndicator) return;
        pixiData?.disableIndicator("zigZag", toggleZigZag);
    }, [toggleZigZag, pixiData]);

    useEffect(() => {
        if (!pixiData?.disableIndicator) return;
        pixiData?.disableIndicator("marketProfile", toggleMarketProfile);
    }, [toggleMarketProfile, pixiData]);

    useEffect(() => {
        if (!pixiData?.disableIndicator) return;
        pixiData?.disableIndicator("orderBook", toggleOrderbook);
    }, [toggleOrderbook, pixiData]);

    useEffect(() => {
        // if (!newSymbolTimerRef?.current) return;
        setOhlcDatas(() => []);
        if (pixiData) {
            pixiData.ohlcDatas = [];
        }
        // if (newSymbolTimerRef?.current) {
        //     clearInterval(newSymbolTimerRef.current);
        // }
        // newSymbolTimerRef.current = setTimeout(() => {
        //     setSymbolInputDisabled(true);

        //     if (loading !== symbol) {
        //         loadData({
        //             finishIndex: new Date().getTime(),
        //         });
        //     } else {
        //         alert(`Not loading ${symbol}`);
        //         setSymbolInputDisabled(false);
        //     }
        // }, 1000);
    }, [symbol, barType, barTypePeriod]);

    //on load get data
    useEffect(() => {
        //request data
        if (ohlcDatas.length === 0) {
            loadData({
                finishIndex: new Date().getTime(), // - 1000 * 60 * 60 * 24,
            });
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
        PixiChartRef.current?.addEventListener(
            "mousewheel",
            (e) => {
                e.preventDefault();
            },
            { passive: false }
        );
        const pixiData = new PixiData({
            ohlcDatas,
            // viewPort: viewportRef.current,
            pixiApp: PixiAppRef.current,
            loadData,
            width,
            symbol: symbol,
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

        Socket.on("rapi-message", (message) => {
            toastr.success(message);
        });

        Socket.on("AccountPnLPositionUpdate", (message) => {
            // console.log(message);
            setAccountPnLPositionUpdate(message);
        });

        Socket.on("InstrumentPnLPositionUpdate", (message) => {
            // console.log(message);
            setInstrumentPnLPositionUpdate(message);
        });
        Socket.on("orderTracker", (orderTrackerCount) =>
            setOrderTrackerCount(orderTrackerCount)
        );

        Socket.emit("requestTimeBarUpdate", {
            symbol: symbol.value,
            exchange: exchange.value,
            barType: barType.value,
            barTypePeriod,
        });

        if (!orders) {
            Socket.emit("getOrders", { ok: "?" });
        }

        Socket.on("timeBarUpdate", (data) => {
            setCurrentTimeBar(data);
        });

        Socket.on("orderCancelled", (data) => {
            console.log("orderCancelled");

            console.log(data);
        });
        Socket.on("ordersShown", (data) => {
            setOrders((orders) => ({ ...(orders && { ...orders }), ...data }));
        });

        Socket.on("orderTracker", (data) => {
            console.log("orderTracker");

            console.log(data);
        });

        return () => {
            // On unload stop the application
            PixiAppRef.current.destroy(true, true);
            PixiAppRef.current = null;
            pixiData.destroy();
            setPixiData(false);
            Socket.off("rapi-message");
            Socket.off("AccountPnLPositionUpdate");
            Socket.off("InstrumentPnLPositionUpdate");
            Socket.off("orderTracker");
            Socket.off("timeBarUpdate");
            Socket.off("ordersShown");
        };
    }, [symbol, barType, barTypePeriod]);

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
        if (!ohlcDatas.length || !PixiAppRef.current || !pixiData) return;

        pixiData.draw();

        /////////////////////////////////////
        Socket.on("lastTrade", (message) => {
            // if (!ohlcDatas.length) return;

            const {
                aggressor,
                tradePrice,
                tradeSize,
                vwap,
                timestamp: seconds,
            } = message;

            const timestamp = seconds * 1000 + 1000 * 60; //Need to add code to check the barType and period
            const lastOhlc = pixiData.ohlcDatas.slice(-1)[0];

            if (!lastOhlc) {
                return;
            }

            const min = new Date(timestamp).getMinutes();
            const ohlcDataLastMin = new Date(lastOhlc.timestamp).getMinutes();
            if (min !== ohlcDataLastMin) {
                const data = {
                    open: tradePrice,
                    high: tradePrice,
                    low: tradePrice,
                    close: tradePrice,
                    volume: tradeSize,
                    timestamp,
                };
                setLastTrade(message);
                setOhlcDatas((ohlcDatas) => ohlcDatas.concat([data]));
                pixiData.prependData(data);
            } else {
                const close = tradePrice;
                lastOhlc.volume += tradeSize;
                lastOhlc.close = close;
                if (lastOhlc.low > close) lastOhlc.low = close;
                if (lastOhlc.high < close) lastOhlc.high = close;

                pixiData.replaceLast(lastOhlc);
                pixiData.updateCurrentPriceLabel(tradePrice);
            }
        });

        Socket.on("liquidity", (data) => {
            // if (data.length) {
            // console.log(data);
            pixiData.setLiquidityData(data);
            // }
        });
        ////////////////////////////////////////////////////
        return () => {
            Socket.off("lastTrade");
            Socket.off("liquidity");
        };
    }, [ohlcDatas, PixiAppRef.current]);

    useEffect(() => {
        if (!ohlcDatas.length) return;
        if (!currentMinute) return;
        const data = currentMinute[symbol.slice(1)];
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

    // useEffect(() => {
    //     if (!ohlcDatas.length) return;
    //     if (!timeAndSales.length) return;
    //     const lastOhlc = ohlcDatas.slice(-1)[0];
    //     const updatedLastOhlc = timeAndSales.reduce((acc, timeAndSales) => {
    //         const close = timeAndSales["2"];
    //         lastOhlc.volume += timeAndSales["3"];
    //         lastOhlc.close = close;
    //         if (lastOhlc.low > close) lastOhlc.low = close;
    //         if (lastOhlc.high < close) lastOhlc.high = close;
    //         return lastOhlc;
    //     }, lastOhlc);

    //     pixiData.replaceLast(updatedLastOhlc);
    //     pixiData.updateCurrentPriceLabel(updatedLastOhlc.close);
    // }, [timeAndSales]);

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

    // useEffect(() => {
    //     if (!pixiData) return;

    //     setOhlcDatas([]);
    //     pixiData.setTimeframe(timeframe);
    //     pixiData.loadMoreData();
    // }, [timeframe]);

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

    const OrdersListMemo = useMemo(
        () => <OrdersList orders={orders} />,
        [orders]
    );

    return (
        <>
            <div className="row">
                <div className="col-6">
                    <div className="row g-0">
                        <div className="col-auto">
                            <IconButton
                                borderColor={toggleZigZag ? "green" : false}
                                title="ZigZag"
                                onClick={() => setDrawZigZag(!toggleZigZag)}
                                rIcon={<GiAirZigzag />}
                            />
                        </div>
                        <div className="col-auto">
                            <IconButton
                                borderColor={
                                    toggleMarketProfile ? "green" : false
                                }
                                title="Market Profile"
                                onClick={() =>
                                    setDrawMarketProfile(!toggleMarketProfile)
                                }
                                rIcon={<GiAmplitude />}
                            />
                        </div>
                        <div className="col-auto">
                            <IconButton
                                borderColor={toggleOrderbook ? "green" : false}
                                title="Order Book"
                                onClick={() =>
                                    setDrawOrderBook(!toggleOrderbook)
                                }
                                rIcon={<IoIosReorder />}
                            />
                        </div>

                        <div className="col-auto">
                            <Select
                                label="Bar Type"
                                value={barTypeInput}
                                setValue={setBarTypeInput}
                                options={[
                                    { value: 1, name: "Seconds" },
                                    { value: 2, name: "Minute" },
                                    { value: 3, name: "Daily" },
                                    { value: 4, name: "Weekly" },
                                ]}
                            />
                        </div>
                        <div className="col-2">
                            <Input
                                // disabled={symbolInputDisabled}
                                type="number"
                                setValue={setBarTypePeriodInput}
                                value={barTypePeriodInput}
                                label="BarTypePeriod"
                            />
                        </div>
                    </div>
                    <div className="row g-0">
                        <div className="col-3 border">
                            <Select
                                // disabled={symbolInputDisabled}
                                label="Symbol"
                                value={symbolInput}
                                setValue={setSymbolInput}
                                options={[
                                    { value: "ES", name: "ES" },
                                    { value: "NQ", name: "NQ" },
                                    { value: "CL", name: "CL" },
                                    { value: "GC", name: "GC" },
                                ]}
                            />
                        </div>

                        <div className="col-3 border">
                            <Select
                                // disabled={symbolInputDisabled}
                                label="Exchange"
                                value={exchangeInput}
                                setValue={setExchangeInput}
                                options={[
                                    { value: "SMFE", name: "SMFE" },
                                    { value: "COMEX", name: "COMEX" },
                                    { value: "CBOT", name: "CBOT" },
                                    { value: "NYMES", name: "NYMES" },
                                    { value: "CME", name: "CME" },
                                ]}
                            />
                        </div>

                        <div className="col-2 border d-flex">
                            <button
                                onClick={() => {
                                    setBarType(barTypeInput);
                                    setBarTypePeriod(barTypePeriodInput);
                                    setSymbol(symbolInput);
                                    setExchange(exchangeInput);
                                }}
                                className="btn btn-secondary flex-fill d-flex flex-1 justify-content-center h-100 align-items-center"
                            >
                                GET
                            </button>
                        </div>
                    </div>
                    {/* </Flex> */}

                    <TradeControls lastTrade={lastTrade} />
                </div>
                <div className="col-6">
                    <PnL_AndOrderFlowStats
                        instrumentPnLPositionUpdate={
                            instrumentPnLPositionUpdate
                        }
                        orderTrackerCount={orderTrackerCount}
                    />
                </div>
                <div className="col-12">
                    <div className="row">
                        <div className="col">Symbol {symbol.name}</div>
                        <div className="col">Exchange {exchange.name}</div>
                        <div className="col">BarType val {barType.name}</div>
                        <div className="col">BarTypePeriod {barTypePeriod}</div>
                    </div>
                </div>
            </div>
            <div
                className="col-10"
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
            {/* <OrdersList orders={orders} /> */}
            <div>{OrdersListMemo}</div>
        </>
    );
}
