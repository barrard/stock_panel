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
// import TradeControls from "./components/TradeControls";
import OrdersList from "./components/OrdersList";
import Select from "./components/Select";
import Input from "./components/Input";

import SymbolBtns from "./components/SymbolBtns";
import TimeFrameBtns from "./components/TimeFrameBtns";
import IndicatorsBtns from "./components/IndicatorsBtns";
import MarketOverview from "./components/MarketOverview";
import SpyOptions from "./components/SpyOptions";
// import StartEndTimes from "./components/StartEndTimes";
// import PnL_AndOrderFlowStats from "./components/PnL_AndOrderFlowStats";
import AccountInfoTable from "./components/AccountInfoTable";
import { parseBarTypeTimeFrame, symbolOptions } from "./components/utils";
import onLastTrade from "./handlers/onLastTrade";
import PlantStatuses from "./components/PlantStatuses";
import { TICKS } from "../../../indicators/indicatorHelpers/TICKS";

function getNextTimeBar(data) {
    const { barType, barTypePeriod } = data;
    let time = barType === 1 ? 1 : barType === 2 ? 60 : barType === 3 ? 60 * 60 * 24 : 60 * 60 * 24 * 7;
    let nextTime = time * barTypePeriod * 1000;
    return nextTime;
}
export default function PixiChart({ Socket }) {
    const ticks = TICKS();
    //TODO really set this
    const [width, setWidth] = useState(Math.floor(window.innerWidth * 0.9));
    //TODO could be input
    // const [height, setHeight] = useState(1000);
    //should be another window
    // const [volHeight, setVolHeight] = useState(300);
    const [mouseEnter, setMouseEnter] = useState(false);
    const [pixiData, setPixiData] = useState();

    //Trade Window
    const [openTradeWindow, setOpenTradeWindow] = useState(false);

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
    //price data
    const lastTradesRef = useRef({});
    const tickSizeRef = useRef({});
    //Full Symbol
    const fullSymbolRef = useRef();

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
    const [fullSymbols, setFullSymbols] = useState([]);
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
        name: "Seconds",
    });
    const [barTypePeriodInput, setBarTypePeriodInput] = useState(60);
    const [symbol, setSymbol] = useState({ name: "ES", value: "ES" });
    const [exchange, setExchange] = useState({ value: "CME", name: "CME" });
    const [symbolInput, setSymbolInput] = useState({
        value: "ES",
        name: "ES",
        exchange: "CME",
        tickSize: ticks["ES"],
    });

    const [currentTimeBar, setCurrentTimeBar] = useState();
    const [orders, setOrders] = useState({});
    const [lastTrade, setLastTrade] = useState({});
    const [backgroundDataFetch, setBackgroundDataFetch] = useState(false);
    const [startTime, setStartTime] = useState();
    const [endTime, setEndTime] = useState();
    const [lastTwoDaysCompiled, setLastTwoDaysCompiled] = useState({});
    // const [bidAskRatios, setBidAskRatios] = useState({});
    const [plantStatus, setPlantStatus] = useState({});
    // const [ticks, setTicks] = useState([]);

    const loadTicks = async () => {
        const ticks = await API.getTicks();
        // setTicks(ticks);
    };
    //Fn to load ohlc data
    const loadData = ({
        startIndex = startTime ? new Date(startTime).getTime() : null, //= new Date().getTime() - 1000 * 60 * 60 * 24,
        finishIndex = new Date().getTime(),
        isNew = false,
        symbol,
        barType,
        barTypePeriod,
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
            exchange: symbol.exchange,
            barType: barTypeInput.value,
            barTypePeriod: barTypePeriodInput,
            startIndex,
            finishIndex,
        })
            .then(async (_ohlcDatas) => {
                setLoading(false);

                if (_ohlcDatas?.length < 2) {
                    // setOhlcDatas([]);
                    // setPixiData([]);
                    // setSymbolInputDisabled(false);
                    loadDataRef.current++; //retry 10 times
                    if (loadDataRef.current < 10)
                        return await loadData({
                            finishIndex: startIndex,
                            isNew,
                            symbol,
                            barType,
                            barTypePeriod,
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
                        // setSymbolInputDisabled(false);
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
                setLoading(false);

                alert(e);
            });
    };

    useEffect(() => {
        if (!pixiData) return;

        // if (openTradeWindow) {
        pixiData.showTradeWindow(openTradeWindow, fullSymbolRef.current);
        // }

        if (!Object.keys(pixiData.orders).length) {
            getOrders();
        }
    }, [openTradeWindow, pixiData, fullSymbolRef.current]);

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

        if (
            parseInt(data.barType) !== parseInt(barType.value) ||
            parseInt(data.barTypePeriod) !== parseInt(barTypePeriod) ||
            data.symbol !== symbol.value
        ) {
            return;
        }

        const lastBar = ohlcDatas.slice(-1)[0];
        const nextTimeBar = getNextTimeBar(data);
        pixiData.updateCurrentPriceLabel(data.close);

        const newBar = {
            open: data.close,
            high: data.close,
            low: data.close,
            close: data.close,
            volume: 0,
            timestamp: data.timestamp + nextTimeBar,
        };

        pixiData.replaceLast(data);
        pixiData.prependData(newBar);
    }, [currentTimeBar]);

    useEffect(() => {
        // debugger;
        if (!pixiData?.disableIndicator) return;
        pixiData?.disableIndicator("orders", toggleOrders);
        return () => {
            pixiData?.disableIndicator("orders", false);
        };
    }, [toggleOrders, pixiData]);

    useEffect(() => {
        if (!pixiData?.disableIndicator) return;
        pixiData?.disableIndicator("zigZag", toggleZigZag);
        return () => {
            pixiData?.disableIndicator("zigZag", false);
        };
    }, [toggleZigZag, pixiData]);

    useEffect(() => {
        if (!pixiData?.disableIndicator) return;
        pixiData?.disableIndicator("pivotLines", togglePivotLines);
        return () => {
            pixiData?.disableIndicator("pivotLines", false);
        };
    }, [togglePivotLines, pixiData]);

    useEffect(() => {
        if (!pixiData?.disableIndicator) return;
        pixiData?.disableIndicator("marketProfile", toggleMarketProfile);
        return () => {
            pixiData?.disableIndicator("marketProfile", false);
        };
    }, [toggleMarketProfile, pixiData]);

    useEffect(() => {
        if (!pixiData?.disableIndicator) return;
        pixiData?.disableIndicator("orderBook", toggleOrderbook);
        return () => {
            pixiData?.disableIndicator("orderBook", false);
        };
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
            if (loading !== symbol.value) {
                loadData({
                    finishIndex: endTime ? new Date(endTime).getTime() || new Date().getTime() : new Date().getTime(),
                    isNew: true,
                    symbol: symbolInput,
                    barType: barTypeInput,
                    barTypePeriod: barTypePeriodInput,
                });
            } else {
                alert(`Not loading ${symbol.name}`);
            }
        }, 1000);

        pixiData?.setLoadDataFn(loadData);

        Socket.emit("requestTimeBarUpdate", {
            symbol: symbolInput.value,
            exchange: symbolInput.exchange,
            barType: barTypeInput.value,
            barTypePeriod,
        });

        if (barType.value !== barTypeInput.value) {
            setBarType({ ...barTypeInput });
            pixiData?.setTimeframe({ barType: barTypeInput, barTypePeriod: barTypePeriodInput });
        }
        if (barTypePeriod !== barTypePeriodInput) {
            setBarTypePeriod(barTypePeriodInput);
            pixiData?.setTimeframe({ barType: barTypeInput, barTypePeriod: barTypePeriodInput });
        }
        if (symbol.value !== symbolInput.value) {
            setSymbol({ ...symbolInput });
        }

        const baseSymbol = fullSymbols.find((d) => d.baseSymbol === symbolInput.value);
        fullSymbolRef.current = baseSymbol;

        return () => {
            // Socket.off("timeBarUpdate");
        };
    }, [barTypeInput, barTypePeriodInput, symbolInput]);
    useEffect(() => {
        const baseSymbol = fullSymbols.find((d) => d.baseSymbol === symbolInput.value);
        fullSymbolRef.current = baseSymbol;
    }, [fullSymbols]);

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
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
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
            symbol: symbolInput,
            fullSymbol: fullSymbolRef,
            barType: barTypeInput,
            barTypePeriod: barTypePeriodInput,
            // height,
            // volHeight,
            // tickSize: 0.25,
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

        Socket.on("orderCancelled", (data) => {
            console.log("orderCancelled");

            console.log(data);
        });

        Socket.on("PlantStatus", (d) => {
            setPlantStatus((plantStatus) => ({
                ...plantStatus,
                [d.name]: true,
            }));
        });

        Socket.on("timeBarUpdate", (data) => {
            if (data.symbol !== pixiData.symbol.value) return;
            setCurrentTimeBar(data);
        });

        return () => {
            console.log("DESTROY PIXI CHART");

            // On unload stop the application
            PixiAppRef.current.destroy(true, true);
            PixiAppRef.current = null;
            pixiData.destroy();
            setPixiData(false);
            Socket.off("rapi-message");
            Socket.off("PlantStatus");

            // Socket.off("orderTracker");
            // Socket.off("ordersShown");
            Socket.off("lastTwoDaysCompiled");
            Socket.off("timeBarUpdate");
            //BACK TESTER
            Socket.off("backtester-bars");

            setDrawMarketProfile(false);
            setDrawOrderBook(false);
            setDrawOrders(false);
            setDrawPivotLines(false);
            setDrawZigZag(false);
        };
    }, [symbol]);
    // }, [symbol, barType, barTypePeriod]);

    useEffect(() => {
        Socket.on("ordersShown", (data) => {
            debugger;
            Object.keys(data).forEach((basketId) => {
                // setOrders((orders) => [...orders, data[basketId]]);
                if (!orders[basketId]) orders[basketId] = [];
                orders[basketId].push(data[basketId]);
                pixiData?.addOrder([data[basketId]]);
            });
            setOrders({ ...orders });
        });
        return () => {
            Socket.off("ordersShown");
        };
    }, [orders]);

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

        tickSizeRef.current = TICKS()[symbol.value];
        if (!pixiData) return;
        pixiData.draw();

        /////////////////////////////////////
        Socket.on("lastTrade", onLastTrade({ setLastTrade, setOhlcDatas, pixiData, lastTradesRef }));
        // Socket.on("lastTickBar", onLastTrade({ setLastTrade, setOhlcDatas, pixiData, tickBar: true }));

        Socket.on("liquidity", (data) => {
            if (data.symbol !== pixiData.symbol.value) return;

            pixiData.setLiquidityData(data);
        });
        ////////////////////////////////////////////////////
        return () => {
            Socket.off("lastTrade");
            Socket.off("lastTickBar");
            Socket.off("liquidity");
        };
    }, [ohlcDatas, PixiAppRef.current, pixiData, setOhlcDatas, setLastTrade, symbol]);

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

    useEffect(() => {
        API.getFrontMonthSymbols()
            .then((d) => {
                if (!d.length) {
                    // alert("Missing full symbols");
                }
                setFullSymbols([...d]);
                const baseSymbol = d.find((d) => d.baseSymbol === symbolInput.value);

                fullSymbolRef.current = baseSymbol;
            })
            .catch((e) => {
                console.error(e);
                // alert("Missing full symbols");
            });
    }, []);

    async function getOrders() {
        const _orders = await API.getOrders();
        // debugger;
        function reduceByBasketId(acc, order) {
            if (!order.basketId) return acc;
            if (!acc[order.basketId]) {
                acc[order.basketId] = [];
            }
            acc[order.basketId].push(order);
            return acc;
        }
        const compiledOrders = Object.values(_orders).reduce(reduceByBasketId, orders);
        // debugger;
        setOrders({ ...compiledOrders });
        pixiData?.setOrders(_orders);
    }

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

    const TimeFrameBtnsMemo = useMemo(
        () => (
            <TimeFrameBtns
                backgroundDataFetch={backgroundDataFetch}
                setBackgroundDataFetch={setBackgroundDataFetch}
                setStartTime={setStartTime}
                setEndTime={setEndTime}
                startTime={startTime}
                endTime={endTime}
                setBarType={setBarTypeInput}
                setBarTypePeriod={setBarTypePeriodInput}
                barType={barType}
                barTypePeriod={barTypePeriod}
            />
        ),
        [barType, barTypePeriod]
    );
    const SymbolBtnsMemo = useMemo(
        () => <SymbolBtns symbolOptions={symbolOptions} symbol={symbolInput} setSymbol={setSymbolInput} />,
        [barType, barTypePeriod, symbolInput]
    );

    // console.log("das render");
    return (
        <>
            <div className="row g-0 relative">
                <div className="absolute ">{PlantStatusesMemo}</div>
                <div className="col-6 ">{/* <TradeControls fullSymbols={fullSymbols} symbol={symbolInput} lastTrade={lastTrade} /> */}</div>

                <AccountInfoTable Socket={Socket} />

                <SpyOptions Socket={Socket} />
                <MarketOverview Socket={Socket} lastTradesRef={lastTradesRef} fullSymbols={fullSymbols} />
                {/* <div className="col-12">
                    <div className="row">
                        <div className="col">Start {new Date(startTime).toLocaleString()}</div>
                        <div className="col">end {new Date(endTime).toLocaleString()}</div>
                        <div className="col-auto">Symbol {symbol.name}</div>
                        <div className="col-auto">Exchange {exchange.name}</div>
                        <div className="col-auto">BarType val {barType.name}</div>
                        <div className="col-auto">BarTypePeriod {barTypePeriod}</div>
                    </div>
                </div> */}
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

                    <div className="col-auto">
                        {TimeFrameBtnsMemo}
                        {/* <TimeFrameBtns setBarType={setBarTypeInput} setBarTypePeriod={setBarTypePeriodInput} barType={barType} barTypePeriod={barTypePeriod} /> */}
                    </div>
                    <div className="col-auto">
                        {SymbolBtnsMemo}
                        {/* <TimeFrameBtns setBarType={setBarTypeInput} setBarTypePeriod={setBarTypePeriodInput} barType={barType} barTypePeriod={barTypePeriod} /> */}
                    </div>

                    <div className="col-auto border ">
                        <Select
                            // disabled={symbolInputDisabled}
                            // label="Symbol"
                            value={symbolInput}
                            setValue={setSymbolInput}
                            options={symbolOptions}
                        />
                    </div>
                </div>
            </div>
            <div
                className="col-10"
                onContextMenu={(e) => {
                    e.preventDefault();
                    console.log(`onContextMenu ${openTradeWindow}`);
                    setOpenTradeWindow((v) => !v);
                }}
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
                    setOpenTradeWindow(false);
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
            {/* <button
                onClick={async () => {
                    await getOrders();
                }}
            >
                Get Orders
            </button> */}
            <div>{OrdersListMemo}</div>
        </>
    );
}
