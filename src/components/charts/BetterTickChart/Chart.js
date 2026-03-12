import React from "react";
import PropTypes from "prop-types";

import { format } from "d3-format";
import { timeFormat } from "d3-time-format";

import { ChartCanvas, Chart } from "react-stockcharts";
import { BarSeries, CandlestickSeries, OHLCSeries, LineSeries } from "react-stockcharts/lib/series";
import { XAxis, YAxis } from "react-stockcharts/lib/axes";
import { ema, macd, change, elderImpulse } from "react-stockcharts/lib/indicator";
import { CrossHairCursor, EdgeIndicator, MouseCoordinateX, MouseCoordinateY } from "react-stockcharts/lib/coordinates";
import { discontinuousTimeScaleProvider } from "react-stockcharts/lib/scale";
import { fitWidth } from "react-stockcharts/lib/helper";
import { last } from "react-stockcharts/lib/utils";
import { OHLCTooltip, MovingAverageTooltip, MACDTooltip } from "react-stockcharts/lib/tooltip";
import GenericChartComponent from "react-stockcharts/lib/GenericChartComponent";

const DEFAULT_MAX_SIGNALS = 100;

function toTimestamp(value) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
        const parsed = new Date(value).getTime();
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function normalizeSignal(signal = {}) {
    const direction = signal.direction > 0 ? 1 : signal.direction < 0 ? -1 : 0;
    const lastPrice = Number(signal.lastPrice);
    const consecutive = Number(signal.consecutive);
    const timestamp =
        toTimestamp(signal.timestamp) ??
        toTimestamp(signal.timestampMs) ??
        toTimestamp(signal.receivedAt) ??
        Date.now();

    if (!direction || !Number.isFinite(lastPrice)) {
        return null;
    }

    return {
        ...signal,
        direction,
        lastPrice,
        consecutive: Number.isFinite(consecutive) ? consecutive : 0,
        timestamp,
    };
}

function getMarkerSize(consecutive) {
    const normalizedSize = Number.isFinite(Number(consecutive)) ? Math.max(0, Number(consecutive)) : 0;
    return Math.max(6, Math.min(18, 6 + normalizedSize * 1.5));
}

function findSignalIndex(signal, data) {
    if (!Array.isArray(data) || !data.length) return -1;

    const firstTimestamp = toTimestamp(data[0]?.datetime) ?? toTimestamp(data[0]?.date?.getTime?.());
    const lastTimestamp = toTimestamp(data[data.length - 1]?.datetime) ?? toTimestamp(data[data.length - 1]?.date?.getTime?.());
    if (Number.isFinite(lastTimestamp) && signal.timestamp >= lastTimestamp) {
        return data.length - 1;
    }
    if (Number.isFinite(firstTimestamp) && signal.timestamp < firstTimestamp) {
        return -1;
    }

    let matchingIndex = -1;

    for (let index = 0; index < data.length; index += 1) {
        const bar = data[index];
        const barTimestamp = toTimestamp(bar?.datetime) ?? toTimestamp(bar?.date?.getTime?.());
        if (!Number.isFinite(barTimestamp)) continue;

        if (barTimestamp <= signal.timestamp) {
            matchingIndex = index;
            continue;
        }

        break;
    }

    return matchingIndex;
}

class DepthSignalMarkers extends React.Component {
    constructor(props) {
        super(props);
        this.renderSVG = this.renderSVG.bind(this);
    }

    renderSVG(moreProps) {
        const { signals = [] } = this.props;
        const { plotData = [], xScale, xAccessor, chartConfig } = moreProps;
        const yScale = chartConfig?.yScale;
        const chartHeight = chartConfig?.height ?? 0;

        if (!plotData.length || !xScale || !xAccessor || !yScale) return null;

        const normalizedSignals = signals.map(normalizeSignal).filter(Boolean).slice(-DEFAULT_MAX_SIGNALS);
        const stackOffsets = new Map();

        return (
            <g className="depth-signal-markers">
                {normalizedSignals.map((signal, signalIndex) => {
                    const index = findSignalIndex(signal, plotData);
                    if (index < 0) return null;

                    const datum = plotData[index];
                    const xValue = xAccessor(datum);
                    const x = xScale(xValue);
                    const y = yScale(signal.lastPrice);

                    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

                    const markerSize = getMarkerSize(signal.consecutive);
                    const stackKey = `${index}:${signal.direction}`;
                    const stackCount = stackOffsets.get(stackKey) || 0;
                    stackOffsets.set(stackKey, stackCount + 1);

                    const offset = 24 + stackCount * 18;
                    const markerY =
                        signal.direction > 0 ? Math.max(markerSize + 2, y - offset) : Math.min(chartHeight - markerSize - 2, y + offset);
                    const color = signal.direction > 0 ? "#00c853" : "#d50000";
                    const points =
                        signal.direction > 0
                            ? `${x},${markerY - markerSize} ${x - markerSize},${markerY + markerSize} ${x + markerSize},${markerY + markerSize}`
                            : `${x},${markerY + markerSize} ${x - markerSize},${markerY - markerSize} ${x + markerSize},${markerY - markerSize}`;

                    return (
                        <g key={`${signal.timestamp}-${signalIndex}`}>
                            <line x1={x} y1={y} x2={x} y2={markerY} stroke={color} strokeWidth={1.5} strokeOpacity={0.8} />
                            <polygon points={points} fill={color} fillOpacity={0.95} stroke={color} strokeWidth={2} strokeOpacity={0.95} />
                        </g>
                    );
                })}
            </g>
        );
    }

    render() {
        return <GenericChartComponent svgDraw={this.renderSVG} drawOn={["pan", "mousemove", "drag"]} />;
    }
}

class CandleStickStockScaleChartWithVolumeBarV3 extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            xExtents: null,
        };
    }

    componentDidUpdate(prevProps) {
        // Reset xExtents only when symbol changes
        if (prevProps.symbol !== this.props.symbol) {
            this.setState({ xExtents: null });
        }
    }

    render() {
        const changeCalculator = change();

        const emaVol20 = ema()
            .id(2)
            .options({ windowSize: 20 })
            .merge((d, c, e, f) => {
                d.emaVol20 = c;
            })
            .accessor((d) => d.emaVol20);

        const ema20 = ema()
            .id(1)
            .options({ windowSize: 20 })
            .merge((d, c) => {
                d.ema20 = c;
            })
            .accessor((d) => d.ema20);

        const ema50 = ema()
            .id(1)
            .options({ windowSize: 50 })
            .merge((d, c) => {
                d.ema50 = c;
            })
            .accessor((d) => d.ema50);

        const ema200 = ema()
            .id(1)
            .options({ windowSize: 200 })
            .merge((d, c) => {
                d.ema200 = c;
            })
            .accessor((d) => d.ema200);

        const macdCalculator = macd()
            .options({
                fast: 12,
                slow: 26,
                signal: 9,
            })
            .merge((d, c) => {
                d.macd = c;
            })
            .accessor((d) => d.macd);

        const elderImpulseCalculator = elderImpulse().macdSource(macdCalculator.accessor()).emaSource(ema20.accessor());

        const { type, data: initialData, width, ratio, depthSignals } = this.props;

        const calculatedData = emaVol20(elderImpulseCalculator(macdCalculator(ema20(ema50(ema200(changeCalculator(initialData)))))));

        const xScaleProvider = discontinuousTimeScaleProvider.inputDateAccessor((d) => d.date);
        const { data, xScale, xAccessor, displayXAccessor } = xScaleProvider(initialData);

        return (
            <ChartCanvas
                height={600}
                ratio={ratio}
                width={width}
                margin={{ left: 50, right: 50, top: 10, bottom: 30 }}
                type={type}
                data={data}
                xScale={xScale}
                xAccessor={xAccessor}
                displayXAccessor={displayXAccessor}
            >
                <Chart id={1} height={400} yExtents={(d) => [d.high, d.low]} padding={{ top: 10, bottom: 10 }}>
                    <YAxis axisAt="right" orient="right" ticks={5} />
                    <XAxis axisAt="bottom" orient="bottom" showTicks={false} />
                    <XAxis axisAt="left" orient="left" showTicks={false} />
                    <MouseCoordinateY at="right" orient="right" displayFormat={format(".2f")} />
                    <LineSeries yAccessor={ema20.accessor()} stroke={"red"} />
                    <LineSeries yAccessor={ema50.accessor()} stroke={"green"} />
                    <LineSeries yAccessor={ema200.accessor()} stroke={"blue"} />

                    {/* <CandlestickSeries /> */}
                    <OHLCSeries stroke={(d) => (d.volumePro ? "orange" : d.volumeAm ? "yellow" : d.volumeClimaxChurnBar ? "magenta" : d.lowVolumeChurnBar ? "blue" : d.lowVolumeBar ? "white" : d.highVolumeChurnBar ? "black" : d.volumeClimaxDownBar ? "red" : d.volumeClimaxUpBar ? "green" : "grey")} />
                    <DepthSignalMarkers signals={depthSignals} />
                    <OHLCTooltip textFill="white" origin={[0, 10]} />

                    <EdgeIndicator itemType="last" orient="right" edgeAt="right" yAccessor={(d) => d.close} fill={(d) => (d.close > d.open ? "#yellow" : "#orange")} />
                </Chart>
                <Chart id={2} origin={(w, h) => [0, h - 150]} height={150} yExtents={(d) => d.volume}>
                    <XAxis axisAt="bottom" orient="bottom" />
                    <YAxis axisAt="left" orient="left" ticks={5} tickFormat={format(".2s")} />
                    <LineSeries yAccessor={emaVol20.accessor()} stroke={"red"} />
                    <BarSeries yAccessor={(d) => d.volume} fill={(d) => (d.volumePro ? "orange" : d.volumeAm ? "yellow" : d.volumeClimaxChurnBar ? "magenta" : d.lowVolumeChurnBar ? "blue" : d.lowVolumeBar ? "white" : d.highVolumeChurnBar ? "black" : d.volumeClimaxDownBar ? "red" : d.volumeClimaxUpBar ? "green" : "grey")} />

                    <MouseCoordinateX at="bottom" orient="bottom" displayFormat={timeFormat("%I:%M:%S %p")} />
                    <MouseCoordinateY at="right" orient="right" displayFormat={format(".2f")} />
                </Chart>

                <CrossHairCursor />
            </ChartCanvas>
        );
    }
}
CandleStickStockScaleChartWithVolumeBarV3.propTypes = {
    data: PropTypes.array.isRequired,
    depthSignals: PropTypes.array,
    width: PropTypes.number.isRequired,
    ratio: PropTypes.number.isRequired,
};

CandleStickStockScaleChartWithVolumeBarV3.defaultProps = {
    depthSignals: [],
    type: "hybrid",
};
CandleStickStockScaleChartWithVolumeBarV3 = fitWidth(CandleStickStockScaleChartWithVolumeBarV3);

export default CandleStickStockScaleChartWithVolumeBarV3;
