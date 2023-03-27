import React from "react";
import { IconButton } from "../../../StratBuilder/components";
import { GiAirZigzag, GiHistogram, GiAmplitude } from "react-icons/gi";
import { IoIosReorder } from "react-icons/io";
import Input from "./Input";
import Select from "./Select";

export default function IndicatorsBtns(props) {
    const {
        setDrawZigZag,
        setDrawMarketProfile,
        setDrawOrderBook,
        setBarTypeInput,
        setBarTypePeriodInput,
        toggleZigZag,
        toggleMarketProfile,
        toggleOrderbook,
        barTypeInput,
        barTypePeriodInput,
    } = props;
    return (
        <div className="row g-0">
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
                    rIcon={<IoIosReorder />}
                />
            </div>

            <div className="col-auto">
                <Select
                    label="Bar Type"
                    value={barTypeInput}
                    setValue={setBarTypeInput}
                    options={[
                        { value: 1, name: "Seconds" },
                        { value: 2, name: "Minute" },
                        { value: 3, name: "Daily" },
                        { value: 4, name: "Weekly" },
                    ]}
                />
            </div>
            <div className="col-2">
                <Input
                    // disabled={symbolInputDisabled}
                    type="number"
                    setValue={setBarTypePeriodInput}
                    value={barTypePeriodInput}
                    label="BarTypePeriod"
                />
            </div>
        </div>
    );
}
