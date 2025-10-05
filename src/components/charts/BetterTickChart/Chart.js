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

        const { type, data: initialData, width, ratio } = this.props;

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
    width: PropTypes.number.isRequired,
    ratio: PropTypes.number.isRequired,
};

CandleStickStockScaleChartWithVolumeBarV3.defaultProps = {
    type: "hybrid",
};
CandleStickStockScaleChartWithVolumeBarV3 = fitWidth(CandleStickStockScaleChartWithVolumeBarV3);

export default CandleStickStockScaleChartWithVolumeBarV3;
