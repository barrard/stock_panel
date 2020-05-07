import React from "react";
import { connect } from "react-redux";
import { Link, withRouter } from "react-router-dom";
import { matchPath } from "react-router";

import { fetch_selected_chart_data } from "./landingPageComponents/chart_data_utils.js";
import Canvas_Chart from "./charts/Canvas_Chart.js";
import Analysis_Chart from "./charts/Analysis_Chart.js";
import CandleStickChart from "./charts/CandleStickChart.js";
import {
  view_selected_commodity,
  getMinutelyCommodityData,
} from "../components/landingPageComponents/chart_data_utils.js";
import { set_search_symbol } from "../redux/actions/stock_actions.js";
import TickCharts from "./charts/chartHelpers/TickCharts.js";
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
    console.log("setChartWidth");
    console.log(window.innerWidth);
    this.setState({
      chartWidth: window.innerWidth * CHART_WIDTH_REDUCER,
    });
  }

  render() {
    console.log("COMMODITY CHARTS PAGE RENDER");
    console.log(this.state.chartWidth);
    let { stock_data } = this.props;
    let { symbol } = this.props.match.params;
    let commodityData = stock_data.commodity_data;
    //[symbol];
    // console.log({stock_data, commodityData, symbol})
    let intradayCommodityData;
    let dailyCommodityData;
    let weeklyCommodityData;
    let minutelyCommodityData;
    // if (commodityData) {
    //   console.log('got commodities data')
    //   minutelyCommodityData = commodityData['minutely']
    //   intradayCommodityData = commodityData["intraday"];
    //   dailyCommodityData = commodityData["daily"];
    //   weeklyCommodityData = commodityData["weekly"];
    // }
    // console.log({minutelyCommodityData, intradayCommodityData,
    //   dailyCommodityData,
    //   weeklyCommodityData})

    let canvas_width = this.state.canvas_width;

    return (
      <div className="p-5">
        <div className="row">
          <TickCharts width={this.state.chartWidth} symbol={symbol} />
        </div>
        <div className="row ">
          <CandleStickChart
            type="commodity"
            symbol={symbol}
            width={this.state.chartWidth}
            height={400}
          />
          {/* <CandleStickChart
            symbol={symbol}
            data={intradayCommodityData}
            width={950}
            height={400}
          />
          <CandleStickChart
          symbol={symbol}  
          data={dailyCommodityData}
            width={950}
            height={400}
          />
          <CandleStickChart
          symbol={symbol}  
          data={weeklyCommodityData}
            width={950}
            height={400}
          /> */}
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
