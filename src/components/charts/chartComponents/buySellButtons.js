import React from "react";
import { connect } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

// import { toastr } from 'react-redux-toastr';
// import { Link, withRouter } from 'react-router-dom';
import styled from "styled-components";
import API from "../../API";
import Socket from "../../Socket.js";
import {
  set_position_size,
  closing_position,
  opening_short,
  opening_long,
} from "../../../redux/actions/meta_actions.js";

import {
  updateCommodityData,
  addCommodityTrade,
  updateCommodityTrade,
} from "../../../redux/actions/stock_actions.js";
//import Main_Layout from '../layouts/Main_Layout.js';
class BuySellButtons extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      size: 1,
    };
  }

  async goLong(size) {
    let symbol = this.props.stock_data.search_symbol;
    // Socket.emit("userGoLong", { symbol, size });
    this.props.dispatch(opening_long(true));
    try {
      let newTrade = await API.goLong({ symbol, size });
      console.log({ newTrade });
      this.props.dispatch(opening_long(false));
      this.props.dispatch(addCommodityTrade(newTrade, newTrade.symbol));
    } catch (err) {
      this.props.dispatch(opening_long(false));

      console.log({ err });
    }

  }
  async goShort(size) {
    let symbol = this.props.stock_data.search_symbol;
    // Socket.emit("userGoShort", { symbol, size });
    try {
      this.props.dispatch(opening_short(true));
      let newTrade = await API.goShort({ symbol, size });
      console.log({ newTrade });
      this.props.dispatch(opening_short(false));
      this.props.dispatch(addCommodityTrade(newTrade, newTrade.symbol));
    } catch (err) {
      this.props.dispatch(opening_short(false));

      console.log(err);
    }
  }
  render() {
    let { dispatch, meta } = this.props;
    let { opening_long, opening_short, position_size } = meta;
    return (
      <>
        <div className="row">
          <div className="col flex">
            <BuyBtn
              opening_long={opening_long}
              goLong={() => this.goLong(position_size)}
            />
            <SellBtn
              opening_short={opening_short}
              goShort={() => this.goShort(position_size)}
            />
            <PositionSize
              value={position_size}
              onChange={(e) => dispatch(set_position_size(e.target.value))}
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

const BuyBtn = ({ opening_long, goLong }) => (
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
        Opening Long...
      </>
    )}
    {!opening_long && "BUY"}
  </OpenLongPosition>
);
const SellBtn = ({ opening_short, goShort }) => (
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
        Opening Short...
      </>
    )}
    {!opening_short && "SELL"}
  </OpenShortPosition>
);

const PositionSize = ({ value, onChange }) => {
  return (
    <div className="input-group">
      <div className="input-group-prepend">
        <span className="input-group-text">SIZE</span>
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
  cursor: ${({ disabled }) => "not-allowed"};
  /* display: inline; */
  color: white;
  background: red;
  /* position: absolute; */
  /* left:100px; */
`;
const OpenLongPosition = styled.button`
  cursor: ${({ disabled }) => "not-allowed"};
  /* display: inline; */
  color: white;
  background: green;
  /* position: absolute; */
  /* left:40px; */
`;
