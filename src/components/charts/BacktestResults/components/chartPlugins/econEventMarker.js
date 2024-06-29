const econEventMarker = {
    id: "econEventMarker",
    afterDatasetsDraw: (chart, args, plugins) => {
        const econEventData = chart.data.datasets.find((d) => d.id === "econEvents");
        const ohlcData = chart.data.datasets.find((d) => d.id === "ohlc");

        if (!econEventData?.data?.length) return;
        const {
            ctx,
            chartArea: { top, bottom, left, right, width, height },
            scales: { x, price: y },
        } = chart;

        econEventData.data.forEach((econEvent, index) => {
            let econEventTimesIndex = ohlcData.data.findIndex((ohlc) => ohlc.dt >= econEvent.timestamp);
            if (econEventTimesIndex == -1) {
                econEventTimesIndex = ohlcData.data.length - 1;
            }
            const bar = ohlcData.data[econEventTimesIndex];
            const R = econEvent.event.sentiment == "Moderate Volatility Expected" ? 15 : "high Volatility Expected" ? 20 : 10;
            const xOpen = x.getPixelForValue(econEventTimesIndex);
            const yOpen = y.getPixelForValue(bar.o || bar.open);
            ctx.save();
            ctx.beginPath();
            ctx.arc(xOpen, yOpen, R, 0, Math.PI * 2);
            ctx.fillStyle = "gold";
            ctx.strokeStyle = "black";
            ctx.fill();
            ctx.stroke();
            ctx.closePath();

            // Store the marker's position and data for later use
            chart.econEventMarkers = chart.econEventMarkers || [];
            chart.econEventMarkers[index] = { x: xOpen, y: yOpen, r: R, data: econEvent };
        });
    },
    beforeEvent(chart, args, pluginOptions) {
        const event = args.event;
        if (event.type === "mousemove") {
            const { x, y } = event;

            // Check if mouse is over any marker
            const markers = (chart.econEventMarkers || []).filter((m) => Math.sqrt((x - m.x) ** 2 + (y - m.y) ** 2) <= m.r);
            if (markers.length) {
                chart.canvas.style.cursor = "pointer";
                chart.econEventTooltip = markers;
            } else {
                chart.canvas.style.cursor = "default";
                chart.econEventTooltip = null;
            }
            chart.render();
        }
    },
    afterDraw(chart, args, pluginOptions) {
        const { ctx } = chart;

        if (chart.econEventTooltip && chart.econEventTooltip.length > 0) {
            const tooltips = chart.econEventTooltip;
            const padding = 10;
            const singleWidth = 220;
            const singleHeight = 120;
            const cornerRadius = 5;
            const spacing = 10; // Space between tooltips

            // Calculate overall dimensions
            const numTooltips = Math.min(tooltips.length, 3); // Limit to 3 tooltips
            const totalWidth = singleWidth * numTooltips + spacing * (numTooltips - 1);
            const totalHeight = singleHeight;

            // Get chart dimensions
            const chartWidth = chart.width;
            const chartHeight = chart.height;

            // Calculate starting position
            let startX = tooltips[0].x - totalWidth / 2;
            let startY = tooltips[0].y - totalHeight - 15;

            // Adjust startX to ensure it's within the chart
            startX = Math.max(padding, Math.min(startX, chartWidth - totalWidth - padding));

            // Adjust startY if it's too high
            if (startY < padding) {
                startY = tooltips[0].y + 15; // Place below the marker
            }

            tooltips.slice(0, numTooltips).forEach((tooltip, index) => {
                const { data } = tooltip;
                const { event } = data;

                // Calculate position for this tooltip
                let x = startX + (singleWidth + spacing) * index;
                let y = startY;

                // Draw rounded rectangle for tooltip background
                ctx.save();
                ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
                ctx.beginPath();
                ctx.moveTo(x + cornerRadius, y);
                ctx.lineTo(x + singleWidth - cornerRadius, y);
                ctx.quadraticCurveTo(x + singleWidth, y, x + singleWidth, y + cornerRadius);
                ctx.lineTo(x + singleWidth, y + singleHeight - cornerRadius);
                ctx.quadraticCurveTo(x + singleWidth, y + singleHeight, x + singleWidth - cornerRadius, y + singleHeight);
                ctx.lineTo(x + cornerRadius, y + singleHeight);
                ctx.quadraticCurveTo(x, y + singleHeight, x, y + singleHeight - cornerRadius);
                ctx.lineTo(x, y + cornerRadius);
                ctx.quadraticCurveTo(x, y, x + cornerRadius, y);
                ctx.closePath();
                ctx.fill();

                // Event Name
                ctx.fillStyle = "white";
                ctx.font = "bold 14px Arial";
                ctx.fillText(event.event, x + padding, y + padding + 14);

                // Sentiment (as stars)
                const sentimentStars = {
                    "Low Volatility Expected": "★",
                    "Moderate Volatility Expected": "★★",
                    "High Volatility Expected": "★★★",
                };
                ctx.font = "16px Arial";
                ctx.fillText(sentimentStars[event.sentiment] || event.sentiment, x + padding, y + padding + 38);

                // Forecast and Actual
                ctx.font = "12px Arial";
                ctx.fillText(`Forecast: ${data.forecast || "N/A"}`, x + padding, y + padding + 58);
                ctx.fillText(`Actual: ${data.actual || "N/A"}`, x + padding, y + padding + 76);

                // Timestamp (small, in corner)
                ctx.font = "10px Arial";
                ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
                const timeString = new Date(data.timestamp).toLocaleString();
                const timeWidth = ctx.measureText(timeString).width;
                ctx.fillText(timeString, x + singleWidth - timeWidth - padding, y + singleHeight - padding);

                ctx.restore();
            });

            // If there are more tooltips than we're showing, indicate this
            if (tooltips.length > numTooltips) {
                ctx.save();
                ctx.fillStyle = "white";
                ctx.font = "12px Arial";
                ctx.fillText(`+${tooltips.length - numTooltips} more`, startX + totalWidth + spacing, startY + singleHeight / 2);
                ctx.restore();
            }
        }
    },
};

module.exports = econEventMarker;
