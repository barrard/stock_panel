import { createAllVWAP_data, addNewVWAP } from "../../indicators/VWAP.js";
const { makeSuperTrendData } = require("../../indicators/superTrend.js");
const { addBollingerBands, addNewBollingerBands } = require("../../indicators/BollingerBands.js");
const { ATR_indicatorVals } = require("../../indicators/ATR.js");
const { addStochastics } = require("../../indicators/stochastics.js");
const { momentumAnalysis } = require("../../indicators/momentum.js");
const { addRSI } = require("../../indicators/RSI.js");
let { addAllCCI_data } = require("../../indicators/CCI.js");
const initial_state = {
    has_symbols_data: false,
    stock_symbols_data: [],
    commodity_symbols_data: [],
    charts: {},
    search_symbol: "",
    sector_data: {},
    movers: {},
    scan_movers: {},
    commodity_data: {},
    rawCommodityCharts: {},
    commodityRegressionData: {},
    stockRegressionData: {},
    currentTickData: {},
    currentStockTickData: {},
    newestMinuteData: {},
    commodityPriceLevelSettings: {},
    commodityTrades: {},
    stockTrades: {},
    timeframe: "1Min",
};

export default (state = initial_state, action) => {
    switch (action.type) {
        case "NEW_TIMEFRAME": {
            return {
                ...state,
                timeframe: action.timeframe,
            };
        }
        case "ADD_COMMODITY_TRADE": {
            let { trade, symbol } = action;
            let commodityTrades = { ...state.commodityTrades };

            if (!commodityTrades[symbol]) {
                commodityTrades[symbol] = [];
            }
            console.log(commodityTrades[symbol].length);
            console.log({ trade });
            commodityTrades[symbol] = [trade, ...commodityTrades[symbol]];
            console.log(commodityTrades[symbol].length);
            return {
                ...state,
                commodityTrades,
            };
        }
        case "ADD_STOCK_TRADE": {
            let { trade, symbol } = action;
            let stockTrades = { ...state.stockTrades };

            if (!stockTrades[symbol]) {
                stockTrades[symbol] = [];
            }
            console.log(stockTrades[symbol].length);
            console.log({ trade });
            stockTrades[symbol] = [trade, ...stockTrades[symbol]];
            console.log(stockTrades[symbol].length);
            return {
                ...state,
                stockTrades,
            };
        }

        case "UPDATE_COMMODITY_TRADE": {
            let { trade } = action;
            let { symbol } = trade;
            let commodityTrades = { ...state.commodityTrades };
            if (trade.stratName) {
                // console.log(trade);
                // console.log(`stock bot making trades`);

                // console.log("is this new?? or what?");
                if (!commodityTrades[symbol] || !commodityTrades[symbol].length) {
                    // console.log('totally new')
                    commodityTrades[symbol] = [trade];
                } else {
                    let commodityTradeIndex = commodityTrades[symbol].findIndex((t) => t._id === trade._id);
                    if (commodityTradeIndex < 0) {
                        // console.log('yes new trade')
                        commodityTrades[symbol] = [...commodityTrades[symbol], trade];
                    } else {
                        // console.log('no, this is just update to  trade')
                        commodityTrades[symbol][commodityTradeIndex] = trade;
                    }
                }
            } else if (!commodityTrades[symbol] || !commodityTrades[symbol].length) {
                commodityTrades[symbol] = [trade];
            } else {
                let commodityTradeIndex = commodityTrades[symbol].findIndex((t) => t._id === trade._id);
                if (commodityTradeIndex < 0) {
                    console.error("WE HAVE A PROBLEM");
                } else {
                    commodityTrades[symbol][commodityTradeIndex] = trade;
                    // console.log(commodityTrades[symbol]);
                }
            }
            return {
                ...state,
                commodityTrades: { ...commodityTrades },
            };
        }

        case "UPDATE_STOCK_TRADE": {
            let { trade } = action;
            let { symbol } = trade;
            let stockTrades = { ...state.stockTrades };
            if (!stockTrades[symbol] || !stockTrades[symbol].length) {
                stockTrades[symbol] = [trade];
            } else {
                let stockTradeIndex = stockTrades[symbol].findIndex((t) => t._id === trade._id);
                if (stockTradeIndex < 0) {
                    console.error("WE HAVE A PROBLEM");
                } else {
                    stockTrades[symbol][stockTradeIndex] = trade;
                    console.log(stockTrades[symbol]);
                }
            }
            return {
                ...state,
                stockTrades,
            };
        }

        case "ADD_ALL_STOCK_TRADES": {
            let { trades, symbol } = action;
            let stockTrades = { ...state.stockTrades };
            stockTrades[symbol] = [...trades];
            console.log(stockTrades);
            return {
                ...state,
                stockTrades,
            };
        }

        case "ADD_ALL_COMMODITY_TRADES": {
            let { trades, symbol } = action;
            let commodityTrades = { ...state.commodityTrades };

            commodityTrades[symbol] = [...trades];
            console.log(commodityTrades);
            return {
                ...state,
                commodityTrades,
            };
        }

        case "REMOVE_COMMODITY_REGRESSION_DATA": {
            console.log(action);
            let { id } = action;
            let symbol = state.search_symbol;
            console.log(state);
            let commodityRegressionData = {
                ...state.commodityRegressionData,
            };
            console.log(commodityRegressionData);
            commodityRegressionData[symbol] = commodityRegressionData[symbol].filter((d) => d._id !== id);
            console.log(commodityRegressionData);
            commodityRegressionData = {
                ...state.commodityRegressionData,
                ...commodityRegressionData,
            };
            return {
                ...state,
                commodityRegressionData,
            };
        }

        case "ADD_COMMODITY_CHART_DATA": {
            console.log(action);
            let { chart_data, symbol, timeframe, rawCommodityChartData } = action;
            console.log({ rawCommodityChartData, chart_data });
            let commodity_data = {
                ...state.commodity_data,
            };
            let rawCommodityCharts = {
                ...state.rawCommodityCharts,
            };

            if (!commodity_data[symbol]) commodity_data[symbol] = {};
            let currentData = commodity_data[symbol][timeframe] || [];
            //this code prevents requesting and storing duplicate data
            let lastCurrentDay = currentData[0];
            if (lastCurrentDay) {
                let newChartDataIndex = chart_data.findIndex((d) => d.timestamp === lastCurrentDay.timestamp);
                if (newChartDataIndex >= 0) {
                    chart_data = chart_data.slice(0, newChartDataIndex);
                }
            }
            if (!rawCommodityCharts[symbol]) rawCommodityCharts[symbol] = {};
            let currentRawData = rawCommodityCharts[symbol][timeframe] || [];

            //this code prevents requesting and storing duplicate data
            let lastRawCurrentData = currentRawData[0];
            if (lastRawCurrentData) {
                let newRawChartDataIndex = rawCommodityChartData.findIndex((d) => d.timestamp === lastRawCurrentData.timestamp);
                if (newRawChartDataIndex >= 0) {
                    rawCommodityChartData = rawCommodityChartData.slice(0, newRawChartDataIndex);
                }
            }
            rawCommodityChartData = [...rawCommodityChartData, ...currentRawData];

            //run indicator functions here, since it should only run once
            //VWAP
            createAllVWAP_data(rawCommodityChartData);
            //ATR - Must be done before superTrend
            ATR_indicatorVals(rawCommodityChartData);
            //superTrend
            makeSuperTrendData(rawCommodityChartData);
            //bollingerBands
            addBollingerBands(rawCommodityChartData);
            // addStochastics(rawCommodityChartData);
            // momentumAnalysis(rawCommodityChartData);
            // addRSI(rawCommodityChartData);
            // addAllCCI_data(rawCommodityChartData);

            commodity_data[symbol][timeframe] = [...chart_data, ...currentData];
            rawCommodityCharts[symbol][timeframe] = rawCommodityChartData;
            return {
                ...state,
                commodity_data,
                rawCommodityCharts,
            };
        }
        case "ADD_NEW_MINUTE": {
            let { new_minute_data } = action;
            console.log({ new_minute_data });
            // console.log({ state });
            // console.log(new_minute_data["ES"].prices);
            let commodity_data = { ...state.commodity_data };

            for (let symbol in state.commodity_data) {
                new_minute_data[symbol].timestamp = new Date(new_minute_data[symbol].start_timestamp).getTime();
                if (!commodity_data[symbol]["1Min"]) {
                    //This should NEvEr ruN
                    console.log("-----------    This should NEvEr ruN  ============");
                    // commodity_data[symbol] = {};
                    commodity_data[symbol]["1Min"] = [];
                }
                commodity_data[symbol]["1Min"].push(new_minute_data[symbol]);
            }

            return {
                ...state,
                ...commodity_data,
            };
        }

        case "ADD_NEW_TICK": {
            let { new_tick_data } = action;
            let currentTickData = { ...state.currentTickData };
            let { search_symbol, timeframe } = state;
            // for (let symbol in state.commodity_data) {
            //   if (!currentTickData[symbol]) currentTickData[symbol] = {};
            //   currentTickData[symbol] = new_tick_data[symbol];
            //   if(!currentTickData[symbol]){
            //     return state
            //   }
            //   currentTickData[symbol].timestamp = new Date(
            //     currentTickData[symbol].start_timestamp
            //   ).getTime();
            // }
            // let data = state.rawCommodityCharts[search_symbol];
            // if (data && Array.isArray(data[timeframe])) {
            //   let dataSlice = data[timeframe].slice(-2);
            // addNewVWAP(dataSlice);
            // addNewBollingerBands(data[timeframe]);
            // }
            // console.log(state.commodity_data);
            // console.log({ new_tick_data });
            return {
                ...state,
                prevTickDate: currentTickData,
                currentTickData: new_tick_data,
            };
        }

        case "ADD_NEW_STOCK_TICK": {
            let { new_tick_data } = action;
            let currentStockTickData = { ...state.currentStockTickData };
            for (let symbol in new_tick_data) {
                if (!currentStockTickData[symbol]) currentStockTickData[symbol] = {};
                currentStockTickData[symbol] = new_tick_data[symbol];
            }
            return {
                ...state,
                currentStockTickData,
            };
        }

        case "SET_COMMODITY_REGRESSION_DATA": {
            let { commodityRegressionData } = action;
            if (!commodityRegressionData.length) return state;
            console.log(commodityRegressionData[0]);
            let { symbol } = commodityRegressionData[0];
            console.log({ commodityRegressionData, symbol });
            let currentData = { ...state.commodityRegressionData };
            if (!currentData[symbol]) currentData[symbol] = {};
            commodityRegressionData.forEach((setting) => {
                let { timeframe } = setting;
                currentData[symbol][timeframe] = setting;
            });

            return { ...state, commodityRegressionData: { ...currentData } };
        }

        case "SET_STOCK_REGRESSION_DATA": {
            let { stockRegressionData } = action;
            if (!stockRegressionData.length) return state;

            let { symbol } = stockRegressionData[0];
            // console.log(stockRegressionData[0])
            // console.log({stockRegressionData, symbol})
            let currentData = state.stockRegressionData;
            if (!currentData[symbol]) currentData[symbol] = [];
            let index = currentData[symbol].findIndex((d) => d._id === stockRegressionData[0]._id);
            console.log(index);
            if (index !== -1) return state;
            currentData[symbol] = [...currentData[symbol], ...stockRegressionData];

            return { ...state, stockRegressionData: { ...currentData } };
        }

        case "SET_MOVERS": {
            let { movers } = action;
            return { ...state, movers };
        }
        case "SET_SCAN_MOVERS": {
            let { movers } = action;
            return { ...state, scan_movers: movers };
        }
        case "ADD_MA_DATA": {
            let { symbol, MA_data } = action;
            let stock_data = state.charts[symbol];
            let stock_data_with_MA = { ...stock_data, ...MA_data };
            // console.log({stock_data_with_MA})

            return {
                ...state,
                charts: {
                    ...state.charts,
                    [symbol]: {
                        ...state.charts[symbol],
                        ...stock_data_with_MA,
                    },
                },
            };
        }
        case "SET_SECTOR_DATA": {
            const { sector, data } = action;
            const sector_data = { ...state.sector_data, ...{ [sector]: data } };
            return {
                ...state,
                sector_data: sector_data,
            };
        }

        case "SET_SEARCH_SYMBOL": {
            // console.log(action)
            return {
                ...state,
                search_symbol: action.search_symbol.toUpperCase(),
            };
        }

        case "ADD_CHART_DATA": {
            let { chartData, timeframe, symbol, rawChartData } = action;

            let charts = {
                ...state.charts,
            };
            if (!charts[symbol]) charts[symbol] = {};

            let rawCharts = {
                ...state.rawCharts,
            };

            let currentData = charts[symbol][timeframe] || [];
            //this code prevents requesting and storing duplicate data
            let lastCurrentDay = currentData[0];
            if (lastCurrentDay) {
                let newChartDataIndex = chartData.findIndex((d) => d.timestamp === lastCurrentDay.timestamp);
                if (newChartDataIndex >= 0) {
                    chartData = chartData.slice(0, newChartDataIndex);
                }
            }
            if (!rawCharts[symbol]) rawCharts[symbol] = {};
            let currentRawData = rawCharts[symbol][timeframe] || [];

            //this code prevents requesting and storing duplicate data
            let lastRawCurrentData = currentRawData.slice(-1)[0];
            if (lastRawCurrentData) {
                let newRawChartDataIndex = rawChartData.findIndex((d) => d.timestamp === lastRawCurrentData.timestamp);
                if (newRawChartDataIndex >= 0) {
                    rawChartData = rawChartData.slice(0, newRawChartDataIndex);
                }
            }
            rawChartData = [...rawChartData, ...currentRawData];

            //run indicator functions here, since it should only run once
            //VWAP
            createAllVWAP_data(rawChartData);
            //ATR - Must be done before superTrend
            ATR_indicatorVals(rawChartData);
            //superTrend
            makeSuperTrendData(rawChartData);
            //bollingerBands
            addBollingerBands(rawChartData);
            addStochastics(rawChartData);
            momentumAnalysis(rawChartData);
            addRSI(rawChartData);
            addAllCCI_data(rawChartData);

            charts[symbol][timeframe] = [...chartData, ...currentData];
            rawCharts[symbol][timeframe] = rawChartData;

            return {
                ...state,
                charts,
                rawCharts,
            };
        }
        case "ADD_NEW_MINUTE": {
            let { new_minute_data } = action;
            console.log({ new_minute_data });
            // console.log({ state });
            // console.log(new_minute_data["ES"].prices);
            let commodity_data = { ...state.commodity_data };

            for (let symbol in state.commodity_data) {
                new_minute_data[symbol].timestamp = new Date(new_minute_data[symbol].start_timestamp).getTime();
                if (!commodity_data[symbol]["1Min"]) {
                    //This should NEvEr ruN
                    console.log("-----------    This should NEvEr ruN  ============");
                    // commodity_data[symbol] = {};
                    commodity_data[symbol]["1Min"] = [];
                }
                commodity_data[symbol]["1Min"].push(new_minute_data[symbol]);
            }

            return {
                ...state,
                ...commodity_data,
            };
        }

        case "ADD_NEW_TICK": {
            let { new_tick_data } = action;
            let currentTickData = { ...state.currentTickData };
            let { search_symbol, timeframe } = state;
            // for (let symbol in state.commodity_data) {
            //   if (!currentTickData[symbol]) currentTickData[symbol] = {};
            //   currentTickData[symbol] = new_tick_data[symbol];
            //   if(!currentTickData[symbol]){
            //     return state
            //   }
            //   currentTickData[symbol].timestamp = new Date(
            //     currentTickData[symbol].start_timestamp
            //   ).getTime();
            // }
            // let data = state.rawCommodityCharts[search_symbol];
            // if (data && Array.isArray(data[timeframe])) {
            //   let dataSlice = data[timeframe].slice(-2);
            // addNewVWAP(dataSlice);
            // addNewBollingerBands(data[timeframe]);
            // }
            // console.log(state.commodity_data);
            // console.log({ new_tick_data });
            return {
                ...state,
                prevTickDate: currentTickData,
                currentTickData: new_tick_data,
            };
        }

        case "SET_SYMBOLS_DATA": {
            // console.log({action})
            let { stock_symbols_data, commodity_symbols_data } = action;
            // console.log(stock_symbols_data)
            commodity_symbols_data = formatCommoditySymbolsData(commodity_symbols_data);
            return {
                ...state,
                stock_symbols_data,
                commodity_symbols_data,
                has_symbols_data: true,
            };
        }

        default:
            return state;
    }
};

function formatCommoditySymbolsData(symbols) {
    let formatedSymbolsData = [];

    for (let symbol in symbols) {
        let description = symbols[symbol].name;
        let isCommodity = true;
        formatedSymbolsData.push({ symbol, description, isCommodity });
    }

    return formatedSymbolsData;
}

// function byDate(a, b) {
//   if (a.timestamp > b.timestamp) return 1;
//   if (a.timestamp < b.timestamp) return -1;
// }
