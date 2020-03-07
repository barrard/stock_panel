import {
  show_filter_list,
  is_loading
} from "../../redux/actions/meta_actions.js";
import {
  set_search_symbol,
  add_chart_data, add_commodity_chart_data
} from "../../redux/actions/stock_actions.js";

import API from "../API.js";


export async function view_selected_commodity({ timeframe, symbol, props }) {
  // console.log(props);
  const { dispatch } = props;
  // console.log(dispatch);
  // console.log(symbol);
  // /* Set the search symbol aas selected */
  dispatch(set_search_symbol(symbol));
  // /* set show filtered list false */
  // dispatch(show_filter_list(false));
  // /* fetch data and add to the store/charts array */
  let chart_data = await fetch_commodity_chart_data({
    timeframe,
    symbol,
    props
  });
  dispatch(add_commodity_chart_data({symbol, chart_data, timeframe}));
  dispatch(is_loading(false));
}

export async function view_selected_stock({ timeframe, end, symbol, props }) {
  // console.log(props);
  const { dispatch } = props;
  // console.log(dispatch);
  // console.log(symbol);
  // /* Set the search symbol aas selected */
  dispatch(set_search_symbol(symbol));
  // /* set show filtered list false */
  dispatch(show_filter_list(false));
  // /* fetch data and add to the store/charts array */
  let stockData = await fetch_selected_chart_data({
    timeframe,
    end,
    symbol,
    props
  });
  dispatch(add_chart_data(stockData));
  dispatch(is_loading(false));
}

/* HELPER METHOD */
export async function fetch_data(url, ctx) {
  if (ctx && ctx.req && ctx.req.headers) {
    // console.log("got ctx headers?");
    return await fetch(url, {
      headers: {
        /* Need header maybe? */
        cookie: ctx.req.headers.cookie,
        credentials: "same-origin"
      }
    });
  } else {
    // console.log("DONT have ctx headers?");
    // console.log(url);
    return await fetch(url, {
      // credentials: "same-origin",
      // credentials: "include"
    });
  }
}



export async function fetch_commodity_chart_data({
  timeframe,
  symbol,
  props
}) {
  const { meta, dispatch } = props;
  // console.log({ props });
  /* Start loading */
  dispatch(is_loading(true));
  const stock_data = await API.fetchCommodityData({ timeframe, symbol });
  // console.log(stock_data);
  return stock_data;
}



export async function fetch_selected_chart_data({
  timeframe,
  end,
  symbol,
  props
}) {
  const { meta, dispatch } = props;
  // console.log({ props });
  /* Start loading */
  dispatch(is_loading(true));
  props.history.push(`/chart/${symbol}`);
  const stock_data = await API.fetchStockData({ timeframe, symbol, end });
  // console.log(stock_data);
  return stock_data;
}
