import React, { useState, useEffect } from "react";
import { IconButton } from "../../../StratBuilder/components";

import { AiOutlinePlus, AiOutlineMinus } from "react-icons/ai";

import API from "../../../API";
import Select from "./Select";
import Input from "./Input";
export default function TradeControls(props) {
    const [priceType, setPriceType] = useState({ value: 2 });
    const [limitPrice, setLimitPrice] = useState(props.lastTrade.tradePrice);

    useEffect(() => {
        if (!limitPrice) {
            setLimitPrice(props.lastTrade.tradePrice);
            // console.log(props);
        }
    }, [props.lastTrade.tradePrice]);

    const sendOrder = async (transactionType) => {
        debugger;
        // alert(`${priceType} Sell ${limitPrice}`);
        let resp = await API.rapi_submitOrder({
            priceType: priceType.value,
            limitPrice,
            ...transactionType,
        });

        console.log(resp);
    };

    return (
        <div className="row g-0">
            <div className="col-2 d-flex align-items-center">
                <button onClick={() => sendOrder({ transactionType: 1 })} className="btn btn-success w-100">
                    Buy
                </button>
            </div>
            <div className="col-2 d-flex align-items-center">
                <button onClick={() => sendOrder({ transactionType: 2 })} className="btn btn-danger w-100">
                    Sell
                </button>
            </div>

            <div className="col-auto">
                <Select
                    label="Order Type"
                    value={priceType}
                    setValue={setPriceType}
                    options={[
                        { value: 1, name: "Limit" },
                        { value: 2, name: "Market" },
                        { value: 3, name: "Stop Limit" },
                        { value: 4, name: "Stop Market" },
                    ]}
                />
            </div>
            <div className="col-4">
                <div className="row g-0">
                    <div className="col-10">
                        <Input step={0.25} type="number" setValue={setLimitPrice} value={limitPrice} label="Limit Price" />
                    </div>
                    <div className="col-2 d-flex flex-column justify-content-end">
                        <div className="col-12 d-flex">
                            <IconButton
                                borderColor={"green"}
                                title="up"
                                onClick={() =>
                                    setLimitPrice((limit) => {
                                        const newPrice = parseFloat(limit) + 0.25;
                                        console.log({ newPrice });
                                        return newPrice;
                                    })
                                }
                                rIcon={<AiOutlinePlus />}
                            />
                        </div>

                        <div className="col-12 d-flex">
                            <IconButton
                                borderColor={"red"}
                                title="down"
                                onClick={() => {
                                    setLimitPrice((limit) => {
                                        const newPrice = parseFloat(limit) - 0.25;
                                        console.log({ newPrice });
                                        return newPrice;
                                    });
                                }}
                                rIcon={<AiOutlineMinus />}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
