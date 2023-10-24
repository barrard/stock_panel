import React from "react";
import { render } from "react-dom";
import Chart from "./Chart";
// import { getData } from "./utils"
import API from "../../API";
import { timeParse } from "d3-time-format";

import { TypeChooser } from "react-stockcharts/lib/helper";
import styled from "styled-components";
async function loadData() {
    const customTicks = await API.getCustomTicks();
    console.log(customTicks);
    // const parseDate = timeParse("%Y-%m-%d");

    const ohlcData = customTicks.map((d) => ({
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume,
        datetime: d.datetime,
        date: new Date(d.datetime),
        volumeClimaxChurnBar: d.volumeClimaxChurnBar,
        lowVolumeBar: d.lowVolumeBar,
        highVolumeChurnBar: d.highVolumeChurnBar,
        volumeClimaxDownBar: d.volumeClimaxDownBar,
        volumeClimaxUpBar: d.volumeClimaxUpBar,
        checkLowVolumeChurn: d.checkLowVolumeChurn,
        lowVolumeChurnBar: d.lowVolumeChurnBar,
    }));
    // .sort((a, b) => {
    //     return a.datetime - b.datetime;
    // });

    // setData(ohlcData);
    // setOriginalData(customTicks);
    return ohlcData;
}

export default class ChartComponent extends React.Component {
    // constructor(props) {
    //     console.log(props);
    //     super(props);
    //     this.state = {
    //         socket: props.Socket,
    //         data: [],
    //     };
    // }
    componentDidMount() {
        loadData().then((data) => {
            this.setState({ data });
        });
        this.props.Socket.on("newTickBar", (d) => {
            d.date = new Date(d.datetime);
            console.log(d);
            const data = this.state.data;
            const lastData = data.slice(-1)[0];
            if (lastData.partial) {
                data[data.length - 1] = d;
            } else {
                data.push(d);
            }

            this.setState({ data: [...data] });
        });
        this.props.Socket.on("lastTrade", (d) => {
            const lastTrade = d.lastTradeData;
            lastTrade.date = new Date(lastTrade.datetime);
            lastTrade.partial = true;
            console.log(lastTrade);

            const data = this.state.data;
            const lastData = data.slice(-1)[0];
            if (lastData.tickCount < 1000) {
                //merge this data
                if (lastTrade.low < lastData.low) {
                    lastData.low = lastTrade.low;
                }
                if (lastTrade.high > lastData.high) {
                    lastData.high = lastTrade.high;
                }
                lastData.close = lastTrade.close;
                lastData.date = lastTrade.date;
                lastData.volume += lastTrade.volume;
            } else {
                data.push(lastTrade);
            }

            this.setState({ data: [...data] });
        });
    }

    componentWillUnmount() {
        this.props.Socket.off("newTickBar");
        this.props.Socket.off("lastTrade");
    }

    render() {
        if (this.state == null) {
            return <div>Loading...</div>;
        }
        return (
            <ChartContainer>
                <Chart type={"hybrid"} data={this.state.data} />
            </ChartContainer>
        );
    }
}

// render(<ChartComponent />, document.getElementById("root"));
const ChartContainer = styled.div`
    margin-top: 2em;
    width: 900px;
`;
