import React from "react";
import { IconButton } from "../../../StratBuilder/components";
import { GiAirZigzag, GiHistogram, GiAmplitude } from "react-icons/gi";
import { IoIosReorder } from "react-icons/io";
import { CgReadme } from "react-icons/cg";
import { AiOutlineTransaction } from "react-icons/ai";

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
    return (
        <div className="row g-0">
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
                    onClick={() => setDrawZigZag(!toggleZigZag)}
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
                    title="Order Book"
                    onClick={() => setDrawPivotLines(!togglePivotLines)}
                    rIcon={<IoIosReorder />}
                />
            </div>
        </div>
    );
}
