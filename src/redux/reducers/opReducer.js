const initial_state = {
  alerts:[]
};

export default (state = initial_state, action) => {
  switch (action.type) {
    case "SET_OP_ALERTS": {
      return { ...state, alerts: action.alerts, };
    }
    case "ADD_OP_ALERT": {
      return state
      console.log(state)
      let {alert} = action
      let { exp, putCall, strike, symbol } = alert;
      // let alertMsg = alerts.slice(-1)[0];
      let stateAlerts = {...state.alerts}
      if(!stateAlerts[symbol])stateAlerts[symbol]={}
      if(!stateAlerts[symbol][exp])stateAlerts[symbol][exp]={}
      if(!stateAlerts[symbol][exp][putCall])stateAlerts[symbol][exp][putCall]={}
      stateAlerts[symbol][exp][putCall][strike]=alert
      return { ...state, alerts: {...stateAlerts} };
    }
    


    default:
      return state;
  }
};
