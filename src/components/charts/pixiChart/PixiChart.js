import React, { useRef, useEffect, useState, useMemo } from "react";
import { toastr } from "react-redux-toastr";

import API from "../../../components/API";
import * as PIXI from "pixi.js";
// import { GiAirZigzag, GiHistogram, GiAmplitude } from "react-icons/gi";
// import { CgReadme } from "react-icons/cg";
// import { IoIosReorder } from "react-icons/io";

import { extent, scaleLinear, select, zoom, zoomTransform, mouse } from "d3";

import { IconButton } from "../../StratBuilder/components";
import { Flex } from "../../StratBuilder/components/chartComponents/styled";

import PixiData from "./components/DataHandler";
import TradeControls from "./components/TradeControls";
import OrdersList from "./components/OrdersList";
import Select from "./components/Select";
import Input from "./components/Input";

import IndicatorsBtns from "./components/IndicatorsBtns";
import StartEndTimes from "./components/StartEndTimes";
import PnL_AndOrderFlowStats from "./components/PnL_AndOrderFlowStats";
import { parseBarTypeTimeFrame } from "./components/utils";
import onLastTrade from "./handlers/onLastTrade";
import PlantStatuses from "./components/PlantStatuses";

function getNextTimeBar(data) {
    const { barType, barTypePeriod } = data;
    let time = barType === 1 ? 1 : barType === 2 ? 60 : barType === 3 ? 60 * 60 * 24 : 60 * 60 * 24 * 7;
    let nextTime = time * barTypePeriod * 1000;
    return nextTime;
}
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
    const loadDataRef = useRef();

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
    // const [currentMinute, setCurrentMinute] = useState(false);

    const [timeAndSales, setTimeAndSales] = useState([]);
    const [zoomGesture, setZoomGesture] = useState(false);
    const [toggleZigZag, setDrawZigZag] = useState(false);
    const [toggleMarketProfile, setDrawMarketProfile] = useState(false);
    const [toggleOrderbook, setDrawOrderBook] = useState(false);
    const [toggleOrders, setDrawOrders] = useState(false);

    const [togglePivotLines, setDrawPivotLines] = useState(false);
    // const [timeframe, setTimeframe] = useState({
    //     barType: 2,
    //     barTypePeriod: 1,
    //     name: "1Min",
    // });
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
    const [symbol, setSymbol] = useState({ name: "ES", value: "ES" });
    const [exchange, setExchange] = useState({ value: "CME", name: "CME" });
    const [symbolInput, setSymbolInput] = useState({
        value: "ES",
        name: "ES",
    });
    const [exchangeInput, setExchangeInput] = useState({
        value: "CME",
        name: "CME",
    });
    const [symbolInputDisabled, setSymbolInputDisabled] = useState(false);

    // const [accountPnLPositionUpdate, setAccountPnLPositionUpdate] = useState({});
    // const [instrumentPnLPositionUpdate, setInstrumentPnLPositionUpdate] = useState({});
    // const [orderTrackerCount, setOrderTrackerCount] = useState({});
    const [currentTimeBar, setCurrentTimeBar] = useState();
    const [orders, setOrders] = useState({});
    const [lastTrade, setLastTrade] = useState({});
    const [backgroundDataFetch, setBackgroundDataFetch] = useState(false);
    const [startTime, setStartTime] = useState();
    const [endTime, setEndTime] = useState();
    const [lastTwoDaysCompiled, setLastTwoDaysCompiled] = useState({});
    // const [bidAskRatios, setBidAskRatios] = useState({});
    const [plantStatus, setPlantStatus] = useState({});
    const [ticks, setTicks] = useState([]);

    const loadTicks = async () => {
        const ticks = await API.getTicks();
        debugger;
        setTicks(ticks);
    };
    //Fn to load ohlc data
    const loadData = ({
        startIndex = startTime ? new Date(startTime).getTime() : null, //= new Date().getTime() - 1000 * 60 * 60 * 24,
        finishIndex = new Date().getTime(),
        isNew = false,
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

        if (backgroundDataFetch) {
            startIndex = new Date(startTime).getTime();
            finishIndex = new Date(endTime).getTime();

            console.log({ startIndex, finishIndex });
        }

        // console.log("Loading data");
        setLoading(symbol.value);

        // startDate = startDate || new Date().getTime();
        API.rapi_requestBars({
            symbol: symbol.value,
            exchange: exchange.value,
            barType: barType.value,
            barTypePeriod,
            startIndex,
            finishIndex,
        })
            .then(async (_ohlcDatas) => {
                setLoading(false);

                if (!_ohlcDatas?.length) {
                    // setOhlcDatas([]);
                    // setPixiData([]);
                    // setSymbolInputDisabled(false);
                    loadDataRef.current++; //retry 10 times
                    if (loadDataRef.current < 10)
                        return await loadData({
                            finishIndex: startIndex,
                            isNew,
                        });
                }
                loadDataRef.current = 0;
                console.log(_ohlcDatas);
                //pre  process the data
                _ohlcDatas.forEach((d) => {
                    if (d.askVolume.high || d.bidVolume.high) {
                        alert("high");
                    } else {
                        d.volume = d.askVolume.low + d.bidVolume.low;
                    }
                    if (barType === 3 || barType === 4) {
                        d.datetime = new Date(d.datetime).getTime();
                    } else {
                        d.timestamp = d.datetime = d.datetime * 1000;
                    }
                    d.dateTime = new Date(d.timestamp).toLocaleString();
                });

                // console.log(_ohlcDatas[0].dateTime);
                // console.log(_ohlcDatas.slice(-1)[0].dateTime);
                if (backgroundDataFetch) {
                    console.log(_ohlcDatas);
                    // return;
                }

                // _ohlcDatas = _ohlcDatas.slice(-10);

                // console.log(_ohlcDatas.length);

                setOhlcDatas((ohlcDatas) => {
                    let allOhlcData;
                    if (isNew) {
                        allOhlcData = _ohlcDatas;
                    } else {
                        allOhlcData = _ohlcDatas.concat(ohlcDatas);
                    }
                    setPixiData((pixiData) => {
                        setSymbolInputDisabled(false);
                        if (!pixiData?.init) return alert("WHY??"); //WHY???
                        if (isNew) {
                            pixiData.ohlcDatas = [];
                        }
                        pixiData.init(_ohlcDatas);
                        return pixiData;
                    });

                    return allOhlcData;
                });
            })
            .catch((e) => {
                debugger;
                setLoading(false);

                alert(e);
            });
    };

    useEffect(() => {
        if (!pixiData) return;
        pixiData.setLastTwoDaysCompiled(lastTwoDaysCompiled);
    }, [lastTwoDaysCompiled, pixiData]);

    useEffect(() => {
        const data = currentTimeBar;
        // if (!data || !ohlcDatas.length || !pixiData) return;
        if (!data || !pixiData || !ohlcDatas?.length) return;
        data.timestamp = data.datetime = data.datetime * 1000;

        if (data.askVolume.high || data.bidVolume.high) {
            alert("high");
        } else {
            data.volume = data.askVolume.low + data.bidVolume.low;
        }

        if (parseInt(data.barType) !== parseInt(barType.value) || parseInt(data.barTypePeriod) !== parseInt(barTypePeriod) || data.symbol !== symbol.value) {
            return;
        }

        const lastBar = ohlcDatas.slice(-1)[0];
        const nextTimeBar = getNextTimeBar(data);

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

        //     pixiData.replaceLast(lastBar);

        //     setOhlcDatas((ohlcDatas) => {
        //         ohlcDatas[0] = lastBar;
        //         return [...ohlcDatas];
        //     });
        // } else {
        pixiData.replaceLast(data);
        pixiData.prependData(newBar);

        setOhlcDatas((ohlcDatas) => {
            ohlcDatas[0] = lastBar;
            return [...ohlcDatas, newBar];
        });
        // }
    }, [currentTimeBar]);

    useEffect(() => {
        // console.log({ orders });
        pixiData?.setOrders(orders);
    }, [orders]);

    useEffect(() => {
        if (!pixiData?.disableIndicator) return;
        pixiData?.disableIndicator("orders", toggleOrders);
    }, [toggleOrders, pixiData]);

    useEffect(() => {
        if (!pixiData?.disableIndicator) return;
        pixiData?.disableIndicator("zigZag", toggleZigZag);
    }, [toggleZigZag, pixiData]);

    useEffect(() => {
        if (!pixiData?.disableIndicator) return;
        pixiData?.disableIndicator("pivotLines", togglePivotLines);
    }, [togglePivotLines, pixiData]);

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
        if (newSymbolTimerRef?.current) {
            clearInterval(newSymbolTimerRef.current);
        }
        newSymbolTimerRef.current = setTimeout(() => {
            setSymbolInputDisabled(true);
            if (loading !== symbol.value) {
                loadData({
                    finishIndex: endTime ? new Date(endTime).getTime() || new Date().getTime() : new Date().getTime(),
                    isNew: true,
                });
            } else {
                alert(`Not loading ${symbol.name}`);

                setSymbolInputDisabled(false);
            }
        }, 1000);

        Socket.emit("requestTimeBarUpdate", {
            symbol: symbol.value,
            exchange: exchange.value,
            barType: barType.value,
            barTypePeriod,
        });

        return () => {
            // Socket.off("timeBarUpdate");
        };
    }, [symbol, barType, barTypePeriod]);

    //on load get data
    useEffect(() => {
        console.log("START PIXI CHART");
        //request data
        if (ohlcDatas.length === 0) {
            // loadData({
            //     finishIndex: new Date().getTime(), // - 1000 * 60 * 60 * 24,
            // });
        }

        PixiAppRef.current = new PIXI.Application({
            width,
            // height,
            backgroundColor: 0x333333,
            antialias: true,
        });
        PixiAppRef.current.view.style["image-rendering"] = "pixelated";

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
            // timeframe,
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

        // Socket.on("AccountPnLPositionUpdate", (message) => {
        //     // console.log(message);
        //     setAccountPnLPositionUpdate(message);
        // });

        // Socket.on("InstrumentPnLPositionUpdate", (message) => {
        //     // console.log(message);
        //     setInstrumentPnLPositionUpdate(message);
        // });
        // Socket.on("orderTracker", (orderTrackerCount) => {
        //     setOrderTrackerCount(orderTrackerCount);
        // });

        Socket.on("compileHistoryTracker", ({ lastTwoDaysCompiled, lastWeeklyData, combinedKeyLevels }) => {
            // console.log(lastTwoDaysCompiled);
            setLastTwoDaysCompiled({
                lastTwoDaysCompiled,
                lastWeeklyData,
                combinedKeyLevels,
            });
            pixiData.setLastTwoDaysCompiled({
                lastTwoDaysCompiled,
                lastWeeklyData,
                combinedKeyLevels,
            });
        });

        console.log("Emitting getCompileHistoryTracker");
        Socket.emit("getCompileHistoryTracker");

        if (!Object.keys(orders).length) {
            Socket.emit("getOrders", { ok: "?" });
        }

        Socket.on("orderCancelled", (data) => {
            console.log("orderCancelled");

            console.log(data);
        });
        Socket.on("ordersShown", (data) => {
            Object.keys(data).forEach((basketId) => {
                const currentOrder = orders[basketId] || {};

                orders[basketId] = { ...currentOrder, ...data[basketId] };
            });
            // console.log(orders);

            setOrders({ ...orders });
        });

        Socket.on("PlantStatus", (d) => {
            setPlantStatus((plantStatus) => ({
                ...plantStatus,
                [d.name]: true,
            }));
        });

        Socket.on("timeBarUpdate", (data) => {
            debugger;
            setCurrentTimeBar(data);
        });

        // Socket.on("orderTracker", (data) => {
        //     console.log("orderTracker");

        //     console.log(data);
        // });
        // BACK TESTER
        // Socket.on("backtester-bars", (d) => {
        //     console.log(d);
        // });

        return () => {
            console.log("DESTROY PIXI CHART");

            // On unload stop the application
            PixiAppRef.current.destroy(true, true);
            PixiAppRef.current = null;
            pixiData.destroy();
            setPixiData(false);
            Socket.off("rapi-message");
            Socket.off("PlantStatus");
            // Socket.off("AccountPnLPositionUpdate");
            // Socket.off("InstrumentPnLPositionUpdate");
            Socket.off("orderTracker");
            Socket.off("ordersShown");
            Socket.off("lastTwoDaysCompiled");
            Socket.off("timeBarUpdate");
            //BACK TESTER
            Socket.off("backtester-bars");
        };
    }, []);
    // }, [symbol, barType, barTypePeriod]);

    useEffect(() => {
        if (!pixiData || !pixiData.showCrosshair || !pixiData.hideCrosshair) return console.log("no pixidata?");
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
        // if (!ohlcDatas.length || !PixiAppRef.current || !pixiData) return;
        if (!pixiData) return;

        pixiData.draw();

        /////////////////////////////////////
        Socket.on("lastTrade", onLastTrade({ setLastTrade, setOhlcDatas, pixiData }));

        Socket.on("liquidity", (data) => {
            pixiData.setLiquidityData(data);
        });
        ////////////////////////////////////////////////////
        return () => {
            Socket.off("lastTrade");
            Socket.off("liquidity");
        };
    }, [ohlcDatas, PixiAppRef.current]);

    // useEffect(() => {
    //     if (!ohlcDatas.length) return;
    //     if (!currentMinute) return;
    //     const data = currentMinute[symbol.slice(1)];
    //     const lastOhlc = ohlcDatas.slice(-1)[0];
    //     if (!data) return;

    //     console.log(new Date(data.timestamp).toLocaleString());
    //     const dataTime = new Date(data.timestamp).getMinutes();
    //     const lastDataTime = new Date(lastOhlc.timestamp).getMinutes();
    //     const sameTime = dataTime === lastDataTime;
    //     if (!sameTime) {
    //         setOhlcDatas((ohlcDatas) => ohlcDatas.concat([data]));
    //         pixiData.prependData(data);
    //     }
    // }, [currentMinute]);

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
            const after = Math.abs(TouchGesture1.current?.clientX - TouchGesture2.current?.clientX);
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

    const OrdersListMemo = useMemo(() => <OrdersList orders={orders} />, [orders]);

    const PlantStatusesMemo = useMemo(
        () => <PlantStatuses plantStatus={plantStatus} setPlantStatus={setPlantStatus} />,

        [plantStatus]
    );

    const PnL_AndOrderFlowStatsMemo = useMemo(() => {
        return (
            <PnL_AndOrderFlowStats
                Socket={Socket}
                // ticks={ticks}
                // bidAskRatios={bidAskRatios}
                //  instrumentPnLPositionUpdate={instrumentPnLPositionUpdate}
                //   accountPnLPositionUpdate={accountPnLPositionUpdate}
                //   orderTrackerCount={orderTrackerCount}
            />
        );
    }, [Socket]);

    return (
        <>
            <div className="row">
                <div className="col-6">
                    <div className="row d-flex border">
                        <div className="col-auto">
                            <IndicatorsBtns
                                setDrawZigZag={setDrawZigZag}
                                setDrawMarketProfile={setDrawMarketProfile}
                                setDrawOrderBook={setDrawOrderBook}
                                togglePivotLines={togglePivotLines}
                                setDrawPivotLines={setDrawPivotLines}
                                toggleZigZag={toggleZigZag}
                                toggleMarketProfile={toggleMarketProfile}
                                toggleOrderbook={toggleOrderbook}
                                setDrawOrders={setDrawOrders}
                                toggleOrders={toggleOrders}
                            />
                        </div>
                        <div className="col-auto">{PlantStatusesMemo}</div>
                    </div>
                    <div className="row g-1">
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
                        <div className="col-auto ">
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

                        <div className="col-auto">
                            <Select
                                // disabled={symbolInputDisabled}
                                label="Exchange"
                                value={exchangeInput}
                                setValue={setExchangeInput}
                                options={[
                                    { value: "SMFE", name: "SMFE" },
                                    { value: "COMEX", name: "COMEX" },
                                    { value: "CBOT", name: "CBOT" },
                                    { value: "NYMEX", name: "NYMEX" },
                                    { value: "CME", name: "CME" },
                                ]}
                            />
                        </div>

                        <div className="col-2 border d-flex">
                            <button
                                onClick={() => {
                                    setBarType({ ...barTypeInput });
                                    setBarTypePeriod(barTypePeriodInput);
                                    setSymbol({ ...symbolInput });
                                    setExchange({ ...exchangeInput });
                                }}
                                className="btn btn-secondary flex-fill d-flex flex-1 justify-content-center h-100 align-items-center"
                            >
                                GET
                            </button>
                        </div>
                        <div className="col ">
                            <StartEndTimes backgroundDataFetch={backgroundDataFetch} setBackgroundDataFetch={setBackgroundDataFetch} setStartTime={setStartTime} setEndTime={setEndTime} startTime={startTime} endTime={endTime} />
                        </div>
                    </div>

                    <TradeControls lastTrade={lastTrade} />
                </div>
                <div className="col-6">
                    {/* <button
                        onClick={() => {
                            loadTicks();
                        }}
                    >
                        LOAD TICKS
                    </button> */}
                    {PnL_AndOrderFlowStatsMemo}
                </div>
                <div className="col-12">
                    <div className="row">
                        <div className="col">Start {new Date(startTime).toLocaleString()}</div>
                        <div className="col">end {new Date(endTime).toLocaleString()}</div>
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
