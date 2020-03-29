import React from "react";
import { connect } from "react-redux";
import { toastr } from "react-redux-toastr";
//import { withRouter } from 'next/router';
import { Link, withRouter } from "react-router-dom";
import styled from "styled-components";

class RegressionSettings extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }
  render() {
    let symbol = this.props.stock_data.search_symbol;
    // console.log(this.props);
    return (
      <>
        <div className="row flex_center ">
          <SettingsInputs
            priceLevelSensitivity={this.props.priceLevelSensitivity}
            updatePriceLevelSensitivity={this.props.updatePriceLevelSensitivity}
            minMaxTolerance={this.props.minMaxTolerance}
            updateMinMaxTolerance={this.props.updateMinMaxTolerance}
            regressionErrorLimit={this.props.regressionErrorLimit}
            updateRegressionErrorLimit={this.props.updateRegressionErrorLimit}
            priceLevelMinMax={this.props.priceLevelMinMax}
            updatePriceLevelMinMax={this.props.updatePriceLevelMinMax}
            priceLevelSensitivity={this.props.priceLevelSensitivity}
            updatePriceLevelSensitivity={this.props.updatePriceLevelSensitivity}
          />
          <div className="col-sm-8  white">
            <SettingValuesList
              timeframe={this.props.timeframe}
              setTimeframe={this.props.setTimeframe}
              remove={this.props.remove}
              setRegressionSettings={this.props.setRegressionSettings}
              settings={this.props.stock_data.commodityRegressionData[symbol]}
            />
          </div>
        </div>
        <br />
        <button onClick={() => this.props.reset()}>Reset </button>
        <button onClick={() => this.props.saveRegressionSettings()}>
          Save Values{" "}
        </button>
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

function SettingsInputs(props) {
  return (
    <div className="col-sm-4 ">
      <div className="row flex_center">
        <div className="col-sm-8 flex_end">
          <Label>MinMax Point Tolerance</Label>
        </div>
        <div className="col-sm-4 flex_start">
          <input
            className="small_input"
            value={props.minMaxTolerance}
            onChange={e => props.updateMinMaxTolerance(e)}
            type="number"
          />
        </div>
      </div>
      <div className="row flex_center">
        <div className="col-sm-8 flex_end">
          <Label>Regression RMS error limit</Label>
        </div>
        <div className="col-sm-4 flex_start">
          <input
            className="small_input"
            value={props.regressionErrorLimit}
            onChange={e => props.updateRegressionErrorLimit(e)}
            step="any"
            step="0.1"
            type="number"
          />
        </div>
      </div>
      <div className="row flex_center">
        <div className="col-sm-8 flex_end">
          <Label>Price Level MinMax</Label>
        </div>
        <div className="col-sm-4 flex_start">
          <input
            className="small_input"
            value={props.priceLevelMinMax}
            onChange={e => props.updatePriceLevelMinMax(e)}
            step="1"
            type="number"
          />
        </div>
      </div>
      <div className="row flex_center">
        <div className="col-sm-8 flex_end">
          <Label>Price Level Sensitivity</Label>
        </div>
        <div className="col-sm-4 flex_start">
          <input
            className="small_input"
            value={props.priceLevelSensitivity}
            onChange={e => props.updatePriceLevelSensitivity(e)}
            step="1"
            type="number"
          />
        </div>
      </div>
    </div>
  );
}

function SettingValuesList({
  timeframe,
  settings,
  setRegressionSettings,
  remove,
  setTimeframe
}) {
  // console.log(settings);
  if (!settings) return <div>No Settings Saved</div>;
  let settingsList = settings.map(setting => (
    <SettingsItem
      timeframe={timeframe}
      key={setting._id}
      setting={setting}
      remove={remove}
      setRegressionSettings={setRegressionSettings}
      setTimeframe={setTimeframe}
    />
  ));
  return (
    <div className="row">
      <div className="col-sm-2 flex_center">Timeframe</div>
      <div className="col-sm-3 flex_center">MinMaxTolerance</div>
      <div className="col-sm-3 flex_center">Error limit</div>
      <div className="col-sm-2 flex_center">RUN</div>
      <div className="col-sm-2 flex_center">Delete</div>

      {settingsList}
    </div>
  );
}

const SettingsItem = ({
  timeframe,
  setting,
  setRegressionSettings,
  remove,
  setTimeframe
}) => {
  let {
    minMaxTolerance,
    regressionErrorLimit,
    priceLevelMinMax,
    priceLevelSensitivity
  } = setting;
  // console.log({timeframe, setting})
  return (
    <div
      className="col-sm-12 flex_center clickable highlightOnHover"
      onClick={() =>
        setRegressionSettings({
          minMaxTolerance,
          regressionErrorLimit,
          priceLevelMinMax,
          priceLevelSensitivity
        })
      }
    >
      <div className="col-sm-2 flex_center">{setting.timeframe}</div>
      <div className="col-sm-3 flex_center">{minMaxTolerance}</div>
      <div className="col-sm-3 flex_center">{regressionErrorLimit}</div>
      <div
        className={`col-sm-2 flex_center clickable ${
          setting.timeframe === timeframe ? " goGreenGo " : " "
        }`}
        onClick={() => setTimeframe(setting._id)}
      >
        O
      </div>
      <div
        className="col-sm-2 flex_center clickable red"
        onClick={() => remove(setting._id)}
      >
        X
      </div>
    </div>
  );
};
