import React, { useRef, useEffect, useState } from "react";
// Import your PixiData class and any other dependencies as needed
import PixiData from "./pixiChart/components/DataHandler";

export default function GenericPixiChart({
    ohlcDatas = [],
    width = 1200,
    height = 600,
    symbolInput,
    fullSymbolRef,
    barTypeInput,
    barTypePeriodInput,
    loadData,
    Socket,
    onBarClick,
    ...rest
}) {
    const PixiAppRef = useRef();
    const PixiChartRef = useRef();
    const [pixiData, setPixiData] = useState();

    useEffect(() => {
        PixiAppRef.current = new window.PIXI.Application({
            width,
            height,
            backgroundColor: 0x333333,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
        });
        PixiAppRef.current.view.style["image-rendering"] = "pixelated";
        PixiAppRef.current.stage.interactive = true;
        PixiChartRef.current.appendChild(PixiAppRef.current.view);

        const _pixiData = new PixiData({
            ohlcDatas,
            pixiApp: PixiAppRef.current,
            loadData,
            width,
            symbol: symbolInput,
            fullSymbol: fullSymbolRef,
            barType: barTypeInput,
            barTypePeriod: barTypePeriodInput,
            margin: { top: 50, right: 100, left: 0, bottom: 40 },
        });
        setPixiData(_pixiData);

        // Example: attach socket events if needed
        if (Socket) {
            Socket.on("timeBarUpdate", (data) => {
                if (data.symbol !== _pixiData.symbol.value) return;
                // handle update
            });
        }

        return () => {
            PixiAppRef.current.destroy(true, true);
            PixiAppRef.current = null;
            _pixiData.destroy();
            setPixiData(null);
            if (Socket) {
                Socket.off("timeBarUpdate");
            }
        };
    }, [ohlcDatas, width, height, symbolInput, barTypeInput, barTypePeriodInput, loadData, Socket, fullSymbolRef]);

    // Add event handlers as needed, e.g. onBarClick, onWheel, etc.

    return (
        <div
            ref={PixiChartRef}
            style={{ border: "2px solid red", width, height }}
            {...rest}
        />
    );
}
