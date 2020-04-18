import React from "react";
import { connect } from "react-redux";
import { toastr } from "react-redux-toastr";
//import { withRouter } from 'next/router';
import { Link, withRouter } from "react-router-dom";
import styled from "styled-components";

//import Main_Layout from '../layouts/Main_Layout.js';
class Contracts extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }
  render() {
    return (
      <>
        <ToggleIndicatorButton
          onClick={() => this.props.toggleIndicators("tradeMarkers")}
          isSet={this.props.visibleIndicators.tradeMarkers}
        >
          TRADES
        </ToggleIndicatorButton>
        <ToggleIndicatorButton
          onClick={() => this.props.toggleIndicators("minMaxMarkers")}
          isSet={this.props.visibleIndicators.minMaxMarkers}
        >
          MARKERS
        </ToggleIndicatorButton>

        <ToggleIndicatorButton
          onClick={() => this.props.toggleIndicators("importantPriceLevel")}
          isSet={this.props.visibleIndicators.importantPriceLevel}
        >
          PRICE LEVELS
        </ToggleIndicatorButton>
        <ToggleIndicatorButton
          onClick={() => this.props.toggleIndicators("regressionLines")}
          isSet={this.props.visibleIndicators.regressionLines}
        >
          Regression Lines
        </ToggleIndicatorButton>

        <ToggleIndicatorButton
          onClick={() => this.props.toggleIndicators("fibonacciLines")}
          isSet={this.props.visibleIndicators.fibonacciLines}
        >
          Fibonacci Lines
        </ToggleIndicatorButton>


        <ToggleIndicatorButton
          onClick={() => this.props.toggleIndicators("ema20")}
          isSet={this.props.visibleIndicators.ema20}
        >
          20 EMA
        </ToggleIndicatorButton>

        <ToggleIndicatorButton
          onClick={() => this.props.toggleIndicators("ema50")}
          isSet={this.props.visibleIndicators.ema50}
        >
          50 EMA
        </ToggleIndicatorButton>
        <ToggleIndicatorButton
          onClick={() => this.props.toggleIndicators("ema200")}
          isSet={this.props.visibleIndicators.ema200}
        >
          200 EMA
        </ToggleIndicatorButton>
      </>
    );
  }
}

function mapStateToProps(state) {
  return state;
}

export default connect(mapStateToProps)(withRouter(Contracts));

let ToggleIndicatorButton = styled.button`
  position: relative;
  top: 0;
  background: ${({ isSet }) => (isSet ? "green" : "red")};
`;
