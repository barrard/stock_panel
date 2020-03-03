
export function set_symbols_data(symbols_data) {
  console.log('set_symbols_data')
  console.log({symbols_data})
  return {
    type: "SET_SYMBOLS_DATA",
    symbols_data
  };
}

export function set_search_symbol(search_symbol) {
  return {
    type: "SET_SEACH_SYMBOL",
    search_symbol
  };
}

export function get_sector_data(sector, iex_api){
  console.log('GET SECTOR DATA')
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
  console.log('set_sector_data')
  return {
    type: "SET_SECTOR_DATA",
    sector, data
  };
}

export function add_chart_data(chart_data) {
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


export function set_home_page_data(home_page_data) {
  const home_page_data_set_at = new Date().getTime()
  return {
    type: "SET_HOME_PAGE_DATA",
    home_page_data, home_page_data_set_at
  };
}
