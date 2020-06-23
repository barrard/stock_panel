import { toastr } from "react-redux-toastr";
import { csv } from "d3-fetch";
// import { is_loading } from "../redux/actions/meta_actions.js";
import {
  set_symbols_data,
  commodityRegressionData,
  deleteCommodityRegressionData,
  addAllCommodityTrades,
  // set_search_symbol,
  // add_chart_data
} from "../redux/actions/stock_actions.js";
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
  closePosition,
  goLong,
  goShort,
  getVolProfile,
};

const API_SERVER = process.env.REACT_APP_STOCK_DATA_URL;
const LOCAL_SERVER = process.env.REACT_APP_LOCAL_DATA;

function handleTradeError(direction, err) {
  console.log(err);
  console.log(err);
  console.log(err);

  ;
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

async function goLong({ symbol, size }) {
  try {
    let data = await fetch(`${LOCAL_SERVER}/API/goLong/${symbol}/${size}`, {
      credentials: "include",
    });
    data = await data.json();
    console.log(data);
    if (!data.resp || data.err) handleTradeError("Long", data.err);
    toastr.success(`New Long trade in ${symbol} @${data.resp.entryPrice}`)
    return data.resp;
  } catch (err) {
    handleTradeError("Long", err);
  }
}

async function goShort({ symbol, size }) {
  try {
    let data = await fetch(`${LOCAL_SERVER}/API/goShort/${symbol}/${size}`, {
      credentials: "include",
    });
    data = await data.json();
    console.log(data);
    if (!data.resp || data.err) handleTradeError("Short", data.err);
    toastr.success(`New Short trade in ${symbol} @${data.resp.entryPrice}`)
    
    return data.resp;
  } catch (err) {
    handleTradeError("Short", err);
  }
}
async function closePosition(id) {
  // console.log('getAllSymbolsData')
  let data = await fetch(`${LOCAL_SERVER}/API/close-position/${id}`, {
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
      trades = await fetch(`${LOCAL_SERVER}/API/commodityTrades/${symbol}`);
    } else {
      trades = await fetch(`${LOCAL_SERVER}/API/commodityTrades`);
    }
    trades = await trades.json();
    console.log(trades);
    props.dispatch(addAllCommodityTrades(trades, symbol));
  } catch (err) {
    console.log({ err });
    return console.log("ERROR");
  }
}

async function getCommodityRegressionValues(symbol, props) {
  console.log("get regression values");
  console.log(props);
  if (props.stock_data.commodityRegressionData[symbol]) {
    return console.log("Already have the commodityRegressionData");
  }
  let regressionData = await fetch(
    `${LOCAL_SERVER}/API/commodityRegressionSettings/${symbol}`
    // { credentials: "include" }
  );
  regressionData = await regressionData.json();
  // console.log(regressionData);
  props.dispatch(commodityRegressionData(regressionData));
  return regressionData;
}

async function setTimeframeActive(id, timeframe, props) {
  try {
    console.log({
      id,
      timeframe,
    });

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
  console.log(regressionData);
  console.log(props);
  //use an array becasue thats what the actions is expecting
  toastr.success("Regression settings saved");

  props.dispatch(commodityRegressionData([regressionData]));
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

async function getVolProfile({ symbol, date, bars, bins }) {
  // console.log(API_SERVER);
  if (!date) date = new Date().getTime();
  else date = new Date(date).getTime();
  let volProfTick = await fetch(
    `${API_SERVER}/API/VolProfile/${symbol}/${date}/${bars}/${bins}`
  );
  volProfTick = await volProfTick.json();
  return volProfTick;
}

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
console.log();
async function fetch_commodity_minutely_data({ date, symbol }) {
  // date = '6-5-2020'
  let msg = (data, date, symbol) =>
    `${data.length} bars loaded for ${new Date(
      date
    ).toLocaleString()} ${symbol}`;
  console.log(`Fetching data for ${date} ${symbol}`);
  try {
    // symbol = settleSymbol(symbol);
    //TD_data/dailyParsedTickData
    // let API_SERVER = 'https://chartsapi.raveaboutdave.com'
    let data = await fetch(
      `${API_SERVER}/TD_data/dailyParsedTickData/${date}/${symbol}`
    );
    data = await data.json();
    //the data is newest to oldest, better fix that
    data = data.sort((a, b) => a.timestamp - b.timestamp);

    console.log({ data, date, symbol });
    // console.log('TOASTR')
    toastr.success(`Data loaded`, msg(data, date, symbol));
    return data;
  } catch (err) {
    console.log(err);
    // debugger
    let data = [];
    toastr.success(`No Data loaded`, msg(data, date, symbol));
    return data;
  }
}

async function fetchCommodityData({ timeframe, symbol }) {
  console.log(LOCAL_SERVER);
  let data = await fetch(`${LOCAL_SERVER}/back_data/${timeframe}/${symbol}`);
  data = await data.json();
  console.log({ data });
  // console.log('TOASTR')
  if (data.err)
    toastr.error(`Data Not loaded`, `An error occurred for ${symbol}`);
  else
    toastr.success(`Data loaded`, `${data.length} bars loaded for ${symbol}`);
  // debugger
  return data;
}

async function fetchStockData({ timeframe, symbol, end }) {
  let data = await fetch(
    `${API_SERVER}/alpacaData/${symbol}/${timeframe}/${end}`
  );
  data = await data.json();
  // console.log({data})
  // console.log('TOASTR')
  toastr.success(
    `Data loaded`,
    `${data[symbol].length} bars loaded for ${symbol}`
  );
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
