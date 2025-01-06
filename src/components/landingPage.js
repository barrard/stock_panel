import React from "react";
import { connect } from "react-redux";
// import { toastr } from "react-redux-toastr";

import { set_movers, setScanMovers } from "../redux/actions/stock_actions.js";
import List_Stock_Data from "./landingPageComponents/List_Stock_Data.js";
import Socket from "./Socket.js";

import API from "../components/API.js";
import { updateActives, updateLastPrices } from "../redux/actions/actives_actions";
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
        Socket.on("movers", (data) => {
            return dispatch(set_movers(data));
        });
        Socket.on("scannerMovers", (data) => {
            console.log(data);
            return dispatch(setScanMovers(data));
        });
        Socket.on("activesQuoteData", (data) => {
            // console.log(data);
            return dispatch(updateLastPrices(data));
        });
    }

    componentWillUnmount() {
        Socket.off("movers");
        Socket.off("activesQuoteData");
        Socket.off("scannerMovers");
    }

    render() {
        let { movers, scan_movers } = this.props.stock_data;

        return (
            <div className="row flex_center">
                <div className="col-sm-8">
                    {/* <div className="row">
                        <LastPriceQuotes lastPrices={lastPrices} />
                    </div> */}

                    <div className="row ">
                        {!Object.keys(scan_movers).length && <div>No Data</div>}
                        {Object.keys(scan_movers).map((type, index) => {
                            // let { down, up } = scan_movers[market];
                            // console.log({down, up})
                            const activesData = scan_movers[type];

                            return (
                                <div className="full-width" key={index}>
                                    <List_Stock_Data title={`${type}`} data={activesData} props={this.props} />
                                </div>
                            );
                        })}
                    </div>

                    <div className="row ">
                        {!Object.keys(movers).length && <div>No Data</div>}
                        {Object.keys(movers).map((marketIndex, index) => {
                            // let { down, up } = movers[market];
                            // console.log({down, up})
                            const activesData = movers[marketIndex];
                            const { PERCENT_CHANGE_DOWN, PERCENT_CHANGE_UP, TRADES, VOLUME } = activesData;
                            if (!PERCENT_CHANGE_DOWN) {
                                return <React.Fragment key={marketIndex}></React.Fragment>;
                            }

                            return (
                                <div className="full-width" key={index}>
                                    {/* {PERCENT_CHANGE_DOWN && <List_Stock_Data title={`${marketIndex} PERCENT_CHANGE_DOWN`} data={PERCENT_CHANGE_DOWN} props={this.props} />}
                                    {PERCENT_CHANGE_UP && <List_Stock_Data title={`${marketIndex} PERCENT_CHANGE_UP`} data={PERCENT_CHANGE_UP} props={this.props} />}
                                    {TRADES && <List_Stock_Data title={`${marketIndex} TRADES`} data={TRADES} props={this.props} />}
                                    {VOLUME && <List_Stock_Data title={`${marketIndex} VOLUME`} data={VOLUME} props={this.props} />} */}
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
            return sortOrder ? lastPrices[symbol_a][sortBy] - lastPrices[symbol_b][sortBy] : lastPrices[symbol_b][sortBy] - lastPrices[symbol_a][sortBy];
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
