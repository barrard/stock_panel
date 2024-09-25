import React from "react";

export default function StartEndTimes(props) {
    const { backgroundDataFetch, setBackgroundDataFetch, setStartTime, setEndTime, startTime, endTime } = props;
    return (
        <div className="pt-3">
            <div className="col justify-content-end d-flex">
                <label htmlFor="Background">Background</label>
                <br />
                <input value={backgroundDataFetch} onChange={() => setBackgroundDataFetch((bdf) => !bdf)} type="checkbox" name="Background" id="" />
            </div>
            <div className="col">
                <input onChange={(e) => setStartTime(e.target.value)} value={startTime} type="datetime-local" />
                <input onChange={(e) => setEndTime(e.target.value)} value={endTime} type="datetime-local" />
            </div>
        </div>
    );
}
