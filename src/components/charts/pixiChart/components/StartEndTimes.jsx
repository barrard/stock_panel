import React from "react";

export default function StartEndTimes(props) {
    const {
        backgroundDataFetch,
        setBackgroundDataFetch,
        setStartTime,
        setEndTime,
        startTime,
        endTime,
    } = props;
    return (
        <div>
            <div className="col">
                <label htmlFor="Background">Background</label>
                <br />
                <input
                    value={backgroundDataFetch}
                    onChange={() => setBackgroundDataFetch((bdf) => !bdf)}
                    type="checkbox"
                    name="Background"
                    id=""
                />
            </div>
            <div className="col">
                <input
                    onChange={(e) => setStartTime(e.target.value)}
                    value={startTime}
                    type="datetime-local"
                />
                <input
                    onChange={(e) => setEndTime(e.target.value)}
                    value={endTime}
                    type="datetime-local"
                />
            </div>
        </div>
    );
}
