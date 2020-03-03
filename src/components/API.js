import { is_loading } from "../redux/actions/meta_actions.js";
import {
    set_symbols_data,
    set_search_symbol,
    add_chart_data
  } from "../redux/actions/stock_actions.js";
export default {
  get_homepage_data,
  getAllSymbolsData
};

const API_SERVER = process.env.REACT_APP_STOCK_DATA_URL;

async function get_homepage_data() {
  console.log(API_SERVER);
  let movers = await fetch(`${API_SERVER}/back_data/MOVERS/MOVERS.json`);
  return movers;
}

async function getAllSymbolsData(dispatch) {
  let data = await fetch(`${API_SERVER}/API/get_symbols_data`);
  let all_stock_symbols = await data.json();
  console.log(all_stock_symbols);
  dispatch(set_symbols_data(all_stock_symbols));
return all_stock_symbols
}
