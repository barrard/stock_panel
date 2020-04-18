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

export function updateCommodityTrade(trade){
  console.log(trade)
  return{
    type:"UPDATE_COMMODITY_TRADE", 
    trade
  }
}

export function addAllCommodityTrades(trades, symbol){
  console.log({trades, symbol})
  return{
    type:"ADD_ALL_COMMODITY_TRADES", 
    trades, symbol
  }
}

export function addCommodityTrade(trade, symbol){
  console.log(trade)
  return{
    type:"ADD_COMMODITY_TRADE", 
    trade, symbol
  }
}

export function commodityRegressionData(commodityRegressionData) {
  return {
    type: "SET_COMMODITY_REGRESSION_DATA",
    commodityRegressionData
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


export function add_commodity_minutely_data({symbol, chart_data}) {
  // console.log({chart_data})
  chart_data.forEach(r => {
    r.timestamp = new Date(parseInt(r.start_timestamp)).getTime()
    r.open = +r.open
    r.close = +r.close
    r.high = +r.high
    r.low = +r.low
    r.volume= +r.volume
    r.sample_times = JSON.parse(r.sample_times)
    r.bid_prices = JSON.parse(r.bid_prices)
    r.ask_prices = JSON.parse(r.ask_prices)
    r.bid_sizes = JSON.parse(r.bid_sizes)
    r.ask_sizes = JSON.parse(r.ask_sizes)
    r.prices = JSON.parse(r.prices)
    r.vols = JSON.parse(r.vols)
  })
  let rawCommodityChartData = [...chart_data]
  let timeframe = '1Min'
  return {
    type: "ADD_COMMODITY_CHART_DATA",
    chart_data, symbol, timeframe, rawCommodityChartData
  };
}

/**
 * 
 * @param {object} data object of commodity data
 * @param {string} type 'tick' or 'minute'
 */
export function updateCommodityData(newData, type){
    if(type === 'minute'){

      return {
        type:"ADD_NEW_MINUTE",
        new_minute_data : newData
      }
    }else if(type === 'tick'){

      return {
        type:"ADD_NEW_TICK",
        new_tick_data : newData
      }
    }
}

export function add_commodity_chart_data({symbol, chart_data, timeframe}) {
  console.log('ADD_COMMODITY_CHART_DATA')
  console.log({chart_data})
        chart_data.forEach(r => {
          r.timestamp = new Date(+r.timestamp).getTime()
          r.open = +r.open
          r.close = +r.close
          r.high = +r.high
          r.low = +r.low
        });
        let rawCommodityChartData = [...chart_data]
        console.log({rawCommodityChartData, chart_data})
        chart_data = forwardFill(chart_data);
  return {
    type: "ADD_COMMODITY_CHART_DATA",
    chart_data, symbol, timeframe, rawCommodityChartData
  };
}

export function deleteCommodityRegressionData(id){
  return {
    type:"REMOVE_COMMODITY_REGRESSION_DATA",
    id
  }

}

export function add_chart_data(symbol, chart_data, timeframe) {
  console.log('ADD_CHART_DATA')
  console.log(symbol)
  console.log(chart_data)
    chart_data = formatData(chart_data);
    let rawData = [...chart_data]

    chart_data = forwardFill(chart_data);
  return {
    type: "ADD_CHART_DATA",
    chart_data, timeframe, symbol, rawData
  };
}

export function add_MA_data_action(MA_data, symbol){
  return{
    type:"ADD_MA_DATA", MA_data, symbol
  }

}

