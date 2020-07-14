import React from "react";
import { connect } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { TICKS } from "../chartHelpers/utils.js";

// import { toastr } from 'react-redux-toastr';
// import { Link, withRouter } from 'react-router-dom';
import styled from "styled-components";
import API from "../../API";
import Socket from "../../Socket.js";
import {
  set_order_type,
  set_position_size,
  closing_position,
  set_order_target,
  set_order_limit,
  set_order_stop,
  opening_short,
  opening_long,
} from "../../../redux/actions/meta_actions.js";

import {
  updateCommodityData,
  addCommodityTrade,addStockTrade,
  updateCommodityTrade,
} from "../../../redux/actions/stock_actions.js";
//import Main_Layout from '../layouts/Main_Layout.js';
class BuySellButtons extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      size: 1,
      last_price: 0,
    };
  }

  componentDidUpdate(prevProps) {
    // this.handleTickUpdates()
  }

  // handleTickUpdates(){
  //   let { dispatch, meta, stock_data } = this.props;
  //   let { currentTickData, search_symbol } = stock_data;
  //   let currentPrice
  //   if(currentTickData[search_symbol])currentPrice = currentTickData[search_symbol].close
  //   if(currentPrice !==this.state.last_price){

  //     this.setState({last_price:currentPrice})

  //   }
  // }

  async goLong(instrumentType) {
    let symbol = this.props.stock_data.search_symbol;
    let { dispatch, meta, stock_data } = this.props;

    let {
      position_size,
      order_type,
      order_target_size,
      order_stop_size,
      order_limit,
    } = meta;

    this.props.dispatch(opening_long(true));
    try {
      let newTrade = await API.goLong({
        symbol,
        position_size,
        order_type,
        order_target_size,
        order_stop_size,
        order_limit,
        instrumentType,
      });
      console.log({ newTrade });
      if (!newTrade) throw "Didnt get a new trade back from API";
      else if (newTrade.err) throw newTrade.err;
      this.props.dispatch(opening_long(false));
      if(instrumentType === 'commodity'){

        this.props.dispatch(addCommodityTrade(newTrade, newTrade.symbol));
      }else if(instrumentType === 'stock'){

        this.props.dispatch(addStockTrade(newTrade, newTrade.symbol));
      }
    } catch (err) {
      this.props.dispatch(opening_long(false));

      console.error({ err });
    }
  }

  async goShort(instrumentType) {
    let symbol = this.props.stock_data.search_symbol;
    let { dispatch, meta, stock_data } = this.props;

    let {
      position_size,
      order_type,
      order_target_size,
      order_stop_size,
      order_limit,
    } = meta;
    this.props.dispatch(opening_short(true));
    try {
      let newTrade = await API.goShort({
        symbol,
        position_size,
        order_type,
        order_target_size,
        order_stop_size,
        order_limit,
        instrumentType,
      });
      console.log({ newTrade });
      if (!newTrade) throw "Didnt get a new trade back from API";
      else if (newTrade.err) throw newTrade.err;

      this.props.dispatch(opening_short(false));

      if(instrumentType === 'commodity'){

        this.props.dispatch(addCommodityTrade(newTrade, newTrade.symbol));
      }else if(instrumentType === 'stock'){

        this.props.dispatch(addStockTrade(newTrade, newTrade.symbol));
      }

    } catch (err) {
      this.props.dispatch(opening_short(false));

      console.log(err);
    }
  }
  render() {
    let { dispatch, meta, stock_data, instrumentType } = this.props;
    let { currentTickData, search_symbol, currentStockTickData } = stock_data;
    let currentPrice;
    let bidAskData;

    let {
      opening_long,
      opening_short,
      position_size,
      order_type,
      order_target_size,
      order_stop_size,
      order_limit,
    } = meta;
    //****   Ugly code****** */
    if (instrumentType === "commodity") {
      if (currentTickData[search_symbol]) {
        bidAskData = currentTickData[search_symbol]
        currentPrice = bidAskData.close;
        if (!order_limit) {
          dispatch(set_order_limit(currentPrice));
        }
      }
    } else if (instrumentType === "stock") {
      if (currentStockTickData[search_symbol]) {
        bidAskData = currentStockTickData[search_symbol]
        currentPrice = bidAskData.close;
        if (!order_limit) {
          dispatch(set_order_limit(currentPrice));
        }
      }
    } //****   Ugly code****** */

    return (
      <>
        <div className="row flex_center">
          <div className="col-sm-6 flex_center">
            <OrderType
              value={order_type}
              setOrder={(e) => dispatch(set_order_type(e.target.value))}
            />

            <OrderPriceInputs
              tickSize={TICKS[search_symbol]}
              currentPrice={currentPrice}
              position_size={position_size}
              order_Limit={order_limit}
              order_target={order_target_size}
              order_stop={order_stop_size}
              order_type={order_type}
              dispatch={this.props.dispatch}
            />
          </div>
          <div className="col-sm-6 flex_center">
            <PriceBidAsk currentTick={bidAskData} />
          </div>
        </div>
        <div className="row">
          <div className="col flex">
            <BuyBtn
              currentTick={currentTickData[search_symbol]}
              opening_long={opening_long}
              goLong={() => this.goLong(this.props.instrumentType)}
            />
            <SellBtn
              currentTick={currentTickData[search_symbol]}
              opening_short={opening_short}
              goShort={() => this.goShort(this.props.instrumentType)}
            />
          </div>
        </div>
      </>
    );
  }
}

function mapStateToProps(state) {
  return state;
}

export default connect(mapStateToProps)(BuySellButtons);

const OrderPriceInputs = ({
  tickSize,
  currentPrice,
  position_size,
  order_Limit,
  order_target,
  order_stop,
  order_type,
  dispatch,
}) => {
  return (
    <div className="row flex_center">
      <div className="col-sm-12 flex_center">
        <PositionSize
          value={position_size}
          onChange={(e) => dispatch(set_position_size(e.target.value))}
        />
      </div>
      <div className="col-sm-12 flex_center">
        {order_type !== "Market" && (
          <LimitPrice
            tickSize={tickSize}
            limit={order_Limit}
            setLimit={(e) => dispatch(set_order_limit(e.target.value))}
          />
        )}
      </div>
      <div className="col-sm-12 flex_center">
        <TargetInput
          tickSize={tickSize}
          target={order_target}
          setTarget={(e) => dispatch(set_order_target(e.target.value))}
        />
      </div>
      <div className="col-sm-12 flex_center">
        <StopInput
          tickSize={tickSize}
          stop={order_stop}
          setStop={(e) => dispatch(set_order_stop(e.target.value))}
        />
      </div>
    </div>
  );
};

const PriceBidAsk = ({ currentTick }) => {
  if (!currentTick) {
    return <p className="white">...waiting for data</p>;
  } else {
    let { close, bid_prices, ask_prices, bid_sizes, ask_sizes } = currentTick;

    let currentAskPrice = ask_prices.slice(-1)[0];
    let currentBidPrice = bid_prices.slice(-1)[0];
    let currentAskSize = ask_sizes.slice(-1)[0];
    let currentBidSize = bid_sizes.slice(-1)[0];
    let upDownTick =
      close === currentBidPrice
        ? "red"
        : close === currentAskPrice
        ? "green"
        : "grey";

    return (
      <div style={{ width: "inherit" }}>
        <div className="row flex_center">
          <div className="col-sm-6 flex_center">
            <Price price={currentAskPrice} name={"Ask"} />
          </div>
          <div className="col-sm-6 flex_center">
            <Price price={currentAskSize} name={"Size"} />
          </div>
        </div>
        <div className="row flex_center">
          <div className="col-sm-12 flex_center">
            <Price background={upDownTick} price={close} name={"Price"} />
          </div>
        </div>
        <div className="row flex_center">
          <div className="col-sm-6 flex_center">
            <Price price={currentBidPrice} name={"Bid"} />
          </div>
          <div className="col-sm-6 flex_center">
            <Price price={currentBidSize} name={"Size"} />
          </div>
        </div>
      </div>
    );
  }
};

const Price = ({ price, name, background }) => {
  return (
    <div style={{ background: background || "" }}>
      <span className="white">
        {name}
        {":  "}
      </span>

      <DisplayPrice>{price}</DisplayPrice>
    </div>
  );
};

const DisplayPrice = styled.span`
  color: white;
`;

const LimitPrice = ({ limit, setLimit, tickSize }) => {
  return (
    <div className="input-group">
      <div className="input-group-prepend">
        <span style={{ width: "6em" }} className="flex_center input-group-text">
          LIMIT
        </span>
      </div>
      <input
        step={tickSize}
        value={limit}
        onChange={setLimit}
        type="number"
        className="form-control small_input"
        placeholder="Set Limit"
        aria-label="Set Limit"
        aria-describedby="basic-addon1"
      />
    </div>
  );
};

const TargetInput = ({ target, setTarget, tickSize }) => {
  return (
    <div className="input-group">
      <div className="input-group-prepend">
        <span style={{ width: "6em" }} className="flex_center input-group-text">
          TARGET
        </span>
      </div>
      <input
        step={tickSize}
        min="0"
        value={target}
        onChange={setTarget}
        type="number"
        className="form-control small_input"
        placeholder="Set Target"
        aria-label="Set Target"
        aria-describedby="basic-addon1"
      />
    </div>
  );
};

const StopInput = ({ stop, setStop, tickSize }) => {
  return (
    <div className="input-group">
      <div className="input-group-prepend">
        <span style={{ width: "6em" }} className="flex_center input-group-text">
          STOP
        </span>
      </div>
      <input
        step={tickSize}
        min="0"
        value={stop}
        onChange={setStop}
        type="number"
        className="form-control small_input"
        placeholder="Stop Loss"
        aria-label="Stop Loss"
        aria-describedby="basic-addon1"
      />
    </div>
  );
};

const OrderType = ({ value, setOrder }) => {
  let types = ["Market", "Limit", "Stop Limit"];
  let RadioButtons = types.map((type, iType) => {
    return (
      <div className="form-check flex align_items_center pb-1" key={iType}>
        <input
          style={{ width: "25px", height: "25px" }}
          onChange={setOrder}
          className="form-check-input"
          type="checkbox"
          checked={type === value}
          value={type}
          disabled={false} //TODO make order sending thing
        />
        <label className="form-check-label white pl-3" htmlFor={value}>
          {type}
        </label>
      </div>
    );
  });

  return (
    <div className="pl-2" style={{ width: "inherit" }}>
      {RadioButtons}
    </div>
  );
};

const BuyBtn = ({ opening_long, goLong, currentTick }) => {
  let currentOffer = "";

  if (currentTick) currentOffer = currentTick.ask_prices.slice(-1)[0];
  return (
    <OpenLongPosition
      style={{ width: "inherit" }}
      className="btn"
      disabled={opening_long}
      onClick={goLong}
    >
      {opening_long && (
        <>
          {" "}
          <FontAwesomeIcon icon={faSpinner} spin />
          Opening Long... @{currentOffer}
        </>
      )}
      {!opening_long && `BUY ${currentOffer}`}
    </OpenLongPosition>
  );
};
const SellBtn = ({ opening_short, goShort, currentTick }) => {
  let currentBid = "";
  if (currentTick) currentBid = currentTick.bid_prices.slice(-1)[0];
  return (
    <OpenShortPosition
      className="btn"
      style={{ width: "inherit" }}
      disabled={opening_short}
      onClick={goShort}
    >
      {opening_short && (
        <>
          {" "}
          <FontAwesomeIcon icon={faSpinner} spin />
          Opening Short... @{currentBid}
        </>
      )}
      {!opening_short && `SELL ${currentBid}`}
    </OpenShortPosition>
  );
};

const PositionSize = ({ value, onChange }) => {
  return (
    <div className="input-group">
      <div className="input-group-prepend">
        <span style={{ width: "6em" }} className="flex_center input-group-text">
          SIZE
        </span>
      </div>
      <input
        value={value}
        onChange={onChange}
        type="number"
        className="form-control small_input"
        placeholder="Position Size"
        aria-label="Position Size"
        aria-describedby="basic-addon1"
      />
    </div>
  );
};

const OpenShortPosition = styled.button`
  /* cursor: ${({ disabled }) => "not-allowed"}; */
  color: white;
  background: red;
`;
const OpenLongPosition = styled.button`
  /* cursor: ${({ disabled }) => "not-allowed"}; */
  color: white;
  background: green;
`;
