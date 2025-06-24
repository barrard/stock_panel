import React from "react";
import OptionContractChart from "./charts/pixiChart/components/SpyOptions/OptionContractChart";

export default function OptionContractChartPage({ Socket }) {
    return <OptionContractChart Socket={Socket} />;
}
