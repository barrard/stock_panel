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

export default {
  getMovers,
  getAllSymbolsData,
  fetchStockData,
  fetchCommodityData,
  fetch_commodity_minutely_data,
  saveRegressionValues,
  getCommodityRegressionValues,
  // getIndicatorValues,
  setTimeframeActive,
  getAllCommodityTrades,
  getAllStockTrades,
  closePosition,
  cancelOrder,
  goLong,
  goShort,
  // getVolProfile,
  fetchOpAlerts,
  fetchOpAlertData,
  isLoggedIn,
  fetchSEC_Filings,
  fetchStockBotTrades,
};

async function fetchStockBotTrades() {
  let trades = await fetch(
    `${process.env.REACT_APP_API_SERVER}/API/stockbot-trades`,
    {
      method: "GET",
    }
  );
  trades = await trades.json();
  return trades;
}

async function handleResponse(res) {
  try {
    let res = await res.json();
    console.log("returning API response");
    if (res.err) throw res.err;
    return res;
  } catch (err) {
    toastr.error("API error", err);
    return false;
  }
}

async function fetchSEC_Filings(symbol) {
  try {
    let fillingsData = await fetch(
      `${process.env.REACT_APP_API_SERVER}/sec-filings/${symbol}`,
      {
        method: "GET",
      }
    );
    fillingsData = await fillingsData.json();
    if (fillingsData.err) throw fillingsData.err;
    return fillingsData;
  } catch (err) {
    toastr.error(`Error loading Fillings for ${symbol}`, err);
  }
}

async function isLoggedIn(dispatch) {
  try {
    let user = await fetch(
      `${process.env.REACT_APP_API_SERVER}/auth/isLoggedIn`,
      {
        method: "GET",
        credentials: "include",
      }
    );
    user = await user.json();
    if (user) {
      dispatch(login_success(user));
    }
  } catch (err) {
    console.log({ err });
  }
}

const API_SERVER = process.env.REACT_APP_STOCK_DATA_URL;
const LOCAL_SERVER = process.env.REACT_APP_LOCAL_DATA;

function handleTradeSuccess(trade) {
  let {
    buyOrSell,
    entryPrice,
    orderStatus,
    order_limit,
    symbol,
    order_type,
  } = trade;
  let toastrOpts = {
    timeOut: 6000,
  };
  toastr.success(
    `${order_type} order to ${buyOrSell} ${symbol} @${
      entryPrice || order_limit
    } has been ${orderStatus}`,
    toastrOpts
  );
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
    toastr.error(
      `Error Going ${direction}, sorry i can't be more helpful ${err}`
    );
  }
}

async function goLong({
  instrumentType,
  symbol,
  position_size,
  order_type,
  order_target_size,
  order_stop_size,
  order_limit,
}) {
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

async function goShort({
  symbol,
  instrumentType,
  position_size,
  order_type,
  order_target_size,
  order_stop_size,
  order_limit,
}) {
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
  let regressionData = await fetch(
    `${LOCAL_SERVER}/API/commodityRegressionSettings/${symbol}`,
    { credentials: "include" }
  );
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

    let regressionData = await fetch(
      `${LOCAL_SERVER}/API/commodityRegressionSettings`,
      { credentials: "include", ...PUT({ id, timeframe }) }
    );
    regressionData = await regressionData.json();
    console.log(regressionData);
    if (regressionData.err) throw regressionData.err;
    console.log(props);
    //use an array becasue thats what the actions is expecting
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
    let regressionData = await fetch(
      `${LOCAL_SERVER}/API/commodityRegressionSettings`,
      {
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
      }
    );
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
  let movers = await fetch(`${API_SERVER}/MOVERS/MOVERS.json`);
  return movers;
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
  let msg = (data, from, symbol) =>
    `${data.length} bars loaded for ${new Date(to).toLocaleString()} ${symbol}`;

  try {
    let data = await fetch(
      `${API_SERVER}/TD_data/candles/${symbol}/${from}/${to}/1Min`
    );
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
  let data = await fetch(
    `${LOCAL_SERVER}/TD_data/candles/${symbol}/${from}/${to}/${timeframe}`
  );
  data = await data.json();
  data = data.sort((a, b) => a.timestamp - b.timestamp);
  // console.log('TOASTR')
  if (data.err)
    toastr.error(`Data Not loaded`, `An error occurred for ${symbol}`);
  else
    toastr.success(`Data loaded`, `${data.length} bars loaded for ${symbol}`);
  return data;
}

async function fetchOpAlerts() {
  let data = await fetch(`${API_SERVER}/options/alerts`);
  data = await data.json();
  if (data.err) throw data.err;

  if (!data.length) return [];
  toastr.success(`Alerts loaded`, `${data.length} loaded`);
  let allAlerts = {};
  data.forEach((d) => {
    let { symbol, putCall, exp, strike, timestamp } = d;
    d.localDateTime = new Date(timestamp).toLocaleString();
    let alertDay = d.localDateTime.split(",")[0];

    if (!allAlerts[alertDay]) allAlerts[alertDay] = {};
    if (!allAlerts[alertDay][symbol]) allAlerts[alertDay][symbol] = {};
    if (!allAlerts[alertDay][symbol][exp])
      allAlerts[alertDay][symbol][exp] = {};
    if (!allAlerts[alertDay][symbol][exp][putCall])
      allAlerts[alertDay][symbol][exp][putCall] = {};
    if (allAlerts[alertDay][symbol][exp][putCall][strike]) {
      let oldAlertTime =
        allAlerts[alertDay][symbol][exp][putCall][strike].timestamp;
      if (oldAlertTime > d.timestamp){
        allAlerts[alertDay][symbol][exp][putCall][strike] = d;
      }
    } else {
      allAlerts[alertDay][symbol][exp][putCall][strike] =  d
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
  let data = await fetch(
    `${API_SERVER}/options/alert/${symbol}/${strike}/${exp}/${putCall}`
  );
  data = await data.json();
  if (data.err) throw data.err;

  if (!data.length) return [];
  toastr.success(`Alerts loaded`, `${data.length} loaded`);
  return data;
}
async function fetchStockData({ timeframe, symbol, end }) {
  let data = await fetch(
    `${API_SERVER}/getStockData/${symbol}/${timeframe}/${end}`
  );
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

function DELETE(body) {
  return {
    method: "DELETE",
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
