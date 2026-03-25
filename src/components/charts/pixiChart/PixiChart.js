import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
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
import PixiChartV2 from "./PixiChartV2";
import TradeControls from "./components/TradeControls";
import OrdersList from "./components/OrdersList";
import Select from "./components/Select";
import Input from "./components/Input";

import SymbolBtns from "./components/SymbolBtns";
import TimeFrameBtns from "./components/TimeFrameBtns";
import IndicatorsBtns from "./components/IndicatorsBtns";
import MarketOverview from "./components/MarketOverview";
import MarketBreadth from "./components/MarketBreadth";
import SpyOptions from "./components/SpyOptions";
// import StartEndTimes from "./components/StartEndTimes";
// import PnL_AndOrderFlowStats from "./components/PnL_AndOrderFlowStats";
import AccountInfoTable from "./components/AccountInfoTable";
import { parseBarTypeTimeFrame, symbolOptions } from "./components/utils";
import onLastTrade from "./handlers/onLastTrade";
import PlantStatuses from "./components/PlantStatuses";
import { TICKS } from "../../../indicators/indicatorHelpers/TICKS";
import BetterTickChart from "./components/BetterTickChart";
import BackTestChartGeneric from "../BacktestChart/BackTestChartGeneric";
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from "react-resizable-panels";
import OrderFlowSoundEngine from "./components/OrderFlowSoundEngine";

const EMPTY_ORDERS = Object.freeze({});
const ORDER_FLOW_SOUND_SETTINGS_KEY = "pixi-chart-order-flow-sound-settings";
const ORDER_FLOW_CUE_TYPES = [
    "price_step_up",
    "price_step_down",
    "large_trade_buy",
    "large_trade_sell",
    "burst_buy",
    "burst_sell",
    "pace_buy",
    "pace_sell",
    "pace_buy_fast",
    "pace_sell_fast",
];
const DEPTH_FLOW_TEST_TYPES = ["depth_bid_support", "depth_ask_pressure", "depth_pull_ask", "depth_pull_bid"];
const CUE_NUMBERS = {
    depth_ask_pressure: 10,
    large_trade_sell: 14,
    burst_sell: 18,
    depth_pull_bid: 22,
    pace_sell: 26,
    pace_sell_fast: 30,
    pace_down: 34,
    depth_bid_support: 38,
    price_step_down: 46,
    pace_buy: 58,
    burst_buy: 66,
    price_step_up: 74,
    pace_buy_fast: 82,
    large_trade_buy: 90,
    depth_pull_ask: 98,
};

function getCueButtonLabel(cueType) {
    const cueNumber = CUE_NUMBERS[cueType];
    return cueNumber !== undefined ? `${cueNumber} ${cueType}` : cueType;
}

function getCueButtonPalette(cueType, isActive) {
    const isPositive =
        cueType.includes("buy") || cueType.includes("bid_support") || cueType.includes("pull_ask") || cueType.includes("step_up");
    const isNegative =
        cueType.includes("sell") || cueType.includes("ask_pressure") || cueType.includes("pull_bid") || cueType.includes("step_down");

    if (isPositive) {
        return {
            background: isActive ? "#15803d" : "#0f2a1a",
            border: isActive ? "1px solid #86efac" : "1px solid #355e43",
            color: "#dcfce7",
            boxShadow: isActive ? "0 0 0 1px rgba(187, 247, 208, 0.35), 0 0 16px rgba(34, 197, 94, 0.35)" : "none",
        };
    }

    if (isNegative) {
        return {
            background: isActive ? "#b91c1c" : "#2d1212",
            border: isActive ? "1px solid #fca5a5" : "1px solid #6b3a3a",
            color: "#fee2e2",
            boxShadow: isActive ? "0 0 0 1px rgba(254, 202, 202, 0.35), 0 0 16px rgba(239, 68, 68, 0.35)" : "none",
        };
    }

    return {
        background: isActive ? "#1d4ed8" : "#162033",
        border: isActive ? "1px solid #93c5fd" : "1px solid #475569",
        color: "#dbeafe",
        boxShadow: isActive ? "0 0 0 1px rgba(191, 219, 254, 0.35), 0 0 16px rgba(37, 99, 235, 0.35)" : "none",
    };
}

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
    const [activeTab, setActiveTab] = useState("futures");
    const [showCompactBreadth, setShowCompactBreadth] = useState(true);

    //Pixi Application
    const PixiAppRef = useRef();
    //the ui element
    const PixiChartRef = useRef();
    //TouchGestures (2)
    const TouchGesture1 = useRef();
    const TouchGesture2 = useRef();
    const newSymbolTimerRef = useRef();
    const orderFlowSoundButtonRef = useRef();
    const orderFlowSoundEngineRef = useRef(null);
    // const pixiDataRef = useRef();
    const loadDataRef = useRef();
    //price data
    const lastTradesRef = useRef({});
    const tickSizeRef = useRef({});
    //Full Symbol
    const fullSymbolRef = useRef();
    const [fullSymbolValue, setFullSymbolValue] = useState(null);
    // Track if orders have been loaded for the current symbol
    const ordersLoadedRef = useRef(false);

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
    const [embeddedBacktestData, setEmbeddedBacktestData] = useState(null);
    const [lastTrade, setLastTrade] = useState({});
    const [backgroundDataFetch, setBackgroundDataFetch] = useState(false);
    const [startTime, setStartTime] = useState();
    const [endTime, setEndTime] = useState();
    const [lastTwoDaysCompiled, setLastTwoDaysCompiled] = useState({});
    // const [bidAskRatios, setBidAskRatios] = useState({});
    const [plantStatus, setPlantStatus] = useState({});
    // const [ticks, setTicks] = useState([]);
    const [showOrderFlowSoundPanel, setShowOrderFlowSoundPanel] = useState(false);
    const [orderFlowSoundPanelPosition, setOrderFlowSoundPanelPosition] = useState({
        top: 0,
        right: 0,
    });
    const [activeOrderFlowCueTypes, setActiveOrderFlowCueTypes] = useState({});
    const [activeDepthFlowCueTypes, setActiveDepthFlowCueTypes] = useState({});
    const [orderFlowAudioUnlocked, setOrderFlowAudioUnlocked] = useState(false);
    const [orderFlowSoundSettings, setOrderFlowSoundSettings] = useState(() => {
        try {
            const rawSettings = window.localStorage.getItem(ORDER_FLOW_SOUND_SETTINGS_KEY);
            if (!rawSettings) {
                return {
                    enabled: true,
                    minStrength: 1,
                };
            }

            const parsedSettings = JSON.parse(rawSettings);
            return {
                enabled: parsedSettings.enabled !== false,
                minStrength: [1, 2, 3].includes(parsedSettings.minStrength) ? parsedSettings.minStrength : 1,
                depthFlowEnabled: parsedSettings.depthFlowEnabled !== false,
            };
        } catch (error) {
            console.error("[PixiChart] Failed to load order flow sound settings", error);
            return {
                enabled: true,
                minStrength: 1,
                depthFlowEnabled: true,
            };
        }
    });

    useEffect(() => {
        window.localStorage.setItem(ORDER_FLOW_SOUND_SETTINGS_KEY, JSON.stringify(orderFlowSoundSettings));
    }, [orderFlowSoundSettings]);

    useEffect(() => {
        orderFlowSoundEngineRef.current = new OrderFlowSoundEngine();

        return () => {
            orderFlowSoundEngineRef.current?.cleanup();
            orderFlowSoundEngineRef.current = null;
        };
    }, []);

    const updateOrderFlowSoundPanelPosition = useCallback(() => {
        const buttonRect = orderFlowSoundButtonRef.current?.getBoundingClientRect?.();
        if (!buttonRect) return;

        setOrderFlowSoundPanelPosition({
            top: buttonRect.bottom + 8,
            right: Math.max(window.innerWidth - buttonRect.right, 8),
        });
    }, []);

    useEffect(() => {
        if (!showOrderFlowSoundPanel) return;

        updateOrderFlowSoundPanelPosition();

        window.addEventListener("resize", updateOrderFlowSoundPanelPosition);
        window.addEventListener("scroll", updateOrderFlowSoundPanelPosition, true);

        return () => {
            window.removeEventListener("resize", updateOrderFlowSoundPanelPosition);
            window.removeEventListener("scroll", updateOrderFlowSoundPanelPosition, true);
        };
    }, [showOrderFlowSoundPanel, updateOrderFlowSoundPanelPosition]);

    const registerOrderFlowSound = useCallback(() => {
        if (!symbolInput?.value) return;

        Socket.emit("subscribeOrderFlow", {
            symbol: symbolInput.value,
        });
    }, [Socket, symbolInput?.value]);

    const subscribeDepthFlowSound = useCallback(() => {
        if (!symbolInput?.value) return;

        Socket.emit("subscribeDepthFlow", {
            symbol: symbolInput.value,
        });
    }, [Socket, symbolInput?.value]);

    const unsubscribeDepthFlowSound = useCallback(() => {
        if (!symbolInput?.value) return;

        Socket.emit("unsubscribeDepthFlow", {
            symbol: symbolInput.value,
        });
    }, [Socket, symbolInput?.value]);

    const unlockOrderFlowSound = useCallback(async () => {
        try {
            const unlocked = await orderFlowSoundEngineRef.current?.unlock?.();
            if (unlocked === false) {
                setOrderFlowAudioUnlocked(false);
                console.warn("[PixiChart] Order flow audio is not available yet");
            } else if (unlocked) {
                setOrderFlowAudioUnlocked(true);
                console.log("[PixiChart] Order flow audio unlocked");
            }
        } catch (error) {
            setOrderFlowAudioUnlocked(false);
            console.error("[PixiChart] Failed to unlock order flow audio", error);
        }
    }, []);

    const testOrderFlowSound = useCallback(async () => {
        try {
            const played = await orderFlowSoundEngineRef.current?.test?.();
            if (!played) {
                console.warn("[PixiChart] Order flow test sound did not play");
            }
        } catch (error) {
            console.error("[PixiChart] Failed to play order flow test sound", error);
        }
    }, []);

    const testOrderFlowCue = useCallback(
        async (type) => {
            await unlockOrderFlowSound();
            orderFlowSoundEngineRef.current?.playCue({
                type,
                strength: orderFlowSoundSettings.minStrength,
            });
        },
        [orderFlowSoundSettings.minStrength, unlockOrderFlowSound]
    );

    const testDepthFlowCue = useCallback(
        async (type) => {
            await unlockOrderFlowSound();
            orderFlowSoundEngineRef.current?.playDepthCue({
                type,
                strength: orderFlowSoundSettings.minStrength,
            });
        },
        [orderFlowSoundSettings.minStrength, unlockOrderFlowSound]
    );

    const flashCueType = useCallback((setActiveCueTypes, type) => {
        if (!type) return;

        const flashToken = `${type}-${Date.now()}-${Math.random()}`;
        setActiveCueTypes((current) => ({
            ...current,
            [type]: flashToken,
        }));

        window.setTimeout(() => {
            setActiveCueTypes((current) => {
                if (current[type] !== flashToken) return current;

                const next = { ...current };
                delete next[type];
                return next;
            });
        }, 220);
    }, []);

    const playOrderFlowCue = useCallback(({ type, strength }) => {
        orderFlowSoundEngineRef.current?.playCue({ type, strength });
    }, []);

    const playDepthFlowCue = useCallback(({ type, strength }) => {
        orderFlowSoundEngineRef.current?.playDepthCue({ type, strength });
    }, []);

    const handleOrderFlowSound = useCallback(
        (payload) => {
            const { type, strength } = payload || {};
            if (!type) return;

            if (showOrderFlowSoundPanel) {
                flashCueType(setActiveOrderFlowCueTypes, type);
            }

            if (!orderFlowSoundSettings.enabled) return;

            const normalizedStrength = Number.isFinite(Number(strength)) ? Number(strength) : 1;
            if (normalizedStrength < orderFlowSoundSettings.minStrength) return;
            playOrderFlowCue({ type, strength: normalizedStrength });
        },
        [flashCueType, orderFlowSoundSettings.enabled, orderFlowSoundSettings.minStrength, playOrderFlowCue, showOrderFlowSoundPanel]
    );

    const handleDepthFlowSound = useCallback(
        (payload) => {
            const { type, strength } = payload || {};
            if (!type) return;

            if (showOrderFlowSoundPanel) {
                flashCueType(setActiveDepthFlowCueTypes, type);
            }

            if (!orderFlowSoundSettings.depthFlowEnabled) return;

            const normalizedStrength = Number.isFinite(Number(strength)) ? Number(strength) : 1;
            playDepthFlowCue({ type, strength: normalizedStrength });
        },
        [flashCueType, orderFlowSoundSettings.depthFlowEnabled, playDepthFlowCue, showOrderFlowSoundPanel]
    );

    useEffect(() => {
        if (orderFlowAudioUnlocked) return;

        const tryUnlock = () => {
            unlockOrderFlowSound();
        };

        const eventOptions = { capture: true, passive: true };

        window.addEventListener("pointerdown", tryUnlock, eventOptions);
        window.addEventListener("touchstart", tryUnlock, eventOptions);
        window.addEventListener("keydown", tryUnlock, true);

        return () => {
            window.removeEventListener("pointerdown", tryUnlock, eventOptions);
            window.removeEventListener("touchstart", tryUnlock, eventOptions);
            window.removeEventListener("keydown", tryUnlock, true);
        };
    }, [orderFlowAudioUnlocked, unlockOrderFlowSound]);

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

                if (!Array.isArray(_ohlcDatas)) {
                    const message = _ohlcDatas?.error || _ohlcDatas?.message || "Unexpected response while loading historical bars.";
                    throw new Error(message);
                }

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
                // console.log(_ohlcDatas);
                //pre  process the data
                _ohlcDatas.forEach((d) => {
                    if (d.askVolume?.high || d.bidVolume?.high) {
                        console.warn("Encountered aggregated volume bucket", d);
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
                        if (!pixiData?.init) {
                            console.error("PixiData instance missing init during loadData.");
                            return pixiData;
                        } //WHY???
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

                console.error("Failed to load historical bars", e);
                const message = e?.message || e?.toString?.() || "Unable to load historical bars.";
                toastr.error("Pixi Chart", message);
            });
    };

    const getOrderGroupKey = useCallback((order) => order?.groupBasketId || order?.entryBasketId || order?.basketId, []);

    // Define getOrders before the useEffects that use it
    const getOrders = useCallback(async () => {
        console.log("[getOrders] Called");
        const _orders = await API.getOrders();
        function reduceByBasketId(acc, order) {
            const groupKey = getOrderGroupKey(order);
            if (!groupKey) return acc;
            if (!acc[groupKey]) {
                acc[groupKey] = [];
            }
            acc[groupKey].push(order);
            return acc;
        }
        // Use functional update to avoid dependency on 'orders'
        setOrders((prevOrders) => {
            const compiledOrders = Object.values(_orders).reduce(reduceByBasketId, prevOrders);
            return { ...compiledOrders };
        });
        pixiData?.setOrders(_orders);
    }, [getOrderGroupKey, pixiData]);

    // Separate useEffect for trade window - depends on openTradeWindow
    useEffect(() => {
        if (!pixiData) return;
        pixiData.showTradeWindow(openTradeWindow, fullSymbolRef.current);
    }, [openTradeWindow, pixiData]);

    // Separate useEffect for loading orders - only runs on mount and when symbol changes
    useEffect(() => {
        if (!pixiData) return;

        console.log(
            "[useEffect] Checking if orders need to be loaded for symbol:",
            symbol.value,
            "Already loaded:",
            ordersLoadedRef.current,
        );

        // Only load orders once when component mounts or symbol changes
        if (!ordersLoadedRef.current) {
            ordersLoadedRef.current = true;
            getOrders();
        }
    }, [pixiData, symbol.value, getOrders]);

    // Reset orders loaded flag when symbol changes
    useEffect(() => {
        console.log("[useEffect] Symbol changed to:", symbol.value, "- resetting orders loaded flag");
        ordersLoadedRef.current = false;
    }, [symbol.value]);

    useEffect(() => {
        if (!pixiData) return;
        pixiData.setLastTwoDaysCompiled(lastTwoDaysCompiled);
    }, [lastTwoDaysCompiled, pixiData]);

    useEffect(() => {
        const data = currentTimeBar;
        // if (!data || !ohlcDatas.length || !pixiData) return;
        if (!data || !pixiData || !ohlcDatas?.length) return;
        data.timestamp = data.datetime = data.datetime * 1000;

        if (data.askVolume?.high || data.bidVolume?.high) {
            console.warn("Encountered aggregated volume bucket on real-time update", data);
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
                console.info(`Skipping duplicate load for ${symbol.name}`);
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

        return () => {
            // Socket.off("timeBarUpdate");
        };
    }, [barTypeInput, barTypePeriodInput, symbolInput]);

    useEffect(() => {
        console.log(symbolInput.value);
        setSymbol(symbolInput);

        if (fullSymbols?.length) {
            const fullSymbol = fullSymbols.find((d) => d.baseSymbol === symbolInput.value);
            const nextFullSymbol = fullSymbol?.fullSymbol || null;
            console.log("[PixiChart] fullSymbol lookup", { symbol: symbolInput.value, nextFullSymbol, previous: fullSymbolRef.current });
            if (fullSymbolRef.current !== nextFullSymbol) {
                fullSymbolRef.current = nextFullSymbol;
            }

            setFullSymbolValue((prev) => {
                if (prev === nextFullSymbol) {
                    console.log("[PixiChart] fullSymbolValue unchanged", { prev, nextFullSymbol });
                    return prev;
                }
                console.log("[PixiChart] fullSymbolValue updating", { prev, nextFullSymbol });
                return nextFullSymbol;
            });
        }
    }, [symbolInput.value, fullSymbols]);

    // useEffect(() => {
    //     const baseSymbol = fullSymbols.find((d) => d.baseSymbol === symbolInput.value);
    //     fullSymbolRef.current = baseSymbol;
    // }, [fullSymbols]);

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
            { passive: false },
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
        registerOrderFlowSound();
        Socket.on("orderFlowCue", handleOrderFlowSound);

        return () => {
            Socket.off("orderFlowCue", handleOrderFlowSound);
        };
    }, [Socket, handleOrderFlowSound, registerOrderFlowSound, symbolInput.value]);

    useEffect(() => {
        if (orderFlowSoundSettings.depthFlowEnabled) {
            subscribeDepthFlowSound();
        } else {
            unsubscribeDepthFlowSound();
        }

        Socket.on("depthFlowCue", handleDepthFlowSound);

        return () => {
            Socket.off("depthFlowCue", handleDepthFlowSound);
            unsubscribeDepthFlowSound();
        };
    }, [
        Socket,
        handleDepthFlowSound,
        orderFlowSoundSettings.depthFlowEnabled,
        subscribeDepthFlowSound,
        symbolInput.value,
        unsubscribeDepthFlowSound,
    ]);

    useEffect(() => {
        Socket.on("ordersShown", (data) => {
            setOrders((prevOrders) => {
                const nextOrders = { ...prevOrders };
                Object.keys(data).forEach((basketId) => {
                    const order = data[basketId];
                    const groupKey = getOrderGroupKey(order);
                    if (!groupKey) return;
                    nextOrders[groupKey] = [...(nextOrders[groupKey] || []), order];
                    pixiData?.addOrder([order]);
                });
                return nextOrders;
            });
        });
        return () => {
            Socket.off("ordersShown");
        };
    }, [getOrderGroupKey, pixiData]);

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
        const handleLastTrade = onLastTrade({ setLastTrade, setOhlcDatas, pixiData, lastTradesRef });
        Socket.on("lastTrade", handleLastTrade);
        // Socket.on("lastTickBar", onLastTrade({ setLastTrade, setOhlcDatas, pixiData, tickBar: true }));

        const liquidityEventName = `liquidity-${pixiData.symbol.value}`;
        const handleLiquidity = (data) => {
            if (data.symbol !== pixiData.symbol.value) return;

            pixiData.setLiquidityData(data);
        };
        Socket.on(liquidityEventName, handleLiquidity);
        ////////////////////////////////////////////////////
        return () => {
            Socket.off("lastTrade", handleLastTrade);
            // Socket.off("lastTickBar");
            Socket.off(liquidityEventName, handleLiquidity);
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
                const fullSymbol = d.find((d) => d.baseSymbol === symbolInput.value);
                if (fullSymbol?.fullSymbol) {
                    fullSymbolRef.current = fullSymbol.fullSymbol;
                }
            })
            .catch((e) => {
                console.error(e);
                // alert("Missing full symbols");
            });
    }, []);

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

        [plantStatus],
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
        [barType, barTypePeriod],
    );
    const SymbolBtnsMemo = useMemo(
        () => <SymbolBtns symbolOptions={symbolOptions} symbol={symbolInput} setSymbol={setSymbolInput} />,
        [symbolInput],
    );

    const ordersForTickChart = useMemo(() => {
        const filteredOrders = Object.entries(orders).reduce((acc, [groupKey, orderEvents]) => {
            if (!Array.isArray(orderEvents) || !orderEvents.length) return acc;

            const matchesSymbol = orderEvents.some((orderEvent) => {
                const eventSymbol = orderEvent?.symbol || orderEvent?.fullSymbol;
                return eventSymbol && eventSymbol === fullSymbolValue;
            });

            if (!matchesSymbol) return acc;
            acc[groupKey] = orderEvents;
            return acc;
        }, {});

        return Object.keys(filteredOrders).length ? filteredOrders : EMPTY_ORDERS;
    }, [orders, fullSymbolValue]);

    const BetterTickChartMemo = useMemo(() => {
        console.log("[PixiChart] Rendering BetterTickChart memo", {
            symbol: symbol.value,
            fullSymbol: fullSymbolValue,
            exchange: symbolInput.exchange,
        });
        return (
            <BetterTickChart
                height={400}
                symbol={symbol.value}
                fullSymbol={fullSymbolValue}
                exchange={symbolInput.exchange}
                timeframe="tick"
                Socket={Socket}
                orders={ordersForTickChart}
            />
        );
    }, [Socket, symbol.value, fullSymbolValue, symbolInput.exchange, ordersForTickChart]);

    const EmbeddedBacktestChartMemo = useMemo(() => {
        if (!embeddedBacktestData?.bars?.length) {
            return <div style={{ padding: "12px", color: "#777" }}>Loading backtest chart...</div>;
        }

        return (
            <BackTestChartGeneric
                height={400}
                width={1200}
                data={embeddedBacktestData}
                Socket={Socket}
                symbol={symbol.value}
                timeframe="30m"
            />
        );
    }, [embeddedBacktestData, Socket, symbol.value]);

    const mainChartProps = useMemo(
        () => ({
            // candleData: candleData.spy1MinData,
            height: 400,
            // width: 600,
            // spyLevelOne,
            Socket,
            symbol: symbol.value,
            orders, // Pass orders to PixiChartV2
            fullSymbol: fullSymbolValue,
            // getCurrentStrikeData,
            // callsOrPuts,
            // callsData,
            // putsData,
            // underlyingData,
            // lvl2Data,
            withTimeFrameBtns: true,
            withSymbolBtns: false,
        }),
        [Socket, symbol.value, orders, fullSymbolValue],
    );

    const symbolData = useMemo(() => fullSymbols.find((s) => s.baseSymbol === symbolInput.value), [fullSymbols, symbolInput.value]);
    const tradeWindowLastTrade = useMemo(
        () => ({
            tradePrice: Number(lastTrade?.tradePrice) || 0,
            ...lastTrade,
        }),
        [lastTrade],
    );

    const marketOverviewPanel = (
        <div className="panel-fill">
            <div className="">
                <div className="panel-section-header">Market Overview</div>
                <MarketOverview Socket={Socket} lastTradesRef={lastTradesRef} fullSymbols={fullSymbols} />
            </div>
        </div>
    );

    const tradeEntryPanel = (
        <div className="panel-fill">
            <div className="panel-section utility-panel-section">
                <div className="panel-section-header">Trade Entry</div>
                {symbolData ? (
                    <TradeControls symbolData={symbolData} symbol={symbolInput} lastTrade={tradeWindowLastTrade} />
                ) : (
                    <div style={{ color: "#666", fontSize: "12px", padding: "8px" }}>Waiting for symbol metadata...</div>
                )}
            </div>
        </div>
    );

    const positionsPanel = (
        <div className="panel-fill">
            <div className="panel-section utility-panel-section orders-panel-section">
                <div className="panel-section-header">Orders & Positions</div>
                <div>{OrdersListMemo}</div>
            </div>
        </div>
    );

    const rightUtilityPanel = (
        <div className="">
            <PanelGroup direction="vertical" autoSaveId="pixi-right-utility-v-v1">
                <Panel defaultSize={46} minSize={24} collapsible={true}>
                    {marketOverviewPanel}
                </Panel>
            </PanelGroup>
            <PanelResizeHandle className="resize-handle-h" />

            <PanelGroup direction="horizontal" autoSaveId="pixi-right-utility-h-v1">
                <Panel defaultSize={54} minSize={24} collapsible={true}>
                    <PanelGroup direction="horizontal" autoSaveId="pixi-right-utility-h-v1">
                        <Panel defaultSize={42} minSize={28} collapsible={true}>
                            {tradeEntryPanel}
                        </Panel>
                        <PanelResizeHandle className="resize-handle-v" />
                        <Panel defaultSize={58} minSize={32} collapsible={true}>
                            {positionsPanel}
                        </Panel>
                    </PanelGroup>
                </Panel>
            </PanelGroup>
        </div>
    );

    const orderFlowSoundPanel = showOrderFlowSoundPanel ? (
        <div
            style={{
                position: "fixed",
                top: `${orderFlowSoundPanelPosition.top}px`,
                right: `${orderFlowSoundPanelPosition.right}px`,
                width: "220px",
                padding: "12px",
                borderRadius: "8px",
                background: "#0f172a",
                border: "1px solid #334155",
                boxShadow: "0 10px 24px rgba(0, 0, 0, 0.35)",
                zIndex: 20,
            }}
        >
            <div style={{ color: "#e2e8f0", fontSize: "12px", fontWeight: 700, marginBottom: "10px" }}>Order Flow Sound</div>
            {!orderFlowAudioUnlocked ? (
                <div
                    style={{
                        marginBottom: "12px",
                        padding: "9px 10px",
                        borderRadius: "6px",
                        background: "#1e293b",
                        border: "1px solid #475569",
                    }}
                >
                    <div style={{ color: "#e2e8f0", fontSize: "11px", fontWeight: 600, marginBottom: "6px" }}>Audio locked</div>
                    <div style={{ color: "#cbd5e1", fontSize: "11px", lineHeight: 1.35, marginBottom: "8px" }}>
                        Mobile browsers require a tap before Web Audio can start.
                    </div>
                    <button
                        type="button"
                        onClick={unlockOrderFlowSound}
                        style={{
                            width: "100%",
                            padding: "7px 0",
                            borderRadius: "6px",
                            border: "1px solid #60a5fa",
                            background: "#1d4ed8",
                            color: "#eff6ff",
                            fontSize: "12px",
                            cursor: "pointer",
                        }}
                    >
                        Enable Audio
                    </button>
                </div>
            ) : null}
            <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#cbd5e1", fontSize: "12px", marginBottom: "12px" }}>
                <input
                    type="checkbox"
                    checked={orderFlowSoundSettings.enabled}
                    onChange={(event) => {
                        unlockOrderFlowSound();
                        setOrderFlowSoundSettings((prev) => ({
                            ...prev,
                            enabled: event.target.checked,
                        }));
                    }}
                />
                Sound enabled
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#cbd5e1", fontSize: "12px", marginBottom: "12px" }}>
                <input
                    type="checkbox"
                    checked={orderFlowSoundSettings.depthFlowEnabled}
                    onChange={(event) => {
                        unlockOrderFlowSound();
                        setOrderFlowSoundSettings((prev) => ({
                            ...prev,
                            depthFlowEnabled: event.target.checked,
                        }));
                    }}
                />
                Depth flow enabled
            </label>
            <div style={{ color: "#94a3b8", fontSize: "11px", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Minimum strength
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
                {[1, 2, 3].map((strengthLevel) => (
                    <button
                        key={strengthLevel}
                        type="button"
                        onClick={() => {
                            unlockOrderFlowSound();
                            setOrderFlowSoundSettings((prev) => ({
                                ...prev,
                                minStrength: strengthLevel,
                            }));
                        }}
                        style={{
                            flex: 1,
                            padding: "6px 0",
                            borderRadius: "6px",
                            border:
                                orderFlowSoundSettings.minStrength === strengthLevel
                                    ? "1px solid #60a5fa"
                                    : "1px solid #475569",
                            background: orderFlowSoundSettings.minStrength === strengthLevel ? "#1d4ed8" : "#1e293b",
                            color: "#e2e8f0",
                            fontSize: "12px",
                            cursor: "pointer",
                        }}
                    >
                        {strengthLevel}
                    </button>
                ))}
            </div>
            <button
                type="button"
                onClick={() => {
                    unlockOrderFlowSound();
                    testOrderFlowSound();
                }}
                style={{
                    width: "100%",
                    marginTop: "12px",
                    padding: "7px 0",
                    borderRadius: "6px",
                    border: "1px solid #475569",
                    background: "#1e293b",
                    color: "#e2e8f0",
                    fontSize: "12px",
                    cursor: "pointer",
                }}
            >
                Test Sound
            </button>
            <div style={{ color: "#94a3b8", fontSize: "11px", marginTop: "12px", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Cue Tests
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "6px" }}>
                {(() => {
                    const cueType = "pace_down";
                    const palette = getCueButtonPalette(cueType, Boolean(activeOrderFlowCueTypes[cueType]));
                    return (
                        <button
                            key={cueType}
                            type="button"
                            onClick={() => testOrderFlowCue(cueType)}
                            style={{
                                minWidth: "96px",
                                padding: "7px 10px",
                                borderRadius: "6px",
                                border: palette.border,
                                background: palette.background,
                                color: palette.color,
                                fontSize: "11px",
                                lineHeight: 1.2,
                                cursor: "pointer",
                                textTransform: "none",
                                boxShadow: palette.boxShadow,
                                transition: "background 120ms ease, box-shadow 120ms ease, border-color 120ms ease",
                            }}
                        >
                            {getCueButtonLabel(cueType)}
                        </button>
                    );
                })()}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                {ORDER_FLOW_CUE_TYPES.map((cueType) => {
                    const palette = getCueButtonPalette(cueType, Boolean(activeOrderFlowCueTypes[cueType]));
                    return (
                        <button
                            key={cueType}
                            type="button"
                            onClick={() => testOrderFlowCue(cueType)}
                            style={{
                                padding: "7px 6px",
                                borderRadius: "6px",
                                border: palette.border,
                                background: palette.background,
                                color: palette.color,
                                fontSize: "11px",
                                lineHeight: 1.2,
                                cursor: "pointer",
                                textTransform: "none",
                                boxShadow: palette.boxShadow,
                                transition: "background 120ms ease, box-shadow 120ms ease, border-color 120ms ease",
                            }}
                        >
                            {getCueButtonLabel(cueType)}
                        </button>
                    );
                })}
            </div>
            <div style={{ color: "#94a3b8", fontSize: "11px", marginTop: "12px", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Depth Cue Tests
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                {DEPTH_FLOW_TEST_TYPES.map((cueType) => {
                    const palette = getCueButtonPalette(cueType, Boolean(activeDepthFlowCueTypes[cueType]));
                    return (
                        <button
                            key={cueType}
                            type="button"
                            onClick={() => testDepthFlowCue(cueType)}
                            style={{
                                padding: "7px 6px",
                                borderRadius: "6px",
                                border: palette.border,
                                background: palette.background,
                                color: palette.color,
                                fontSize: "11px",
                                lineHeight: 1.2,
                                cursor: "pointer",
                                textTransform: "none",
                                boxShadow: palette.boxShadow,
                                transition: "background 120ms ease, box-shadow 120ms ease, border-color 120ms ease",
                            }}
                        >
                            {getCueButtonLabel(cueType)}
                        </button>
                    );
                })}
            </div>
        </div>
    ) : null;

    const orderFlowSoundControl = (
        <div>
            <button
                ref={orderFlowSoundButtonRef}
                type="button"
                className="breadth-toggle-btn"
                onClick={() => {
                    unlockOrderFlowSound();
                    if (!showOrderFlowSoundPanel) {
                        updateOrderFlowSoundPanelPosition();
                    }
                    setShowOrderFlowSoundPanel((prev) => !prev);
                }}
                style={{
                    minWidth: "76px",
                    opacity: orderFlowSoundSettings.enabled ? 1 : 0.7,
                    borderColor: orderFlowAudioUnlocked ? undefined : "#f59e0b",
                }}
            >
                Sound {orderFlowSoundSettings.enabled ? `S${orderFlowSoundSettings.minStrength}+` : "Off"}{orderFlowAudioUnlocked ? "" : " Tap"}
            </button>
            {orderFlowSoundPanel}
        </div>
    );

    useEffect(() => {
        let cancelled = false;

        async function loadEmbeddedBacktestData() {
            setEmbeddedBacktestData(null);
            try {
                const data = await API.getBacktestData(symbol.value);
                if (!cancelled) {
                    setEmbeddedBacktestData(data);
                }
            } catch (error) {
                console.error("[PixiChart] Failed to load embedded backtest data", error);
                if (!cancelled) {
                    setEmbeddedBacktestData({ bars: [] });
                }
            }
        }

        loadEmbeddedBacktestData();

        return () => {
            cancelled = true;
        };
    }, [symbol.value]);

    return (
        <div className="trading-platform">
            {/* ===== ACCOUNT BAR ===== */}
            <div style={{ flexShrink: 0, borderBottom: "1px solid #444" }}>
                <AccountInfoTable Socket={Socket} />
            </div>

            {/* ===== MAIN CONTENT (outer vertical: content | bottom) ===== */}
            <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <div className="tab-bar">
                        <button className={`tab-btn ${activeTab === "futures" ? "active" : ""}`} onClick={() => setActiveTab("futures")}>
                            Futures
                        </button>
                        <button className={`tab-btn ${activeTab === "options" ? "active" : ""}`} onClick={() => setActiveTab("options")}>
                            SPY Options
                        </button>
                        <button className={`tab-btn ${activeTab === "breadth" ? "active" : ""}`} onClick={() => setActiveTab("breadth")}>
                            Market Breadth
                        </button>
                        <button className={`tab-btn ${activeTab === "tick" ? "active" : ""}`} onClick={() => setActiveTab("tick")}>
                            Tick
                        </button>
                    </div>
                    <div style={{ flex: 1, overflow: "hidden" }}>
                        {activeTab === "futures" ? (
                            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                                <div className="platform-toolbar">
                                    <div className="toolbar-group plant-status-toolbar">{PlantStatusesMemo}</div>
                                    <div className="toolbar-divider" />
                                    <div className="toolbar-group">{SymbolBtnsMemo}</div>
                                    <div className="toolbar-group">
                                        <Select value={symbolInput} setValue={setSymbolInput} options={symbolOptions} />
                                    </div>
                                    <div className="toolbar-divider" />
                                    <div className="toolbar-group">{TimeFrameBtnsMemo}</div>
                                    <div className="toolbar-divider" />
                                    <div className="toolbar-group">
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
                                    <div className="toolbar-divider" />
                                    <div className="toolbar-group">
                                        <button
                                            type="button"
                                            className="breadth-toggle-btn"
                                            onClick={() => setShowCompactBreadth((prev) => !prev)}
                                        >
                                            {showCompactBreadth ? "Hide Breadth" : "Show Breadth"}
                                        </button>
                                    </div>
                                    <div className="toolbar-divider" />
                                    <div className="toolbar-group">{orderFlowSoundControl}</div>
                                </div>
                                {showCompactBreadth && (
                                    <div style={{ flexShrink: 0, borderBottom: "1px solid #1f2937" }}>
                                        <MarketBreadth Socket={Socket} compact={true} />
                                    </div>
                                )}
                                <div style={{ flex: 1, overflow: "hidden" }}>
                                    <PanelGroup direction="horizontal" autoSaveId="pixi-futures-h-v4">
                                        <Panel defaultSize={70} minSize={35}>
                                            <PanelGroup direction="vertical" autoSaveId="pixi-charts-v-v4">
                                                <Panel defaultSize={50} minSize={10} collapsible={true}>
                                                    <div className="chart-panel">
                                                        <PixiChartV2 {...mainChartProps} />
                                                    </div>
                                                </Panel>
                                                <PanelResizeHandle className="resize-handle-v" />
                                                <Panel defaultSize={38} minSize={10} collapsible={true}>
                                                    <div className="chart-panel">{EmbeddedBacktestChartMemo}</div>
                                                </Panel>
                                            </PanelGroup>
                                        </Panel>
                                        <PanelResizeHandle className="resize-handle-v" />
                                        <Panel defaultSize={30} minSize={22} collapsible={true}>
                                            {rightUtilityPanel}
                                        </Panel>
                                    </PanelGroup>
                                </div>
                            </div>
                        ) : activeTab === "tick" ? (
                            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                                <div className="platform-toolbar">
                                    <div className="toolbar-group plant-status-toolbar">{PlantStatusesMemo}</div>
                                    <div className="toolbar-divider" />
                                    <div className="toolbar-group">{SymbolBtnsMemo}</div>
                                    <div className="toolbar-group">
                                        <Select value={symbolInput} setValue={setSymbolInput} options={symbolOptions} />
                                    </div>
                                    <div className="toolbar-divider" />
                                    <div className="toolbar-group">{orderFlowSoundControl}</div>
                                </div>
                                <div style={{ flex: 1, overflow: "hidden" }}>
                                    <PanelGroup direction="horizontal" autoSaveId="pixi-tick-h-v2">
                                        <Panel defaultSize={70} minSize={35}>
                                            <div className="chart-panel">{BetterTickChartMemo}</div>
                                        </Panel>
                                        <PanelResizeHandle className="resize-handle-v" />
                                        <Panel defaultSize={30} minSize={22} collapsible={true}>
                                            {rightUtilityPanel}
                                        </Panel>
                                    </PanelGroup>
                                </div>
                            </div>
                        ) : activeTab === "options" ? (
                            <div style={{ height: "100%", overflowY: "auto" }}>
                                <SpyOptions Socket={Socket} />
                            </div>
                        ) : (
                            <div style={{ height: "100%", overflowY: "auto" }}>
                                <MarketBreadth Socket={Socket} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* V1 Chart - hidden but kept for data handler compatibility */}
            <div ref={PixiChartRef} style={{ display: "none" }} />
        </div>
    );
}
