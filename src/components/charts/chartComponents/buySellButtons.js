import React from "react";
import { connect } from "react-redux";
// import { toastr } from 'react-redux-toastr';
// import { Link, withRouter } from 'react-router-dom';
import styled from "styled-components";
// import API from "../../API";
import Socket from '../../Socket.js'

//import Main_Layout from '../layouts/Main_Layout.js';
class BuySellButtons extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  async goLong() {
    let symbol = this.props.stock_data.search_symbol;
    Socket.emit('userGoLong', symbol)
    // let resp = await API.goLong(symbol);
  }
  async goShort() {
    let symbol = this.props.stock_data.search_symbol;
    Socket.emit('userGoShort', symbol)
    // let resp = await API.goShort(symbol);
  }
  render() {
    return (
      <>
        <OpenLongPosition onClick={() => this.goLong()}>BUY</OpenLongPosition>
        <OpenShortPosition onClick={() => this.goShort()}>
          SHORT
        </OpenShortPosition>
      </>
    );
  }
}

function mapStateToProps(state) {
  return state;
}

export default connect(mapStateToProps)(BuySellButtons);

const OpenShortPosition = styled.button`
  color: white;
  background: red;
  /* position: absolute; */
  /* left:100px; */
`;
const OpenLongPosition = styled.button`
  color: white;
  background: green;
  /* position: absolute; */
  /* left:40px; */
`;
