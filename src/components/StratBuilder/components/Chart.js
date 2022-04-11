import React, { useState, useEffect, useRef, useContext } from "react";
import { extent, scaleLinear, select, zoom, zoomTransform, mouse } from "d3";
import {
    faPlusSquare,
    faWindowClose,
    faGripLines,
    faArrowTrendUp,
} from "@fortawesome/free-solid-svg-icons";
// import { faWavePulse } from "@fortawesome/fontawesome-svg-core";
import { faHackerrank } from "@fortawesome/free-brands-svg-icons";
import { GiAirZigzag } from "react-icons/gi";

import AddIndicatorModal from "./AddIndicatorModal";
import { IconButton, LoadingButton } from "./components";
import StratContext from "../StratContext";
import API from "../../API";
import {
    appendChartPatterns,
    appendOHLCVLabel,
    appendIndicatorName,
    appendXLabel,
    appendYLabel,
    drawCrossHair,
    drawXAxis,
    drawYAxis,
    drawIndicator,
    drawHighLows,
    drawPriceLevels,
    drawZigZag,
} from "./chartAppends";
import { IndicatorItem, LineSettings } from "./chartComponents";
import {
    StyledSVG,
    StyledXAxis,
    StyledYAxis,
    Flex,
} from "./chartComponents/styled";
import ChartContext from "./ChartContext";
import { MinMax, PriceLevels, ZigZag } from "./chartComponents/classes";
import {
    priceRangeRed,
    priceRangeGreen,
} from "../../../components/charts/chartHelpers/utils";
export default function Chart({ symbol, timeframe }) {
    let width = 750;
    let margin = {
        left: 20,
        right: 50,
        bottom: 20,
        top: 20,
    };
    let indicatorHeight = 100;
    let mainChartHeight = 250;

    const {
        charts,
        setCharts,
        selectedStrat,
        indicatorResults,
        updateIndicatorResults,
        chartConditionals,
    } = useContext(StratContext);

    const [toggleHighLow, setDrawHighLow] = useState(false);
    const [minMaxTolerance, setMinMaxTolerance] = useState(10);
    const [zigZagTolerance, setZigZagTolerance] = useState(0.019);
    const [minMax, setMinMax] = useState({});

    const [toggleZigZag, setDrawZigZag] = useState(false);
    const [togglePriceLevels, setDrawPriceLevels] = useState(false);
    const [priceLevelMinMax, setPriceLevelMinMax] = useState(10);
    const [priceLevelTolerance, setPriceLevelTolerance] = useState(10);

    const [priceLevels, setPriceLevels] = useState({});
    const { data, id: priceDataId } = charts[symbol][timeframe];
    // console.log("data.length", data.length);
    // console.log("width", width);
    const title = `${symbol} ${timeframe}`;
    const svgRef = useRef();
    const [height, setHeight] = useState(mainChartHeight);
    const [chartSvg, setChartSvg] = useState(undefined);
    const [currentZoom, setCurrentZoom] = useState();
    const [addIndicators, setAddIndicators] = useState(false);
    const [indicatorCount, setIndicatorCount] = useState(0);
    const [lineSettings, setLineSettings] = useState({});
    const [selectedPatternResults, setSelectedPatternResults] = useState({});

    // const [indicatorColors, setIndicatorColors] = useState({
    // 	mainChart: "yellow",
    // });
    let innerWidth = width - (margin.left + margin.right);
    let xScale = scaleLinear().range([margin.left, width - margin.right]);
    let candleWidth = data.length / innerWidth;
    const [yScales, setYScales] = useState({
        mainChart: {
            yScale: scaleLinear().range([mainChartHeight, 0]),
            xScale,
            data: data,
            sliceData: {},
            color: { close: "yellow" },
            margin,
            height: mainChartHeight,
            name: "mainChart",
            fullName: `${symbol} OHLC ${timeframe}`,
            yOffset: 0,
            group: "Overlap Studies",
        },
        mainChartVolume: {
            yScale: scaleLinear().range([indicatorHeight, 0]),
            xScale,
            data: data.map(({ volume }) => volume),
            sliceData: {},
            color: { close: "yellow" },
            margin,
            height: indicatorHeight,
            name: "mainChartVolume",
            fullName: `${symbol} VOL ${timeframe}`,
            yOffset: mainChartHeight,
            group: "Volume",
        },
    });

    // debugger

    // let innerHeight = height - (margin.top + margin.bottom);

    let chartIndicators = selectedStrat.indicators.filter(
        (ind) => ind.priceData === priceDataId
    );

    useEffect(() => {
        // debugger
        let _height = mainChartHeight + yScales.mainChartVolume.height;
        let _indicatorCount = 1; //this is to include volume
        let indicators = indicatorResults[symbol][timeframe];
        for (let _id in indicators) {
            let {
                indicator: { name, fullName, outputs, color },
                result: { result, group },
            } = indicators[_id];
            let isOverlap = group === "Overlap Studies";
            let isCandle = group === "Pattern Recognition";
            let isMainChart = isOverlap || isCandle;
            let yScale, yOffset;

            //SCALE IS ALREADY ADDED
            if (yScales[_id]) {
                if (!isMainChart) {
                    _indicatorCount++;
                    _height += indicatorHeight;
                }

                continue;
            }

            if (isOverlap || isCandle) {
                yScale = yScales["mainChart"].yScale;
                yOffset = yScales["mainChart"].yOffset;
            } else {
                yScale = scaleLinear().range([indicatorHeight, 0]);
                yOffset = mainChartHeight + _indicatorCount * indicatorHeight;
                // console.log(yOffset);
            }
            yScales[_id] = {
                color,
                name,
                fullName,
                yScale,
                xScale,
                margin,
                yOffset,
                height: isMainChart
                    ? yScales["mainChart"].height
                    : indicatorHeight,
                data: result,
                sliceData: {},
                group: group,
                outputs: outputs,
            };

            addClipPath(yScales, _id);
            // indicatorColors[name] = color;
            if (!isOverlap && !isCandle) {
                _height += indicatorHeight;
                _indicatorCount++;
            }
        }
        // setIndicatorColors(indicatorColors);
        setYScales({ ...yScales });
        setHeight(_height);
        setIndicatorCount(_indicatorCount);

        draw();
    }, [Object.keys(indicatorResults[symbol][timeframe]).length]);

    // innerHeight = height - (margin.top + margin.bottom);
    useEffect(() => {
        console.log(data);
        if (!parseFloat(minMaxTolerance) || !parseFloat(zigZagTolerance))
            return console.log("Must not be 0");
        let minMax = new MinMax(
            data,
            parseFloat(minMaxTolerance),
            parseFloat(zigZagTolerance)
        );

        let { lowNodes, highNodes, highLowerLows, highLowerHighs, zigZag } =
            minMax;
        setMinMax({
            lowNodes,
            highNodes,
            highLowerLows,
            highLowerHighs,
            zigZag,
        });
    }, [data, minMaxTolerance, zigZagTolerance]);

    useEffect(() => {
        let priceLevels = new PriceLevels(
            data,
            parseFloat(priceLevelMinMax),
            parseFloat(priceLevelTolerance)
        );
        console.log(priceLevels);
        setPriceLevels(priceLevels);
    }, [data, priceLevelMinMax, priceLevelTolerance]);

    useEffect(() => {
        // console.log("draw");
        // console.log(minMax);
        draw();
    }, [
        data,
        currentZoom,
        chartSvg,
        yScales,
        selectedPatternResults.pattern,
        toggleHighLow,
        minMax,
        togglePriceLevels,
        priceLevels,
        toggleZigZag,
    ]);

    useEffect(() => {
        setChartSvg(select(svgRef.current));
        //fetch indicator results
        chartIndicators.forEach(async (ind) => {
            fetchAndUpdateIndicatorResults(ind);
        });
    }, []);

    useEffect(() => {
        for (let scale in yScales) {
            addClipPath(yScales, scale);
        }
    }, [chartSvg]);

    const addClipPath = (yScales, scale) => {
        const { xScale, yOffset, height } = yScales[scale];

        if (!chartSvg) return;
        const clip = chartSvg
            .select("defs")
            .append("clipPath")
            .attr("id", `${scale}-clipBox`);
        clip.append("rect")
            .attr("class", `${scale}-clipping`)
            .attr("x", margin.left)
            .attr("y", yOffset + margin.top)
            .attr("width", innerWidth)
            .attr("height", height)
            .attr("fill", "none")
            .attr("id", `${scale}-xSliceBox`)
            .attr("stroke", "yellow")
            .attr("stroke-width", 3.5);

        priceRangeRed(chartSvg.select("defs"));
        priceRangeGreen(chartSvg.select("defs"));
    };

    const fetchAndUpdateIndicatorResults = async (ind) => {
        let inputs = {};
        ind.inputs.forEach((inp) => {
            let { name } = inp;
            if (name.includes("inReal")) {
                let flag = ind.selectedInputs[name];
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
        // console.log(results);
        updateIndicatorResults({
            indicator: ind,
            result: results.result,
            symbol,
            timeframe,
        });
        setYScales((yScales) => {
            if (yScales[ind._id]) {
                yScales[ind._id].data = results.result.result;
            }
            return { ...yScales };
        });
        draw();
    };

    const getYMinMax = (data, isVolume) => {
        if (isVolume) {
            let [dataMin, dataMax] = extent(data, (d) => d);
            return [dataMin, dataMax];
        } else if (Array.isArray(data)) {
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
    };

    const draw = () => {
        if (!data || !data.length) return;

        xScale.domain([0, data.length - 1]);
        // let [start, end] = xScale.domain();

        // let [rStart, rEnd] = xScale.range();

        if (currentZoom) {
            let newXScale = currentZoom.rescaleX(xScale);

            let [start, end] = newXScale.domain();

            let [rStart, rEnd] = newXScale.range();

            xScale.domain(newXScale.domain());

            // let [zoomedStart, zoomedEnd] = xScale.domain();

            //this is just to get the minMax scale
            let mainChartData = {};
            let floorStart = start < 0 ? 0 : Math.floor(start);
            let ceilEnd = Math.floor(end);
            for (let key in yScales) {
                yScales[key].xScale = xScale;
                let { data, group, yScale, height, yOffset } = yScales[key];

                if (group === "Overlap Studies") {
                    if (data.result) {
                        //These are indicators
                        let paddedLines = padLeft(data);
                        for (let lineName in paddedLines) {
                            yScales[key].sliceData[lineName] =
                                paddedLines[lineName];
                            mainChartData[lineName] = paddedLines[
                                lineName
                            ].slice(floorStart, ceilEnd);
                        }
                    } else {
                        //wheres my close?
                        //needs to always be OHLC candles

                        mainChartData.high = data
                            .map((d) => d.high)
                            .slice(floorStart, ceilEnd);
                        mainChartData.low = data
                            .map((d) => d.low)
                            .slice(floorStart, ceilEnd);

                        candleWidth =
                            (rEnd - rStart) / mainChartData.high.length;

                        if (ceilEnd > data.length) {
                            candleWidth =
                                candleWidth -
                                candleWidth *
                                    ((ceilEnd - data.length) / (end - start));
                        }
                        if (start < 0) {
                            let l = Math.floor(-(start - end));
                            candleWidth = innerWidth / l;
                        }
                    }
                } else if (group === "Pattern Recognition") {
                    continue; //candle patterns will be charted as markers
                } else {
                    if (group === "Volume") {
                        let tempLineData = [...data];

                        tempLineData = tempLineData.slice(floorStart, ceilEnd);
                        let isVolume = true;
                        let [yMin, yMax] = getYMinMax(tempLineData, isVolume);

                        yScale.domain([0, yMax]);
                    } else {
                        let tempLineData = {};
                        let paddedLines = padLeft(data);
                        for (let lineName in paddedLines) {
                            yScales[key].sliceData[lineName] =
                                paddedLines[lineName];
                            tempLineData[lineName] = paddedLines[
                                lineName
                            ].slice(floorStart, ceilEnd);
                        }

                        let [yMin, yMax] = getYMinMax({ result: tempLineData });

                        yScale.domain([yMin, yMax]);
                    }
                }
            }
            let [yMin, yMax] = getYMinMax({ result: mainChartData });
            yScales["mainChart"].yScale.domain([yMin, yMax]);
        } else {
            //   NO ZOOM YET
            let mainChartData = {};
            for (let key in yScales) {
                let { data, group, yScale } = yScales[key];
                // if (group === "Cycle Indicators") {
                // ;
                // }
                if (group === "Overlap Studies") {
                    if (!data) {
                        return;
                    }
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
                } else if (group === "Volume") {
                    let isVolume = true;
                    let [yMin, yMax] = getYMinMax(data, isVolume);
                    // console.log({ yMin, yMax });
                    yScale.domain([0, yMax]);
                } else {
                    // ;
                    let [yMin, yMax] = getYMinMax(data);

                    yScale.domain([yMin, yMax]);
                }
            }

            let [yMin, yMax] = getYMinMax({ result: mainChartData });
            yScales["mainChart"].yScale.domain([yMin, yMax]);
        }

        //RETURN IF THERE IS NO SVG
        if (!chartSvg) return;
        drawXAxis({ xScale, data, chartSvg, className: "x-axis" });
        //CALLING ALL Y-SCALE
        for (let key in yScales) {
            drawYAxis({ yScales, chartSvg, key, innerWidth });
        }

        chartSvg.on("mousemove", function () {
            let [mouseX, mouseY] = mouse(this);
            let chartData = {
                chartSvg,
                indicatorHeight,
                mainChartHeight,
                mouseX,
                mouseY,
                xScale,
                data,
                margin,
                height,
                yScales,
                yScale: yScales["mainChart"].yScale,
            };

            drawCrossHair({
                ...chartData,
            });

            appendXLabel({
                ...chartData,
                hasBackground: true,
            });

            appendYLabel({
                ...chartData,
                hasBackground: true,
            });

            appendOHLCVLabel({
                ...chartData,
            });
        });

        //STORE CHART PATTERNS
        let chartPatterns = [];
        //CALLING EACH Y-SCALE AND DRAWING INDICATOR LINE
        for (let key in yScales) {
            drawIndicator({
                yScales,
                key,
                chartPatterns,
                candleWidth,
                chartSvg,
                mainChartHeight,
                margin,
                padLeft,
                setLineSettings,
            });
        }

        drawHighLows(
            toggleHighLow,
            chartSvg,
            data,
            minMax,
            yScales["mainChart"],
            margin
        );

        drawPriceLevels(
            togglePriceLevels,
            chartSvg,
            data,
            priceLevels,
            yScales["mainChart"],
            margin,
            priceLevelTolerance,
            innerWidth
        );

        // console.log(data);

        drawZigZag(
            toggleZigZag,
            chartSvg,
            data,
            minMax,
            yScales["mainChart"],
            margin,
            candleWidth
        );

        //ADD FULL_NAME TO CHART
        appendIndicatorName(chartSvg, margin, yScales, setLineSettings);

        //APPEND selectedPatternResults,
        //APPEND CHART PATTERNS
        if (selectedPatternResults.pattern) {
            let someData = [
                {
                    ...yScales.mainChart,
                    data: selectedPatternResults.result,
                    fullName: selectedPatternResults.pattern,
                },
            ];
            appendChartPatterns(chartSvg, someData, data);
        }

        const zoomBehavior = zoom()
            .scaleExtent([0.1, 100]) //zoom in and out limit
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
                // console.log(ind);
                return (
                    <IndicatorItem
                        fetchAndUpdateIndicatorResults={
                            fetchAndUpdateIndicatorResults
                        }
                        key={ind._id}
                        ind={ind}
                    />
                );
            }),
        [selectedStrat.indicators.length]
    );

    const STATE = {
        draw,
        chartSvg,
        chartIndicators,
        setLineSettings,
        yScales,
        lineSettings,
        setYScales,
        fetchAndUpdateIndicatorResults,
        selectedPatternResults,
        setSelectedPatternResults,
    };

    return (
        <ChartContext.Provider value={STATE}>
            <div className="white">
                <div>
                    {title} <CloseChart />
                </div>
                <div>
                    Conditionals List
                    {Object.keys(chartConditionals).length}
                </div>

                <Flex>
                    <IconButton
                        title="Add Indicator"
                        onClick={() => setAddIndicators(!addIndicators)}
                        icon={faPlusSquare}
                    />

                    <IconButton
                        borderColor={toggleHighLow ? "green" : "none"}
                        title="Highs and lows"
                        onClick={() => setDrawHighLow(!toggleHighLow)}
                        icon={faHackerrank}
                    />
                    <IconButton
                        borderColor={togglePriceLevels ? "green" : "none"}
                        title="Price Levels"
                        onClick={() => setDrawPriceLevels(!togglePriceLevels)}
                        icon={faGripLines}
                    />
                    <IconButton
                        borderColor={toggleZigZag ? "green" : "none"}
                        title="ZigZag"
                        onClick={() => setDrawZigZag(!toggleZigZag)}
                        rIcon={<GiAirZigzag />}
                    />
                </Flex>
                {addIndicators && (
                    <AddIndicatorModal
                        setAddIndicators={setAddIndicators}
                        symbol={symbol}
                        timeframe={timeframe}
                    />
                )}
                {toggleHighLow && (
                    <>
                        <p>High Low</p>

                        <input
                            type="number"
                            onChange={(e) => setMinMaxTolerance(e.target.value)}
                            value={minMaxTolerance}
                        />
                    </>
                )}
                {togglePriceLevels && (
                    <>
                        <p>Price Levels</p>
                        <input
                            type="number"
                            onChange={(e) =>
                                setPriceLevelMinMax(e.target.value)
                            }
                            value={priceLevelMinMax}
                        />
                        <input
                            type="number"
                            onChange={(e) =>
                                setPriceLevelTolerance(e.target.value)
                            }
                            value={priceLevelTolerance}
                        />
                    </>
                )}
                {toggleZigZag && (
                    <>
                        <p>ZigZag Tolerance</p>
                        <input
                            title={"Zig Zag Tolerance"}
                            type="number"
                            step={0.001}
                            onChange={(e) => setZigZagTolerance(e.target.value)}
                            value={zigZagTolerance}
                        />
                    </>
                )}

                <div style={{ border: "1px solid blue", position: "relative" }}>
                    {lineSettings.lineName && <LineSettings />}
                    <StyledSVG
                        width={width}
                        margin={margin}
                        height={height}
                        ref={svgRef}
                    >
                        <defs />
                        {Object.keys(yScales).map((key) => {
                            let { name, yOffset, group } = yScales[key];
                            if (
                                name !== "mainChart" &&
                                (group === "Overlap Studies" ||
                                    group === "Pattern Recognition")
                            ) {
                                return (
                                    <React.Fragment key={key}></React.Fragment>
                                );
                            }
                            return (
                                <StyledYAxis
                                    key={key}
                                    yOffset={yOffset}
                                    width={width}
                                    margin={margin}
                                    className={`${name}-${key}-y-axis white`}
                                />
                            );
                        })}
                        <StyledXAxis
                            margin={margin}
                            height={height}
                            className="x-axis white"
                        />
                    </StyledSVG>
                </div>

                <div>INDICATORS</div>
                <div>{indicatorList}</div>
            </div>
        </ChartContext.Provider>
    );
}
