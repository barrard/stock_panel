import styled from "styled-components";
import API from "../../../API";

export const GetSymbolBtn = (props) => {
    const { symbol, getData, setSymbol, enabled } = props;

    return (
        <StyledGetSymbolBtn
            enabled={enabled}
            onClick={() => {
                getData(symbol);
                setSymbol(symbol);
            }}
        >
            {symbol}
        </StyledGetSymbolBtn>
    );
};
const StyledGetSymbolBtn = styled.button`
    padding: 0.25em 2em;
    margin: 1em;
    border-radius: 6px;
    font-weight: 500;
    border: none;
    cursor: pointer;
    background: ${({ enabled }) => (enabled ? "#4CAF50" : "#ff4d4d")};
    color: white;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

    &:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
        background: ${({ enabled }) => (enabled ? "#45a049" : "#ff3333")};
    }

    &:active {
        transform: translateY(0px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
    }
`;
