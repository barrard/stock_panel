import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { priceFormat } from "../../chartHelpers/utils.js";
import { TICKS } from "../../../../indicators/indicatorHelpers/TICKS";
import { tickValues } from "../../../../indicators/indicatorHelpers/utils";
import { getFuturesDisplayFamily, normalizeFuturesBaseSymbol } from "./futuresSymbolFamily";

export default function AccountInfoTable(props = {}) {
    const { Socket, lastTradesRef } = props;

    const [accountPnLPositionUpdate, setAccountPnLPositionUpdate] = useState({});
    const [instrumentPnLPositionUpdate, setInstrumentPnLPositionUpdate] = useState({});
    const [lastTradePrices, setLastTradePrices] = useState(() => ({ ...(lastTradesRef?.current || {}) }));

    const tickSizeLookup = useMemo(() => TICKS(), []);
    const tickValueLookup = useMemo(() => tickValues(), []);

    const toFiniteNumber = (value) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    };

    useEffect(() => {
        const handleAccountPnL = (message) => {
            setAccountPnLPositionUpdate(message);
        };

        const handlePositionPnL = (message) => {
            setInstrumentPnLPositionUpdate(message);
        };

        const handleLastTrade = (message) => {
            if (!message?.symbol) return;

            setLastTradePrices((prevState) => ({
                ...prevState,
                [message.symbol]: {
                    ...(prevState[message.symbol] || lastTradesRef?.current?.[message.symbol] || {}),
                    ...message,
                },
            }));
        };

        Socket.on("accountPnL", handleAccountPnL);
        Socket.on("positionPnL", handlePositionPnL);
        Socket.on("lastTrade", handleLastTrade);

        return () => {
            Socket.off("accountPnL", handleAccountPnL);
            Socket.off("positionPnL", handlePositionPnL);
            Socket.off("lastTrade", handleLastTrade);
        };
    }, [Socket, lastTradesRef]);

    const deriveAccountOpenPositionPnl = () => {
        const reportedOpenPositionPnl = toFiniteNumber(accountPnLPositionUpdate?.openPositionPnl);
        const instrumentPositions = Object.values(instrumentPnLPositionUpdate || {});
        const hasOpenInstrumentPosition = instrumentPositions.some((position) => toFiniteNumber(position?.netQuantity));

        if (reportedOpenPositionPnl !== null && (reportedOpenPositionPnl !== 0 || !hasOpenInstrumentPosition)) {
            return reportedOpenPositionPnl;
        }

        let derivedPnl = 0;
        let foundAnyPositionValue = false;

        instrumentPositions.forEach((position) => {
            const netQuantity = toFiniteNumber(position?.netQuantity);
            if (!netQuantity) return;

            const reportedInstrumentOpenPnl = toFiniteNumber(position?.openPositionPnl);
            if (reportedInstrumentOpenPnl !== null && reportedInstrumentOpenPnl !== 0) {
                derivedPnl += reportedInstrumentOpenPnl;
                foundAnyPositionValue = true;
                return;
            }

            const avgOpenFillPrice = toFiniteNumber(position?.avgOpenFillPrice);
            const baseSymbol = normalizeFuturesBaseSymbol(position?.symbol);
            const displaySymbol = getFuturesDisplayFamily(position?.symbol);
            const lastPrice = toFiniteNumber(lastTradePrices?.[displaySymbol]?.tradePrice ?? lastTradesRef?.current?.[displaySymbol]?.tradePrice);
            const tickSize = tickSizeLookup[baseSymbol];
            const tickValue = tickValueLookup[baseSymbol];

            if (!Number.isFinite(avgOpenFillPrice) || !Number.isFinite(lastPrice) || !Number.isFinite(tickSize) || !Number.isFinite(tickValue) || !tickSize) {
                return;
            }

            derivedPnl += ((lastPrice - avgOpenFillPrice) / tickSize) * tickValue * netQuantity;
            foundAnyPositionValue = true;
        });

        return foundAnyPositionValue ? derivedPnl : reportedOpenPositionPnl;
    };

    const derivedAccountOpenPositionPnl = deriveAccountOpenPositionPnl();

    return (
        <StyledTable>
            <thead>
                <StyledTr>
                    <StyledTh>Account ID</StyledTh>
                    <StyledTh>FCM ID</StyledTh>
                    <StyledTh>IB ID</StyledTh>
                    <StyledTh>Buy Qty</StyledTh>
                    <StyledTh>Sell Qty</StyledTh>
                    <StyledTh>MTM Account</StyledTh>
                    <StyledTh>Open Position PnL</StyledTh>
                    <StyledTh>Closed Position PnL</StyledTh>
                    <StyledTh>Net Quantity</StyledTh>
                    <StyledTh>Account Balance</StyledTh>
                    <StyledTh>Cash on Hand</StyledTh>
                    <StyledTh>Margin Balance</StyledTh>
                    <StyledTh>Day PnL</StyledTh>
                </StyledTr>
            </thead>
            <tbody>
                <StyledTr>
                    <StyledTd>{accountPnLPositionUpdate.accountId}</StyledTd>
                    <StyledTd>{accountPnLPositionUpdate.fcmId}</StyledTd>
                    <StyledTd>{accountPnLPositionUpdate.ibId}</StyledTd>
                    <StyledTd>{accountPnLPositionUpdate.buyQty}</StyledTd>
                    <StyledTd>{accountPnLPositionUpdate.sellQty}</StyledTd>
                    <StyledTd>{accountPnLPositionUpdate.mtmAccount}</StyledTd>
                    <StyledTd>{priceFormat(Number.isFinite(derivedAccountOpenPositionPnl) ? derivedAccountOpenPositionPnl : accountPnLPositionUpdate.openPositionPnl)}</StyledTd>
                    <StyledTd>{priceFormat(accountPnLPositionUpdate.closedPositionPnl)}</StyledTd>
                    <StyledTd>{priceFormat(accountPnLPositionUpdate.netQuantity)}</StyledTd>
                    <StyledTd>{priceFormat(accountPnLPositionUpdate.accountBalance)}</StyledTd>
                    <StyledTd>{priceFormat(accountPnLPositionUpdate.cashOnHand)}</StyledTd>
                    <StyledTd>{priceFormat(accountPnLPositionUpdate.marginBalance)}</StyledTd>
                    <StyledTd>{priceFormat(accountPnLPositionUpdate.dayPnl)}</StyledTd>
                </StyledTr>
            </tbody>
        </StyledTable>
    );
}

const StyledTable = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-family: Arial, sans-serif;
    font-size: 12px;
`;

const StyledTh = styled.th`
    background-color: #111;
    border: 1px solid #ddd;
    padding: 6px;
    font-weight: bold;
    text-align: left;
`;

const StyledTd = styled.td`
    border: 1px solid #ddd;
    padding: 6px;
    text-align: center;
    &:hover {
        box-shadow: inset 0 0 0 5px #63560d;
    }
`;

const StyledTr = styled.tr``;
