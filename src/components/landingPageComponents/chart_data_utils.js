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
  console.log(date)
  if(!date){
    date = new Date()
    .toLocaleString()
    .split(",")[0]
    .replace("/", "-")
    .replace("/", "-");
  }
  console.log(date)
  // console.log(props);
  const { dispatch } = props;
  // console.log(dispatch);
  // console.log(symbol);
  // /* Set the search symbol aas selected */
  dispatch(set_search_symbol(symbol));
  // /* set show filtered list false */
  dispatch(show_filter_list(false));

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
  if(!props.stock_data.commodity_data[symbol]||
    !props.stock_data.commodity_data[symbol]['1Min']){
    console.log('HOLD UP!  No Minute Data')
    console.log(props.stock_data.commodity_data)
    let tryGetOneMoreDay= true
    await getMinutelyCommodityData({
      symbol,
      props,
      tryGetOneMoreDay
    }) 


    return 
    
  }
  console.log('view_selected_commodity')
  // /* set show filtered list false */
  // dispatch(show_filter_list(false));
  // /* fetch data and add to the store/charts array */
  dispatch(is_loading(true));
  let chart_data = await API.fetchCommodityData({ timeframe, symbol });
  console.log({chart_data})
  /**
   * Append some minutle data as needed
   */
  console.log("append minute data");
  chart_data = appendMinutelyCommodityDataAsNeeded(
    props,
    chart_data,
    timeframe,
    symbol
  );

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

export function appendMinutelyCommodityDataAsNeeded(
  props,
  chart_data,
  timeframe,
  symbol
) {

  let minuteData = props.stock_data.commodity_data[symbol]["1Min"];
  console.log(minuteData);
  console.log(`how up to date is the chart_data ${timeframe} ${symbol}`);
  let lastChartDataBar = chart_data.slice(-1)[0];
  let lastChartDataBarTimestamp = new Date(
    lastChartDataBar.timestamp
  ).getTime();
  console.log({ lastChartDataBar });
  let nextChartDataBarTimestamp =
    lastChartDataBarTimestamp + 1000 * 60 * getMinutesForTimeframe(timeframe);

  console.log("find the index in the minute chart data");
  console.log({lastChartDataBarTimestamp:new Date(lastChartDataBarTimestamp).toLocaleString(), nextChartDataBarTimestamp:new Date(nextChartDataBarTimestamp).toLocaleString()})
  let miniuteDataIndex = minuteData.findIndex(
    d => d.timestamp === nextChartDataBarTimestamp
  );
  console.log({ miniuteDataIndex });
  if(miniuteDataIndex < 0){
    if(timeframe === 'intraday'){
      console.log(`We need more minutely`)
    }
    if(timeframe === 'daily'){
      console.log(`We need more intraday`)
    }
    if(timeframe === 'weekly'){
      console.log(`We need more daily`)
    }
    console.log(minuteData[0])

    console.log(new Date(minuteData[0].timestamp).toLocaleString())
    console.log(new Date(minuteData.slice(-1)[0].timestamp).toLocaleString())
  }else{

    minuteData = minuteData.slice(miniuteDataIndex);
  }
  console.log({ minuteData });
  let timeFrameMinutes = getMinutesForTimeframe(timeframe);
  let consolidatedMinuteData = consolidateMinutelyData(
    minuteData,
    timeFrameMinutes
  );
  chart_data = [...chart_data, ...consolidatedMinuteData];
  return chart_data;
}

function consolidateMinutelyData(minuteData, timeFrameMinutes) {
  let consolidatedData = [];
  let timeInMiliseconds = timeFrameMinutes * 60 * 1000;

  let start = null;
  let consolidatedBar = {
    open: 0,
    high: 0,
    low: 999999999,
    close: 0,
    volume: 0,
    timestamp: 0
  };

  minuteData.forEach(d => {
    if (!start) start = d.timestamp;

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

    if (d.timestamp - start === timeInMiliseconds) {
      consolidatedData = [...consolidatedData, consolidatedBar];
      start = null;
      consolidatedBar = {
        open: 0,
        high: 0,
        low: 9999999999,
        close: 0,
        volume: 0,
        timestamp: 0
      };
    }
  });

  //buggy?  likely there is partial data still in consolidatedBar
  consolidatedData = [...consolidatedData, consolidatedBar];
  console.log({ consolidatedData });
  return consolidatedData;
}
export function getMinutesForTimeframe(timeframe) {
  if (timeframe === "intraday") return 30;
  if (timeframe === "daily") return 24 * 60;
  if (timeframe === "weekly") return 24 * 60 * 7;
}
