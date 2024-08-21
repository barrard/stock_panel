import React, { useEffect, useState, useRef } from "react";
import API from "../API";

import EconEventChart from "./components/EconEventChart";
import Select from "../charts/pixiChart/components/Select";

function getSentimentValue(sentiment) {
    switch (sentiment?.toLowerCase()) {
        case "low volatility expected":
            return 1;
        case "moderate volatility expected":
            return 2;
        case "high volatility expected":
            return 3;
        default:
            return 0; // For any unexpected sentiment values
    }
}

export default function EconData() {
    const [eventTypes, setEventTypes] = useState([]);
    const [selectedEventType, setSelectedEventType] = useState({ value: null, name: "Select" });
    const [eventInstances, setEventInstances] = useState([]);

    async function getData() {
        const eventTypes = await API.getEconEventTypes();

        // Sort the eventTypes array
        eventTypes.sort((a, b) => {
            const sentimentA = getSentimentValue(a.sentiment);
            const sentimentB = getSentimentValue(b.sentiment);
            return sentimentB - sentimentA;
        });
        console.log(eventTypes);

        setEventTypes(eventTypes);
    }

    async function getEventInstances(eventType) {
        const instances = await API.getEconEventInstances(selectedEventType);
        // console.log(instances);
        setEventInstances(instances);
    }

    useEffect(() => {
        getData();
    }, []);

    useEffect(() => {
        if (selectedEventType.value) {
            getEventInstances(selectedEventType);
        }
    }, [selectedEventType]);

    return (
        <div className="row">
            {selectedEventType.value && <h2>{selectedEventType.name}</h2>}
            <div className="col-auto">
                <Select
                    label="Event Type"
                    value={selectedEventType}
                    setValue={setSelectedEventType}
                    options={eventTypes.map((et) => ({ value: et._id, name: et.event, time: et.time, sentiment: et.sentiment, eventLink: et.eventLink }))}
                />
            </div>
            {eventInstances.length > 0 && (
                <div className="col-10">
                    <EconEventChart eventInstances={eventInstances} />
                </div>
            )}
        </div>
    );
}
