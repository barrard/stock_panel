import React, { useEffect, useRef, useState } from "react";
import Chart from "./classes/SeismographClass";
// import API from "../../API";

export default function SeismographChart(props = {}) {
    const {
        // chartData = [],
        margin = {
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
        },
        dimension = {
            height: 100,
            width: 200,
        },
        Socket,
        data = [],
        orderTrackerCount,
    } = props;
    const PixiChartRef = useRef();
    const PixiRef = useRef();

    // const [data, setData] = useState([0]);

    const [chart, setChart] = useState(false);

    useEffect(() => {
        if (!PixiRef.current) return;
        PixiRef.current.setValue(props.orderTrackerCount.delta);
    }, [props.orderTrackerCount]);

    useEffect(() => {
        if (PixiRef.current) return;
        const options = {
            height: dimension.height,
            width: dimension.width,
            PixiChartRef,
            margin,
        }; // Configuration options

        const chart = new Chart(data, options);
        PixiRef.current = chart;
        PixiChartRef.current?.addEventListener(
            "mousewheel",
            (e) => {
                e.preventDefault();
            },
            { passive: false }
        );

        return () => {
            PixiRef.current.destroy();
            PixiRef.current = null;
        };
    }, [PixiChartRef.current, PixiRef]);

    return (
        <div className="container border">
            <div ref={PixiChartRef}></div>
        </div>
    );
}
