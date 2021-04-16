import React, { useState } from "react";
import styled from "styled-components";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
	faChartLine,
	faSquareRootAlt,
	faPlusSquare,
} from "@fortawesome/free-solid-svg-icons";
import StratContext from "../StratContext";
import API from "../../API";
import { AddThingBtn, IconButton } from "./components";
import PriceDatasList from "./PriceDatasList";
import AddPriceDataModal from "./AddPriceDataModal";

export default function StrategyWindow() {
	const [showPriceDataModal, setShowPriceDataModal] = useState(false);
	const [addingPriceData, setAddingPriceData] = useState(false);
	const {
		selectedStrat,
		setSelectedStrat,
		updateStrat,
		setPriceDatas,
		priceDatas,
	} = React.useContext(StratContext);

	const submitAddPriceData = async ({ timeframe, symbol }) => {
		try {
			//set is loading
			setAddingPriceData(true);
			//API call
			let newPriceData = await API.addPriceData(symbol, timeframe);
			setAddingPriceData(false);

			console.log(newPriceData);
			if (!newPriceData) return;
			setPriceDatas([...priceDatas, newPriceData]);
			//return reult or error
		} catch (err) {
			setAddingPriceData(false);

			console.log(err);
		}
	};

	const addLinkPriceData = async (priceData) => {
		let updatedStrat = await API.linkPriceData(
			selectedStrat._id,
			priceData._id
		);
		updateStrat(updatedStrat);
	};

	return (
		<StrategyWindowContainer>
			<h2>{selectedStrat.name}</h2>
			<AddThingBtn
				name={showPriceDataModal ? "Cancel" : "Create New Price Data"}
				onClick={() => {
					setShowPriceDataModal(!showPriceDataModal);
				}}
			/>
			<h2>Price Feeds</h2>
			<PriceDatasList priceDatas={priceDatas} link={addLinkPriceData} />

			{showPriceDataModal && (
				<AddPriceDataModal
					submit={submitAddPriceData}
					loading={addingPriceData}
				/>
			)}

			{!selectedStrat.priceData.length && (
				<div>
					No Linked Price Data Feeds, Please Select Price Data to Link
				</div>
			)}
			{!!selectedStrat.priceData.length && (
				<>
					<h2>{`You have ${selectedStrat.priceData.length} Data Feed${
						selectedStrat.priceData.length > 1 ? "s" : ""
					}`}</h2>
					{selectedStrat.priceData.map((data, i) => (
						<DataFeedItem key={i} index={i} data={data} />
					))}
				</>
			)}
		</StrategyWindowContainer>
	);
}

const DataFeedItem = ({ data, index }) => {
	let { addChart } = React.useContext(StratContext);
	console.log(data);
	let { symbol, timeframe, _id } = data;
	return (
		<LinkedDataFeed index={index}>
			<span>{`${symbol} ${timeframe}`}</span>
			<IconButton
				title="Show Chart"
				index={index}
				onClick={() => addChart({ symbol, timeframe, _id })}
				icon={faChartLine}
			/>
			<IconButton
				title="Add Condition"
				index={index}
				onClick={() => console.log("click")}
				icon={faSquareRootAlt}
			/>
		</LinkedDataFeed>
	);
};

const StrategyWindowContainer = styled.div`
	border: 1px solid green;
	display: inline-block;
`;

const LinkedDataFeed = styled.div`
	display: flex;
	justify-content: space-around;
	align-items: baseline;
	background-color: ${({ index }) => (index % 2 ? "#333" : "#444")};
`;
