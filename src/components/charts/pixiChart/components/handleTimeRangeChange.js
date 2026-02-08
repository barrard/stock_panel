import { barTypeToTimeframe } from "./utils";
import API from "../../../API";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Handler for time range changes from GenericPixiChart
const handleTimeRangeChange = async ({ startTime, endTime, numDays, barType, barTypePeriod, symbol, setIsLoading, setOhlcData }) => {
    console.log(`[PixiChartV2] Loading data for time range:`, { startTime, endTime, numDays });

    if (!startTime) {
        alert("Missing start date for time range request");
        return;
    }

    try {
        setIsLoading?.(true);

        if (!symbol?.value || !symbol?.exchange) {
            throw new Error("Missing symbol information");
        }

        // Convert barType/barTypePeriod to timeframe string (e.g., "1m", "5m")
        const timeframeStr = barTypeToTimeframe({
            barType: barType?.value ?? barType,
            barTypePeriod: barTypePeriod,
        });

        if (!timeframeStr) {
            throw new Error("Unable to determine timeframe for request");
        }

        // Convert timestamp to MM/DD/YYYY format
        const startDate = new Date(startTime);

        if (Number.isNaN(startDate.getTime())) {
            throw new Error("Invalid start date");
        }

        const month = String(startDate.getMonth() + 1).padStart(2, "0");
        const day = String(startDate.getDate()).padStart(2, "0");
        const year = startDate.getFullYear();
        const formattedDate = `${month}-${day}-${year}`;

        // Allow explicit end dates by converting them to a # days request
        let effectiveNumDays = numDays;
        if ((effectiveNumDays === undefined || effectiveNumDays === null) && endTime) {
            const endDate = new Date(endTime);
            if (Number.isNaN(endDate.getTime())) {
                throw new Error("Invalid end date");
            }
            const diffInDays = Math.ceil((endDate.getTime() - startDate.getTime()) / MS_PER_DAY);
            if (diffInDays < 0) {
                throw new Error("End date must be after start date");
            }
            // +1 so the selected end date is included
            effectiveNumDays = diffInDays + 1;
        }

        console.log(
            `[PixiChartV2] Requesting: ${symbol.value}/${symbol.exchange}/${timeframeStr} from ${formattedDate} for ${
                effectiveNumDays ?? "default"
            } days`
        );

        const response = await API.rapi_requestBarsTimeRange({
            symbol: symbol.value,
            exchange: symbol.exchange,
            timeframe: timeframeStr,
            startDate: formattedDate,
            numDays: effectiveNumDays !== undefined ? effectiveNumDays : undefined,
        });

        const normalizeBars = (bars = []) => {
            if (!Array.isArray(bars)) return [];
            return bars.map((bar) => {
                const normalized = { ...bar };
                if (typeof normalized.datetime === "number") {
                    // API sometimes sends seconds; convert to ms when needed
                    normalized.datetime = normalized.datetime > 1e12 ? normalized.datetime : normalized.datetime * 1000;
                }
                if (normalized.volume?.low !== undefined) {
                    normalized.volume = normalized.volume.low;
                }
                return normalized;
            });
        };

        const dateToBars = new Map();

        if (Array.isArray(response?.days)) {
            response.days.forEach((day) => {
                if (!day?.date) return;
                const combinedBars = [];
                combinedBars.push(...normalizeBars(day?.overnight?.bars));
                combinedBars.push(...normalizeBars(day?.rth?.bars));

                if (combinedBars.length > 0) {
                    combinedBars.sort((a, b) => a.datetime - b.datetime);
                    dateToBars.set(day.date, combinedBars);
                }
            });
        }

        if (dateToBars.size === 0 && Array.isArray(response)) {
            // Fallback to legacy response of raw bar array
            dateToBars.set("default", normalizeBars(response));
        }

        const parseDateKey = (dateStr) => {
            if (!dateStr) return Number.POSITIVE_INFINITY;
            const [month, dayStr, year] = dateStr.split("-");
            if (!month || !dayStr || !year) return Number.POSITIVE_INFINITY;
            return new Date(`${year}-${month.padStart(2, "0")}-${dayStr.padStart(2, "0")}T00:00:00Z`).getTime();
        };

        const orderedDates = Array.from(dateToBars.keys()).sort((a, b) => parseDateKey(a) - parseDateKey(b));
        const masterData = [];
        orderedDates.forEach((dateKey) => {
            masterData.push(...dateToBars.get(dateKey));
        });

        if (masterData.length > 0) {
            console.log(`[PixiChartV2] Loaded ${masterData.length} bars for time range`);

            setOhlcData?.(masterData);
        } else {
            console.log("[PixiChartV2] No data available for selected time range");
            alert("No data available for selected time range");
        }
        } catch (error) {
            console.error("[PixiChartV2] Failed to load time range data:", error);
            alert(`Failed to load data: ${error.message}`);
        } finally {
            setIsLoading?.(false);
        }
    };

export default handleTimeRangeChange;
