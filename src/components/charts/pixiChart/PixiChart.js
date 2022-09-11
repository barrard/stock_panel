import React, { useRef, useEffect, useState } from "react";
import API from "../../../components/API";
import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";

import { axisBottom, axisRight, axisLeft, axisTop } from "d3-axis";
// import { scaleLinear, scaleTime, scaleBand } from "d3-scale";
import { extent, scaleLinear, select, zoom, zoomTransform, mouse } from "d3";

import PixiData from "./components/DataHandler";

export default function PixiChart() {
    const [width, setWidth] = useState(window.innerWidth * 0.9);
    const [height, setHeight] = useState(600);
    const [volHeight, setVolHeight] = useState(300);
    const [mouseEnter, setMouseEnter] = useState(false);
    const [pixiData, setPixiData] = useState();

    const PixiAppRef = useRef();
    const PixiChartRef = useRef();
    // const xScaleRef = useRef();
    // const volProfileScaleRef = useRef();
    // const priceScaleRef = useRef();
    // const volScaleRef = useRef();
    // const graphicsRef = useRef();
    // const viewportRef = useRef();
    // graphicsRef.current = new PIXI.Graphics();

    // const [tickLine, setTickLine] = useState([]);
    const [ohlcDatas, setOhlcDatas] = useState([]);
    const [loading, setLoading] = useState(false);

    //Fn to load data
    const loadData = () => {
        console.log("Loading data");
        setLoading(true);
        API.getBackTestData({ symbol: "/ES", timeframe: "1Min" }).then(
            (ohlcDatas) => {
                console.log(ohlcDatas);
                setOhlcDatas(ohlcDatas);

                setLoading(false);
            }
        );
    };

    //on load get data
    useEffect(() => {
        //request data
        if (ohlcDatas.length === 0) {
            loadData();
        }
        PixiAppRef.current = new PIXI.Application({
            width,
            height,
            backgroundColor: 0x333333,
            // antialias: true,
        });
        PixiAppRef.current.stage.interactive = true;

        // On first render add app to DOM
        PixiChartRef.current.appendChild(PixiAppRef.current.view);

        // // create viewport
        // viewportRef.current = new Viewport({
        //     screenWidth: width,
        //     screenHeight: height,
        //     worldWidth: width,
        //     worldHeight: height,
        //     interaction: PixiAppRef.current.renderer.plugins.interaction, // the interaction module is important for wheel to work properly when renderer.view is placed or scaled
        //     passiveWheel: false,
        //     stopPropagation: true,
        // }); //.clamp({ top: 0, left: 0, right: 8000, bottom: 8000 });

        // viewportRef.current
        //     .drag()
        //     .wheel()
        //     .pinch()
        //     .decelerate()
        //     .on("clicked", console.log);

        // //Zoom and pan events
        // viewportRef.current.on("zoomed", ({ type, viewport }) => {
        //     console.log("hitArea");
        //     console.log(viewport.hitArea);
        //     console.log("lastViewport");
        //     console.log(viewport.lastViewport);
        //     viewport.scaleY = 0;
        //     viewport.scaleX = 0;
        // });

        // // viewportRef.current.on("moved", ({ type, viewport }) => {
        // //     console.log("hitArea");
        // //     console.log(viewport.hitArea);
        // //     console.log("lastViewport");
        // //     console.log(viewport.lastViewport);
        // // });

        // PixiAppRef.current.stage.addChild(viewportRef.current);

        return () => {
            // On unload stop the application
            PixiAppRef.current.destroy(true, true);
        };
    }, []);

    useEffect(() => {
        if (!pixiData) return console.log("no pixidata?");
        if (mouseEnter) {
            pixiData.showCrosshair();
        } else {
            pixiData.hideCrosshair();
        }
    }, [mouseEnter]);

    //Fn to handle new data
    useEffect(() => {
        if (!ohlcDatas.length) return;
        const pixiData = new PixiData({
            ohlcDatas,
            // viewPort: viewportRef.current,
            pixiApp: PixiAppRef.current,
            width,
            height,
            volHeight,
        });
        pixiData.init();
        pixiData.draw();
        setPixiData(pixiData);
    }, [ohlcDatas]);

    const draw = () => {
        // var stage = new PIXI.Container();
    };

    return (
        <>
            {loading && <> LOADING......</>}
            <div
                onMouseEnter={() => setMouseEnter(true)}
                onMouseLeave={() => setMouseEnter(false)}
                onPointerEnter={() => setMouseEnter(true)}
                onPointerLeave={() => setMouseEnter(false)}
                onWheel={(e) => {
                    if (e.deltaY > 0) {
                        // console.log("The user scrolled up");
                        pixiData.zoomOut(e.deltaY);
                    } else {
                        // console.log("The user scrolled down");
                        pixiData.zoomIn(e.deltaY);
                    }
                }}
                ref={PixiChartRef}
                style={{
                    // padding: "0 9em",
                    width,
                    height,
                    border: "2px solid red",
                }}
            />
        </>
    );
}
