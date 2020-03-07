import React from "react";
import { connect } from "react-redux";
import { Link, withRouter } from "react-router-dom";
import { matchPath } from "react-router";

import { fetch_selected_chart_data } from "./landingPageComponents/chart_data_utils.js";
import Canvas_Chart from "./charts/Canvas_Chart.js";
import Analysis_Chart from "./charts/Analysis_Chart.js";
import CandleStickChart from "./charts/CandleStickChart.js";
import { view_selected_commodity } from "../components/landingPageComponents/chart_data_utils.js";
import {set_search_symbol} from '../redux/actions/stock_actions.js'
class CommodityChartPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {


    };
  }

  componentDidMount() {
    this.props.dispatch(set_search_symbol(this.props.match.params.symbol))

    this.ensureData()
  }


  ensureData(){
        //https://github.com/ReactTraining/react-router/issues/5870#issuecomment-394194338
        // const match = matchPath(this.props.history.location.pathname, {
        //   path: "/commodity/:symbol",
        //   exact: true,
        //   strict: false
        // });
        let { symbol } = this.props.match.params;
        console.log({symbol})
        console.log(this.props.stock_data.commodity_data)
        let commodityData = this.props.stock_data.commodity_data[symbol]
        let intraday, daily, weekly;
        if(commodityData){
          intraday = commodityData.intraday
          daily = commodityData.daily
          weekly = commodityData.weekly
  
        }
        const props = this.props;
        if(!intraday){
  
          let timeframe = "intraday";
          view_selected_commodity({ timeframe, symbol, props });
        }
        if(!daily){
  
        let timeframe = "daily";
        view_selected_commodity({ timeframe, symbol, props });
        }
        if(!weekly){
  
        let timeframe = "weekly";
        view_selected_commodity({ timeframe, symbol, props });
        }
  }


  render() {
    let { stock_data } = this.props;
    let { symbol } = this.props.match.params;
    let commodityData = stock_data.commodity_data[symbol]
    console.log({stock_data, commodityData, symbol})
    let intradayCommodityData
let dailyCommodityData
let weeklyCommodityData
    if(commodityData){
      
      console.log('got commodities data')
      intradayCommodityData = commodityData['intraday']
      dailyCommodityData = commodityData['daily']
      weeklyCommodityData = commodityData['weekly']

    }
    console.log({intradayCommodityData,
      dailyCommodityData,
      weeklyCommodityData})


    let canvas_width = this.state.canvas_width;

    return (
      <div className="p-5">
        <div className="row ">
        <CandleStickChart
            data={intradayCommodityData}
            width={950}
            height={400}
          />
              <CandleStickChart
            data={dailyCommodityData}
            width={950}
            height={400}
          />
              <CandleStickChart
            data={weeklyCommodityData}
            width={950}
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
