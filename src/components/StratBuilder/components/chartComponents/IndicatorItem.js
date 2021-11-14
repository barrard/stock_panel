import React, { useState, useContext } from "react";
import {
    faEye,
    faPlusSquare,
    faTrashAlt,
    faPencilAlt,
    faEyeSlash,
    faWindowClose,
    faTimes,
} from "@fortawesome/free-solid-svg-icons";

import { IconButton, LoadingButton } from "../components";
import StratContext from "../../StratContext";
import ChartContext from "../ChartContext";
import { removeIndicatorName } from "../chartAppends";
import OptInputs from "./OptInputs";
import { Small } from "./styled";

export default function IndicatorItem({ ind }) {
    const [edit, setEdit] = useState(false);
    const [show, setShow] = useState(false);
    let {
        selectedStrat,
        setSelectedStrat,
        setStrategies,
        strategies,
        API,
        deleteIndicatorResults,
    } = useContext(StratContext);
    let { chartSvg, yScales, setYScales, fetchAndUpdateIndicatorResults } =
        useContext(ChartContext);
    let { _id, fullName, priceData } = ind;
    return (
        <div key={_id}>
            {fullName}{" "}
            <IconButton
                title={show ? "Hide" : "Show"}
                onClick={() => setShow(!show)}
                icon={show ? faEye : faEyeSlash}
            />
            <IconButton
                title="Delete"
                onClick={async () => {
                    await API.deleteIndicator(ind, selectedStrat);
                    let { symbol, timeframe } = selectedStrat.priceData.filter(
                        ({ _id }) => _id === priceData
                    )[0];
                    //pull the data from strat
                    selectedStrat.indicators = selectedStrat.indicators.filter(
                        ({ _id: id }) => id !== _id
                    );
                    delete yScales[_id];
                    setYScales({ ...yScales });

                    let stratIndex = strategies.findIndex(
                        (strat) => strat._id === selectedStrat._id
                    );
                    strategies[stratIndex] = selectedStrat;
                    setStrategies([...strategies]);
                    setSelectedStrat({ ...selectedStrat });

                    deleteIndicatorResults({
                        symbol,
                        timeframe,
                        indicator: ind,
                    });
                    chartSvg.selectAll(`.indicator-${_id}`).remove();
                    removeIndicatorName(chartSvg, fullName, _id);
                }}
                icon={faTrashAlt}
            />
            <IconButton
                title="Edit"
                onClick={() => setEdit(!edit)}
                icon={faPencilAlt}
            />
            {ind.optInputs && (
                <OptInputs
                    fetchAndUpdateIndicatorResults={
                        fetchAndUpdateIndicatorResults
                    }
                    setEdit={setEdit}
                    edit={edit}
                    ind={ind}
                />
            )}
            {Object.keys(ind.selectedInputs).length &&
                Object.keys(ind.selectedInputs).map((i) => (
                    <Small key={`${ind._id}-${i}`} title={i}>
                        {ind.selectedInputs[i].slice(0, 1).toUpperCase()}
                    </Small>
                ))}
        </div>
    );
}
