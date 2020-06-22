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
    this.state = {
        size:1
    };
  }

  async goLong(size) {
    let symbol = this.props.stock_data.search_symbol;
    Socket.emit('userGoLong', {symbol, size})
    // let resp = await API.goLong(symbol);
  }
  async goShort(size) {
    let symbol = this.props.stock_data.search_symbol;
    Socket.emit('userGoShort', {symbol, size})
    // let resp = await API.goShort(symbol);
  }
  render() {
      let {size}=this.state
    return (
      <>
        <OpenLongPosition onClick={() => this.goLong(size)}>BUY</OpenLongPosition>
        <OpenShortPosition onClick={() => this.goShort(size)}>
          SHORT
        </OpenShortPosition>
        <input value={this.state.size} 
        onInput={(e)=>this.setState({size:e.target.value})}
        type="number"/>
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
