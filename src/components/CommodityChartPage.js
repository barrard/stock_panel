import React from "react";
import { connect } from "react-redux";
import { Link, withRouter } from "react-router-dom";

import CandleStickChart from "./charts/CandleStickChart.js";

import { set_search_symbol } from "../redux/actions/stock_actions.js";
// import TickCharts from "./charts/chartHelpers/TickCharts.js";
const CHART_WIDTH_REDUCER = 0.9;
class CommodityChartPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      chartWidth: window.innerWidth * CHART_WIDTH_REDUCER,
    };
  }

  componentDidMount() {
    this.props.dispatch(set_search_symbol(this.props.match.params.symbol));
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

  render() {
    let { symbol } = this.props.match.params;

    return (
      <div className="p-5">
        {/* <div className="row">
          <TickCharts
            type="commodity"
            width={this.state.chartWidth}
            symbol={symbol}
          />
        </div> */}

        <div className="row ">
          <CandleStickChart
            type="commodity"
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

export default connect(mapStateToProps)(withRouter(CommodityChartPage));
