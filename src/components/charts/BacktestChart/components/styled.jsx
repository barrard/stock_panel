import styled from "styled-components";
import API from "../../../API";

export const GetSymbolBtn = (props) => {
    const { symbol, getData, setSymbol } = props;

    return (
        <StyledGetSymbolBtn
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
    padding: 0em 2em;
    margin: 1em;
`;

export const SetIndicatorBtn = (props) => {
    const { enabled, indicatorName, onClick } = props;

    return (
        <StyledIndicatorBtn enabled={enabled} onClick={() => onClick()}>
            {indicatorName}
        </StyledIndicatorBtn>
    );
};
const StyledIndicatorBtn = styled.button`
    padding: 0em 2em;
    margin: 1em;
    color: ${({ enabled }) => (enabled ? "green" : "red")};
`;
