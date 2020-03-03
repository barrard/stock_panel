// import * as meta_actions from "../actions/meta_actions.js";

const initial_state = {

  
};

export default (state = initial_state, action) => {
  // console.log(action)
  switch (action.type) {
    case "SET_DATA_VIEW_PARAMS":{

      return{
        ...state
      }
    }


    default:
      return state;
  }
};

