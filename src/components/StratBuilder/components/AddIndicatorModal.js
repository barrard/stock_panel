import React, { useState, useEffect } from "react";
import { LoadingButton } from "./components";
import API from "../../API";
import StratContext from "../StratContext";
import { getGroups } from "./utilFuncs";

import {
	SelectIndicatorGroup,
	SelectIndicatorName,
	InputTypes,
	IndicatorInputs,
	InputDataPreset,
	InputDataType,
	MA_Options,
	Ind_Input,
	MA_SELECT,
} from "./IndicatorComponents";

export default function AddIndicatorModal({
	symbol,
	timeframe,
	setAddIndicators,
}) {
	const [indicatorName, setIndicatorName] = useState({
		name: "",
		fullName: "",
	});
	const [selectedGroup, setSelectedGroup] = useState("");
	const [groupLIst, setGroupLIst] = useState([]);
	const [indicatorOpts, setIndicatorOpts] = useState({});
	const [indicator, setIndicator] = useState(false);
	const [selectedInput, setSelectedInput] = useState(["close"]);
	const [loadingIndicator, setLoadingIndicator] = useState(false);
	const [variablePeriods, setVariablePeriods] = useState([]);
	const {
		indicatorList,
		setSelectedStrat,
		selectedStrat,
		charts,
		strategies,
		setStrategies,
		updateIndicatorResults,
	} = React.useContext(StratContext);

	useEffect(() => {
		console.log("IndicatorModal OPEN");
		// console.log(talib)
		setGroupLIst(getGroups(indicatorList));

		return () => {
			console.log("IndicatorModal close bye");
		};
	}, []);

	const addIndicator = async () => {
		try {
			let { data, id } = charts[symbol][timeframe];
			setLoadingIndicator(true);
			console.log({
				selectedInput,
				indicator,
				indicatorOpts,
				indicatorName,
			});
			let options = {};
			for (let name in indicatorOpts) {
				options[name] = indicatorOpts[name].defaultValue;
			}
			//is this "inReal"?
			let isInReal;
			if (indicator.inputs[0].name === "inReal") isInReal = true;
			let dataInputs = {};
			let selectedInputs = [];
			selectedInput.forEach((input) => {
				selectedInputs.push(input);
				dataInputs[isInReal ? "inReal" : input] = data.map(
					(d) => d[input]
				);
			});

			let resp = await API.submitIndicator({
				selectedStrat: selectedStrat._id,
				indicatorOpts,
				indicatorName,
				options,
				inputs: indicator.inputs,
				dataInputs,
				selectedInputs,
				priceDataId: id,
				variablePeriods,
			});
			setLoadingIndicator(false);

			if (resp) {
				//lets assume this all worked, so we can close the indicator model
				setAddIndicators(false);
				let { newIndicator, result } = resp;
				// selectedStrat.indicators.push(newIndicator);
				//update selected strategy
				// setSelectedStrat(selectedStrat);
				//update strategy list
				let stratIndex = strategies.findIndex(
					(strat) => strat._id === selectedStrat._id
				);
				strategies[stratIndex].indicators.push(newIndicator);
				setStrategies([...strategies]);

				//ADD indicator data
				updateIndicatorResults({
					symbol,
					timeframe,
					indicator: newIndicator,
					result,
				});
			}
		} catch (err) {
			setLoadingIndicator(false);
			console.log(err);
		}
	};
	return (
		<div>
			<SelectIndicatorGroup
				setSelectedGroup={setSelectedGroup}
				groupLIst={groupLIst}
				setIndicatorName={setIndicatorName}
				selectedGroup={selectedGroup}
			/>
			{selectedGroup && (
				<SelectIndicatorName
					setIndicatorName={setIndicatorName}
					indicatorList={indicatorList}
					setIndicator={setIndicator}
					indicatorName={indicatorName}
					setIndicatorOpts={setIndicatorOpts}
					setSelectedInput={setSelectedInput}
					selectedGroup={selectedGroup}
				/>
			)}
			{indicatorName.name && (
				<>
					<IndicatorInputs
						indicatorOpts={indicatorOpts}
						setIndicatorOpts={setIndicatorOpts}
					/>
					<InputTypes
						indicator={indicator}
						setSelectedInput={setSelectedInput}
						selectedInput={selectedInput}
						setVariablePeriods={setVariablePeriods}
						variablePeriods={variablePeriods}
					/>
				</>
			)}
			<LoadingButton
				disabled={!indicatorName.name}
				loading={loadingIndicator}
				name="Add Indicator"
				submit={() => addIndicator()}
			/>
		</div>
	);
}
