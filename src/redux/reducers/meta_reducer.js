// import * as meta_actions from "../actions/meta_actions.js";

const initial_state = {
  csrf:'', is_loading:false,
  api_server:'', show_filter_list:false,
  opening_long:false,opening_short:false, position_size:1,
  closing_position:false
}

export default (state = initial_state, action) => {
  switch (action.type) {
    case 'TOGGLE_FILTER_LIST':{
      return{
        ...state, show_filter_list:action.show_filter_list
      }
    }
    case 'SET_POSITION_SIZE':{
      return{
        ...state, position_size:action.position_size
      }
    }
    case "IS_LOADING":{
      return{
        ...state, is_loading:action.is_loading
      }
    }
    case "OPENING_LONG":{
      return{
        ...state, opening_long:action.opening_long
      }
    }
    case "CLOSING_POSITION":{
      return{
        ...state, closing_position:action.closing_position
      }
    }
    case "OPENING_SHORT":{
      return{
        ...state, opening_short:action.opening_short
      }
    }
    case "CLOSING_POSITION":{
      return{
        ...state, closing_position:action.closing_position
      }
    }
    case "SET_CSRF": {
      return { ...state, csrf: action.csrf };
    }

    case "SET_API_SERVER": {
      const {api_server, iex_server} = action
      return { ...state, api_server, iex_server };
    }

    case 'GET_CSRF': {
      const { csrf } = state;
      return { csrf };
    }

    default:
      return state;
  }
};
