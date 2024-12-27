import React from "react";
import styled from "styled-components";
import API from "../../../../components/API";
import moment from "moment";

export default function OrdersList(props) {
    let { orders = {} } = props;

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
                    if (!basketId) {
                    }
                    return <OrderItem key={basketId} orders={orderStates} />;
                })}
        </div>
    );
}
function formatTimeDiff(diffInMilliseconds) {
    const absValue = Math.abs(diffInMilliseconds);

    if (absValue >= 60000) {
        // If 60 seconds or more, show in minutes
        return `${(diffInMilliseconds / 60000).toFixed(2)} min`;
    } else if (absValue >= 1000) {
        // If 1 second or more, show in seconds
        return `${(diffInMilliseconds / 1000).toFixed(2)} s`;
    } else if (absValue >= 1) {
        // If 1 millisecond or more, show in milliseconds
        return `${diffInMilliseconds.toFixed(2)} ms`;
    } else {
        // Convert to microseconds
        const microseconds = diffInMilliseconds * 1000;
        return `${microseconds.toFixed(1)} μs`;
    }
}

function formatTime({ ssboe, usecs }) {
    const totalMilliseconds = combineTimestamps({ ssboe, usecs });
    const date = new Date(totalMilliseconds);

    // Get hours, minutes, seconds
    const timeStr = date.toLocaleTimeString("en-US", {
        hour12: true,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });

    // Ensure usecs is padded to 6 digits
    const usecStr = String(usecs).padStart(6, "0");

    // Split the time string to insert microseconds in the correct place
    const [time, ampm] = timeStr.split(" ");

    // Format as HH:MM:SS.microseconds AM/PM
    return `${time}.${usecStr} ${ampm}`;
}

function combineTimestamps({ ssboe, usecs = "" }) {
    // Convert ssboe to milliseconds
    const milliseconds = ssboe * 1000;

    // Ensure usecs is padded to 6 digits
    const usecStr = String(usecs).padStart(6, "0");

    // Convert microseconds to milliseconds (keeping fractional part)
    const microsToMillis = parseInt(usecStr) / 1000;

    // Combine them
    const totalMilliseconds = milliseconds + microsToMillis;

    return totalMilliseconds;
}

function OrderItem(props) {
    if (!props.orders) return <></>;
    let { orders } = props;
    orders.forEach((o) => (o.datetime = combineTimestamps(o)));
    orders.sort((a, b) => b.datetime - a.datetime);

    const order = orders?.[0];
    // const order = orders?.slice(-1)[0];

    const reportTexts = [];

    // if (order.quantity == undefined) {
    //     console.log(order.quantity);

    // }
    let isBracket = false;

    orders.forEach((order, index) => {
        if (order.bracketType) isBracket = true;
        let timeDiff;
        if (index < orders.length - 1) {
            const nextOrder = orders[index + 1];
            timeDiff = order.datetime - nextOrder.datetime;
            /**
             * This could be like
             *
             *     order.datetime - nextOrder.datetime //0.0078125 miliseconds
             *      //i want to show this number in a mor readable way, like 7.8 micro seconds
             *    but if it's more than 1 second, it needs to adjust to seconds
             * I have moment
             */
        }
        if (order.reportText || order.status || order.reportText) reportTexts.push({ timeDiff, templateId: order.templateId, notifyType: order.notifyType, text: order.reportText || order.status || order.reportText, time: formatTime(order) });
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
                        const { text, time, notifyType, templateId, timeDiff } = order;

                        return (
                            <ReportType key={`${time}-${notifyType}-${templateId}`} text={text}>
                                {text ? (
                                    <>
                                        <p>
                                            {notifyType} {templateId}
                                        </p>
                                        <p>{text}</p>

                                        <small>{time}</small>
                                        <br />
                                        {timeDiff && <small>{formatTimeDiff(timeDiff)}</small>}
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
            return "yellow";

        default:
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
