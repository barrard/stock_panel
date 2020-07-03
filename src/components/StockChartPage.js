import React from "react";
import { connect } from "react-redux";
import { Link, withRouter } from "react-router-dom";
import { matchPath } from "react-router";

import { fetch_selected_chart_data } from "./landingPageComponents/chart_data_utils.js";
import Canvas_Chart from "./charts/Canvas_Chart.js";
import Analysis_Chart from "./charts/Analysis_Chart.js";
import CandleStickChart from "./charts/CandleStickChart.js";
import {set_search_symbol} from '../redux/actions/stock_actions.js'
import SEC_Fillings from './SEC_Fillings.js'
const CHART_WIDTH_REDUCER = 0.9;

class Account_Profile extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      chartWidth: window.innerWidth * CHART_WIDTH_REDUCER,

      canvas_width: 12
    };
    // this.toggle_wide_mode = this.toggle_wide_mode.bind(this);
  }

  componentDidMount() {
    console.log('mounted')
    let symbol = this.props.match.params.symbol

    this.props.dispatch(set_search_symbol(symbol))
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
  componentDidUpdate(prevProps){
    let currentURL = this.props.match.url
    let prevURL = prevProps.match.url
    // console.log(this.props.match.params.symbol)
    // if(currentURL !== prevURL){
    //   console.log('set data?')
    //   set_search_symbol(this.props.match.params.symbol)
    // }
  }


  // toggle_wide_mode() {
  //   var { canvas_width } = this.state;
  //   canvas_width = canvas_width == 6 ? 12 : 6;
  //   this.setState({ canvas_width });
  // }

  render() {
    // let { stock_data } = this.props;
    let symbol = this.props.match.params.symbol;
    // let stockData = stock_data.charts
    // console.log({symbol, stockData})


    let canvas_width = this.state.canvas_width;

    return (
      <div className="p-5">
          <SEC_Fillings 
                   symbol={symbol}
                   width={this.state.chartWidth}
          />
        <div className="row ">
          <CandleStickChart
          type="stock"
           symbol={symbol}
            width={this.state.chartWidth}
            height={400}
          />

          {/* <div className={`col-sm-${canvas_width} vh_50`}>
            <Analysis_Chart
              toggle_wide_mode={this.toggle_wide_mode}
              canvas_id={`${symbol}_analysis`}
              container_width={this.state.canvas_width}
            />
          </div>

          <div className={`col-sm-${canvas_width} vh_50`}>
            <Canvas_Chart
              toggle_wide_mode={this.toggle_wide_mode}
              canvas_id={symbol}
              container_width={this.state.canvas_width}
            />
          </div> */}
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
