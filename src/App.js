import React from "react";
import { Route, BrowserRouter as Router } from "react-router-dom";
import styled from "styled-components";
import { connect } from "react-redux";
// import { withRouter } from 'react-router'

import "./App.css";
import Socket from "./components/Socket.js";
import QuoteContainer from "./components/QuoteContainer.js";
import StockBot from "./components/Stockbot.js";
// import ChartAnalysis from "./components/ChartAnalysis.js";
import LandingPage from "./components/landingPage.js";
import SignupPage from "./components/SignupPage.js";
import LoginPage from "./components/LoginPage.js";
import StockChart from "./components/StockChartPage.js";
// import MiniCharts from "./components/MiniCharts";
import StratBuilder from "./components/StratBuilder";
import Fundamentals from "./components/Fundamentals";
// import AccountProfile from "./components/AccountProfilePage.js";
import OpAlerts from "./components/OpUnusualVolPage.js";
import OptionContracts from "./components/OptionContracts.js";
import OptionByDate from "./components/OptionByDate.js";
import PixiChart from "./components/charts/pixiChart";
import GptChart from "./components/charts/GptChart";
import BacktestChart from "./components/charts/BacktestChart";
import BacktestResults from "./components/charts/BacktestResults";

import PickList from "./components/PickList.js";

import BidAskStats from "./components/charts/BidAskStats";
import BetterTickChart from "./components/charts/BetterTickChart";
import EconData from "./components/EconData";

import CommodityChartPage from "./components/CommodityChartPage.js";
import defaultFilterList from "./components/QuoteComponents/DefaultFilterList.js";
import Main_Nav from "./components/Main_Nav.js";
import { addOptionAlert } from "./redux/actions/opActions.js";
import {
    updateCommodityData,
    addCommodityTrade,
    // updateCommodityTrade,
    updateStockData,
} from "./redux/actions/stock_actions.js";
import UpdateToastsWithRedirect from "./components/smallComponents/RedirrectToastrUpdates.js";
// import TradeBot from "./components/TradeBot/TradeBot.js";
import API from "./components/API.js";
// let allData = { ES: [], CL: [], GC: [] };
// let i = 0;
// let prices_timer;
// let es_data = { "/ES": {} };

localStorage.setItem("filterList", defaultFilterList);

class App extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            newTickData: {},
        };
    }

    componentDidMount() {
        let { dispatch } = this.props;
        //check if logged in?
        API.isLoggedIn(dispatch);

        // Socket.on("new_minutley_data", (newTickData)=>dispatch(updateCommodityData(newTickData, 'minute')));

        Socket.on("err", (err) => {
            console.log(err);
        });

        Socket.on("opAlert", (newOpAlert) => {
            console.log("Option Alert");
            console.log({ newOpAlert });
            return dispatch(addOptionAlert(newOpAlert));
        });
        Socket.on("stockBotEnterTrade", (newTrade) => {
            console.log("stockBotEnterTrade ENTERING A TRADE");
            return dispatch(addCommodityTrade(newTrade, newTrade.symbol));
        });
    }

    render() {
        const routing = (
            <Router>
                <UpdateToastsWithRedirect />
                <Main_Nav />
                {/* <TradeBot newTickData={this.state.newTickData} /> */}

                <div>
                    <Route exact path="/" component={LandingPage} />
                    <Route
                        exact
                        path="/commodities"
                        // component={QuoteContainer}
                        render={(props) => <QuoteContainer {...props} Socket={Socket} />}
                    />
                    {/* <Route
                        exact
                        path="/mini-charts"
                        // component={QuoteContainer}
                        render={(props) => <MiniCharts {...props} Socket={Socket} />}
                    /> */}
                    <Route
                        exact
                        path="/stockbot"
                        // component={QuoteContainer}
                        render={(props) => <StockBot {...props} Socket={Socket} />}
                    />
                    <Route path="/chart/:symbol" render={(props) => <StockChart {...props} Socket={Socket} />} />
                    <Route path="/commodity/:symbol" render={(props) => <CommodityChartPage {...props} Socket={Socket} />} />
                    <Route path="/op-alerts" render={(props) => <OpAlerts {...props} />} />
                    <Route path="/options/:symbol" render={(props) => <OptionContracts {...props} />} />
                    <Route path="/option-date/:month/:day/:year" render={(props) => <OptionByDate {...props} />} />
                    {/* <Route path="/account-profile" render={(props) => <AccountProfile {...props} Socket={Socket} />} /> */}
                    <Route path="/strat-builder" render={(props) => <StratBuilder {...props} />} />
                    <Route path="/fundamentals" render={(props) => <Fundamentals {...props} />} />
                    <Route path="/pixi-chart" render={(props) => <PixiChart {...props} Socket={Socket} />} />
                    <Route path="/gpt-chart" render={(props) => <GptChart {...props} Socket={Socket} />} />
                    <Route path="/pixi-backtest" render={(props) => <BacktestChart {...props} Socket={Socket} />} />
                    <Route path="/backtest-results" render={(props) => <BacktestResults {...props} Socket={Socket} />} />
                    <Route path="/pick-list" render={(props) => <PickList {...props} Socket={Socket} />} />

                    <Route path="/bid-ask-stats" render={(props) => <BidAskStats {...props} Socket={Socket} />} />
                    <Route path="/better-tick" render={(props) => <BetterTickChart {...props} Socket={Socket} />} />
                    <Route path="/econ-events" render={(props) => <EconData {...props} Socket={Socket} />} />

                    {/* Keep at bottom */}
                    <Route exact path="/sign-up" component={SignupPage} />
                    <Route path="/login" component={LoginPage} />
                </div>
            </Router>
        );

        return <AppContainer>{routing}</AppContainer>;
    }
}

function mapStateToProps(state) {
    return state;
}

export default connect(mapStateToProps)(App);

const AppContainer = styled.div`
    position: relative;
    background: #333;
    color: white;
`;
