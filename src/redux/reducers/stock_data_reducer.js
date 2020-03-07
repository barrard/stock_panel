// import * as meta_actions from "../actions/meta_actions.js";

const initial_state = {
  has_symbols_data: false,
  stock_symbols_data: [],
  commodity_symbols_data: [],
  charts: {},
  search_symbol: "",
  sector_data: {},
  movers:{},
  commodity_data:{}
};

export default (state = initial_state, action) => {
  switch (action.type) {
    case "ADD_COMMODITY_CHART_DATA":{
      console.log(action)
      let { chart_data, symbol, timeframe } = action
      let commodity_data = {
        ...state.commodity_data
      }
      if(!commodity_data[symbol])commodity_data[symbol] = {}
      commodity_data[symbol][timeframe]=chart_data

        return {
        ...state, commodity_data

        }
      }
    
    case "SET_MOVERS":{
      let {movers}=action
      return {...state, movers}
    }
    case "ADD_MA_DATA": {
      let { symbol, MA_data } = action;
      let stock_data = state.charts[symbol];
      let stock_data_with_MA = { ...stock_data, ...MA_data };
      // console.log({stock_data_with_MA})

      return {
        ...state,
        charts:{
          ...state.charts, [symbol]:{
            ...state.charts[symbol], ...stock_data_with_MA
          }
        }
      };
    }
    case "SET_SECTOR_DATA": {
      const { sector, data } = action;
      const sector_data = { ...state.sector_data, ...{ [sector]: data } };
      return {
        ...state,
        sector_data: sector_data
      };
    }

    case "SET_SEARCH_SYMBOL": {
      console.log(action)
      return {
        ...state,
        search_symbol: action.search_symbol
      };
    }
    case "ADD_CHART_DATA": {
      let charts = { ...state.charts, ...action.chart_data };
      return {
        ...state,
        charts
      };
    }
    case "SET_SYMBOLS_DATA": {
      console.log({action})
      let{stock_symbols_data,
        commodity_symbols_data} = action
        commodity_symbols_data = formatCommoditySymbolsData(commodity_symbols_data)
      return {
        ...state,
        stock_symbols_data,
        commodity_symbols_data,
        has_symbols_data: true
      };
    }

    default:
      return state;
  }
};



function formatCommoditySymbolsData(data){
  let formatedSymbolsData = []
  /*
  CIK: "1090872"
Ticker: "A"
Name: "Agilent Technologies Inc"
Exchange: "NYSE"
SIC: "3825"
Business: "CA"
Incorporated: "DE"
IRS: "770518772"
  */
  data.forEach(group=>{
    let groupName = group.group
    group.symbols.forEach(symbolData=>{
      let Ticker = `${symbolData.symbol}`
      let Name = symbolData.name
      let isCommodity = true
      formatedSymbolsData.push({Ticker, Name, isCommodity, groupName})
    })

  })

  return formatedSymbolsData
}