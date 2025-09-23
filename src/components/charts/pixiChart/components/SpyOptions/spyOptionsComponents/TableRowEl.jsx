import React, { useState } from "react";
import { TableRow, Lvl2Text, PutCell, CallCell, StrikeCellCenter, PutChangeCell, CallChangeCell, ChartTableRow } from "./styledComponents";
import OptionContractChart from "../OptionContractChart";

const formatPrice = (price) => {
    if (price === null || price === undefined) return "-";
    return price.toFixed(2);
};

const formatVolume = (volume) => {
    if (!volume) return "-";
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
    return volume.toString();
};

const formatPercent = (percent) => {
    if (percent === null || percent === undefined) return "-";
    const sign = percent >= 0 ? "+" : "";
    return `${sign}${percent.toFixed(2)}%`;
};

const buttonStyle = {
    fontSize: "9px",
    padding: "1px 4px",
    // backgroundColor: "#51cf66",
    color: "white",
    border: "none",
    borderRadius: "2px",
    cursor: "pointer",
    marginTop: "2px",
    width: "100%",
    maxWidth: "35px",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.7)",
};

// Compact buy button for bid cells
const BuyButton = ({ onOrder, type, quantity, orderType, limitPrice, option }) => {
    const handleOrder = () => {
        onOrder({
            action: "BUY",
            type,
            quantity: parseInt(quantity),
            orderType,
            limitPrice: orderType === "LIMIT" ? parseFloat(limitPrice) : null,
            option,
        });
    };

    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                handleOrder();
            }}
            style={{
                backgroundColor: "#51cf00",
                ...buttonStyle,
            }}
        >
            BUY
        </button>
    );
};

// Compact sell button for ask cells
const SellButton = ({ onOrder, type, quantity, orderType, limitPrice, option }) => {
    const handleOrder = () => {
        onOrder({
            action: "SELL",
            type,
            quantity: parseInt(quantity),
            orderType,
            limitPrice: orderType === "LIMIT" ? parseFloat(limitPrice) : null,
            option,
        });
    };

    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                handleOrder();
            }}
            style={{
                backgroundColor: "#ff6b6b",
                ...buttonStyle,
            }}
        >
            SELL
        </button>
    );
};

// Middle cell controls (quantity, order type, limit price with arrows, position info)
const MiddleCellControls = ({
    option,
    type,
    position,
    openOrders,
    quantity,
    setQuantity,
    orderType,
    setOrderType,
    limitPrice,
    setLimitPrice,
}) => {
    const currentPnL = position ? (option?.last - position.averagePrice) * position.quantity * 100 : 0;
    const pnlPercent = position && position.averagePrice ? ((option?.last - position.averagePrice) / position.averagePrice) * 100 : 0;

    const buttonStyle = {
        fontSize: "15px",
        padding: "0px 8px",
        margin: "2px 2px",
        color: "white",
        border: "none",
        borderRadius: "1px",
        cursor: "pointer",
        height: "20px",
        minWidth: "12px",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.7)",
    };

    const QuantityButtons = (props = {}) => {
        const { setValue, increment = 1 } = props;
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "0px" }}>
                <button
                    onClick={() => setValue((prev) => (parseFloat(prev) + increment).toFixed(2))}
                    style={{
                        backgroundColor: "#51cf66",
                        ...buttonStyle,
                    }}
                    title={`Increase price by ${increment}`}
                >
                    ▲
                </button>
                <button
                    onClick={() => setValue((prev) => Math.max(increment, parseFloat(prev) - increment).toFixed(2))}
                    style={{
                        backgroundColor: "#ff6b6b",
                        ...buttonStyle,
                    }}
                    title={`Decrease price by ${increment}`}
                >
                    ▼
                </button>
            </div>
        );
    };
    return (
        <div style={{ fontSize: "10px" }}>
            {/* Last Price */}
            <div style={{ fontWeight: 500, marginBottom: "2px" }}>{option ? formatPrice(option.last) : "-"}</div>

            {/* Delta/Gamma info */}
            {type === "PUT" && option?.delta !== undefined && <Lvl2Text>Delta {option.delta}</Lvl2Text>}
            {type === "CALL" && option?.gamma !== undefined && <Lvl2Text>Gex {option.gamma}</Lvl2Text>}

            {/* Position Info */}
            {position && (
                <div style={{ fontSize: "9px", fontWeight: "bold", marginBottom: "2px" }}>
                    <div>
                        Pos: {position.quantity} @ ${position.averagePrice.toFixed(2)}
                    </div>
                    <div style={{ color: currentPnL >= 0 ? "#51cf66" : "#ff6b6b" }}>
                        P&L: ${currentPnL.toFixed(0)} ({pnlPercent.toFixed(1)}%)
                    </div>
                </div>
            )}

            {/* Open Orders */}
            {openOrders && openOrders.length > 0 && (
                <div style={{ fontSize: "8px", color: "#666", marginBottom: "2px" }}>
                    {openOrders.map((order, idx) => (
                        <div key={idx}>
                            {order.action} {order.quantity} @ ${order.limitPrice?.toFixed(2) || "MKT"}
                        </div>
                    ))}
                </div>
            )}

            {/* Trading Controls */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                {/* Quantity and Order Type Row */}
                <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
                    <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        style={{ width: "30px", fontSize: "9px", padding: "1px" }}
                        placeholder="Qty"
                    />
                    <QuantityButtons setValue={setQuantity} value={quantity} increment={1} />

                    <select value={orderType} onChange={(e) => setOrderType(e.target.value)} style={{ fontSize: "9px", padding: "1px" }}>
                        <option value="LIMIT">LMT</option>
                        <option value="MARKET">MKT</option>
                    </select>
                </div>

                {/* Limit Price with Up/Down Arrows */}
                {orderType === "LIMIT" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "1px" }}>
                        <input
                            type="number"
                            step="0.01"
                            value={limitPrice}
                            onChange={(e) => setLimitPrice(e.target.value)}
                            style={{ width: "40px", fontSize: "9px", padding: "1px" }}
                        />
                        <QuantityButtons setValue={setLimitPrice} value={limitPrice} increment={0.01} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default function TableRowEl({
    putOption,
    strike,
    exp,
    callOption,
    putLvl2,
    callLvl2,
    spyLevelOne,
    Socket,
    // New props for trading functionality
    positions = {}, // { PUT: { quantity, averagePrice }, CALL: { quantity, averagePrice } }
    openOrders = { PUT: [], CALL: [] }, // Array of open orders for each type
    onOrder = () => {}, // Callback for order placement
}) {
    const [showChart, setShowChart] = useState(false);

    // PUT controls state
    const [putQuantity, setPutQuantity] = useState(1);
    const [putOrderType, setPutOrderType] = useState("LIMIT");
    const [putLimitPrice, setPutLimitPrice] = useState(putOption?.last || 0);

    // CALL controls state
    const [callQuantity, setCallQuantity] = useState(1);
    const [callOrderType, setCallOrderType] = useState("LIMIT");
    const [callLimitPrice, setCallLimitPrice] = useState(callOption?.last || 0);

    const putBreakEven = strike - putOption?.last;
    const putBreakEvenPercent = ((putBreakEven - spyLevelOne?.lastPrice) / spyLevelOne?.lastPrice) * 100;
    const callBreakEven = strike + callOption?.last;
    const callBreakEvenPercent = ((callBreakEven - spyLevelOne?.lastPrice) / spyLevelOne?.lastPrice) * 100;

    const spyPutOptionContractChart = {
        height: 500,
        width: 600,
        spyLevelOne,
        Socket,
        symbol: "SPY",
        strike,
        putCall: "PUT",
        exp,
        tick: putOption,
    };

    const spyCallOptionContractChart = {
        height: 500,
        width: 600,
        spyLevelOne,
        Socket,
        symbol: "SPY",
        strike,
        putCall: "CALL",
        exp,
        tick: callOption,
    };

    // Handle order placement
    const handleOrder = (orderData) => {
        const orderWithStrike = {
            ...orderData,
            strike,
            exp,
            symbol: "SPY",
        };
        onOrder(orderWithStrike);
    };

    return (
        <>
            <TableRow>
                {/* PUT Data (right-aligned) */}
                <PutChangeCell positive={putOption?.percentChange >= 0}>
                    {putOption ? formatPercent(putOption.percentChange) : "-"}
                </PutChangeCell>
                <PutCell>{putOption ? formatVolume(putOption.openInterest) : "-"}</PutCell>
                <PutCell>{putOption ? formatVolume(putOption.totalVolume) : "-"}</PutCell>

                {/* PUT ASK CELL with SELL button */}
                <PutCell onClick={() => setPutLimitPrice(putOption?.ask)} style={{ cursor: "pointer" }}>
                    <div>{putOption ? formatPrice(putOption.ask) : "-"}</div>
                    {putLvl2?.askSideLevels?.[0] && <Lvl2Text>@{putLvl2.askSideLevels[0].size}</Lvl2Text>}
                    {putOption && (
                        <SellButton
                            onOrder={handleOrder}
                            type="PUT"
                            quantity={putQuantity}
                            orderType={putOrderType}
                            limitPrice={putLimitPrice}
                            option={putOption}
                        />
                    )}
                </PutCell>

                {/* PUT LAST PRICE CELL with Trading Controls */}
                <PutCell style={{ minWidth: "80px", padding: "4px" }}>
                    <MiddleCellControls
                        option={putOption}
                        type="PUT"
                        position={positions.PUT}
                        openOrders={openOrders.PUT}
                        quantity={putQuantity}
                        setQuantity={setPutQuantity}
                        orderType={putOrderType}
                        setOrderType={setPutOrderType}
                        limitPrice={putLimitPrice}
                        setLimitPrice={setPutLimitPrice}
                    />
                    <Lvl2Text>BE {putBreakEven.toFixed(2)}</Lvl2Text>
                    <Lvl2Text>BE% {putBreakEvenPercent.toFixed(2)}</Lvl2Text>
                </PutCell>

                {/* PUT BID CELL with BUY button */}
                <PutCell onClick={() => setPutLimitPrice(putOption?.bid)} style={{ cursor: "pointer" }}>
                    <div>{putOption ? formatPrice(putOption.bid) : "-"}</div>
                    {putLvl2?.bidSideLevels?.[0] && <Lvl2Text>@{putLvl2.bidSideLevels[0].size}</Lvl2Text>}
                    {putOption && (
                        <BuyButton
                            onOrder={handleOrder}
                            type="PUT"
                            quantity={putQuantity}
                            orderType={putOrderType}
                            limitPrice={putLimitPrice}
                            option={putOption}
                        />
                    )}
                </PutCell>

                {/* STRIKE (center) */}
                <StrikeCellCenter onClick={() => setShowChart(!showChart)} style={{ cursor: "pointer" }}>
                    {strike.toFixed(0)}
                    <div style={{ fontSize: "10px", color: "#666" }}>{showChart ? "📊" : "📈"}</div>
                </StrikeCellCenter>

                {/* CALL BID CELL with BUY button */}
                <CallCell onClick={() => setCallLimitPrice(callOption?.bid)} style={{ cursor: "pointer" }}>
                    <div>{callOption ? formatPrice(callOption.bid) : "-"}</div>
                    {callLvl2?.bidSideLevels?.[0] && <Lvl2Text>@{callLvl2.bidSideLevels[0].size}</Lvl2Text>}
                    {callOption && (
                        <BuyButton
                            onOrder={handleOrder}
                            type="CALL"
                            quantity={callQuantity}
                            orderType={callOrderType}
                            limitPrice={callLimitPrice}
                            option={callOption}
                        />
                    )}
                </CallCell>

                {/* CALL LAST PRICE CELL with Trading Controls */}
                <CallCell style={{ minWidth: "80px", padding: "4px" }}>
                    <MiddleCellControls
                        option={callOption}
                        type="CALL"
                        position={positions.CALL}
                        openOrders={openOrders.CALL}
                        quantity={callQuantity}
                        setQuantity={setCallQuantity}
                        orderType={callOrderType}
                        setOrderType={setCallOrderType}
                        limitPrice={callLimitPrice}
                        setLimitPrice={setCallLimitPrice}
                    />
                    <Lvl2Text>BE {callBreakEven.toFixed(2)}</Lvl2Text>
                    <Lvl2Text>BE% {callBreakEvenPercent.toFixed(2)}</Lvl2Text>
                </CallCell>

                {/* CALL ASK CELL with SELL button */}
                <CallCell onClick={() => setCallLimitPrice(callOption?.ask)} style={{ cursor: "pointer" }}>
                    <div>{callOption ? formatPrice(callOption.ask) : "-"}</div>
                    {callLvl2?.askSideLevels?.[0] && <Lvl2Text>@{callLvl2.askSideLevels[0].size}</Lvl2Text>}
                    {callOption && (
                        <SellButton
                            onOrder={handleOrder}
                            type="CALL"
                            quantity={callQuantity}
                            orderType={callOrderType}
                            limitPrice={callLimitPrice}
                            option={callOption}
                        />
                    )}
                </CallCell>

                <CallCell>{callOption ? formatVolume(callOption.totalVolume) : "-"}</CallCell>
                <CallCell>{callOption ? formatVolume(callOption.openInterest) : "-"}</CallCell>

                <CallChangeCell positive={callOption?.percentChange >= 0}>
                    {callOption ? formatPercent(callOption.percentChange) : "-"}
                </CallChangeCell>
            </TableRow>

            {showChart && (
                <ChartTableRow>
                    <td colSpan={12}>
                        <div className="row">
                            <div className="col-6">
                                <OptionContractChart {...spyPutOptionContractChart} />
                            </div>
                            <div className="col-6">
                                <OptionContractChart {...spyCallOptionContractChart} />
                            </div>
                        </div>
                    </td>
                </ChartTableRow>
            )}
        </>
    );
}
