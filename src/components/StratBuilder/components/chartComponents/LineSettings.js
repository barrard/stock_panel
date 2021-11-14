import React, { useState, useContext, useEffect } from "react";
import { LineSettingsModalContainer } from "./styled";
import ChartContext from "../ChartContext";
import API from "../../../API";
import { IndicatorItem } from ".";
import { LineColors } from "../IndicatorComponents";

export default function LineSettings() {
    const [color, setColor] = useState({});
    let { setLineSettings, lineSettings, chartIndicators, draw } =
        useContext(ChartContext);
    console.log(color);
    console.log(lineSettings);
    let { key, lineName, indicatorData } = lineSettings;
    //now i need to find the ind in chartIndicators
    console.log(chartIndicators);

    let chartIndicator = chartIndicators.filter(({ _id }) => _id === key)[0];
    console.log({ chartIndicator });

    useEffect(() => {
        setColor(indicatorData.color);
        console.log("set color");
    }, [chartIndicator.color]);

    useEffect(() => {
        let isNew = false;
        for (let line in color) {
            if (indicatorData.color[line] !== color[line]) isNew = true;
        }
        if (isNew) {
            indicatorData.color = color;
            console.log("set color");
            API.updateLineColor(key, color);

            draw();
        }
    }, [color]);

    return (
        <LineSettingsModalContainer>
            {/* <CreateModal /> */}
            <button onClick={() => setLineSettings({})}>{"X"}</button>
            <p>{lineSettings.lineName}</p>
            <p>{lineSettings.indicatorData.fullName}</p>
            <IndicatorItem key={key} ind={chartIndicator} />
            <LineColors
                indicator={chartIndicator}
                color={color}
                setColor={setColor}
            />
            {/* some line detailrs */}
        </LineSettingsModalContainer>
    );
}
