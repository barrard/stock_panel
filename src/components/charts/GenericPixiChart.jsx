import React, { useRef, useEffect, useState } from "react";
import * as PIXI from "pixi.js";
import PixiData from "./pixiChart/components/DataHandler";

export default function GenericPixiChart({ ohlcDatas = [], width = 1200, height = 600, symbolInput, fullSymbolRef: fullSymbolRefProp, barTypeInput, barTypePeriodInput, loadData, Socket, onBarClick, PixiAppRef: PixiAppRefProp, PixiChartRef: PixiChartRefProp, TouchGesture1: TouchGesture1Prop, TouchGesture2: TouchGesture2Prop, newSymbolTimerRef: newSymbolTimerRefProp, loadDataRef: loadDataRefProp, lastTradesRef: lastTradesRefProp, tickSizeRef: tickSizeRefProp, ...rest }) {
    // Use provided refs or create them if not provided
    const PixiAppRef = useRef();
    const PixiChartRef = useRef();
    const TouchGesture1 = useRef();
    const TouchGesture2 = useRef();
    const newSymbolTimerRef = useRef();
    const loadDataRef = useRef();
    const lastTradesRef = useRef({});
    const tickSizeRef = useRef({});
    const fullSymbolRef = useRef();
    const [pixiData, setPixiData] = useState();

    const error = !symbolInput || typeof symbolInput !== "object" || !symbolInput.value;

    useEffect(() => {
        console.log("generic");
        if (error) return;
        if (!PixiChartRef.current) return;
        PixiAppRef.current = new PIXI.Application({
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
        if (Socket) {
            Socket.on("timeBarUpdate", (data) => {
                if (data.symbol !== _pixiData.symbol.value) return;
                // handle update
            });
        }

        return () => {
            if (PixiAppRef.current) {
                PixiAppRef.current.destroy(true, true);
                PixiAppRef.current = null;
            }
            _pixiData.destroy();
            setPixiData(null);
            if (Socket) {
                Socket.off("timeBarUpdate");
            }
        };
    }, [symbolInput, barTypeInput, barTypePeriodInput]);

    if (error) {
        return (
            <div style={{ border: "2px solid red", color: "#b91c1c", padding: 16, background: "#fef2f2" }}>
                <b>GenericPixiChart Error:</b> <br />
                <span>
                    Missing or invalid <code>symbolInput</code> prop. Please provide a symbol object with a <code>value</code> property.
                </span>
            </div>
        );
    }

    return <div ref={PixiChartRef} style={{ border: "2px solid red", width, height }} {...rest} />;
}
