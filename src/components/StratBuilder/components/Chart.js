import React, { useState, useEffect, useRef, useContext } from "react";
import styled from "styled-components";
import {
	axisRight,
	axisBottom,
	curveCardinal,
	extent,
	line,
	scaleBand,
	scaleLinear,
	select,
	zoom,
	zoomTransform,
} from "d3";
import {
	faEye,
	faPlusSquare,
	faTrashAlt,
	faPencilAlt,
	faEyeSlash,
	faWindowClose,
	faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { MA_SELECT } from "./IndicatorComponents";
import AddIndicatorModal from "./AddIndicatorModal";
import { IconButton, LoadingButton } from "./components";
import StratContext from "../StratContext";
import API from "../../API";
import { MA_TYPE_OPTS } from "./IndicatorComponents";

let width = 1000;

export default function Chart({ symbol, timeframe }) {
	let margin = {
		left: 20,
		right: 40,
		bottom: 20,
		top: 20,
	};
	let indicatorHeight = 100;
	let mainChartHeight = 250;

	const {
		charts,
		setCharts,
		setSelectedStrat,
		selectedStrat,
		indicatorResults,
		updateIndicatorResults,
	} = useContext(StratContext);
	const { data, id: priceDataId } = charts[symbol][timeframe];
	const title = `${symbol} ${timeframe}`;
	const svgRef = useRef();
	const [height, setHeight] = useState(mainChartHeight);
	const [chartSvg, setChartSvg] = useState(undefined);
	const [currentZoom, setCurrentZoom] = useState();
	const [addIndicators, setAddIndicators] = useState(false);
	const [indicatorCount, setIndicatorCount] = useState(0);
	const [indicatorColors, setIndicatorColors] = useState({ close: "yellow" });
	const [yScales, setYScales] = useState({
		mainChart: {
			yScale: scaleLinear().range([mainChartHeight, 0]),
			data: data,
			height: mainChartHeight,
			name: "mainChart",
			fullName: `${symbol} OHLC ${timeframe}`,
			yOffset: 0,
			group: "Overlap Studies",
		},
	});

	let innerHeight = height - (margin.top + margin.bottom);
	let innerWidth = width - (margin.left + margin.right);

	let chartIndicators = selectedStrat.indicators.filter(
		(ind) => ind.priceData === priceDataId
	);

	let xScale = scaleLinear().range([margin.left, innerWidth]);

	useEffect(() => {
		let _height = height;
		let _indicatorCount = indicatorCount;
		let indicators = indicatorResults[symbol][timeframe];
		for (let _id in indicators) {
			if (yScales[_id]) continue;
			let {
				indicator: { name, fullName, outputs },
				result: { result, group },
			} = indicators[_id];
			let isOverlap = group === "Overlap Studies";
			let isCandle = group === "Pattern Recognition";
			let yScale, yOffset;
			if (isOverlap || isCandle) {
				yScale = yScales["mainChart"].yScale;
				yOffset = 0;
			} else {
				for (let line in result.result) {
					debugger;
					let leftPadding = [];
					if (result.result.begIndex) {
						let startVal = result.result[line][0];
						for (let x = 0; x < result.result.begIndex; x++) {
							leftPadding.push(startVal);
						}
					}
					debugger;
					result.result[line] = [
						...leftPadding,
						...result.result[line],
					];
				}

				yScale = scaleLinear().range([indicatorHeight, 0]);
				yOffset = mainChartHeight + _indicatorCount * indicatorHeight;
				console.log(yOffset);
			}
			yScales[_id] = {
				name,
				fullName,
				yScale,
				yOffset,
				height: indicatorHeight,
				data: result,
				group: group,
				outputs: outputs,
			};
			if (!isOverlap && !isCandle) {
				_height += indicatorHeight;
				_indicatorCount++;
			}
		}
		setYScales({ ...yScales });
		setHeight(_height);
		setIndicatorCount(_indicatorCount);

		draw();
	}, [Object.keys(indicatorResults[symbol][timeframe]).length]);

	innerHeight = height - (margin.top + margin.bottom);

	useEffect(() => {
		draw();
	}, [data, currentZoom, chartSvg]);

	useEffect(() => {
		setChartSvg(select(svgRef.current));
		//fetch indicator results

		chartIndicators.forEach(async (ind) => {
			console.log(ind);

			let inputs = {};
			ind.inputs.forEach((inp) => {
				let { name } = inp;
				if (name === "inReal") {
					let flag = ind.selectedInputs[0];
					inputs[name] = data.map((d) => d[flag]);
				} else if (name === "inPeriods") {
					inputs[name] = ind.variablePeriods;
				} else if (inp.flags) {
					Object.values(inp.flags).map((flag) => {
						inputs[flag] = data.map((d) => d[flag]);
					});
				} else {
					console.log("ok");
				}
			});

			let results = await API.getIndicatorResults(ind, inputs);
			if (!results || results.err) {
				console.log(results);
				console.log("err?");
				return;
			}
			console.log(results);
			updateIndicatorResults({
				indicator: ind,
				result: results.result,
				symbol,
				timeframe,
			});
		});
	}, []);

	const getYMinMax = (data) => {
		if (Array.isArray(data)) {
			let [_, dataMax] = extent(data, (d) => d.high);
			let [dataMin, __] = extent(data, (d) => d.low);
			return [dataMin, dataMax];
		} else if (data.result) {
			let { result } = data;
			data = Object.keys(result)
				.map((lineName) => result[lineName])
				.flat();
			let [dataMin, dataMax] = extent(data, (d) => d);

			return [dataMin, dataMax];
		}
	};

	const padLeft = (data) => {
		let paddedLines = {};

		for (let lineName in data.result) {
			if (data.begIndex) {
				let leftPadding = [];
				if (data.begIndex) {
					let startVal = data.result[lineName][0];
					for (let x = 0; x < data.begIndex; x++) {
						leftPadding.push(startVal);
					}
					paddedLines[lineName] = [
						...leftPadding,
						...data.result[lineName],
					];
				} else {
					paddedLines[lineName] = data.result[lineName];
				}
			}

			return paddedLines;
		}
	};

	const draw = () => {
		if (!data || !data.length) return;

		xScale.domain([0, data.length - 1]);

		let mainChartData = {};
		for (let key in yScales) {
			let { data, group, yScale } = yScales[key];
			if (group === "Cycle Indicators") {
				debugger;
			}
			if (group === "Overlap Studies") {
				if (data.result) {
					for (let lineName in data.result) {
						mainChartData[lineName] = data.result[lineName];
					}
				} else {
					//OHLC data
					mainChartData.close = data.map((d) => d.close);
				}
			} else if (group === "Pattern Recognition") {
				continue; //candle patterns will be charted as markers
			} else {
				debugger;
				let [yMin, yMax] = getYMinMax(data);

				yScale.domain([yMin, yMax]);
			}
		}

		let [yMin, yMax] = getYMinMax({ result: mainChartData });
		yScales["mainChart"].yScale.domain([yMin, yMax]);

		if (currentZoom) {
			let newXScale = currentZoom.rescaleX(xScale);
			let [start, end] = newXScale.domain();

			xScale.domain(newXScale.domain());
			if (start < 0) start = 0;

			let mainChartData = {};
			for (let key in yScales) {
				let { data, group, yScale } = yScales[key];

				if (group === "Overlap Studies") {
					if (data.result) {
						let paddedLines = padLeft(data);
						for (let lineName in paddedLines) {
							mainChartData[lineName] = paddedLines[
								lineName
							].slice(Math.floor(start), Math.ceil(end));
						}
					}
				} else if (group === "Pattern Recognition") {
					continue; //candle patterns will be charted as markers
				} else {
					let tempLineData = {};
					let paddedLines = padLeft(data);
					for (let lineName in paddedLines) {
						tempLineData[lineName] = paddedLines[lineName].slice(
							Math.floor(start),
							Math.ceil(end)
						);
					}

					let [yMin, yMax] = getYMinMax({ result: tempLineData });

					yScale.domain([yMin, yMax]);
				}
			}

			let [yMin, yMax] = getYMinMax({ result: mainChartData });
			yScales["mainChart"].yScale.domain([yMin, yMax]);
		}

		let xAxis = axisBottom(xScale).tickValues(
			xScale.domain().filter((d, i) => i % 10 === 0)
		);

		for (let key in yScales) {
			yScales[key].axis = axisRight(yScales[key].yScale).tickSize(
				-innerWidth
			);
		}

		if (!chartSvg) return;

		chartSvg.select(".x-axis").call(xAxis);

		for (let key in yScales) {
			let { name, axis, yScale, color, yOffset, data, group } = yScales[
				key
			];
			let lines = {};
			if (!data.result) {
				lines.close = data.map((d) => d.close);
			} else {
				let paddedLines = padLeft(data);
				lines = { ...lines, ...paddedLines };

				// for (let line in data.result) {
				// let leftPadding = [];
				// if (data.begIndex) {
				// 	let startVal = data.result[line][0];
				// 	for (let x = 0; x < data.begIndex; x++) {
				// 		leftPadding.push(startVal);
				// 	}
				// }
				// lines[line] = data.result[line];
				// lines[line] = [...leftPadding, ...data.result[line]];
				// }
			}
			if (name === "mainChart") {
				chartSvg.select(`.${name}-y-axis`).call(axis);
			} else if (group !== "Overlap Studies") {
				chartSvg.select(`.${name}-y-axis`).call(axis);
			}

			for (let lineName in lines) {
				let lineData = lines[lineName];

				let className = `${lineName}-myLine`;
				// let className = `${lineName}-myLine ${group}-lineGroup ${name}-indicatorName`;

				chartSvg.selectAll(`.${className}`).remove();
				const myLine = line()
					.x((d, i) => {
						let x = xScale(i);
						return x;
					})
					.y((d) => {
						let y = yScale(d.close || d) + yOffset + margin.top;
						return y;
					});

				chartSvg
					.selectAll(`.${className}`)
					.data([lineData])
					.join("path")
					.attr("class", className)
					.attr("d", myLine)
					.attr("fill", "none")
					.attr("stroke", indicatorColors[name] || "red")
					// .attr("class", "new")
					.exit();
			}
		}

		const zoomBehavior = zoom()
			.scaleExtent([0.1, 10]) //zoom in and out limit
			.translateExtent([
				[0, 0],
				[width, height],
			]) //pan left and right
			.on("zoom", () => {
				const zoomState = zoomTransform(chartSvg.node());
				setCurrentZoom(zoomState);
			});

		chartSvg.call(zoomBehavior);
	};

	const CloseChart = () => {
		return (
			<IconButton
				title={"Close Chart"}
				onClick={() => {
					delete charts[symbol][timeframe];
					setCharts({ ...charts });
				}}
				icon={faWindowClose}
			/>
		);
	};

	let indicatorList = React.useMemo(
		() =>
			chartIndicators.map((ind) => {
				console.log(ind);
				return <IndicatorItem key={ind._id} ind={ind} />;
			}),
		[selectedStrat.indicators.length]
	);

	console.log(yScales);

	return (
		<div className="white">
			<div>
				{title} <CloseChart />
			</div>

			<Flex>
				<IconButton
					title="Add Indicator"
					onClick={() => setAddIndicators(!addIndicators)}
					icon={faPlusSquare}
				/>
			</Flex>
			{addIndicators && (
				<AddIndicatorModal
					setAddIndicators={setAddIndicators}
					symbol={symbol}
					timeframe={timeframe}
				/>
			)}

			<StyledSVG margin={margin} height={height} ref={svgRef}>
				{Object.keys(yScales).map((key) => {
					let { name, yOffset, group } = yScales[key];
					if (
						name !== "mainChart" &&
						(group === "Overlap Studies" ||
							group === "Pattern Recognition")
					) {
						return <></>;
					}
					return (
						<StyledYAxis
							yOffset={yOffset}
							width={width}
							margin={margin}
							className={`${name}-y-axis white`}
						/>
					);
				})}
				<StyledXAxis
					margin={margin}
					height={height}
					className="x-axis white"
				/>
			</StyledSVG>

			<div>INDICATORS</div>
			<div>{indicatorList}</div>
		</div>
	);
}

const Small = styled.span`
	font-size: 10px;
	padding: 0.2em;
	cursor: default;
	/* background-color: #333; */
	&:hover {
		background-color: #666;
	}
`;

const StyledSVG = styled.svg`
	border: 1px solid red;
	width: ${width}px;
	height: ${({ height, margin }) => height + margin.top + margin.bottom}px;
	background: #444;
`;

const StyledXAxis = styled.g`
	user-select: none;
	transform: ${({ margin, height }) =>
		`translate(${margin.left}px, ${height + margin.bottom}px)`};
`;

const StyledYAxis = styled.g`
	user-select: none;
	transform: ${({ yOffset, width, margin }) =>
		`translate(${width - margin.right}px, ${yOffset + margin.top}px)`};
`;

const Flex = styled.div`
	display: flex;
`;

const IndicatorItem = ({ ind }) => {
	const [edit, setEdit] = useState(false);
	const [show, setShow] = useState(false);
	let { selectedStrat, setSelectedStrat, API } = useContext(StratContext);
	return (
		<div key={ind._id}>
			{ind.fullName}{" "}
			<IconButton
				title={show ? "Hide" : "Show"}
				onClick={() => setShow(!show)}
				icon={show ? faEye : faEyeSlash}
			/>
			<IconButton
				title="Delete"
				onClick={async () => {
					await API.deleteIndicator(ind, selectedStrat);
					//pull the data from strat
					debugger;
					selectedStrat.indicators = selectedStrat.indicators.filter(
						({ _id }) => _id !== ind._id
					);
					debugger;
					setSelectedStrat({ ...selectedStrat });
				}}
				icon={faTrashAlt}
			/>
			<IconButton
				title="Edit"
				onClick={() => setEdit(!edit)}
				icon={faPencilAlt}
			/>
			{ind.optInputs && (
				<OptInputs setEdit={setEdit} edit={edit} ind={ind} />
			)}
			{ind.selectedInputs &&
				ind.selectedInputs.map((i) => (
					<Small title={i}>{i.slice(0, 1).toUpperCase()}</Small>
				))}
		</div>
	);
};

const OptInputs = ({ edit, ind, setEdit }) => {
	let data = ind.optInputs;
	const [values, setValues] = useState(data);
	let { updatingIndicator, setUpdatingIndicator, API } = useContext(
		StratContext
	);

	return (
		<>
			<EditableIndOpts
				data={data}
				setEdit={setEdit}
				values={values}
				setValues={setValues}
				edit={edit}
			/>
			{edit && (
				<Small>
					<IconButton
						title={"Cancel"}
						onClick={() => setEdit(false)}
						icon={faTimes}
					/>
					<LoadingButton
						disabled={updatingIndicator}
						loading={updatingIndicator}
						name="Update Indicator"
						submit={async () => {
							setUpdatingIndicator(true);
							console.log("UPDATE");
							let resp = await API.updateIndicatorOpts({
								...values,
								_id: ind._id,
							});

							setUpdatingIndicator(false);
							setEdit(false);
						}}
					/>
				</Small>
			)}
		</>
	);
};

const EditableIndOpts = ({ data, setEdit, values, setValues, edit }) => {
	return (
		<>
			{Object.keys(data).map((name) => {
				let { hint, displayName, defaultValue } = data[name];

				return (
					<Small
						onClick={() => setEdit(true)}
						key={name}
						title={hint}
					>
						{displayName}
						{" : "}
						{edit && displayName !== "MA Type" && (
							<input
								type={"number"}
								style={{}}
								value={values[name].defaultValue}
								onChange={(e) => {
									values[name].defaultValue = e.target.value;
									setValues({
										...values,
									});
								}}
							/>
						)}
						{edit && displayName === "MA Type" && (
							<MA_SELECT
								name={name}
								indicatorOpts={values}
								setIndicatorOpts={setValues}
							/>
						)}

						{!edit &&
							displayName === "MA Type" &&
							MA_TYPE_OPTS[defaultValue]}
						{!edit && displayName !== "MA Type" && defaultValue}
					</Small>
				);
			})}
		</>
	);
};
