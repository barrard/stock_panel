export function set_api_server(api_server) {
  return {
    type: "SET_API_SERVER",
    api_server,
    iex_server: "https://cloud.iexapis.com/stable",
  };
}





export function set_order_limit(order_limit) {
  return {
    type: "SET_ORDER_LIMIT",
    order_limit,
  };
}


export function set_order_stop(order_stop_size) {
  return {
    type: "SET_ORDER_STOP",
    order_stop_size,
  };
}


export function set_order_target(order_target_size) {
  return {
    type: "SET_ORDER_TARGET",
    order_target_size,
  };
}


export function set_order_type(order_type) {
  return {
    type: "SET_ORDER_TYPE",
    order_type,
  };
}

export function set_csrf(csrf) {
  return {
    type: "SET_CSRF",
    csrf,
  };
}

export function show_filter_list(show_filter_list) {
  return {
    type: "TOGGLE_FILTER_LIST",
    show_filter_list,
  };
}

export function set_position_size(position_size) {
  return {
    type: "SET_POSITION_SIZE",
    position_size,
  };
}

export function is_loading(is_loading) {
  return {
    type: "IS_LOADING",
    is_loading,
  };
}

export function closing_position(closing_position) {
  return {
    type: "CLOSING_POSITION",
    closing_position,
  };
}

export function opening_short(opening_short) {
  return {
    type: "OPENING_SHORT",
    opening_short,
  };
}

export function opening_long(opening_long) {
  return {
    type: "OPENING_LONG",
    opening_long,
  };
}
