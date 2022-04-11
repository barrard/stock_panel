export function updateActives(data) {
    return {
        type: "ACTIVES",
        data,
    };
}

export function updateLastPrices(data) {
    return {
        type: "LAST_PRICES",
        data,
    };
}
