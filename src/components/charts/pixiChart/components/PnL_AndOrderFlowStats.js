import React, { useState, useEffect, useMemo } from "react";
import MiniPixiChart from "../../mini-pixi-chart";

export default function PnL_AndOrderFlowStats(props) {
    // console.log("PnL_AndOrderFlowStats");
    const {
        accountPnLPositionUpdate = {},
        instrumentPnLPositionUpdate = {},
        orderTrackerCount = {},
        bidAskRatios = {},
        Socket,
    } = props;

    const [bidSizeToAskSizeRatio, setBidSizeToAskSizeRatio] = useState([0]);
    const [bidSizeToAskSizeRatioMA, setBidSizeToAskSizeRatioMA] = useState([0]);

    // console.log(bidAskRatios);
    // useEffect(() => {
    //     Socket.on("liquidity", (data) => {
    //         console.log({ data });
    //         const {
    //             bidSizeToAskSizeRatio,

    //             bidSizeToAskSizeRatioMA,
    //         } = data;
    //         setBidSizeToAskSizeRatio((arr) => [...arr, bidSizeToAskSizeRatio]);
    //         setBidSizeToAskSizeRatioMA((arr) => [
    //             ...arr,
    //             bidSizeToAskSizeRatioMA,
    //         ]);

    //         // setBidAskRatios(data);
    //         // pixiData.setLiquidityData(data);
    //     });
    //     return () => {
    //         console.log("socket OFFFFF");
    //         Socket.off("liquidity");
    //     };
    // }, [Socket]);

    const MiniChartMemo = useMemo(() => {
        console.log("useMemo");
        console.log("useMemo");
        console.log("useMemo");
        return (
            <MiniPixiChart
                Socket={Socket}
                dimension={{
                    height: 100,
                    width: 200,
                }}
                margin={{
                    top: 5,
                    left: 5,
                    right: 5,
                    bottom: 5,
                }}
                // chartData={bidSizeToAskSizeRatio}
            />
        );
    }, [Socket]);
    //[Socket, bidSizeToAskSizeRatio, bidSizeToAskSizeRatioMA]

    return (
        <>
            <div className="row">
                <div className="col-6"></div>
                <div className="col-6">
                    P&accountBalance = {accountPnLPositionUpdate.accountBalance}
                </div>

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
            {/* 
            {MiniChartMemo}
            <MiniPixiChart
                Socket={Socket}
                dimension={{
                    height: 100,
                    width: 200,
                }}
                margin={{
                    top: 5,
                    left: 5,
                    right: 5,
                    bottom: 5,
                }}
                chartData={bidSizeToAskSizeRatio}
            /> */}

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
                    nearPriceBidSizeToAskSizeRatio:{" "}
                    {bidAskRatios?.nearPriceBidSizeToAskSizeRatio?.toFixed(2)}
                    {" / "}
                    {bidAskRatios?.nearPriceBidSizeToAskSizeRatioMA?.toFixed(2)}
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
