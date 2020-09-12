import React from "react";
import { connect } from "react-redux";
import { toastr } from "react-redux-toastr";

import { Link, withRouter } from "react-router-dom";
import styled from "styled-components";
import API from "../../API";
import BuySellButtons from "../chartComponents/buySellButtons.js";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import {
  updateCommodityTrade,
  updateStockTrade,
} from "../../../redux/actions/stock_actions.js";
import {
  closing_position,
  canceling_order,
} from "../../../redux/actions/meta_actions.js";

class TradesList extends React.Component {
  constructor(props) {
    super(props);

    let symbol = props.stock_data.search_symbol;
    let trades = props.trades || [];
    // console.log(trades);
    this.state = {
      filters: {
        Open: true,
        Closed: false,
        Orders: true,
      },
      cancelOrders: [],
      closePositions: [],
      sorted_prop: "entryTime",
      sort_state: true, //0 = low->high 1 = high->low
      rowCount: 30,
      startData: 0,
      endData: 30,
    };

    // this.load_more_data = this.load_more_data.bind(this);
    this.closePosition = this.closePosition.bind(this);
    this.cancelOrder = this.cancelOrder.bind(this);
    this.handlePrev = this.handlePrev.bind(this);
    this.handleNext = this.handleNext.bind(this);
    this.handlePageLast = this.handlePageLast.bind(this);
    this.handlePageFirst = this.handlePageFirst.bind(this);
  }

  componentDidUpdate(prevProps, prevSate) {
    // let { sorted_prop } = this.state;
    // let symbol = this.props.stock_data.search_symbol;
    // let prevTrades = prevProps.stock_data.commodityTrades[symbol];
    // let trades = this.props.stock_data.commodityTrades[symbol];
    // if (trades && prevTrades != trades && Array.isArray(trades)) {
    //   this.setState({
    //     all_trades: [...trades],
    //     data: [...trades]
    //       .sort((a, b) => this.high_to_low(a, b, sorted_prop))
    //       .slice(0, 30),
    //   });
    // }
    // let stateTrades = this.state.all_trades;
    // if (Array.isArray(stateTrades) && Array.isArray(trades)) {
    //   stateTrades.forEach((trade, index) => {
    //     if (!trades[index]) return;
    //     if (trade.exitTime !== trades[index].exitTime) {
    //       this.setState({
    //         all_trades: this.props.stock_data.commodityTrades[symbol],
    //       });
    //     }
    //   });
    // }
  }

  high_to_low(a, b, prop) {
    let { aProp, bProp } = dynamicSortHelper(prop, a, b, this.props);
    if (aProp > bProp) return -1;
    if (aProp < bProp) return 1;
    return 0;
  }
  low_to_high(a, b, prop) {
    let { aProp, bProp } = dynamicSortHelper(prop, a, b, this.props);
    if (aProp > bProp) return 1;
    if (aProp < bProp) return -1;
    return 0;
  }

  sort_by(prop) {
    let { sorted_prop, sort_state } = this.state;
    console.log(this.state.all_trades);
    if (sort_state) {
      this.setState({
        sort_state: false,
        // all_trades: this.state.all_trades.sort((a, b) =>
        //   this.high_to_low(a, b, prop)
        // ),
        sorted_prop: prop,
      });
    } else {
      this.setState({
        sort_state: true,
        sorted_prop: prop,
        // all_trades: this.state.all_trades.sort((a, b) =>
        //   this.low_to_high(a, b, prop)
        // ),
      });
    }
  }

  // load_more_data() {
  //   // console.log("LOAD MORE DATA");
  //   const { number_rows } = this.state;
  //   this.setState({
  //     number_rows: this.state.number_rows + 30,
  //   });
  //   /* Wait for next loops cycle to update state... */
  //   setTimeout(() => {
  //     this.sort_by(this.state.sorted_prop, true);
  //   }, 0);
  // }

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
          cancelOrders: [...cancelOrders.filter((_id) => _id !== id)],
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
        let { instrumentType } = closedTrade;
        if (instrumentType === "commodity") {
          this.props.dispatch(
            updateCommodityTrade(closedTrade, closedTrade.symbol)
          );
        } else if (instrumentType === "stock") {
          this.props.dispatch(
            updateStockTrade(closedTrade, closedTrade.symbol)
          );
        }
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

  addFilter = (e) => {
    let val = e.target.value;
    let { filters } = this.state;
    let filterValue = filters[val];
    filters[val] = !filterValue;
    this.setState({ filters });
  };

  filterRadioBtns = ({ filters }) => {
    let trades = this.props.trades;
    let types = ["Closed", "Open", "Orders", "Canceled"];
    let RadioButtons = types.map((type, iType) => {
      let orderStatusType = type;
      if (orderStatusType === "Open") orderStatusType = "Filled";
      else if (orderStatusType === "Orders") orderStatusType = "Open";

      let tradeTypeCount = 0;
      if (trades) {
        tradeTypeCount = trades.filter((t) => t.orderStatus === orderStatusType)
          .length;
      }
      return (
        <div className="form-check inline align_items_center" key={iType}>
          <label
            style={{ marginRight: "1.5em" }}
            className="form-check-label white"
            htmlFor={"Trade Filters"}
          >
            {type} {tradeTypeCount}
          </label>
          <input
            style={{ width: "25px", height: "25px", marginTop: "-0.2em" }}
            onChange={this.addFilter}
            className="form-check-input"
            type="checkbox"
            checked={filters[type]}
            value={type}
            disabled={false} //TODO make order sending thing
          />
        </div>
      );
    });

    return RadioButtons;
  };

  handlePageLast() {
    let { trades } = this.props;
    console.log("go last " + trades.length);
    let endData = trades.length;
    let startData =
      trades.length < this.state.rowCount
        ? 0
        : trades.length - this.state.rowCount;
    console.log({ startData, endData });
    this.setState({
      startData,
      endData,
    });
  }
  handlePageFirst() {
    let { trades } = this.props;
    let endData =
      trades.length > this.state.rowCount ? this.state.rowCount : trades.length;
    this.setState({
      startData: 0,
      endData,
    });
  }

  handleNext() {
    let { trades } = this.props;
    let startData;
    let endData;
    if (this.state.endData === trades.length) {
      endData =
        trades.length > this.state.rowCount
          ? this.state.rowCount
          : trades.length;
      startData = 0;
    } else {
      startData = this.state.startData + this.state.rowCount;
      endData = this.state.endData + this.state.rowCount;
    }
    if (this.state.endData > trades.length) {
      startData = trades.length - this.state.rowCount;
      endData = trades.length;
    }
    this.setState({
      startData,
      endData,
    });
  }
  handlePrev() {
    let { trades } = this.props;
    let startData;
    let endData;
    if (this.state.startData === 0) {
      endData = trades.length;
      startData = trades.length - this.state.rowCount;
    } else {
      endData = this.state.endData - this.state.rowCount;
      startData = this.state.startData - this.state.rowCount;
    }
    if (startData < 0) {
      startData = 0;
      endData = trades.length < 30 ? trades.length : 30;
    }
    this.setState({
      startData,
      endData,
    });
  }

  render() {
    let { sorted_prop, startData, endData, rowCount } = this.state;
    let { handleNext, handlePrev, handlePageFirst, handlePageLast } = this;

    let allTrades = this.props.trades;
    if (!allTrades) allTrades = [];
    let tradesToShow = [...allTrades];

    let { Closed, Open, Orders, Canceled } = this.state.filters;
    if (!Closed)
      tradesToShow = tradesToShow.filter((d) => d.orderStatus !== "Closed");
    if (!Open)
      tradesToShow = tradesToShow.filter((d) => d.orderStatus !== "Filled");
    if (!Orders)
      tradesToShow = tradesToShow.filter((d) => d.orderStatus !== "Open");
    if (!Canceled)
      tradesToShow = tradesToShow.filter((d) => d.orderStatus !== "Canceled");
    let sortFn = this.state.sort_state
      ? (a, b) => this.low_to_high(a, b, sorted_prop)
      : (a, b) => this.high_to_low(a, b, sorted_prop);
    tradesToShow = tradesToShow.sort(sortFn);

    let symbol = this.props.stock_data.search_symbol;
    let currentQuote = this.props.stock_data.currentTickData[symbol];

    let tradingDay; //variable for the trade list loop
    let totalPL = 0;
    allTrades.forEach(({ PL }) => {
      if (PL && !isNaN(PL)) {
        totalPL += PL;
      }
    });
    // console.log(trades)
    let filters = this.state.filters;
    let filterRadioBtns = this.filterRadioBtns({ filters });
    let noTrades = tradesToShow && tradesToShow.length == 0;
    return (
      <>
        <BuySellButtons instrumentType={this.props.instrumentType} />
        {/* <div>No Trades</div>; */}
        {/* Avoid rendering if data array is empty */}
        <div className="">
          <div className="row flex_center">
            <div className="col-sm-3 flex_center">
              <h5 className="white">{symbol}</h5>
            </div>
            <div className="col-sm-3 flex_center">
              <h5 className="white">Total PL {totalPL}</h5>
            </div>
            <div className="col-sm-6 flex_center">
              <FilterRadioContainer>{filterRadioBtns}</FilterRadioContainer>
            </div>
          </div>
          {/* <div className='full-width scroll_x mb-4'> */}
          {!noTrades && (
              <Pagination
                startData={startData}
                endData={endData}
                handleNext={handleNext}
                handlePrev={handlePrev}
                handlePageLast={handlePageLast}
                handlePageFirst={handlePageFirst}
                trades={tradesToShow}
              />
            )}
          <Stock_List_Header
            sorted_prop={this.state.sorted_prop}
            sort_state={this.state.sort_state}
            sort_by={(prop) => this.sort_by(prop)}
            // on_sort={this}
          />
          <div
            className={` container-fluid tradesListMinHeight scroll_y ${
              noTrades ? "flex_center" : " "
            }`}
          >
            {noTrades && (
              <div className="col flex_center">
                <h1>NO TRADES TO DISPLAY</h1>
              </div>
            )}
            {tradesToShow && tradesToShow.length > 0 && (
              <div>
                {tradesToShow
                  .slice(startData, endData)
                  .map((trade_data, index) => {
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
                          startData={startData}
                          endData={endData}
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
            )}
            {!noTrades && (
              <Pagination
                startData={startData}
                endData={endData}
                handleNext={handleNext}
                handlePrev={handlePrev}
                handlePageLast={handlePageLast}
                handlePageFirst={handlePageFirst}
                trades={tradesToShow}
              />
            )}
          </div>
        </div>
      </>
    );
  }
}

function mapStateToProps(state) {
  return state;
}

export default connect(mapStateToProps)(withRouter(TradesList));

const Pagination = ({
  startData,
  endData,
  handleNext,
  handlePrev,
  handlePageLast,
  handlePageFirst,
  trades,
}) => {
  return (
    <div className="row flex_center">
      <div className="col-sm-6 flex_center">
        <button
          onClick={handlePageFirst}
          type="button"
          className="btn btn-primary paginationBtn"
        >
          {"<< "}FIRST 0
        </button>
        <button onClick={handlePrev} type="button" className="btn btn-primary paginationBtn">
          {"< "}PREV {startData}
        </button>
      </div>
      <div className="col-sm-6 flex_center">
        <button onClick={handleNext} type="button" className="btn btn-primary paginationBtn">
          {" "}
          {endData} NEXT {" >"}
        </button>
        <button
          onClick={handlePageLast}
          type="button"
          className="btn btn-primary paginationBtn"
        >
          {" "}
          {trades.length} LAST {" >>"}
        </button>
      </div>
    </div>
  );
};
function Display_Stock_Row({
  startData,
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
      className={`row clickable ${class_name} relative`}
      onClick={() => {
        //TODO??  move the chart and show the order time, stop and loss targets along with entry
        console.log("View Data for");
        console.log(trade_data);
      }}
    >
      {/* SYMBOL */}
      <div className="absolute white">{(index+1)+startData}</div>

      {/* entryTime */}
      <div className="col flex_center white">
        <EntryTimeLimit
          currentQuote={currentQuote}
          entryTime={entryTime}
          orderTime={orderTime}
          orderLimit={order_limit}
        />
      </div>

      {/* TYPE  */}
      <div className="col flex_center">
        <OrderType order_type={order_type} />
      </div>

      {/* STATUS */}
      <div className="col flex_center">
        <OrderStatus orderStatus={orderStatus} />
      </div>

      {/* BUYorSell Long or Short*/}
      <div className="col flex_center">
        <BuyOrSell buyOrSell={buyOrSell} />
      </div>

      {/* entryPrice */}
      <EntryPrice price={entryPrice} orderTime={orderTime} />

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
          exitPrice={exitPrice}
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
const EntryPrice = ({ price, orderTime }) => {
  let el = price ? <Price price={price} /> : <DateTime date={orderTime} />;
  let title = price ? "Entry Price" : "Order Date";
  return (
    <div title={title} className="col flex_center white">
      {el}
    </div>
  );
};
const EntryTimeLimit = ({ entryTime, orderLimit, currentQuote, orderTime }) => {
  if (entryTime) return <DateTime date={entryTime} />;
  else if (orderLimit && currentQuote) {
    let { close } = currentQuote;
    let distanceToEntry = (close - orderLimit).toFixed(2);
    return (
      <div
        title={`@${orderTime}, Current Price is ${distanceToEntry} away from your limit order of ${orderLimit}`}
      >
        <Price price={orderLimit} />
        <DistanceToEntry price={distanceToEntry} />
      </div>
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
    <div
      style={{}}
      className={`align_items_center ${col} flex_center clickable`}
    >
      <h6
        style={{ fontSize: "12px", textAlign: "center" }}
        onClick={() => sort_by(name)}
      >
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
      {/* <HeaderTitle
        name="symbol"
        title="Sym."
        sort_by={sort_by}
        sorted_prop={sorted_prop}
        sort_state={sort_state}
        col={"col"}
      /> */}

      {/* entryTime */}
      <HeaderTitle
        name="entryTime"
        title="Entry Time"
        sort_by={sort_by}
        sorted_prop={sorted_prop}
        sort_state={sort_state}
        col={"col"}
      />

      {/* Type / Status */}
      <HeaderTitle
        name="order_type"
        title="Type"
        sort_by={sort_by}
        sorted_prop={sorted_prop}
        sort_state={sort_state}
        col={"col"}
      />
      {/* Type / Status */}
      <HeaderTitle
        name="orderStatus"
        title="Status"
        sort_by={sort_by}
        sorted_prop={sorted_prop}
        sort_state={sort_state}
        col={"col"}
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
  if (!date) return <p style={{ fontSize: "12px" }}>N/A</p>;
  // if(!new Date(date))
  return (
    <p style={{ fontSize: "12px" }}>
      {new Date(date).toLocaleString().split(",")[1]}
    </p>
  );
};
const ProfitLoss = ({ PL, currentQuote, exitTime, entryPrice, buyOrSell, exitPrice }) => {
  // console.log({PL, currentQuote, entryPrice, buyOrSell})
  if (!entryPrice)
    return (
      <div style={{ fontSize: "12px" }} className="white text_center">
        Unfilled Order
      </div>
    );
  if (!exitTime && !exitPrice && currentQuote && currentQuote.close) {
    let close = currentQuote.close;
    PL = buyOrSell === "Buy" ? close - entryPrice : entryPrice - close;
  }
  let PnL_Color = PL > 0 ? "green" : PL < 0 ? "red" : "white";
  return (
    <ColoredSpan borderColor={PnL_Color}>
      <Price price={PL} />
    </ColoredSpan>
  );
};

const Price = ({ price }) => (
  <span style={{ fontSize: "12px" }} className="ticker_price">
    ${parseFloat(price).toFixed(2).toLocaleString("en-US")}
  </span>
);

const OrderStatus = ({ orderStatus }) => {
  let statusColor =
    orderStatus === "Filled"
      ? "green"
      : orderStatus === "Closed" || orderStatus === "Canceled"
      ? "red"
      : "royalblue";
  return (
    <TypeStatusDiv>
      <ColoredSpan borderColor={statusColor}>{orderStatus}</ColoredSpan>
    </TypeStatusDiv>
  );
};

const OrderType = ({ order_type }) => {
  let typeColor =
    order_type === "Market"
      ? "green"
      : order_type === "Limit"
      ? "red"
      : "royalblue";

  return (
    <TypeStatusDiv>
      <ColoredSpan borderColor={typeColor}>{order_type}</ColoredSpan>
    </TypeStatusDiv>
  );
};

const BuyOrSell = ({ buyOrSell }) => {
  let longOrShort = buyOrSell === "Buy" ? "Long" : "Short";
  let borderColor = longOrShort === "Long" ? "green" : "red";

  return (
    <div style={{ fontSize: "12px" }}>
      <ColoredSpan borderColor={borderColor}>{longOrShort}</ColoredSpan>
    </div>
  );
};

const Symbol = ({ symbol }) => <span className="ticker_symbol">{symbol}</span>;

const ClosePositionBtn = ({ closePosition, closingPosition }) => {
  return (
    <ClosePositionButton onClick={closePosition} border={"goldenrod"}>
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
    <ClosePositionButton onClick={cancelOrder} border="royalblue">
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
  /* position: absolute; */
  font-size: 10px;
  border: ${({ border }) => `2px solid ${border}`};
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

const ColoredSpan = styled.span`
  border-top: ${({ borderColor }) => `2px solid ${borderColor}`};
  border-bottom: ${({ borderColor }) => `2px solid ${borderColor}`};
  padding-top: 1px;
  padding-bottom: 1px;
  border-radius: 5px;
  color: white;
  text-align: center;
`;

const FilterRadioContainer = styled.div`
  margin-top: 0.2em;
`;

function dynamicSortHelper(prop, aData, bData, thisProps) {
  if (prop === "entryTime") {
    return returnDataProps(aData, bData, prop, "orderTime");
  } else if (prop === "entryPrice") {
    return returnDataProps(aData, bData, prop, "order_limit");
  } else if (prop === "PL") {
    let { instrumentType, stock_data } = thisProps;
    let symbol = stock_data.search_symbol;
    let close =
      instrumentType === "commodity"
        ? stock_data.currentTickData[symbol].close
        : stock_data.currentStockTickData[symbol].close;

    let aPnL = aData.entryPrice
      ? aData.buyOrSell === "Buy"
        ? close - aData.entryPrice
        : aData.entryPrice - close
      : 0;
    let bPnL = bData.entryPrice
      ? bData.buyOrSell === "Buy"
        ? close - bData.entryPrice
        : bData.entryPrice - close
      : 0;
    if (aData.orderStatus === "Closed") aPnL = aData.PL;
    if (bData.orderStatus === "Closed") bPnL = bData.PL;
    return {
      aProp: aPnL,
      bProp: bPnL,
    };
  } else {
    return returnDataProps(aData, bData, prop, prop);
  }

  function returnDataProps(aData, bData, prop, altProp) {
    let aProp, bProp;
    if (!aData[prop]) {
      aProp = aData[altProp];
    } else {
      aProp = aData[prop];
    }
    if (!bData[prop]) {
      bProp = bData[altProp];
    } else {
      bProp = bData[prop];
    }
    return { aProp, bProp };
  }
}
