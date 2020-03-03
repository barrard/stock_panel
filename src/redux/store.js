import { createStore, applyMiddleware, compose } from "redux";
// import { composeWithDevTools } from "redux-devtools-extension";
import thunk from "redux-thunk";

import rootReducer from "./reducers";


const reduxDevtools =
  typeof window !== "undefined" && process.env.NODE_ENV !== "production"
    ? window.__REDUX_DEVTOOLS_EXTENSION__ &&
      window.__REDUX_DEVTOOLS_EXTENSION__()
    : f => f;

const enhancers = compose(
  applyMiddleware(thunk),
  reduxDevtools
);



export default createStore(rootReducer, enhancers);

