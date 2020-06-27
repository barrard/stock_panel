import React from "react";
import { connect } from "react-redux";
import { toastr } from "react-redux-toastr";

import { Link, withRouter } from "react-router-dom";
import styled from "styled-components";
import API from "../../API";
import BuySellButtons from "../chartComponents/buySellButtons.js";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import {updateCommodityTrade} from '../../../redux/actions/stock_actions.js'
import {closing_position} from '../../../redux/actions/meta_actions.js'

class TradesList extends React.Component {
  constructor(props) {
    super(props);

    let symbol = props.stock_data.search_symbol;
    let trades = props.trades || [];
    console.log(trades);
    this.state = {
      sorted_prop: "entryTime",
      sort_state: false, //0 = low->high 1 = high->low
      number_rows: 30, //starting default
      all_data: [...trades],
    };

    this.load_more_data = this.load_more_data.bind(this);
    this.closePosition = this.closePosition.bind(this);
  }

  componentDidUpdate(prevProps, prevSate) {
    let { sorted_prop } = this.state;
    let symbol = this.props.stock_data.search_symbol;
    let prevTrades = prevProps.stock_data.commodityTrades[symbol];
    let trades = this.props.stock_data.commodityTrades[symbol];
    if (trades && prevTrades != trades && Array.isArray(trades)) {
      this.setState({
        all_data: [...trades],
        data: [...trades]
          .sort((a, b) => this.high_to_low(a, b, sorted_prop))
          .slice(0, 30),
      });
    }
    let stateTrades = this.state.all_data;

    if (Array.isArray(stateTrades) && Array.isArray(trades)) {
      stateTrades.forEach((trade, index) => {
        if (!trades[index]) return;
        if (trade.exitTime !== trades[index].exitTime) {
          this.setState({
            all_data: this.props.stock_data.commodityTrades[symbol],
          });
        }
      });
    }
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

  load_more_data() {
    // console.log("LOAD MORE DATA");
    const { number_rows } = this.state;
    this.setState({
      number_rows: this.state.number_rows + 30,
    });
    /* Wait for next loops cycle to update state... */
    setTimeout(() => {
      this.sort_by(this.state.sorted_prop, true);
    }, 0);
  }

  async closePosition(id) {
    try {
      this.props.dispatch(closing_position(true));

      let closedTrade = await API.closePosition(id);
      if(closedTrade.resp){
        closedTrade = closedTrade.resp
        this.props.dispatch(updateCommodityTrade(closedTrade, closedTrade.symbol));
        this.props.dispatch(closing_position(false));
      }else if(closedTrade.err){
        this.props.dispatch(closing_position(false));
        throw closedTrade.err
      }
    } catch (err) {
      this.props.dispatch(closing_position(false));
      console.log({err})
    }

  }

  render() {
    let { all_data, sorted_prop } = this.state;
    let data = [...all_data]
      .sort((a, b) => this.high_to_low(a, b, sorted_prop))
      .slice(0, 30);
    let symbol = this.props.stock_data.search_symbol;
    let currentQuote = this.props.stock_data.currentTickData[symbol];
    // console.log(this.props)
    // console.log({currentQuote})
    let tradingDay; //variable for the trade list loop
    // if (!data.length) return
    let totalPL = 0;
    data.forEach(({ PL }) => {
      if (PL && !isNaN(PL)) {
        totalPL += PL;
      }
    });
    // console.log(data)

    return (
      <>
        <BuySellButtons />
        {/* <div>No Trades</div>; */}
        {/* Avoid rendering if data array is empty */}
        {data && data.length > 0 && (
          <div className="col-12">
            <div className="row flex_center">
              <div className="col-sm-3 flex_center">
                <h5 className="white">{symbol}</h5>
              </div>
              <div className="col-sm-3 flex_center">
                <h5 className="white">Total PL {totalPL}</h5>
              </div>
            </div>
            <Stock_List_Header
              sorted_prop={this.state.sorted_prop}
              sort_state={this.state.sort_state}
              sort_by={(prop) => this.sort_by(prop)}
              // on_sort={this}
            />

            <div className="row_container">
              {data.map((trade_data, index) => {
                let day = new Date(trade_data.entryTime)
                  .toLocaleString()
                  .split(",")[0];
                let DAY;
                if (!tradingDay) {
                  tradingDay = day;
                  DAY = day;
                } else if (tradingDay != day) {
                  tradingDay = day;
                  DAY = day;
                }
                return (
                  <div key={trade_data._id}>
                    <p className="white">{DAY}</p>
                    <Display_Stock_Row
                      currentQuote={currentQuote}
                      index={index}
                      trade_data={trade_data}
                      props={this.props.props}
                      closePosition={this.closePosition}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </>
    );
  }
}

function mapStateToProps(state) {
  return state;
}

export default connect(mapStateToProps)(withRouter(TradesList));

function Display_Stock_Row({
  trade_data,
  index,
  props,
  closePosition,
  currentQuote,
}) {
  const {
    symbol,
    entryTime,
    exitTime,
    PL,
    MaxPL,
    buyOrSell,
    target,
    stop,
    entryPrice,
    exitPrice,
    _id,
  } = trade_data;

  let class_name = index % 2 == 0 ? "ticker_row_light" : "ticker_row_dark";
  let timeframe = "day";
  let end = new Date().getTime();
  return (
    <div
      className={`row clickable ${class_name}`}
      onClick={() => {
        console.log("View Data for");
        console.log(trade_data);
      }}
    >
      {/* SYMBOL */}
      <div className="col-1 flex_center">
        <Symbol symbol={symbol} />
      </div>

      {/* BUYorSell Long or Short*/}
      <div className="col-1 flex_center">
        <BuyOrSell buyOrSell={buyOrSell} />
      </div>

      {/* entryTime */}
      <div className="col-2 flex_center white">
        <DateTime date={entryTime} />
      </div>

      {/* entryPrice */}

      <div className="col-2 flex_center">
        <Price price={entryPrice} />
      </div>
      {/* exitPrice */}
      <div className="col-2 flex_center">
        {!exitPrice && <TargetAndStopLoss target={target} stop={stop} />}
        {exitPrice && <Price price={exitPrice} />}
      </div>

      {/* exitTime */}
      <div className="col-2 flex_center white">
        {!exitTime && (
          <ClosePosition closePosition={()=>closePosition(_id)} />
        )}
        <DateTime date={exitTime} />
      </div>

      {/* PL */}

      <div className="col-2 flex_center">
        <ProfitLoss
          PL={PL}
          currentQuote={currentQuote}
          entryPrice={entryPrice}
          buyOrSell={buyOrSell}
        />
      </div>
    </div>
  );
}

const TargetAndStopLoss = ({ target, stop }) => {
  return (
    <TargetStopDiv>
      <p>Target: {target}</p>
      <p>Stop: {stop}</p>
    </TargetStopDiv>
  );
};

const Stock_List_Header = ({ sort_by, sort_state, sorted_prop }) => {
  return (
    <div className="row white">
      {/* SYMBOL */}
      <div className="align_items_center col-1 flex_center">
        <h6 onClick={() => sort_by("symbol")}>Sym.</h6>
        {sort_state && sorted_prop == "symbol" && <div className="arrow-up" />}

        {!sort_state && sorted_prop == "symbol" && (
          <div className="arrow-down" />
        )}
      </div>
      {/* BUYorSell */}
      <div className="align_items_center col-1 flex_center">
        <h6 onClick={() => sort_by("buyOrSell")}>Buy/Sell</h6>
        {sort_state && sorted_prop == "buyOrSell" && (
          <div className="arrow-up" />
        )}
        {!sort_state && sorted_prop == "buyOrSell" && (
          <div className="arrow-down" />
        )}{" "}
      </div>
      {/* entryTime */}
      <div className="align_items_center col-2 flex_center">
        <h6 onClick={() => sort_by("entryTime")}>Entry Time</h6>
        {sort_state && sorted_prop == "entryTime" && (
          <div className="arrow-up" />
        )}
        {!sort_state && sorted_prop == "entryTime" && (
          <div className="arrow-down" />
        )}{" "}
      </div>
      {/* entryPrice */}

      <div className="align_items_center col-2 flex_center">
        <h6 onClick={() => sort_by("entryPrice")}>Entry Price</h6>
        {sort_state && sorted_prop == "entryPrice" && (
          <div className="arrow-up" />
        )}

        {!sort_state && sorted_prop == "entryPrice" && (
          <div className="arrow-down" />
        )}
      </div>
      {/* exitPrice */}

      <div className="align_items_center col-2 flex_center">
        <h6 onClick={() => sort_by("exitPrice")}>Exit Price</h6>
        {sort_state && sorted_prop == "exitPrice" && (
          <div className="arrow-up" />
        )}

        {!sort_state && sorted_prop == "exitPrice" && (
          <div className="arrow-down" />
        )}
      </div>
      {/* exitTime */}
      <div className="align_items_center col-2 flex_center">
        <h6 onClick={() => sort_by("exitTime")}>Exit Time</h6>
        {sort_state && sorted_prop == "exitTime" && (
          <div className="arrow-up" />
        )}
        {!sort_state && sorted_prop == "exitTime" && (
          <div className="arrow-down" />
        )}{" "}
      </div>

      {/* PL */}

      <div className="align_items_center col-2 flex_center">
        <h6 onClick={() => sort_by("PL")}>Profit/Loss</h6>
        {sort_state && sorted_prop == "PL" && <div className="arrow-up" />}

        {!sort_state && sorted_prop == "PL" && <div className="arrow-down" />}
      </div>
    </div>
  );
};

const DateTime = ({ date }) => {
  if (!date) return <p>N/A</p>;
  // if(!new Date(date))
  return new Date(date).toLocaleString().split(",")[1];
};
const ProfitLoss = ({ PL, currentQuote, entryPrice, buyOrSell }) => {
  // console.log({PL, currentQuote, entryPrice, buyOrSell})
  if (isNaN(PL) && currentQuote && currentQuote.close) {
    let close = currentQuote.close;
    PL = buyOrSell === "Buy" ? close - entryPrice : entryPrice - close;
  }
  return <Price price={PL} />;
};

const Price = ({ price }) => (
  <span className="ticker_price">
    ${parseFloat(price).toFixed(2).toLocaleString("en-US")}
  </span>
);

const BuyOrSell = ({ buyOrSell }) => {
  let longOrShort = buyOrSell === "Buy" ? "Long" : "Short";
  let class_name = longOrShort === "Long" ? "white" : "white";

  return <span className={class_name}>{longOrShort}</span>;
};

const Symbol = ({ symbol }) => <span className="ticker_symbol">{symbol}</span>;

const ClosePosition = ({closePosition, closingPosition})=>(
  <ClosePositionButton onClick={closePosition}>
        {closingPosition && (
      <>
        {" "}
        <FontAwesomeIcon icon={faSpinner} spin />
        Closing...
      </>
    )}
        {!closingPosition && "Close Position"}

            
          </ClosePositionButton>
)

const ClosePositionButton = styled.button`
  color: white;
  background: red;
  position: absolute;
`;

const TargetStopDiv = styled.div`
  display: block;
  color: white;
`;
