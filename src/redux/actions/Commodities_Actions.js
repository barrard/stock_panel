
import {fetch_data} from '../../components/charts/chart_data_utils.js'

export async function fetch_commodity_chart_data(
  symbol, api_server, dispatch, ctx
) {
  console.log('fetch_commodity_chart_data')
  let url =     `${api_server}/commodities/get_all_data/${symbol}/`

  let commodity_data= await fetch_data(url, ctx)
  
  // console.log(commodity_data)
  let commodity_chart_data = await commodity_data.json();
  return dispatch({
    type: "SET_COMMODITY_DATA",
    chart_data:{[symbol]:{chart_data:commodity_chart_data}}//chart data needs to be named
  });
}



// export function show_filter_list(show_filter_list) {
//   return {
//     type: "TOGGLE_FILTER_LIST",
//     show_filter_list
//   };
// }



// export function is_loading(is_loading) {
//   return {
//     type: "IS_LOADING",
//     is_loading
//   };
// }
