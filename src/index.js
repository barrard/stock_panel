import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import { Provider } from "react-redux";
import store from "./redux/store";
import App from "./App";
import ReduxToastr from "react-redux-toastr";

import * as serviceWorker from "./serviceWorker";

ReactDOM.render(
	<Provider store={store}>
		<ReduxToastr
			timeOut={4000}
			newestOnTop={false}
			preventDuplicates
			position="bottom-right"
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
serviceWorker.unregister();
