import React from 'react';
import { connect } from 'react-redux';
import { toastr } from 'react-redux-toastr';
//import { withRouter } from 'next/router';
import { Link, withRouter } from 'react-router-dom';
import styled, {keyframes} from 'styled-components';


//import Main_Layout from '../layouts/Main_Layout.js';
class LoadingSpinner extends React.Component{
    constructor(props) {
        super(props);
        this.state={}
    }
    render(){
        return(
            <SVG_Spinner  width={this.props.width}
            height={this.props.height} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <Circle cx="50" cy="50" r="45"/>
</SVG_Spinner>
        )
    }
}


function mapStateToProps(state) {
    return state;
}


export default connect(mapStateToProps)(withRouter(LoadingSpinner));

// Create the keyframes
const rotate = keyframes`
 0% {
    transform: rotateZ(0deg);
  }
  100% {
    transform: rotateZ(360deg)
  }
`;

let SVG_Spinner = styled.svg`
position: absolute;
left:0;
 width:${({width})=>width};
 height:${({height})=>height};
 animation: ${rotate} 2s linear infinite;
`
// Create the keyframes
const circleAnimation = keyframes`
  
  15% {
    stroke-dashoffset: 280;
    transform: rotate(0);
  }
  
  50%,
  75% {
    stroke-dashoffset: 75;
    transform: rotate(45deg);
  }
  
  100% {
    stroke-dashoffset: 280;
    transform: rotate(360deg);
  }
`;


let Circle = styled.circle`

  animation: ${circleAnimation} 1.4s ease-in-out infinite both;
  display: block;
  fill: transparent;
  stroke: darkgray;
  stroke-linecap: round;
  stroke-dasharray: 283;
  stroke-dashoffset: 280;
  stroke-width: 10px;
  transform-origin: 50% 50%;
`