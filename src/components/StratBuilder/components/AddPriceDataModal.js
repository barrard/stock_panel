import React, { useState } from "react";
import { LoadingButton } from "./components";
export default function AddPriceDataModal({ submit, loading }) {
	const [priceDataSymbol, setPriceDataSymbol] = useState("/ES");
	const [priceDataTimeFame, setPriceDataTimeFame] = useState("1Min");
	return (
		<div>
			<input
				onChange={(e) => setPriceDataSymbol(e.target.value)}
				value={priceDataSymbol}
				type="text"
			/>
			<select
				onChange={(e) => setPriceDataTimeFame(e.target.value)}
				value={priceDataTimeFame}
				type="text"
			>
				<option value="1Min">1 Min</option>
				<option value="5Min">5 Min</option>
				<option value="15Min">15 Min</option>
				<option value="30Min">30 Min</option>
				<option value="60Min">60 Min</option>
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
