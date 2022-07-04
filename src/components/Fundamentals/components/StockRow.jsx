import React from "react";
import styled from "styled-components";

export default function StockRow(props) {
    const { stock, index } = props;
    // console.log(stock);
    if (!stock) return <>No stock</>;
    return (
        <div className="row">
            <StyledRow index={index}>
                <StyledSymbol>{`${index + 1} - ${stock.symbol}`}</StyledSymbol>
                <StyledDescription>{stock.description}</StyledDescription>
                <StyledValue>
                    {" "}
                    {`currentRatio: ${stock.currentRatio}`}
                </StyledValue>
                <StyledValue>
                    {`totalDebtToEquity: ${stock.totalDebtToEquity}`}
                </StyledValue>
                <StyledValue>
                    {" "}
                    {`ltDebtToEquity: ${stock.ltDebtToEquity}`}
                </StyledValue>
                <StyledValue>
                    {`totalDebtToCapital: ${stock.totalDebtToCapital}`}
                </StyledValue>
            </StyledRow>
        </div>
    );
}

const StyledRow = styled.div`
    width: 100%;
    position: relative;
    background: ${({ index }) => (index % 2 ? "#333" : "#666")};
`;

const StyledSymbol = styled.p`
    font-size: 20px;
`;

const StyledDescription = styled.p`
    font-size: 12px;
`;

const StyledValue = styled.p`
    font-size: 12px;
`;
