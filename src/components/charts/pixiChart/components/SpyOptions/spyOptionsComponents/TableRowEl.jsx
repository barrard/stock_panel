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
    fontSize: "19px",
    padding: "1px 4px",
    color: "white",
    border: "none",
    borderRadius: "2px",
    cursor: "pointer",
    marginTop: "2px",
    width: "100%",
    // maxWidth: "35px",
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

    const quantityButtonStyle = {
        fontSize: "18px",
        padding: "0px 3px",
        margin: "0px 1px",
        color: "white",
        border: "none",
        borderRadius: "1px",
        cursor: "pointer",
        marginTop: "3px",
        // height: "10px",
        // minWidth: "10px",
        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.7)",
    };

    const QuantityButtons = ({ setValue, increment = 1 }) => {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "0px" }}>
                <button
                    onClick={() => setValue((prev) => (parseFloat(prev) + increment).toFixed(increment < 1 ? 2 : 0))}
                    style={{
                        backgroundColor: "#51cf66",
                        ...quantityButtonStyle,
                    }}
                    title={`Increase by ${increment}`}
                >
                    ▲
                </button>
                <button
                    onClick={() => setValue((prev) => Math.max(increment, parseFloat(prev) - increment).toFixed(increment < 1 ? 2 : 0))}
                    style={{
                        backgroundColor: "#ff6b6b",
                        ...quantityButtonStyle,
                    }}
                    title={`Decrease by ${increment}`}
                >
                    ▼
                </button>
            </div>
        );
    };

    return (
        <div style={{ fontSize: "10px", lineHeight: "1.1" }}>
            {/* Last Price */}
            {/* <div style={{ fontWeight: 500, marginBottom: "1px" }}>{option ? formatPrice(option.last) : "-"}</div> */}

            {/* Delta/Gamma info */}
            <Lvl2Text>Delta {option.delta}</Lvl2Text>
            <Lvl2Text>Gex {option.gamma}</Lvl2Text>
            {/* {type === "PUT" && option?.delta !== undefined && <Lvl2Text>Delta {option.delta}</Lvl2Text>}
            {type === "CALL" && option?.gamma !== undefined && <Lvl2Text>Gex {option.gamma}</Lvl2Text>} */}

            {/* Position Info */}
            {position && (
                <div style={{ fontSize: "8px", fontWeight: "bold", marginBottom: "1px" }}>
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
                <div style={{ fontSize: "7px", color: "#666", marginBottom: "1px" }}>
                    {openOrders.map((order, idx) => (
                        <div key={idx}>
                            {order.action} {order.quantity} @ ${order.limitPrice?.toFixed(2) || "MKT"}
                        </div>
                    ))}
                </div>
            )}

            {/* Trading Controls - More Inline */}
            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "1px",
                    alignItems: "center",
                    marginBottom: "1px",
                }}
            >
                {/* Quantity input and buttons */}
                {/* <label style={{ fontSize: "18px", padding: "1px", minWidth: "25px", display: "inline" }} htmlFor="quantity">
                    Qty.
                </label> */}
                {/* <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    style={{ width: "15%", fontSize: "18px", padding: "1px", minWidth: "25px" }}
                    placeholder="1"
                /> */}

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <label style={{ fontSize: "17px", color: "#666", lineHeight: "1" }}>Qty</label>
                    <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        style={{ width: "25px", fontSize: "18px", minWidth: "35px", padding: "1px" }}
                    />
                </div>
                <QuantityButtons setValue={setQuantity} increment={1} />

                {/* Order type selector */}

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <label style={{ fontSize: "17px", color: "#666", lineHeight: "1" }}>Price</label>
                    <select
                        value={orderType}
                        onChange={(e) => setOrderType(e.target.value)}
                        style={{
                            fontSize: "18px",
                            padding: "1px",
                            width: "25px",
                            marginLeft: "10px",
                            marginRight: "10px",
                            minWidth: "80px",
                        }}
                    >
                        <option value="LIMIT">LIMIT</option>
                        <option value="MARKET">MARKET</option>
                        <option value="STOP_MARKET">STOP_MARKET</option>
                        <option value="STOP_LIMIT">STOP_LIMIT</option>
                    </select>
                </div>

                {/* Limit price input and buttons - only show for LIMIT orders */}
                {/* {orderType === "LIMIT" && ( */}
                <>
                    {/* <label style={{ fontSize: "17px", color: "#666", lineHeight: "1" }}>Qty</label> */}

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <label style={{ fontSize: "17px", color: "#666", lineHeight: "1" }}>Price</label>
                        <input
                            disabled={orderType === "MARKET"}
                            type="number"
                            step="0.01"
                            value={limitPrice}
                            onChange={(e) => setLimitPrice(e.target.value)}
                            style={{ width: "75px", fontSize: "18px", minWidth: "55px", padding: "1px" }}
                            placeholder="$"
                        />
                    </div>
                    <QuantityButtons setValue={setLimitPrice} increment={0.01} />
                </>
                {/* )} */}
            </div>

            {/* Break Even Info */}
            <div style={{ fontSize: "8px", color: "#666" }}>
                <Lvl2Text>
                    {/* BE {(type === "PUT" ? option.last : type) || "-"} */}
                    BE {(type === "PUT" ? option.strikePrice - option?.last : option?.strikePrice + option?.last)?.toFixed(2) || "-"}
                </Lvl2Text>
            </div>
        </div>
    );
};

// Styled price display component
const PriceDisplay = ({ onClick = () => {}, children, type = "neutral", clickable = false }) => {
    const baseStyle = {
        display: "inline-block",
        padding: "2px 6px",
        margin: "1px 0",
        borderRadius: "3px",
        border: "1px solid #ddd",
        backgroundColor: "#ffffff",
        fontSize: "18px",
        fontWeight: "500",
        minWidth: "35px",
        textAlign: "center",
        //gold boxshadow
        boxShadow: "0 5px 5px rgba(0, 0, 0, 0.9), 0 0 0 1px #ffcc00",
        fontWeight: "bold",
        // boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
        transition: "all 0.15s ease",
    };

    const typeStyles = {
        ask: {
            borderColor: "#ff9999",
            color: "#cc0000",
        },
        bid: {
            borderColor: "#99cc99",
            color: "#006600",
        },
        neutral: {
            borderColor: "#cccccc",
            color: "#333333",
        },
    };

    const hoverStyle = clickable
        ? {
              transform: "translateY(-1px)",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.15)",
              borderColor: type === "ask" ? "#ff6666" : type === "bid" ? "#66bb66" : "#999999",
          }
        : {};

    return (
        <div
            style={{
                ...baseStyle,
                ...typeStyles[type],
                ...(clickable ? { cursor: "pointer" } : {}),
            }}
            onClick={() => {
                // alert("clicked");
                onClick(5);
            }}
            onMouseEnter={(e) => {
                if (clickable) {
                    Object.assign(e.target.style, hoverStyle);
                }
            }}
            onMouseLeave={(e) => {
                if (clickable) {
                    Object.assign(e.target.style, {
                        transform: "translateY(0)",
                        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                        borderColor: typeStyles[type].borderColor,
                    });
                }
            }}
        >
            {children}
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
                <PutCell style={{ cursor: "pointer" }}>
                    {/* <div>{putOption ? formatPrice(putOption.ask) : "-"}</div> */}
                    <PriceDisplay onClick={() => setPutLimitPrice(putOption?.ask)} type="ask" clickable={true}>
                        {callOption ? formatPrice(putOption?.ask) : "-"}
                    </PriceDisplay>
                    <Lvl2Text>@{putLvl2?.askSideLevels?.[0].size}</Lvl2Text>
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
                <PutCell style={{ minWidth: "100px", padding: "2px" }}>
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
                    <Lvl2Text>BE% {putBreakEvenPercent.toFixed(2)}</Lvl2Text>
                </PutCell>

                {/* PUT BID CELL with BUY button */}
                <PutCell style={{ cursor: "pointer" }}>
                    {/* <div>{putOption ? formatPrice(putOption.bid) : "-"}</div> */}
                    <PriceDisplay onClick={() => setPutLimitPrice(putOption?.bid)} type="bid" clickable={true}>
                        {callOption ? formatPrice(putOption?.bid) : "-"}
                    </PriceDisplay>
                    <Lvl2Text>@{putLvl2?.bidSideLevels?.[0].size}</Lvl2Text>
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
                <CallCell style={{ cursor: "pointer" }}>
                    {/* <div>{callOption ? formatPrice(callOption.bid) : "-"}</div> */}
                    <PriceDisplay onClick={() => setCallLimitPrice(callOption?.bid)} type="bid" clickable={true}>
                        {callOption ? formatPrice(callOption?.bid) : "-"}
                    </PriceDisplay>
                    <Lvl2Text>@{callLvl2?.bidSideLevels?.[0].size}</Lvl2Text>
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
                <CallCell style={{ minWidth: "100px", padding: "2px" }}>
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
                    <Lvl2Text>BE% {callBreakEvenPercent.toFixed(2)}</Lvl2Text>
                </CallCell>

                {/* CALL ASK CELL with SELL button */}
                <CallCell style={{ cursor: "pointer" }}>
                    {/* <div>{callOption ? formatPrice(callOption.ask) : "-"}</div> */}
                    <PriceDisplay onClick={() => setCallLimitPrice(callOption?.ask)} type="ask" clickable={true}>
                        {callOption ? formatPrice(callOption?.ask) : "-"}
                    </PriceDisplay>
                    <Lvl2Text>@{callLvl2?.askSideLevels?.[0].size}</Lvl2Text>
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
