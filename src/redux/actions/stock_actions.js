import {formatData, forwardFill} from '../../components/charts/chartHelpers/utils.js'

export function set_symbols_data(stock_symbols_data, commodity_symbols_data) {
  // console.log('set_symbols_data')
  // console.log({stock_symbols_data,
    // commodity_symbols_data})
  return {
    type: "SET_SYMBOLS_DATA",
    stock_symbols_data, commodity_symbols_data
  };
}

export function set_movers(movers) {
  return {
    type: "SET_MOVERS",
    movers
  };
}

export function set_search_symbol(search_symbol) {
  // console.log(search_symbol)
  return {
    type: "SET_SEARCH_SYMBOL",
    search_symbol
  };
}

export function get_sector_data(sector, iex_api){
  // console.log('GET SECTOR DATA')
  return async dispatch =>{
    let sector_data_json = await fetch(`
    ${iex_api}/stock/market/collection/sector?collectionName=${sector}&token=pk_9c5351666ec649d99eb45ff08817d362
    `);
    let sector_data = await sector_data_json.json()
    // return {}
    return dispatch(set_sector_data( sector, sector_data))
    }
}

export function set_sector_data(sector, data) {
  // console.log('set_sector_data')
  return {
    type: "SET_SECTOR_DATA",
    sector, data
  };
}


export function add_commodity_chart_data({symbol, chart_data, timeframe}) {
  // console.log({chart_data})
        chart_data.forEach(r => (r.timestamp = new Date(r.timestamp).getTime()));
        // chart_data = forwardFill(chart_data);
  return {
    type: "ADD_COMMODITY_CHART_DATA",
    chart_data, symbol, timeframe
  };
}

export function add_chart_data(chart_data) {
  for(let sym in chart_data){
    chart_data[sym] = formatData(chart_data[sym]);
    // chart_data[sym] = forwardFill(chart_data[sym]);
  }
  return {
    type: "ADD_CHART_DATA",
    chart_data
  };
}

export function add_MA_data_action(MA_data, symbol){
  return{
    type:"ADD_MA_DATA", MA_data, symbol
  }

}

