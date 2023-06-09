import React, { useState } from "react";
import { IconButton } from "../../../StratBuilder/components";
import { GiAirZigzag, GiHistogram, GiAmplitude } from "react-icons/gi";
import { IoIosReorder } from "react-icons/io";
import { CgReadme } from "react-icons/cg";
import { AiOutlineTransaction, AiFillCloseCircle } from "react-icons/ai";
import styled from "styled-components";
import Input from "./Input";

import Select from "./Select";

export default function IndicatorsBtns(props) {
    const {
        setDrawZigZag,
        setDrawMarketProfile,
        setDrawOrderBook,
        toggleZigZag,
        toggleMarketProfile,
        toggleOrderbook,
        togglePivotLines,
        setDrawPivotLines,
        setDrawOrders,
        toggleOrders,
    } = props;

    const [optsWindow, setOptsWindow] = useState("");

    function showOptions(indicator) {
        switch (indicator) {
            case "ZigZag":
                return (
                    <>
                        <Input />

                        <Input />
                    </>
                );

            default:
                break;
        }
    }

    const OptionsWindow = () => {
        return (
            <OptsWindowContainer>
                <Position>
                    <IconButton
                        borderColor={toggleOrders ? "green" : false}
                        title="Close"
                        onClick={() => setOptsWindow("")}
                        rIcon={<AiFillCloseCircle />}
                    />
                </Position>
                {showOptions(optsWindow)}
                <button className="btn">OK</button>
            </OptsWindowContainer>
        );
    };
    return (
        <div className="row g-0 relative">
            {optsWindow && <OptionsWindow />}
            <div className="col-auto">
                <IconButton
                    borderColor={toggleOrders ? "green" : false}
                    title="Orders"
                    onClick={() => setDrawOrders(!toggleOrders)}
                    rIcon={<AiOutlineTransaction />}
                />
            </div>

            <div className="col-auto">
                <IconButton
                    borderColor={toggleZigZag ? "green" : false}
                    title="ZigZag"
                    onContextMenu={(e) => {
                        e.preventDefault();
                        console.log("Right click");
                        setOptsWindow("ZigZag");

                        //
                    }}
                    onClick={(e) => {
                        setDrawZigZag(!toggleZigZag);
                    }}
                    rIcon={<GiAirZigzag />}
                />
            </div>

            <div className="col-auto">
                <IconButton
                    borderColor={toggleMarketProfile ? "green" : false}
                    title="Market Profile"
                    onClick={() => setDrawMarketProfile(!toggleMarketProfile)}
                    rIcon={<GiAmplitude />}
                />
            </div>
            <div className="col-auto">
                <IconButton
                    borderColor={toggleOrderbook ? "green" : false}
                    title="Order Book"
                    onClick={() => setDrawOrderBook(!toggleOrderbook)}
                    rIcon={<CgReadme />}
                />
            </div>
            <div className="col-auto">
                <IconButton
                    borderColor={togglePivotLines ? "green" : false}
                    title="Pivot Lines"
                    onClick={() => setDrawPivotLines(!togglePivotLines)}
                    rIcon={<IoIosReorder />}
                />
            </div>
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
