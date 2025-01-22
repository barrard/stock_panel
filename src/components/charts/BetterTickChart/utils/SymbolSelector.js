// SymbolSelector.js
import React from "react";
import styled from "styled-components";
import PropTypes from "prop-types";

const AVAILABLE_SYMBOLS = [
    { value: "ES", label: "ES - E-mini S&P 500" },
    { value: "CL", label: "CL - Crude Oil" },
    { value: "GC", label: "GC - Gold" },
    { value: "NQ", label: "NQ - E-mini NASDAQ" },
    { value: "YM", label: "YM - E-mini Dow" },
];

const SymbolSelector = ({ currentSymbol, onSymbolChange }) => {
    return (
        <SelectContainer>
            <Select value={currentSymbol} onChange={(e) => onSymbolChange(e.target.value)}>
                {AVAILABLE_SYMBOLS.map(({ value, label }) => (
                    <option key={value} value={value}>
                        {label}
                    </option>
                ))}
            </Select>
        </SelectContainer>
    );
};

SymbolSelector.propTypes = {
    currentSymbol: PropTypes.string.isRequired,
    onSymbolChange: PropTypes.func.isRequired,
};

const SelectContainer = styled.div`
    margin-bottom: 1em;
`;

const Select = styled.select`
    padding: 8px 12px;
    border-radius: 4px;
    border: 1px solid #ccc;
    background-color: white;
    font-size: 14px;
    min-width: 200px;

    &:hover {
        border-color: #888;
    }

    &:focus {
        outline: none;
        border-color: #555;
    }
`;

export default SymbolSelector;
