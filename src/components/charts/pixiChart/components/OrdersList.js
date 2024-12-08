import React from "react";
import styled from "styled-components";
import API from "../../../../components/API";

export default function OrdersList(props) {
    let { orders = {} } = props;
    function reduceByBasketId(acc, order) {
        if (!order.basketId) return acc;
        if (!acc[order.basketId]) {
            acc[order.basketId] = [];
        }
        acc[order.basketId].push(order);
        return acc;
    }
    orders = Object.values(orders).reduce(reduceByBasketId, {});

    return (
        <div>
            {Object.keys(orders)
                // .reverse()
                // .filter((o) => o.rpCode?.[1] !== "reference data not available")
                // .filter((o) => o.reportText !== "Order not found")
                // .filter((o) => o.basketId !== undefined)
                // .sort((a, b) => {
                //     const aPrice = a.price || a.triggerPrice;
                //     const bPrice = b.price || b.triggerPrice;
                //     return aPrice - bPrice;
                // })
                // .sort((a, b) => {
                //     return a.status == "complete" ? 1 : -1;
                // })
                .sort((a, b) => b - a)
                .map((basketId) => {
                    // console.log(orders[basketId]);
                    let orderStates = orders[basketId];
                    return <OrderItem key={basketId} orders={orderStates} />;
                })}
        </div>
    );
}

function formatTime({ ssboe, usecs }) {
    const milliseconds = ssboe * 1000 + Math.floor(usecs / 1000);
    const date = new Date(milliseconds);

    // Using built-in toLocaleTimeString
    return date.toLocaleTimeString("en-US", {
        hour12: true,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        fractionalSecondDigits: 3,
    });
}

function combineTimestamps({ ssboe, usecs }) {
    // Convert usecs to milliseconds
    const usecStr = String(usecs).padStart(6, "0"); // Pad to 6 digits
    const milliseconds = parseInt(usecStr.substring(0, 3)); // Take first 3 digits for milliseconds

    // Convert ssboe to milliseconds and add the usec milliseconds
    const totalMilliseconds = ssboe * 1000 + milliseconds;

    return totalMilliseconds;
}

function OrderItem(props) {
    if (!props.orders) return <></>;
    let { orders } = props;
    orders.forEach((o) => (o.datetime = combineTimestamps(o)));
    orders.sort((a, b) => b.datetime - a.datetime);

    const order = orders?.[0];
    // const order = orders?.slice(-1)[0];
    console.log(order.basketId);
    const reportTexts = [];

    // if (order.quantity == undefined) {
    //     console.log(order.quantity);
    //     debugger;
    // }
    let isBracket = false;

    orders.forEach((order) => {
        if (order.bracketType) isBracket = true;
        console.log(formatTime(order));
        if (order.reportText || order.status || order.reportText) reportTexts.push({ text: order.reportText || order.status || order.reportText, time: formatTime(order) });
    });
    return (
        <OrderContainer order={order}>
            <div className="row">
                <div className="col">
                    <div>{isBracket && "Is BRACKET"}</div>
                    <div>
                        {order.notifyType} - {order.status ? order.status : "No status"}
                    </div>
                    <div>{order.basketId}</div>
                    <div>{`${order.transactionType == 1 ? "BUY" : "SELL"} ${order.quantity} of ${order.symbol} at ${priceType(order.priceType)}`}</div>

                    <div>
                        {order.symbol} {order.totalFillSize == order.quantity ? "filled" : `partially filled ${order.totalFillSize} of ${order.quantity}:${order.totalUnfilledSize} to fill`}
                    </div>
                </div>

                <TradeType order={order} className="col">
                    {priceType(order.priceType)} -<TransactionType order={order}>{orderTransactionType(order.transactionType)}</TransactionType>- ${order.price ? order.price : order.avgFillPrice ? order.avgFillPrice : order.triggerPrice ? order.triggerPrice : "No price"}
                </TradeType>
                {/* {order.reportType !== "status" && ( */}
                <div className="col">
                    {reportTexts.map((order) => {
                        const { text, time } = order;

                        return (
                            <ReportType text={text}>
                                {text ? (
                                    <>
                                        <p>{text}</p>
                                        <small>{time}</small>
                                    </>
                                ) : (
                                    `${"order.reportText"} `
                                )}
                                <hr />
                            </ReportType>
                        );
                    })}
                </div>
                {/* )} */}
                <div className="col">{new Date(order.ssboe * 1000).toLocaleString()}</div>
                <div className="col">{order.avgFillPrice}</div>
                <div className="col">
                    {(order.status == "open" || order.status == "trigger pending") && (
                        <button
                            onClick={async () => {
                                await API.rapi_cancelOrder({
                                    basketId: order.basketId,
                                });
                            }}
                            className="btn btn-warning"
                        >
                            X
                        </button>
                    )}
                </div>
            </div>
            {/* <hr /> */}
        </OrderContainer>
    );
}

function orderTransactionType(type) {
    switch (type) {
        case 1:
            return "BUY";

        case 2:
            return "SELL";

        case 3:
            return "SHORT_SELL";

        default:
            return type;
    }
}

function priceType(type) {
    switch (type) {
        case 1:
            return "LIMIT";
        case 2:
            return "MARKET";
        case 3:
            return "STOP_LIMIT";
        case 4:
            return "STOP_MARKET";
        case 5:
            return "MARKET_IF_TOUCHED";
        case 6:
            return "LIMIT_IF_TOUCHED";
        default:
            return "Unknown";
    }
}

function transactionTypeColor(props) {
    const { order } = props;

    if (!order?.transactionType) return "white";
    switch (order.transactionType) {
        case "SELL":
        case 2:
            return "red";
        case "BUY":
        case 1:
            return "GREEN";

        default:
            debugger;
            return "black";
    }
}

function reportTypeColor(props) {
    const { text } = props;
    // if (!order?.reportType) {
    switch (text) {
        case "Rejected at RMS - Available margin exhausted":
            return "red";

        // }
        // } else {
        //     switch (order.reportType) {
        case "fill":
        case "complete":
            return "green";
        case "cancel":
            return "grey";
        case "order received by exch gateway":
        case "open":
        case "order sent to exch":
        case "Order received from client":
            return "goldenrod";
        case "open pending":
            return "yellowgreen";

        case "status":
            return "blue";
        case "Cancel received from client":
            return "#FF6B6B"; // Lighter coral red
        case "cancel sent to exch":
            return "#FF0000"; // Pure red
        case "cancel received by exch gateway":
            return "#CC0000"; // Darker red
        case "cancel pending":
            return "#990000"; // Deep red
        case "trigger pending":
            return "steelblue";
        case "The bracket order management system rejected request":
        case "Cancellation rejected by the Order Management System - Order is complete. Further cancellations on this order may lead to logoff/disable":
        case "release pending":
            return "red";

        default:
            debugger;
            return "pink";
        // }
    }
}

function tradeTypeColor(props) {
    const { order } = props;
    if (!order?.priceType) return "teal";
    switch (order.priceType) {
        case "LIMIT":
        case 1:
            return "blue";
        case "MARKET":
        case 2:
            return "green";

        case "STOP_LIMIT":
        case 3:
            return "pink";
        case "STOP_MARKET":
        case 4:
            return "orange";
        case "MARKET_IF_TOUCHED":
        case 5: //
            return "red";
        case "LIMIT_IF_TOUCHED":
        case 6: //
            debugger;
            return "yellow";

        default:
            debugger;
            console.log(order.priceType);
            return "black";
    }
}

function orderStatusColor(props) {
    const { order } = props;
    if (!order?.status) return "red";
    switch (order.status) {
        case "open":
            return "green";
        case "cancel":
            return "grey";

        case "complete":
            return "black";
        case "open pending":
            return "yellowgreen";
        case "Cancel received from client":
        case "cancel received by exch gateway":
            return "#FF6B6B"; // Lighter coral red
        default:
            debugger;
            return "grey";
    }
}

const OrderContainer = styled.div`
    background: ${orderStatusColor};
    margin: 1em;
    padding: 1em;
`;

const TradeType = styled.div`
    background: ${tradeTypeColor};
`;

const ReportType = styled.div`
    background: ${reportTypeColor};
`;

const TransactionType = styled.div`
    background: ${transactionTypeColor};
    opacity: 0.8;
`;
