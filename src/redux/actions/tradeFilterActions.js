


export function setTradeFilter({filterName, flag}) {
  return {
      type: "ADD_FILTER",
      filterName, flag
  
  };
}



export function setStratNameFilter(stratName) {

  return {
    type: "SET_STRAT_NAME",
    stratName,
  };
}


