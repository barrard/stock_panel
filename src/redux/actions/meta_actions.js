export function set_api_server(api_server) {
  return {
    type: "SET_API_SERVER",
    api_server, iex_server:'https://cloud.iexapis.com/stable'
  };
}
export function set_csrf(csrf) {
  return {
    type: "SET_CSRF",
    csrf
  };
}


export function show_filter_list(show_filter_list) {
  return {
    type: "TOGGLE_FILTER_LIST",
    show_filter_list
  };
}



export function is_loading(is_loading) {
  return {
    type: "IS_LOADING",
    is_loading
  };
}
