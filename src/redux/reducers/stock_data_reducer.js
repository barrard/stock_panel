// import * as meta_actions from "../actions/meta_actions.js";

const initial_state = {
  has_symbols_data: false,
  stock_symbols_data: [],
  commodity_symbols_data: [],
  charts: {},
  search_symbol: "",
  sector_data: {},
  movers: {},
  commodity_data: {},
  rawCommodityCharts: {},
  commodityRegressionData: {},
  stockRegressionData: {},
  currentTickData: {},
  currentStockTickData:{},
  newestMinuteData: {},
  commodityPriceLevelSettings: {},
  commodityTrades: {}
};

export default (state = initial_state, action) => {
  switch (action.type) {
    case "ADD_COMMODITY_TRADE": {
      let { trade, symbol } = action;
      let commodityTrades = { ...state.commodityTrades };
      
      if (!commodityTrades[symbol]) {
        commodityTrades[symbol] = [];
      }
      console.log(commodityTrades[symbol].length)
      console.log({trade})
      commodityTrades[symbol] = [trade, ...commodityTrades[symbol]];
      console.log(commodityTrades[symbol].length)
      return {
        ...state,
        commodityTrades
      };
    }
    case "UPDATE_COMMODITY_TRADE": {
      let { trade } = action;
      let {symbol} = trade
      let commodityTrades = { ...state.commodityTrades };
      console.log({trade})
      console.log(!commodityTrades[symbol])
      console.log(commodityTrades[symbol])

      if(!commodityTrades[symbol] || !commodityTrades[symbol].length){
        commodityTrades[symbol] = [trade]
      }else{
        let commodityTradeIndex = commodityTrades[symbol].findIndex(t=>t._id === trade._id)
      if(commodityTradeIndex < 0 ) {
        console.error('WE HAVE A PROBLEM')
      }else{

        commodityTrades[symbol][commodityTradeIndex] = trade
        console.log(commodityTrades[symbol])
      }
      }

      
      return {
        ...state,
        commodityTrades
      };
    }
    case "ADD_ALL_COMMODITY_TRADES": {
      let { trades, symbol } = action;
      let commodityTrades = { ...state.commodityTrades };

      commodityTrades[symbol] = [...trades];
      console.log(commodityTrades)
      return {
        ...state,
        commodityTrades
      };
    }
    case "REMOVE_COMMODITY_REGRESSION_DATA": {
      console.log(action);
      let { id } = action;
      let symbol = state.search_symbol;
      console.log(state);
      let commodityRegressionData = {
        ...state.commodityRegressionData
      };
      console.log(commodityRegressionData);
      commodityRegressionData[symbol] = commodityRegressionData[symbol].filter(
        d => d._id != id
      );
      console.log(commodityRegressionData);
      commodityRegressionData = {
        ...state.commodityRegressionData,
        ...commodityRegressionData
      };
      return {
        ...state,
        commodityRegressionData
      };
    }

    case "ADD_COMMODITY_CHART_DATA": {
      console.log(action);
      let { chart_data, symbol, timeframe, rawCommodityChartData } = action;
      console.log({ rawCommodityChartData, chart_data });
      let commodity_data = {
        ...state.commodity_data
      };
      if (!commodity_data[symbol]) commodity_data[symbol] = {};

      commodity_data[symbol][timeframe] = chart_data;

      let rawCommodityCharts = {
        ...state.rawCommodityCharts
      };

      if (!rawCommodityCharts[symbol]) rawCommodityCharts[symbol] = {};
      rawCommodityCharts[symbol][timeframe] = rawCommodityChartData;

      return {
        ...state,
        commodity_data,
        rawCommodityCharts
      };
    }
    case "ADD_NEW_MINUTE": {
      
      let { new_minute_data } = action;
      console.log({ new_minute_data });
      // console.log({ state });
      // console.log(new_minute_data["ES"].prices);
      let commodity_data = { ...state.commodity_data };

      for (let symbol in state.commodity_data) {
        new_minute_data[symbol].timestamp = new Date(
          new_minute_data[symbol].start_timestamp
        ).getTime();
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
        ...commodity_data
      };
    }

    case "ADD_NEW_TICK": {
      let { new_tick_data } = action;
      let currentTickData = { ...state.currentTickData };
      for (let symbol in state.commodity_data) { 
        if (!currentTickData[symbol]) currentTickData[symbol] = {};
        currentTickData[symbol] = new_tick_data[symbol];
        currentTickData[symbol].timestamp = new Date(
          currentTickData[symbol].start_timestamp
        ).getTime();
      }
      return {
        ...state,
        currentTickData
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
        currentStockTickData
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
      commodityRegressionData.forEach((setting)=>{
        let {timeframe} = setting
       currentData[symbol][timeframe] = setting;
      })
      
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
      let index = currentData[symbol].findIndex(
        d => d._id === stockRegressionData[0]._id
      );
      console.log(index);
      if (index !== -1) return state;
      currentData[symbol] = [...currentData[symbol], ...stockRegressionData];

      return { ...state, stockRegressionData: { ...currentData } };
    }

    case "SET_MOVERS": {
      let { movers } = action;
      return { ...state, movers };
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
            ...stock_data_with_MA
          }
        }
      };
    }
    case "SET_SECTOR_DATA": {
      const { sector, data } = action;
      const sector_data = { ...state.sector_data, ...{ [sector]: data } };
      return {
        ...state,
        sector_data: sector_data
      };
    }

    case "SET_SEARCH_SYMBOL": {
      // console.log(action)
      return {
        ...state,
        search_symbol: action.search_symbol.toUpperCase()
      };
    }

    case "ADD_CHART_DATA": {
      let { chartData, timeframe, symbol } = action;
      let charts = {
        ...state.charts
      };
      if (!charts[symbol]) charts[symbol] = {};
      charts[symbol][timeframe] = chartData;

      return {
        ...state,
        charts,
      };
    }

    case "SET_SYMBOLS_DATA": {
      // console.log({action})
      let { stock_symbols_data, commodity_symbols_data } = action;
      // console.log(stock_symbols_data)
      commodity_symbols_data = formatCommoditySymbolsData(
        commodity_symbols_data
      );
      return {
        ...state,
        stock_symbols_data,
        commodity_symbols_data,
        has_symbols_data: true
      };
    }

    default:
      return state;
  }
};

function formatCommoditySymbolsData(symbols) {
  let formatedSymbolsData = [];
  /*
  CIK: "1090872"
Ticker: "A"
Name: "Agilent Technologies Inc"
Exchange: "NYSE"
SIC: "3825"
Business: "CA"
Incorporated: "DE"
IRS: "770518772"
  */

  for (let symbol in symbols) {
    let Ticker = symbol;
    let Name = symbols[symbol].name;
    let isCommodity = true;
    formatedSymbolsData.push({ Ticker, Name, isCommodity });
  }

  return formatedSymbolsData;
}

function byDate(a, b) {
  if (a.timestamp > b.timestamp) return 1;
  if (a.timestamp < b.timestamp) return -1;
}
