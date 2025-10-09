import { useEffect } from "react";

/**
 * Custom hook to manage chart indicators
 * Handles registration, cleanup, and lifecycle of indicator instances
 *
 * @param {Object} params
 * @param {Object} params.indicator - Indicator config object
 * @param {Object} params.pixiDataRef - Ref to GenericDataHandler
 * @param {Function} params.createInstance - Function that creates the indicator instance
 * @param {Function} params.setIndicators - State setter to update indicators array
 * @param {Array} params.dependencies - Additional dependencies for useEffect
 */
export const useIndicator = ({
    indicator,
    pixiDataRef,
    createInstance,
    setIndicators,
    dependencies = [],
}) => {
    useEffect(() => {
        if (!indicator) return;

        const pixiData = pixiDataRef?.current;
        if (!pixiData) return;

        // If indicator is enabled, create and register
        if (indicator.enabled) {
            // Create the indicator instance
            const instance = createInstance(pixiData);

            if (!instance) return;

            // Update instanceRef in state
            setIndicators((prevIndicators) =>
                prevIndicators.map((ind) =>
                    ind.id === indicator.id ? { ...ind, instanceRef: instance } : ind
                )
            );

            // Register the draw function (only if not manually drawn)
            // Some indicators like LiquidityHeatmap manage their own drawing
            if (indicator.manualDraw) {
                // Don't register with auto-draw system
                console.log(`[useIndicator] ${indicator.id} uses manual drawing (not registered)`);
            } else if (indicator.drawFunctionKey && instance[indicator.drawFunctionKey]) {
                pixiData.registerDrawFn(
                    indicator.drawFunctionKey,
                    instance[indicator.drawFunctionKey].bind(instance)
                );
            } else if (instance.draw) {
                // Fallback to draw method
                pixiData.registerDrawFn(
                    indicator.drawFunctionKey || indicator.id,
                    instance.draw.bind(instance)
                );
            }

            // Trigger initial draw
            if (!indicator.manualDraw) {
                pixiData.draw();
            }

            // Cleanup function
            return () => {
                // Unregister draw function
                pixiData?.unregisterDrawFn(indicator.drawFunctionKey || indicator.id);

                // Get the current instance from state
                const currentInstance = indicator.instanceRef;
                if (currentInstance && currentInstance.cleanup) {
                    currentInstance.cleanup();
                }

                // Clear instanceRef in state
                setIndicators((prevIndicators) =>
                    prevIndicators.map((ind) =>
                        ind.id === indicator.id ? { ...ind, instanceRef: null } : ind
                    )
                );
            };
        } else if (!indicator.enabled && indicator.instanceRef) {
            // Indicator was disabled, clean up
            pixiData?.unregisterDrawFn(indicator.drawFunctionKey || indicator.id);

            const currentInstance = indicator.instanceRef;
            if (currentInstance && currentInstance.cleanup) {
                currentInstance.cleanup();
            }

            // Clear instanceRef in state
            setIndicators((prevIndicators) =>
                prevIndicators.map((ind) =>
                    ind.id === indicator.id ? { ...ind, instanceRef: null } : ind
                )
            );

            // Redraw to remove the indicator
            pixiData.draw();
        }
    }, [indicator?.enabled, pixiDataRef.current, ...dependencies]);
};
