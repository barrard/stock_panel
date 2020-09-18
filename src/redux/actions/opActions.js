import API from "../../components/API.js";
import { toastr } from "react-redux-toastr";




// export function getOpSnaps(option) {
//   return async (dispatch) => {
//     // fetchOpAlertData({symbol, strike, exp, putCall})
//     // let alerts = await API.fetchOpAlerts();
//     // alerts = sortAlerts(alerts)
//     return dispatch({
//       type: "GET_OP_SNAPS",
//       option,
//     });
//   };
// }



export function getOpAlerts() {
  return async (dispatch) => {
    let alerts = await API.fetchOpAlerts();
    // alerts = sortAlerts(alerts)
    return dispatch({
      type: "SET_OP_ALERTS",
      alerts,
    });
  };
}



export function addOptionAlert(alert) {
  console.log(alert);
  return
  let { exp, putCall, strike, symbol, timestamp, alerts } = alert;
  let newAlert = alerts.slice(-1)[0]
  let alertMsg = newAlert.alert;
  let toastrOpts = {
    timeOut: 6000,
  };
  toastr.success(
    `Option Alert`,
    `${putCall} ${symbol} ${exp} ${strike}: ${alertMsg}`,
    toastrOpts
  );
  return {
    type: "ADD_OP_ALERT",
    alert,
  };
}



function sortAlerts(alerts) {
  console.log("Sorting / Organizing alerts");
  // let { alerts } = this.props.options;
  if (!alerts.length) return {};
  let sortedAlerts = {};
  alerts.forEach((alert) => {
    let { dateTime, exp, putCall, strike, symbol, timestamp } = alert;
    if (!sortedAlerts[symbol]) {
      sortedAlerts[symbol] = {};
    }
    if (!sortedAlerts[symbol][exp]) {
      sortedAlerts[symbol][exp] = {};
    }
    if (!sortedAlerts[symbol][exp][putCall]) {
      sortedAlerts[symbol][exp][putCall] = {};
    }
    if (!sortedAlerts[symbol][exp][putCall][strike]) {
      sortedAlerts[symbol][exp][putCall][strike] = [];
    }
    sortedAlerts[symbol][exp][putCall][strike] = alert;
  });
  // console.log(sortedAlerts);
  return sortedAlerts;
}
