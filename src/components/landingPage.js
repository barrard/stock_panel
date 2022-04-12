import React from "react";
import { connect } from "react-redux";
// import { toastr } from "react-redux-toastr";

import { set_movers } from "../redux/actions/stock_actions.js";
import List_Stock_Data from "./landingPageComponents/List_Stock_Data.js";
import Socket from "./Socket.js";

import API from "../components/API.js";
import {
    updateActives,
    updateLastPrices,
} from "../redux/actions/actives_actions";
class Landing_Page extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            movers: {},
        };
    }

    async componentDidMount() {
        let { dispatch } = this.props;

        console.log("landing");
        // let { movers } = this.props.stock_data;
        // if (!Object.keys(movers).length) {
        //     let movers = await API.getMovers();
        //     if (!movers) return;
        //     movers = await movers.json();
        //     console.log(movers);
        //     this.props.dispatch(set_movers(movers));
        // }
        Socket.on("ACTIVES", (data) => {
            // console.log(data);
            return dispatch(updateActives(data));
        });
        Socket.on("activesQuoteData", (data) => {
            // console.log(data);
            return dispatch(updateLastPrices(data));
        });
    }

    render() {
        // console.log(this.props)
        let { movers } = this.props.stock_data;
        let { actives, lastPrices } = this.props.actives_reducer;
        console.log(actives, lastPrices);
        // console.log({movers})
        return (
            <div className="row flex_center">
                <div className="col-sm-8">
                    <div className="row">
                        <LastPriceQuotes lastPrices={lastPrices} />
                    </div>
                    <div className="row ">
                        {!Object.keys(actives).length && <div>No Data</div>}
                        {Object.keys(actives).map((marketDuration, index) => {
                            // let { down, up } = movers[market];
                            // console.log({down, up})
                            const activesData = actives[marketDuration];
                            const {
                                sampleDuration,
                                startTime,
                                displayTime,
                                ACTIVES,
                            } = activesData;
                            if (!ACTIVES) {
                                return (
                                    <React.Fragment
                                        key={marketDuration}
                                    ></React.Fragment>
                                );
                            }

                            return (
                                <div className="full-width" key={index}>
                                    {ACTIVES.mostShares && (
                                        <List_Stock_Data
                                            title={`${marketDuration} mostShares`}
                                            data={ACTIVES.mostShares}
                                            prices={lastPrices}
                                            props={this.props}
                                        />
                                    )}
                                    {ACTIVES.mostTrades && (
                                        <List_Stock_Data
                                            title={`${marketDuration} mostTrades`}
                                            data={ACTIVES.mostTrades}
                                            prices={lastPrices}
                                            props={this.props}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }
}

function mapStateToProps(state) {
    return state;
}

export default connect(mapStateToProps)(Landing_Page);

function LastPriceQuotes({ lastPrices = {} }) {
    //get  top 30
    //by netChange
    //highest and lowest
    let netChangeLow = getSortedBy(lastPrices, "netChange", true) || [];
    let netChangeHigh = getSortedBy(lastPrices, "netChange", false) || [];
    console.log({ netChangeLow, netChangeHigh });

    function getSortedBy(lastPrices, sortBy, sortOrder) {
        let data = Object.keys(lastPrices);
        console.log(data);
        if (data.length === 0) return false;
        data = data.sort((symbol_a, symbol_b) => {
            // console.log(lastPrices[symbol_a][sortBy]);
            // console.log(lastPrices[symbol_b][sortBy]);
            return sortOrder
                ? lastPrices[symbol_a][sortBy] - lastPrices[symbol_b][sortBy]
                : lastPrices[symbol_b][sortBy] - lastPrices[symbol_a][sortBy];
        });
        console.log(data);

        //confirm
        // data.forEach((symbol) => {
        //     console.log(lastPrices[symbol][sortBy]);
        // });
        // console.log(data);
        return data.slice(0, 10);
    }

    console.log(lastPrices);
    return (
        <>
            <List_Stock_Data
                title={` netChangeLow`}
                data={netChangeLow.reduce((acc, symbol) => {
                    const data = lastPrices[symbol];
                    acc.push(data);
                    return acc;
                }, [])}
            />{" "}
            <List_Stock_Data
                title={` netChangeHigh`}
                data={netChangeHigh.reduce((acc, symbol) => {
                    const data = lastPrices[symbol];
                    acc.push(data);
                    return acc;
                }, [])}
            />
        </>
    );
}
