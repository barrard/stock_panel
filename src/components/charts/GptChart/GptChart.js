import React, { useEffect, useRef, useState } from "react";
import Chart from "./classes/GptChartClass";
import API from "../../API";
const events = ["zoomed", "drag-end", "zoomed-end", "pinch-end"];

export default function GptChart() {
    const PixiChartRef = useRef();
    const PixiRef = useRef();

    const [data, setData] = useState([]);
    const [eventsData, setEventsData] = useState({});

    const [chart, setChart] = useState(false);
    async function getAndSetData() {
        const symbol = "ES";
        const from = 1671185580000;
        const to = 1671186720000;
        const data = await API.getTicksFrom({ symbol, from, to });
        const ticks = data.map((d) => d.ticks).flat();
        console.log(ticks);
        setData(ticks);
    }
    useEffect(() => {
        if (PixiRef.current) return;
        const options = {
            events,
            setEventsData,
            height: 400,
            width: 800,
            PixiChartRef,
            margin: {
                top: 100,
                left: 100,
                right: 100,
                bottom: 100,
            },
        }; // Configuration options

        const chart = new Chart(data, options);
        PixiRef.current = chart;

        getAndSetData();

        return () => {
            PixiRef.current.destroy();
            PixiRef.current = null;
        };
    }, []);

    useEffect(() => {
        console.log("data updated.");
        if (data.length && PixiRef.current) {
            PixiRef.current.setData(data);
            PixiRef.current.setupChart();
        } else {
            console.log("no can");
            console.log("data", data);
            console.log("PixiRef", PixiRef);
        }
    }, [data, PixiRef.current]);

    const viewportEvents = events.map((name) => {
        return DisplayEvent({ name, eventData: eventsData[name] });
    });

    return (
        <div class="container">
            <div ref={PixiChartRef}></div>
            <div>
                <h3>stats</h3>
                <div className="row">{viewportEvents}</div>
                {/* {DisplayEvent(events)} */}
                {/* {events.name} */}
            </div>
        </div>
    );
}

function DisplayEvent(data) {
    const [name, setName] = useState(data.name);

    console.log(name);
    console.log(data.eventData);
    return (
        <div className="col">
            {name}
            <div
                style={{
                    opacity: data.eventData?.x ? 1 : 0.1,
                }}
            >
                <h4>Event</h4>
                <p>
                    X: {Math.floor(data.eventData?.x)} Y:{" "}
                    {Math.floor(data.eventData?.y)}
                </p>
                <p>
                    Scale: x -{" "}
                    {Math.floor(data.eventData?.scale?._x * 100) / 100} y -{" "}
                    {Math.floor(data.eventData?.scale?._y * 100) / 100}
                </p>
            </div>

            <div
                style={{
                    opacity: data.eventData?.screen ? 1 : 0.1,
                }}
            >
                <h4>Screen</h4>
                <p>
                    X: {Math.floor(data.eventData?.screen?.x)} Y:{" "}
                    {Math.floor(data.eventData?.screen?.y)}
                </p>
                <p>
                    Scale: x -{" "}
                    {Math.floor(data.eventData?.screen?.scale?._x * 100) / 100}{" "}
                    y -{" "}
                    {Math.floor(data.eventData?.screen?.scale?._y * 100) / 100}
                </p>
            </div>
            <div
                style={{
                    opacity: data.eventData?.world ? 1 : 0.1,
                }}
            >
                <h4>World</h4>
                <p>
                    X: {Math.floor(data.eventData?.world?.x)} Y:{" "}
                    {Math.floor(data.eventData?.world?.y)}
                </p>
                <p>
                    Scale: x -{" "}
                    {Math.floor(data.eventData?.world?.scale?._x * 100) / 100} y
                    - {Math.floor(data.eventData?.world?.scale?._y * 100) / 100}
                </p>
            </div>

            <div
                style={{
                    opacity: data.eventData?.viewport ? 1 : 0.1,
                }}
            >
                <h4>Viewport</h4>
                <p>
                    X: {Math.floor(data.eventData?.viewport?.x)} Y:{" "}
                    {Math.floor(data.eventData?.viewport?.y)}
                </p>
                <p>
                    Scale: x -{" "}
                    {Math.floor(data.eventData?.viewport?.scale?._x * 100) /
                        100}{" "}
                    y -{" "}
                    {Math.floor(data.eventData?.viewport?.scale?._y * 100) /
                        100}
                </p>
            </div>
        </div>
    );
}
