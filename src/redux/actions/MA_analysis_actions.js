import { toastr } from "react-redux-toastr";

export function set_MA_query(queries) {
  return {
    type: "SET_MA_QUERY",
    queries
  };
}
export function add_query(queries) {
  if (queries.length >= 3) return toastr.info("Three is enough");
  let new_query = {
    MA: "50",
    g_l: "g",
    perc: 20
  };
  queries.push(new_query);

  return {
    type: "ADD_QUERY",
    queries
  };
}

export function sort_by(prop, flag) {
  return {
    type: "SORT_BY",
    prop,
    flag
  };
}
export function load_more_MA_results(sorted_prop) {
  
  return async dispatch => {
    dispatch({ type: "IS_LOADING", is_loading: true });

    /* Wait for next loops cycle to update state... */
    setTimeout(() => {
      dispatch({
        type: "SORT_BY", prop:sorted_prop, flag:true
      });
      dispatch({ type: "IS_LOADING", is_loading: false });

    }, 0);
    dispatch({
      type: "LOAD_MORE_MA_RESULTS"
    });
  };
}

export function remove_query(index, queries) {
  queries.splice(index, 1);
  return {
    type: "REMOVE_QUERY",
    queries
  };
}

export function submit_query(query_data, saved_queries) {
  let { query } = query_data;
  return async dispatch => {
    dispatch({ type: "IS_LOADING", is_loading: true });
    /* clear current and sorted results */
    dispatch({type:"CLEAR_RESULTS"})

    try {
      let resp_json = await fetch("/MA-query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
          // "Content-Type": "application/x-www-form-urlencoded",
        },
        body: JSON.stringify(query_data)
      });
      let query_results = await resp_json.json();
      console.log(query_results);

      dispatch({ type: "IS_LOADING", is_loading: false });

      dispatch({
        type: "QUERY_SUBMITTED",
        query_results,
        saved_queries
      });
    } catch (err) {
      console.log("err");
      console.log(err);
      toastr.error("N/A");
    }
  };
}
