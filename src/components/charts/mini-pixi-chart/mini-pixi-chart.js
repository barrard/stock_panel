import React, { useEffect, useRef, useState } from "react";
import Chart from "./classes/mini-pixi-chart-class";
// import API from "../../API";

export default function MiniPixiChart(props = {}) {
    console.log(props);
    const {
        // chartData = [],
        margin = {
            top: 100,
            left: 100,
            right: 100,
            bottom: 100,
        },
        dimension = {
            height: 400,
            width: 800,
        },
        Socket,
    } = props;
    const PixiChartRef = useRef();
    const PixiRef = useRef();

    const [data, setData] = useState([0]);

    const [chart, setChart] = useState(false);

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
    }, [PixiChartRef]);

    useEffect(() => {
        Socket.on("liquidity", (data) => {
            console.log({ data });
            const {
                bidSizeToAskSizeRatio,

                bidSizeToAskSizeRatioMA,
            } = data;
            setData((arr) => [
                ...arr,
                Math.floor(bidSizeToAskSizeRatio * 10000) / 10000,
            ]);
            // setBidSizeToAskSizeRatioMA((arr) => [
            //     ...arr,
            //     bidSizeToAskSizeRatioMA,
            // ]);

            // setBidAskRatios(data);
            // pixiData.setLiquidityData(data);
        });
        return () => {
            console.log("socket OFFFFF");
            Socket.off("liquidity");
        };
    }, [Socket]);

    useEffect(() => {
        console.log("data updated.");
        if (data.length && PixiRef.current) {
            debugger;
            PixiRef.current.setData(data);
            PixiRef.current.setupChart();
        } else {
            console.log("no can");
            console.log("data", data);
            console.log("PixiRef", PixiRef);
        }
    }, [data, PixiRef.current]);

    return (
        <div className="container border">
            <div ref={PixiChartRef}></div>
        </div>
    );
}
