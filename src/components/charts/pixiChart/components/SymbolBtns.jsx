import React, { useState } from "react";
import { IconButton } from "../../../StratBuilder/components";
import { GiAirZigzag, GiHistogram, GiAmplitude } from "react-icons/gi";
import { IoIosReorder } from "react-icons/io";
import { CgReadme } from "react-icons/cg";
import { AiOutlineTransaction, AiFillCloseCircle } from "react-icons/ai";
import styled from "styled-components";
import Input from "./Input";

import Select from "./Select";
import { TICKS } from "../../../../indicators/indicatorHelpers/TICKS";
const ticks = TICKS();
export default function SymbolBtns(props) {
    console.log("SymbolBtns");
    const { symbolOptions, symbol, setSymbol } = props;

    let isEs, isNQ, isYm, isCL, isGC, isRTY, isZN;

    if (symbol.value === "ES") {
        isEs = true;
    } else if (symbol.value === "NQ") {
        isNQ = true;
    } else if (symbol.value === "YM") {
        isYm = true;
    } else if (symbol.value === "CL") {
        isCL = true;
    } else if (symbol.value === "GC") {
        isGC = true;
    } else if (symbol.value === "RTY") {
        isRTY = true;
    } else if (symbol.value === "ZN") {
        isZN = true;
    }

    const findSymbolData = (symbol) => {
        return symbolOptions.find((s) => s.value === symbol);
    };
    const SymbolBtn = ({ isSymbol, symbol }) => (
        <div className="col-auto">
            <IconButton
                borderColor={isSymbol ? "green" : false}
                title={symbol}
                onClick={() => {
                    const symbolData = findSymbolData(symbol);

                    setSymbol({ ...symbolData, tickSize: ticks[symbol] });
                }}
                text={symbol}
            />
        </div>
    );
    return (
        <div className="row g-0 relative">
            <SymbolBtn isSymbol={isEs} symbol={"ES"} />
            <SymbolBtn isSymbol={isZN} symbol={"ZN"} />
            <SymbolBtn isSymbol={isNQ} symbol={"NQ"} />
            <SymbolBtn isSymbol={isYm} symbol={"YM"} />
            <SymbolBtn isSymbol={isCL} symbol={"CL"} />
            <SymbolBtn isSymbol={isGC} symbol={"GC"} />
            <SymbolBtn isSymbol={isRTY} symbol={"RTY"} />
        </div>
    );
}

const OptsWindowContainer = styled.div`
    width: 200px;
    height: 200px;
    border: 2px solid #666;
    background: #333;
    position: absolute;
    z-index: 10000;
`;

const Position = styled.div`
    top: ${(props) => props.top};
    border: 2px solid #666;
    background: #333;
    position: absolute;
    z-index: 10000;
`;
