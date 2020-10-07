import { toastr } from "react-redux-toastr";
const {
  formatData,
  forwardFill,
} =require("../../indicators/indicatorHelpers/utils.js");

export function set_symbols_data(stock_symbols_data, commodity_symbols_data) {
  // console.log('set_symbols_data')
  // console.log({stock_symbols_data,
  // commodity_symbols_data})
  return {
    type: "SET_SYMBOLS_DATA",
    stock_symbols_data,
    commodity_symbols_data,
  };
}

export function updateStockTrade(trade) {
  console.log(trade);
  return {
    type: "UPDATE_STOCK_TRADE",
    trade,
  };
}

export function updateCommodityTrade(trade, history) {
  let {
    buyOrSell,
    order_type,
    entryPrice,
    exitPrice,
    orderStatus,
    PL,
    symbol,
    instrumentType,
  } = trade;
  const toastrOptions = {
    timeOut: 8000, // by setting to 0 it will prevent the auto close
    // icon: (<myCustomIconOrAvatar />), // You can add any component you want but note that the width and height are 70px ;)
    onToastrClick: () => {
      if (instrumentType === "commodity") {
        history.push(`/commodity/${symbol}`);
      } else if (instrumentType === "stock") {
        history.push(`/chart/${symbol}`);
      }
    },
  };
  let longOrShort = buyOrSell === 'Buy' ? 'Long' : 'Short'
  //updated trade with Market order type is a user closing manually
 if (orderStatus === "Filled") {
    toastr.success(
      `${order_type} ${orderStatus} - ${buyOrSell} ${symbol} @${entryPrice}`,toastrOptions
    );
  }else if (orderStatus === "Closed") {
    toastr.success(
      `${longOrShort} Position in ${symbol} has been ${orderStatus} @${exitPrice}: PnL= ${PL}`,toastrOptions
      );
  }else if (orderStatus === "Canceled") {
    toastr.success(
      `${order_type} to  ${buyOrSell} ${symbol} @${entryPrice} has been ${orderStatus} -`,toastrOptions
    );
  }
  return {
    type: "UPDATE_COMMODITY_TRADE",
    trade,
  };
}

export function addAllStockTrades(trades, symbol) {
  console.log({ trades, symbol });
  return {
    type: "ADD_ALL_STOCK_TRADES",
    trades,
    symbol,
  };
}

export function addAllCommodityTrades(trades, symbol) {
  console.log({ trades, symbol });
  return {
    type: "ADD_ALL_COMMODITY_TRADES",
    trades,
    symbol,
  };
}

export function addCommodityTrade(trade, symbol) {
  console.log(trade);
  return {
    type: "ADD_COMMODITY_TRADE",
    trade,
    symbol,
  };
}

export function addStockTrade(trade, symbol) {
  console.log(trade);
  return {
    type: "ADD_STOCK_TRADE",
    trade,
    symbol,
  };
}

export function commodityRegressionData(commodityRegressionData) {
  return {
    type: "SET_COMMODITY_REGRESSION_DATA",
    commodityRegressionData,
  };
}

export function set_movers(movers) {
  return {
    type: "SET_MOVERS",
    movers,
  };
}

export function set_search_symbol(search_symbol) {
  // console.log(search_symbol)
  return {
    type: "SET_SEARCH_SYMBOL",
    search_symbol,
  };
}




export function add_commodity_minutely_data({ symbol, chart_data }) {
  let rawCommodityChartData = [...chart_data];
  let timeframe = "1Min";
  chart_data = forwardFill(chart_data);

  return {
    type: "ADD_COMMODITY_CHART_DATA",
    chart_data,
    symbol,
    timeframe,
    rawCommodityChartData,
  };
}

/**
 *
 * @param {object} data object of commodity data
 * @param {string} type 'tick' or 'minute'
 */
export function updateCommodityData(newData, type) {
  if (type === "minute") {
    
    return {
      type: "ADD_NEW_MINUTE",
      new_minute_data: newData,
    };
  } else if (type === "tick") {
    return {
      type: "ADD_NEW_TICK",
      new_tick_data: newData,
    };
  }
}

export function add_commodity_chart_data({ symbol, chart_data, timeframe }) {
  console.log("ADD_COMMODITY_CHART_DATA");
  console.log({ chart_data });

  let rawCommodityChartData = [...chart_data];
  console.log({ rawCommodityChartData, chart_data });
  chart_data = forwardFill(chart_data);
  return {
    type: "ADD_COMMODITY_CHART_DATA",
    chart_data,
    symbol,
    timeframe,
    rawCommodityChartData,
  };
}

export function deleteCommodityRegressionData(id) {
  return {
    type: "REMOVE_COMMODITY_REGRESSION_DATA",
    id,
  };
}

export function add_chart_data({ symbol, chartData, timeframe }) {
  console.log("ADD_CHART_DATA");

  let rawChartData = [...chartData];
  chartData = forwardFill(chartData);
  return {
    type: "ADD_CHART_DATA",
    chartData,
    timeframe,rawChartData,
    symbol,
  };
}

export function add_MA_data_action(MA_data, symbol) {
  return {
    type: "ADD_MA_DATA",
    MA_data,
    symbol,
  };
}

export function updateStockData(newData, type) {
  if (type === "minute") {
    return {
      type: "ADD_NEW_STOCK_MINUTE",
      new_minute_data: newData,
    };
  } else if (type === "tick") {
    return {
      type: "ADD_NEW_STOCK_TICK",
      new_tick_data: newData,
    };
  }
}
