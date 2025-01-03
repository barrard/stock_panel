import React from "react";
import ReactDOM from "react-dom";
import { Link, withRouter } from "react-router-dom";

import { useParams } from "react-router-dom";
import { view_selected_stock, fetch_sector_data } from "./chart_data_utils.js";
import TotalVolume from "../QuoteComponents/TotalVolume.js";

class List_Stock_Data extends React.Component {
    constructor(props) {
        super(props);

        let { title, data } = props;
        debugger;

        this.state = {
            sorted_prop: "totalVolume",
            sort_state: false, //0 = low->high 1 = high->low
            number_rows: 30, //starting default
            all_data: data,
            data: data.sort((a, b) => this.high_to_low(a, b, "totalVolume")).slice(0, 30),
        };

        // this.load_more_data = this.load_more_data.bind(this);
    }

    high_to_low(a, b, prop) {
        if (a[prop] > b[prop]) return -1;
        if (a[prop] < b[prop]) return 1;
        return 0;
    }
    low_to_high(a, b, prop) {
        if (a[prop] > b[prop]) return 1;
        if (a[prop] < b[prop]) return -1;
        return 0;
    }

    sort_by(prop) {
        debugger;
        //flag true dont switch sort_state
        this.setState({ sorted_prop: prop });
        var sort_state = this.state.sort_state;
        /* Flag for not resetting sort_state */
        // if (flag) sort_state = !sort_state;
        // console.log(this.state.data);
        sort_state = !sort_state;
        // console.log({ sort_state, prop });
        if (sort_state) {
            this.setState({ sort_state: false });
            this.setState({
                data: this.state.all_data.sort((a, b) => this.high_to_low(a, b, prop)),
            });
        } else {
            this.setState({ sort_state: true });
            this.setState({
                data: this.state.all_data.sort((a, b) => this.low_to_high(a, b, prop)),
            });
        }
        this.setState({ sort_state });
    }

    render() {
        let { title, data } = this.props;

        return (
            <>
                {/* Avoid rendering if data array is empty */}
                {data && data.length > 0 && (
                    <div className="col-12">
                        <div className="row flex_center">
                            <h5 className="white">{title}</h5>
                        </div>
                        <Stock_List_Header
                            sorted_prop={this.state.sorted_prop}
                            sort_state={this.state.sort_state}
                            sort_by={(prop) => this.sort_by(prop)}
                            // on_sort={this}
                        />

                        <div className="row_container">
                            {data.map((stock_data, index) => {
                                stock_data.volTradeRatio = stock_data.volume / stock_data.trades;
                                return <Display_Stock_Row key={index} index={index} stock_data={stock_data} props={this.props.props} />;
                            })}
                        </div>
                    </div>
                )}
            </>
        );
    }
}

export default withRouter(List_Stock_Data);

function Display_Stock_Row({ stock_data, index, props }) {
    let { description, lastPrice, marketShare, netChange, netPercentChange, symbol, totalVolume, trades, volume, volTradeRatio } = stock_data;

    let class_name = index % 2 == 0 ? "ticker_row_light" : "ticker_row_dark";
    let timeframe = "day";
    let end = new Date().getTime();
    return (
        <div
            className={`row clickable ${class_name}`}
            onClick={() => {
                console.log("click");
                props.history.push(`/chart/${symbol}`);
                view_selected_stock({ timeframe, end, symbol, props });
            }}
        >
            <div className="col-2 flex">
                <Symbol symbol={description} />
            </div>
            <div className="col-1 flex">
                <Symbol symbol={symbol} />
            </div>

            <div className="col-1 flex_end">
                <Percent_Change percent_change={netPercentChange} />
            </div>
            <div className="col-2 flex_end">
                <Price price={lastPrice} />
            </div>
            <div className="col-2 flex_end">
                <Price price={netChange} />
            </div>

            <div className="col-2 flex_end">
                <Volume vol={volume} />
            </div>
            <div className="col-2 flex_end">
                <Volume vol={volTradeRatio} />
            </div>
            {/* <div className="col-2 flex_end">
                <Volume vol={marketShare} />
            </div> */}
        </div>
    );
}

const Stock_List_Header = ({ sort_by, sort_state, sorted_prop }) => {
    return (
        <div className="row white">
            <div className="align_items_center col-2 flex">
                <h6 onClick={() => sort_by("symbol")}>Sym.</h6>
                {sort_state && sorted_prop == "symbol" && <div className="arrow-up" />}

                {!sort_state && sorted_prop == "symbol" && <div className="arrow-down" />}
            </div>
            <div className="align_items_center col-1 flex">
                <h6 onClick={() => sort_by("symbol")}>Sym.</h6>
                {sort_state && sorted_prop == "symbol" && <div className="arrow-up" />}

                {!sort_state && sorted_prop == "symbol" && <div className="arrow-down" />}
            </div>
            <div className="align_items_center col-1 flex_end">
                <h6 onClick={() => sort_by("netPercentChange")}>Perc.</h6>
                {sort_state && sorted_prop == "netPercentChange" && <div className="arrow-up" />}
                {!sort_state && sorted_prop == "netPercentChange" && <div className="arrow-down" />}{" "}
            </div>
            <div className="align_items_center col-2 flex_end">
                <h6 onClick={() => sort_by("lastPrice")}>Price</h6>
                {sort_state && sorted_prop == "lastPrice" && <div className="arrow-up" />}

                {!sort_state && sorted_prop == "lastPrice" && <div className="arrow-down" />}
            </div>
            <div className="align_items_center col-2 flex_end">
                <h6 onClick={() => sort_by("netChange")}>+/-</h6>
                {sort_state && sorted_prop == "netChange" && <div className="arrow-up" />}

                {!sort_state && sorted_prop == "netChange" && <div className="arrow-down" />}
            </div>
            <div className="align_items_center col-2 flex_end">
                <h6 onClick={() => sort_by("volume")}>Vol.</h6>
                {sort_state && sorted_prop == "volume" && <div className="arrow-up" />}

                {!sort_state && sorted_prop == "volume" && <div className="arrow-down" />}
            </div>
            <div className="align_items_center col-2 flex_end">
                <h6 onClick={() => sort_by("volTradeRatio")}>Vol Pre Trade ratio.</h6>
                {sort_state && sorted_prop == "volTradeRatio" && <div className="arrow-up" />}

                {!sort_state && sorted_prop == "volTradeRatio" && <div className="arrow-down" />}
            </div>
            {/* <div className="align_items_center col-2 flex_end">
                <h6 onClick={() => sort_by("marketShare")}>marketShare.</h6>
                {sort_state && sorted_prop == "marketShare" && <div className="arrow-up" />}

                {!sort_state && sorted_prop == "marketShare" && <div className="arrow-down" />}
            </div> */}
        </div>
    );
};
const Volume = ({ vol }) => {
    if (!vol) vol = 1234;
    return <span className="ticker_vol">{vol.toLocaleString("en-US")}</span>;
};

const Price = ({ price }) => <span className="ticker_price">${parseFloat(price).toFixed(2).toLocaleString("en-US")}</span>;

const Percent_Change = ({ percent_change }) => {
    let class_name;
    if (percent_change > 0) class_name = "percentage_up";
    if (percent_change < 0) class_name = "percentage_down";
    if (percent_change == 0) class_name = "percentage_neutral";
    return <span className={class_name}>{`${parseFloat((percent_change * 100).toLocaleString("en-US")).toFixed(2)}%`}</span>;
};

const Symbol = ({ symbol }) => <span className="ticker_symbol">{symbol}</span>;
