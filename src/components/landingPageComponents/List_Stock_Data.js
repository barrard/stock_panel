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

        this.state = {
            sorted_prop: "totalVol",
            // sort_state: false, //0 = low->high 1 = high->low

            // all_data: data,
            data: data, //.sort((a, b) => this.high_to_low(a, b, "totalVol")),
        };
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
        var sort_state = !this.state.sort_state;

        if (sort_state) {
            // this.setState({ sort_state: false });
            this.setState({
                data: this.props.data.sort((a, b) => this.high_to_low(a, b, prop)),
            });
        } else {
            // this.setState({ sort_state: true });
            this.setState({
                data: this.props.data.sort((a, b) => this.low_to_high(a, b, prop)),
            });
        }
        this.setState({ sort_state });
    }

    render() {
        let { title } = this.props;
        let { data, sort_state, sorted_prop } = this.state;

        if (sort_state) {
            // this.setState({ sort_state: false });

            data = this.props.data.sort((a, b) => this.high_to_low(a, b, sorted_prop));
        } else {
            // this.setState({ sort_state: true });

            data = this.props.data.sort((a, b) => this.low_to_high(a, b, sorted_prop));
        }

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
    let { askPrice, askSize, bidPrice, bidSize, closePrice, highPrice, lastPrice, lastSize, lowPrice, netChange, netPercentChange, postMarketPercentChange, postMarketnetChange, quoteTime, regMarketQuote, regularMarketNetChange, regularMarketPercentChange, symbol, totalVol, tradeTime, _52weekHigh, _52weekLow } = stock_data;

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
            <div className="col-1 flex">
                <Symbol symbol={symbol} />
            </div>

            <div className="col-1 flex_end">{netPercentChange ? <Percent_Change percent_change={netPercentChange} /> : <>{"no chg"}</>}</div>
            <div className="col-2 flex_end">
                <Price price={lastPrice} />
            </div>
            <div className="col-2 flex_end">
                <Price price={_52weekLow} />
            </div>
            <div className="col-2 flex_end">
                <Price price={_52weekHigh} />
            </div>
            <div className="col-2 flex_end">
                <Price price={netChange} />
            </div>

            <div className="col-2 flex_end">
                <Volume vol={totalVol} />
            </div>
        </div>
    );
}

const Stock_List_Header = ({ sort_by, sort_state, sorted_prop }) => {
    return (
        <div className="row white">
            {/* 1 symbol */}
            <div className="align_items_center col-1 flex">
                <h6 onClick={() => sort_by("symbol")}>Sym.</h6>
                {sort_state && sorted_prop == "symbol" && <div className="arrow-up" />}

                {!sort_state && sorted_prop == "symbol" && <div className="arrow-down" />}
            </div>

            {/* 1  netPercentChange*/}
            <div className="align_items_center col-1 flex_end">
                <h6 onClick={() => sort_by("netPercentChange")}>Perc.</h6>
                {sort_state && sorted_prop == "netPercentChange" && <div className="arrow-up" />}
                {!sort_state && sorted_prop == "netPercentChange" && <div className="arrow-down" />}{" "}
            </div>
            {/* 2 lastPrice*/}
            <div className="align_items_center col-2 flex_end">
                <h6 onClick={() => sort_by("lastPrice")}>Price</h6>
                {sort_state && sorted_prop == "lastPrice" && <div className="arrow-up" />}

                {!sort_state && sorted_prop == "lastPrice" && <div className="arrow-down" />}
            </div>

            {/* 2 _52weekLow*/}
            <div className="align_items_center col-2 flex_end">
                <h6 onClick={() => sort_by("_52weekLow")}>52 Wk Low</h6>
                {sort_state && sorted_prop == "_52weekLow" && <div className="arrow-up" />}

                {!sort_state && sorted_prop == "_52weekLow" && <div className="arrow-down" />}
            </div>

            {/* 2 _52weekHigh*/}
            <div className="align_items_center col-2 flex_end">
                <h6 onClick={() => sort_by("_52weekHigh")}>52 Wk High</h6>
                {sort_state && sorted_prop == "_52weekHigh" && <div className="arrow-up" />}

                {!sort_state && sorted_prop == "_52weekHigh" && <div className="arrow-down" />}
            </div>
            {/* 2 netChange */}
            <div className="align_items_center col-2 flex_end">
                <h6 onClick={() => sort_by("netChange")}>+/-</h6>
                {sort_state && sorted_prop == "netChange" && <div className="arrow-up" />}

                {!sort_state && sorted_prop == "netChange" && <div className="arrow-down" />}
            </div>
            {/* 2 totalVol */}
            <div className="align_items_center col-2 flex_end">
                <h6 onClick={() => sort_by("totalVol")}>Vol.</h6>
                {sort_state && sorted_prop == "totalVol" && <div className="arrow-up" />}

                {!sort_state && sorted_prop == "totalVol" && <div className="arrow-down" />}
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
    return <span className={class_name}>{`${percent_change.toFixed(2)}%`}</span>;
};

const Symbol = ({ symbol }) => <span className="ticker_symbol">{symbol}</span>;
