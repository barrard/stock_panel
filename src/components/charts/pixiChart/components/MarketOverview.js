import React, { useState, useEffect, useMemo } from "react";
import styled from "styled-components";
import TradeControls from "./TradeControls";
import { priceFormat } from "../../chartHelpers/utils.js";
import Seismograph from "../../Seismograph";

const MarketOverview = ({ lastTradesRef, fullSymbols, Socket }) => {
    // if (!lastTradesRef.current) lastTradesRef.current = {};

    const [instrumentPnLPositionUpdate, setInstrumentPnLPositionUpdate] = useState({});

    const sortedEntries = Object.entries(lastTradesRef.current).sort(
        ([, tradeA], [, tradeB]) => tradeB.nearPriceBidSizeToAskSizeRatio - tradeA.nearPriceBidSizeToAskSizeRatio
    );

    useEffect(() => {
        Socket.on("positionPnL", (message) => {
            console.log(message);
            setInstrumentPnLPositionUpdate(message);
        });

        Socket.on("orderTracker", (orderTrackerCount) => {
            const sym = orderTrackerCount.symbol;
            if (!lastTradesRef?.current?.[sym]) {
                lastTradesRef.current[sym] = {};
            }
            // if (lastTradesRef?.current?.[sym]) {
            lastTradesRef.current[sym] = { ...lastTradesRef.current[sym], ...orderTrackerCount };
        });

        return () => {
            Socket.off("orderTracker");
            Socket.off("positionPnL");
        };
    }, [Socket]);

    return (
        <div className="row">
            <div className="col-auto">
                <table className="w-full border-collapse ">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border p-2 text-left">Symbol</th>
                            <th className="border p-2 text-left">Trade Price</th>
                            <th className="border p-2 text-left small">Bid/Ask Ratio/MA</th>
                            {/* <th className="border p-2 text-left small">Near Price Bid/Ask Ratio/MA</th> */}

                            <th className="border p-2 text-left">Delta</th>
                            <th className="border p-2 text-left">PnL</th>
                            <th className="border p-2 text-left">Position</th>
                            <th className="border p-2 text-left">Orders b/s</th>
                            <th className="border p-2 text-left">Filled b/s</th>
                            <th className="border p-2 text-left">Avg</th>
                            <th className="border p-2 text-left">Day</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Market Overview ROWS */}
                        {sortedEntries.map(([symbol, lastTrade], index) => {
                            const symbolData = fullSymbols.find((s) => s.baseSymbol == symbol);
                            const pnlData = instrumentPnLPositionUpdate[symbolData?.fullSymbol];

                            return <MarketItem key={symbol} symbol={symbol} pnlData={pnlData} symbolData={symbolData} lastTrade={lastTrade} index={index} />;
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MarketOverview;

function MarketItem(props) {
    const symbolsColors = {
        ES: "red",
        NQ: "green",
        YM: "blue",
        CL: "black",
        GC: "yellow",
    };
    const [expandedRow, setExpandedRow] = useState(null);

    const { symbol, lastTrade, index, symbolData, pnlData } = props;

    // if (!lastTrade) return <></>;

    const toggleRow = (index) => {
        setExpandedRow(!!!expandedRow);
    };

    const PriceQuote = ({ lastTrade }) => {
        return (
            <>
                <div className="col-12">{priceFormat(lastTrade?.tradePrice?.toFixed(2))}</div>
                <div className="row">
                    <div className="col-6">
                        <ValChange num={lastTrade?.percChange} className="col">
                            {priceFormat(lastTrade?.percChange?.toFixed(2))}
                            <Small>%</Small>
                        </ValChange>
                    </div>
                    <div className="col-6">
                        <ValChange num={lastTrade?.totalChange} className="col">
                            {priceFormat(lastTrade?.totalChange?.toFixed(2))}
                        </ValChange>
                    </div>
                </div>
            </>
        );
    };

    const BidAskRatio = ({ lastTrade }) => {
        return (
            <div className="row">
                <div className="col-12">
                    <ValChange num={lastTrade?.nearPriceBidSizeToAskSizeRatio?.toFixed(2) - lastTrade?.nearPriceBidSizeToAskSizeRatioMA?.toFixed(2)}>
                        {lastTrade?.nearPriceBidSizeToAskSizeRatio?.toFixed(2)} / {lastTrade?.nearPriceBidSizeToAskSizeRatioMA.toFixed(2)}
                    </ValChange>
                </div>
                <Small className="col-12">
                    {lastTrade?.bidSizeToAskSizeRatio?.toFixed(2)} / {lastTrade?.bidSizeToAskSizeRatioMA?.toFixed(2)}
                </Small>
            </div>
        );
    };

    const SeismographChartMemo = useMemo(() => {
        return <Seismograph data={[]} orderTrackerCount={lastTrade} />;
    }, [lastTrade]);
    return (
        <React.Fragment>
            <TR key={symbol} color={symbolsColors[symbol]} onClick={() => toggleRow(index)} className="hover:bg-gray-50">
                <TD className="border p-2">{symbol}</TD>
                {/* <TD className="border p-2">{priceFormat(lastTrade?.tradePrice?.toFixed(2))}</TD> */}
                <TD className="border p-2">
                    <PriceQuote lastTrade={lastTrade} />
                </TD>
                <TD className="border p-2">
                    {/* {lastTrade?.bidSizeToAskSizeRatio?.toFixed(2)} / {lastTrade?.bidSizeToAskSizeRatioMA?.toFixed(2)} */}
                    <BidAskRatio lastTrade={lastTrade} />
                </TD>
                {/* <TD className="border p-2">
                    {lastTrade?.nearPriceBidSizeToAskSizeRatio?.toFixed(2)} / {lastTrade?.nearPriceBidSizeToAskSizeRatioMA.toFixed(2)}
                </TD> */}
                <TD className="border p-2">
                    <ValChange num={lastTrade?.delta}>{priceFormat(lastTrade?.delta?.toFixed(2))}</ValChange>
                </TD>
                <TD className="border p-2">{pnlData?.openPositionPnl ? priceFormat(pnlData?.openPositionPnl) : 0}</TD>
                <TD className="border p-2">{pnlData?.netQuantity}</TD>
                <TD className="border p-2">
                    {pnlData?.orderBuyQty}/{pnlData?.orderSellQty}
                </TD>
                <TD className="border p-2">
                    {pnlData?.fillBuyQty}/{pnlData?.fillSellQty}
                </TD>
                <TD className="border p-2">{pnlData?.avgOpenFillPrice ? priceFormat(pnlData?.avgOpenFillPrice) : 0}</TD>
                <TD className="border p-2">{pnlData?.dayClosedPnl ? priceFormat(pnlData?.dayClosedPnl) : 0}</TD>
            </TR>
            <TR>{/* <td colSpan="6">{SeismographChartMemo}</td> */}</TR>
            {expandedRow && (
                <TR color={symbolsColors[symbol]}>
                    <td colSpan="6">
                        <TradeControls symbolData={symbolData} symbol={symbol} lastTrade={lastTrade} />
                    </td>
                </TR>
            )}
        </React.Fragment>
    );
}

const Small = styled.div`
    font-size: 12px;
    display: inline;
`;
const ValChange = styled.div`
    color: ${({ num }) => (num < 0 ? "#FF6B6B" : num > 0 ? "#4ADE80" : "white")};
    font-size: 12px;
    font-weight: 700;
    text-shadow: 1px 1px 2px black;
`;

const TD = styled.td`
    text-align: center;
`;

const TR = styled.tr`
    cursor: pointer;
    /* on hover */
    &:hover {
        box-shadow: inset 0 0 0 5px #63560d;
    }
    transition: all 0.2s ease-in-out;
    box-shadow: inset 0 0 0 4px ${({ color }) => color};

    padding: 20px;
`;
