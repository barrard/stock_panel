import API from "../../components/API.js";

export  function getTrades() {
  return async (dispatch) => {
    let trades = await API.fetchStockBotTrades();
    console.log(trades)
    console.log(trades);
   return dispatch({
      type: "SET_STOCKBOT_TRADES",
      trades,
    })
  };
}
