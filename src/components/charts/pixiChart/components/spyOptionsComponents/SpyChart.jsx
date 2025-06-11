import React from "react";

export default function SpyChart() {
    return <div>SpyChart</div>;
}

// import React from "react";

// export default function SpyChart() {
//     const [openTradeWindow, setOpenTradeWindow] = useState(false);
//     const [mouseEnter, setMouseEnter] = useState(false);
//     const [touchMoveEvent, setTouchMoveEvent] = useState(false);
//     const [touch, setTouch] = useState(false);
//     // const [move, setMove] = useState(false);
//     const [gesture, setIsGesture] = useState(false);
//     const [touch1, setTouch1] = useState(false);
//     const [touch2, setTouch2] = useState(false);
//     const [longPressTimer, setLongPressTimer] = useState(false);
//     const [longPress, setLongPress] = useState(false);

//     useEffect(() => {
//         console.log("START PIXI CHART");
//         //request data
//         if (ohlcDatas.length === 0) {
//             // loadData({
//             //     finishIndex: new Date().getTime(), // - 1000 * 60 * 60 * 24,
//             // });
//         }

//         PixiAppRef.current = new PIXI.Application({
//             width,
//             // height,
//             backgroundColor: 0x333333,
//             antialias: true,
//             resolution: window.devicePixelRatio || 1,
//             autoDensity: true,
//         });
//         PixiAppRef.current.view.style["image-rendering"] = "pixelated";

//         PixiAppRef.current.stage.interactive = true;

//         // On first render add app to DOM
//         PixiChartRef.current.appendChild(PixiAppRef.current.view);
//         PixiChartRef.current?.addEventListener(
//             "mousewheel",
//             (e) => {
//                 e.preventDefault();
//             },
//             { passive: false }
//         );
//         const pixiData = new PixiData({
//             ohlcDatas,
//             // viewPort: viewportRef.current,
//             pixiApp: PixiAppRef.current,
//             loadData,
//             width,
//             symbol: symbolInput,
//             fullSymbol: fullSymbolRef,
//             barType: barTypeInput,
//             barTypePeriod: barTypePeriodInput,
//             // height,
//             // volHeight,
//             // tickSize: 0.25,
//             // timeframe,
//             margin: {
//                 top: 50,
//                 right: 100,
//                 left: 0,
//                 bottom: 40,
//             },
//         });

//         setPixiData(pixiData);

//         Socket.on("rapi-message", (message) => {
//             toastr.success(message);
//         });

//         Socket.on("compileHistoryTracker", ({ lastTwoDaysCompiled, lastWeeklyData, combinedKeyLevels }) => {
//             // console.log(lastTwoDaysCompiled);
//             setLastTwoDaysCompiled({
//                 lastTwoDaysCompiled,
//                 lastWeeklyData,
//                 combinedKeyLevels,
//             });
//             pixiData.setLastTwoDaysCompiled({
//                 lastTwoDaysCompiled,
//                 lastWeeklyData,
//                 combinedKeyLevels,
//             });
//         });

//         console.log("Emitting getCompileHistoryTracker");
//         Socket.emit("getCompileHistoryTracker");

//         Socket.on("orderCancelled", (data) => {
//             console.log("orderCancelled");

//             console.log(data);
//         });

//         Socket.on("PlantStatus", (d) => {
//             setPlantStatus((plantStatus) => ({
//                 ...plantStatus,
//                 [d.name]: true,
//             }));
//         });

//         Socket.on("timeBarUpdate", (data) => {
//             if (data.symbol !== pixiData.symbol.value) return;
//             setCurrentTimeBar(data);
//         });

//         return () => {
//             console.log("DESTROY PIXI CHART");

//             // On unload stop the application
//             PixiAppRef.current.destroy(true, true);
//             PixiAppRef.current = null;
//             pixiData.destroy();
//             setPixiData(false);
//             // Socket.off("rapi-message");
//             // Socket.off("PlantStatus");

//             // Socket.off("orderTracker");
//             // Socket.off("ordersShown");
//             // Socket.off("lastTwoDaysCompiled");
//             // Socket.off("timeBarUpdate");
//             //BACK TESTER
//             // Socket.off("backtester-bars");

//             // setDrawMarketProfile(false);
//             // setDrawOrderBook(false);
//             // setDrawOrders(false);
//             // setDrawPivotLines(false);
//             // setDrawZigZag(false);
//         };
//     }, [symbol]);

//     const clearLongPress = () => {
//         clearInterval(longPressTimer);
//         setLongPressTimer(false);
//         setLongPress(false);
//         setMouseEnter(false);
//     };
//     const checkGesture = (e) => {
//         if (e.touches.length === 2) {
//             TouchGesture1.current = e.touches[0];
//             TouchGesture2.current = e.touches[1];
//             setIsGesture(true);
//             clearLongPress();
//             pixiData.gesture = true;
//             return true;
//         }
//     };
//     return (
//         <div
//             className="col-10"
//             onContextMenu={(e) => {
//                 e.preventDefault();
//                 console.log(`onContextMenu ${openTradeWindow}`);
//                 setOpenTradeWindow((v) => !v);
//             }}
//             onMouseEnter={(e) => {
//                 setMouseEnter(true);
//             }}
//             onTouchMove={(e) => {
//                 setTouchMoveEvent(e);
//                 checkGesture(e);
//             }}
//             onTouchStart={(e) => {
//                 checkGesture(e);
//                 setTouch(true);
//                 setMouseEnter(false);
//                 pixiData.touches++;

//                 if (!longPressTimer) {
//                     const _longPressTimer = setTimeout(() => {
//                         console.log("long press");
//                         setLongPress(true);
//                         setMouseEnter(true);
//                     }, 1000);

//                     setLongPressTimer(_longPressTimer);
//                 }
//             }}
//             onTouchEnd={() => {
//                 setTouch(false);
//                 clearGesture();
//                 setTouchMoveEvent(false);
//                 setTouch1(false);
//                 setTouch2(false);
//                 setZoomGesture(false);
//                 clearLongPress();
//                 pixiData.touches--;
//             }}
//             onMouseLeave={() => {
//                 clearLongPress();
//                 setMouseEnter(false);
//                 setLongPress(false);
//                 setOpenTradeWindow(false);
//             }}
//             onPointerEnter={() => setMouseEnter(true)}
//             onPointerLeave={() => setMouseEnter(false)}
//             onWheel={(e) => {
//                 if (e.deltaY > 0) {
//                     // console.log("The user scrolled up");
//                     pixiData.zoomOut("scroll");
//                 } else {
//                     // console.log("The user scrolled down");
//                     pixiData.zoomIn("scroll");
//                 }
//             }}
//             ref={PixiChartRef}
//             style={{
//                 border: "2px solid red",
//             }}
//         />
//     );
// }
