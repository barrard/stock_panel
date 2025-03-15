import React, { useState, useEffect, memo } from "react";
import styled from "styled-components";

import { ArrowUpCircle, ArrowDownCircle, XCircle } from "lucide-react";

import API from "../../../../components/API";
import moment from "moment";
import { compileOrders, priceType, formatTimeWithMicroSeconds, combineTimestampsMicroSeconds, formatTimeDiffInMicroSeconds } from "./utils";

export default function OrdersList(props) {
    let { orders = {} } = props;
    debugger;
    return (
        <div>
            {Object.keys(orders)
                .sort((a, b) => b - a)
                .map((basketId) => {
                    let orderStates = orders[basketId];
                    if (!basketId) return null;
                    return <OrderItem key={basketId} orders={orderStates} />;
                })}
        </div>
    );
}

// const OrderItem = memo(
//     function OrderItem(props) {
//         const [toggleShowOrderEvents, setToggleShowOrderEvents] = useState(false);
//         if (!props.orders) return <></>;
//         let { orders } = props;
//         orders.forEach((o) => (o.datetime = combineTimestampsMicroSeconds(o)));
//         orders.sort((a, b) => b.datetime - a.datetime);

//         const order = orders?.[0];
//         // debugger;
//         const compiledOrder = compileOrders(orders)[order.basketId];
//         // debugger;
//         // const order = orders?.slice(-1)[0];

//         const reportTexts = [];

//         // if (order.quantity == undefined) {
//         //     console.log(order.quantity);

//         // }
//         let isBracket = false;

//         orders.forEach((order, index) => {
//             if (order.bracketType) isBracket = true;
//             let timeDiff;
//             if (index < orders.length - 1) {
//                 const nextOrder = orders[index + 1];
//                 timeDiff = order.datetime - nextOrder.datetime;
//             }
//             if (order.reportText || order.status || order.reportText) reportTexts.push({ timeDiff, templateId: order.templateId, notifyType: order.notifyType, text: order.reportText || order.status || order.reportText, time: formatTimeWithMicroSeconds(order) });
//         });
//         if (!isBracket) {
//             debugger;
//         }
//         // debugger;
//         return (
//             <OrderContainer onClick={() => setToggleShowOrderEvents(!toggleShowOrderEvents)} title={order.status} order={compiledOrder}>
//                 <div className="row ">
//                     <div className="bg-blue-500 text-white p-4 rounded-lg shadow-md hover:bg-blue-600 h-100">564654</div>
//                     <div title={order.status} className="col">
//                         <div>OrderStatus: {compiledOrder.status}</div>
//                         <div>{isBracket && "Is BRACKET"}</div>
//                         <div>netQuantity {compiledOrder.netQuantity}</div>
//                         <div>templateId {compiledOrder.templateId}</div>
//                         <div>basketId {compiledOrder.basketId.slice(-4)}</div>
//                         <div>{`${compiledOrder.transactionType == 1 ? "BUY" : "SELL"} ${compiledOrder.quantity} of ${compiledOrder.symbol} at ${priceType(compiledOrder.priceType)}`}</div>

//                         <div>
//                             {compiledOrder.symbol} {compiledOrder.totalFillSize == compiledOrder.quantity ? "filled" : `partially filled ${compiledOrder.totalFillSize} of ${compiledOrder.quantity}:${compiledOrder.totalUnfilledSize} to fill`}
//                         </div>
//                     </div>

//                     <TradeType order={order} className="col">
//                         {priceType(compiledOrder.priceType)} -<TransactionType order={order}>{orderTransactionType(compiledOrder.transactionType)}</TransactionType>- ${compiledOrder.price ? compiledOrder.price : compiledOrder.avgFillPrice ? compiledOrder.avgFillPrice : compiledOrder.triggerPrice ? compiledOrder.triggerPrice : "No price"}
//                     </TradeType>

//                     {toggleShowOrderEvents && (
//                         <div className="col">
//                             {reportTexts.map((order) => {
//                                 const { text, time, notifyType, templateId, timeDiff } = order;

//                                 return (
//                                     <ReportType key={`${time}-${notifyType}-${templateId}`} text={text}>
//                                         {text ? (
//                                             <>
//                                                 <p>
//                                                     {notifyType} {templateId}
//                                                 </p>
//                                                 <p>{text}</p>

//                                                 <small>{time}</small>
//                                                 <br />
//                                                 {timeDiff && <small>{formatTimeDiffInMicroSeconds(timeDiff)}</small>}
//                                             </>
//                                         ) : (
//                                             `${"compiledOrder.reportText"} `
//                                         )}
//                                         <hr />
//                                     </ReportType>
//                                 );
//                             })}
//                         </div>
//                     )}

//                     <div className="col">{new Date(compiledOrder.ssboe * 1000).toLocaleString()}</div>
//                     <div className="col">{compiledOrder.avgFillPrice}</div>
//                     <div className="col">
//                         {(compiledOrder.status == "open" || compiledOrder.status == "trigger pending") && (
//                             <button
//                                 onClick={async () => {
//                                     await API.rapi_cancelOrder({
//                                         basketId: compiledOrder.basketId,
//                                     });
//                                 }}
//                                 className="btn btn-warning"
//                             >
//                                 X
//                             </button>
//                         )}
//                     </div>
//                 </div>
//                 {/* <hr /> */}
//             </OrderContainer>
//         );
//     },
//     (prevProps, nextProps) => {
//         return JSON.stringify(prevProps.orders) === JSON.stringify(nextProps.orders);
//     }
// );

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
const colors = {
    // Direction colors
    BUY: "#22c55e", // Green-500
    SELL: "#ef4444", // Red-500

    // Order types - using blues and purples for distinction
    MARKET: "#3b82f6", // Blue-500
    LIMIT: "#6366f1", // Indigo-500
    STOP_LIMIT: "#8b5cf6", // Violet-500
    STOP_MARKET: "#a855f7", // Purple-500

    // Complex order types
    OCO: "#0ea5e9", // Sky-500
    BRACKET: "#06b6d4", // Cyan-500

    // Status colors
    OPEN: "#84cc16", // Lime-500 (active/running)
    OPEN_PENDING: "#facc15", // Yellow-500 (waiting)
    COMPLETE: "#10b981", // Emerald-500 (success)
    CANCEL: "#f97316", // Orange-500 (cancelled)
};
function OrderColorScheme(type) {
    return colors[type] || "black";
}

function tradeTypeColor(props) {
    const { order } = props;
    if (!order?.priceType) return "teal";
    switch (order.priceType) {
        case "LIMIT":
        case 1:
            return OrderColorScheme("LIMIT");
        case "MARKET":
        case 2:
            return OrderColorScheme("MARKET");

        case "STOP_LIMIT":
        case 3:
            return OrderColorScheme("STOP_LIMIT");
        case "STOP_MARKET":
        case 4:
            return OrderColorScheme("STOP_MARKET");
        case "MARKET_IF_TOUCHED":
        case 5: //
            return OrderColorScheme("MARKET_IF_TOUCHED");
        case "LIMIT_IF_TOUCHED":
        case 6: //
            return OrderColorScheme("LIMIT_IF_TOUCHED");

        default:
            console.log(order.priceType);
            return "black";
    }
}

function orderStatusColor(props) {
    const { order } = props;
    if (!order?.status) return "red";
    console.log(order.status);
    switch (order.status) {
        case "open":
            return OrderColorScheme("OPEN");
        case "cancel":
            return OrderColorScheme("CANCEL");

        case "complete":
            return OrderColorScheme("COMPLETE");
        case "open pending":
            return OrderColorScheme("OPEN_PENDING");
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

const StyledOrderContainer = styled.div`
    background: #1a1a1a;
    border-radius: 0.5rem;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    padding: 1rem;
    margin-bottom: 1rem;
    border: 1px solid #333;
    cursor: pointer;
    transition: box-shadow 0.2s;
    color: white;

    &:hover {
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    }
`;

const StatusBadge = styled.span`
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.875rem;
    font-weight: 500;

    ${(props) => {
        if (props.status === "open")
            return `
      background-color: #065f46;
      color: #4ade80;
    `;
        if (props.status === "trigger pending")
            return `
      background-color: #854d0e;
      color: #fef08a;
    `;
        return `
      background-color: #374151;
      color: #e5e7eb;
    `;
    }}
`;

const BracketBadge = styled.span`
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.875rem;
    background-color: #1e3a8a;
    color: #93c5fd;
`;

const OrderInfo = styled.div`
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: #9ca3af;
`;

const TradeTypeContainer = styled.div`
    font-weight: 500;
    color: ${(props) => (props.transactionType === 1 ? "#2563eb" : "#dc2626")};
`;

const TransactionLabel = styled.span`
    color: ${(props) => (props.transactionType === 1 ? "#2563eb" : "#dc2626")};
`;

const ReportContainer = styled.div`
    background-color: #262626;
    padding: 0.75rem;
    border-radius: 0.375rem;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    color: #e5e7eb;

    .text-secondary {
        color: #9ca3af !important;
    }
`;

const CancelButton = styled.button`
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.75rem;
    background-color: #ef4444;
    color: white;
    border-radius: 0.375rem;
    transition: background-color 0.2s;

    &:hover {
        background-color: #dc2626;
    }
`;

const ExpandedSection = styled.div`
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #333;
`;

const OrderItem = memo(
    function OrderItem(props) {
        debugger;
        const [toggleShowOrderEvents, setToggleShowOrderEvents] = useState(false);

        if (!props.orders) return null;
        debugger;
        let { orders } = props;
        orders.forEach((o) => (o.datetime = combineTimestampsMicroSeconds(o)));
        orders.sort((a, b) => a.datetime - b.datetime);

        const order = orders[0];
        const compiledOrder = compileOrders(orders)[order.basketId];
        const reportTexts = [];
        let isBracket = false;

        orders.forEach((order, index) => {
            if (order.bracketType) isBracket = true;
            let timeDiff = 0;
            if (index > 0) {
                const prevOrder = orders[index - 1];
                timeDiff = order.datetime - prevOrder.datetime;
            }
            if (order.reportText || order.status || order.reportText) {
                reportTexts.push({
                    timeDiff,
                    templateId: order.templateId,
                    notifyType: order.notifyType,
                    text: order.reportText || order.status || order.reportText,
                    time: formatTimeWithMicroSeconds(order),
                });
            }
        });

        return (
            <StyledOrderContainer onClick={() => setToggleShowOrderEvents(!toggleShowOrderEvents)}>
                <div className="row">
                    {/* Main Order Info */}
                    <div className="col-4">
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <StatusBadge status={compiledOrder.status}>{compiledOrder.status}</StatusBadge>
                            {isBracket && <BracketBadge>BRACKET</BracketBadge>}
                        </div>

                        <OrderInfo>
                            <div>Net Qty: {compiledOrder.netQuantity}</div>
                            <div>Template ID: {compiledOrder.templateId}</div>
                            <div>Basket ID: {compiledOrder.basketId.slice(-4)}</div>
                        </OrderInfo>

                        <div className="d-flex align-items-center gap-2 mt-2">
                            {compiledOrder.transactionType === 1 ? <ArrowUpCircle size={20} color="#2563eb" /> : <ArrowDownCircle size={20} color="#dc2626" />}
                            <span>{`${compiledOrder.transactionType === 1 ? "BUY" : "SELL"} ${compiledOrder.quantity} of ${compiledOrder.symbol} at ${priceType(compiledOrder.priceType)}`}</span>
                        </div>

                        <div className="mt-2">
                            {compiledOrder.symbol} {compiledOrder.totalFillSize === compiledOrder.quantity ? "filled" : `partially filled ${compiledOrder.totalFillSize} of ${compiledOrder.quantity}:${compiledOrder.totalUnfilledSize} to fill`}
                        </div>
                    </div>

                    {/* Trade Type Info */}
                    <div className="col-3">
                        <TradeTypeContainer transactionType={order.transactionType}>
                            {priceType(compiledOrder.priceType)} -<TransactionLabel transactionType={order.transactionType}>{orderTransactionType(compiledOrder.transactionType)}</TransactionLabel>- ${compiledOrder.price || compiledOrder.avgFillPrice || compiledOrder.triggerPrice || "No price"}
                        </TradeTypeContainer>
                    </div>

                    {/* Time and Price Info */}
                    <div className="col-3">
                        <div className="text-secondary">{new Date(compiledOrder.ssboe * 1000).toLocaleString()}</div>
                        <div className="mt-2 fw-medium">Avg. Fill: ${compiledOrder.avgFillPrice || "-"}</div>
                    </div>

                    {/* Action Buttons */}
                    <div className="col-2 d-flex justify-content-end">
                        {(compiledOrder.status === "open" || compiledOrder.status === "trigger pending") && (
                            <CancelButton
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    await API.rapi_cancelOrder({
                                        basketId: compiledOrder.basketId,
                                    });
                                }}
                            >
                                <XCircle size={16} className="me-1" />
                                Cancel
                            </CancelButton>
                        )}
                    </div>

                    {/* Expanded Order Events */}
                    {toggleShowOrderEvents && (
                        <ExpandedSection className="col-12">
                            {reportTexts.map((report) => {
                                const { text, time, notifyType, templateId, timeDiff } = report;
                                return (
                                    <ReportContainer key={`${time}-${notifyType}-${templateId}`}>
                                        {text ? (
                                            <div>
                                                <div className="d-flex justify-content-between align-items-start">
                                                    <div>
                                                        <span className="fw-medium">{notifyType}</span>
                                                        <span className="ms-2 text-secondary">#{templateId}</span>
                                                    </div>
                                                    <div className="small text-secondary">
                                                        <div>{time}</div>
                                                        {timeDiff && <div>{formatTimeDiffInMicroSeconds(timeDiff)}</div>}
                                                    </div>
                                                </div>
                                                <p className="mt-2 mb-0 text-secondary">{text}</p>
                                            </div>
                                        ) : (
                                            compiledOrder.reportText
                                        )}
                                    </ReportContainer>
                                );
                            })}
                        </ExpandedSection>
                    )}
                </div>
            </StyledOrderContainer>
        );
    },
    (prevProps, nextProps) => {
        debugger;
        return JSON.stringify(prevProps.orders) === JSON.stringify(nextProps.orders);
    }
);
