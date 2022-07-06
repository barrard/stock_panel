import React, { useState, useEffect } from "react";
import styled from "styled-components";
import useIsInViewport from "use-is-in-viewport";
import API from "../../API";

//as $$$ dollars
function as$(val) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(val);
}

export default function StockRow(props) {
    const [isInViewport, targetRef] = useIsInViewport({ threshold: 5 });
    const { stock, index, ticker } = props;
    const [weeklyData, setWeeklyData] = useState([]);
    const [weeklyPriceLevels, setWeeklyPriceLevels] = useState({});
    const [hasNoWeeklyData, setHasNoWeeklyData] = useState(false);

    useEffect(() => {
        if (isInViewport && weeklyData.length === 0) {
            API.getStockDataForFundamentalsCharts(stock.symbol).then((res) => {
                console.log(res);
                const { weekly, weeklyPriceLevels } = res[0];
                if (!weeklyData) {
                    setHasNoWeeklyData(true);
                }
                setWeeklyData(weekly || [1]);
                setWeeklyPriceLevels(weeklyPriceLevels);
            });
        }
    }, [isInViewport]);

    if (!stock) return <>No stock</>;
    return (
        <div ref={targetRef} className="row">
            <div className="col-6">
                <StyledRow index={index}>
                    <StyledSymbol>{`${index + 1} - ${
                        stock.symbol
                    }`}</StyledSymbol>
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
                    </StyledValue>{" "}
                    <StyledValue>{`Last Price: ${as$(
                        ticker.lastPrice
                    )}`}</StyledValue>
                </StyledRow>
            </div>
            <div className="col-6">
                {hasNoWeeklyData ? "Has No Weekly Data" : weeklyData.length}
            </div>
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
