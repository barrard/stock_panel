import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { IconButton } from "../../../StratBuilder/components";

import { AiOutlinePlus, AiOutlineMinus } from "react-icons/ai";

import API from "../../../API";
import Select from "./Select";
import Input from "./Input";
import { TICKS } from "../../../../indicators/indicatorHelpers/TICKS";
const ticks = TICKS();
export default function TradeControls(props = {}) {
    const { symbolData, symbol, lastTrade } = props;
    const [priceType, setPriceType] = useState(2);
    const [limitPrice, setLimitPrice] = useState(props.lastTrade.tradePrice);
    // const symbolData = fullSymbols.find((s) => s.baseSymbol == symbol.value);

    useEffect(() => {
        if (!limitPrice) {
            setLimitPrice(props.lastTrade.tradePrice);
            // console.log(props);
        }
    }, [props.lastTrade.tradePrice]);

    const sendOrder = async (transactionInfo) => {
        debugger;
        // alert(`${priceType} Sell ${limitPrice}`);
        let resp = await API.rapi_submitOrder({
            symbol: symbolData.fullSymbol,
            exchange: symbolData.exchange,
            priceType,
            limitPrice,
            ...transactionInfo,
        });

        console.log(resp);
    };

    const orderTypes = [
        { value: 2, name: "Market" },
        { value: 1, name: "Limit" },
        { value: 3, name: "Stop Limit" },
        { value: 4, name: "Stop Market" },
    ];

    return (
        <div className="row g-0  flex-column">
            {/* <div className="col"></div> */}

            <div className="row g-0 justify-content-center">
                {symbolData?.fullSymbol}

                {orderTypes.map((type) => (
                    <div key={type.value} className="col-auto">
                        <OrderTypeButton
                            key={type.value}
                            selected={priceType === type.value}
                            onClick={() => setPriceType(type.value)}
                            variant={priceType === type.value ? "default" : "outline"}
                        >
                            {type.name}
                        </OrderTypeButton>
                    </div>
                ))}
            </div>
            <div className="row g-0 justify-content-center align-items-center">
                <div className="col-auto">
                    <Input step={ticks[symbolData?.baseSymbol]} type="number" setValue={setLimitPrice} value={limitPrice} />
                </div>
                <div className="col-auto">
                    <IconButton
                        borderColor={"green"}
                        title="up"
                        onClick={() =>
                            setLimitPrice((limit) => {
                                const newPrice = (parseFloat(limit) + ticks[symbolData?.baseSymbol]).toFixed(2);
                                return newPrice;
                            })
                        }
                        rIcon={<AiOutlinePlus />}
                    />
                    <IconButton
                        borderColor={"red"}
                        title="down"
                        onClick={() => {
                            setLimitPrice((limit) => {
                                const newPrice = (parseFloat(limit) - ticks[symbolData?.baseSymbol]).toFixed(2);
                                return newPrice;
                            });
                        }}
                        rIcon={<AiOutlineMinus />}
                    />
                </div>
            </div>

            <div className="row g-0 justify-content-center align-items-center">
                <div className="col-auto d-flex align-items-center ">
                    <BuySellButton color="green" onClick={() => sendOrder({ transactionType: 1 })}>
                        Buy
                    </BuySellButton>

                    <BuySellButton color="red" onClick={() => sendOrder({ transactionType: 2 })}>
                        Sell
                    </BuySellButton>
                </div>
            </div>
        </div>
    );
}

const BuySellButton = styled.div`
    border-radius: 5px;
    margin: 0px 2px;
    padding: 2px 15px;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    background: ${({ color }) => color};
    user-select: none;
`;

const OrderTypeButton = styled.div`
    border-radius: 5px;
    margin: 0px 2px;
    padding: 2px 5px;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    background: ${({ selected }) => (selected ? "steelblue" : "grey")};
    user-select: none;
`;
