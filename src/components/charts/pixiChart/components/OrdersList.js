import React from "react";
import styled from "styled-components";
import API from "../../../../components/API";

export default function OrdersList(props) {
    const { orders = {} } = props;

    console.log("ORDER LIST");
    console.log(orders);
    return (
        <div>
            {Object.keys(orders)
                .reverse()
                .sort((a, b) => {
                    return a.status == "complete" ? -1 : 1;
                })
                .map((basketId) => {
                    console.log(orders[basketId]);
                    return (
                        <OrderItem key={basketId} order={orders[basketId]} />
                    );
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
                    {order.priceType} -
                    <TransactionType order={order}>
                        {order.transactionType}
                    </TransactionType>
                    - {order.price ? order.price : order.avgFillPrice}
                </TradeType>
                <div className="col">
                    <ReportType order={order}>{order.reportType}</ReportType>
                </div>
                <div className="col">
                    {order.fillTime
                        ? order.fillTime
                        : new Date(order.ssboe * 1000).toLocaleTimeString()}
                </div>
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

function transactionTypeColor(props) {
    const { order } = props;
    if (!order?.transactionType) return "white";
    switch (order.transactionType) {
        case "SELL":
            return "red";
        case "BUY":
            return "GREEN";

        default:
            return "black";
    }
}

function reportTypeColor(props) {
    const { order } = props;
    if (!order?.reportType) return "red";
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
function tradeTypeColor(props) {
    const { order } = props;
    if (!order?.priceType) return "red";
    switch (order.priceType) {
        case "LIMIT":
            return "blue";
        case "STOP_MARKET":
            return "orange";

        case "MARKET":
            return "green";

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
