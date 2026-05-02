const FUTURES_MONTH_CODES = new Set(["F", "G", "H", "J", "K", "M", "N", "Q", "U", "V", "X", "Z"]);

const FUTURES_FAMILY_MAP = {
    ES: "ES",
    MES: "ES",
    NQ: "NQ",
    MNQ: "NQ",
    YM: "YM",
    MYM: "YM",
    RTY: "RTY",
    M2K: "RTY",
    GC: "GC",
    MGC: "GC",
    CL: "CL",
    MCL: "CL",
};

function toUpperTrimmedSymbol(value) {
    if (value === undefined || value === null) return "";
    return String(value).trim().toUpperCase();
}

export function normalizeFuturesBaseSymbol(symbol) {
    const normalizedSymbol = toUpperTrimmedSymbol(symbol);
    if (!normalizedSymbol) return "";

    const monthCode = normalizedSymbol.slice(-2, -1);
    const yearCode = normalizedSymbol.slice(-1);
    if (FUTURES_MONTH_CODES.has(monthCode) && /^\d{1,2}$/.test(yearCode)) {
        return normalizedSymbol.slice(0, -2);
    }

    const compactMatch = normalizedSymbol.match(/^([A-Z]+?)([FGHJKMNQUVXZ])(\d{1,2})$/);
    if (compactMatch) {
        return compactMatch[1];
    }

    return normalizedSymbol;
}

export function getFuturesDisplayFamily(symbol) {
    const baseSymbol = normalizeFuturesBaseSymbol(symbol);
    return FUTURES_FAMILY_MAP[baseSymbol] || baseSymbol;
}

export function areRelatedFuturesSymbols(leftSymbol, rightSymbol) {
    const leftFamily = getFuturesDisplayFamily(leftSymbol);
    const rightFamily = getFuturesDisplayFamily(rightSymbol);
    return Boolean(leftFamily && rightFamily && leftFamily === rightFamily);
}

function toFiniteNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

export function findRelatedInstrumentPnl(positionData = {}, requestedSymbol) {
    if (!positionData || !requestedSymbol) return null;

    const normalizedRequestedSymbol = toUpperTrimmedSymbol(requestedSymbol);
    const requestedBaseSymbol = normalizeFuturesBaseSymbol(normalizedRequestedSymbol);

    let bestMatch = null;
    let bestScore = -1;
    let bestRichnessScore = -1;

    Object.entries(positionData).forEach(([symbolKey, instrumentPnl]) => {
        const normalizedKey = toUpperTrimmedSymbol(symbolKey);
        const candidateSymbol = instrumentPnl?.symbol || normalizedKey;
        const candidateBaseSymbol = normalizeFuturesBaseSymbol(candidateSymbol);

        let score = -1;
        if (normalizedKey === normalizedRequestedSymbol || toUpperTrimmedSymbol(candidateSymbol) === normalizedRequestedSymbol) {
            score = 5;
        } else if (candidateBaseSymbol && candidateBaseSymbol === requestedBaseSymbol) {
            score = 4;
        } else if (areRelatedFuturesSymbols(candidateSymbol, normalizedRequestedSymbol)) {
            score = 3;
        }

        if (score < 0) return;

        const numericOpenPnl = toFiniteNumber(instrumentPnl?.openPositionPnl);
        const numericNetQuantity = toFiniteNumber(instrumentPnl?.netQuantity);
        const numericAvgOpenFillPrice = toFiniteNumber(instrumentPnl?.avgOpenFillPrice);
        const richnessScore =
            Math.abs(numericNetQuantity || 0) +
            Math.abs(numericOpenPnl || 0) +
            (Number.isFinite(numericAvgOpenFillPrice) ? 1 : 0);

        if (score > bestScore) {
            bestScore = score;
            bestRichnessScore = richnessScore;
            bestMatch = {
                ...instrumentPnl,
                __displaySymbolKey: normalizedKey,
            };
            return;
        }

        if (score === bestScore && richnessScore > bestRichnessScore) {
            bestRichnessScore = richnessScore;
            bestMatch = {
                ...instrumentPnl,
                __displaySymbolKey: normalizedKey,
            };
        }
    });

    return bestMatch;
}
