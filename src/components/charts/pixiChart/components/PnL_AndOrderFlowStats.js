import React from "react";

export default function PnL_AndOrderFlowStats(props) {
    const { instrumentPnLPositionUpdate = {}, orderTrackerCount = {} } = props;
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
                    nullOrderDelta: {orderTrackerCount.nullOrderDelta}
                </div>
            </div>
        </>
    );
}
