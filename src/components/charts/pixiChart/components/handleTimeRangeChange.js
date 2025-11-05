import { barTypeToTimeframe } from "./utils";
import API from "../../../API";

// Handler for time range changes from GenericPixiChart
const handleTimeRangeChange = async ({ startTime, endTime, numDays, barType, barTypePeriod, symbol, setIsLoading, setOhlcData }) => {
    console.log(`[PixiChartV2] Loading data for time range:`, { startTime, endTime, numDays });

    try {
        setIsLoading(true);

        // Convert barType/barTypePeriod to timeframe string (e.g., "1m", "5m")
        const timeframeStr = barTypeToTimeframe({
            barType: barType.value,
            barTypePeriod: barTypePeriod,
        });

        // Convert timestamp to MM/DD/YYYY format
        const startDate = new Date(startTime);
        const month = String(startDate.getMonth() + 1).padStart(2, "0");
        const day = String(startDate.getDate()).padStart(2, "0");
        const year = startDate.getFullYear();
        const formattedDate = `${month}/${day}/${year}`;

        console.log(`[PixiChartV2] Requesting: ${symbol.value}/${symbol.exchange}/${timeframeStr} from ${formattedDate}`);

        const data = await API.rapi_requestBarsTimeRange({
            symbol: symbol.value,
            exchange: symbol.exchange,
            timeframe: timeframeStr,
            startDate: formattedDate,
            numDays: numDays || undefined,
        });

        if (data && data.length > 0) {
            console.log(`[PixiChartV2] Loaded ${data.length} bars for time range`);

            // Process the data
            data.forEach((d) => {
                d.datetime = d.datetime * 1000;
                if (d.volume?.low !== undefined) {
                    d.volume = d.volume.low;
                }
            });

            // Replace current data with time range data
            setOhlcData(data);
        } else {
            console.log("[PixiChartV2] No data available for selected time range");
            alert("No data available for selected time range");
        }
    } catch (error) {
        console.error("[PixiChartV2] Failed to load time range data:", error);
        alert(`Failed to load data: ${error.message}`);
    } finally {
        setIsLoading(false);
    }
};

export default handleTimeRangeChange;
