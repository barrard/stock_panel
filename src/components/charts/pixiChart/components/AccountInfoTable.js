import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { priceFormat } from "../../chartHelpers/utils.js";

export default function AccountInfoTable(props = {}) {
    const { Socket } = props;

    const [accountPnLPositionUpdate, setAccountPnLPositionUpdate] = useState({});

    useEffect(() => {
        Socket.on("accountPnL", (message) => {
            setAccountPnLPositionUpdate(message);
        });

        return () => {
            Socket.off("accountPnL");
        };
    }, [Socket]);
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
                    <StyledTd>{priceFormat(accountPnLPositionUpdate.openPositionPnl)}</StyledTd>
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
