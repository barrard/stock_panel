import React from "react";
import GenericPixiChart from "./GenericPixiChart";

export default function SpyChart(props) {
    // You can destructure or pass props as needed
    // Example: const { candleData, ...rest } = props;
    const symbolInput = "SPY"; // Default to SPY if not provided
    // props.symbolInput = symbolInput;
    return <GenericPixiChart {...props} symbolInput={symbolInput} />;
}
