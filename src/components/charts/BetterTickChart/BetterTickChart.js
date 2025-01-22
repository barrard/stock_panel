import React from "react";
import { render } from "react-dom";
import { withRouter } from "react-router-dom";
import queryString from "query-string"; // You'll need to install this package
import Chart from "./Chart";
// import { getData } from "./utils"
import API from "../../API";
import { timeParse } from "d3-time-format";
import SymbolSelector from "./utils/SymbolSelector";
import TickCombineControl from "./utils/TickCombineControl";
import { TypeChooser } from "react-stockcharts/lib/helper";
import styled from "styled-components";

async function loadData(options = {}) {
    const { symbol, start, finish, limit, join, skip } = options;

    const customTicks = await API.getCustomTicks({
        symbol,
        start,
        finish,
        limit: limit !== undefined ? parseInt(limit) : undefined,
        join: join !== undefined ? parseInt(join) : undefined,
        skip: skip !== undefined ? parseInt(skip) : undefined,
    });
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

class ChartComponent extends React.Component {
    constructor(props) {
        super(props);
        const { location } = this.props;
        const params = queryString.parse(location.search);
        this.state = {
            data: [],
            symbol: params.symbol || "ES",
            isLoading: true,
            error: null,
            tempLastTrade: [],
            join: parseInt(params.join) || 1, // Add join with default value of 1
        };
    }

    componentDidMount() {
        this.loadChartData();
        this.setupSocketListeners();
    }
    componentDidUpdate(prevProps) {
        const { location } = this.props;
        const params = queryString.parse(location.search);
        const prevParams = queryString.parse(prevProps.location.search);

        if (params.symbol !== prevParams.symbol) {
            this.setState(
                {
                    symbol: params.symbol || "DEFAULT_SYMBOL",
                    isLoading: true,
                },
                () => {
                    this.loadChartData();
                }
            );
        }
    }

    loadChartData = async () => {
        try {
            const data = await loadData({ symbol: this.state.symbol, join: this.state.join });
            this.setState({ data, isLoading: false });
        } catch (error) {
            this.setState({ error: error.message, isLoading: false });
        }
    };

    setupSocketListeners = () => {
        this.props.Socket.on("newTickBar", (d) => {
            debugger;
            if (d.symbol !== this.state.symbol) return; // Add symbol check

            d.date = new Date(d.datetime);
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
            debugger;
            // if (d.symbol !== this.state.symbol) return; // Add symbol check

            // const lastTrade = d.lastTradeData;
            // lastTrade.date = new Date(lastTrade.datetime);
            // lastTrade.partial = true;

            // const data = this.state.data;
            // if (!data.length) {
            //     this.state.tempLastTrade.push(lastTrade);

            //     return;
            // }
            // const lastData = data.slice(-1)[0];

            // if (lastData.tickCount < 1000) {
            //     if (lastTrade.low < lastData.low) lastData.low = lastTrade.low;
            //     if (lastTrade.high > lastData.high) lastData.high = lastTrade.high;
            //     lastData.close = lastTrade.close;
            //     lastData.date = lastTrade.date;
            //     lastData.volume += lastTrade.volume;
            // } else {
            //     data.push(lastTrade);
            // }

            // this.setState({ data: [...data] });
        });
    };

    componentWillUnmount() {
        this.props.Socket.off("newTickBar");
        this.props.Socket.off("lastTrade");
    }

    handleSymbolChange = (newSymbol) => {
        const { history, location } = this.props;
        const currentParams = queryString.parse(location.search);

        // Update URL with new symbol
        const newSearch = queryString.stringify({
            ...currentParams,
            symbol: newSymbol,
        });

        history.push({
            pathname: location.pathname,
            search: newSearch,
        });

        // State update will happen in componentDidUpdate due to URL change
    };

    handleTickCombineChange = (newValue) => {
        // Update state directly
        this.setState({ join: newValue }, () => {
            // After state is updated, update URL params
            const { history, location } = this.props;
            const currentParams = queryString.parse(location.search);

            const newSearch = queryString.stringify({
                ...currentParams,
                join: newValue,
            });

            history.push({
                pathname: location.pathname,
                search: newSearch,
            });

            // Reload data with new join value
            this.loadChartData();
        });
    };

    render() {
        const { data, isLoading, error, symbol, join } = this.state;

        return (
            <ChartPageContainer>
                <SymbolSelector currentSymbol={symbol} onSymbolChange={this.handleSymbolChange} />
                <TickCombineControl
                    value={join} // join from your state
                    onChange={this.handleTickCombineChange} // your handler function
                />
                {isLoading ? (
                    <LoadingContainer>Loading...</LoadingContainer>
                ) : error ? (
                    <ErrorContainer>Error: {error}</ErrorContainer>
                ) : !data.length ? (
                    <NoDataContainer>No data available</NoDataContainer>
                ) : (
                    <ChartContainer>
                        <Chart type="hybrid" data={data} symbol={symbol} />
                    </ChartContainer>
                )}
            </ChartPageContainer>
        );
    }
}

// Higher-order component to handle URL params
export default withRouter(ChartComponent);

const ChartPageContainer = styled.div`
    padding: 1em;
`;

const ChartContainer = styled.div`
    margin-top: 2em;
    width: 900px;
`;

const LoadingContainer = styled.div`
    padding: 2em;
    text-align: center;
`;

const ErrorContainer = styled.div`
    padding: 2em;
    color: red;
    text-align: center;
`;

const NoDataContainer = styled.div`
    padding: 2em;
    text-align: center;
    color: #666;
`;
