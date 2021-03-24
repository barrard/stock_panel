import React, { useState, useRef, useEffect } from "react";
import styled from "styled-components";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartLine, faSquareRootAlt, faPlusSquare } from "@fortawesome/free-solid-svg-icons";
import StratContext from "./StratContext";
import API from "../API";

import {
	StrategiesList,
	PriceDatasList,
	AddThingBtn,
	StratListContainer,
	Title,
	Container,
	LoadingButton,
} from "./components";

export default function StratBuilder() {
	const [newStrategyName, setNewStrategyName] = useState("");
	const [strategies, setStrategies] = useState([]);
	const [priceDatas, setPriceDatas] = useState([]);
	const [showModal, setShowModal] = useState(false);
	const [creatingStrat, setCreatingStrat] = useState(false);
	const [selectedStrat, setSelectedStrat] = useState(false);
	const [charts, setCharts] = useState({});

	useEffect(() => {
		//fetch strats
		API.getStrategies()
			.then((strats) => setStrategies([...strats]))
			.catch((e) => console.log(e));

		//fetch price datas
		API.getPriceDatas()
			.then((priceDatas) => setPriceDatas([...priceDatas]))
			.catch((e) => console.log(e));
	}, []);

	const submitNewStrat = async () => {
		try {
			//hit API and set loading
			setCreatingStrat(true);
			let newStrat = await API.addStrategy({ name: newStrategyName });
			if (newStrat) {
				setNewStrategyName("");
				setStrategies([...strategies, newStrat]);
			}

			setCreatingStrat(false);
			setShowModal(false);
		} catch (err) {
			setCreatingStrat(false);
			setShowModal(false);

			console.log(err);
		}
	};

	const onSelectStrat = (strat) => {
		console.log(strat);
		setSelectedStrat(strat);
	};
	const updateStrat = (strat) => {
		let _id = strat._id;
		//find by id
		let index = strategies.indexOf((strat) => _id == strat._id);
		strategies[index] = strat;
		setStrategies([...strategies]);
	};
	const addChart = async ({ symbol, timeframe }) => {
		debugger;
		if (!charts[symbol]) {
			charts[symbol] = {};
		}
		if (!charts[symbol][timeframe]) {
			//load data
			let data = await API.getBackTestData({ symbol, timeframe });
			console.log(data);
			charts[symbol][timeframe] = data;
		}
		setCharts({ ...charts });
	};
	return (
		<StratContext.Provider value={charts}>
			<Container>
				{/* Title */}
				<Title title="Strategy Builder" />
				{/* List of Strategies on the side */}
				<StratListContainer>
					{/* Button to add Strategy */}
					<AddThingBtn
						name={showModal ? "Cancel" : "Create New Strategy"}
						onClick={() => setShowModal(!showModal)}
					/>
					{showModal && (
						<AddStratModal
							submit={submitNewStrat}
							value={newStrategyName}
							onChange={setNewStrategyName}
							isSending={creatingStrat}
						/>
					)}
					<StrategiesList strategies={strategies} selectStrat={onSelectStrat} />
				</StratListContainer>
				{selectedStrat && (
					<StrategyWindow
						addChart={addChart}
						updateStrat={updateStrat}
						setPriceDatas={setPriceDatas}
						priceDatas={priceDatas}
						strat={selectedStrat}
					/>
				)}
				{!!Object.keys(charts).length && <ChartsContainer>somewhat</ChartsContainer>}
			</Container>
		</StratContext.Provider>
	);
}

const StrategyWindow = ({ strat, setPriceDatas, priceDatas, updateStrat, addChart }) => {
	const [showPriceDataModal, setShowPriceDataModal] = useState(false);
	const [addingPriceData, setAddingPriceData] = useState(false);

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
		let updatedStrat = await API.linkPriceData(strat._id, priceData._id);
		updateStrat(updatedStrat);
	};

	return (
		<StrategyWindowContainer>
			<h2>{strat.name}</h2>
			<AddThingBtn
				name={showPriceDataModal ? "Cancel" : "Create New Price Data"}
				onClick={() => {
					setShowPriceDataModal(!showPriceDataModal);
				}}
			/>
			<h2>Price Feeds</h2>
			<PriceDatasList priceDatas={priceDatas} link={addLinkPriceData} />

			{showPriceDataModal && <AddPriceDataModal submit={submitAddPriceData} loading={addingPriceData} />}

			{!strat.priceData.length && <div>No Linked Price Data Feeds, Please Select Price Data to Link</div>}
			{!!strat.priceData.length && (
				<>
					<h2>{`You have ${strat.priceData.length} Data Feed${strat.priceData.length > 1 ? "s" : ""}`}</h2>
					{strat.priceData.map((data, i) => (
						<>
							<DataFeedItem addChart={addChart} key={i} index={i} data={data} />
						</>
					))}
				</>
			)}
		</StrategyWindowContainer>
	);
};

const DataFeedItem = ({ data, index, addChart }) => {
	let { symbol, timeframe } = data;
	return (
		<LinkedDataFeed index={index}>
			<span>{`${symbol} ${timeframe}`}</span>
			<IconButton
				title="Show Chart"
				index={index}
				onClick={() => addChart({ symbol, timeframe })}
				icon={faChartLine}
			/>
			<IconButton
				title="Add Condition"
				index={index}
				onClick={() => console.log("click")}
				icon={faSquareRootAlt}
			/>
			<IconButton title="Add Indicator" index={index} onClick={() => console.log("click")} icon={faPlusSquare} />
		</LinkedDataFeed>
	);
};

const LinkedDataFeed = styled.div`
	display: flex;
	justify-content: space-around;
	align-items: baseline;
	background-color: ${({ index }) => (index % 2 ? "#333" : "#444")};
`;

const StrategyWindowContainer = styled.div`
	border: 1px solid green;
	display: inline-block;
`;

const AddStratModal = ({ onChange, value, submit, isSending }) => {
	return (
		<>
			{/* {show && ( */}
			<div>
				<label htmlFor="New Strategy Name">New Strategy Name</label>
				<input onChange={(e) => onChange(e.target.value)} value={value} type="text" />
				<LoadingButton isAddingStrat={isSending} name="Create" submit={submit} />
			</div>
			{/* )} */}
		</>
	);
};

const AddPriceDataModal = ({ submit, loading }) => {
	const [priceDataSymbol, setPriceDataSymbol] = useState("/ES");
	const [priceDataTimeFame, setPriceDataTimeFame] = useState("1Min");
	return (
		<div>
			<input onChange={(e) => setPriceDataSymbol(e.target.value)} value={priceDataSymbol} type="text" />
			<select onChange={(e) => setPriceDataTimeFame(e.target.value)} value={priceDataTimeFame} type="text">
				<option value="1Min">1 Min</option>
				<option value="5Min">5 Min</option>
				<option value="15Min">15 Min</option>
				<option value="30Min">30 Min</option>
				<option value="60Min">60 Min</option>
			</select>
			<LoadingButton
				loading={loading}
				name="Create"
				submit={() => submit({ timeframe: priceDataTimeFame, symbol: priceDataSymbol })}
			/>
		</div>
	);
};

const IconButton = ({ onClick, icon, index, title }) => {
	const [isHovered, setIsHovered] = useState(false);

	return (
		<HoverIcon
			title={title}
			onClick={onClick}
			index={index}
			onMouseOver={() => setIsHovered(true)}
			onMouseOut={() => setIsHovered(false)}
			isHovered={isHovered}
		>
			<FontAwesomeIcon icon={icon} />
		</HoverIcon>
	);
};

const HoverIcon = styled.div`
	padding: 0.5em;
	background-color: ${({ isHovered, index }) => {
		if (index % 2) {
			if (isHovered) return "#333";
			else return "#444";
		} else {
			if (isHovered) return "#444";
			else return "#333";
		}
	}};
	transition: all 0.3s;
	border-radius: 10px;
	cursor: pointer;
`;

const ChartsContainer = styled.div`
	border: 1px solid green;
	width: 100%;
	min-height: 500px;
`;
