import React, { useState } from "react";
import { IconButton } from "../../../StratBuilder/components";
import { GiAirZigzag, GiHistogram, GiAmplitude } from "react-icons/gi";
import { IoIosReorder } from "react-icons/io";
import { CgReadme } from "react-icons/cg";
import { AiOutlineTransaction, AiFillCloseCircle } from "react-icons/ai";
import styled from "styled-components";
import Input from "./Input";
import StartEndTimes from "./StartEndTimes";

import Select from "./Select";

export default function TimeFrameBtns(props) {
    // console.log("TimeFrameBtns");
    const {
        barType,
        barTypePeriod,
        setBarType,
        setBarTypePeriod,
        backgroundDataFetch,
        setBackgroundDataFetch,
        setStartTime,
        setEndTime,
        startTime,
        endTime,
    } = props;

    const [optsWindow, setOptsWindow] = useState("");

    const OptionsWindow = () => {
        return (
            <OptsWindowContainer>
                <Position>
                    <IconButton title="Close" onClick={() => setOptsWindow("")} rIcon={<AiFillCloseCircle />} />
                </Position>
                <div className="col ">
                    <StartEndTimes
                        backgroundDataFetch={backgroundDataFetch}
                        setBackgroundDataFetch={setBackgroundDataFetch}
                        setStartTime={setStartTime}
                        setEndTime={setEndTime}
                        startTime={startTime}
                        endTime={endTime}
                    />
                </div>

                <Position bottom="0">
                    <button onClick={() => setOptsWindow("")} className="btn-sm btn btn-secondary">
                        OK
                    </button>
                </Position>
            </OptsWindowContainer>
        );
    };
    let is_1m, is_5m, is_30m, is_60m, is_4h, is_1d, is_1w;

    if (barType.name === "Seconds" && barTypePeriod === 60) {
        is_1m = true;
    } else if (barType.name === "Minute" && barTypePeriod === 5) {
        is_5m = true;
    } else if (barType.name === "Minute" && barTypePeriod === 30) {
        is_30m = true;
    } else if (barType.name === "Minute" && barTypePeriod === 60) {
        is_60m = true;
    } else if (barType.name === "Minute" && barTypePeriod === 60 * 4) {
        is_4h = true;
    } else if (barType.name === "Minute" && barTypePeriod === 1440) {
        is_1d = true;
    } else if (barType.name === "Week" && barTypePeriod === 1) {
        is_1w = true;
    }

    const TimeBtn = ({ isTime, barType, barPeriod, name }) => (
        <div className="col-auto">
            <IconButton
                borderColor={isTime ? "green" : false}
                title={name}
                onClick={() => {
                    setBarType(barType);
                    setBarTypePeriod(barPeriod);
                }}
                onContextMenu={(e) => {
                    e.preventDefault();
                    setOptsWindow(true);

                    //
                }}
                text={name}
            />
        </div>
    );
    return (
        <div className="row g-0 relative">
            {optsWindow && <OptionsWindow />}
            <TimeBtn isTime={is_1m} name="1m" barType={{ name: "Seconds", value: 1 }} barPeriod={60} />
            <TimeBtn isTime={is_5m} name="5m" barType={{ name: "Minute", value: 2 }} barPeriod={5} />
            <TimeBtn isTime={is_30m} name="30m" barType={{ name: "Minute", value: 2 }} barPeriod={30} />
            <TimeBtn isTime={is_60m} name="60m" barType={{ name: "Minute", value: 2 }} barPeriod={60} />
            <TimeBtn isTime={is_4h} name="4h" barType={{ name: "Minute", value: 2 }} barPeriod={60 * 4} />
            <TimeBtn isTime={is_1d} name="1d" barType={{ name: "Minute", value: 2 }} barPeriod={1440} />
            <TimeBtn isTime={is_1w} name="1w" barType={{ name: "Week", value: 4 }} barPeriod={1} />
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
    bottom: ${(props) => props.bottom};
    right: ${(props) => props.right};
    border: 2px solid #666;
    background: #333;
    position: absolute;
    z-index: 10000;
`;
