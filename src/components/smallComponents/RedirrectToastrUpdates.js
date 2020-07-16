import React from 'react';
import { connect } from 'react-redux';
import { toastr } from 'react-redux-toastr';
//import { withRouter } from 'next/router';
import { Link, withRouter } from 'react-router-dom';
import styled from 'styled-components';
import Socket from "../Socket.js";

import {
    updateCommodityData,
    addCommodityTrade,
    updateCommodityTrade,
    updateStockData
  } from "../../redux/actions/stock_actions.js";

//import Main_Layout from '../layouts/Main_Layout.js';
class UpdateToastsWithRedirect extends React.Component{
    constructor(props) {
        super(props);
        this.state={}
    }

    componentDidMount(){
        Socket.on("updateTrade", (updateTrade) => {
            console.log(this.props)
            this.props.dispatch(updateCommodityTrade(updateTrade, this.props.history))
          });
    
    }
    render(){
        return(
            <>
            
            </>
        )
    }
}


function mapStateToProps(state) {
    return state;
}


export default connect(mapStateToProps)(withRouter(UpdateToastsWithRedirect));