import React, { useState, useMemo, memo } from "react";
import styled from "styled-components";

import { ArrowUpCircle, ArrowDownCircle, XCircle } from "lucide-react";

import API from "../../../../components/API";
import { compileOrders, priceType, formatTimeWithMicroSeconds, combineTimestampsMicroSeconds, formatTimeDiffInMicroSeconds } from "./utils";

const classifyOrder = (order) => {
    if (!order) return "unknown";
    const status = (order.status || "").toLowerCase();
    const completionReason = (order.completionReason || "").toUpperCase();

    if (order.isCancel || completionReason === "C" || status.includes("cancel")) return "cancelled";
    if (status === "complete" || completionReason === "F" || order.isComplete) return "closed";
    if (order.totalUnfilledSize === 0 && order.totalFillSize >= order.quantity) return "closed";

    return "open";
};

const getOrderTimestamp = (order) => {
    if (!order) return 0;
    if (order.eventTimestampMs) return order.eventTimestampMs;
    if (order.datetime) return order.datetime;
    if (order.fillTime && !Number.isNaN(Number(order.fillTime))) return Number(order.fillTime) * 1000;
    if (order.endTime) return Number(order.endTime) * 1000;
    if (order.ssboe) return Number(order.ssboe) * 1000;
    return Date.now();
};

const extractPrice = (order) => order?.avgFillPrice ?? order?.price ?? order?.triggerPrice ?? null;

const toDisplayNumber = (value) => {
    if (value == null || value === "") return null;
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
};

const formatPriceValue = (value) => {
    const numericValue = toDisplayNumber(value);
    if (numericValue == null) return null;
    return `$${numericValue.toFixed(2)}`;
};

const findBestPrice = (...orders) => {
    for (const order of orders) {
        if (!order) continue;
        const candidate =
            order.avgFillPrice ??
            order.fillPrice ??
            order.price ??
            order.triggerPrice ??
            order.limitPrice ??
            order.stopPrice ??
            order.stopLimitPrice;
        const numericValue = toDisplayNumber(candidate);
        if (numericValue != null) return numericValue;
    }
    return null;
};

const formatContracts = (value) => {
    const numericValue = toDisplayNumber(value);
    if (numericValue == null) return "-";
    return Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(2);
};

const normalizeTimestampValue = (value) => {
    if (!value) return null;
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) {
        return numericValue < 1e12 ? numericValue * 1000 : numericValue;
    }
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : null;
};

const formatTimestamp = (value) => {
    const timestamp = normalizeTimestampValue(value);
    if (!Number.isFinite(timestamp)) return "-";
    return new Date(timestamp).toLocaleString([], {
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
    });
};

const formatShortTime = (value) => {
    const timestamp = normalizeTimestampValue(value);
    if (!Number.isFinite(timestamp)) return "-";
    return new Date(timestamp).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
    });
};

const formatPnL = (value) => {
    const numericValue = toDisplayNumber(value);
    if (numericValue == null) return "-";
    return `${numericValue > 0 ? "+" : ""}${numericValue.toFixed(2)}`;
};

const getFilledQuantity = (order) => {
    if (!order) return 0;
    if (order.totalFillSize != null) return order.totalFillSize;
    if (order.fillSize != null) return order.fillSize;
    if (order.confirmedSize != null) return order.confirmedSize;
    if (order.quantity != null && order.totalUnfilledSize != null) {
        const derived = order.quantity - order.totalUnfilledSize;
        if (derived > 0) return derived;
    }
    return 0;
};

const getSignedQuantity = (order) => {
    if (!order) return 0;
    const qty = getFilledQuantity(order);
    if (!qty) return 0;
    const direction = order.transactionType === 1 ? 1 : order.transactionType === 2 ? -1 : Math.sign(order.netQuantity || qty);
    return qty * direction;
};

const normalizeBasket = (basketId, events) => {
    if (!Array.isArray(events) || events.length === 0) return null;

    const normalizedEvents = events
        .map((event) => ({
            ...event,
            datetime: event.eventTimestampMs ?? combineTimestampsMicroSeconds(event),
        }))
        .sort((a, b) => a.datetime - b.datetime);

    const compiledMap = compileOrders(normalizedEvents, {});
    const primaryBasketId =
        normalizedEvents.find((event) => event.legType === "entry")?.basketId ??
        normalizedEvents.find((event) => event.entryBasketId)?.entryBasketId ??
        basketId;
    const compiledOrder = compiledMap[primaryBasketId] || compiledMap[basketId] || compiledMap[Object.keys(compiledMap)[0]];

    if (!compiledOrder) return null;

    return {
        basketId,
        compiledOrder,
        events: normalizedEvents,
        classification: classifyOrder(compiledOrder),
        timestamp: getOrderTimestamp(compiledOrder),
    };
};

const buildPositionSummary = (baskets) => {
    const eventsBySymbol = {};

    baskets.forEach(({ basketId, compiledOrder }) => {
        if (!compiledOrder?.symbol) return;
        const qty = getSignedQuantity(compiledOrder);
        if (!qty && compiledOrder.netQuantity == null) return;

        const event = {
            basketId,
            symbol: compiledOrder.symbol,
            qty,
            price: extractPrice(compiledOrder),
            timestamp: getOrderTimestamp(compiledOrder),
            order: compiledOrder,
            netQuantity: compiledOrder.netQuantity != null ? Number(compiledOrder.netQuantity) : null,
        };

        if (!eventsBySymbol[event.symbol]) eventsBySymbol[event.symbol] = [];
        eventsBySymbol[event.symbol].push(event);
    });

    const activePositions = [];
    const closedPositions = [];

    Object.entries(eventsBySymbol).forEach(([symbol, events]) => {
        events.sort((a, b) => a.timestamp - b.timestamp);

        const longLots = [];
        const shortLots = [];
        let runQty = 0;
        let runPnl = 0;
        let runNet = 0;

        events.forEach((event) => {
            if (event.netQuantity != null) {
                const targetNet = Number(event.netQuantity);
                event.delta = targetNet - runNet;
                runNet = targetNet;
            } else {
                event.delta = event.qty;
                runNet += event.delta;
            }
            event.runNet = runNet;

            // console.log("[OrdersList] event", {
            //     symbol,
            //     basketId: event.basketId,
            //     reportType: event.order?.reportType,
            //     status: event.order?.status,
            //     transactionType: event.order?.transactionType,
            //     qty: event.qty,
            //     netQuantity: event.netQuantity,
            //     delta: event.delta,
            //     runNet,
            // });
        });

        events.forEach((event) => {
            const settleLots = (lotStack, entrySide, exitSide) => {
                let remaining = Math.abs(event.delta);
                while (remaining > 0 && lotStack.length) {
                    const lot = lotStack[0];
                    const closeQty = Math.min(remaining, lot.remaining);
                    const entryPrice = lot.price ?? event.price ?? null;
                    const exitPrice = event.price ?? lot.price ?? null;
                    const sideMultiplier = entrySide === "BUY" ? 1 : -1;
                    const pnl = exitPrice != null && entryPrice != null ? (exitPrice - entryPrice) * closeQty * sideMultiplier : null;
                    if (pnl != null) runPnl += pnl;

                    closedPositions.push({
                        symbol,
                        quantity: closeQty,
                        entrySide,
                        exitSide,
                        entryPrice,
                        exitPrice,
                        entryTime: lot.timestamp,
                        exitTime: event.timestamp,
                        pnl,
                        runQty: event.runNet,
                        runPnl,
                        entryOrder: lot.order,
                        exitOrder: event.order,
                    });

                    // console.log("[OrdersList] closedLeg", {
                    //     symbol,
                    //     entrySide,
                    //     exitSide,
                    //     closeQty,
                    //     entryPrice,
                    //     exitPrice,
                    //     pnl,
                    //     runNet: event.runNet,
                    //     runPnl,
                    // });

                    lot.remaining -= closeQty;
                    remaining -= closeQty;
                    if (lot.remaining <= 0) lotStack.shift();
                }
                return remaining;
            };

            if (event.delta > 0) {
                const leftover = settleLots(shortLots, "SELL", "BUY");
                if (leftover > 0) {
                    longLots.push({
                        basketId: event.basketId,
                        timestamp: event.timestamp,
                        price: event.price,
                        remaining: leftover,
                        order: event.order,
                    });
                }
            } else if (event.delta < 0) {
                const leftover = settleLots(longLots, "BUY", "SELL");
                if (leftover > 0) {
                    shortLots.push({
                        basketId: event.basketId,
                        timestamp: event.timestamp,
                        price: event.price,
                        remaining: leftover,
                        order: event.order,
                    });
                }
            }
        });

        longLots.forEach((lot) =>
            activePositions.push({
                symbol,
                direction: "Long",
                quantity: lot.remaining,
                entryPrice: lot.price,
                entryTime: lot.timestamp,
                order: lot.order,
            }),
        );
        shortLots.forEach((lot) =>
            activePositions.push({
                symbol,
                direction: "Short",
                quantity: lot.remaining,
                entryPrice: lot.price,
                entryTime: lot.timestamp,
                order: lot.order,
            }),
        );
    });

    const aggregatedActiveMap = activePositions.reduce((acc, lot) => {
        const key = `${lot.symbol}-${lot.direction}`;
        if (!acc[key]) {
            acc[key] = {
                symbol: lot.symbol,
                direction: lot.direction,
                quantity: 0,
                entryPriceSum: 0,
                entryPriceWeight: 0,
                entryTime: lot.entryTime,
            };
        }
        acc[key].quantity += lot.quantity;
        if (lot.entryPrice != null) {
            acc[key].entryPriceSum += lot.entryPrice * lot.quantity;
            acc[key].entryPriceWeight += lot.quantity;
        }
        acc[key].entryTime = Math.min(acc[key].entryTime || lot.entryTime, lot.entryTime || acc[key].entryTime || Date.now());
        return acc;
    }, {});

    const aggregatedActivePositions = Object.values(aggregatedActiveMap).map((item) => ({
        symbol: item.symbol,
        direction: item.direction,
        quantity: item.quantity,
        entryPrice: item.entryPriceWeight ? item.entryPriceSum / item.entryPriceWeight : null,
        entryTime: item.entryTime,
    }));

    return {
        activePositions: aggregatedActivePositions,
        closedPositions: closedPositions.sort((a, b) => (b.exitTime || 0) - (a.exitTime || 0)),
    };
};

export default function OrdersList(props) {
    const { orders = {} } = props;

    const { openOrders, activePositions, closedPositions } = useMemo(() => {
        const baskets = Object.entries(orders || {})
            .map(([basketId, events]) => normalizeBasket(basketId, events))
            .filter(Boolean)
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        const openOrders = baskets.filter(({ classification }) => classification === "open");
        const { activePositions, closedPositions } = buildPositionSummary(baskets);

        return {
            openOrders,
            activePositions,
            closedPositions,
        };
    }, [orders]);

    return (
        <OrdersPanel>
            <SectionBlock>
                <SectionHeader>
                    <span>Open Positions</span>
                    <SectionCount>{activePositions.length}</SectionCount>
                </SectionHeader>
                {activePositions.length === 0 ? (
                    <EmptyState>No open positions</EmptyState>
                ) : (
                    <PositionsGrid>
                        {activePositions.map((position, idx) => (
                            <PositionCard key={`${position.symbol}-${idx}`}>
                                <PositionTopRow>
                                    <PositionSymbol>{position.symbol}</PositionSymbol>
                                    <PositionDirection direction={position.direction}>{position.direction}</PositionDirection>
                                </PositionTopRow>
                                <PositionStatsGrid>
                                    <CompactStat>
                                        <CompactLabel>Qty</CompactLabel>
                                        <CompactValue>{formatContracts(position.quantity)}</CompactValue>
                                    </CompactStat>
                                    <CompactStat>
                                        <CompactLabel>Entry</CompactLabel>
                                        <CompactValue>{formatPriceValue(position.entryPrice) || "-"}</CompactValue>
                                    </CompactStat>
                                    <CompactStat>
                                        <CompactLabel>Opened</CompactLabel>
                                        <CompactValue>{formatTimestamp(position.entryTime)}</CompactValue>
                                    </CompactStat>
                                </PositionStatsGrid>
                            </PositionCard>
                        ))}
                    </PositionsGrid>
                )}
            </SectionBlock>

            <SectionBlock>
                <SectionHeader>
                    <span>Open Orders</span>
                    <SectionCount>{openOrders.length}</SectionCount>
                </SectionHeader>
                {openOrders.length === 0 ? (
                    <EmptyState>No active orders</EmptyState>
                ) : (
                    <OrderListStack>
                        {openOrders.map(({ basketId, events, compiledOrder }) => (
                            <OrderItem key={basketId} basketId={basketId} events={events} compiledOrder={compiledOrder} />
                        ))}
                    </OrderListStack>
                )}
            </SectionBlock>

            <SectionBlock>
                <SectionHeader>
                    <span>Recently Closed</span>
                    <SectionCount>{closedPositions.length}</SectionCount>
                </SectionHeader>
                {closedPositions.length === 0 ? (
                    <EmptyState>No completed positions</EmptyState>
                ) : (
                    <ClosedPositionsTable>
                        <div className="closed-position-head">
                            <div>Symbol</div>
                            <div>Qty</div>
                            <div>Entry</div>
                            <div>Exit</div>
                            <div>PnL</div>
                            <div>Net / Run</div>
                            <div>Times</div>
                        </div>
                        {closedPositions.slice(0, 10).map((position, idx) => (
                            <div key={`closed-pos-${idx}`} className="closed-position-row">
                                <div>{position.symbol}</div>
                                <div>{formatContracts(position.quantity)}</div>
                                <div>
                                    {position.entrySide} @ {formatPriceValue(position.entryPrice) || "-"}
                                </div>
                                <div>
                                    {position.exitSide} @ {formatPriceValue(position.exitPrice) || "-"}
                                </div>
                                <PnlValue value={position.pnl}>{formatPnL(position.pnl)}</PnlValue>
                                <div>
                                    Run Net: {position.runQty ?? "-"}
                                    <br />
                                    Run PnL: {formatPnL(position.runPnl)}
                                </div>
                                <div>
                                    {formatShortTime(position.entryTime)} → {formatShortTime(position.exitTime)}
                                </div>
                            </div>
                        ))}
                    </ClosedPositionsTable>
                )}
            </SectionBlock>
        </OrdersPanel>
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

const StyledOrderContainer = styled.div`
    background: linear-gradient(180deg, #101827 0%, #0e1522 100%);
    border-radius: 0.65rem;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
    padding: 0.7rem 0.8rem;
    border: 1px solid #263243;
    cursor: pointer;
    transition: box-shadow 0.2s;
    color: white;

    &:hover {
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    }
`;

const StatusBadge = styled.span`
    padding: 0.2rem 0.55rem;
    border-radius: 9999px;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;

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

const OrderCardHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.6rem;
    margin-bottom: 0.65rem;
`;

const OrderHeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
`;

const OrderHeaderRight = styled.div`
    text-align: right;
    color: #9ca3af;
    font-size: 0.72rem;
`;

const OrderMainGrid = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(150px, 0.85fr) minmax(150px, 0.8fr) auto;
    gap: 0.65rem;
    align-items: start;

    @media (max-width: 1250px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    @media (max-width: 720px) {
        grid-template-columns: 1fr;
    }
`;

const OrderIdentity = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
`;

const OrderTitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 0.45rem;
    flex-wrap: wrap;
`;

const OrderSymbol = styled.div`
    font-size: 0.92rem;
    font-weight: 700;
    color: #f9fafb;
    letter-spacing: 0.02em;
`;

const OrderSummary = styled.div`
    font-size: 0.8rem;
    color: #d1d5db;
    line-height: 1.3;
`;

const OrderMetaGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.35rem;

    @media (max-width: 720px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
`;

const MetaItem = styled.div`
    padding: 0.42rem 0.5rem;
    border: 1px solid #2b3445;
    border-radius: 0.45rem;
    background: #121a28;
`;

const MetaLabel = styled.div`
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #7c8aa5;
    margin-bottom: 0.12rem;
`;

const MetaValue = styled.div`
    font-size: 0.76rem;
    font-weight: 600;
    color: #f3f4f6;
`;

const PricePanel = styled.div`
    border: 1px solid #243145;
    border-radius: 0.55rem;
    padding: 0.6rem;
    background: linear-gradient(180deg, #0f172a 0%, #111827 100%);
`;

const PricePrimary = styled.div`
    font-size: 1rem;
    font-weight: 700;
    color: #f9fafb;
`;

const PriceSecondary = styled.div`
    margin-top: 0.25rem;
    font-size: 0.73rem;
    color: #94a3b8;
    line-height: 1.3;
`;

const FillPanel = styled.div`
    border: 1px solid #243145;
    border-radius: 0.55rem;
    padding: 0.6rem;
    background: #0b1220;
`;

const FillHeadline = styled.div`
    font-size: 0.78rem;
    font-weight: 600;
    color: #e5e7eb;
`;

const FillSubline = styled.div`
    margin-top: 0.25rem;
    font-size: 0.72rem;
    color: #94a3b8;
    line-height: 1.3;
`;

const BracketBadge = styled.span`
    padding: 0.2rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.68rem;
    font-weight: 700;
    background-color: #1e3a8a;
    color: #93c5fd;
`;

const TradeTypeContainer = styled.div`
    font-weight: 500;
    color: ${(props) => (props.transactionType === 1 ? "#2563eb" : "#dc2626")};
`;

const TradeDirectionLabel = styled.span`
    font-weight: 600;
    color: ${(props) => (props.transactionType === 1 ? "#22c55e" : props.transactionType === 2 ? "#ef4444" : "#9ca3af")};
`;

const TransactionLabel = styled.span`
    color: ${(props) => (props.transactionType === 1 || props.transactionType === "BUY" ? "#2563eb" : "#dc2626")};
`;

const ReportContainer = styled.div`
    background-color: #262626;
    padding: 0.55rem 0.65rem;
    border-radius: 0.375rem;
    margin-bottom: 0.45rem;
    font-size: 0.76rem;
    color: #e5e7eb;

    .text-secondary {
        color: #9ca3af !important;
    }
`;

const CancelButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.32rem 0.55rem;
    background-color: #ef4444;
    color: white;
    border-radius: 0.375rem;
    transition: background-color 0.2s;
    border: none;
    font-size: 0.72rem;
    font-weight: 600;

    &:hover {
        background-color: #dc2626;
    }
`;

const ExpandedSection = styled.div`
    margin-top: 0.7rem;
    padding-top: 0.7rem;
    border-top: 1px solid #333;
`;

const OrdersPanel = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.25rem;
    color: #e5e7eb;
`;

const SectionBlock = styled.section`
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    min-width: 0;
`;

const SectionHeader = styled.h5`
    color: #e5e7eb;
    margin: 0;
    font-weight: 700;
    font-size: 0.82rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const SectionCount = styled.span`
    font-size: 0.68rem;
    font-weight: 700;
    padding: 0.14rem 0.42rem;
    border-radius: 9999px;
    color: #cbd5e1;
    background: #172233;
    border: 1px solid #283548;
`;

const EmptyState = styled.div`
    padding: 0.65rem;
    border: 1px dashed #374151;
    border-radius: 0.5rem;
    text-align: center;
    color: #9ca3af;
    font-size: 0.76rem;
`;

const PositionsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    gap: 0.5rem;
`;

const PositionCard = styled.div`
    border: 1px solid #2d394c;
    border-radius: 0.55rem;
    padding: 0.55rem 0.65rem;
    background: #101826;
`;

const PositionTopRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.45rem;
`;

const PositionSymbol = styled.div`
    font-weight: 600;
    color: #f9fafb;
    font-size: 0.86rem;
`;

const PositionDirection = styled.span`
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    color: ${(props) => (props.direction === "Long" ? "#22c55e" : "#ef4444")};
`;

const PositionStatsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.35rem;
`;

const ClosedPositionsTable = styled.div`
    border: 1px solid #374151;
    border-radius: 0.5rem;
    overflow: hidden;
    background: #0f172a;
    max-height: 260px;
    overflow-y: auto;

    .closed-position-head {
        display: grid;
        grid-template-columns:
            minmax(60px, 0.6fr) minmax(50px, 0.45fr) minmax(110px, 0.95fr) minmax(110px, 0.95fr) minmax(70px, 0.55fr) minmax(100px, 0.8fr)
            minmax(100px, 0.85fr);
        gap: 0.45rem;
        padding: 0.45rem 0.6rem;
        font-size: 0.63rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #8fa1b8;
        border-bottom: 1px solid #1f2937;
        background: #121c2c;
        position: sticky;
        top: 0;
        z-index: 1;
    }

    .closed-position-row {
        display: grid;
        grid-template-columns:
            minmax(60px, 0.6fr) minmax(50px, 0.45fr) minmax(110px, 0.95fr) minmax(110px, 0.95fr) minmax(70px, 0.55fr) minmax(100px, 0.8fr)
            minmax(100px, 0.85fr);
        gap: 0.45rem;
        padding: 0.5rem 0.6rem;
        border-bottom: 1px solid #1f2937;
        color: #e5e7eb;
        font-size: 0.72rem;
        align-items: center;

        &:last-child {
            border-bottom: none;
        }
    }
`;

const PnlValue = styled.div`
    font-weight: 700;
    color: ${(props) => {
        const value = toDisplayNumber(props.value);
        if (value == null) return "#e5e7eb";
        return value >= 0 ? "#22c55e" : "#ef4444";
    }};
`;

const OrderListStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
`;

const CompactStat = styled.div`
    padding: 0.34rem 0.42rem;
    border: 1px solid #233043;
    border-radius: 0.42rem;
    background: #111a28;
    min-width: 0;
`;

const CompactLabel = styled.div`
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #7f90a8;
    margin-bottom: 0.1rem;
`;

const CompactValue = styled.div`
    font-size: 0.72rem;
    font-weight: 600;
    color: #eef2ff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const OrderItem = memo(function OrderItem({ events, compiledOrder }) {
    const [expanded, setExpanded] = useState(false);

    if (!events?.length || !compiledOrder) return null;

    const orderedEvents = events.slice().sort((a, b) => a.datetime - b.datetime);
    const latestEvent = orderedEvents[orderedEvents.length - 1];
    const reportTexts = [];
    let isBracket = false;

    orderedEvents.forEach((order, index) => {
        if (order.bracketType) isBracket = true;
        let timeDiff = 0;
        if (index > 0) {
            const prevOrder = orderedEvents[index - 1];
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

    const displayStatus = compiledOrder.status || latestEvent?.status || "pending";
    const displayTransactionType =
        compiledOrder.transactionType ??
        latestEvent?.transactionType ??
        (compiledOrder.netQuantity > 0 ? 1 : compiledOrder.netQuantity < 0 ? 2 : null);

    const displayQuantity =
        compiledOrder.quantity ??
        latestEvent?.quantity ??
        compiledOrder.confirmedSize ??
        latestEvent?.confirmedSize ??
        compiledOrder.totalUnfilledSize ??
        latestEvent?.totalUnfilledSize ??
        compiledOrder.totalFillSize ??
        compiledOrder.netQuantity ??
        0;

    const totalFill = compiledOrder.totalFillSize ?? latestEvent?.totalFillSize ?? 0;
    const totalUnfilled =
        compiledOrder.totalUnfilledSize ??
        latestEvent?.totalUnfilledSize ??
        (displayQuantity > totalFill ? displayQuantity - totalFill : 0);

    const fillSummary =
        totalFill > 0
            ? totalUnfilled > 0
                ? `filled ${totalFill} of ${displayQuantity} (${totalUnfilled} remaining)`
                : "filled"
            : `working ${displayQuantity || "?"} contracts`;

    const orderTypeLabel = priceType(compiledOrder.priceType) || priceType(latestEvent?.priceType) || "Order";
    const primaryPrice = findBestPrice(compiledOrder, latestEvent, ...orderedEvents.slice().reverse());
    const avgFillPrice = findBestPrice(
        { avgFillPrice: compiledOrder.avgFillPrice },
        { avgFillPrice: latestEvent?.avgFillPrice },
        ...orderedEvents
            .slice()
            .reverse()
            .map((event) => ({ avgFillPrice: event.avgFillPrice })),
    );
    const triggerPrice = findBestPrice(
        { triggerPrice: compiledOrder.triggerPrice },
        { triggerPrice: latestEvent?.triggerPrice },
        ...orderedEvents
            .slice()
            .reverse()
            .map((event) => ({ triggerPrice: event.triggerPrice })),
    );
    const limitPrice = findBestPrice(
        { price: compiledOrder.price, limitPrice: compiledOrder.limitPrice },
        { price: latestEvent?.price, limitPrice: latestEvent?.limitPrice },
        ...orderedEvents
            .slice()
            .reverse()
            .map((event) => ({ price: event.price, limitPrice: event.limitPrice })),
    );
    const orderTimestamp = getOrderTimestamp(compiledOrder) || getOrderTimestamp(latestEvent);
    // const basketSuffix = compiledOrder.basketId ? compiledOrder.basketId.slice(-6) : "------";
    const entryBasketId = compiledOrder.entryBasketId ?? latestEvent?.entryBasketId ?? compiledOrder.groupBasketId ?? latestEvent?.groupBasketId;
    const basketSuffix = entryBasketId || compiledOrder.basketId || "------";
    const netQuantity = compiledOrder.netQuantity ?? latestEvent?.netQuantity ?? "-";
    const originalBasketId = compiledOrder.originalBasketId ?? latestEvent?.originalBasketId;
    const linkedBasketIds = compiledOrder.linkedBasketIds ?? latestEvent?.linkedBasketIds;
    const linkedBasketIdsLabel = Array.isArray(linkedBasketIds) ? linkedBasketIds.join(", ") : linkedBasketIds;
    const workingPrice = findBestPrice(
        { price: compiledOrder.price },
        { price: latestEvent?.price },
        ...orderedEvents
            .slice()
            .reverse()
            .map((event) => ({ price: event.price })),
    );
    const submittedTime =
        compiledOrder.orderReceivedFromClientTime ??
        compiledOrder.originalOrderReceivedFromClientTime ??
        compiledOrder.firstAckTime ??
        compiledOrder.openPendingTime ??
        orderTimestamp;
    const activeTime =
        compiledOrder.orderActiveTime ?? compiledOrder.openTime ?? compiledOrder.triggerTime ?? compiledOrder.statusTime ?? orderTimestamp;

    return (
        <StyledOrderContainer onClick={() => setExpanded((prev) => !prev)}>
            <OrderCardHeader>
                <OrderHeaderLeft>
                    <div className="d-flex align-items-center gap-2">
                        <StatusBadge status={displayStatus}>{displayStatus}</StatusBadge>
                        {isBracket && <BracketBadge>BRACKET</BracketBadge>}
                    </div>
                </OrderHeaderLeft>
                <OrderHeaderRight>
                    <div>{orderTimestamp ? new Date(orderTimestamp).toLocaleString() : "-"}</div>
                    <div>Basket #{basketSuffix}</div>
                </OrderHeaderRight>
            </OrderCardHeader>

            <OrderMainGrid>
                <OrderIdentity>
                    <OrderTitleRow>
                        {displayTransactionType === 1 || displayTransactionType === "BUY" ? (
                            <ArrowUpCircle size={20} color="#22c55e" />
                        ) : displayTransactionType === 2 || displayTransactionType === "SELL" ? (
                            <ArrowDownCircle size={20} color="#ef4444" />
                        ) : (
                            <ArrowUpCircle size={20} color="#9ca3af" />
                        )}
                        <OrderSymbol>{compiledOrder.symbol || latestEvent?.symbol || "Unknown symbol"}</OrderSymbol>
                        <TradeDirectionLabel transactionType={displayTransactionType}>
                            {orderTransactionType(displayTransactionType) || "Order"}
                        </TradeDirectionLabel>
                    </OrderTitleRow>

                    <OrderSummary>
                        {orderTransactionType(displayTransactionType) || "Order"} {formatContracts(displayQuantity)} contracts using{" "}
                        {orderTypeLabel}
                    </OrderSummary>

                    <OrderMetaGrid>
                        <MetaItem>
                            <MetaLabel>Net Qty</MetaLabel>
                            <MetaValue>{formatContracts(netQuantity)}</MetaValue>
                        </MetaItem>
                        <MetaItem>
                            <MetaLabel>Template</MetaLabel>
                            <MetaValue>{compiledOrder.templateId ?? latestEvent?.templateId ?? "-"}</MetaValue>
                        </MetaItem>
                        <MetaItem>
                            <MetaLabel>Filled</MetaLabel>
                            <MetaValue>{formatContracts(totalFill)}</MetaValue>
                        </MetaItem>
                        <MetaItem>
                            <MetaLabel>Working</MetaLabel>
                            <MetaValue>{formatContracts(totalUnfilled)}</MetaValue>
                        </MetaItem>
                        <MetaItem>
                            <MetaLabel>Reports</MetaLabel>
                            <MetaValue>{reportTexts.length}</MetaValue>
                        </MetaItem>
                        <MetaItem>
                            <MetaLabel>Price Type</MetaLabel>
                            <MetaValue>{orderTypeLabel}</MetaValue>
                        </MetaItem>
                        <MetaItem>
                            <MetaLabel>Work Px</MetaLabel>
                            <MetaValue>{formatPriceValue(workingPrice) || "-"}</MetaValue>
                        </MetaItem>
                        <MetaItem>
                            <MetaLabel>Fill Px</MetaLabel>
                            <MetaValue>{formatPriceValue(avgFillPrice) || formatPriceValue(primaryPrice) || "-"}</MetaValue>
                        </MetaItem>
                        <MetaItem>
                            <MetaLabel>Bracket</MetaLabel>
                            <MetaValue>
                                {compiledOrder.targetTicks || compiledOrder.stopTicks
                                    ? `T ${compiledOrder.targetTicks ?? "-"} / S ${compiledOrder.stopTicks ?? "-"}`
                                    : isBracket
                                      ? "Linked"
                                      : "-"}
                            </MetaValue>
                        </MetaItem>
                        <MetaItem>
                            <MetaLabel>Linked</MetaLabel>
                            <MetaValue>{linkedBasketIdsLabel || originalBasketId || "-"}</MetaValue>
                        </MetaItem>
                    </OrderMetaGrid>
                </OrderIdentity>

                <PricePanel>
                    <TradeTypeContainer transactionType={displayTransactionType}>
                        <TransactionLabel transactionType={displayTransactionType}>
                            {orderTransactionType(displayTransactionType) || "Order"} · {orderTypeLabel}
                        </TransactionLabel>
                        <PricePrimary>{formatPriceValue(primaryPrice) || "Price pending"}</PricePrimary>
                        <PriceSecondary>
                            <div>Limit: {formatPriceValue(limitPrice) || "-"}</div>
                            <div>Trigger: {formatPriceValue(triggerPrice) || "-"}</div>
                            <div>Avg Fill: {formatPriceValue(avgFillPrice) || "-"}</div>
                        </PriceSecondary>
                    </TradeTypeContainer>
                </PricePanel>

                <FillPanel>
                    <FillHeadline>{fillSummary}</FillHeadline>
                    <FillSubline>
                        <div>Open qty: {formatContracts(displayQuantity)}</div>
                        <div>Status: {displayStatus}</div>
                        <div>Last update: {latestEvent?.status || compiledOrder.status || "-"}</div>
                        <div>Submitted: {formatTimestamp(submittedTime)}</div>
                        <div>Active: {formatTimestamp(activeTime)}</div>
                        <div>Last fill: {formatTimestamp(compiledOrder.fillTime)}</div>
                    </FillSubline>
                </FillPanel>

                <div className="d-flex justify-content-end align-items-start">
                    {(displayStatus === "open" || displayStatus === "trigger pending" || displayStatus === "open pending") && (
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
            </OrderMainGrid>

            {expanded && (
                <ExpandedSection>
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
        </StyledOrderContainer>
    );
});
