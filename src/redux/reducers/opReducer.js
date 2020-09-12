const initial_state = {
  alerts:[]
};

export default (state = initial_state, action) => {
  switch (action.type) {
    case "SET_OP_ALERTS": {
      return { ...state, alerts: action.alerts, };
    }


    default:
      return state;
  }
};
