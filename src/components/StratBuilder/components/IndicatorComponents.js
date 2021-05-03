import React, { useEffect, useState } from "react";
import {
	SketchPicker,
	SwatchesPicker,
	TwitterPicker,
	CirclePicker,
	CompactPicker,
} from "react-color";
import API from "../../API";

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

					indicator.inputs.forEach((input) => {
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

export function VariablePeriodsInput({
	name,
	setSelectedInput,
	variablePeriods,
}) {
	useEffect(() => {
		setSelectedInput(["5", "10", "15"]);
	}, []);
	return (
		<div style={{ border: "1px solid yellow" }}>
			<p>{name}</p>
			<input
				value={variablePeriods.join(",")}
				onChange={(e) =>
					setSelectedInput([
						...e.target.value.split(",").map((v) => v.trim()),
					])
				}
			/>
		</div>
	);
}

export function InputTypes({
	indicator,
	setSelectedInput,
	selectedInput,
	setVariablePeriods,
	variablePeriods,
}) {
	return (
		<>
			<div style={{ display: "flex" }}>
				{indicator.inputs.map((input, i) => {
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
								name={input.name}
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
								setSelectedInput({ ...selectedInput, [v]: v });
							}
						});

						return <InputDataPreset key={i} input={input} />;
					}
				})}
			</div>
		</>
	);
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
	return (
		<div
			style={{
				border: "1px solid white",
				padding: "1em",
				margin: "0.5em",
				display: "flex",
				flexDirection: "column",
				alignContent: "center",
				justifyContent: "center",
			}}
		>
			<h6 style={{ textDecoration: "underline" }}>{name}</h6>
			{["open", "high", "low", "close", "volume"].map((val) => (
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
			))}
		</div>
	);
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
				indicatorOpts[name].defaultValue = e.target.value;
				setIndicatorOpts({
					...indicatorOpts,
				});
			}}
			name="MA_Type"
		>
			{MA_TYPE_OPTS.map((opt, i) => (
				<option
					selected={indicatorOpts[name].defaultValue === i}
					value={i}
				>
					{MA_TYPE_OPTS[i]}
				</option>
			))}
		</select>
	);
}

export function LineColors({ indicator, color, setColor }) {
	return (
		<div style={{ display: "flex" }}>
			{indicator.outputs.map((line) => {
				return (
					<div style={{ margin: "1.5em" }}>
						<p>{line.name}</p>

						<Swatch
							setColor={(newColor) =>
								setColor({ ...color, ...newColor })
							}
							line={line}
							color={color[line.name]}
						/>
					</div>
				);
			})}
		</div>
	);
}

const Swatch = ({ setColor, color, line }) => {
	const [show, setShow] = useState(false);

	const styles = {
		color: {
			width: "36px",
			height: "14px",
			borderRadius: "2px",
			background: `${color}`,
		},
		swatch: {
			padding: "5px",
			background: "#fff",
			borderRadius: "1px",
			boxShadow: "0 0 0 1px rgba(0,0,0,.1)",
			display: "inline-block",
			cursor: "pointer",
		},
		popover: {
			position: "absolute",
			zIndex: "2",
		},
		cover: {
			position: "fixed",
			top: "0px",
			right: "0px",
			bottom: "0px",
			left: "0px",
		},
	};

	return (
		<div>
			<div style={styles.swatch} onClick={() => setShow(!show)}>
				<div style={styles.color} />
			</div>
			{show ? (
				<div style={styles.popover}>
					<div style={styles.cover} onClick={() => setShow(false)} />
					{show && (
						<CompactPicker
							color={color[line.name]}
							onChangeComplete={({ hex }) => {
								let newColor = { [line.name]: hex };
								console.log(newColor);
								setColor(newColor);
							}}
						/>
					)}
				</div>
			) : null}
		</div>
	);
};
