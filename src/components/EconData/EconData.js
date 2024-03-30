import React, { useEffect, useState } from "react";
import API from "../API";

import Select from "../charts/pixiChart/components/Select";

export default function EconData() {
    const [eventTypes, setEventTypes] = useState([]);
    const [selectedEventType, setSelectedEventType] = useState({ value: null, name: "Select" });
    async function getData() {
        const eventTypes = await API.getEconEventTypes();
        console.log(eventTypes);
        setEventTypes(eventTypes);
    }

    async function getEventInstances(eventType) {
        const eventInstances = await API.getEconEventInstances(selectedEventType);
        console.log(eventInstances);
    }

    useEffect(() => {
        getData();
    }, []);

    useEffect(() => {
        getEventInstances(selectedEventType);
    }, [selectedEventType]);

    return (
        <div>
            <Select
                label="Event Type"
                value={selectedEventType}
                setValue={setSelectedEventType}
                options={eventTypes.map((et) => ({ value: et._id, name: et.event }))}
            />{" "}
        </div>
    );
}
