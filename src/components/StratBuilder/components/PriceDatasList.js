import React, { useState } from "react";
import styled from "styled-components";
import StratContext from "../StratContext";

export default function PriceDatasList({ link }) {
	const { selectedStrat, priceDatas } = React.useContext(StratContext);

	return (
		<>
			<p>Price Data Available</p>
			{priceDatas.length === 0 && <span>No priceDatas found... </span>}
			{priceDatas.length > 0 &&
				priceDatas
					.filter(
						(pds) =>
							selectedStrat.priceData.findIndex(
								(_pd) => pds._id == _pd._id
							) < 0
					)
					.map((priceData, index) => {
						return (
							<ListItem
								key={priceData._id}
								link={link}
								index={index}
								item={priceData}
							/>
						);
					})}
		</>
	);
}

const ListItem = ({ item, link, index }) => (
	<Item index={index} onClick={() => link(item)} key={item._id}>
		{`${index + 1}: ${item.symbol} ${item.timeframe}`}
	</Item>
);

const Item = styled.div`
	background-color: ${({ index }) => (index % 2 ? "#444" : "#555")};

	cursor: pointer;
	transition: all 0.3s;
	&&:hover {
		background-color: red;
	}
`;
