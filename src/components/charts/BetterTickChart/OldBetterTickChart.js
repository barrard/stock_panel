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

class OldBetterTickChart extends React.Component {
    constructor(props) {
        super(props);
        const { location } = this.props;
        const params = queryString.parse(location.search);
        this.state = {
            data: [],
            depthSignals: [],
            symbol: params.symbol || "ES",
            isLoading: true,
            error: null,
            tempLastTrade: [],
            join: parseInt(params.join) || 1, // Add join with default value of 1
            dataVersion: 0, // Add version counter for forcing re-renders
        };
        this.dataRef = React.createRef();
        this.dataRef.current = [];
    }

    componentDidMount() {
        this.loadChartData();
        this.setupSocketListeners();
        this.setupDepthSignalListener(this.state.symbol);
    }
    componentDidUpdate(prevProps) {
        const { location } = this.props;
        const params = queryString.parse(location.search);
        const prevParams = queryString.parse(prevProps.location.search);

        if (params.symbol !== prevParams.symbol) {
            const nextSymbol = params.symbol || "ES";
            this.teardownDepthSignalListener(prevParams.symbol || "ES");
            this.setState(
                {
                    symbol: nextSymbol,
                    depthSignals: [],
                    isLoading: true,
                },
                () => {
                    this.loadChartData();
                    this.setupDepthSignalListener(nextSymbol);
                }
            );
        }
    }

    loadChartData = async () => {
        try {
            const data = await loadData({ symbol: this.state.symbol, join: this.state.join });
            this.dataRef.current = data;
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
            const data = this.dataRef.current;
            const lastData = data.slice(-1)[0];

            if (lastData && lastData.partial) {
                data[data.length - 1] = d;
            } else {
                data.push(d);
            }

            // Update state data reference to trigger render
            this.setState({ data: this.dataRef.current });
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

    setupDepthSignalListener = (symbol) => {
        if (!symbol) return;
        const eventName = `depthTradeSignal-${symbol}`;
        this.depthSignalEventName = eventName;
        this.depthSignalHandler = (signal) => {
            this.setState((prevState) => ({
                depthSignals: [
                    ...prevState.depthSignals.slice(-99),
                    {
                        ...signal,
                        timestamp: signal?.timestamp || signal?.timestampMs || Date.now(),
                        receivedAt: Date.now(),
                    },
                ],
            }));
        };
        this.props.Socket.on(eventName, this.depthSignalHandler);
    };

    teardownDepthSignalListener = (symbol = this.state.symbol) => {
        const eventName = this.depthSignalEventName || (symbol ? `depthTradeSignal-${symbol}` : null);
        if (eventName && this.depthSignalHandler) {
            this.props.Socket.off(eventName, this.depthSignalHandler);
        }
        this.depthSignalEventName = null;
        this.depthSignalHandler = null;
    };

    componentWillUnmount() {
        this.props.Socket.off("newTickBar");
        this.props.Socket.off("lastTrade");
        this.teardownDepthSignalListener();
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
        const { isLoading, error, symbol, join, depthSignals } = this.state;
        const data = this.dataRef.current;

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
                        <Chart key={symbol} type="hybrid" data={data} symbol={symbol} depthSignals={depthSignals} />
                    </ChartContainer>
                )}
            </ChartPageContainer>
        );
    }
}

// Higher-order component to handle URL params
export default withRouter(OldBetterTickChart);

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
