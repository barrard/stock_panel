import { toastr } from "react-redux-toastr";
import { csv } from "d3-fetch";
// import { is_loading } from "../redux/actions/meta_actions.js";
import {
  set_symbols_data,
  commodityRegressionData,
  deleteCommodityRegressionData,
  addAllCommodityTrades
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
  deleteRegressionValues,
  setRegressionSettingsTimeframe,
  getAllCommodityTrades,
  closePosition, goLong, goShort
};

const API_SERVER = process.env.REACT_APP_STOCK_DATA_URL;
const LOCAL_SERVER = process.env.REACT_APP_LOCAL_DATA;



async function goLong(symbol){
  let data = await fetch(`${LOCAL_SERVER}/API/goLong/${symbol}`, { credentials: "include"});
  data = await data.json();
  console.log(data)
  if(!data.resp || data.err)toastr.error('Error Going Long')
  return;
}

async function goShort(symbol){
  let data = await fetch(`${LOCAL_SERVER}/API/goShort/${symbol}`, { credentials: "include"});
  data = await data.json();
  console.log(data)
  if(!data.resp || data.err)toastr.error('Error Going Short')
  return;
}
async function closePosition(id) {
  // console.log('getAllSymbolsData')
  let data = await fetch(`${LOCAL_SERVER}/API/close-position/${id}`, { credentials: "include"});
  data = await data.json();
  console.log(data)
  if(!data.resp || data.err)toastr.error('Error Closing Position')
  return data;
}


async function getAllCommodityTrades(symbol, props) {
  let trades
try {
  console.log({symbol})
  if(symbol){

    trades = await fetch(
      `${LOCAL_SERVER}/API/commodityTrades/${symbol}`
      );
    }else{
      trades = await fetch(
        `${LOCAL_SERVER}/API/commodityTrades`
        );
    }
    trades = await trades.json()
    console.log(trades)
    props.dispatch(addAllCommodityTrades(trades, symbol))
} catch (err) {
  console.log({err})
  return console.log('ERROR')
  
}
}

async function getCommodityRegressionValues(symbol, props) {
  console.log("get regression values");
  console.log(props);
  if (props.stock_data.commodityRegressionData[symbol]) {
    return console.log("Already have the commodityRegressionData");
  }
  let regressionData = await fetch(
    `${LOCAL_SERVER}/API/commodityRegressionSettings/${symbol}`,
    // { credentials: "include" }
  );
  regressionData = await regressionData.json();
  // console.log(regressionData);
  props.dispatch(commodityRegressionData(regressionData));
}

async function setRegressionSettingsTimeframe(
  id,
  { timeframe, regressionLines, importantPriceLevels },
  props
) {
  try {
    console.log({
      regressionLines,
      importantPriceLevels
    });
  
    let regressionData = await fetch(
      `${LOCAL_SERVER}/API/commodityRegressionSettings`,
      { credentials: "include", ...PUT({ id, timeframe }) }
    );
    regressionData = await regressionData.json();
    console.log(regressionData);
    if(regressionData.err)throw regressionData.err
    console.log(props);
    //use an array becasue thats what the actions is expecting
    props.dispatch(commodityRegressionData([regressionData]));
      let {symbol} = regressionData
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
  minMaxTolerance,
  regressionErrorLimit,
  priceLevelMinMax,
  priceLevelSensitivity,
  props
}) {
  let regressionData = await fetch(
    `${LOCAL_SERVER}/API/commodityRegressionSettings`,
    {
      credentials: "include",
      ...POST({
        symbol,
        minMaxTolerance,
        regressionErrorLimit,
        priceLevelMinMax,
        priceLevelSensitivity
      })
    }
  );
  regressionData = await regressionData.json();
  console.log(regressionData);
  console.log(props);
  //use an array becasue thats what the actions is expecting
  toastr.success("Regression settings saved");
  props.dispatch(commodityRegressionData([regressionData]));
}

async function deleteRegressionValues(id, props) {
  let deletedData = await fetch(
    `${LOCAL_SERVER}/API/commodityRegressionSettings`,
    { credentials: "include", ...DELETE({ id }) }
  );
  deletedData = await deletedData.json();
  console.log(deletedData)
  if (!deletedData.symbol) return toastr.error("Error deleting data");
  toastr.success("Regression data was  deleted");
  console.log(deletedData);
  console.log(props);

  props.dispatch(deleteCommodityRegressionData(id));
}

async function getMovers() {
  // console.log(API_SERVER);
  let movers = await fetch(`${API_SERVER}/MOVERS/MOVERS.json`);
  return movers;
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

async function fetch_commodity_minutely_data({ date, symbol }) {
  try {
    symbol = settleSymbol(symbol);
    //TD_data/dailyParsedTickData
    let data = await csv(
      `${API_SERVER}/TD_data/dailyParsedTickData/${date}/${symbol}-${date}.csv`,
      { withCredentials: true }
    );
    // data = await data.json();
    // console.log({data})
    // console.log('TOASTR')
    toastr.success(`Data loaded`, `${data.length} bars loaded for ${symbol}`);
    return data;
  } catch (err) {
    let data = [];
    toastr.success(`Data loaded`, `${data.length} bars loaded for ${symbol}`);
    return data;
  }
}

async function fetchCommodityData({ timeframe, symbol }) {
  console.log(LOCAL_SERVER)
  let data = await fetch(
    `${LOCAL_SERVER}/back_data/${timeframe}/${symbol}`
  );
  data = await data.json();
  console.log({data})
  // console.log('TOASTR')
  if(data.err)
    toastr.error(`Data Not loaded`, `An error occurred for ${symbol}`);  
  else
    toastr.success(`Data loaded`, `${data.length} bars loaded for ${symbol}`);
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
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  };
}

function PUT(body) {
  return {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  };
}

function DELETE(body) {
  return {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
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