import {
  show_filter_list,
  is_loading
} from "../../redux/actions/meta_actions.js";
import {
  set_search_symbol,
  add_chart_data,
  set_sector_data
} from "../../redux/actions/stock_actions.js";

export function view_selected_stock_symbol(symbol, props) {
  const { dispatch } = props;
  console.log(symbol);
  /* Set the search symbol aas selected */
  dispatch(set_search_symbol(symbol));
  /* set show filtered list false */
  dispatch(show_filter_list(false));
  /* fetch data and add to the store/charts array */
  fetch_selected_chart_data(symbol, props);
}

/* HELPER METHOD */
export async function fetch_data(url, ctx) {
  if (ctx && ctx.req && ctx.req.headers) {
    console.log("got ctx headers?");
    return await fetch(url, {
      headers: {
        /* Need header maybe? */
        cookie: ctx.req.headers.cookie,
        credentials: "same-origin"
      }
    });
  } else {
    console.log("DONT have ctx headers?");
console.log(url)
    return await fetch(url, {
      // credentials: "same-origin",
      // credentials: "include"
    });
  }
}

export async function fetch_sector_data(sector, props) {
  const { meta, dispatch, router, ctx } = props;
  const { api_server } = meta;
  router.push(`/sector?sector=${encodeURIComponent(sector)}`);
  let sector_data_json = await fetch_data(
    `
  ${api_server}/stock/market/collection/sector?collectionName=${sector}
  `,
    ctx
  );
  let sector_data = await sector_data_json.json();
  // console.log(sector_data);
  dispatch(set_sector_data(sector, sector_data));
}

export async function fetch_selected_chart_data(symbol, props) {
  const { meta, dispatch, router, ctx } = props;
  /* Start loading */
  dispatch(is_loading(true));
  if (router) router.push(`/chart?symbol=${symbol}`);
  const { api_server } = meta;
  let book_data_json = await fetch_data(
    `  
    ${api_server}/stock/${symbol}/book
  `,
    ctx
  );
  // console.log("done fetch");
  let chart_data_json = await fetch_data(
    `${api_server}/stock/${symbol}/chart/5y
  `,
    ctx
  );
  // console.log("done fetch");

  let chart_logo_json = await fetch_data(
    `
  ${api_server}/stock/${symbol}/logo
  `,
    ctx
  );
  // console.log("done fetch");

  let chart_stats_json = await fetch_data(
    `
    ${api_server}/stock/${symbol}/stats
  `,
    ctx
  );
  // console.log("done fetch");

  let company_json = await fetch_data(
    `
    ${api_server}/stock/${symbol}/company
  `,
    ctx
  );
  // console.log('done fetch')
  // let chart_larget_trades_json = await fetch_data(
  //   `
  //   ${api_server}/stock/${symbol}/largest-trades
  // `,
  //   ctx
  // );
  // console.log("done fetch");

  // let chart_larget_trades = await chart_larget_trades_json.json();
  let company = await company_json.json();
  let chart_stats = await chart_stats_json.json();
  let chart_logo = await chart_logo_json.json();
  let book_data = await book_data_json.json();
  let chart_data = await chart_data_json.json();
  // console.log('done fetch')

  dispatch(
    add_chart_data({
      [symbol]: {
        company,
        book_data,
        chart_data,
        chart_logo,
        chart_stats
        // chart_larget_trades
      }
    })
  );
  dispatch(is_loading(false));
  // console.log({
  //   book_data,
  //   chart_data,
  //   chart_logo,
  //   chart_stats,
  //   chart_larget_trades
  // });
}
