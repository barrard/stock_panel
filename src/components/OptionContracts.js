import React, { useState } from "react";
import { connect } from "react-redux";
import { toastr } from "react-redux-toastr";
import { withRouter } from "react-router";
import styled from "styled-components";
import { getOpAlerts } from "../redux/actions/opActions.js";
import API from "./API.js";
import OptionsChart from "./charts/OptionsChart.js";
import Switch from "react-switch";
// import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faFileExcel,
    faFileExport,
    faFileDownload,
} from "@fortawesome/free-solid-svg-icons";

// import {ensure_not_loggedin} from '../components/utils/auth.js'
import { histogram } from "d3-array";

const CHART_WIDTH_REDUCER = 0.9;
class OpAlerts extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            symbol: props.match.params.symbol,
            selectedContractRef: null,
            // filter_symbol: "",
            filter_dateTime: "",
            filter_daysToExpiration: "",
            filter_exp: "",
            filter_last: "",
            filter_maxPL: "",
            filter_maxPercentPL: "",
            filter_PL: "",
            filter_percOTM: "",
            filter_percentPL: "",
            filter_strike: "",
            filter_totalVolume: "",
            filter_volumeIncrease: "",

            filter_underlying: "",
            selectedAlerts: [],
            snapshots: {}, //AML_EXP_CALL_44
            includeExpiredContracts: false,

            lessThan_last: true,
            lessThan_percOTM: true,
            lessThan_volumeIncrease: true,
            lessThan_totalVolume: true,
            lessThan_underlying: true,
            lessThan_maxPercentPL: true,
            lessThan_maxPL: true,
            lessThan_exp: true,
            sortBy: "dateTime",
            sortOrder: true,
            filterNames: [
                "daysToExpiration",
                "dateTime",
                "exp",
                "last",
                "maxPL",
                "maxPercentPL",
                "PL",
                "percOTM",
                "percentPL",
                // "symbol",
                "totalVolume",
                "volumeIncrease",
                "underlying",
            ],
        };
        this.resetFilters = this.resetFilters.bind(this);
    }

    componentDidMount() {
        this.props.dispatch(getOpAlerts(this.state.symbol));
        this.setChartWidth();
        window.addEventListener("resize", this.setChartWidth.bind(this));
    }
    componentWillUnmount() {
        window.removeEventListener("resize", this.setChartWidth);
    }
    setChartWidth() {
        this.setState({
            chartWidth: window.innerWidth * CHART_WIDTH_REDUCER,
        });
    }

    dropDownSelect(name, values, label) {
        let selects = values.map((v, iV) => {
            return (
                <option key={iV} value={v}>
                    {v}
                </option>
            );
        });
        let firstOption = (
            <option
                key={`Select ${label}`}
                // selected={true}
                // disabled={true}
                value={``}
            >{`Select ${label}`}</option>
        );
        selects = [firstOption, ...selects];
        return (
            <div className="optionFilterSelect">
                {/* <div className='row flex_center'> */}

                {/* <div className='col-sm-6 flex_center'> */}
                {(name === "last" ||
                    name === "maxPL" ||
                    name === "maxPercentPL" ||
                    name === "exp" ||
                    name === "percOTM" ||
                    name === "volumeIncrease" ||
                    name === "underlying" ||
                    name === "totalVolume") && (
                    <>
                        <Switch
                            className="filterSwitch"
                            onChange={() => {
                                let lessThan = this.state[`lessThan_${name}`];
                                this.setState({
                                    [`lessThan_${name}`]: !lessThan,
                                });
                            }}
                            checked={this.state[`lessThan_${name}`]}
                            offColor="#333"
                            onColor="#333"
                            width={111}
                            height={30}
                            checkedIcon={
                                <span
                                    style={{
                                        textShadow: "rgb(1,1,1) 0px 0px 1px",
                                        width: "6em",
                                        display: "flex",
                                        justifyContent: "center",
                                        alignItems: "center",
                                        height: "100%",
                                        fontWeight: 900,
                                        fontSize: 12,
                                        color: "red",
                                        paddingLeft: "1em",
                                    }}
                                >
                                    Less Than
                                </span>
                            }
                            uncheckedIcon={
                                <div
                                    style={{
                                        textShadow: "rgb(1,1,1) 0px 0px 1px",
                                        display: "flex",
                                        justifyContent: "center",
                                        alignItems: "center",
                                        height: "100%",
                                        fontWeight: 900,
                                        fontSize: 12,
                                        color: "green",
                                        whiteSpace: "nowrap",
                                        paddingRight: "3em",
                                    }}
                                >
                                    Greater Than
                                </div>
                            }
                        />
                    </>
                )}
                {/* </div> */}
                {/* <div className='col-sm-6 flex_center'> */}
                <select
                    className="darkDropDown"
                    defaultValue={this.state[`filter_${name}`]}
                    onChange={(e) => {
                        this.setState({
                            [`filter_${name}`]: e.target.value,
                        });
                    }}
                    name={name}
                >
                    {selects}
                </select>
            </div>
            // </div>

            // </div>
        );
    }
    //display to the user which filters are used
    showFilters() {
        return (
            <div className="full-width filterHover dynamicText flex_center">
                {this.state.filterNames.map((f) => {
                    if (this.state[`filter_${f}`] === "") return;
                    return (
                        <div key={f} className="row flex_center">
                            {this.state[`filter_${f}`] && (
                                <div key={f} className="col flex_center">
                                    <div className="row flex_center">
                                        <div className="col-sm-12 flex_center sm-title">
                                            {filterTitle(f)}
                                        </div>
                                        <div className="col-sm-12 flex_center">
                                            {/* LESS THAN LABEL */}
                                            {this.state[`filter_${f}`] !== "" &&
                                                this.state[`lessThan_${f}`] && (
                                                    <div>
                                                        <span className="red">
                                                            Less
                                                        </span>{" "}
                                                        Than{" "}
                                                        {
                                                            this.state[
                                                                `filter_${f}`
                                                            ]
                                                        }
                                                    </div>
                                                )}
                                            {/* GREATER THAN LABEL */}
                                            {this.state[`filter_${f}`] !== "" &&
                                                typeof this.state[
                                                    `lessThan_${f}`
                                                ] !== undefined &&
                                                this.state[`lessThan_${f}`] ===
                                                    false && (
                                                    <div>
                                                        <span className="green">
                                                            Greater
                                                        </span>{" "}
                                                        Than{" "}
                                                        {
                                                            this.state[
                                                                `filter_${f}`
                                                            ]
                                                        }
                                                    </div>
                                                )}
                                            {/* EQUAL TO LABEL */}
                                            {this.state[`filter_${f}`] !== "" &&
                                                (f === "symbol" ||
                                                    f === "dateTime") && (
                                                    <div>
                                                        {/* <span className="yellow">Equal</span> Than{" "} */}
                                                        {
                                                            this.state[
                                                                `filter_${f}`
                                                            ]
                                                        }
                                                    </div>
                                                )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }

    filterAlerts(alerts) {
        let that = this;
        this.state.filterNames.forEach((f) => {
            let filterValue = this.state[`filter_${f}`];
            // console.log(filterValue);
            if (filterValue) {
                // console.log(`got ${filterValue} for filter_${f}`);
                if (f === "exp") {
                    filterValue = new Date(filterValue).getTime();
                    alerts = alerts.filter((a) => {
                        let filteredArray = false;
                        let alertExp = new Date(a.exp).getTime();
                        // a.alerts.forEach((a) => {
                        if (this.state[`lessThan_exp`]) {
                            if (alertExp <= filterValue) filteredArray = true;
                        } else {
                            if (alertExp >= filterValue) filteredArray = true;
                        }
                        // });
                        if (filteredArray) return true;
                    });
                } else if (f === "dateTime") {
                    filterValue = new Date(filterValue)
                        .toLocaleString()
                        .split(",")[0];
                    alerts = alerts.filter((a) => {
                        let filteredArray = false;
                        // a.alerts.forEach((a) => {
                        let dateTime = new Date(a.dateTime)
                            .toLocaleString()
                            .split(",")[0];
                        if (dateTime == filterValue) filteredArray = true;
                        // });
                        if (filteredArray) return true;
                    });
                } else if (f === "daysToExpiration") {
                    alerts = alerts.filter(
                        (a) => a.daysToExpiration === parseInt(filterValue)
                    );
                } else {
                    alerts = filterByFilter(f, alerts);
                }

                function filterByFilter(filter, alerts) {
                    alerts = alerts.filter((a) => {
                        let filteredArray = false;
                        if (that.state[`lessThan_${filter}`]) {
                            if (a[filter] <= filterValue) filteredArray = true;
                        } else {
                            if (a[filter] >= filterValue) filteredArray = true;
                        }
                        if (filteredArray) return true;
                    });
                    return alerts;
                }
            }
        });
        return alerts;
    }

    resetFilters() {
        this.state.filterNames.forEach((fn) => {
            this.setState({
                [`filter_${fn}`]: "",
            });
        });
    }
    async getAlert(symbol, exp, strike, putCall, timestamp) {
        let alertDay = new Date(timestamp).toLocaleString().split(",")[0];
        let {
            selectedSymbol,
            selectedExp,
            selectedStrike,
            selectedPutCall,
            selectedAlertDay,
        } = this.state;
        if (
            selectedSymbol === symbol &&
            selectedExp === exp &&
            selectedStrike === strike &&
            selectedPutCall === putCall &&
            selectedAlertDay === alertDay
        ) {
            return this.setState({
                snapData: [],
                selectedSymbol: "",
                selectedExp: "",
                selectedStrike: "",
                selectedPutCall: "",
                selectedAlertDay: "",
                selectedAlerts: [],
            });
        }

        //HELPER FUNCTION SHOULD GO SOMEWHERE ELSE
        //TODO
        function fallbackCopyTextToClipboard(text) {
            var textArea = document.createElement("textarea");
            textArea.value = text;

            // Avoid scrolling to bottom
            textArea.style.top = "0";
            textArea.style.left = "0";
            textArea.style.position = "fixed";

            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            try {
                var successful = document.execCommand("copy");
                var msg = successful ? "successful" : "unsuccessful";
                console.log("Fallback: Copying text command was " + msg);
            } catch (err) {
                console.error("Fallback: Oops, unable to copy", err);
            }

            document.body.removeChild(textArea);
        }
        //HELPER FUNCTION SHOULD GO SOMEWHERE ELSE
        //TODO
        function copyTextToClipboard(text) {
            if (!navigator.clipboard) {
                fallbackCopyTextToClipboard(text);
                return;
            }
            navigator.clipboard.writeText(text).then(
                function () {
                    console.log("Async: Copying to clipboard was successful!");
                },
                function (err) {
                    console.error("Async: Could not copy text: ", err);
                }
            );
        }
        let opString = `${symbol} ${exp} ${
            putCall === "CALL" ? "c" : "p"
        } @$${strike}`;

        copyTextToClipboard(opString);

        let alerts = this.props.options.alerts;
        let snapData = await API.fetchOpAlertData({
            symbol,
            strike,
            exp,
            putCall,
        });
        let allSnaps = [];

        //the database has a conflict, this code may be able to be changed TODO
        snapData.forEach((a) => {
            if (a.snaps) {
                a.snaps.forEach((snap) => allSnaps.push(snap));
            } else if (a.opDataSnaps) {
                //should be snaps, not this
                a.opDataSnaps.forEach((snap) => allSnaps.push(snap));
            }
        });
        allSnaps = allSnaps.sort((a, b) => a.timestamp - b.timestamp);
        alerts = alerts.filter((a) => {
            if (
                a.symbol === symbol &&
                a.exp === exp &&
                a.strike === strike &&
                a.putCall === putCall
            ) {
                return a;
            }
        });
        console.log(allSnaps);
        this.scrollToId("selectedContractChart");
        this.setState({
            snapData: allSnaps,
            selectedSymbol: symbol,
            selectedExp: exp,
            selectedStrike: strike,
            selectedPutCall: putCall,
            selectedAlertDay: alertDay,
            selectedAlerts: alerts,
        });
    }

    FilterSelect(label, name, array) {
        return (
            <div className="col-sm-4 flex_center">
                <div className="row ">
                    <div className="col-sm-12 flex_center">
                        <h4>{label} </h4>
                    </div>
                    <div className="col-sm-12 flex_center">
                        {this.dropDownSelect(name, array, label)}
                    </div>
                </div>
            </div>
        );
    }

    sortBy(key) {
        let { sortOrder } = this.state;
        this.setState({ sortBy: key, sortOrder: !sortOrder });
    }
    scrollToId = (id) => {
        setTimeout(() => {
            const yOffset = -40;
            const element = document.getElementById(id);
            const y =
                element.getBoundingClientRect().top +
                window.pageYOffset +
                yOffset;

            window.scrollTo({ top: y, behavior: "smooth" });
        }, 0);
    };

    makeTable(alerts) {
        let header = (
            <div key={"header"} className="col-sm-12 flex_center">
                <div className="full-width">
                    <div className="row flex_center">
                        <div className="col flex_center sm-title p-0">#</div>
                        <div
                            onClick={() => this.sortBy("putCall")}
                            className="col flex_center sm-title p-0"
                        >
                            Put/Call
                        </div>

                        <div
                            onClick={() => this.sortBy("daysToExpiration")}
                            className="col flex_center sm-title p-0"
                        >
                            Days to Expire
                        </div>
                        <div
                            onClick={() => this.sortBy("percOTM")}
                            className="col flex_center sm-title p-0"
                        >
                            % OTM
                        </div>
                        <div
                            onClick={() => this.sortBy("volumeIncrease")}
                            className="col flex_center sm-title p-0"
                        >
                            Vol Increase
                        </div>
                        <div
                            onClick={() => this.sortBy("last")}
                            className="col flex_center sm-title p-0"
                        >
                            Alert Price
                        </div>
                        <div
                            onClick={() => this.sortBy("maxPercentPL")}
                            className="col flex_center sm-title p-0"
                        >
                            Max %PL
                        </div>
                    </div>
                </div>
            </div>
        );
        //for each alert, get one row
        //
        let rows = alerts.map((a, iA) => {
            let { underlyingPrice, maxPL, maxPercentPL } = a;
            let {
                selectedExp,
                selectedStrike,
                selectedSymbol,
                selectedPutCall,
                chartWidth,
                selectedAlerts,
                selectedAlertDay,
            } = this.state;
            let alertDate = new Date(a.timestamp)
                .toLocaleString()
                .split(",")[0];
            let selectedContract =
                selectedExp === a.exp &&
                selectedStrike === a.strike &&
                selectedSymbol === a.symbol &&
                selectedAlertDay === alertDate &&
                selectedPutCall === a.putCall;
            return (
                <div key={iA} className="col-sm-12 flex_center">
                    <div className="full-width">
                        <div
                            onClick={() =>
                                this.getAlert(
                                    a.symbol,
                                    a.exp,
                                    a.strike,
                                    a.putCall,
                                    a.timestamp
                                )
                            }
                            className={`hoverable clickable row flex_center ${
                                selectedContract ? "selectedContract" : " "
                            } `}
                        >
                            <div className={`col flex_center p-0`}>
                                {iA + 1}
                            </div>
                            <div className={`col flex_center p-0`}>
                                {a.putCall}
                            </div>
                            <div className={`col flex_center`}>
                                {a.daysToExpiration}
                            </div>
                            <div className={`col flex_center p-0`}>
                                {a.percOTM}
                            </div>
                            <div className={`col flex_center p-0`}>
                                {a.volumeIncrease}
                            </div>
                            <div className={`col flex_center p-0`}>
                                {a.last}
                            </div>
                            <div className={`col flex_center p-0`}>
                                {maxPercentPL}
                            </div>
                            {selectedContract && (
                                <div
                                    id="selectedContractChart"
                                    className="floating "
                                >
                                    {
                                        <OptionsChart
                                            width={chartWidth}
                                            alertDay={selectedAlertDay}
                                            alerts={selectedAlerts}
                                            symbol={selectedSymbol}
                                            exp={selectedExp}
                                            strike={selectedStrike}
                                            putCall={selectedPutCall}
                                            data={this.state.snapData}
                                        />
                                    }
                                    {selectedAlerts &&
                                        selectedAlerts.map(this.ShowAllAlerts)}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        });

        return [header, ...rows];
    }

    ShowAllAlerts = (a, iA) => {
        return (
            <>
                {/* <div className="full-width"> */}
                <div
                    key={iA}
                    className="row flex_center opAlertData dynamicText"
                >
                    {/* <div className="col flex_center">
              putCall: {a.putCall}
            </div> */}
                    <AlertDetails
                        title="Alert Date"
                        col={12}
                        value={new Date(a.timestamp).toLocaleString()}
                    />
                    <AlertDetails title="Strike" col={12} value={a.strike} />
                    <AlertDetails title="Exp" col={12} value={a.exp} />
                    <AlertDetails title="Alert Price" col={12} value={a.last} />
                    <AlertDetails title="Max Profit" col={12} value={a.maxPL} />
                    <AlertDetails
                        title="Max Profit %"
                        col={12}
                        value={a.maxPercentPL}
                    />
                </div>
                {/* </div> */}
            </>
        );
    };

    render() {
        let { options } = this.props;
        let { sortBy, sortOrder, includeExpiredContracts } = this.state;
        let allAlerts = options.alerts;
        //filter out selected values
        // let allSymbols = [];
        let expDates = [];
        let strikePrices = [];
        // let alertMessages = [];
        let lastPrices = [];
        let allIVs = [];
        let allDateTimes = [];
        let allPercOTM = [];
        let allDaysToExpiration = [];
        let allTotalVols = [];
        let allVolumeIncrease = [];
        let allUnderlying = [];
        let allPL = [];
        let allMaxPL = [];
        let allPercentPL = [];
        let allMaxPercentPL = [];
        let putsOrCalls = { puts: [], calls: [] };
        if (!includeExpiredContracts && allAlerts.length) {
            let day = new Date(
                new Date().toLocaleString().split(",")[0]
            ).getTime();
            allAlerts = allAlerts.filter(
                (a) => new Date(a.exp).getTime() > day
            );
        }

        allAlerts.forEach((alert) => {
            // allAlerts[alertDay].map(()=>{

            // allSymbols.push(alert.symbol);

            expDates.push(alert.exp);
            strikePrices.push(alert.strike);
            let { last, currentLast, highPrice } = alert;
            // let PL = parseFloat((currentLast - last).toFixed(2));
            // let percentPL = parseFloat(((PL / last) * 100).toFixed(2));
            let maxPL = parseFloat((highPrice - last).toFixed(2));
            let maxPercentPL = parseFloat(((maxPL / last) * 100).toFixed(2));
            alert.maxPercentPL = maxPercentPL;
            alert.maxPL = maxPL;
            // allPL.push(PL);
            allMaxPL.push(maxPL);
            allMaxPercentPL.push(maxPercentPL);
            // allPercentPL.push(percentPL);
            // alertMessages.push(alert.alert);
            lastPrices.push(alert.last);
            allIVs.push(alert.IV);
            allDateTimes.push(alert.dateTime.split(",")[0]);

            allPercOTM.push(alert.percOTM);
            allTotalVols.push(alert.totalVolume);

            allDaysToExpiration.push(alert.daysToExpiration);
            allVolumeIncrease.push(alert.volumeIncrease);
            // allUnderlying.push(alert.underlyingPrice);
            // });
        });
        let filteredAlerts = this.filterAlerts(allAlerts);
        filteredAlerts = filteredAlerts.sort((a, b) => {
            if (
                sortBy === "underlyingPrice" ||
                sortBy === "maxPL" ||
                sortBy === "maxPercentPL"
            ) {
                if (parseFloat(a[sortBy]) < parseFloat(b[sortBy]))
                    return sortOrder ? 1 : -1;
                if (parseFloat(a[sortBy]) > parseFloat(b[sortBy]))
                    return sortOrder ? -1 : 1;
                return 0;
            } else {
                if (a[sortBy] < b[sortBy]) return sortOrder ? -1 : 1;
                if (a[sortBy] > b[sortBy]) return sortOrder ? 1 : -1;
                return 0;
            }
        });

        // allSymbols = Array.from(new Set(allSymbols)).sort((a, b) => {
        //     if (a > b) return 1;
        //     if (a < b) return -1;
        //     return 0;
        // });
        expDates = makeSetSortAndFilter(expDates, true, true);
        allDateTimes = makeSetSortAndFilter(allDateTimes, true, true);

        strikePrices = makeSetSortAndFilter(strikePrices);
        lastPrices = makeSetSortAndFilter(lastPrices);
        allIVs = makeSetSortAndFilter(allIVs);
        allTotalVols = makeSetSortAndFilter(allTotalVols);
        // allUnderlying = makeSetSortAndFilter(allUnderlying);
        allMaxPL = makeSetSortAndFilter(allMaxPL);
        allMaxPercentPL = makeSetSortAndFilter(allMaxPercentPL);
        allPercOTM = makeSetSortAndFilter(allPercOTM);
        allVolumeIncrease = makeSetSortAndFilter(allVolumeIncrease);
        allDaysToExpiration = makeSetSortAndFilter(allDaysToExpiration);

        return (
            <div className="row flex_center white">
                <div className="col-sm-12 flex_center">
                    <h2>Option Alerts For {this.state.symbol}</h2>
                </div>
                {/* <div className="col-sm-6 flex_center"></div> */}
                <div className="col-sm-4 flex_center">
                    <label className="p-2">Include Expired Contracts</label>
                    <Switch
                        onChange={() => {
                            let incExp = this.state.includeExpiredContracts;
                            this.setState({ includeExpiredContracts: !incExp });
                        }}
                        checked={this.state[`includeExpiredContracts`]}
                    />{" "}
                </div>
                <div className="col-sm-4 flex_center"></div>

                <div className="col-sm-4 flex_center">
                    <button onClick={this.resetFilters}>RESET</button>
                </div>
                <div className="container">
                    <div className="row flex_center">
                        {/* EXP Date Select */}
                        {this.FilterSelect(
                            "Filter Expirations",
                            "exp",
                            expDates
                        )}

                        {/* Date Select */}
                        {this.FilterSelect(
                            "Alert Date",
                            "dateTime",
                            allDateTimes
                        )}

                        {/* Days To Expire */}
                        {this.FilterSelect(
                            "Days To Expire",
                            "daysToExpiration",
                            allDaysToExpiration
                        )}

                        {/* total Vol Select */}
                        {this.FilterSelect(
                            "Total Volume",
                            "totalVolume",
                            allTotalVols
                        )}

                        {/* total Vol Select */}
                        {this.FilterSelect("% OTM", "percOTM", allPercOTM)}

                        {/* total Vol Select */}
                        {this.FilterSelect(
                            "Volume Increase",
                            "volumeIncrease",
                            allVolumeIncrease
                        )}

                        {/* Last Select */}
                        {this.FilterSelect("Alert Price", "last", lastPrices)}

                        {/* Last Select */}
                        {/* {this.FilterSelect("Underlying Prices", "underlyingPrice", allUnderlying)} */}

                        {/* Profit Select */}
                        {/* {this.FilterSelect("Filter P&L", "PL", allPL)} */}

                        {/* Profit Select */}
                        {/* {this.FilterSelect("Filter %P&L", "percentPL", allPercentPL)} */}

                        {/* Max Profit Select */}
                        {this.FilterSelect("Filter Max P&L", "maxPL", allMaxPL)}

                        {/* Max Profit Select */}
                        {this.FilterSelect(
                            "Filter Max %P&L",
                            "maxPercentPL",
                            allMaxPercentPL
                        )}
                    </div>
                </div>
                <LineBreak />
                <div className="col-sm-12 flex_center">
                    {this.showFilters()}
                </div>
                <LineBreak />
                <div className="col-sm-4 flex_center">
                    <div className="row flex_center">
                        <div className="col-sm-12 flex_center">
                            <div className="sm-title">Total Contracts</div>
                            <ExcelBtn
                                title="Download Excel"
                                onClick={() => {
                                    var workbook = XLSX.utils.book_new();
                                    filteredAlerts = filteredAlerts.map((a) => {
                                        delete a._id;
                                        delete a.alert;
                                        delete a.updatedAt;
                                        delete a.createdAt;
                                        delete a.timestamp;
                                        delete a.__v;
                                        return a;
                                    });
                                    var worksheet =
                                        XLSX.utils.json_to_sheet(
                                            filteredAlerts
                                        );
                                    workbook.SheetNames.push("Alerts");
                                    workbook.Sheets["Alerts"] = worksheet;
                                    XLSX.writeFile(
                                        workbook,
                                        `optionAlerts-${new Date().toLocaleTimeString()}.xlsx`
                                    );
                                }}
                            >
                                <span style={{ paddingRight: "5px" }}>
                                    Download Excel
                                </span>
                                <FontAwesomeIcon icon={faFileDownload} />
                            </ExcelBtn>
                        </div>
                        <div className="col-sm-12">
                            <div className="col-sm-6 flex_center">
                                <p>{filteredAlerts.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <LineBreak />
                <div className="container dynamicText">
                    {this.makeTable(filteredAlerts)}
                </div>
            </div>
        );
    }
}
function mapStateToProps(state) {
    const { options } = state;
    return { options };
}
export default connect(mapStateToProps)(withRouter(OpAlerts));

const LineBreak = styled.div`
    padding: 30px;
    border-top: 1px solid black;
    width: 100%;
`;

const AlertDetails = ({ col, title, value }) => {
    return (
        <div className="col flex_center">
            <div className="row flex_center">
                <div className={`col-sm-${col} flex_center`}>
                    <h5> {title}:</h5>
                </div>
                <div className={`col-sm-${col} flex_center`}>{value}</div>
            </div>
        </div>
    );
};

function makeSetSortAndFilter(data, time, noModulo) {
    if (time) {
        data = Array.from(new Set(data)).sort(
            (a, b) => new Date(a).getTime() - new Date(b).getTime()
        );
    } else {
        data = Array.from(new Set(data)).sort((a, b) => a - b);
    }

    if (!noModulo) {
        data = data.filter((p, iP) => iP % Math.floor(data.length / 11) === 0);
        data.pop();
        data.shift();
    }
    return data;
}

const ExcelBtn = styled.button`
    border: 1px solid #eee;
    color: white;
    background: none;
    padding: 10px;
    cursor: pointer;
    text-decoration: underline;
    text-decoration-color: green;
    font-size: 22px;
    :hover {
        border-color: transparent; /* remove the border's colour */
        box-shadow: 0 0 0 1px rgba(222, 66, 66, 0.9); /* emulate the border */
    }
`;

function filterTitle(filter) {
    switch (filter) {
        case "dateTime":
            return "Alert Date";
            break;

        case "symbol":
            return "Symbol";
            break;

        case "exp":
            return "Exp Date";
            break;

        case "totalVolume":
            return "Total Vol";
            break;

        case "underlying":
            return "Underlying";
            break;

        case "maxPL":
            return "Max PL";
            break;
        case "maxPercentPL":
            return "Max %PL";
            break;

        case "last":
            return "Alert Price";
            break;

        default:
            break;
    }
}
