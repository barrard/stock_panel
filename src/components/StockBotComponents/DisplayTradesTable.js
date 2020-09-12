import React from "react";
import { connect } from "react-redux";
import { toastr } from "react-redux-toastr";
//import { withRouter } from 'next/router';
import { Link, withRouter } from "react-router-dom";
import styled from "styled-components";
const { getDollarProfit } = require("../../indicators/indicatorHelpers/utils.js");

//import Main_Layout from '../layouts/Main_Layout.js';
class Table extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      dateRowFlag: "",
      lastDateRowFlag: "",
      rowCount: 30,
      startData: 0,
      endData: 30,
    };
  }

  componentDidUpdate(prevProps) {
    this.dataUpdated(prevProps);
  }

  dataUpdated(prevProps) {
    let prevData = prevProps.data;
    let { data } = this.props;
    if (prevData.length !== data.length) {
      let dataLen = data.length;
      if (!dataLen < 30) {
        dataLen = 30;
      }
      this.setState({
        endData: dataLen,
      });
    }
  }
  render() {
    console.log(this.state);

    let {
      headerArrayMapping,
      alterData,
      addDateRow,
      data,
      dailyDollarProfit,
      startData,
      endData,
    } = this.props;
    let date = "";
    let TableRows = data.slice(startData, endData).map((row, iRow) => {
      let currentDate = new Date(row[addDateRow])
        .toLocaleString()
        .split(",")[0];

      let Header = TableHeader(headerArrayMapping);
      let newDate = date !== currentDate;
      date = currentDate;

      return (
        <div key={iRow} className="min-width-2000">
          {!!addDateRow && newDate && (
            <>
              <DateHeading date={date} key={date} />
              {dailyDollarProfit && (
                <>
                  <DailyDollarProfit key={date} date={date} data={data} />
                </>
              )}
              {Header}
            </>
          )}

          {TableRow(headerArrayMapping, row, alterData, iRow, startData)}
        </div>
      );
    });
    return <>{TableRows}</>;
  }
}

export default Table;

function DateHeading({ date }) {
  return <h3 className="white">{date}</h3>;
}

function TableData(data, key, alterData) {
  let cellData;
  if (!alterData || !alterData(data, key)) {
    cellData = data[key];
  } else if (alterData(data, key)) {
    cellData = alterData(data, key);
  }

  return cellData;
}

/**
 *
 * @param {Array} headerArrayMapping List of keys to use
 * @param {Object} rowData object of keys mapping the Header name
 * @param {*} iRowData
 */
function TableRow(headerArrayMapping, rowData, alterData, iRowData, startData) {
  return (
    <div 
      key={iRowData}
      className={`pl-4 row  white ${rowHighLight(iRowData)} fullWidth`}
    >
      {startData === undefined &&<div>#</div>}
      {startData !== undefined &&<div>{iRowData + startData}</div>}
      {Object.keys(headerArrayMapping).map((key) => {
        return (
          <div key={`_${key}`} title={rowData[key]} className="p-0 col-1 text_center overflowHidden">

            {TableData(rowData, key, alterData)}
          </div>
        );
      })}
    </div>
  );
}

function TableHeader(headerArrayMapping) {
  return TableRow(headerArrayMapping, headerArrayMapping, null, 0);
}

function rowHighLight(index) {
  return index % 2 === 0 ? "lightRow" : "darkRow";
}

function DailyDollarProfit({ date, data }) {
  let dailyDollarProfit = data.filter((d) => {
    let dateStr = new Date(d.entryTime).toLocaleString().split(",")[0];
    return dateStr === date;
  });

  let dailyProfit = dailyDollarProfit.reduce((a, trade) => {
    return a + getDollarProfit(trade);
  }, 0);

  return <h3 className="pl-3 white"> Daily Profit ${dailyProfit}</h3>;
}
