import { toastr } from "react-redux-toastr";

import {
  show_filter_list,
  is_loading,
} from "../../redux/actions/meta_actions.js";
import {
  set_search_symbol,
  add_chart_data,
  add_commodity_chart_data,
  add_commodity_minutely_data,
} from "../../redux/actions/stock_actions.js";

import API from "../API.js";

export function appendTickToData(timeframe, symbol) {
  console.log({ timeframe, symbol });
}

export async function getMinutelyCommodityData({ symbol, props, from, to }) {
  from = from || 0
  to = to || new Date().getTime()

  // date = '6-4-2020'
  // console.log({ date });
  const { dispatch } = props;
  // /* Set the search symbol aas selected */
  dispatch(set_search_symbol(symbol));
  // /* set show filtered list false */
  dispatch(show_filter_list(false));
  /**
   * Fiure out what minutley data we have,
   * and what the time frame is (1min, 5 min, etc..)
   */
  // /* fetch data and add to the store/charts array */
  dispatch(is_loading(true));
  let chart_data = await API.fetch_commodity_minutely_data({ from,to, symbol });

  // console.log(chart_data);

  if (!chart_data.length) {
    console.log("WE GIOT NOGTIIHIN");
  }
  if (!chart_data.err) {
    dispatch(add_commodity_minutely_data({ symbol, chart_data }));
  } else {
    toastr.error("Error loading Data", chart_data.err);
  }

  dispatch(is_loading(false));
}

export async function view_selected_commodity({ timeframe, symbol, props }) {
  const { dispatch } = props;

  // /* Set the search symbol aas selected */
  dispatch(set_search_symbol(symbol));

  dispatch(is_loading(true));
  let currentData = props.stock_data.commodity_data[symbol][timeframe];
  let to = new Date().getTime()
  let from = 0
  if(currentData){

    to = currentData[0].timestamp
    
  }
  let chart_data = await API.fetchCommodityData({
    timeframe,
    symbol,
    from,
    to,
  });
  if (chart_data.err) return dispatch(is_loading(false));
  if (!chart_data.length) {
    toastr.info("No Data Available");
    return dispatch(is_loading(false));
  }
  /**
   * Append some minutle data as needed
   */
  // console.log("append minute data");
  // console.log({ chart_data });
  // chart_data = appendMinutelyCommodityDataAsNeeded(
  //   props,
  //   chart_data,
  //   timeframe,
  //   symbol
  // );
  // console.log({ chart_data });

  dispatch(add_commodity_chart_data({ symbol, chart_data, timeframe }));
  dispatch(is_loading(false));
}

export async function view_selected_stock({ timeframe, end, symbol, props }) {
  // console.log("view_selected_stock");
  // let tf = timeframe;
  // // if(timeframe === '1Min') timeframe = 'minute'
  // // if(timeframe === '5Min') timeframe = '5Min'
  // // if(timeframe === '15minutely') timeframe = '15Min'
  // // if(timeframe === '30minutely') timeframe = '30Min'
  // if (timeframe === "Daily") timeframe = "day";
  // if (timeframe === "weekly") {
  //   console.log("TODO make weekly function");
  //   timeframe = "day";
  // }
  const { dispatch } = props;

  // /* Set the search symbol aas selected */
  dispatch(set_search_symbol(symbol));
  // /* set show filtered list false */
  dispatch(show_filter_list(false));
  // /* fetch data and add to the store/charts array */
  dispatch(is_loading(true));
  try {
    const chartData = await API.fetchStockData({ timeframe, symbol, end });
    console.log({ chartData });

    dispatch(add_chart_data({ symbol, chartData, timeframe }));
    dispatch(is_loading(false));
  } catch (err) {
    console.log(err);
    dispatch(is_loading(false));
  }
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

export function appendMinutelyCommodityDataAsNeeded(
  props,
  chart_data,
  timeframe,
  symbol
) {
  let minuteData = props.stock_data.commodity_data[symbol]["1Min"];
  // console.log(minuteData);
  // console.log(`how up to date is the chart_data ${timeframe} ${symbol}`);
  let lastChartDataBar = chart_data.slice(-1)[0];
  // console.log(lastChartDataBar);
  // console.log(typeof lastChartDataBar.timestamp);
  let lastChartDataBarTimestamp = parseInt(lastChartDataBar.timestamp);
  let nextChartDataBarTimestamp =
    lastChartDataBarTimestamp + 1000 * 60 * getMinutesForTimeframe(timeframe);
  // console.log({ lastChartDataBarTimestamp, nextChartDataBarTimestamp });
  // console.log("find the index in the minute chart data");
  // console.log({
  //   lastChartDataBarTimestamp: new Date(
  //     lastChartDataBarTimestamp
  //   ).toLocaleString(),
  //   nextChartDataBarTimestamp: new Date(
  //     nextChartDataBarTimestamp
  //   ).toLocaleString(),
  // });
  let miniuteDataIndex = minuteData.findIndex(
    (d) => d.timestamp >= nextChartDataBarTimestamp
  );
  // console.log({ miniuteDataIndex });
  if (miniuteDataIndex < 0) {
    if (timeframe === "5Min") {
      console.log(`We need more 1Min`);
    }
    if (timeframe === "intraday") {
      console.log(`We need more 5Min`);
    }
    if (timeframe === "Daily") {
      console.log(`We need more intraday`);
    }
    if (timeframe === "weekly") {
      console.log(`We need more daily`);
    }
  } else {
    minuteData = minuteData.slice(miniuteDataIndex);
  }
  // console.log({ minuteData });
  let timeFrameMinutes = getMinutesForTimeframe(timeframe);
  let consolidatedMinuteData = consolidateMinutelyData(
    minuteData,
    timeFrameMinutes
  );
  // console.log({ consolidatedMinuteData });
  chart_data = [...chart_data, ...consolidatedMinuteData];
  return chart_data;
}

function consolidateMinutelyData(minuteData, timeFrameMinutes) {
  let consolidatedData = [];
  if (minuteData.length < 1) return consolidatedData;
  let timeInMiliseconds = timeFrameMinutes * 60 * 1000;

  let start = null;
  let consolidatedBar = {
    open: 0,
    high: 0,
    low: 999999999,
    close: 0,
    volume: 0,
    timestamp: 0,
  };

  minuteData.forEach((d, i) => {
    if (d.close === 0) {
      console.error("THIS IS AN EERRROOR");
      // console.log({ d, i });
    }
    if (!start) start = d.timestamp;

    if (d.timestamp - start >= timeInMiliseconds) {
      consolidatedData = [...consolidatedData, consolidatedBar];
      start = d.timestamp;
      consolidatedBar = {
        open: 0,
        high: 0,
        low: 9999999999,
        close: 0,
        volume: 0,
        timestamp: 0,
      };
    }

    // console.log({consolidatedBar, consolidatedData, i, minuteTS:new Date(d.timestamp).toLocaleString()})
    if (!consolidatedBar.open) consolidatedBar.open = d.open;
    if (!consolidatedBar.timestamp) consolidatedBar.timestamp = d.timestamp;
    consolidatedBar.close = d.close;
    if (d.high > consolidatedBar.high) {
      consolidatedBar.high = d.high;
    }

    if (d.low < consolidatedBar.low) {
      consolidatedBar.low = d.low;
    }
    consolidatedBar.volume += d.volume;
  });
  // console.log({ consolidatedBar });

  //buggy?  likely there is partial data still in consolidatedBar
  consolidatedData = [...consolidatedData, consolidatedBar];
  // console.log({ consolidatedData });
  return consolidatedData;
}
export function getMinutesForTimeframe(timeframe) {
  if (timeframe === "5Min") return 5;
  if (timeframe === "intraday") return 30;
  if (timeframe === "Daily") return 24 * 60;
  if (timeframe === "weekly") return 24 * 60 * 7;
}
