import React, { useEffect } from "react";
import { capitalize } from "./utilFuncs";
export function SelectIndicatorGroup({
	setSelectedGroup,
	groupLIst,
	setIndicatorName,
	selectedGroup,
}) {
	return (
		<>
			<label htmlFor="selected indicator group">Indicator Groups</label>
			<select
				onChange={(e) => {
					setSelectedGroup(e.target.value);
					setIndicatorName({});
				}}
				value={selectedGroup}
			>
				{groupLIst.map((group) => (
					<option key={group} value={group}>
						{group}
					</option>
				))}
			</select>
		</>
	);
}

export function SelectIndicatorName({
	indicatorList,
	setIndicator,
	indicatorName,
	setIndicatorOpts,
	setSelectedInput,
	setIndicatorName,
	selectedGroup,
}) {
	return (
		<>
			<label htmlFor="selected indicator">Indicators</label>

			<select
				onChange={(e) => {
					const { name, fullName } = JSON.parse(e.target.value);
					setIndicatorName({ name, fullName });
					let indicator = indicatorList.filter(
						(indicator) => indicator.name === name
					)[0];
					setIndicator(indicator);
					console.log({ indicator });
					let selectedInputTypes = {};
					debugger;
					indicator.inputs.forEach((input) => {
						debugger;

						if (input.flags) {
							selectedInputTypes = {
								...selectedInputTypes,
								...Object.values(input.flags).reduce(
									(data, v) => ({
										...data,
										[v]: v,
									}),
									{}
								),
							};
						} else {
							selectedInputTypes = {
								...selectedInputTypes,
								[input.name]: "close",
							};
						}
					});
					debugger;
					setSelectedInput({ ...selectedInputTypes });
					//set default values
					let dValues = {};
					indicator.optInputs.forEach(
						({ name, defaultValue, displayName, hint }) => {
							dValues[name] = {
								defaultValue,
								displayName,
								hint,
							};
						}
					);
					console.log({ dValues });
					setIndicatorOpts(dValues);
				}}
				value={indicatorName.hint}
			>
				{indicatorList
					.filter((ind) => ind.group === selectedGroup)
					.map(MA_Options)}
			</select>
		</>
	);
}

export function VariablePeriodsInput({ setVariablePeriods, variablePeriods }) {
	useEffect(() => {
		setVariablePeriods(["5", "10", "15"]);
	}, []);
	return (
		<input
			value={variablePeriods.join(",")}
			onChange={(e) =>
				setVariablePeriods([
					...e.target.value.split(",").map((v) => v.trim()),
				])
			}
		/>
	);
}

export function InputTypes({
	indicator,
	setSelectedInput,
	selectedInput,
	setVariablePeriods,
	variablePeriods,
}) {
	return indicator.inputs.map((input, i) => {
		if (input.name.includes("inReal")) {
			return (
				<InputRealDataSource
					key={i}
					name={input.name}
					setSelectedInput={(value) =>
						setSelectedInput({
							...selectedInput,
							[input.name]: value,
						})
					}
					selectedInput={selectedInput}
				/>
			);
		} else if (input.name === "inPeriods") {
			return (
				<VariablePeriodsInput
					setSelectedInput={(value) =>
						setSelectedInput({
							...selectedInput,
							[input.name]: value,
						})
					}
					variablePeriods={variablePeriods}
				/>
			);
		}

		if (input.flags && Object.values(input.flags).length) {
			Object.values(input.flags).forEach((v) => {
				if (!selectedInput[v]) {
					debugger;
					setSelectedInput({ ...selectedInput, [v]: v });
				}
			});
			debugger;

			debugger;
			return <InputDataPreset key={i} input={input} />;
		}
	});
}

export function IndicatorInputs({ indicatorOpts, setIndicatorOpts }) {
	return Object.keys(indicatorOpts).map((name) => {
		let { displayName, defaultValue, hint } = indicatorOpts[name];

		return (
			<div
				style={{
					border: "1px solid yellow",
					padding: "1em",
				}}
				key={name}
			>
				<label title={hint} htmlFor={displayName}>
					{displayName}
				</label>
				{displayName === "MA Type" && (
					<MA_SELECT
						setIndicatorOpts={setIndicatorOpts}
						name={name}
						indicatorOpts={indicatorOpts}
					/>
				)}
				{displayName !== "MA Type" && (
					<Ind_Input
						setIndicatorOpts={setIndicatorOpts}
						defaultValue={defaultValue}
						name={name}
						indicatorOpts={indicatorOpts}
					/>
				)}
			</div>
		);
	});
}
export function InputDataPreset({ input }) {
	return Object.values(input.flags).map((val) => (
		<div style={{ paddingRight: "1em" }} key={val}>
			<label htmlFor="">{capitalize(val)}</label>
			<input checked disabled name="inReal" type="checkbox" value={val} />
		</div>
	));
}
export function InputRealDataSource({ name, setSelectedInput, selectedInput }) {
	return ["open", "high", "low", "close", "volume"].map((val) => (
		<div style={{ paddingRight: "1em" }} key={val}>
			<label htmlFor="">{capitalize(val)}</label>
			<input
				onChange={(e) => setSelectedInput(e.target.value)}
				checked={selectedInput[name] === val}
				name="inReal"
				type="checkbox"
				value={val}
			/>
		</div>
	));
}

export function MA_Options(func) {
	return (
		<option
			key={func.name}
			value={JSON.stringify({
				fullName: func.hint,
				name: func.name,
			})}
		>
			{func.hint}
		</option>
	);
}

export function Ind_Input({
	name,
	indicatorOpts,
	setIndicatorOpts,
	defaultValue,
}) {
	return (
		<input
			type="number"
			value={defaultValue}
			onChange={(e) => {
				indicatorOpts[name].defaultValue = e.target.value;
				setIndicatorOpts({
					...indicatorOpts,
				});
			}}
		/>
	);
}

export const MA_TYPE_OPTS = [
	"SMA",
	"EMA",
	"WMA",
	"DEMA",
	"TEMA",
	"TRIMA",
	"KAMA",
	"MAMA",
	"T3",
];

export function MA_SELECT({ name, indicatorOpts, setIndicatorOpts }) {
	return (
		<select
			value={indicatorOpts[name].defaultValue}
			onChange={(e) => {
				console.log(e.target.value);

				indicatorOpts[name].defaultValue = e.target.value;

				setIndicatorOpts({
					...indicatorOpts,
				});
			}}
			name="MA_Type"
			id=""
		>
			{MA_TYPE_OPTS.map((opt, i) => (
				<option
					selected={indicatorOpts[name].defaultValue === i}
					value={i}
				>
					{MA_TYPE_OPTS[i]}
				</option>
			))}
			{/* <option value="1"></option>
			<option value="2"></option>
			<option value="3"></option>
			<option value="4"></option>
			<option value="5"></option>
			<option value="6"></option>
			<option value="7"></option>
			<option value="8"></option> */}
		</select>
	);
}
