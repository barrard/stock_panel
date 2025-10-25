import { toastr } from "react-redux-toastr";
import { csv } from "d3-fetch";
// import { is_loading } from "../redux/actions/meta_actions.js";
import {
    set_symbols_data,
    commodityRegressionData,
    deleteCommodityRegressionData,
    addAllCommodityTrades,
    addAllStockTrades,
    // set_search_symbol,
    // add_chart_data
} from "../redux/actions/stock_actions.js";
import { login_success } from "../redux/actions/user_actions.js";

const API_SERVER = process.env.REACT_APP_STOCK_DATA_URL;
const LOCAL_SERVER = process.env.REACT_APP_LOCAL_DATA;
const REACT_APP_API_SERVER = process.env.REACT_APP_API_SERVER;
const API = {
    getFundamentals,
    getTickers,
    // getIndicatorValues,
    // getVolProfile,
    addPriceData,
    addStrategy,
    cancelOrder,
    closePosition,
    deleteConditional,
    deleteIndicator,
    fetch_commodity_minutely_data,
    fetchCommodityData,
    fetchOpAlertData,
    fetchOpAlerts,
    fetchOpAlertsByDate,
    fetchSEC_Filings,
    fetchStockBotTrades,
    fetchStockData,
    getAllChartPatterns,
    getAllCommodityTrades,
    getAllStockTrades,
    getAllSymbolsData,
    getBackTestData,
    getCommodityRegressionValues,
    getConditionals,
    getIndicatorList,
    getIndicatorResults,
    getTicksFrom,
    getMovers,
    getPriceDatas,
    getStrategies,
    getTheStockData,
    goLong,
    goShort,
    isLoggedIn,
    linkPriceData,
    loadStockDataIndicator,
    saveRegressionValues,
    setTimeframeActive,
    submitConditional,
    submitIndicator,
    updateIndicatorOpts,
    updateLineColor,
    getStockDataForFundamentalsCharts,
    //RAPI STUFF
    rapi_requestBars,
    rapi_requestLiveBars,
    rapi_submitOrder,
    rapi_cancelOrder,
    getFrontMonthSymbols,
    getFromRedis,
    getOrderFlow,
    getLiquidityMetrics,
    getTicks,
    getCustomTicks,
    getBacktestDay,
    getEconEventTypes,
    getEconEventInstances,
    getBacktestData,
    getOrders,
    getPickLists,
    getEnhancedPickLists,
    getFilingAnalysisFull,
    fetchOptionContractData,
    getSchwabAccountDetails,
    fetchMarketBreadth,
    getTopWinnersLosers,
    rapi_requestBarsTimeRange,
};

export default API;

async function getSchwabAccountDetails() {
    return await GET(`/API/account-details`, { withCreds: true });
}

async function fetchOptionContractData({ symbol = "SPY", putCall = "CALL", strike = 590, exp = "2025-06-20" }) {
    return await GET(`/options/contract/${symbol}/${strike}/${exp}/${putCall}`);
}
async function getPickLists() {
    return await GET(`/API/get-pick-lists`);
}

async function getEnhancedPickLists() {
    return await GET(`/API/filing-analysis/enhanced-pick-lists`);
}

async function getTopWinnersLosers({ topN = 10, bottomN = 10 } = {}) {
    return await GET(`/API/filing-analysis/top-winners-losers?topN=${topN}&bottomN=${bottomN}`);
}

async function getFilingAnalysisFull(ticker) {
    return await GET(`/API/filing-analysis/full/${ticker}`);
}

async function fetchMarketBreadth(opts = {}) {
    const { filter = {}, limit = 1000, sort = { _id: -1 } } = opts;

    const query = new URLSearchParams({
        filter: JSON.stringify(filter),
        limit: limit.toString(),
        sort: JSON.stringify(sort),
    });

    const data = await GET(`/API/rapi/marketBreadth?${query.toString()}`);
    return data
        .map((d) => ({ ...d, datetime: new Date(d.createdAt).getTime() }))
        .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
}
async function getOrders(opts = {}) {
    const { symbol, skip, limit = 400, bracketId } = opts;

    let resp = await fetch(`${REACT_APP_API_SERVER}/API/get-orders`, {
        ...POST({
            query: { symbol, bracketId },
            limit,
            skip,
        }),
    });
    resp = await handleResponse(resp);
    return resp;
}

async function getBacktestData(symbol) {
    return await GET(`/API/getBacktestData/${symbol}`);
}

async function getEconEventInstances(eventType) {
    console.log(eventType);
    return await GET(`/API/getEconEventInstances/${eventType.value}`);
}
async function getEconEventTypes() {
    return await GET("/API/getEconEventTypes");
}
async function getBacktestDay({ date, symbol, exchange }) {
    return await GET(`/API/rapi/backtest-day/${symbol}/${exchange}/${date}`);
}

async function getCustomTicks(options = {}) {
    const params = new URLSearchParams();

    if (options.symbol) params.append("symbol", options.symbol);
    if (options.start) params.append("start", options.start);
    if (options.finish) params.append("finish", options.finish);
    if (options.limit !== undefined) params.append("limit", options.limit);
    if (options.join !== undefined) params.append("join", options.join);
    if (options.skip !== undefined) params.append("skip", options.skip);

    const queryString = params.toString();
    const url = `/API/custom-ticks${queryString ? `?${queryString}` : ""}`;

    return await GET(url);
}

async function getTicks() {
    return await GET(`/API/ticks`);
}

async function getOrderFlow({ start, end, symbol = "ES", compiled = false }) {
    return await GET(`/API/getOrderFlow/${start}/${end}/${symbol}/${compiled}`);
}

async function getLiquidityMetrics({ start, end, symbol = "ES", timeframe = "1m" }) {
    return await GET(`/API/getLiquidityMetrics/${start}/${end}/${symbol}/${timeframe}`);
}

async function GET(url, opts = {}) {
    const { withCreds = false } = opts;

    let data = await fetch(`${REACT_APP_API_SERVER}${url}`, {
        method: "GET",
        ...(withCreds ? { credentials: "include" } : {}),
    });
    return await data.json();
}

//TODO this maybe broken
async function getFromRedis({ symbol, exchange, start, finish, type, period }) {
    const data = await GET(`/API/redis/RequestTimeBarReplay/${symbol}/${exchange}/${type}/${period}/${start}/${finish}/`);

    if (!data) return [];
    // data.forEach((d) => (d.datetime = d.datetime * 1000));
    return data;
}

//  ````````   $$$$$$    ````````    RAPI    ``````````    $$$$$$$$$$$$$$
async function getFrontMonthSymbols() {
    return await GET("/API/rapi/get-front-month-symbols");
}
async function rapi_cancelOrder({ basketId }) {
    return await GET(`/API/rapi/cancelOrder/${basketId}`);
}

async function rapi_requestBars({ symbol, exchange, barType, barTypePeriod, startIndex, finishIndex }) {
    return await GET(`/API/rapi/requestBars/${symbol}/${exchange}/${barType}/${barTypePeriod}/${startIndex}/${finishIndex}`);
}

async function rapi_requestBarsTimeRange({ symbol, exchange, timeframe, startDate, numDays }) {
    // startDate should be in format: MM/DD/YYYY
    // timeframe should be like: "1m", "5m", "30m", etc.
    // endpoint format: /API/rapi/rth-bars/ES/CME/1m/03/12/2025?days=3

    if (!symbol || !exchange || !timeframe || !startDate) {
        throw new Error("Missing required parameters: symbol, exchange, timeframe, and startDate are required");
    }

    // Parse the date (expects MM/DD/YYYY format from Date input conversion)
    const [month, day, year] = startDate.split("/");

    // Build URL path
    let url = `/API/rapi/rth-bars/${symbol}/${exchange}/${timeframe}/${month}/${day}/${year}`;

    // Add optional query params
    if (numDays !== undefined) {
        url += `?days=${numDays}`;
    }

    return await GET(url);
}

async function rapi_requestLiveBars({ symbol, timeframe = "30m" }) {
    return await GET(`/API/rapi/requestLiveBars/${symbol}/${timeframe}`);
}

async function rapi_submitOrder(order = {}) {
    try {
        let resp = await fetch(`${REACT_APP_API_SERVER}/API/rapi/submitOrder`, {
            credentials: "include",
            ...POST(order),
        });

        resp = await handleResponse(resp);
        console.log(resp);
        return resp;
    } catch (err) {
        handleError(err);
    }
}

//  ````````   $$$$$$    ````````    RAPI    ``````````    $$$$$$$$$$$$$$

async function getStockDataForFundamentalsCharts(symbol) {
    return await GET(`/API/getStockDataForFundamentalsCharts/${symbol}`);
}

async function getTickers() {
    return await GET("/API/getTickers");
}

async function getTicksFrom({ symbol, from, to }) {
    return await GET(`/TD_data/getTicksFrom/${symbol}/${from}/${to}`);
}
async function getFundamentals() {
    let fundamentals = await fetch(`${REACT_APP_API_SERVER}/API/getRecentFundamentals`, {
        method: "GET",
    });
    fundamentals = await fundamentals.json();
    return fundamentals;
}

async function deleteConditional(item) {
    try {
        let list = await fetch(`${REACT_APP_API_SERVER}/API/deleteConditional/${item._id}`, {
            credentials: "include",
            method: "DELETE",
        });
        list = await handleResponse(list);
        return list;
    } catch (err) {
        handleError(err);
    }
}

async function getConditionals() {
    try {
        let list = await fetch(`${REACT_APP_API_SERVER}/API/getConditionals/`, {
            credentials: "include",
            method: "GET",
        });
        list = await handleResponse(list);
        return list;
    } catch (err) {
        handleError(err);
    }
}

async function submitConditional({ target1, target2, conditionalName, stratId, equality }) {
    try {
        let list = await fetch(`${REACT_APP_API_SERVER}/API/submitConditional`, {
            credentials: "include",
            ...POST({
                equality,
                target1,
                target2,
                conditionalName,
                stratId,
            }),
        });
        list = await handleResponse(list);
        console.log(list);
        return list;
    } catch (err) {
        handleError(err);
    }
}

async function updateLineColor(key, color) {
    try {
        let list = await fetch(`${REACT_APP_API_SERVER}/API/updateLineColor`, {
            credentials: "include",
            ...POST({ key, color }),
        });
        list = await handleResponse(list);
        console.log(list);
        return list;
    } catch (err) {
        handleError(err);
    }
}

async function getAllChartPatterns(inputs) {
    try {
        let list = await fetch(`${REACT_APP_API_SERVER}/API/getAllChartPatterns`, {
            credentials: "include",
            ...POST({ inputs }),
        });
        list = await handleResponse(list);
        console.log(list);
        return list;
    } catch (err) {
        handleError(err);
    }
}

async function getIndicatorResults(ind, inputs) {
    try {
        let list = await fetch(`${REACT_APP_API_SERVER}/API/getIndicatorResults`, {
            credentials: "include",
            ...POST({ indicator: ind, inputs }),
        });
        list = await handleResponse(list);
        // console.log(list);
        return list;
    } catch (err) {
        handleError(err);
    }
}

async function updateIndicatorOpts(ind) {
    try {
        let list = await fetch(`${REACT_APP_API_SERVER}/API/updateIndicatorOpts`, {
            credentials: "include",
            ...POST({ indicator: ind }),
        });
        list = await handleResponse(list);
        return list;
    } catch (err) {
        handleError(err);
    }
}

async function deleteIndicator(ind, strat) {
    try {
        let list = await fetch(`${REACT_APP_API_SERVER}/API/deleteIndicator/${ind._id}/${strat._id}`, {
            credentials: "include",
            method: "GET",
        });
        list = await handleResponse(list);
        return list;
    } catch (err) {
        handleError(err);
    }
}

async function submitIndicator({
    priceDataId,
    selectedInputs,
    selectedStrat,
    indicatorOpts,
    indicatorName,
    options,
    color,
    inputs,
    dataInputs,
    variablePeriods,
}) {
    try {
        console.log({ variablePeriods });
        let list = await fetch(`${REACT_APP_API_SERVER}/API/addIndicator`, {
            credentials: "include",
            ...POST({
                priceDataId,
                selectedInputs,
                selectedStrat,
                indicatorOpts,
                indicatorName,
                options,
                color,
                inputs,
                dataInputs,
                variablePeriods,
            }),
        });
        list = await handleResponse(list);
        return list;
    } catch (err) {
        handleError(err);
    }
}

async function getIndicatorList() {
    try {
        let list = await fetch(`${REACT_APP_API_SERVER}/API/getIndicatorList`, {
            credentials: "include",
            method: "GET",
        });
        list = await handleResponse(list);

        return list;
    } catch (err) {
        if (err.message) {
            toastr.error(err.message);
        }
        handleError(err);
    }
}

async function getBackTestData({ symbol, timeframe, startDate = new Date().getTime(), withTicks = false }) {
    try {
        if (symbol?.startsWith("/")) {
            symbol = symbol.slice(1);
        }
        if (!symbol || !timeframe || !startDate) return;

        let resp = await fetch(`${REACT_APP_API_SERVER}/API/getBackTestData/${symbol}/${timeframe}/${startDate}?withTicks=${withTicks}`, {
            credentials: "include",
            method: "GET",
        });
        resp = await handleResponse(resp);
        //format the symbol data
        resp.forEach((d) => (d.symbol = `/${d.symbol}`));

        return resp;
    } catch (err) {
        handleError(err);
    }
}

async function getTheStockData({ symbol, frame, from = 0, to = 0 }) {
    console.log("getTheStockData");
    try {
        let res = await fetch(`${REACT_APP_API_SERVER}/API/get-stock-data/${symbol}/${frame}/${from}/${to}`, {
            credentials: "include",
            method: "GET",
        });

        res = await handleResponse(res);

        return res;
    } catch (err) {
        handleError(err);
    }
}

async function linkPriceData(stratId, priceDataId) {
    try {
        let strategy = await fetch(`${REACT_APP_API_SERVER}/API/linkPriceData`, {
            credentials: "include",
            ...POST({ stratId, priceDataId }),
        });
        strategy = await handleResponse(strategy);

        return strategy;
    } catch (err) {
        handleError(err);
    }
}

async function addPriceData(symbol, timeframe) {
    try {
        let newPriceData = await fetch(`${REACT_APP_API_SERVER}/API/addPriceData`, {
            credentials: "include",
            ...POST({ symbol, timeframe }),
        });
        newPriceData = await handleResponse(newPriceData);

        return newPriceData;
    } catch (err) {
        handleError(err);
    }
}

async function addStrategy(strat) {
    try {
        let strategy = await fetch(`${REACT_APP_API_SERVER}/API/addStrategy`, {
            credentials: "include",
            ...POST(strat),
        });
        strategy = await handleResponse(strategy);

        return strategy;
    } catch (err) {
        handleError(err);
    }
}

async function getStrategies() {
    try {
        let strategies = await fetch(`${REACT_APP_API_SERVER}/API/getStrategies`, {
            method: "GET",
            credentials: "include",
        });

        strategies = await handleResponse(strategies);
        console.log({ strategies });
        if (Array.isArray(strategies)) {
            return strategies;
        } else return [];
    } catch (err) {
        handleError(err);

        return [];
    }
}

async function getPriceDatas() {
    try {
        let priceDatas = await fetch(`${REACT_APP_API_SERVER}/API/getPriceDatas`, {
            method: "GET",
            credentials: "include",
        });

        priceDatas = await handleResponse(priceDatas);
        if (Array.isArray(priceDatas)) {
            return priceDatas;
        } else return [];
    } catch (err) {
        handleError(err);

        return [];
    }
}

async function loadStockDataIndicator() {
    let trades = await fetch(`${REACT_APP_API_SERVER}/API/loadStockDataIndicator`, {
        method: "GET",
    });
    trades = await trades.json();
    return trades;
}

async function fetchStockBotTrades() {
    let trades = await fetch(`${REACT_APP_API_SERVER}/API/stockbot-trades`, {
        method: "GET",
    });
    trades = await trades.json();
    return trades;
}

function handleError(err) {
    console.log(err.message);
    if (err.message) {
        return toastr.error(err.message);
    }
    handleError(err);
}

async function handleResponse(res) {
    try {
        res = await res.json();
        // console.log("returning API response")
        if (res.err) throw res.err;
        return res;
    } catch (err) {
        console.log(err);
        toastr.error("API error", err.message || err.errmsg);
        return false;
    }
}

async function fetchSEC_Filings(symbol) {
    try {
        let fillingsData = await fetch(`${REACT_APP_API_SERVER}/sec-filings/${symbol}`, {
            method: "GET",
        });
        fillingsData = await fillingsData.json();
        if (fillingsData.err) throw fillingsData.err;
        return fillingsData;
    } catch (err) {
        toastr.error(`Error loading Fillings for ${symbol}`, err);
    }
}

async function isLoggedIn(dispatch) {
    try {
        let user = await fetch(`${REACT_APP_API_SERVER}/auth/isLoggedIn`, {
            method: "GET",
            credentials: "include",
        });
        user = await user.json();
        if (user) {
            dispatch(login_success(user));
        }
    } catch (err) {
        console.log({ err });
    }
}

function handleTradeSuccess(trade) {
    let { buyOrSell, entryPrice, orderStatus, order_limit, symbol, order_type } = trade;
    let toastrOpts = {
        timeOut: 6000,
    };
    toastr.success(`${order_type} order to ${buyOrSell} ${symbol} @${entryPrice || order_limit} has been ${orderStatus}`, toastrOpts);
}
function handleTradeError(direction, err) {
    if (!err) {
        toastr.error(`Error Going ${direction},  not sure why, ${err}`);
    } else if (typeof err === "string") {
        toastr.error(err);
    } else if (err.message) {
        if (err.message.toLowerCase().includes("not admin")) {
            toastr.error("Not allowed...  Not Admin, or not signed in.");
        } else if (err.message.includes("Failed to fetch")) {
            toastr.error("API server error.");
        } else {
            toastr.error(err.message);
        }
    } else {
        toastr.error(`Error Going ${direction}, sorry i can't be more helpful ${err}`);
    }
}

async function goLong({ instrumentType, symbol, position_size, order_type, order_target_size, order_stop_size, order_limit }) {
    try {
        let orderLong = await fetch(`${LOCAL_SERVER}/API/goLong`, {
            ...POST({
                instrumentType,
                symbol,
                position_size,
                order_type,
                order_target_size,
                order_stop_size,
                order_limit,
            }),
            credentials: "include",
        });
        orderLong = await orderLong.json();
        console.log(orderLong);

        if (!orderLong.resp || orderLong.err) {
            return handleTradeError("Long", orderLong.err);
        }

        handleTradeSuccess(orderLong.resp);
        return orderLong.resp;
    } catch (err) {
        handleTradeError("Long", err);
    }
}

async function goShort({ symbol, instrumentType, position_size, order_type, order_target_size, order_stop_size, order_limit }) {
    try {
        let orderShort = await fetch(`${LOCAL_SERVER}/API/goShort`, {
            ...POST({
                symbol,
                instrumentType,
                position_size,
                order_type,
                order_target_size,
                order_stop_size,
                order_limit,
            }),
            credentials: "include",
        });
        orderShort = await orderShort.json();
        console.log(orderShort);
        if (!orderShort.resp || orderShort.err) {
            return handleTradeError("Short", orderShort.err);
        }
        handleTradeSuccess(orderShort.resp);

        return orderShort.resp;
    } catch (err) {
        handleTradeError("Short", err);
    }
}
async function closePosition(id) {
    // console.log('getAllSymbolsData')
    let data = await fetch(`${LOCAL_SERVER}/API/closePosition/${id}`, {
        credentials: "include",
    });
    data = await data.json();
    console.log(data);

    if (!data.resp || data.err) {
        if (data.err.message) {
            toastr.error(data.err.message);
        }
        toastr.error("Error Closing Position");
    }
    return data;
}

async function cancelOrder(id) {
    // console.log('getAllSymbolsData')
    let data = await fetch(`${LOCAL_SERVER}/API/cancelOrder/${id}`, {
        credentials: "include",
    });
    data = await data.json();
    console.log(data);
    if (!data.resp || data.err) toastr.error("Error Closing Position");
    return data;
}

async function getAllCommodityTrades(symbol, props) {
    let trades;

    try {
        console.log({ symbol });
        if (symbol) {
            trades = await fetch(`${LOCAL_SERVER}/API/commodityTrades/${symbol}`, {
                credentials: "include",
            });
        } else {
            trades = await fetch(`${LOCAL_SERVER}/API/commodityTrades`, {
                credentials: "include",
            });
        }
        trades = await trades.json();
        console.log(trades);
        props.dispatch(addAllCommodityTrades(trades, symbol));
    } catch (err) {
        console.log({ err });
        return console.log("ERROR");
    }
}

async function getAllStockTrades(symbol, props) {
    let trades;
    try {
        console.log({ symbol });
        if (symbol) {
            trades = await fetch(`${LOCAL_SERVER}/API/getAllStockTrades/${symbol}`, {
                credentials: "include",
            });
        } else {
            trades = await fetch(`${LOCAL_SERVER}/API/getAllStockTrades`, {
                credentials: "include",
            });
        }
        trades = await trades.json();
        // console.log(trades);
        props.dispatch(addAllStockTrades(trades, symbol));
    } catch (err) {
        console.log({ err });
        return console.log("ERROR");
    }
}

async function getCommodityRegressionValues(symbol, props) {
    // console.log("get regression values");
    // console.log(props);
    if (props.stock_data.commodityRegressionData[symbol]) {
        return console.log("Already have the commodityRegressionData");
    }
    let regressionData = await fetch(`${LOCAL_SERVER}/API/commodityRegressionSettings/${symbol}`, {
        credentials: "include",
    });
    regressionData = await regressionData.json();
    // console.log(regressionData);
    props.dispatch(commodityRegressionData(regressionData));
    return regressionData;
}

async function setTimeframeActive(id, timeframe, props) {
    try {
        // console.log({
        //   id,
        //   timeframe,
        // });

        let regressionData = await fetch(`${LOCAL_SERVER}/API/commodityRegressionSettings`, {
            credentials: "include",
            ...PUT({ id, timeframe }),
        });
        regressionData = await regressionData.json();
        console.log(regressionData);
        if (regressionData.err) throw regressionData.err;
        console.log(props);
        //use an array because thats what the actions is expecting
        props.dispatch(commodityRegressionData([regressionData]));
        let { symbol } = regressionData;
        toastr.success(`Success`, `Settings saved for ${symbol} ${timeframe}!`);
    } catch (err) {
        toastr.error(`Error`, ` ${err}`);
    }

    // if(!regressionLines ||
    //   !regressionLines.highLines||
    //   !regressionLines.lowLines||
    //   !importantPriceLevels)return console.log('there are no importantPriceLevels')
    // /**
    //  * get an array of mx+b m = and b =
    //  */
    // let slopeInts = [];
    // importantPriceLevels.map(p => slopeInts.push({ m: 0, b: p.y }));
    // regressionLines.highLines.map(({ m, b }) => slopeInts.push({ m, b }));
    // regressionLines.lowLines.map(({ m, b }) => slopeInts.push({ m, b }));
    // console.log({ slopeInts });
}

async function saveRegressionValues({
    symbol,
    timeframe,
    minMaxTolerance,
    regressionErrorLimit,
    priceLevelMinMax,
    priceLevelSensitivity,
    fibonacciMinMax,
    fibonacciSensitivity,
    volProfileBins,
    volProfileBarCount,
    props,
}) {
    try {
        let regressionData = await fetch(`${LOCAL_SERVER}/API/commodityRegressionSettings`, {
            credentials: "include",
            ...POST({
                timeframe,
                fibonacciMinMax,
                fibonacciSensitivity,
                symbol,
                minMaxTolerance,
                regressionErrorLimit,
                priceLevelMinMax,
                priceLevelSensitivity,
                volProfileBins,
                volProfileBarCount,
            }),
        });
        regressionData = await regressionData.json();
        if (regressionData.err) throw regressionData.err;
        console.log(regressionData);
        console.log(props);
        //use an array becasue thats what the actions is expecting
        toastr.success("Regression settings saved");

        props.dispatch(commodityRegressionData([regressionData]));
    } catch (err) {
        toastr.error(`Sorry - ${err}`);
    }
}

// async function getIndicatorValues(
//   { indicator, timeframe, symbol, date },
//   props
// ) {
//   if (!indicator || !timeframe || !symbol || !date) throw "Misssing params";
//   let data = await fetch(
//     `${LOCAL_SERVER}/API/indicator/${indicator}/${timeframe}/${symbol}/${date}`
//   );
//   console.log(data);
//   try {

//     data = await data.json();
//   } catch (err) {
//     toastr.err(`Indicator ${indicator} data Not loaded`);
//     return [];

//   }
//   console.log(data);

//   toastr.success(`Indicator ${indicator} data loaded`);
//   // console.log(deletedData);
//   // console.log(props);
//   return data;
//   // props.dispatch(addIndicatorData(id));
// }

async function getMovers() {
    // console.log(API_SERVER);
    try {
        let movers = await fetch(`${API_SERVER}/MOVERS/MOVERS.json`);
        return movers;
    } catch (err) {
        return false;
    }
}

// async function getVolProfile({ symbol, date, bars, bins }) {
//   // console.log(API_SERVER);
//   if (!date) date = new Date().getTime();
//   else date = new Date(date).getTime();
//   let volProfTick = await fetch(
//     `${API_SERVER}/API/VolProfile/${symbol}/${date}/${bars}/${bins}`
//   );
//   volProfTick = await volProfTick.json();
//   return volProfTick;
// }

async function getAllSymbolsData(dispatch) {
    // console.log('getAllSymbolsData')
    let data = await fetch(`${API_SERVER}/API/get_symbols_data`);
    data = await data.json();
    // console.log(data)
    let { all_stock_symbols, all_commodity_symbols } = data;
    // console.log({all_stock_symbols, all_commodity_symbols});
    dispatch(set_symbols_data(all_stock_symbols, all_commodity_symbols));
    return;
}

async function fetch_commodity_minutely_data({ from, to, symbol }) {
    // date = '6-5-2020'
    let msg = (data, from, symbol) => `${data.length} bars loaded for ${new Date(to).toLocaleString()} ${symbol}`;

    try {
        let data = await fetch(`${API_SERVER}/TD_data/candles/${symbol}/${from}/${to}/1Min`);
        data = await data.json();
        //the data is newest to oldest, better fix that
        data = data.sort((a, b) => a.timestamp - b.timestamp);

        console.log({ data, from, symbol });
        // console.log('TOASTR')
        toastr.success(`Data loaded`, msg(data, from, symbol));
        return data;
    } catch (err) {
        console.log(err);
        let data = [];
        toastr.success(`No Data loaded`, msg(data, from, symbol));
        return data;
    }
}

async function fetchCommodityData({ timeframe, symbol, from, to }) {
    console.log(LOCAL_SERVER);
    if (timeframe === "daily") timeframe = "Daily";
    if (timeframe === "weekly") timeframe = "Weekly";
    let data = await fetch(`${LOCAL_SERVER}/TD_data/candles/${symbol}/${from}/${to}/${timeframe}`);
    data = await data.json();
    data = data.sort((a, b) => a.timestamp - b.timestamp);
    // console.log('TOASTR')
    if (data.err) toastr.error(`Data Not loaded`, `An error occurred for ${symbol}`);
    else toastr.success(`Data loaded`, `${data.length} bars loaded for ${symbol}`);
    return data;
}

async function fetchOpAlerts(symbol) {
    let data;
    if (symbol) {
        data = await fetch(`${API_SERVER}/option-contracts/${symbol}`);
    } else {
        data = await fetch(`${API_SERVER}/options/alerts`);
    }
    data = await data.json();
    console.log(data);
    if (data.err) throw data.err;
    let processedAlerts = [];

    if (!data.length) {
        processedAlerts = [];
    } else {
        processedAlerts = sortAlerts(data);
    }
    toastr.success(`Alerts loaded`, `${processedAlerts.length} loaded`);
    return processedAlerts;
}

async function fetchOpAlertsByDate({ month, day, year }) {
    let data;
    data = await fetch(`${API_SERVER}/option-date/${month}/${day}/${year}`);

    data = await data.json();
    console.log(data);
    if (data.err) throw data.err;
    let processedAlerts = [];

    if (!data.length) {
        processedAlerts = [];
    } else {
        processedAlerts = sortAlerts(data);
    }
    toastr.success(`Alerts loaded`, `${processedAlerts.length} loaded`);
    return processedAlerts;
}

//HELPER FOR SORTING ALERTS
function sortAlerts(data) {
    let allAlerts = {};
    data.forEach((d) => {
        let { symbol, putCall, exp, strike, timestamp } = d;
        d.localDateTime = new Date(timestamp).toLocaleString();
        let alertDay = d.localDateTime.split(",")[0];

        if (!allAlerts[alertDay]) allAlerts[alertDay] = {};
        if (!allAlerts[alertDay][symbol]) allAlerts[alertDay][symbol] = {};
        if (!allAlerts[alertDay][symbol][exp]) allAlerts[alertDay][symbol][exp] = {};
        if (!allAlerts[alertDay][symbol][exp][putCall]) allAlerts[alertDay][symbol][exp][putCall] = {};
        if (allAlerts[alertDay][symbol][exp][putCall][strike]) {
            let oldAlertTime = allAlerts[alertDay][symbol][exp][putCall][strike].timestamp;
            if (oldAlertTime > d.timestamp) {
                allAlerts[alertDay][symbol][exp][putCall][strike] = d;
            }
        } else {
            allAlerts[alertDay][symbol][exp][putCall][strike] = d;
        }
    });

    let processedAlerts = [];
    for (let alertDate in allAlerts) {
        // if(!processedAlerts[alertDate])processedAlerts[alertDate]=[]
        for (let symbol in allAlerts[alertDate]) {
            for (let exp in allAlerts[alertDate][symbol]) {
                for (let putCall in allAlerts[alertDate][symbol][exp]) {
                    for (let strike in allAlerts[alertDate][symbol][exp][putCall]) {
                        processedAlerts.push(allAlerts[alertDate][symbol][exp][putCall][strike]);
                    }
                }
            }
        }
    }
    return processedAlerts;
}

async function fetchOpAlertData({ symbol, strike, exp, putCall }) {
    let data = await fetch(`${API_SERVER}/options/alert/${symbol}/${strike}/${exp}/${putCall}`);
    data = await data.json();
    if (data.err) throw data.err;

    if (!data.length) return [];
    toastr.success(`Alerts loaded`, `${data.length} loaded`);
    return data;
}
async function fetchStockData({ timeframe, symbol, end }) {
    let data = await fetch(`${API_SERVER}/getStockData/${symbol}/${timeframe}/${end}`);
    data = await data.json();
    if (data.err) throw data.err;
    console.log(data);

    if (!data.length) return [];
    toastr.success(`Data loaded`, `${data.length} bars loaded for ${symbol}`);
    return data;
}

function POST(body) {
    return {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    };
}

function PUT(body) {
    return {
        method: "PUT",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    };
}

function settleSymbol(symbol) {
    switch (symbol) {
        case "DG": {
            return "GC";
        }

        case "BT": {
            return "BTC";
        }

        case "CL_": {
            return "CL";
        }

        case "A6": {
            return "6A";
        }

        case "B6": {
            return "6B";
        }

        case "C6": {
            return "6C";
        }

        case "E6": {
            return "6E";
        }

        case "J6": {
            return "6J";
        }

        case "M6": {
            return "6M";
        }

        case "N6": {
            return "6N";
        }

        case "S6": {
            return "6S";
        }

        case "NG_": {
            return "NG";
        }

        case "HO_": {
            return "HO";
        }

        case "SV_": {
            return "SI";
        }

        case "RB_": {
            return "RB";
        }

        case "SP_": {
            return "ES";
        }

        case "PA_": {
            return "PA";
        }

        case "PL_": {
            return "PL";
        }

        default:
            return symbol;
    }
}
