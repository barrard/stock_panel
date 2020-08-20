import React from "react";
import { connect } from "react-redux";
import { toastr } from "react-redux-toastr";
//import { withRouter } from 'next/router';
import { Link, withRouter } from "react-router-dom";
import styled from "styled-components";
import { getDollarProfit } from "../charts/chartHelpers/utils.js";

//import Main_Layout from '../layouts/Main_Layout.js';
class Table extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      dateRowFlag: "",
    };
  }
  render() {
    let {
      headerArrayMapping,
      alterData,
      addDateRow,
      data,
      dailyDollarProfit,
    } = this.props;
    let TableRows = data.map((row, iRow) => {
      let date;
      if (addDateRow) {
        let currentDate = new Date(row[addDateRow])
          .toLocaleString()
          .split(",")[0];
        if (this.state.dateRowFlag !== currentDate) {
          this.state.dateRowFlag = currentDate;
          date = currentDate;
        }
      }
      let Header = TableHeader(headerArrayMapping);

      return (
        <>
          {date && (
            <>
              <DateHeading date={date} />
              {dailyDollarProfit && (
                <>
                   <DailyDollarProfit date={date} data={data} />
                </>
              )}
            {Header}

            </>
          )}

          {TableRow(headerArrayMapping, row, alterData, iRow)}
        </>
      );
    });
    return (
      <>
        {TableRows}
      </>
    );
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
function TableRow(headerArrayMapping, rowData, alterData, iRowData) {
  return (
    <div
      key={iRowData}
      className={`row  white ${rowHighLight(iRowData)} fullWidth`}
    >
      {Object.keys(headerArrayMapping).map((key) => {
        return (
          <div key={`_${key}`} className="noWrap col text_center ">
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
  debugger;
  let dailyProfit = dailyDollarProfit.reduce((a, trade) => {
    return a + getDollarProfit(trade);
  }, 0);

  return <h3 className="pl-3 white"> Daily Profit ${dailyProfit}</h3>;
}
