import React from "react";
import ReactDOM from "react-dom";
import { Link, withRouter } from "react-router-dom";

import { useParams } from "react-router-dom";
import {
  view_selected_stock,
  fetch_sector_data
} from "./chart_data_utils.js";
import TotalVolume from "../QuoteComponents/TotalVolume.js";

class List_Stock_Data extends React.Component {
  constructor(props) {
    super(props);

    let { percent, value } = props.data;

    this.state = {
      sorted_prop: "totalVolume",
      sort_state: false, //0 = low->high 1 = high->low
      number_rows: 30, //starting default
      all_data: [...percent, ...value],
      data: [...percent, ...value]
        .sort((a, b) => this.high_to_low(a, b, "totalVolume"))
        .slice(0, 30)
    };
    this.load_more_data = this.load_more_data.bind(this);
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

    //flag true dont switch sort_state
    const number_rows = this.state.number_rows;
    this.setState({ sorted_prop: prop });
    var sort_state = this.state.sort_state;
    /* Flag for not resetting sort_state */
    // if (flag) sort_state = !sort_state;
    console.log(this.state.data)
    sort_state = !sort_state
    console.log({sort_state, prop})
    if (sort_state) {
      this.setState({ sort_state: false });
      this.setState({
        data: this.state.all_data
          .sort((a, b) => this.high_to_low(a, b, prop))
      });
    } else {
      this.setState({ sort_state: true });
      this.setState({
        data: this.state.all_data
          .sort((a, b) => this.low_to_high(a, b, prop))
      });
    }
    this.setState({sort_state})
  }
  
  load_more_data() {
    console.log("LOAD MORE DATA");
    const { number_rows } = this.state;
    this.setState({
      number_rows: this.state.number_rows + 30
    });
    /* Wait for next loops cycle to update state... */
    setTimeout(() => {
      this.sort_by(this.state.sorted_prop, true);
    }, 0);
  }

  render() {
    const data = this.state.data;

    const { title } = this.props;
    // console.log(this.props)
    // console.log(this.props.title)

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
              sort_by={prop => this.sort_by(prop)}
              // on_sort={this}
            />

            <div className="row_container">
              {data.map((stock_data, index) => (
                <Display_Stock_Row
                  key={index}
                  index={index}
                  stock_data={stock_data}
                  props={this.props.props}
                />
              ))}
            </div>
          </div>
        )}
      </>
    );
  }
}

export default withRouter(List_Stock_Data)


function Display_Stock_Row({ stock_data, index, props }) {
  // console.log({stock_data})
  const {
    symbol,
    last,
    change,
    totalVolume,
    description,
    direction
  } = stock_data;
  let class_name = index % 2 == 0 ? "ticker_row_light" : "ticker_row_dark";
  let timeframe = "day";
  let end = new Date().getTime();
  return (
    <div
      className={`row clickable ${class_name}`}
      onClick={() =>
        props.history.push(`/chart/${symbol}`)
        // view_selected_stock({ timeframe, end, symbol, props })
      }
    >
      <div className="col-2 flex">
        <Symbol symbol={symbol} />
      </div>

      <div className="col-3 flex_end">
        <Percent_Change precent_change={change} />
      </div>
      <div className="col-3 flex_end">
        <Price price={last} />
      </div>

      <div className="col-4 flex_end">
        <Volume vol={totalVolume} />
      </div>
    </div>
  );
}

const Stock_List_Header = ({ sort_by, sort_state, sorted_prop }) => {
  return (
    <div className="row white">
      <div className="align_items_center col-2 flex">
        <h6 onClick={() => sort_by("symbol")}>Sym.</h6>
        {sort_state && sorted_prop == "symbol" && <div className="arrow-up" />}

        {!sort_state && sorted_prop == "symbol" && (
          <div className="arrow-down" />
        )}
      </div>
      <div className="align_items_center col-3 flex_end">
        <h6 onClick={() => sort_by("change")}>Perc.</h6>
        {sort_state && sorted_prop == "change" && <div className="arrow-up" />}
        {!sort_state && sorted_prop == "change" && (
          <div className="arrow-down" />
        )}{" "}
      </div>
      <div className="align_items_center col-3 flex_end">
        <h6 onClick={() => sort_by("last")}>Price</h6>
        {sort_state && sorted_prop == "last" && <div className="arrow-up" />}

        {!sort_state && sorted_prop == "last" && <div className="arrow-down" />}
      </div>
      <div className="align_items_center col-4 flex_end">
        <h6 onClick={() => sort_by("totalVolume")}>Vol.</h6>
        {sort_state && sorted_prop == "totalVolume" && (
          <div className="arrow-up" />
        )}

        {!sort_state && sorted_prop == "totalVolume" && (
          <div className="arrow-down" />
        )}
      </div>
    </div>
  );
};
const Volume = ({ vol }) => {
  if (!vol) vol = 1234;
  return <span className="ticker_vol">{vol.toLocaleString("en-US")}</span>;
};

const Price = ({ price }) => (
  <span className="ticker_price">
    $
    {parseFloat(price)
      .toFixed(2)
      .toLocaleString("en-US")}
  </span>
);

const Percent_Change = ({ precent_change }) => {
  let class_name;
  if (precent_change > 0) class_name = "percentage_up";
  if (precent_change < 0) class_name = "percentage_down";
  if (precent_change == 0) class_name = "percentage_neutral";
  return (
    <span className={class_name}>
      {`${parseFloat((precent_change * 100).toLocaleString("en-US")).toFixed(
        2
      )}%`}
    </span>
  );
};

const Symbol = ({ symbol }) => <span className="ticker_symbol">{symbol}</span>;
