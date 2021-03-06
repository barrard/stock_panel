import React from "react";
import { connect } from "react-redux";
import { toastr } from "react-redux-toastr";
//import { withRouter } from 'next/router';
import { Link, withRouter } from "react-router-dom";
import styled from "styled-components";
import TickChart from "./TickChartClass.js";
import IndicatorsChart from "./IndicatorsChart.js";
import {TICKS} from '../../../indicators/indicatorHelpers/utils.js'
//import Main_Layout from '../layouts/Main_Layout.js';
class TickCharts extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      priceChangeData: [], //for time and sales
      volumePriceProfile: {},
      LAST_PRICE: 0,
      currentTickData: {},
      showTick:true,
      removeClassTimer:null
    };
  }

  componentDidMount() {
    // console.log("TICK CHARTS DID MOUNT");
    let symbol = this.props.stock_data.search_symbol;
    let minutelyData = this.props.stock_data.commodity_data[symbol];

    // console.log("MINUTE DATA FOR TICK CHARTS");
    // console.log(minutelyData);
  }

  componentWillUnmount(){
    clearTimeout(this.state.removeClassTimer)
  }

  componentDidUpdate(prevProps, prevState) {
    /**
     * Check for new minutely data
     */
    this.checkNewData(prevProps);

    /**
     * Check for new tick data
     */
    this.checkForNewTick(prevProps);
  }

  checkForNewTick(prevProps) {
    let symbol = this.props.symbol;
    let prevTick = prevProps.stock_data.currentTickData[symbol];
    let currentTickData = this.props.stock_data.currentTickData[symbol];
    if (!prevTick || !currentTickData) return;
    let prevPricesCount = prevTick.prices.length;
    let currentPricesCount = currentTickData.prices.length;
    if (prevPricesCount != currentPricesCount) {
      // console.log("NEW TICK");
      // console.log({currentTickData, prevTick});
      let price = currentTickData.prices.slice(-1)[0];
      // console.log(({price, currentPricesCount}))
      if (!this.LAST_PRICE) {
        this.setState({ LAST_PRICE: price });
      } 
        let redGreenClass = "";
        let lastPrice = this.state.LAST_PRICE;
        if (price < lastPrice) {
          //went down
          redGreenClass = "downTick";
        } else if (price > lastPrice) {
          //went up
          redGreenClass = "upTick";
        }else {
          //went up
          redGreenClass = "neutralTick";
        }
        // console.log({ redGreenClass });
    

      currentTickData = this.compilePriceVolumeData([currentTickData]);
      // console.log({currentTickData})
      this.setState({ LAST_PRICE: price, currentTickData, redGreenClass });
      let removeClassTimer = setTimeout(()=>this.setState({redGreenClass:''}), 1000)
      this.setState({removeClassTimer})
    }
  }

  checkNewData(prevProps) {
    let currentSymbol = this.props.symbol;
    let prevSymbol = prevProps.symbol;
    let prevMinuteData = prevProps.stock_data.commodity_data[currentSymbol];
    let currentMinuteData = this.props.stock_data.commodity_data[currentSymbol];
    if ((!prevMinuteData && currentMinuteData) || ( currentMinuteData && currentSymbol !== prevSymbol)) {
      // console.log("I think new data has been loaded");
      // console.log(prevMinuteData);
      // console.log(currentMinuteData);
      // console.log(this.props.stock_data)
      //get LAST_VOL and LAST_PRICE
//This only runs once new data is in, not for each tick
      let { priceChangeData, volumePriceProfile } = this.compilePriceVolumeData(
        currentMinuteData["1Min"].slice(-120)
      );
      // console.log({ priceChangeData, volumePriceProfile });
      this.setState({
        priceChangeData,
        volumePriceProfile,
      });
    }
  }

  compilePriceVolumeData(minuteData) {
    // console.log(minuteData)
    let priceChangeData = [];
    let LAST_VOL = 0;
    let volumePriceProfile = {};
    let LAST_PRICE = 0;
    let TOTAL_UP_VOL = 0;
    let TOTAL_DOWN_VOL = 0;
    let TOTAL_NEUTRAL_VOLUME = 0;

    minuteData.forEach((minute, minuteIndex) => {
      // if(minuteIndex>1)return
      // symbol,
      // prices,
      // vols,
      // sample_times,
      // bid_prices,
      // ask_prices,
      // bid_sizes,
      // ask_sizes,
      minute.prices.forEach((price, i) => {
        if (!LAST_PRICE) {
          LAST_PRICE = minute.prices[i];
          LAST_VOL = minute.vols[i];
        }

        let timestamp = new Date(minute.sample_times[i]).getTime();
        let volumeChange = minute.vols[i] - LAST_VOL;
        // console.log({LAST_VOL, volumeChange})

        let priceChange = minute.prices[i] - LAST_PRICE;
        if (LAST_VOL && LAST_VOL != NaN && !volumePriceProfile[price]) {
          volumePriceProfile[price] = { up: 0, down: 0, neutral: 0 };
        }
        if (priceChange > 0) {
          TOTAL_UP_VOL += volumeChange;
          //some times this is negative, and not good
          if(volumeChange < 0) volumeChange = 0
          volumePriceProfile[price].up += volumeChange;
        } else if (priceChange < 0) {
          if(volumeChange < 0) volumeChange = 0
          TOTAL_DOWN_VOL += volumeChange;
          volumePriceProfile[price].down += volumeChange;
        } else if (priceChange === 0) {
          if(volumeChange < 0) volumeChange = 0
          TOTAL_NEUTRAL_VOLUME += volumeChange;
          volumePriceProfile[price].neutral += volumeChange;
        }

        priceChangeData.push({
          volumeChange,
          price,
          timestamp,
          priceChange,
          TOTAL_NEUTRAL_VOLUME,
          TOTAL_UP_VOL,
          TOTAL_DOWN_VOL,
        });
        LAST_VOL = minute.vols[i];
        LAST_PRICE = minute.prices[i];
      });
    });

    // priceChangeData.sort((a, b)=>b.timestamp-a.timestamp)
    // console.log(priceChangeData[0].timestamp - priceChangeData[1].timestamp);
    // console.log(priceChangeData);
    return { priceChangeData, volumePriceProfile };
  }

  render() {
    let symbol = this.props.stock_data.search_symbol;
    let {showTick} = this.state
    const tickSize = TICKS[symbol];
    //? commodities_quotes[symbol].tick : 0.25;
    if (!showTick) {
      return <div>
                <ToggleTickButton onClick={()=>{
                  this.setState({showTick:!showTick})

                }}>Show Tick Chart</ToggleTickButton>

      </div>;
    } else {
      return (
        <DivContainer>
        <ToggleTickButton onClick={()=>this.setState({showTick:!showTick})}>Hide Tick Chart</ToggleTickButton>
          <TickChart
          type={this.props.type}
          showTick={showTick}
          redGreenClass={this.state.redGreenClass}
            volumePriceProfile={this.state.volumePriceProfile}
            currentTickData={this.state.currentTickData}
            tickSize={tickSize}
            //   localMinMax={allMinMaxValues}
            data={this.state.priceChangeData}
            width={this.props.width}
            height={400}
          />

          <IndicatorsChart
            data={this.state.priceChangeData}
            currentTickData={this.state.currentTickData}

            width={this.props.width}
            height={150}
          />
        </DivContainer>
      );
    }
  }
}

function mapStateToProps(state) {
  return state;
}

export default connect(mapStateToProps)(withRouter(TickCharts));

let ToggleTickButton = styled.button`
  position: absolute;
`
let DivContainer = styled.div`
  position: relative;
`

