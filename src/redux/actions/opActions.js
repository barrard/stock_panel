import API from "../../components/API.js";

export  function getOpAlerts() {
  return async (dispatch) => {
    let alerts = await API.fetchOpAlerts();
   return dispatch({
      type: "SET_OP_ALERTS",
      alerts,
    })
  };
}
