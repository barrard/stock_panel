import { Graphics, Container } from "pixi.js";
import { isRTH } from "../../../indicators/indicatorHelpers/IsMarketOpen.js";

export default class DrawSessionRangeZones {
    constructor(ohlcData, avgON_dailyRange, avgRTH_dailyRange, pixiDataRef, layer = 0) {
        this.ohlcData = ohlcData;
        this.avgON_dailyRange = avgON_dailyRange;
        this.avgRTH_dailyRange = avgRTH_dailyRange;
        this.pixiDataRef = pixiDataRef;
        this.layer = layer;
        this.hasInit = false;

        // Visual settings
        this.onColor = 0x1e3a8a; // Dark blue for overnight
        this.onAlpha = 0.2;
        this.rthColor = 0xf59e0b; // Orange/amber for RTH
        this.rthAlpha = 0.2;

        // Cache for session data
        this.latestONSession = null;
        this.latestRTHSession = null;

        this.init();
    }

    init() {
        if (this.hasInit) return;
        this.hasInit = true;
        this.initContainer();
        this.xScale = this.pixiDataRef.current.xScale;
        this.priceScale = this.pixiDataRef.current.priceScale;

        // Find the latest ON and RTH sessions
        this.findLatestSessions();
    }

    initContainer() {
        this.zonesContainer = new Container();
        this.pixiDataRef.current.addToLayer(this.layer, this.zonesContainer);
    }

    cleanup() {
        if (this.zonesContainer) {
            this.pixiDataRef.current.removeFromLayer(this.layer, this.zonesContainer);
            this.zonesContainer.destroy({ children: true });
            this.zonesContainer = null;
        }
    }

    /**
     * Find the latest overnight and RTH sessions in the data
     * Note: Bars are labeled at their END time
     */
    findLatestSessions() {
        if (!this.ohlcData || this.ohlcData.length === 0) {
            return;
        }

        // Start from the end and work backwards
        // We're looking for the LAST complete RTH session and the ON session before it
        let currentSessionType = null;
        let sessions = [];
        let sessionStart = this.ohlcData.length - 1;

        for (let i = this.ohlcData.length - 1; i >= 0; i--) {
            const bar = this.ohlcData[i];
            const timestamp = bar.datetime || bar.timestamp;
            const barIsRTH = isRTH(timestamp);
            const barType = barIsRTH ? 'RTH' : 'ON';

            // Initialize on first bar
            if (currentSessionType === null) {
                currentSessionType = barType;
                sessionStart = i;
                continue;
            }

            // Detect session change
            if (barType !== currentSessionType) {
                // Save the session we just finished
                sessions.push({
                    type: currentSessionType,
                    startIndex: i + 1, // Session starts at next bar
                    endIndex: sessionStart,
                });

                // Start new session
                currentSessionType = barType;
                sessionStart = i;
            }
        }

        // Add the first session (if we have data left)
        if (currentSessionType !== null && sessionStart >= 0) {
            sessions.push({
                type: currentSessionType,
                startIndex: 0,
                endIndex: sessionStart,
            });
        }

        // Find the latest complete RTH and ON sessions
        // We want the most recent RTH and the ON immediately before it
        for (let i = 0; i < sessions.length; i++) {
            const session = sessions[i];

            if (session.type === 'RTH' && !this.latestRTHSession) {
                this.latestRTHSession = {
                    startIndex: session.startIndex,
                    endIndex: session.endIndex,
                };
            }

            if (session.type === 'ON' && !this.latestONSession && this.latestRTHSession) {
                // This is the ON session right before the RTH we found
                this.latestONSession = {
                    startIndex: session.startIndex,
                    endIndex: session.endIndex,
                };
                break; // We have both, we're done
            }
        }
    }

    /**
     * Calculate zone boundaries for each bar in the session
     * Returns an array of zone bounds per bar
     */
    calculateZoneBoundsPerBar(sessionData, avgRange) {
        if (!sessionData || !this.ohlcData) {
            return null;
        }

        const { startIndex, endIndex } = sessionData;
        const halfRange = avgRange / 2;

        // Get session open price (first bar of session)
        const sessionOpen = this.ohlcData[startIndex].open;

        // Initial zone centered on session open
        let currentZoneHigh = sessionOpen + halfRange;
        let currentZoneLow = sessionOpen - halfRange;

        const zoneBoundsPerBar = [];

        // Iterate through each bar in the session
        for (let i = startIndex; i <= endIndex; i++) {
            const bar = this.ohlcData[i];
            const barHigh = bar.high;
            const barLow = bar.low;

            // Calculate distance from session open
            const distanceUp = barHigh - sessionOpen;
            const distanceDown = sessionOpen - barLow;

            // Check if price has exceeded half-range and expand zone if needed
            if (distanceUp > halfRange) {
                // Expand upward, but cap at full range
                const potentialHigh = barHigh;
                const cappedHigh = Math.min(sessionOpen + avgRange, potentialHigh);

                if (cappedHigh > currentZoneHigh) {
                    currentZoneHigh = cappedHigh;
                    // Adjust bottom to maintain avgRange height
                    currentZoneLow = currentZoneHigh - avgRange;
                }
            }

            if (distanceDown > halfRange) {
                // Expand downward, but cap at full range
                const potentialLow = barLow;
                const cappedLow = Math.max(sessionOpen - avgRange, potentialLow);

                if (cappedLow < currentZoneLow) {
                    currentZoneLow = cappedLow;
                    // Adjust top to maintain avgRange height
                    currentZoneHigh = currentZoneLow + avgRange;
                }
            }

            // Store the zone bounds for this bar
            zoneBoundsPerBar.push({
                barIndex: i,
                high: currentZoneHigh,
                low: currentZoneLow,
            });
        }

        return {
            startIndex,
            endIndex,
            sessionOpen,
            perBarBounds: zoneBoundsPerBar,
        };
    }

    /**
     * Draw a single zone (ON or RTH) with per-bar segments
     */
    drawZone(zoneData, color, alpha) {
        if (!zoneData || !zoneData.perBarBounds) return;

        const slicedData = this.pixiDataRef.current.slicedData;
        const sliceStart = this.pixiDataRef.current.sliceStart;
        const sliceEnd = this.pixiDataRef.current.sliceEnd;
        const candleWidth = this.pixiDataRef.current.candleWidth;

        const { startIndex, endIndex, perBarBounds } = zoneData;

        // Check if this zone overlaps with visible data
        if (endIndex < sliceStart || startIndex >= sliceEnd) {
            return; // Zone is not visible
        }

        const gfx = new Graphics();
        gfx.beginFill(color, alpha);

        // Draw a rectangle for each bar's zone bounds
        perBarBounds.forEach((barZone) => {
            const { barIndex, high, low } = barZone;

            // Check if this bar is visible
            if (barIndex < sliceStart || barIndex >= sliceEnd) {
                return;
            }

            // Convert to sliced coordinate
            const slicedIdx = barIndex - sliceStart;
            const x = this.xScale(slicedIdx);
            const topY = this.priceScale(high);
            const bottomY = this.priceScale(low);
            const height = bottomY - topY;

            // Draw rectangle for this bar
            gfx.drawRect(x - candleWidth / 2, topY, candleWidth, height);
        });

        gfx.endFill();
        this.zonesContainer.addChild(gfx);
    }

    /**
     * Main draw function
     */
    drawAll() {
        if (!this.zonesContainer) {
            return;
        }

        // Clear previous drawings
        this.zonesContainer.removeChildren().forEach((child) => child.destroy());

        // Update scales
        this.xScale = this.pixiDataRef.current.xScale;
        this.priceScale = this.pixiDataRef.current.priceScale;

        // Calculate and draw ON zone
        if (this.latestONSession && this.avgON_dailyRange) {
            const onBounds = this.calculateZoneBoundsPerBar(this.latestONSession, this.avgON_dailyRange);
            this.drawZone(onBounds, this.onColor, this.onAlpha);
        }

        // Calculate and draw RTH zone
        if (this.latestRTHSession && this.avgRTH_dailyRange) {
            const rthBounds = this.calculateZoneBoundsPerBar(this.latestRTHSession, this.avgRTH_dailyRange);
            this.drawZone(rthBounds, this.rthColor, this.rthAlpha);
        }
    }
}
