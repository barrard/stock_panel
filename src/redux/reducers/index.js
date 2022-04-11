import { combineReducers } from "redux";
import { reducer as toastrReducer } from "react-redux-toastr";
import actives_reducer from "./actives_reducer.js";
import Chart_Analysis from "./Chart_Analysis_reducer.js";
import MA_analysis from "./MA_analysis_reducer.js";
import meta_reucer from "./meta_reducer.js";
import opReducer from "./opReducer.js";
import stock_data_reducer from "./stock_data_reducer";
import StockBotReducer from "./StockBotReducer.js";
import tradeFilter from "./tradeFilterReducer.js";
import user_reducer from "./user_reducer.js";
export default combineReducers({
    // MA_analysis:MA_analysis,
    actives_reducer,
    Chart_Analysis: Chart_Analysis,
    meta: meta_reucer,
    options: opReducer,
    stock_data: stock_data_reducer,
    stockBot: StockBotReducer,
    toastr: toastrReducer,
    tradeFilter,
    user: user_reducer,
});
