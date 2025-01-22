import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { ButtonWithLongPress } from "../../../StratBuilder/components";

import { AiOutlinePlus, AiOutlineMinus } from "react-icons/ai";

import API from "../../../API";
import Select from "./Select";
import Input from "./Input";
import { TICKS } from "../../../../indicators/indicatorHelpers/TICKS";
const ticks = TICKS();
export default function TradeControls(props = {}) {
    const { symbolData, symbol, lastTrade } = props;
    const [priceType, setPriceType] = useState(2);
    const [isBracket, setIsBracket] = useState(false);
    const [isOco, setIsOco] = useState(false);
    const [limitPrice, setLimitPrice] = useState(props.lastTrade.tradePrice);
    const [oco2PriceType, setOco2PriceType] = useState(1);
    const [oco2LimitPrice, setOco2LimitPrice] = useState(props.lastTrade.tradePrice);

    const [tickTarget, setTickTarget] = useState(5);
    const [targetPrice, setTargetPrice] = useState(null);
    const [tickLoss, setTickLoss] = useState(5);
    const [lossPrice, setLossPrice] = useState(null);
    const [isTrailingStop, setIsTrailingStop] = useState(true);
    // const symbolData = fullSymbols.find((s) => s.baseSymbol == symbol.value);

    useEffect(() => {
        if (!limitPrice) {
            setLimitPrice(props.lastTrade.tradePrice);
            // console.log(props);
        }
    }, [props.lastTrade.tradePrice]);

    useEffect(() => {
        const targetPrice = (tickTarget * ticks[symbolData?.baseSymbol]).toFixed(2);
        const lossPrice = (tickLoss * ticks[symbolData?.baseSymbol] * -1).toFixed(2);

        setTargetPrice(targetPrice);
        setLossPrice(lossPrice);
    }, [isBracket]);

    useEffect(() => {
        if (isOco) {
            if (priceType === 2) {
                setPriceType(1);
            }
        }
    }, [isOco]);

    const sendOrder = async ({ transactionType }) => {
        const datetime = new Date().getTime();
        // alert(`${priceType} Sell ${limitPrice}`);
        let resp = await API.rapi_submitOrder({
            datetime,
            symbol: symbolData.fullSymbol,
            exchange: symbolData.exchange,
            priceType,
            limitPrice,
            transactionType,
            ...(isBracket && { bracketType: 6 }),
            ...(tickTarget && { targetTicks: tickTarget }),
            ...(tickLoss && { stopTicks: tickLoss }),
            ...(isTrailingStop && { trailingStopTicks: tickLoss }),
            ...(isOco && {
                ocoData: {
                    priceType: oco2PriceType,
                    limitPrice: oco2LimitPrice,
                    transactionType: isOcoBuy ? 1 : 2,
                },
            }),
        });

        console.log(resp);
    };

    const orderTypes = [
        { value: 2, name: "Market" },
        { value: 1, name: "Limit" },
        { value: 3, name: "Stop Limit" },
        { value: 4, name: "Stop Market" },
    ];

    const ocoBuyColor = "#1e4620";
    const ocoSellColor = "#961e1e";
    const ocoLessThan = oco2LimitPrice < props.lastTrade.tradePrice;
    const ocoGreaterThan = oco2LimitPrice > props.lastTrade.tradePrice;
    const ocoTypeLimit = oco2PriceType == 1;
    const ocoTypeIsStopLimit = oco2PriceType == 4;
    const isOcoBuy = (ocoLessThan && ocoTypeLimit) || (ocoGreaterThan && !ocoTypeLimit);

    const ocoBackgroundColor = isOcoBuy ? ocoBuyColor : ocoSellColor;

    return (
        <div className="row g-0   border">
            <div className={`${isOco ? "col-6" : "col-7"} border`}>
                <div className="row g-0 justify-content-center border-green py-2 ">
                    {orderTypes.map((type) => {
                        if (isOco) {
                            if (type.name === "Market") {
                                return <></>;
                            }
                        }
                        return (
                            <div key={type.value} className="col-auto">
                                <OrderTypeButton key={type.value} selected={priceType === type.value} onClick={() => setPriceType(type.value)} variant={priceType === type.value ? "default" : "outline"}>
                                    {type.name}
                                </OrderTypeButton>
                            </div>
                        );
                    })}
                </div>
                {/* value Input and increment/decrement  */}
                <div className="row g-0 justify-content-center align-items-center border py-2">
                    {/* Value input */}
                    <div className="col-5">
                        <h4>{symbolData?.fullSymbol}</h4>

                        <Input step={ticks[symbolData?.baseSymbol]} type="number" setValue={setLimitPrice} value={limitPrice} />
                        <div className="col-12 justify-content-center text-center">
                            <ColorVal color={parseFloat((limitPrice - props.lastTrade.tradePrice).toFixed(2))}>{(limitPrice - props.lastTrade.tradePrice).toFixed(2)}</ColorVal> {" | "}
                            <span onClick={() => setLimitPrice(props.lastTrade.tradePrice)}>{props.lastTrade.tradePrice}</span>
                        </div>
                    </div>
                    {/* Increment and decrement buttons */}
                    <div className="col-3">
                        <div className="row">
                            <ButtonWithLongPress
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
                            <ButtonWithLongPress
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
                </div>

                {/* Buy Sell buttons */}
                <div className="row g-0 justify-content-around align-items-center">
                    <div className="col-12 d-flex justify-content-center ">
                        {(props.lastTrade.tradePrice >= limitPrice && priceType == 1) || (props.lastTrade.tradePrice <= limitPrice && (priceType == 3 || priceType == 4)) || priceType == 2 ? (
                            <BuySellButton color="green" onClick={() => sendOrder({ transactionType: 1 })}>
                                Buy - type:{priceType}
                            </BuySellButton>
                        ) : (
                            <></>
                        )}

                        {(props.lastTrade.tradePrice <= limitPrice && priceType == 1) || (props.lastTrade.tradePrice >= limitPrice && (priceType == 3 || priceType == 4)) || priceType == 2 ? (
                            <BuySellButton color="red" onClick={() => sendOrder({ transactionType: 2 })}>
                                Sell - type:{priceType}
                            </BuySellButton>
                        ) : (
                            <></>
                        )}
                    </div>
                </div>
            </div>
            <div className={`${isOco ? "col-6" : "col-5"} border-blue`}>
                <OrderTypeButton
                    selected={isBracket}
                    onClick={() => {
                        setIsBracket(!isBracket);
                        setIsOco(false);
                    }}
                >
                    BRACKET
                </OrderTypeButton>
                <OrderTypeButton
                    selected={isOco}
                    onClick={() => {
                        setIsOco(!isOco);
                        setIsBracket(false);
                    }}
                >
                    OCO
                </OrderTypeButton>
                {isOco && (
                    <Oco2Container color={ocoBackgroundColor}>
                        <div className={`oco2Background row g-0  w-100`}>
                            {orderTypes.map((type) => {
                                if (isOco) {
                                    if (type.name === "Market") {
                                        return <></>;
                                    }
                                }
                                return (
                                    <div key={type.value} className="col">
                                        <OrderTypeButton key={type.value} selected={oco2PriceType === type.value} onClick={() => setOco2PriceType(type.value)} variant={priceType === type.value ? "default" : "outline"}>
                                            {type.name}
                                        </OrderTypeButton>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="row g-0 justify-content-center align-items-center ">
                            {/* Value input */}
                            <div className="col-auto ">
                                {/* <h4>{symbolData?.fullSymbol}</h4> */}

                                <Input step={ticks[symbolData?.baseSymbol]} type="number" setValue={setOco2LimitPrice} value={oco2LimitPrice} />
                                <div className="col-12 justify-content-center text-center">
                                    <ColorVal color={parseFloat((oco2LimitPrice - props.lastTrade.tradePrice).toFixed(2))}>{(oco2LimitPrice - props.lastTrade.tradePrice).toFixed(2)}</ColorVal> {" | "}
                                    <span onClick={() => setOco2LimitPrice(props.lastTrade.tradePrice)}>{props.lastTrade.tradePrice}</span>
                                </div>
                            </div>
                            {/* Increment and decrement buttons */}
                            <div className="col-auto">
                                <div className="row">
                                    <ButtonWithLongPress
                                        borderColor={"green"}
                                        title="up"
                                        onClick={() =>
                                            setOco2LimitPrice((limit) => {
                                                const newPrice = (parseFloat(limit) + ticks[symbolData?.baseSymbol]).toFixed(2);
                                                return newPrice;
                                            })
                                        }
                                        rIcon={<AiOutlinePlus />}
                                    />
                                    <ButtonWithLongPress
                                        borderColor={"red"}
                                        title="down"
                                        onClick={() => {
                                            setOco2LimitPrice((limit) => {
                                                const newPrice = (parseFloat(limit) - ticks[symbolData?.baseSymbol]).toFixed(2);
                                                return newPrice;
                                            });
                                        }}
                                        rIcon={<AiOutlineMinus />}
                                    />
                                </div>
                            </div>
                        </div>
                        <div> {isOcoBuy ? "TO BUY" : "TO SELL"}</div>
                    </Oco2Container>
                )}
                {isBracket && (
                    <>
                        <div className="row justify-content-center align-items-center  py-2">
                            <div className="row g-0">
                                <div className="col-6 d-flex justify-content-center">
                                    <p>Tick Target</p>
                                </div>
                                <div className="col-6 d-flex justify-content-center">
                                    <ColorVal color={1}>{targetPrice}</ColorVal>
                                </div>
                            </div>
                            {/* Increment and decrement TICK TARGET buttons */}
                            <div className="col-auto ">
                                <ButtonWithLongPress
                                    borderColor={"green"}
                                    title="up"
                                    onClick={() =>
                                        setTickTarget((tickCount) => {
                                            tickCount = tickCount + 1;
                                            const targetPrice = (tickCount * ticks[symbolData?.baseSymbol]).toFixed(2);
                                            setTargetPrice(targetPrice);

                                            return tickCount;
                                        })
                                    }
                                    rIcon={<AiOutlinePlus />}
                                />
                            </div>
                            {/* Value input TICK TARGET*/}
                            <div className="col-5 ">
                                <Input step={1} type="number" min={1} max={10} setValue={setTickTarget} value={tickTarget} />
                            </div>
                            <div className="col-auto">
                                <ButtonWithLongPress
                                    borderColor={"red"}
                                    title="down"
                                    onClick={() => {
                                        setTickTarget((tickCount) => {
                                            tickCount = tickCount - 1;
                                            if (tickCount <= 0) tickCount = 1;
                                            const newPrice = (tickCount * ticks[symbolData?.baseSymbol]).toFixed(2);
                                            setTargetPrice(newPrice);
                                            return tickCount;
                                        });
                                    }}
                                    rIcon={<AiOutlineMinus />}
                                />
                            </div>
                        </div>
                        <hr />
                        <div className="row justify-content-center align-items-center  py-2">
                            <div className="row g-">
                                <div className="col-6 d-fle justify-content-center align-items-center">
                                    <div className="col ">
                                        <p className="mb-0">Tick Loss</p>
                                    </div>
                                    <div className="col-12 border">
                                        <input className="d-inline-flex me-1" type="checkbox" onChange={() => setIsTrailingStop(!isTrailingStop)} checked={isTrailingStop} name="isTrailingStop" id="" />
                                        <label htmlFor="isTrailingStop">
                                            <small className={` ${!isTrailingStop && "text-muted"} d-inline-flex`}>isTrailingStop</small>
                                        </label>
                                    </div>
                                </div>
                                <div className="col-6 d-flex justify-content-center">
                                    <ColorVal color={-1}>{lossPrice}</ColorVal>
                                </div>
                            </div>
                            {/* Increment and decrement TICK LOSS buttons */}
                            <div className="col-auto ">
                                <ButtonWithLongPress
                                    borderColor={"green"}
                                    title="up"
                                    onClick={() =>
                                        setTickLoss((tickCount) => {
                                            tickCount = tickCount + 1;
                                            if (tickCount <= 0) tickCount = 1;
                                            const lossPrice = (tickCount * ticks[symbolData?.baseSymbol] * -1).toFixed(2);
                                            setLossPrice(lossPrice);

                                            return tickCount;
                                        })
                                    }
                                    rIcon={<AiOutlinePlus />}
                                />
                            </div>
                            {/* Value input TICK LOSS */}
                            <div className="col-5 ">
                                <Input step={1} type="number" min={0} setValue={setTickLoss} value={tickLoss} />
                            </div>
                            <div className="col-auto">
                                <ButtonWithLongPress
                                    borderColor={"red"}
                                    title="down"
                                    onClick={() => {
                                        setTickLoss((tickCount) => {
                                            tickCount = tickCount - 1;
                                            if (tickCount <= 0) tickCount = 1;

                                            const newPrice = (tickCount * ticks[symbolData?.baseSymbol] * -1).toFixed(2);
                                            setLossPrice(newPrice);
                                            return tickCount;
                                        });
                                    }}
                                    rIcon={<AiOutlineMinus />}
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

const ColorVal = styled.span`
    color: ${({ color }) => (color > 0 ? "green" : "tomato")};
`;

const Oco2Container = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background: ${({ color }) => color};
`;

const BuySellButton = styled.div`
    border-radius: 5px;
    margin: 0px 2px;
    padding: 2px 15px;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    background: ${({ color }) => color};
    user-select: none;
    height: 4em;
    display: flex;
    align-items: center;
    justify-content: center;
`;

const OrderTypeButton = styled.div`
    border-radius: 5px;
    margin: 2px 2px;
    padding: 2px 5px;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    background: ${({ selected }) => (selected ? "steelblue" : "grey")};
    user-select: none;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 2em;
`;
