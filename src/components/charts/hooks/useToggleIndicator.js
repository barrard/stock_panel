import { useCallback } from "react";

/**
 * Custom hook to handle indicator toggling with timeframe validation
 * @param {Array} indicators - Current indicators state
 * @param {Function} setIndicators - State setter for indicators
 * @param {String} timeframe - Current chart timeframe
 * @returns {Function} toggleIndicator - Function to toggle indicator by id
 */
export const useToggleIndicator = (indicators, setIndicators, timeframe) => {
    const toggleIndicator = useCallback((id) => {
        setIndicators((prevIndicators) =>
            prevIndicators.map((indicator) => {
                if (indicator.id === id) {
                    // Check if indicator should be enabled for current timeframe
                    if (indicator.shouldEnable && !indicator.shouldEnable(timeframe)) {
                        console.warn(`Indicator ${id} is not available for timeframe ${timeframe}`);
                        return indicator; // Don't toggle if not available
                    }
                    return { ...indicator, enabled: !indicator.enabled };
                }
                return indicator;
            })
        );
    }, [setIndicators, timeframe]);

    return toggleIndicator;
};
