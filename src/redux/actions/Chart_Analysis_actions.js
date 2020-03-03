export function set_x_offest(x_offset) {
  return {
    type: "SET_X_OFFSET",
    x_offset
  };
}

export function set_canvas_dimentions(w, h) {
  return {
    type: "SET_CANVAS_DIMENTIONS",
    w,
    h
  };
}

export function set_analysis_results(type, data) {
  console.log({ type, data });
  return { type, data };
}

export function set_LR_avg(avg) {
  return {
    type: "SET_LR_AVG",
    avg
  };
}
export function set_LR_results(symbol, LR_results, avg) {
  console.log("set_LR_avg");
  return {
    type: "SET_LR_RESULTS",
    LR_results,
    avg, symbol
  };
}
export function set_data_view_params(start, end) {
  return {
    type: "SET_DATA_VIEW_PARAMS",
    start,
    end
  };
}
