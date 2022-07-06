import React, { useEffect, useState } from "react";
import API from "../API";
import Switch from "react-switch";
import styled from "styled-components";
import * as ss from "simple-statistics";

import { StockRow, DistroChart } from "./components";

import {
    allFilters,
    processDataValues,
    findDistribution,
    applyFilters,
    buildDist,
    filtersNameMap,
} from "./fundamentalsUtils";

export default function Fundamentals() {
    const [loading, setLoading] = useState(false);
    const [fundamentals, setFundamentals] = useState({});
    const [deviations, setDeviations] = useState({ mean: {}, std: {} });
    const [appliedFilters, setAppliedFilters] = useState({});
    const [filteredStocks, setFilteredStocks] = useState({});
    const [tickers, setTickers] = useState([]);
    const [distros, setDistros] = useState({});
    const [stocksFiltered, setStocksFiltered] = useState([]);
    const [masterDistros, setMasterDistros] = useState({});

    useEffect(() => {
        setLoading(true);
        API.getFundamentals().then(async (res) => {
            let tickers = await API.getTickers();
            tickers = tickers.reduce((acc, ticker) => {
                acc[ticker.symbol] = ticker;

                return acc;
            }, {});
            console.log(tickers);
            // setDataValues(processDataValues(res));
            setTickers(tickers);
            setFundamentals(res);
            setLoading(false);
            setStocksFiltered(
                Object.keys(res).filter((symbol) => !filteredStocks[symbol])
            );

            const deviations = { mean: {}, std: {} };
            const symbols = Object.keys(res);

            const masterStockDeviations = {};
            allFilters.forEach((filter) => {
                const values = symbols.map((d) => res[d][filter]);

                if (values.length === 0) return {};
                //return said value
                const mean = ss.mean(values);
                const std = ss.standardDeviation(values);
                // const simpleStd = ss.sampleStandardDeviation(values);
                // const medianAbsoluteDeviationStd =
                //     ss.medianAbsoluteDeviation(values);
                deviations.mean[filter] = mean;
                deviations.std[filter] = std;
            });

            const distros = {};
            Object.keys(deviations.mean).forEach((filter) => {
                const distro = findDistribution({
                    fundamentals: res,
                    name: filter,
                    appliedFilters,
                    deviations: deviations.std[filter],
                    mean: deviations.mean[filter],
                    filteredStocks,
                });

                const builtDist = buildDist(distro);
                distros[filter] = builtDist[filter];
                masterStockDeviations[filter] = distro[filter];
            });

            setDeviations(deviations);
            setDistros(distros);
            setMasterDistros(masterStockDeviations);
        });
    }, []);

    useEffect(() => {
        let filteredStocks = applyFilters({
            fundamentals,
            appliedFilters,
            deviations,
        });
        const distros = {};

        Object.keys(deviations.mean).forEach((filter) => {
            const distro = findDistribution({
                fundamentals,
                name: filter,
                appliedFilters,
                deviations: deviations.std[filter],
                mean: deviations.mean[filter],
                filteredStocks,
                masterDistros,
            });

            const builtDist = buildDist(distro);
            distros[filter] = builtDist[filter];
        });

        setDistros(distros);

        setFilteredStocks(filteredStocks);

        setStocksFiltered(
            Object.keys(fundamentals).filter(
                (symbol) => !filteredStocks[symbol]
            )
        );
    }, [appliedFilters]);

    return (
        <div className="container">
            <div className="white">
                <div className="row ">
                    {/* HEADER */}
                    <div className="col-sm-12 ">
                        {loading && <h2>Loading Fundamentals</h2>}
                        {!loading && (
                            <h2>
                                {Object.keys(fundamentals).length} Fundamentals
                                Loaded
                            </h2>
                        )}
                    </div>

                    {/* STOCKS LIST */}
                    <div className="col-sm-6 border">
                        <h3>TICKERS ({stocksFiltered.length})</h3>
                        <div>
                            FILTERS - {Object.keys(appliedFilters).length}
                            <div>
                                {Object.keys(appliedFilters).map((filter) => {
                                    const [min, max] = appliedFilters[filter];
                                    const name = filtersNameMap[filter].name;
                                    return (
                                        <p>{`${name}:   min:  ${min}    max:  ${max}`}</p>
                                    );
                                })}
                            </div>
                        </div>

                        {stocksFiltered.slice(0, 100).map((symbol, index) => {
                            const data = fundamentals[symbol];
                            return (
                                <StockRow
                                    key={symbol}
                                    stock={data}
                                    index={index}
                                    ticker={tickers[data.symbol]}
                                />
                            );
                        })}
                    </div>
                    {/* FILTERS */}
                    <div className="col-sm-6 border">
                        <h3>FILTERS</h3>
                        {allFilters.map((filter) => {
                            return (
                                <React.Fragment key={filter}>
                                    <DistroChart
                                        data={distros[filter]}
                                        appliedFilters={appliedFilters}
                                        setAppliedFilters={setAppliedFilters}
                                        name={filter}
                                        fundamentals={fundamentals}
                                        deviations={deviations}
                                        filteredStocks={filteredStocks}
                                        setFilteredStocks={setFilteredStocks}
                                    />

                                    <div key={filter} className="row">
                                        {filtersNameMap[filter].name}
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
