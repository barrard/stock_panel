import React from "react";
import { connect } from "react-redux";
import { toastr } from "react-redux-toastr";
//import { withRouter } from 'next/router';
import { Link, withRouter } from "react-router-dom";
import styled from "styled-components";

class RegressionSettings extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isMinimized:false
    };
  }
  render() {
    let {timeframe, stock_data}= this.props
    // console.log(this.props)
    let symbol = this.props.stock_data.search_symbol;
    let active 
    let settings = stock_data.commodityRegressionData[symbol]
    if(settings){
     active = settings[timeframe].active
    }else{
      active = false
    }
    return (
      <>
      <MinimizeBtn 
      toggle={()=>this.setState({isMinimized:!this.state.isMinimized})}
      isMinimized={this.state.isMinimized}
      />
      <CollapsibleDiv isMinimized={this.state.isMinimized}>

        <div className=" ">
          <SettingsInputs settingsData={this.props} />
        </div>
        <br />
        <ToggleActiveBtn 
        active={active}
          toggle={this.props.setActive}
        />
        <button onClick={() => this.props.saveRegressionSettings()}>
          Save Values{" "}
        </button>
        </CollapsibleDiv>

      </>
    );
  }
}

function mapStateToProps(state) {
  return state;
}

export default connect(mapStateToProps)(withRouter(RegressionSettings));

let Label = styled.span`
  color: white;
  
`;

const CollapsibleDiv = styled.div`
  height:${({isMinimized})=>{
    return isMinimized?'0px':''
  }};
  transition: 0.5s all ease-in;
  overflow:hidden;

`
const MinimizeBtn = ({isMinimized, toggle})=>{
  let btnTxt = isMinimized ? 'SHOW SETTINGS':'HIDE SETTINGS'

  return (
    <button onClick={toggle}>{btnTxt}</button>

  )
}
const ToggleActiveBtn = ({toggle, active})=>{
  let btnText = active ? 'Deactivate':"Set Active"

  return(
    <button onClick={() => toggle()}>{btnText} </button>

  )
}

function SettingsInputs(props) {
  let { settingsData } = props;
  return (
    <div className="row flex_center">
      <SettingsUI
        title="Regression Line Settings"
        headings={["MinMax Regression", "Regression RMS error limit"]}
        inputs={["minMaxTolerance", "regressionErrorLimit"]}
        settingsData={settingsData}
      />
      <SettingsUI
        title="Price Level Settings"
        headings={["Price Level MinMax", "Price level tolerance"]}
        inputs={["priceLevelMinMax", "priceLevelSensitivity"]}
        settingsData={settingsData}
      />
      <SettingsUI
        title="Fibonacci Settings"
        headings={["Fibonacci MinMax", "Fibonacci Sensitivity"]}
        inputs={["fibonacciMinMax", "fibonacciSensitivity"]}
        settingsData={settingsData}
      />
    </div>
  );
}

const SettingsUI = ({ title, headings, inputs, settingsData }) => {
  let { updateSettingsValue } = settingsData;
  return (
    <>
      <Title title={title} />
      <div className="col-sm-8 ">
        {inputs &&
          inputs.map((input, index) => (
            <div className="row flex_center" key={input}>
              <Heading heading={headings[index]} />
              <SettingsInput
                value={settingsData[input]}
                onChange={(e) => {
                  let t = e.target.value;
                  updateSettingsValue(e, input);
                }}
                onInput={(e) => {
                  let t = e.target.value;
                  updateSettingsValue(e, input);
                }}
              />
            </div>
          ))}
      </div>
        <hr className="littleWhiteLine" />
    </>
  );
};


const Title = ({ title }) => (
  <div className="col-sm-4 flex_end ">
    <Label>{title}</Label>
  </div>
);

const Heading = ({ heading }) => (
  <div className="col-sm-4 flex_center">
    <Label>{heading}</Label>
  </div>
);

const SettingsInput = ({ value, onChange, step }) => (
  <div className="col-sm-3 flex_start">
    <input
      className="small_input"
      value={value}
      onChange={(e) => onChange(e)}
      type="number"
      step={step || 1}
    />
  </div>
);