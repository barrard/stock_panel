import { toastr } from "react-redux-toastr";
import { csv } from "d3-fetch";
// import { is_loading } from "../redux/actions/meta_actions.js";
import {
  set_symbols_data,
  commodityRegressionData,
  deleteCommodityRegressionData
  // set_search_symbol,
  // add_chart_data
} from "../redux/actions/stock_actions.js";
export default {
  getMovers,
  getAllSymbolsData,
  fetchStockData,
  fetchCommodityData,
  fetch_commodity_minutely_data,
  fetch_commodity_realtime_data,
  saveRegressionValues,
  getCommodityRegressionValues,
  deleteRegressionValues,
  setRegressionSettingsTimeframe
};

const API_SERVER = process.env.REACT_APP_STOCK_DATA_URL;
const LOCAL_SERVER = 'http://localhost:3003';

async function getCommodityRegressionValues(symbol, props) {
  console.log("get regression values");
  console.log(props);
  if (props.stock_data.commodityRegressionData[symbol]) {
    return console.log("Already have the commodityRegressionData");
  }
  let regressionData = await fetch(
    `${LOCAL_SERVER}/API/commodityRegressionSettings/${symbol}`
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
  console.log({
    regressionLines,
    importantPriceLevels
  });
  /**
   * get an array of mx+b m = and b =
   */
  let slopeInts = [];
  importantPriceLevels.map(p => slopeInts.push({ m: 0, b: p.y }));
  regressionLines.highLines.map(({ m, b }) => slopeInts.push({ m, b }));
  regressionLines.lowLines.map(({ m, b }) => slopeInts.push({ m, b }));
  console.log({ slopeInts });

  let regressionData = await fetch(
    `${LOCAL_SERVER}/API/commodityRegressionSettings`,
    PUT({ id, timeframe })
  );
  regressionData = await regressionData.json();
  console.log(regressionData);
  console.log(props);
  //use an array becasue thats what the actions is expecting
  props.dispatch(commodityRegressionData([regressionData]));
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
    POST({
      symbol,
      minMaxTolerance,
      regressionErrorLimit,
      priceLevelMinMax,
      priceLevelSensitivity
    })
  );
  regressionData = await regressionData.json();
  console.log(regressionData);
  console.log(props);
  //use an array becasue thats what the actions is expecting
  toastr.success('Regression settings saved')
  props.dispatch(commodityRegressionData([regressionData]));
}

async function deleteRegressionValues(id, props) {
  let deletedData = await fetch(
    `${LOCAL_SERVER}/API/commodityRegressionSettings`,
    DELETE({ id })
  );
  deletedData = await deletedData.json();
  if (!deletedData.ok) return toastr.error("Error deleting data");
  toastr.success("Regression data was  deleted");
  console.log(deletedData);
  console.log(props);

  props.dispatch(deleteCommodityRegressionData(id));
}

async function getMovers() {
  // console.log(API_SERVER);
  let movers = await fetch(`${API_SERVER}/back_data/MOVERS/MOVERS.json`);
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

async function fetch_commodity_realtime_data({ symbol }) {
  try {
    symbol = settleSymbol(symbol);
    //TD_data/dailyParsedTickData
    let data = await csv(`${API_SERVER}/current_data/${symbol}.csv`);
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

async function fetch_commodity_minutely_data({ date, symbol }) {
  try {
    symbol = settleSymbol(symbol);
    //TD_data/dailyParsedTickData
    let data = await csv(
      `${API_SERVER}/TD_data/dailyParsedTickData/${date}/${symbol}-${date}.csv`
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
  let data = await fetch(
    `${API_SERVER}/back_data/${timeframe}/${timeframe}-${symbol}.json`
  );
  data = await data.json();
  // console.log({data})
  // console.log('TOASTR')
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
