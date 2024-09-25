import React, { useState, useEffect, useMemo } from "react";
import MiniPixiChart from "../../mini-pixi-chart";
import Seismograph from "../../Seismograph";
export default function PnL_AndOrderFlowStats(props) {
    const {
        // accountPnLPositionUpdate = {},
        // instrumentPnLPositionUpdate = {},
        // orderTrackerCount = {},
        // bidAskRatios = {},
        Socket,
        ticks,
        symbol,
        lastTradesRef,
    } = props;

    const [bidSizeToAskSizeRatio, setBidSizeToAskSizeRatio] = useState([0]);
    const [bidSizeToAskSizeRatioMA, setBidSizeToAskSizeRatioMA] = useState([0]);
    const [orderTrackerCount, setOrderTrackerCount] = useState({});
    const [accountPnLPositionUpdate, setAccountPnLPositionUpdate] = useState({});
    const [instrumentPnLPositionUpdate, setInstrumentPnLPositionUpdate] = useState({});
    const [bidAskRatios, setBidAskRatios] = useState({});

    useEffect(() => {
        console.log("symbol change");
        setBidSizeToAskSizeRatio([0]);
        setBidSizeToAskSizeRatioMA([0]);
    }, [symbol]);

    // console.log(bidAskRatios);
    useEffect(() => {
        Socket.on("accountPnL", (message) => {
            debugger;
            // console.log(message);
            setInstrumentPnLPositionUpdate(message.positionData);
            setAccountPnLPositionUpdate(message.accountPnLPosition);
        });

        // Socket.on("AccountPnLPositionUpdate", (message) => {
        //     debugger;
        //     // console.log(message);
        //     setAccountPnLPositionUpdate(message);
        // });

        // Socket.on("orderTracker", (orderTrackerCount) => {
        //     const sym = orderTrackerCount.symbol;
        //     if (!lastTradesRef?.current?.[sym]) {
        //         lastTradesRef.current[sym] = {};
        //     }
        //     // if (lastTradesRef?.current?.[sym]) {
        //     lastTradesRef.current[sym] = { ...lastTradesRef.current[sym], ...orderTrackerCount };
        //     // }
        //     if (symbol !== orderTrackerCount.symbol) return;
        //     // console.log(`match!  ${symbol} == ${orderTrackerCount.symbol}`);

        //     const {
        //         bidSizeToAskSizeRatio,

        //         bidSizeToAskSizeRatioMA,
        //     } = orderTrackerCount;
        //     setBidAskRatios(orderTrackerCount);

        //     setBidSizeToAskSizeRatio((arr) => [...arr, bidSizeToAskSizeRatio]);
        //     setBidSizeToAskSizeRatioMA((arr) => [...arr, bidSizeToAskSizeRatioMA]);

        //     setOrderTrackerCount({ ...orderTrackerCount });
        // });

        return () => {
            Socket.off("orderTracker");
            // Socket.off("AccountPnLPositionUpdate");
            Socket.off("accountPnL");
        };
    }, [symbol]);

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
    // console.log(orderTrackerCount.delta);

    const SeismographChartMemo = useMemo(() => {
        return <Seismograph data={[]} orderTrackerCount={orderTrackerCount} />;
    }, [orderTrackerCount]);

    return (
        <>
            {/* <div className="row">
                <div className="col-6"></div>
                <div className="col-6">P&accountBalance = {accountPnLPositionUpdate.accountBalance}</div> */}

            {/* <div className="col-6">P&L = {instrumentPnLPositionUpdate.openPositionPnl}</div> */}
            {/* <div className="col-6">dayClosedPnl = {instrumentPnLPositionUpdate.dayClosedPnl}</div> */}
            {/* </div> */}
            {/* <div className="row"> */}
            {/* <div className="col-6">netQuantity = {instrumentPnLPositionUpdate.netQuantity}</div> */}
            {/* <div className="col-6">avgOpenFillPrice ={instrumentPnLPositionUpdate.avgOpenFillPrice}</div> */}
            {/* </div> */}

            {/* <div className="row"> */}
            {/* <div className="col-6">fillBuyQty = {instrumentPnLPositionUpdate.fillBuyQty}</div> */}
            {/* <div className="col-6">fillSellQty = {instrumentPnLPositionUpdate.fillSellQty}</div> */}
            {/* </div> */}
            {/* <div className="row"> */}
            {/* <div className="col-6">bigPlayers: {orderTrackerCount.bigPlayer}</div> */}
            {/* <div className="col-6">orderDelta: {orderTrackerCount.orderDelta}</div> */}
            {/* <div className="col-6">orderDelta: {orderTrackerCount.orderDelta}</div> */}
            {/* <div className="col-6">buyingPowerCount: {orderTrackerCount.buyingPowerCount}</div> */}
            {/* <div className="col-6">nullOrderDelta: {orderTrackerCount.nullOrderDelta}</div> */}
            {/* <Seismograph data={ticks} delta={orderTrackerCount.delta} /> */}
            {/* {SeismographChartMemo} */}
            {/* <div className="col-6">tradeSize: {orderTrackerCount.tradeSize}</div> */}
            {/* <div className="col-6">tradeCount: {orderTrackerCount.tradeCount}</div> */}
            {/* </div> */}

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

            {/* <div className="row">
                <div className="col-6">bidSizeOrderRatio: {bidAskRatios?.bidSizeOrderRatio?.toFixed(2)}</div>
                <div className="col-6">askSizeOrderRatio: {bidAskRatios?.askSizeOrderRatio?.toFixed(2)}</div>
                <div className="col-6">
                    bidSizeToAskSizeRatio: {bidAskRatios?.bidSizeToAskSizeRatio?.toFixed(2)}
                    {" / "}
                    {bidAskRatios?.bidSizeToAskSizeRatioMA?.toFixed(2)}
                </div>

                <div className="col-6">bidOrderToAskOrderRatio: {bidAskRatios?.bidOrderToAskOrderRatio?.toFixed(2)}</div>

                <div className="col-6">
                    nearPriceBidSizeToAskSizeRatio: {bidAskRatios?.nearPriceBidSizeToAskSizeRatio?.toFixed(2)}
                    {" / "}
                    {bidAskRatios?.nearPriceBidSizeToAskSizeRatioMA?.toFixed(2)}
                </div>

                <div className="col-6">
                    runningOrderBookNearPriceSlope: {bidAskRatios?.runningOrderDepthNearPriceCount?.toFixed(2)}
                    {" / "}
                    {bidAskRatios?.runningOrderBookNearPriceSlope?.toFixed(2)}
                </div>
                <div className="col-6">delta: {orderTrackerCount.delta}</div>

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
            </div> */}
        </>
    );
}
