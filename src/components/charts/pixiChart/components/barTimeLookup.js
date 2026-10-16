// Bar lookup by time for chart markers (DrawDepthSignals, DrawDepthCues).
// Time bars on the Futures chart are labelled by their close (barLabel="end"), so the chart's barStartOf gives their
// open. Tick bars have no fixed size: joined ones are labelled by their last sub-bar and firstDatetime is when they opened.
export const barStartTime = (bar, chart) => {
    const stamped = chart?.barStartOf?.(bar);
    if (Number.isFinite(stamped)) return stamped;
    const time = Number(bar?.firstDatetime ?? bar?.timestamp ?? bar?.datetime);
    return Number.isFinite(time) ? time : null;
};

// Index in chart.slicedData of the bar that was open at `timestamp`, or -1 when that bar isn't visible
// (before the first visible bar, or at/after the bar following the visible window). Data is time-sorted.
export const findVisibleBarIndex = (chart, timestamp) => {
    const data = chart?.slicedData;
    if (!Array.isArray(data) || !data.length || !Number.isFinite(timestamp)) return -1;

    const nextBar = Number.isFinite(chart.sliceEnd) ? chart.ohlcDatas?.[chart.sliceEnd] : null;
    const nextStart = barStartTime(nextBar, chart);
    if (nextStart !== null && timestamp >= nextStart) return -1;

    let lo = 0;
    let hi = data.length - 1;
    let found = -1;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const start = barStartTime(data[mid], chart);
        if (start !== null && start <= timestamp) {
            found = mid;
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }
    return found;
};
