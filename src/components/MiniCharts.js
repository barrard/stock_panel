import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import { axisRight, axisBottom, curveCardinal, extent, line, scaleBand, scaleLinear, select } from "d3";
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
	const [levelOne, setLevelOne] = useState([]);
	const [timeAndSales, setTimeAndSales] = useState([]);
	console.log("MiniCharts");

	// on load hook
	useEffect(() => {
		Socket.on("levelOne", (levelOne) => {
			let levelOneDataChange = {};

			let levelOneData = handleLevelOne(levelOne);
			//compare to the lastradeVolPerSect level one data
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
			console.log({ timeSalesData, tradeVol, tradeCount, volWeightedTradePrice, volPerTrade });
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

	return (
		<div className="white">
			<MiniChart symbol="/ES" />
		</div>
	);
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
		}

		if (!lastTradePrice[symbol]) {
			lastTradePrice[symbol] = timeSandSale.lastPrice;
			lastTradeTime[symbol] = timeSandSale.tradeTime;
			// lastTradeVol[symbol] = timeSandSale.lastSize;
		}
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

let width = 1000;
let height = 500;
let margin = {
	left: 20,
	right: 40,
	bottom: 20,
	top: 20,
};
let innerHeight = height - (margin.top + margin.bottom);
let innerWidth = width - (margin.left + margin.right);

let yScale = scaleLinear().range([innerHeight, 0]);
// let xScale = scaleLinear().range([margin.left, innerWidth]);
let xScale = scaleBand().range([margin.left, innerWidth]);
let rScale = scaleLinear().range([1, 10]);

function MiniChart({ symbol, timeAndSales }) {
	const svgRef = useRef();

	const [data, setData] = useState([timeAndSales]);
	const [chartSvg, setChartSvg] = useState(undefined);

	console.log(`mini chart ${symbol}`);
	console.log(new Date().toLocaleString());

	useEffect(() => {
		// draw();
	}, [data]);

	useEffect(() => {
		setChartSvg(select(svgRef.current));
		console.log(chartSvg);

		let timer = setInterval(() => {
			for (let symbol in tradeCountPerSec) {
				if (!tradeCountPerSecHistory[symbol]) tradeCountPerSecHistory[symbol] = [];
				tradeCountPerSecHistory[symbol].push(tradeCountPerSec[symbol]);
				tradeCountPerSec[symbol] = 0;
			}

			for (let symbol in tradeVolPerSec) {
				if (!tradeVolPerSecHistory[symbol]) tradeVolPerSecHistory[symbol] = [];
				tradeVolPerSecHistory[symbol].push(tradeVolPerSec[symbol]);
				tradeVolPerSec[symbol] = 0;
			}
			for (let symbol in volWeightedPerSec) {
				if (!volWeightedPerSecHistory[symbol]) volWeightedPerSecHistory[symbol] = [];
				volWeightedPerSecHistory[symbol].push(volWeightedPerSec[symbol]);

				volWeightedPerSec[symbol] = 0;
			}

			for (let symbol in volPerTradePerSec) {
				if (!volPerTradePerSecHistory[symbol]) volPerTradePerSecHistory[symbol] = [];
				volPerTradePerSecHistory[symbol].push(volPerTradePerSec[symbol]);
				volPerTradePerSec[symbol] = 0;
			}

			for (let symbol in tradeTimeDiffs) {
				if (!tradeTimeChangeHistory[symbol]) tradeTimeChangeHistory[symbol] = [];
				//loop over the trade times?
				console.log({ tradeTimeDiffs: tradeTimeDiffs[symbol] });

				tradeTimeDiffs[symbol].forEach((timeDelta) => {});

				tradeTimeChangeHistory[symbol].push(tradeTimeDiffs[symbol]);
				tradeTimeDiffs[symbol] = [];
			}
			for (let symbol in tradePriceChange) {
				if (!tradePriceChangeHistory[symbol]) tradePriceChangeHistory[symbol] = [];

				console.log({ symbol });
				tradePriceChange[symbol].forEach((priceDiff, index) => {
					let volDiff = tradeVolumeChanges[symbol][index];
					console.log({ volDiff, priceDiff });
				});
				//this will be an array of price changes in the last second,
				// match them up to volume changes
				tradePriceChangeHistory[symbol].push(tradePriceChange[symbol]);
				tradeVolumeChanges[symbol] = [];
				tradePriceChange[symbol] = [];
			}

			console.log({
				tradeCountPerSecHistory,
				tradeVolPerSecHistory,
				volWeightedPerSecHistory,
				volPerTradePerSecHistory,
			});
		}, 1000);
		return () => {
			clearInterval(timer);
		};
	}, []);

	const draw = () => {
		let xData = data.map();
		debugger;
		let yData = data.map((d) => d["DJI"].lastPrice);
		console.log(yData, data);
		//chart setup
		let [yMin, yMax] = extent(yData);
		debugger;

		// yScale.domain([yMax, yMin]);
		// xScale.domain([0, yData.length - 1]);
		xScale.domain(data.map((d) => new Date(d["1"]).toLocaleTimeString())).paddingInner(0.05);

		yScale.domain([yMin - yMin * 0.05, yMax + yMax * 0.05]);

		console.log(xScale.domain().filter((d, i) => i % 100 === 0));
		let xAxis = axisBottom(xScale).tickValues(xScale.domain().filter((d, i) => i % 100 === 0));
		let yAxis = axisRight(yScale).tickSize(-innerWidth);
		// xAxis.attr('fill', 'white')

		if (!chartSvg) return;

		console.log("DRAW!!!!  ");

		chartSvg.select(".x-axis").call(xAxis);
		chartSvg.select(".y-axis").call(yAxis);
		chartSvg.selectAll(".myLine").remove();

		const myLine = line()
			.x((d, i) => xScale(new Date(d.createdAt).toLocaleString()))
			.y((d) => yScale(d.DJI.lastPrice))
			.curve(curveCardinal);

		// chartSvg
		//     .selectAll("circle")
		//     .data(yData)
		//     .join(
		//         "circle"
		//         // (enter) => enter.append("circle").attr("class", "new"),
		//         // (update) => update.append("circle").attr("class", "updated"),
		//         // (exit) => exit.remove()
		//     )
		//     .attr("r", rScale)
		//     .attr("cx", (_, i) => xScale(i))
		//     .attr("cy", yScale)
		//     .attr("stroke", "red")
		//     .exit();

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
	};

	return (
		<div>
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
