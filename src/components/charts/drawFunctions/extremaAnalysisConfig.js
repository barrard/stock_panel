import { loadSavedIndicatorOptions } from "./indicatorOptionsStorage.js";

const minMaxBarsField = {
    key: "minMaxBars",
    label: "Min/max bars",
    type: "number",
    min: 1,
    step: 1,
};

const showLabelsField = {
    key: "showLabels",
    label: "Show labels",
    type: "checkbox",
};

const trendlineErrorField = {
    key: "trendlineErrorLimit",
    label: "Trendline max error",
    type: "number",
    min: 0.1,
    step: 0.1,
};

const mergeThresholdField = {
    key: "priceLevelSensitivity",
    label: "Merge threshold",
    type: "number",
    min: 0.1,
    step: 0.5,
};

// Each mode only gets the fields its calculation/draw logic actually reads.
export const FIELDS_BY_MODE = {
    priceLevels: [minMaxBarsField, mergeThresholdField, showLabelsField],
    fibonacci: [minMaxBarsField, showLabelsField],
    trendlines: [minMaxBarsField, trendlineErrorField, showLabelsField],
    zigZag: [minMaxBarsField, showLabelsField],
};

export const DEFAULT_OPTIONS_BY_MODE = {
    priceLevels: { minMaxBars: 20, priceLevelSensitivity: 8, showLabels: true },
    fibonacci: { minMaxBars: 30, showLabels: true },
    trendlines: { minMaxBars: 15, trendlineErrorLimit: 2, showLabels: true },
    zigZag: { minMaxBars: 8, showLabels: false },
};

// A previously saved config (set manually by the user) always wins over code defaults/overrides.
export const makeExtremaIndicator = (id, name, mode, optionOverrides = {}) => ({
    id,
    name,
    enabled: false,
    instanceRef: null,
    options: {
        ...DEFAULT_OPTIONS_BY_MODE[mode],
        ...optionOverrides,
        ...loadSavedIndicatorOptions(id),
        fields: FIELDS_BY_MODE[mode],
    },
    createMode: mode,
});

export const EXTREMA_INDICATOR_IDS = ["priceLevels", "fibonacci", "trendlines", "zigZag"];

export const createDefaultExtremaIndicators = () => [
    makeExtremaIndicator("priceLevels", "Price Levels", "priceLevels"),
    makeExtremaIndicator("fibonacci", "Fib", "fibonacci"),
    makeExtremaIndicator("trendlines", "Trendlines", "trendlines"),
    makeExtremaIndicator("zigZag", "ZigZag", "zigZag"),
];
