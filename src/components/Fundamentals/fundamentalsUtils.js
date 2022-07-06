import * as ss from "simple-statistics";
export const allFilters = [
    "beta",
    "bookValuePerShare",
    "currentRatio",
    "dividendAmount",
    "dividendPayAmount",
    "dividendYield",
    "epsChangePercentTTM",
    "epsChangeYear",
    "epsTTM",
    "grossMarginMRQ",
    "grossMarginTTM",
    "interestCoverage",
    "ltDebtToEquity",
    "marketCap",
    "marketCapFloat",
    "netProfitMarginMRQ",
    "netProfitMarginTTM",
    "operatingMarginMRQ",
    "operatingMarginTTM",
    "pbRatio",
    "pcfRatio",
    "pegRatio",
    "peRatio",
    "prRatio",
    "quickRatio",
    "returnOnAssets",
    "returnOnEquity",
    "returnOnInvestment",
    "revChangeIn",
    "revChangeTTM",
    "sharesOutstanding",
    "totalDebtToCapital",
    "totalDebtToEquity",
    ////////////////////////////////
    // "assetType",
    // "dividendDate",
    // "dividendPayDate",
    // "exchange",
    // "high52",
    // "low52",
    // "symbol",
    // "vol10DayAvg",
    // "vol1DayAvg",
    // "vol3MonthAvg",
];

export const filtersNameMap = {
    assetType: { name: "Asset Type", description: "" },
    beta: { name: "Beta", description: "" },
    bookValuePerShare: { name: "Book Value Per Share", description: "" },
    currentRatio: { name: "Current Ratio", description: "" },
    dividendAmount: { name: "Dividend Amount", description: "" },
    dividendDate: { name: "Dividend Date", description: "" },
    dividendPayAmount: { name: "Dividend Pay Amount", description: "" },
    dividendPayDate: { name: "Dividend Pay Date", description: "" },
    dividendYield: { name: "Dividend Yield", description: "" },
    epsChangePercentTTM: {
        name: "Earnings Per Share Change Percent TTM",
        description: "",
    },
    epsChangeYear: { name: "Earnings Per Share Change Year", description: "" },
    epsTTM: { name: "Earnings Per Share TTM", description: "" },
    exchange: { name: "Exchange", description: "" },
    grossMarginMRQ: { name: "Gross Margin MRQ", description: "" },
    grossMarginTTM: { name: "Gross Margin TTM", description: "" },
    high52: { name: "high5252 Week High", description: "" },
    interestCoverage: { name: "Interest Coverage", description: "" },
    low52: { name: "52 Week Low", description: "" },
    ltDebtToEquity: { name: "Long Term Debt To Equity", description: "" },
    marketCap: { name: "Market Cap", description: "" },
    marketCapFloat: { name: "Market Cap Float", description: "" },
    netProfitMarginMRQ: { name: "Net Profit Margin MRQ", description: "" },
    netProfitMarginTTM: { name: "Net Profit Margin TTM", description: "" },
    operatingMarginMRQ: { name: "Operating Margin MRQ", description: "" },
    operatingMarginTTM: { name: "Operating Margin TTM", description: "" },
    pbRatio: { name: "Price to Book Ratio", description: "" },
    pcfRatio: { name: "Price to Cash Flow Ratio", description: "" },
    pegRatio: { name: "Price/Earnings to Growth Ratio", description: "" },
    peRatio: { name: "Price to Earnings Ratio", description: "" },
    prRatio: { name: "Price to Rev? Ratio (prRatio)", description: "" },
    quickRatio: { name: "Quick Ratio", description: "" },
    returnOnAssets: { name: "Return On Assets", description: "" },
    returnOnEquity: { name: "return On Equity", description: "" },
    returnOnInvestment: { name: "Return On Investment", description: "" },
    revChangeIn: { name: "revChangeIn", description: "" },
    revChangeTTM: { name: "revChangeTTM", description: "" },
    sharesOutstanding: { name: "Shares Outstanding", description: "" },
    symbol: { name: "Symbol", description: "" },
    totalDebtToCapital: { name: "Total Debt To Capital", description: "" },
    totalDebtToEquity: { name: "Total Debt To Equity", description: "" },
    vol10DayAvg: { name: "10 Day Avg Vol", description: "" },
    vol1DayAvg: { name: "1 Day Avg Vol", description: "" },
    vol3MonthAvg: { name: "3 Month Avg Vol", description: "" },
};

export function processDataValues(data) {
    const valuesMap = {};

    Object.keys(data).forEach((symbol) => {
        const fundamentalsData = data[symbol];
        allFilters.forEach((metric) => {
            const value = fundamentalsData[metric];
            if (!valuesMap[metric]) {
                valuesMap[metric] = {};
            }
            if (!value) return;
            if (valuesMap[metric][value] === undefined) {
                valuesMap[metric][value] = 0;
            }
            valuesMap[metric][value]++;
        });
    });

    console.log(valuesMap);
    return valuesMap;
}

export function applyFilters({ fundamentals, appliedFilters, deviations }) {
    const symbols = Object.keys(fundamentals);
    const filteredSymbols = {};

    symbols.forEach((symbol) => {
        let filterOut = false;
        Object.keys(appliedFilters).forEach((filter) => {
            if (filteredSymbols[symbol]) return;
            const stockFundamentals = fundamentals[symbol];
            const value = stockFundamentals[filter];
            const mean = deviations.mean[filter];
            const std = deviations.std[filter];
            if (mean === undefined || std === undefined) {
                return;
            }
            //is this value within the std?

            const [min, max] = appliedFilters[filter];
            if (min === undefined || max === undefined) return;

            const skew = value - mean;
            let minDeviation = min * std;
            let maxDeviation = max * std;

            if (skew < minDeviation || skew > maxDeviation) {
                filterOut = true;
            }
        });

        if (filterOut) {
            filteredSymbols[symbol] = true;
        }
    });

    return filteredSymbols;
}

export function buildDist(masterDist) {
    const dist = {};
    for (let filter in masterDist) {
        for (let symbol in masterDist[filter]) {
            if (!dist[filter]) {
                dist[filter] = {};
            }
            const count = masterDist[filter][symbol];
            if (!dist[filter][count]) {
                dist[filter][count] = 0;
            }

            dist[filter][count]++;
        }
    }

    return dist;
}

// let loopCount = 0;
//function that finds the distribution of a given set of values
export function findDistribution({
    fundamentals,
    name,
    appliedFilters,
    deviations,
    filteredStocks,
    mean,
    masterDistros,
}) {
    const symbols = Object.keys(fundamentals);

    const values = symbols.map((d) => fundamentals[d][name]);

    if (values.length === 0) return {};

    const masterDist = { [name]: {} };
    const magicNum = 10;
    const granularity = 1 * (1 / magicNum);
    const usedDeviation = deviations; //deviations.std; //std
    values.forEach((v, vIndex) => {
        const skew = v - mean;
        const symbol = symbols[vIndex];
        if (filteredStocks[symbol]) return;

        let count = masterDistros
            ? masterDistros?.[name]?.[symbol] * granularity
            : 0;

        if (skew === 0) {
            console.log("eureka!");
        } else if (skew > 0) {
            let deviation = granularity * count * usedDeviation;

            while (deviation < skew) {
                const _count = count + granularity;
                count = Math.round(_count * magicNum) / magicNum;
                deviation = count * usedDeviation;
            }
        } else if (skew < 0) {
            let deviation = granularity * count * usedDeviation;
            while (deviation > skew) {
                const _count = count - granularity;
                count = Math.round(_count * magicNum) / magicNum;
                deviation = count * usedDeviation;
            }
        }

        masterDist[name][symbol] = count;
    });

    return masterDist;
}
