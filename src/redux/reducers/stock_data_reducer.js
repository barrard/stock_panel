// import * as meta_actions from "../actions/meta_actions.js";

const initial_state = {
  has_symbols_data: false,
  symbols_data: {},
  charts: {},
  search_symbol: "",
  home_page_data: {},
  home_page_data_set_at: 0,
  sector_data: {}
};

export default (state = initial_state, action) => {
  switch (action.type) {
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
    case "SET_HOME_PAGE_DATA": {
      const { home_page_data, home_page_data_set_at } = action;
      return {
        ...state,
        home_page_data,
        home_page_data_set_at
      };
    }
    case "SET_SEACH_SYMBOL": {
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
      console.log('setting symbols data array?')
      return {
        ...state,
        symbols_data: action.symbols_data,
        has_symbols_data: true
      };
    }

    default:
      return state;
  }
};
