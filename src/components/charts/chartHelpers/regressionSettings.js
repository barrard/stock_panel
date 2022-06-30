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
            isMinimized: true,
        };
    }
    render() {
        let { timeframe, stock_data, updateVolProfile } = this.props;
        // console.log(this.props)
        let symbol = this.props.stock_data.search_symbol;
        let active;
        let settings = stock_data.commodityRegressionData[symbol];
        if (settings && !settings[timeframe]) {
            timeframe = "5Min";
        }
        if (settings) {
            active = settings[timeframe].active;
        } else {
            active = false;
        }
        return (
            <>
                <MinimizeBtn
                    toggle={() =>
                        this.setState({ isMinimized: !this.state.isMinimized })
                    }
                    isMinimized={this.state.isMinimized}
                />
                <CollapsibleDiv isMinimized={this.state.isMinimized}>
                    <div className=" ">
                        <SettingsInputs
                            updateVolProfile={updateVolProfile}
                            settingsData={this.props}
                        />
                    </div>
                    <br />
                    {/* TODO this will come back? */}
                    {/* <ToggleActiveBtn 
        active={active}
          toggle={this.props.setActive}
        /> */}

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
    height: ${({ isMinimized }) => {
        return isMinimized ? "0px" : "";
    }};
    transition: 0.5s all ease-in;
    overflow: hidden;
`;
const MinimizeBtn = ({ isMinimized, toggle }) => {
    let btnTxt = isMinimized ? "SHOW SETTINGS" : "HIDE SETTINGS";

    return <button onClick={toggle}>{btnTxt}</button>;
};
const ToggleActiveBtn = ({ toggle, active }) => {
    let btnText = active ? "Deactivate" : "Set Active";

    return <button onClick={() => toggle()}>{btnText} </button>;
};

function SettingsInputs(props) {
    let { settingsData, updateVolProfile } = props;
    return (
        <div className="">
            <div className="col-sm-12">
                <SettingsUI
                    title="Regression"
                    headings={["MinMax", "error limit"]}
                    inputs={["minMaxTolerance", "regressionErrorLimit"]}
                    settingsData={settingsData}
                />
            </div>
            <div className="col-sm-12">
                <SettingsUI
                    title="Price Level"
                    headings={["MinMax", "tolerance"]}
                    inputs={["priceLevelMinMax", "priceLevelSensitivity"]}
                    settingsData={settingsData}
                />
            </div>
            <div className="col-sm-12">
                <SettingsUI
                    title="Fibonacci"
                    headings={["MinMax", "Sensitivity"]}
                    inputs={["fibonacciMinMax", "fibonacciSensitivity"]}
                    settingsData={settingsData}
                />
            </div>
            <div className="col-sm-12">
                <SettingsUI
                    title="Vol Profile"
                    headings={["Binning", "Bar Count"]}
                    inputs={["volProfileBins", "volProfileBarCount"]}
                    settingsData={settingsData}
                    action={{
                        onClick: updateVolProfile,
                        name: "Update Profile",
                    }}
                />
            </div>
        </div>
    );
}

const SettingsUI = ({ title, headings, inputs, settingsData, action }) => {
    let { updateSettingsValue } = settingsData;
    return (
        <div className="row flex_center">
            <div className="col-sm-3 flex_center">
                <Title title={title} />
            </div>
            <div className="col-sm-5">
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
            <div className="col-sm-2 flex_center">
                {action && (
                    <button onClick={action.onClick}>{action.name}</button>
                )}
            </div>
            <hr className="littleWhiteLine" />
        </div>
    );
};

const Title = ({ title }) => (
    <div>
        <Label>{title}</Label>
    </div>
);

const Heading = ({ heading }) => (
    <div className="col-sm-6 flex_center">
        <Label>{heading}</Label>
    </div>
);

const SettingsInput = ({ value, onChange, step }) => (
    <div className="col-sm-6 flex_center">
        <input
            className="small_input"
            value={value}
            onChange={(e) => onChange(e)}
            type="number"
            step={step || 1}
        />
    </div>
);
