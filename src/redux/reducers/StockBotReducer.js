// import * as meta_actions from "../actions/meta_actions.js";

const initial_state = {
    trades:[]
  };
  
  export default (state = initial_state, action) => {
    switch (action.type) {
      case "SET_STOCKBOT_TRADES": {
        console.log(action)
        console.log(action)
        console.log(action)
        
      
        return {
          ...state,
          trades: action.trades,
        };
      }
    
      default:
        return state;
    }
  };
  