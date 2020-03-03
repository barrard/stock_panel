// import * as meta_actions from "../actions/meta_actions.js";

const initial_state = {
  queries: [
    {
      MA: "50",
      g_l: "g",
      perc: 20
    },
    {
      MA: "200",
      g_l: "l",
      perc: 2
    }
  ],
  saved_query_results: [],
  saved_queries: [],
  saved_query_results: [],
  current_query_results: [],
  sorted_query_results: [],
  number_rows: 30, //starting default
  sorted_prop: "volume",
  sort_state: false
};

export default (state = initial_state, action) => {
  switch (action.type) {
    case "CLEAR_RESULTS":{
      return{...state, current_query_results:[],
        sorted_query_results:[], number_rows:30}
    }
    case "SORT_BY": {
      const { prop, flag } = action;
      console.log(prop, flag);
      // flag true dont switch sort_state
      const number_rows = state.number_rows;
      let sort_state = state.sort_state;
      /* Flag for not resetting sort_state */
      if (flag) sort_state = !sort_state;
      let sorted_query_results = [];

      if (sort_state) {
        sort_state = false;
        sorted_query_results = state.current_query_results
          .sort((a, b) => high_to_low(a, b, prop))
          .slice(0, number_rows);
      } else {
        sort_state = true;

        sorted_query_results = state.current_query_results
          .sort((a, b) => low_to_high(a, b, prop))
          .slice(0, number_rows);
      }

      return {
        ...state,
        sorted_prop: prop,
        sort_state,
        sorted_query_results
      };
    }
    case "LOAD_MORE_MA_RESULTS": {
      console.log(state.number_rows);
      console.log(state.number_rows);
      let { number_rows } = state;
      number_rows += 30;

      return {
        ...state,
        number_rows
      };
    }
    case "QUERY_SUBMITTED": {
      let { query_results, saved_queries } = action;
      let { saved_query_results } = state;
      saved_query_results.push(query_results);

      const sorted_query_results = query_results.sort((a, b) =>
        high_to_low(a, b, "volume")
      )
      .slice(0, 30);

      return {
        ...state,
        saved_queries,
        saved_query_results,
        current_query_results: query_results,
        sorted_query_results
      };
    }
    case "SET_MA_QUERY": {
      console.log(action);
      const { queries } = action;
      return {
        ...state,
        queries
      };
    }
    case "REMOVE_QUERY": {
      const { queries } = action;

      return { ...state, queries };
    }
    case "ADD_QUERY": {
      const { queries } = action;
      return {
        ...state,
        queries
      };
    }

    default:
      return state;
  }
};

function high_to_low(a, b, prop) {
  if (deep_value(a, prop) > deep_value(b, prop)) return -1;
  if (deep_value(a, prop) < deep_value(b, prop)) return 1;
  return 0;
}
function low_to_high(a, b, prop) {
  if (deep_value(a, prop) > deep_value(b, prop)) return 1;
  if (deep_value(a, prop) < deep_value(b, prop)) return -1;
  return 0;
}

const deep_value = (obj, path) =>
  path
    .replace(/\[|\]\.?/g, ".")
    .split(".")
    .filter(s => s)
    .reduce((acc, val) => acc && acc[val], obj);
