import React, { useState } from "react";
import styled from "styled-components";
export default function PriceDatasList({ priceDatas, link }) {
	const [selectedPriceData, setSelectedPriceData] = useState({});
	return (
		<>
			<p>Price Data Available</p>
			{priceDatas.length === 0 && <span>No priceDatas found... </span>}
			{priceDatas.length > 0 &&
				priceDatas.map((priceData, index) => {
					return <ListItem key={priceData._id} link={link} index={index} item={priceData} />;
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
