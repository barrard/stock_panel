import React from "react";
import { connect } from "react-redux";
import { Link, withRouter } from "react-router-dom";
import { matchPath } from "react-router";

import { fetch_selected_chart_data } from "./landingPageComponents/chart_data_utils.js";
import Canvas_Chart from "./charts/Canvas_Chart.js";
import Analysis_Chart from "./charts/Analysis_Chart.js";
import CandleStickChart from "./charts/CandleStickChart.js";
import { view_selected_commodity, getMinutelyCommodityData } from "../components/landingPageComponents/chart_data_utils.js";
import { set_search_symbol } from "../redux/actions/stock_actions.js";
class CommodityChartPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    this.props.dispatch(set_search_symbol(this.props.match.params.symbol));

    // this.ensureData();
  }

  // ensureData() {
  //   console.log('ENSURE DATA')
  //   let { symbol } = this.props.match.params;
  //   let commodityData = this.props.stock_data.commodity_data[symbol];
  //   let minutely, intraday, daily, weekly;
  //   if (commodityData) {
  //     minutely = commodityData.minutely;
  //     intraday = commodityData.intraday;
  //     daily = commodityData.daily;
  //     weekly = commodityData.weekly;
  //   }
  //   const props = this.props;
  //   if (!minutely) {
  //     let timeframe = "minutely";
  //     console.log('GET COMMODITY DATA')
  //     let date = new Date().toLocaleString().split(',')[0].replace('/','-').replace('/','-')
  //     date = '3-13-2020'
  //     getMinutelyCommodityData({date , symbol, props });
  //   }
  //   if (!intraday) {
  //     let timeframe = "intraday";
  //     view_selected_commodity({ timeframe, symbol, props });
  //   }
  //   if (!daily) {
  //     let timeframe = "daily";
  //     view_selected_commodity({ timeframe, symbol, props });
  //   }
  //   if (!weekly) {
  //     let timeframe = "weekly";
  //     view_selected_commodity({ timeframe, symbol, props });
  //   }
  // }

  render() {
    let { stock_data } = this.props;
    let { symbol } = this.props.match.params;
    let commodityData = stock_data.commodity_data
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
        <div className="row ">
          <CandleStickChart
          type="commodity"
            symbol={symbol}
            width={950}
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
