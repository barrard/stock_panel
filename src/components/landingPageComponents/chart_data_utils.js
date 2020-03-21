import {
  show_filter_list,
  is_loading
} from "../../redux/actions/meta_actions.js";
import {
  set_search_symbol,
  add_chart_data,
  add_commodity_chart_data,
  add_commodity_minutely_data
} from "../../redux/actions/stock_actions.js";

import API from "../API.js";

export async function getMinutelyCommodityData({
  date,
  symbol,
  props,
  tryGetOneMoreDay
}) {
  // console.log(props);
  const { dispatch } = props;
  // console.log(dispatch);
  // console.log(symbol);
  // /* Set the search symbol aas selected */
  dispatch(set_search_symbol(symbol));
  // /* set show filtered list false */
  dispatch(show_filter_list(false));
  // const current_data = await API.fetch_commodity_realtime_data({ symbol });
  // console.log('GOT CURRENT REALTIME DATA')
  // console.log(  {current_data})
  /**
   * Fiure out what minutley data we have,
   * and what the time frame is (1min, 5 min, etc..)
   */
  // /* fetch data and add to the store/charts array */
  dispatch(is_loading(true));
  let chart_data = await API.fetch_commodity_minutely_data({ date, symbol });

  console.log(chart_data);
  if (tryGetOneMoreDay) {
    console.log(date);
    date = new Date(new Date(date).setDate(new Date(date).getDate() + 1))
      .toLocaleString()
      .split(",")[0]
      .replace("/", "-")
      .replace("/", "-");
    const maybeMostRecentDay = await API.fetch_commodity_minutely_data({
      date,
      symbol
    });
    console.log({ maybeMostRecentDay });
    if (maybeMostRecentDay.length) {
      chart_data = [...chart_data, ...maybeMostRecentDay];
    }
    date = new Date(new Date(date).setDate(new Date(date).getDate() - 2))
      .toLocaleString()
      .split(",")[0]
      .replace("/", "-")
      .replace("/", "-");
    const prevousDay = await API.fetch_commodity_minutely_data({
      date,
      symbol
    });
    console.log({ prevousDay });
    if (prevousDay.length) {
      chart_data = [...prevousDay, ...chart_data];
    }
  }
  // let timeframe = 'minutely'
  dispatch(add_commodity_minutely_data({ symbol, chart_data }));
  dispatch(is_loading(false));
}

export async function view_selected_commodity({ timeframe, symbol, props }) {
  // console.log(props);
  const { dispatch } = props;
  // console.log(dispatch);
  console.log(symbol);
  // /* Set the search symbol aas selected */
  dispatch(set_search_symbol(symbol));
  // /* set show filtered list false */
  // dispatch(show_filter_list(false));
  // /* fetch data and add to the store/charts array */
  dispatch(is_loading(true));
  const chart_data = await API.fetchCommodityData({ timeframe, symbol });
  dispatch(add_commodity_chart_data({ symbol, chart_data, timeframe }));
  dispatch(is_loading(false));
}

export async function view_selected_stock({ timeframe, end, symbol, props }) {
  console.log("view_selected_stock");
  let tf = timeframe;
  // if(timeframe === '1Min') timeframe = 'minute'
  // if(timeframe === '5Min') timeframe = '5Min'
  // if(timeframe === '15minutely') timeframe = '15Min'
  // if(timeframe === '30minutely') timeframe = '30Min'
  if (timeframe === "daily") timeframe = "day";
  if (timeframe === "weekly") {
    console.log("TODO make weekly function");
    timeframe = "day";
  }
  const { dispatch } = props;
  // console.log(dispatch);
  // console.log(symbol);
  // /* Set the search symbol aas selected */
  dispatch(set_search_symbol(symbol));
  // /* set show filtered list false */
  dispatch(show_filter_list(false));
  // /* fetch data and add to the store/charts array */
  dispatch(is_loading(true));
  // props.history.push(`/chart/${symbol}`);
  const stockData = await API.fetchStockData({ timeframe, symbol, end });
  console.log({ stockData });
  dispatch(add_chart_data(symbol, stockData[symbol], tf));
  dispatch(is_loading(false));
}

/* HELPER METHOD */
/**
 * THIS IS A GEM FOR SSR
 */
// export async function fetch_data(url, ctx) {
//   if (ctx && ctx.req && ctx.req.headers) {
//     // console.log("got ctx headers?");
//     return await fetch(url, {
//       headers: {
//         /* Need header maybe? */
//         cookie: ctx.req.headers.cookie,
//         credentials: "same-origin"
//       }
//     });
//   } else {
//     // console.log("DONT have ctx headers?");
//     // console.log(url);
//     return await fetch(url, {
//       // credentials: "same-origin",
//       // credentials: "include"
//     });
//   }
// }
