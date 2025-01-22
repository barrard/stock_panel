import React from "react";
import styled from "styled-components";
import PropTypes from "prop-types";

const TickCombineControl = ({ value = 1, onChange }) => {
    return (
        <ControlContainer>
            <Label>
                Tick Combine: <Value>{value}</Value>
            </Label>
            <RangeContainer>
                <Range type="range" min="0" step="5" max="20" value={value} onChange={(e) => onChange(parseInt(e.target.value))} />
                <TickMarks>
                    <Tick>1</Tick>
                    <Tick>5</Tick>
                    <Tick>10</Tick>
                    <Tick>15</Tick>
                    <Tick>20</Tick>
                </TickMarks>
            </RangeContainer>
        </ControlContainer>
    );
};

TickCombineControl.propTypes = {
    value: PropTypes.number,
    onChange: PropTypes.func.isRequired,
};

const ControlContainer = styled.div`
    margin: 1em 0;
    width: 300px;
`;

const Label = styled.div`
    margin-bottom: 0.5em;
    display: flex;
    align-items: center;
`;

const Value = styled.span`
    margin-left: 8px;
    font-weight: bold;
    min-width: 2em;
`;

const RangeContainer = styled.div`
    padding: 0 10px;
`;

const Range = styled.input`
    width: 100%;
    margin: 10px 0;
`;

const TickMarks = styled.div`
    display: flex;
    justify-content: space-between;
    padding: 0 2px;
`;

const Tick = styled.span`
    font-size: 12px;
    color: #666;
`;

export default TickCombineControl;
