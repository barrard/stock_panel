import { toastr } from "react-redux-toastr";

// import { is_loading } from "../redux/actions/meta_actions.js";
import {
    set_symbols_data,
    // set_search_symbol,
    // add_chart_data
  } from "../redux/actions/stock_actions.js";
export default {
  getMovers,
  getAllSymbolsData,
  fetchStockData, fetchCommodityData
};

const API_SERVER = process.env.REACT_APP_STOCK_DATA_URL;

async function getMovers() {
  console.log(API_SERVER);
  let movers = await fetch(`${API_SERVER}/back_data/MOVERS/MOVERS.json`);
  return movers;
}

async function getAllSymbolsData(dispatch) {
  console.log('getAllSymbolsData')
  let data = await fetch(`${API_SERVER}/API/get_symbols_data`);
  data = await data.json();
  console.log(data)
  let {all_stock_symbols, all_commodity_symbols} = data
  console.log({all_stock_symbols, all_commodity_symbols});
  dispatch(set_symbols_data(all_stock_symbols, all_commodity_symbols));
return
}



async function fetchCommodityData({timeframe, symbol, end}){
  let data = await fetch(`${API_SERVER}/back_data/${timeframe}/${timeframe}-${symbol}.json`);
  data = await data.json()
  console.log({data})
  console.log('TOASTR')
  toastr.success(`Data loaded`, 
  `${data.length} bars loaded for ${symbol}`)
  return data
}

async function fetchStockData({timeframe, symbol, end}){
  let data = await fetch(`${API_SERVER}/alpacaData/${symbol}/${timeframe}/${end}`);
  data = await data.json()
  console.log({data})
  console.log('TOASTR')
  toastr.success(`Data loaded`, 
  `${data[symbol].length} bars loaded for ${symbol}`)
  return data
}