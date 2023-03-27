import React from "react";

export default function PnL_AndOrderFlowStats(props) {
    const {
        instrumentPnLPositionUpdate = {},
        orderTrackerCount = {},
        bidAskRatios = {},
    } = props;
    return (
        <>
            <div className="row">
                <div className="col-6">
                    P&L = {instrumentPnLPositionUpdate.openPositionPnl}
                </div>
                <div className="col-6">
                    dayClosedPnl = {instrumentPnLPositionUpdate.dayClosedPnl}
                </div>
            </div>
            <div className="row">
                <div className="col-6">
                    netQuantity = {instrumentPnLPositionUpdate.netQuantity}
                </div>
                <div className="col-6">
                    avgOpenFillPrice =
                    {instrumentPnLPositionUpdate.avgOpenFillPrice}
                </div>
            </div>

            <div className="row">
                <div className="col-6">
                    fillBuyQty = {instrumentPnLPositionUpdate.fillBuyQty}
                </div>
                <div className="col-6">
                    fillSellQty = {instrumentPnLPositionUpdate.fillSellQty}
                </div>
            </div>
            <div className="row">
                <div className="col-6">
                    bigPlayers: {orderTrackerCount.bigPlayer}
                </div>
                <div className="col-6">
                    orderDelta: {orderTrackerCount.orderDelta}
                </div>
                <div className="col-6">
                    {/* orderDelta: {orderTrackerCount.orderDelta} */}
                </div>
                <div className="col-6">
                    buyingPowerCount: {orderTrackerCount.buyingPowerCount}
                </div>
                <div className="col-6">
                    nullOrderDelta: {orderTrackerCount.nullOrderDelta}
                </div>
            </div>

            <div className="row">
                <div className="col-6">
                    bidSizeOrderRatio:{" "}
                    {bidAskRatios?.bidSizeOrderRatio?.toFixed(2)}
                </div>
                <div className="col-6">
                    askSizeOrderRatio:{" "}
                    {bidAskRatios?.askSizeOrderRatio?.toFixed(2)}
                </div>
                <div className="col-6">
                    bidSizeToAskSizeRatio:{" "}
                    {bidAskRatios?.bidSizeToAskSizeRatio?.toFixed(2)}
                    {" / "}
                    {bidAskRatios?.bidSizeToAskSizeRatioMA?.toFixed(2)}
                </div>
                <div className="col-6">
                    bidOrderToAskOrderRatio:{" "}
                    {bidAskRatios?.bidOrderToAskOrderRatio?.toFixed(2)}
                </div>
                <div className="col-6">
                    tick: {bidAskRatios?.tick?.toFixed(2)}
                    {" / "}
                    {bidAskRatios?.avgTICK?.toFixed(2)}
                </div>

                <div className="col-6">
                    trin: {bidAskRatios?.trin?.toFixed(2)}
                    {" / "}
                    {bidAskRatios?.avgTRIN?.toFixed(2)}
                </div>
            </div>
        </>
    );
}
