import React from "react";
import { connect } from "react-redux";
import { toastr } from "react-redux-toastr";

import { Link, withRouter } from "react-router-dom";
import styled from "styled-components";
import API from "../../API";
import BuySellButtons from "../chartComponents/buySellButtons.js";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { updateCommodityTrade } from "../../../redux/actions/stock_actions.js";
import {
  closing_position,
  canceling_order,
} from "../../../redux/actions/meta_actions.js";

class TradesList extends React.Component {
  constructor(props) {
    super(props);

    let symbol = props.stock_data.search_symbol;
    let trades = props.trades || [];
    console.log(trades);
    this.state = {
      cancelOrders: [],
      closePositions: [],
      sorted_prop: "entryTime",
      sort_state: true, //0 = low->high 1 = high->low
      number_rows: 30, //starting default
      all_data: [...trades],
    };

    this.load_more_data = this.load_more_data.bind(this);
    this.closePosition = this.closePosition.bind(this);
    this.cancelOrder = this.cancelOrder.bind(this);
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
    let { sorted_prop, sort_state } = this.state;

    if (sort_state) {
      this.setState({
        sort_state: false,
        all_data: this.state.all_data.sort((a, b) =>
          this.high_to_low(a, b, prop)
        ),
        sorted_prop: prop,
      });
    } else {
      this.setState({
        sort_state: true,
        sorted_prop: prop,
        all_data: this.state.all_data.sort((a, b) =>
          this.low_to_high(a, b, prop)
        ),
      });
    }
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

  async cancelOrder(id) {
    let { cancelOrders } = this.state;
    try {
      this.setState({ cancelOrders: [...cancelOrders, id] });

      let canceledOrder = await API.cancelOrder(id);
      if (canceledOrder.resp) {
        canceledOrder = canceledOrder.resp;
        this.props.dispatch(
          updateCommodityTrade(canceledOrder, canceledOrder.symbol)
        );
        this.setState({
          cancelOrders: [...cancelOrders.filter((_id ) => _id !== id)],
        });
      } else if (canceledOrder.err) {
        this.setState({
          cancelOrders: [...cancelOrders.filter((_id) => _id !== id)],
        });
        throw canceledOrder.err;
      }
    } catch (err) {
      this.setState({
        cancelOrders: [...cancelOrders.filter((_id) => _id !== id)],
      });
      console.log({ err });
    }
  }

  async closePosition(id) {
    let { closePositions } = this.state;
    try {
      this.setState({ closePositions: [...closePositions, id] });

      let closedTrade = await API.closePosition(id);
      if (closedTrade.resp) {
        closedTrade = closedTrade.resp;
        this.props.dispatch(
          updateCommodityTrade(closedTrade, closedTrade.symbol)
        );
        this.setState({
          closePositions: [...closePositions.filter((_id) => _id !== id)],
        });
      } else if (closedTrade.err) {
        this.setState({
          closePositions: [...closePositions.filter((_id) => _id !== id)],
        });
        throw closedTrade.err;
      }
    } catch (err) {
      this.setState({
        closePositions: [...closePositions.filter((_id) => _id !== id)],
      });
      console.log({ err });
    }
  }

  render() {
    let { all_data, sorted_prop } = this.state;
    let data = [...all_data]
      // .sort((a, b) => this.high_to_low(a, b, sorted_prop))
      .slice(0, 30); //This could be customizable //TODO
    let symbol = this.props.stock_data.search_symbol;
    let currentQuote = this.props.stock_data.currentTickData[symbol];

    let tradingDay; //variable for the trade list loop
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
          <div className="col2">
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
                let day = new Date(trade_data.orderTime)
                  .toLocaleString()
                  .split(",")[0];
                let DAY; //undefined unless a new Day(date)
                if (!tradingDay) {
                  tradingDay = day;
                  DAY = day;
                } else if (tradingDay != day) {
                  tradingDay = day;
                  DAY = day;
                }
                return (
                  <div key={trade_data._id}>
                    {/* Only render if date is new and defined */}
                    {DAY && <p className="white">{DAY}</p>}
                    <Display_Stock_Row
                      currentQuote={currentQuote}
                      index={index}
                      trade_data={trade_data}
                      props={this.props}
                      closePosition={this.closePosition}
                      closePositions={this.state.closePositions}
                      cancelOrder={this.cancelOrder}
                      cancelOrders={this.state.cancelOrders}
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
  cancelOrder,
  currentQuote,
  cancelOrders,
  closePositions,
}) {

  const {
    PL,
    buyOrSell,
    entryPrice,
    entryTime,
    exitPrice,
    exitTime,
    orderStatus,
    orderTime,
    order_limit,
    order_stop,
    order_target,
    order_type,
    position_size,
    symbol,
    userId,
    _id,
  } = trade_data;

  let class_name = index % 2 == 0 ? "ticker_row_light" : "ticker_row_dark";
  let timeframe = "day";
  let end = new Date().getTime();
  return (
    <div
      className={`row clickable ${class_name}`}
      onClick={() => {
        //TODO??  move the chart and show the order time, stop and loss targets along with entry
        console.log("View Data for");
        console.log(trade_data);
      }}
    >
      {/* SYMBOL */}
      <div className="col flex_center">
        <Symbol symbol={symbol} />
      </div>
      {/* TYPE / STATUS */}
      <div className="col-2 flex_center">
        <StatusAndType order_type={order_type} orderStatus={orderStatus} />
      </div>

      {/* BUYorSell Long or Short*/}
      <div className="col flex_center">
        <BuyOrSell buyOrSell={buyOrSell} />
      </div>

      {/* entryTime */}
      <div className="col flex_center white">
        <EntryTimeLimit
          currentQuote={currentQuote}
          entryTime={entryTime}
          orderLimit={order_limit}
        />
      </div>

      {/* entryPrice */}
      <EntryPrice price={entryPrice} />

      {/* exitPrice */}
      <div className="col-2 flex_center">
        {!exitPrice && (
          <TargetAndStopLoss target={order_target} stop={order_stop} />
        )}
        {!!exitPrice && !!exitTime && <Price price={exitPrice} />}
      </div>

      {/* exitTime */}
      <CancelClosePosition
        closePosition={closePosition}
        closePositions={closePositions}
        cancelOrders={cancelOrders}
        cancelOrder={cancelOrder}
        props={props}
        entryTime={entryTime}
        id={_id}
        exitTime={exitTime}
      />
      {/* PL */}

      <div className="col flex_center">
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

const CancelClosePosition = ({
  cancelOrders,
  closePositions,
  exitTime,
  cancelOrder,
  closePosition,
  id,
  entryTime,
  props,
}) => {
  let isInClosingPositions = closePositions.findIndex((_id) => _id === id);
  let isInCancelingOrders = cancelOrders.findIndex((_id) => _id === id);
  let cancelingOrder = isInCancelingOrders >= 0 ? true : false;
  let closingPosition = isInClosingPositions >= 0 ? true : false;

  return (
    <div className="col flex_center white">
      {!exitTime && !!entryTime && (
        <ClosePositionBtn
          closingPosition={closingPosition}
          closePosition={() => closePosition(id)}
        />
      )}
      {!exitTime && !!!entryTime && (
        <CancelOrderBtn
          cancelingOrder={cancelingOrder}
          cancelOrder={() => cancelOrder(id)}
        />
      )}
      {!!exitTime && <DateTime date={exitTime} />}
    </div>
  );
};
const EntryPrice = ({ price }) => {
  return (
    <div className="col flex_center">
      <Price price={price} />
    </div>
  );
};
const EntryTimeLimit = ({ entryTime, orderLimit, currentQuote }) => {
  if (entryTime) return <DateTime date={entryTime} />;
  else if (orderLimit && currentQuote) {
    let { close } = currentQuote;
    let distanceToEntry = close - orderLimit;
    return (
      <>
        <Price price={orderLimit} />
        <DistanceToEntry price={distanceToEntry} />
      </>
    );
  } else return "";
};

const DistanceToEntry = ({ price }) => {
  return <div style={{ fontSize: "10px" }}>{price}</div>;
};
const TargetAndStopLoss = ({ target, stop }) => {
  return (
    <TargetStopDiv>
      <p>Target: {target}</p>
      <p>Stop: {stop}</p>
    </TargetStopDiv>
  );
};

const ArrowUpDown = ({ isSortedProp, sort_state }) => {
  if (!isSortedProp) return <></>;
  if (sort_state) return <div className="arrow-up" />;
  else return <div className="arrow-down" />;
};

const HeaderTitle = ({
  name,
  title,
  sort_by,
  sort_state,
  sorted_prop,
  col,
}) => {
  col = col || "col";
  return (
    <div style={{    }} className={`align_items_center ${col} flex_center clickable`}>
      <h6 style={{fontSize:'12px'  , textAlign: "center" }} onClick={() => sort_by(name)}>
        {title}
      </h6>
      <ArrowUpDown isSortedProp={sorted_prop == name} sort_state={sort_state} />
    </div>
  );
};

const Stock_List_Header = ({ sort_by, sort_state, sorted_prop }) => {
  return (
    <div className="row white">
      {/* SYMBOL */}
      <HeaderTitle
        name="symbol"
        title="Sym."
        sort_by={sort_by}
        sorted_prop={sorted_prop}
        sort_state={sort_state}
        col={"col"}
      />

      {/* Type / Status */}
      <HeaderTitle
        name="order_type"
        title="Type/Status"
        sort_by={sort_by}
        sorted_prop={sorted_prop}
        sort_state={sort_state}
        col={"col-2"}
      />

      {/* BUYorSell */}
      <HeaderTitle
        name="buyOrSell"
        title="Buy/Sell"
        sort_by={sort_by}
        sorted_prop={sorted_prop}
        sort_state={sort_state}
        col={"col"}
      />

      {/* entryTime */}
      <HeaderTitle
        name="entryTime"
        title="Entry Time"
        sort_by={sort_by}
        sorted_prop={sorted_prop}
        sort_state={sort_state}
        col={"col"}
      />
      {/* entryPrice */}
      <HeaderTitle
        name="entryPrice"
        title="Entry Price"
        sort_by={sort_by}
        sorted_prop={sorted_prop}
        sort_state={sort_state}
        col={"col"}
      />
      {/* exitPrice */}
      <HeaderTitle
        name="exitPrice"
        title="Exit Price"
        sort_by={sort_by}
        sorted_prop={sorted_prop}
        sort_state={sort_state}
        col={"col-2"}
      />
      {/* exitTime */}
      <HeaderTitle
        name="exitTime"
        title="Exit Time"
        sort_by={sort_by}
        sorted_prop={sorted_prop}
        sort_state={sort_state}
        col={"col"}
      />
      {/* PL */}
      <HeaderTitle
        name="PL"
        title="Profit/Loss"
        sort_by={sort_by}
        sorted_prop={sorted_prop}
        sort_state={sort_state}
        col={"col"}
      />
    </div>
  );
};

const DateTime = ({ date }) => {
  if (!date) return <p style={{fontSize:'12px'}}>N/A</p>;
  // if(!new Date(date))
return <p style={{fontSize:'12px'}}>{new Date(date).toLocaleString().split(",")[1]}</p>
};
const ProfitLoss = ({ PL, currentQuote, entryPrice, buyOrSell }) => {
  // console.log({PL, currentQuote, entryPrice, buyOrSell})
  if (!entryPrice)
    return <div style={{fontSize:'12px'}} className="white text_center">Unfilled Order</div>;
  if (!PL && currentQuote && currentQuote.close) {
    let close = currentQuote.close;
    PL = buyOrSell === "Buy" ? close - entryPrice : entryPrice - close;
  }
  return <Price price={PL} />;
};

const Price = ({ price }) => (
  <span style={{fontSize:'12px'}} className="ticker_price">
    ${parseFloat(price).toFixed(2).toLocaleString("en-US")}
  </span>
);

const StatusAndType = ({ orderStatus, order_type }) => {
  let statusColor = orderStatus === "Filled" ? "green" : "red";
  let typeColor =
    order_type === "Market" ? "green" : order_type === "Limit" ? "red" : "blue";

  return (
    <TypeStatusDiv>
      <span style={{ background: typeColor }} className="mr-2 text_center">
        {order_type}
      </span>
      <span style={{ background: statusColor }} className="ml-2 text_center">
        {orderStatus}
      </span>
    </TypeStatusDiv>
  );
};

const BuyOrSell = ({ buyOrSell }) => {
  let longOrShort = buyOrSell === "Buy" ? "Long" : "Short";
  let backGroundColor = longOrShort === "Long" ? "green" : "red";

  return (
    <div style={{ fontSize: "12px" }}>
      <span style={{ background: backGroundColor }} className={`white`}>
        {longOrShort}
      </span>
    </div>
  );
};

const Symbol = ({ symbol }) => <span className="ticker_symbol">{symbol}</span>;

const ClosePositionBtn = ({ closePosition, closingPosition }) => {
  return (
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
  );
};

const CancelOrderBtn = ({ cancelOrder, cancelingOrder }) => {
  return (
    <ClosePositionButton onClick={cancelOrder}>
      {cancelingOrder && (
        <>
          {" "}
          <FontAwesomeIcon icon={faSpinner} spin />
          Canceling...
        </>
      )}
      {!cancelingOrder && "Cancel Order"}
    </ClosePositionButton>
  );
};

const ClosePositionButton = styled.button`
  color: white;
  background: red;
  position: absolute;
  font-size: 10px;
`;

const TargetStopDiv = styled.div`
  display: block;
  color: white;
  text-align: center;
  font-size: 12px;
`;

const TypeStatusDiv = styled.div`
  display: inline-flex;
  color: white;
  font-size: 12px;
`;
