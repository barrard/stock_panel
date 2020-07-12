import React from "react";
import { connect } from "react-redux";
import { Link, withRouter } from "react-router-dom";
import { matchPath } from "react-router";

import { fetch_selected_chart_data } from "./landingPageComponents/chart_data_utils.js";
import Canvas_Chart from "./charts/Canvas_Chart.js";
import Analysis_Chart from "./charts/Analysis_Chart.js";
import CandleStickChart from "./charts/CandleStickChart.js";
import { set_search_symbol } from "../redux/actions/stock_actions.js";
import SEC_Fillings from "./SEC_Fillings.js";
const CHART_WIDTH_REDUCER = 0.9;

class Account_Profile extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      chartWidth: window.innerWidth * CHART_WIDTH_REDUCER,
    };
  }

  componentDidMount() {
    console.log("mounted");
    let symbol = this.props.match.params.symbol;
    this.props.dispatch(set_search_symbol(symbol));
    this.setChartWidth();
    window.addEventListener("resize", this.setChartWidth.bind(this));
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.setChartWidth);
  }

  setChartWidth() {
    this.setState({
      chartWidth: window.innerWidth * CHART_WIDTH_REDUCER,
    });
  }
  componentDidUpdate(prevProps) {
    let currentURL = this.props.match.url;
    let prevURL = prevProps.match.url;
  }

  render() {
    let symbol = this.props.match.params.symbol;

    return (
      <div className="p-5">
        <SEC_Fillings symbol={symbol} width={this.state.chartWidth} />
        <div className="row ">
          <CandleStickChart
            type="stock"
            symbol={symbol}
            width={this.state.chartWidth}
            height={400}
          />
        </div>
      </div>
    );
  }
}

function mapStateToProps(state) {
  const { user, stock_data, meta } = state;
  return { user, stock_data, meta };
}

export default connect(mapStateToProps)(withRouter(Account_Profile));
