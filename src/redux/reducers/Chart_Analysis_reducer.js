// import * as meta_actions from "../actions/meta_actions.js";

const initial_state = {
  mouseDown: false, //listen for drag events
  canvas_width: null,
  canvas_height: null,
  chart_height: "",
  vol_canvas_height: "",
  canvas: "",
  context: {},
  candle_width: 30,
  space_between_bars: 0.5,
  x_offset: 0,
  data_loaded: false,
  crosshair_overlay: "",
  volume_canvas: "",
  volume_canvas_overlay: "",
  vol_canvas_share: 0.2,
  overlay_offset: "",
  scrollY_offset: "",
  symbol: "",
  spinner_timmer: false,
  MA_data: {},
  analysis_results: {},
  chart_style: "light",
  chart_data_length: 0,
  LR_avg:4,
  LR_results:{},
  data_view_params:{start:'',end:''}
};

export default (state = initial_state, action) => {
  // console.log(action)
  switch (action.type) {
    case "SET_DATA_VIEW_PARAMS":{
      let {start, end} = action
      return{
        ...state, data_view_params:{start, end}
      }
    }
    case "SET_LR_RESULTS":{
      let result_data = {...state.LR_results}
      let {LR_results, avg, symbol} = action
      if(!result_data[symbol])result_data[symbol]={}

      result_data[symbol][avg] = LR_results

      
      return{
        ...state, LR_results:result_data
      }
    }

    case"SET_LR_AVG":{
      console.log(action)
      return{
        ...state,LR_avg:action.avg
      }
    }
    case "HIGH_LOW": {
      console.log('HIGH LOW REDUCED')
      console.log(action)
      return {
        ...state, analysis_results:{
          ...state.analysis_results, HIGH_LOW:action.data
        }
      };
    }
    case "SET_CANVAS_DIMENTIONS": {
      console.log("SET_CANVAS_DIMENTIONS REDUCER");
      return {
        ...state,
        canvas_width: action.w,
        canvas_height: action.h
      };
    }
    case "SET_X_OFFSET": {
      return { ...state, x_offset: action.x_offset };
    }

    default:
      return state;
  }
};

function high_to_low(a, b, prop) {
  if (deep_value(a, prop) > deep_value(b, prop)) return -1;
  if (deep_value(a, prop) < deep_value(b, prop)) return 1;
  return 0;
}
function low_to_high(a, b, prop) {
  if (deep_value(a, prop) > deep_value(b, prop)) return 1;
  if (deep_value(a, prop) < deep_value(b, prop)) return -1;
  return 0;
}

const deep_value = (obj, path) =>
  path
    .replace(/\[|\]\.?/g, ".")
    .split(".")
    .filter(s => s)
    .reduce((acc, val) => acc && acc[val], obj);
