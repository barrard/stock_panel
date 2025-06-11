import React from "react";
import GenericPixiChart from "./GenericPixiChart";

export default function SpyChart(props) {
    // You can destructure or pass props as needed
    // Example: const { candleData, ...rest } = props;
    return (
        <GenericPixiChart
            {...props}
        />
    );
}
