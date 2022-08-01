import React, { useState } from "react";
import { LoadingButton } from "./components";
export default function AddPriceDataModal({ submit, loading }) {
    const [priceDataSymbol, setPriceDataSymbol] = useState("/ES");
    const [priceDataTimeFame, setPriceDataTimeFame] = useState("1Min");

    const commodityTimeFrames = (
        <>
            <option value="1Min">1 Min</option>
            <option value="5Min">5 Min</option>
            <option value="15Min">15 Min</option>
            <option value="30Min">30 Min</option>
            <option value="60Min">60 Min</option>
        </>
    );
    const stockTimeFrames = (
        <>
            <option value="1Min">1 Min</option>
            <option value="5Min">5 Min</option>
            <option value="10Min">10 Min</option>
            <option value="30Min">30 Min</option>
            <option value="60Min">60 Min</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
        </>
    );
    return (
        <div>
            <input
                onChange={(e) =>
                    setPriceDataSymbol(e.target.value.toLocaleUpperCase())
                }
                value={priceDataSymbol}
                type="text"
            />
            <select
                onChange={(e) => setPriceDataTimeFame(e.target.value)}
                value={priceDataTimeFame}
                type="text"
            >
                {priceDataSymbol.startsWith("/") && commodityTimeFrames}
                {!priceDataSymbol.startsWith("/") && stockTimeFrames}
            </select>
            <LoadingButton
                loading={loading}
                name="Create"
                submit={() =>
                    submit({
                        timeframe: priceDataTimeFame,
                        symbol: priceDataSymbol,
                    })
                }
            />
        </div>
    );
}
