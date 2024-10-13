import React from "react";
import styled from "styled-components";
import API from "../../../../components/API";

export default function OrdersList(props) {
    const { orders = {} } = props;

    return (
        <div>
            {Object.values(orders)
                // .reverse()
                .filter((o) => o.rpCode?.[1] !== "reference data not available")
                .filter((o) => o.reportText !== "Order not found")
                .filter((o) => o.basketId !== undefined)
                .sort((a, b) => {
                    const aPrice = a.price || a.triggerPrice;
                    const bPrice = b.price || b.triggerPrice;
                    return aPrice - bPrice;
                })
                .sort((a, b) => {
                    return a.status == "complete" ? 1 : -1;
                })
                .map((order) => {
                    // console.log(orders[basketId]);
                    return <OrderItem key={order.basketId} order={order} />;
                })}
        </div>
    );
}

function OrderItem(props) {
    const { order } = props;

    return (
        <OrderContainer order={order}>
            <div className="row">
                <div className="col">
                    <div>{order.status ? order.status : order.basketId}</div>
                    <div>{order.status ? order.basketId : ""}</div>
                    <div>
                        {order.symbol} {order.totalFillSize} of {order.quantity}:{order.totalUnfilledSize} to fill
                    </div>
                    <div>{order.notifyType}</div>
                </div>

                <TradeType order={order} className="col">
                    {priceType(order.priceType)} -<TransactionType order={order}>{orderTransactionType(order.transactionType)}</TransactionType>-{" "}
                    {order.price ? order.price : order.avgFillPrice ? order.avgFillPrice : order.triggerPrice ? order.triggerPrice : "No price"}
                </TradeType>
                {order.reportType !== "status" && (
                    <div className="col">
                        <ReportType order={order}>{order.reportType ? order.reportType : `${order.reportText} ${order.text}`}</ReportType>
                    </div>
                )}
                <div className="col">{order.fillTime ? order.fillTime : new Date(order.ssboe * 1000).toLocaleTimeString()}</div>
                <div className="col">{order.avgFillPrice}</div>
                <div className="col">
                    {order.status !== "complete" && (
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
    debugger;
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
            return "Limit";

        case 2:
            return "MARKET";

        case 3:
            return "STOP_LIMIT";

        case 4:
            return "STOP_MARKET";

        default:
            return type;
    }
}

function transactionTypeColor(props) {
    const { order } = props;
    debugger;
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
    const { order } = props;
    if (!order?.reportType) {
        switch (order.reportText) {
            case "Rejected at RMS - Available margin exhausted":
                return "red";
                break;

            default:
                break;
        }
    } else {
        switch (order.reportType) {
            case "fill":
                return "green";
            case "cancel":
                return "grey";

            case "status":
                return "blue";

            default:
                return "pink";
        }
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

        default:
            return "black";
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
