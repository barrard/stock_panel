import React, { useState, useEffect, useRef } from "react";
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
import API from "./API.js";

console.log("RUN THIS SHIT");
let tradeCountPerSecHistory = {};
let tradeVolPerSecHistory = {};
let volWeightedPerSecHistory = {};
let volPerTradePerSecHistory = {};
let tradePriceChangeHistory = {};
let tradeTimeChangeHistory = {};

let tradeCountPerSec = {};
let tradeVolPerSec = {};
let volWeightedPerSec = {};
let volPerTradePerSec = {};
let tradePriceChange = {};
let tradeVolumeChanges = {};
let tradeTimeDiffs = {};

let lastLevelOneData = {};
let levelOneDataChangeArray = [];

let lastTradePrice = {};
let lastTradeTime = {};
// let lastTradeVol = {};
export default function MiniCharts({ Socket }) {
	// console.log("MiniCharts");
	const [levelOneData, setLevelOneData] = useState({});
	const [currentZoom, setCurrentZoom] = useState();

	// on load hook
	useEffect(() => {
		console.log("Add socket listeners");
		Socket.on("levelOne", (levelOne) => {
			let levelOneDataChange = {};
			setLevelOneData({ ...levelOne });
			let levelOneData = handleLevelOne(levelOne);

			Object.entries(levelOneData).forEach(([symbol, data]) => {
				if (!lastLevelOneData[symbol]) lastLevelOneData[symbol] = {};
				if (!levelOneDataChange[symbol]) levelOneDataChange[symbol] = {};
				Object.keys(data).forEach((prop) => {
					let val = data[prop];
					if (val === undefined) return;
					let lastVal = lastLevelOneData[symbol][prop];
					if (lastVal && val) {
						let delta = val - lastVal;
						levelOneDataChange[symbol][prop] = delta;
					}

					lastLevelOneData[symbol][prop] = val;
				});
			});

			levelOneDataChange.timestamp = new Date().toLocaleString();
			levelOneDataChangeArray.push(levelOneDataChange);
		});

		Socket.on("timeAndSales", (timeAndSales) => {
			let { timeSalesData, tradeVol, tradeCount, volWeightedTradePrice, volPerTrade } = handelTimeAndSales(
				timeAndSales
			);
			// console.log({ timeSalesData, tradeVol, tradeCount, volWeightedTradePrice, volPerTrade });
			for (let symbol in tradeCount) {
				if (!tradeCountPerSec[symbol]) tradeCountPerSec[symbol] = 0;
				tradeCountPerSec[symbol] += tradeCount[symbol];
			}

			for (let symbol in tradeVol) {
				if (!tradeVolPerSec[symbol]) tradeVolPerSec[symbol] = 0;
				tradeVolPerSec[symbol] += tradeVol[symbol];
			}
			for (let symbol in volWeightedTradePrice) {
				if (!volWeightedPerSec[symbol]) volWeightedPerSec[symbol] = 0;
				volWeightedPerSec[symbol] += volWeightedTradePrice[symbol];
			}

			for (let symbol in volPerTrade) {
				if (!volPerTradePerSec[symbol]) volPerTradePerSec[symbol] = 0;
				volPerTradePerSec[symbol] += volPerTrade[symbol];
			}
		});
		return () => {
			Socket.off("levelOne");
			Socket.off("timeAndSales");
		};
	}, []);
	let symbols = ["/ES", "/NQ", "/YM", "/GC", "/CL", "/RT"];
	let titles = [
		`Trades Per Sec, `,
		`Trade Vol Per Sec, `,
		// `Vol Weighted Per Sec, `,
		// `Vol Per Trades Per Sec, `,
		// `Time between Trades Per Sec, `,
		// "Price Change",
	];
	let datas = [
		tradeCountPerSecHistory,
		tradeVolPerSecHistory,
		// volWeightedPerSecHistory,
		// volPerTradePerSecHistory,
		// tradeTimeChangeHistory,
		// tradePriceChangeHistory,
	];
	let getTitle = (i, symbol, data) => `${titles[i]} - ${symbol} :  ${data[symbol] ? data[symbol].slice(-1)[0] : ""}`;

	let tradesPerSecCharts = symbols
		.map((symbol) => {
			return datas.map((data, i) => (
				<div className="white">
					<MiniChart
						currentZoom={currentZoom}
						setCurrentZoom={setCurrentZoom}
						data={data[symbol] ? [...data[symbol]] : []}
						title={getTitle(i, symbol, data)}
					/>
				</div>
			));
		})
		.flat();

	return <>{tradesPerSecCharts}</>;
}

function handelTimeAndSales(timeSalesArray) {
	let timeSalesData = {};
	// console.log(timeSalesArray);
	if (Array.isArray(timeSalesArray)) {
		let tradeCount = {};
		let tradeVol = {};
		let volWeightedTradePrice = {};
		let volPerTrade = {};

		timeSalesArray.forEach((data) => parseTimeSales(data, timeSalesData));

		Object.keys(timeSalesData).forEach((symbol) =>
			getStats(symbol, timeSalesData, tradeVol, tradeCount, volWeightedTradePrice, volPerTrade)
		);
		return { timeSalesData, tradeVol, tradeCount, volWeightedTradePrice, volPerTrade };
	} else console.error("ERROR!  timeSales is not an array");
}

function getStats(symbol, obj, tradeVol, tradeCount, volWeightedTradePrice, volPerTrade) {
	let arrayData = obj[symbol];

	arrayData.forEach((timeSandSale) => {
		// console.log(timeSandSale.lastPrice);

		if (!tradeCount[symbol]) {
			tradeCount[symbol] = 0;
			volWeightedTradePrice[symbol] = 0;
			tradeVol[symbol] = 0;
			volPerTrade[symbol] = 0;
		}
		tradeCount[symbol]++;
		tradeVol[symbol] += timeSandSale.lastSize;
		volWeightedTradePrice[symbol] += timeSandSale.lastPrice * timeSandSale.lastSize;

		if (!tradePriceChange[symbol]) {
			tradeVolumeChanges[symbol] = [];
			tradePriceChange[symbol] = [];
			tradeTimeDiffs[symbol] = [];
			lastTradePrice[symbol] = timeSandSale.lastPrice;
			lastTradeTime[symbol] = timeSandSale.tradeTime;
		}

		// if (!lastTradePrice[symbol]) {
		// 	// lastTradeVol[symbol] = timeSandSale.lastSize;
		// }
		let lastPrice = lastTradePrice[symbol]; //Note this is the LAST trade price
		let tradeTime = lastTradeTime[symbol]; //Note this is the LAST trade time
		// let lastSize = lastTradeVol[symbol]; //Note this is the LAST trade volume
		if (lastPrice) {
			let delta = timeSandSale.lastPrice - lastPrice;
			tradePriceChange[symbol].push(delta);
			lastTradePrice[symbol] = timeSandSale.lastPrice;
		}
		if (tradeTime) {
			let delta = timeSandSale.tradeTime - tradeTime;
			tradeTimeDiffs[symbol].push(delta);
			lastTradeTime[symbol] = timeSandSale.tradeTime;
		}

		// if (lastSize) {
		// let delta = timeSandSale.lastSize - lastSize;
		tradeVolumeChanges[symbol].push(timeSandSale.lastSize);
		// lastTradeVol[symbol] = timeSandSale.lastSize;
		// }
	});

	volWeightedTradePrice[symbol] /= tradeVol[symbol];
	volPerTrade[symbol] = tradeVol[symbol] / tradeCount[symbol];
}

function handleLevelOne(levelOneArray) {
	let obj = {};
	if (Array.isArray(levelOneArray)) {
		levelOneArray.forEach((levelOne) => parseLevelOne(levelOne, obj));
	}
	return obj;
}

function parseLevelOne(data, obj) {
	let symbol = data["key"].substring(0, 3);
	let bidPrice = data["1"];
	let askPrice = data["2"];
	let lastPrice = data["3"];
	let bidSize = data["4"];
	let askSize = data["5"];
	obj[symbol] = { bidPrice, askPrice, askSize, bidSize, lastPrice };
}

function parseTimeSales(data, obj) {
	let symbol = data["key"].substring(0, 3);
	if (!obj[symbol]) obj[symbol] = [];
	let tradeTime = data[1];
	let lastPrice = data[2];
	let lastSize = data[3];
	let lastSequence = data[4];
	obj[symbol].push({ lastPrice, tradeTime, lastSize, lastSequence });
}

let timer = setInterval(() => {
	for (let symbol in tradeCountPerSec) {
		if (!tradeCountPerSecHistory[symbol]) {
			tradeCountPerSecHistory[symbol] = [];
			tradeVolPerSecHistory[symbol] = [];
			volWeightedPerSecHistory[symbol] = [];
			volPerTradePerSecHistory[symbol] = [];
			tradeTimeChangeHistory[symbol] = [];
			tradePriceChangeHistory[symbol] = [];
		}

		tradeCountPerSecHistory[symbol].push(tradeCountPerSec[symbol]);
		tradeCountPerSec[symbol] = 0;

		tradeVolPerSecHistory[symbol].push(tradeVolPerSec[symbol]);
		tradeVolPerSec[symbol] = 0;
		if (volWeightedPerSec[symbol]) {
			volWeightedPerSecHistory[symbol].push(volWeightedPerSec[symbol]);
		}

		volWeightedPerSec[symbol] = 0;
		volPerTradePerSecHistory[symbol].push(volPerTradePerSec[symbol]);
		volPerTradePerSec[symbol] = 0;

		// console.log({ symbol, tradeTimeDiffs: tradeTimeDiffs[symbol] });

		// tradeTimeDiffs[symbol].forEach((timeDelta) => {});

		if (tradeTimeDiffs[symbol].length) {
			tradeTimeChangeHistory[symbol].push(
				tradeTimeDiffs[symbol].reduce((total, timeDiff) => Math.abs(timeDiff) + total, 0) /
					tradeTimeDiffs[symbol].length
			);
		} else {
			tradeTimeChangeHistory[symbol].push(0);
		}
		tradeTimeDiffs[symbol] = [];

		// console.log({ symbol });
		tradePriceChange[symbol].forEach((priceDiff, index) => {
			let volDiff = tradeVolumeChanges[symbol][index];
			// console.log({ volDiff, priceDiff });
		});
		if (tradePriceChange[symbol].length) {
			tradePriceChangeHistory[symbol].push(
				tradePriceChange[symbol].reduce((total, priceDiff) => Math.abs(priceDiff) + total, 0) /
					tradePriceChange[symbol].length
			);
		} else {
			tradePriceChangeHistory[symbol].push(0);
		}

		tradeVolumeChanges[symbol] = [];
		tradePriceChange[symbol] = [];
	}
}, 1000);

let width = 1000;
let height = 200;
let margin = {
	left: 20,
	right: 40,
	bottom: 20,
	top: 20,
};
let innerHeight = height - (margin.top + margin.bottom);
let innerWidth = width - (margin.left + margin.right);

let yScale = scaleLinear().range([innerHeight, 0]);
let xScale = scaleLinear().range([margin.left, innerWidth]);
// let xScale = scaleBand().range([margin.left, innerWidth]);
let rScale = scaleLinear().range([1, 5]);

function MiniChart({ title, data, setCurrentZoom, currentZoom }) {
	const svgRef = useRef();
	const [chartSvg, setChartSvg] = useState(undefined);
	const [myData, setMyData] = useState(data);

	useEffect(() => {
		draw();
	}, [data, currentZoom]);

	useEffect(() => {
		console.log("MINI CHART ON LOAD");
		setChartSvg(select(svgRef.current));
	}, []);

	const draw = () => {
		if (!data || !data.length) return;
		let [yMin, yMax] = extent(data);

		// yScale.domain([yMax, yMin]);
		xScale.domain([0, data.length - 1]);
		// xScale.domain(data.map((d) => new Date(d["1"]).toLocaleTimeString())).paddingInner(0.05);
		yScale.domain([yMin - yMin * 0.0005, yMax + yMax * 0.0005]);
		rScale.domain([yMin, yMax]);

		if (currentZoom) {
			let newXScale = currentZoom.rescaleX(xScale);
			// console.log(newXScale);
			let [start, end] = newXScale.domain();
			debugger;
			xScale.domain(newXScale.domain());
			console.log(data.slice(Math.floor(start), Math.floor(end)));
			let [yMin, yMax] = extent(data.slice(Math.floor(start), Math.floor(end)));

			yScale.domain([yMin ? yMin - yMin * 0.0005 : 0, yMax ? yMax + yMax * 0.0005 : 1]);
		}

		let xAxis = axisBottom(xScale).tickValues(xScale.domain().filter((d, i) => i % 100 === 0));
		let yAxis = axisRight(yScale).tickSize(-innerWidth);
		// xAxis.attr('fill', 'white')

		if (!chartSvg) return;

		chartSvg.select(".x-axis").call(xAxis);
		chartSvg.select(".y-axis").call(yAxis);
		chartSvg.selectAll(".myLine").remove();

		const myLine = line()
			// .x((d, i) => xScale(new Date(d.x).toLocaleString()))
			.x((d, i) => {
				let x = xScale(i);
				return x;
			})
			.y((d) => {
				let y = yScale(d);
				return y;
			})
			.curve(curveCardinal);

		chartSvg
			.selectAll("circle")
			.data(data)
			.join(
				"circle"
				// (enter) => enter.append("circle").attr("class", "new"),
				// (update) => update.append("circle").attr("class", "updated"),
				// (exit) => exit.remove()
			)
			.attr("r", rScale)
			.attr("cx", (_, i) => xScale(i))
			.attr("cy", yScale)
			.attr("stroke", "red")
			.exit();

		chartSvg
			.selectAll(".myLine")
			.data([data])
			.join("path")
			.attr("class", "myLine")
			.attr("d", myLine)
			.attr("fill", "none")
			.attr("stroke", "blue")
			// .attr("class", "new")
			.exit();

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

	return (
		<div>
			<h3>{title}</h3>
			<StyledSVG ref={svgRef}>
				<StyledXAxis className="x-axis white" />
				<StyledYAxis className="y-axis white" />
			</StyledSVG>
		</div>
	);
}

const StyledSVG = styled.svg`
	border: 1px solid red;
	width: ${width}px;
	height: ${height}px;
	background: #444;
`;

const StyledXAxis = styled.g`
	user-select: none;
	transform: translate(${margin.left}px, ${innerHeight}px);
`;

const StyledYAxis = styled.g`
	user-select: none;
	transform: translate(${width - margin.right}px);
`;
