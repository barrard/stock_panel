const initial_state = {
  filters: {
    Closed: false,
    Open: true,
    Orders: true,
    Canceled:false
  },
  stratNameFilterVal:''
};

export default (state = initial_state, action) => {
  switch (action.type) {
    case "ADD_FILTER": {
      let {filterName, flag} = action
      let filters = {...state.filters}
      filters = {...filters, [filterName]:flag}
      return { ...state, filters };
    }
    case "SET_STRAT_NAME": {
      let {stratName} = action
      return {
        ...state, stratNameFilterVal:stratName
      }

      
    }
    


    default:
      return state;
  }
};
