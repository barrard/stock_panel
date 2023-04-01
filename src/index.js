import React from "react";
import ReactDOM from "react-dom";
import reportWebVitals from "./reportWebVitals";

import "./index.css";
import { Provider } from "react-redux";
import store from "./redux/store";
import App from "./App";
import ReduxToastr from "react-redux-toastr";

// import * as serviceWorker from "./serviceWorker";

ReactDOM.render(
    <Provider store={store}>
        <ReduxToastr
            timeOut={6000}
            newestOnTop={false}
            preventDuplicates
            position="bottom-left"
            transitionIn="fadeIn"
            transitionOut="fadeOut"
            progressBar={true}
            showCloseButton={false}
            closeOnToastrClick
        />

        <App />
    </Provider>,
    document.getElementById("root")
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
// serviceWorker.unregister();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
