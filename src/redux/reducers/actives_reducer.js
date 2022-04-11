const initial_state = {
    lastPrices: {},
    actives: {},
};

export default (state = initial_state, action) => {
    switch (action.type) {
        case "ACTIVES": {
            let { data } = action;

            console.log(data);
            const { key, sampleDuration, startTime, displayTime, ACTIVES } =
                data;
            state.actives[key] = {
                sampleDuration,
                startTime,
                displayTime,
                ACTIVES,
            };

            return {
                ...state,
            };
        }
        case "LAST_PRICES": {
            let { data } = action;
            state.lastPrices = { ...state.lastPrices, ...data };
            return {
                ...state,
            };
        }

        default:
            return state;
    }
};
