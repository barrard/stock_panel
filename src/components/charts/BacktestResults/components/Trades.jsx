import React from "react";
import styled from "styled-components";
import moment from "moment";

const DateLabel = styled.div`
    background: ${({ color }) => {
        return color % 2 == 0 ? "#666" : "#aaa";
    }};
`;

export default function Trades(props) {
    const { getBacktestDay, backtestResultsDate } = props;
    const dayTrades = props.trades.reduce((acc, t) => {
        const { datetimeOpen } = t;
        const date = moment(datetimeOpen).format("MM/DD/YY");

        if (!acc[date]) {
            acc[date] = [];
        }

        acc[date].push(t);

        return acc;
    }, {});
    let count = 0;

    return (
        <table class="table white">
            <thead>
                <tr>
                    <th scope="col">Date</th>
                    <th scope="col"></th>
                    <th scope="col">Enter</th>
                    <th scope="col">Exit</th>
                    <th scope="col">P/L</th>
                </tr>
            </thead>
            <tbody>
                {Object.keys(dayTrades)
                    .sort((a, b) => moment(a).valueOf() - moment(b).valueOf()) //sort descending
                    .map((tradeDate, i) => {
                        console.log(i % 2);
                        const trades = dayTrades[tradeDate];
                        const isDay = moment(backtestResultsDate).valueOf() == moment(tradeDate).valueOf();
                        console.log(isDay);
                        return (
                            <React.Fragment key={tradeDate}>
                                <TradeDate color={i} tradeDate={tradeDate} />
                                {trades.map((t, i) => {
                                    return (
                                        <React.Fragment key={t.datetimeOpen + i}>
                                            <Trade isDay={isDay} count={++count} trade={t} getBacktestDay={getBacktestDay} />
                                        </React.Fragment>
                                    );
                                })}
                            </React.Fragment>
                        );
                    })}
            </tbody>
        </table>
    );
}

function TradeDate(props) {
    return <DateLabel color={props.color}>{props.tradeDate}</DateLabel>;
}

function Trade(props) {
    const {
        buySell,
        enter,
        timeOpen,
        datetimeOpen,
        size,
        stop,
        target,
        halfTarget,
        quarterTarget,
        order,
        maxProfit,
        maxLoss,
        valueAreaHigh,
        valueAreaLow,
        I,
        exit,
        profit,
        timeClose,
    } = props.trade;

    const openTime = moment(datetimeOpen);
    const closeTime = moment(timeClose);
    const duration = moment.duration(closeTime.diff(openTime));
    var humanReadableDuration = moment.duration(duration).humanize();

    return (
        <TableRow
            isDay={props.isDay}
            onClick={() => {
                props.getBacktestDay(openTime.format("MM-DD-YYYY"));
            }}
        >
            <th className="col">{props.count}</th>
            {/* //buySell */}

            <td>
                <div className="row">
                    <div className="col">
                        <BuySell buySell={buySell}>{buySell}</BuySell>
                    </div>
                </div>
            </td>
            <td>
                <div className="col">{openTime.format("HH:mm a")}</div>
                <div className="col">@{enter}</div>
            </td>
            <td>
                <div className="col">{closeTime.format("HH:mm a")}</div>
                <div className="col">@{exit}</div>
            </td>

            <td>
                <div className="col">{humanReadableDuration}</div>
                <div className="col">
                    <Profit profit={profit}>
                        {profit > 0 ? "+" : ""}
                        {profit}
                    </Profit>
                </div>
            </td>
        </TableRow>
    );
}

const TableRow = styled.tr`
    cursor: pointer;
    &:hover {
        background: #63560d;
    }
    background: ${({ isDay }) => isDay && "#63560d"};
`;
const BuySell = styled.div`
    color: ${({ buySell }) => (buySell === "Buy" ? "green" : "red")};
`;

const Profit = styled.div`
    color: ${({ profit }) => (profit > 0 ? "green" : "red")};
`;
