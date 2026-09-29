const STORAGE_KEY = "extremaIndicatorOptions";

function readAll() {
    if (typeof localStorage === "undefined") return {};
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        console.error("[indicatorOptionsStorage] failed to read saved options", e);
        return {};
    }
}

export function loadSavedIndicatorOptions(indicatorId) {
    return readAll()[indicatorId] || null;
}

export function saveIndicatorOptions(indicatorId, options) {
    if (typeof localStorage === "undefined") return;
    // `fields` is UI metadata (rebuilt from code), never a user-set value - never persist it,
    // otherwise a stale saved copy would shadow future field-list changes made in code.
    const { fields, ...persistable } = options || {};
    try {
        const all = readAll();
        all[indicatorId] = { ...all[indicatorId], ...persistable };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
        console.error("[indicatorOptionsStorage] failed to save options", e);
    }
}
