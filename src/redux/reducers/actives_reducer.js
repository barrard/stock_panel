const initial_state = {
    lastPrices: {},
    actives: {},
};

export default (state = initial_state, action) => {
    switch (action.type) {
        case "ACTIVES": {
            let { data } = action;

            const { key, sampleDuration, startTime, displayTime, ACTIVES } = data;
            for (let key in data) {
                state.actives[key] = {};
                for (let type in data[key]) {
                    state.actives[key][type] = data[key][type];
                }
            }
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
