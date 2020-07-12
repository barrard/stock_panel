import React from "react";
import { connect } from "react-redux";
import { Link, withRouter } from "react-router-dom";
import { matchPath } from "react-router";
import styled from "styled-components";
import API from "./API.js";
import BalanceSheetChart from "./SEC_Fillings_component/BalanceSheetChart.js";

class SEC_Filings extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      show: false,
      filings: [],
    };
    this.showHideSEC_Filings = this.showHideSEC_Filings.bind(this);
  }

  async componentDidMount() {
    let { symbol } = this.props.match.params;

    console.log("SEC FILING");
    //Ask the DB for this data
    let filings = await API.fetchSEC_Filings(symbol);
    // let filings = [];
    //sort according to BalanceSheetDate
    filings = filings.sort(
      (a, b) =>
        new Date(a.BalanceSheetDate).getTime() -
        new Date(b.BalanceSheetDate).getTime()
    );
    console.log(filings);
    this.setState({ filings });
  }

  showHideSEC_Filings() {
    let { show } = this.state;
    this.setState({
      show: !show,
    });
  }

  render() {
    let { symbol } = this.props.match.params;
    let { show, filings } = this.state;
    return (
      <>
        {!filings || (!filings.length && "Waiting on Data....")}

        {filings && filings.length && (
          <SEC_FilingsContainer
            width={this.props.width}
            symbol={symbol}
            show={show}
            filings={filings}
            openClose={this.showHideSEC_Filings}
          />
        )}
      </>
    );
  }
}

function mapStateToProps(state) {
  return state;
}

export default connect(mapStateToProps)(withRouter(SEC_Filings));

const SEC_FilingsContainer = ({ symbol, show, openClose, filings, width }) => {
  let filingFrom = filings[0].DocumentPeriodEndDate;
  let filingTo = filings.slice(-1)[0].DocumentPeriodEndDate;
  return (
    <Container>
      <ShowHideBtn show={show} openClose={openClose} />
      {show && (
        <>
          <Title>{symbol}</Title>
          <DateRange from={filingFrom} to={filingTo} />
          {Object.keys(keyToTextMapping).map((filingItem, iFilingItem) => {
            let balanceSheetData = filings.map((filing) => ({
              date: filing.DocumentPeriodEndDate,
              [filingItem]: filing[filingItem],
            }));
            return (
              < div key={iFilingItem}>
                <p>{keyToText(filingItem)}</p>
                <BalanceSheetChart
                  symbol={symbol}
                  width={width}
                  height={150}
                  filingData={balanceSheetData}
                  filingItem={filingItem}
                  filingName={keyToText(filingItem)}
                />
              </div>
            );
          })}
        </>
      )}
    </Container>
  );
};

const DateRange = ({ from, to }) => {
  return (
    <div className="row flex_center">
      <p>From: {new Date(from).toLocaleDateString()}</p>
      <span style={{ fontSize: "35px", padding: "7px", marginBottom: "18px" }}>
        -
      </span>
      <p>To: {new Date(to).toLocaleDateString()}</p>
    </div>
  );
};

const ShowHideBtn = ({ show, openClose }) => {
  return (
    <button onClick={openClose}>
      {show && "HIDE SEC FILINGS"}
      {!show && "VIEW SEC FILINGS"}
    </button>
  );
};

const Title = styled.h2`
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
`;
const Container = styled.div`
  border: 1px solid green;
  color: white;
`;

const keyToText = (key) => keyToTextMapping[key];

const keyToTextMapping = {
  Assets: "Assets",
  //   BalanceSheetDate: "Balance Sheet Date",
  CommitmentsAndContingencies: "Commitment and Contingencies",
  ComprehensiveIncome: "Comprehensive Income",
  ComprehensiveIncomeAttributableToNoncontrollingInterest:
    "Comprehensive Income Attributable To Non-controlled Interest",
  ComprehensiveIncomeAttributableToParent:
    "Comprehensive Income Attributable To Parent",
  //   ContextForDurations: "Context For Durations",
  //   ContextForInstants: "Context For Instants",
  CostOfRevenue: "Cost Of Revenue",
  CostsAndExpenses: "Costs And Expenses",
  CurrentAssets: "Current Assets",
  //   CurrentFiscalYearEndDate: "Current Fiscal Year End Date",
  CurrentLiabilities: "Current Liabilities",
  //   DocumentFiscalPeriodFocus: "Document Fiscal Period Focus",
  //   DocumentFiscalPeriodFocusContext: "Document Fiscal Period Focus Context",
  //   DocumentFiscalYearFocus: "Document Fiscal Year Focus",
  //   DocumentFiscalYearFocusContext: "Document Fiscal Year Focus Context",
  //   DocumentPeriodEndDate: "Document Period End Date",
  //   DocumentType: "Document Type",
  //   EntityCentralIndexKey: "Entity Central Index Key",
  //   EntityFilerCategory: "Entity Filer Category",
  //   EntityRegistrantName: "Entity Registrant Name",
  Equity: "Equity",
  EquityAttributableToNoncontrollingInterest:
    "Equity Attributable To Noncontrolling Interest",
  EquityAttributableToParent: "Equity Attributable To Parent",
  ExchangeGainsLosses: "Exchange Gains Losses",
  ExtraordaryItemsGainLoss: "Extraordinary Items Gain Loss",
  GrossProfit: "Gross Profit",
  IncomeBeforeEquityMethodInvestments:
    "Income Before Equity Method Investments",
  IncomeFromContinuingOperationsAfterTax:
    "Income From Continuing Operations After Tax",
  IncomeFromContinuingOperationsBeforeTax:
    "Income From Continuing Operations Before Tax",
  IncomeFromDiscontinuedOperations: "Income From Discontinued Operations",
  IncomeFromEquityMethodInvestments: "Income From Equity Method Investments",
  //   IncomeStatementPeriodYTD: "Income Statement Period YTD",
  IncomeTaxExpenseBenefit: "Income Tax Expense Benefit",
  InterestAndDebtExpense: "Interest And Debt Expense",
  Liabilities: "Liabilities",
  LiabilitiesAndEquity: "Liabilities And Equity",
  NetCashFlow: "Net Cash Flow",
  NetCashFlowsContinuing: "Net Cash Flows Continuing",
  NetCashFlowsDiscontinued: "Net Cash Flows Discontinued",
  NetCashFlowsFinancing: "Net Cash Flows Financing",
  NetCashFlowsFinancingContinuing: "Net Cash Flows Financing Continuing",
  NetCashFlowsFinancingDiscontinued: "Net Cash Flows Financing Discontinued",
  NetCashFlowsInvesting: "Net Cash Flows Investing",
  NetCashFlowsInvestingContinuing: "Net Cash Flows Investing Continuing",
  NetCashFlowsInvestingDiscontinued: "Net Cash Flows Investing Discontinued",
  NetCashFlowsOperating: "Net Cash Flows Operating",
  NetCashFlowsOperatingContinuing: "Net Cash Flows Operating Continuing",
  NetCashFlowsOperatingDiscontinued: "Net Cash Flows Operating Discontinued",
  NetIncomeAttributableToNoncontrollingInterest:
    "Net Income Attributable To Non-controlling Interest",
  NetIncomeAttributableToParent: "Net Income Attributable To Parent",
  NetIncomeAvailableToCommonStockholdersBasic:
    "Net Income Available To Common Stockholders Basic",
  NetIncomeLoss: "Net Income Loss",
  NoncurrentAssets: "Non-current Assets",
  NoncurrentLiabilities: "Non-current Liabilities",
  NonoperatingIncomeLoss: "Non-operating IncomeLoss",
  NonoperatingIncomeLossPlusInterestAndDebtExpense:
    "Non-operating Income Loss Plus Interest And Debt Expense",
  NonoperatingIncomePlusInterestAndDebtExpensePlusIncomeFromEquityMethodInvestments:
    "Non-operating Income Plus Interest And Debt Expense Plus Income From Equity Method Investments",
  OperatingExpenses: "Operating Expenses",
  OperatingIncomeLoss: "Operating IncomeLoss",
  OtherComprehensiveIncome: "Other Comprehensive Income",
  OtherOperatingIncome: "Other Operating Income",
  PreferredStockDividendsAndOtherAdjustments:
    "Preferred Stock Dividends And Other Adjustments",
  ROA: "ROA",
  ROE: "ROE",
  ROS: "ROS",
  Revenues: "Revenues",
  SGR: "SGR",
  TemporaryEquity: "Temporary Equity",
  //   TradingSymbol: "Trading Symbol",
  //   filed_date: "Filing Date",
  //   ticker: "Ticker",
  //   unique_id: "Unique ID",
  //   xml_filename: "XML Filename",

  //   _id: "id",
};
