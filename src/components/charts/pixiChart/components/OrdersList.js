import React from "react";
import styled from "styled-components";
import API from "../../../../components/API";

export default function OrdersList(props) {
    const { orders = {} } = props;

    console.log(orders);
    return (
        <div>
            {Object.keys(orders)
                .reverse()
                .sort((a, b) => {
                    return a.status == "complete" ? -1 : 1;
                })
                .map((basketId) => {
                    // console.log(orders[basketId]);
                    return <OrderItem key={basketId} order={orders[basketId]} />;
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
                        {order.symbol} {order.totalFillSize} of {order.quantity}
                    </div>
                </div>

                <TradeType order={order} className="col">
                    {priceType(order.priceType)} -<TransactionType order={order}>{orderTransactionType(order.transactionType)}</TransactionType>-{" "}
                    {order.price ? order.price : order.avgFillPrice ? order.avgFillPrice : order.triggerPrice ? order.triggerPrice : "No price"}
                </TradeType>
                <div className="col">
                    <ReportType order={order}>{order.reportType ? order.reportType : `${order.reportText} ${order.text}`}</ReportType>
                </div>
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
    switch (type) {
        case 1:
            return "BUY";

        case 2:
            return "SELL";

        case 3:
            return "SHORT_SELL";

        default:
            break;
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
            break;
    }
}

function transactionTypeColor(props) {
    const { order } = props;
    if (!order?.transactionType) return "white";
    switch (order.transactionType) {
        case "SELL":
        case 2:
        case 3:
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
    if (!order?.priceType) return "red";
    switch (order.priceType) {
        case "LIMIT":
        case 1:
            return "blue";
        case "STOP_MARKET":
        case 4:
            return "orange";

        case "MARKET":
        case 2:
            return "green";

        case "STOP_LIMIT":
        case 3:
            return "pink";

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
