import React, { useState, useRef, useEffect } from "react";
import styled from "styled-components";
import { toastr } from "react-redux-toastr";
import Socket from "../Socket";
import StratContext from "./StratContext";
import API from "../API";

import {
    AddStratModal,
    StrategiesList,
    AddThingBtn,
    StratListContainer,
    StrategyWindow,
    Title,
    Container,
    Chart,
    RealDataSources,
} from "./components";

import { updateConditionalsResults } from "./components/Conditionals/components/utils";
import { checkSymbol } from "./components/utilFuncs";

export default function StratBuilder() {
    const [newStrategyName, setNewStrategyName] = useState("");
    const [strategies, setStrategies] = useState([]);
    const [priceDatas, setPriceDatas] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [creatingStrat, setCreatingStrat] = useState(false);
    const [selectedStrat, setSelectedStrat] = useState(false);
    const [updatingIndicator, setUpdatingIndicator] = useState(false);
    const [charts, setCharts] = useState({});
    const [indicatorList, setIndicatorList] = useState([]);
    const [indicatorResults, setIndicatorResults] = useState({});
    const [conditionals, setConditionals] = useState([]);
    // const [applyToChart, setApplyToChart] = useState(false)
    const [chartConditionals, setChartConditionals] = useState({});

    const [TS, setTS] = useState(null);

    useEffect(() => {
        //fetch strats
        API.getStrategies()
            .then((strats) => setStrategies([...strats]))
            .catch((e) => console.log(e));

        //fetch price datas
        API.getPriceDatas()
            .then((priceDatas) => setPriceDatas([...priceDatas]))
            .catch((e) => console.log(e));

        //fetch price datas
        API.getIndicatorList()
            .then((list) => setIndicatorList([...list]))
            .catch((e) => console.log(e));

        API.getConditionals()
            .then((list) => setConditionals([...list]))
            .catch((e) => console.log(e));

        //conect to sockets

        Socket.on("CHART_FUTURES", (data) => {
            console.log(data);
        });

        Socket.on("timeAndSales", (timeAndSales) => {
            // console.log(timeAndSales);
        });

        return () => {
            Socket.off("CHART_FUTURES");

            Socket.off("timeAndSales");
        };
    }, []);

    const submitNewStrat = async () => {
        try {
            //hit API and set loading
            setCreatingStrat(true);
            let newStrat = await API.addStrategy({ name: newStrategyName });
            if (newStrat) {
                setNewStrategyName("");
                setStrategies([...strategies, newStrat]);
            }

            setCreatingStrat(false);
            setShowModal(false);
        } catch (err) {
            setCreatingStrat(false);
            setShowModal(false);

            console.log(err);
        }
    };

    const updateStrat = (strat) => {
        let index = strategies.findIndex(({ _id }) => _id == strat._id);
        strategies[index] = strat;
        //adding price data would only occur to the selected strat
        setSelectedStrat(strat);
        setStrategies([...strategies]);
    };

    const addChart = async ({ symbol, timeframe, _id }) => {
        if (!charts[symbol]) {
            charts[symbol] = {};
            indicatorResults[symbol] = {};
        }
        //if this is a stock lets stop right here
        if (checkSymbol(symbol).isStock) {
            let data = await API.getTheStockData({ symbol, frame: timeframe });

            if (!data.length)
                return toastr.error(`No data found for ${timeframe} ${symbol}`);
            const tf = timeframe;

            indicatorResults[symbol][tf] = {};
            charts[symbol][tf] = {};
            charts[symbol][tf].data =
                data.map((d) => ({ ...d, timestamp: d.datetime })) || [];
            charts[symbol][tf].id = _id;
            charts[symbol][tf].conditionals = {};
            // charts[symbol][tf].stats = data[`${tf}Stats`];
            // charts[symbol][tf].priceLevels = data[`${tf}PriceLevels`];
            // charts[symbol][tf].volAvg = data[`${tf}VolAvg`];

            setCharts({ ...charts });
            return;
        }

        if (!charts[symbol][timeframe]) {
            charts[symbol][timeframe] = {};
            indicatorResults[symbol][timeframe] = {};
        }

        if (!charts[symbol][timeframe].data) {
            //load data
            let data = await API.getBackTestData({ symbol, timeframe });
            console.log(data);
            charts[symbol][timeframe].data = data;
            charts[symbol][timeframe].id = _id;
            charts[symbol][timeframe].conditionals = {};
        }

        setCharts({ ...charts });
    };

    const addChartConditionalsData = (c) => {
        for (let s in charts) {
            for (let t in charts[s]) {
                //  = c

                // if (!charts[s][t].conditionalsResults) {
                //   charts[s][t].conditionalsResults = [
                //     ...charts[s][t].data.map(() => false),
                //   ]
                // }
                let { data } = charts[s][t];
                //finally now can we calc it?
                let newConditionalsResults = updateConditionalsResults(
                    c,
                    data,
                    indicatorResults,
                    charts
                );
                charts[s][t].conditionals[c._id] = newConditionalsResults;
                console.log({ newConditionalsResults });
                console.log(charts);
            }
        }

        setCharts({ ...charts });
    };

    const removeChartConditionalsData = (c) => {
        for (let s in charts) {
            for (let t in charts[s]) {
                delete charts[s][t].conditionals[c._id];
            }
        }
        setCharts({ ...charts });
    };

    const deleteIndicatorResults = ({ symbol, timeframe, indicator }) => {
        delete indicatorResults[symbol][timeframe][indicator._id];
        setIndicatorResults({ ...indicatorResults });
    };
    const updateIndicatorResults = ({
        indicator,
        result,
        symbol,
        timeframe,
    }) => {
        try {
            if (!indicator || !indicator._id)
                return console.log("you done fucked up");
            if (!indicatorResults[symbol]) indicatorResults[symbol] = {};
            if (!indicatorResults[symbol][timeframe])
                indicatorResults[symbol][timeframe] = {};
            indicatorResults[symbol][timeframe][indicator._id] = {
                indicator,
                result,
            };

            //   console.log(indicatorResults)
            setIndicatorResults({ ...indicatorResults });
        } catch (err) {
            console.error(err);
        }
    };
    //   console.log(charts)
    //   console.log(indicatorResults)
    const GLOBAL = {
        API,
        addChart,
        addChartConditionalsData,
        // applyToChart,
        charts,
        chartConditionals,
        conditionals,
        creatingStrat,
        deleteIndicatorResults,
        indicatorList,
        indicatorResults,
        setIndicatorList,
        newStrategyName,
        priceDatas,
        removeChartConditionalsData,
        selectedStrat,
        // setApplyToChart,
        setCharts,
        setChartConditionals,
        setConditionals,
        setCreatingStrat,
        setIndicatorResults,
        setNewStrategyName,
        setPriceDatas,
        setSelectedStrat,
        setShowModal,
        setStrategies,
        setUpdatingIndicator,
        showModal,
        strategies,
        submitNewStrat,
        updateStrat,
        updatingIndicator,
        updateIndicatorResults,
    };

    return (
        <StratContext.Provider value={GLOBAL}>
            <Container>
                {/* Title */}
                <Title title="Strategy Builder" />
                {/* List of Strategies on the side */}
                <StratListContainer>
                    {/* Button to add Strategy */}
                    <AddThingBtn
                        name={showModal ? "Cancel" : "Create New Strategy"}
                        onClick={() => setShowModal(!showModal)}
                    />
                    {showModal && <AddStratModal />}
                    <StrategiesList
                        strategies={strategies}
                        selectStrat={setSelectedStrat}
                    />
                </StratListContainer>
                {selectedStrat && <StrategyWindow />}
                <div style={{ display: "flex" }}>
                    <div>
                        {!!Object.keys(charts).length &&
                            Object.keys(charts).map((symbol) =>
                                Object.keys(charts[symbol])
                                    .map((timeframe) => (
                                        <ChartsContainer
                                            key={`${symbol}${timeframe}`}
                                        >
                                            <Chart
                                                symbol={symbol}
                                                timeframe={timeframe}
                                            />
                                        </ChartsContainer>
                                    ))
                                    .flat()
                            )}
                    </div>
                    <div>
                        {selectedStrat && Object.keys(charts).length > 0 && (
                            <RealDataSources />
                        )}
                    </div>
                </div>
            </Container>
        </StratContext.Provider>
    );
}

const ChartsContainer = styled.div`
    border: 1px solid green;
    width: 100%;
`;
