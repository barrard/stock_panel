import React from "react";
import { connect } from "react-redux";
import { Link, withRouter } from "react-router-dom";
import {
  AreaChart,
  ChartZoomPan,
  AreaSeries,
  TooltipArea,
  LinearXAxis,
  LinearXAxisTickSeries,
  LinearXAxisTickLabel,
  LineSeries,
  GridlineSeries,
  Gridline,
  LineChart,
  Line,
} from "reaviz";
import styled from "styled-components";
import { getTrades } from "../redux/actions/StockBotActions.js";
import API from "./API.js";
import Socket from "./Socket.js";

class Account_Profile extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      priceLevelIndicator: {},
    };
  }

  async componentDidMount() {
    Socket.on("PriceLevelIndicator", (priceLevelIndicator) => {
      let { createdAt } = priceLevelIndicator;
      //add new data?

      let valsObj = {};
      let valsArray = ["TRIN", "TICK", "DJI", "SPX", "VIX"];

      this.addNewCombinedData(priceLevelIndicator);
      valsArray.forEach((val) => (valsObj[val] = [...this.state[val]]));

      valsArray.forEach((val) =>
        valsObj[val].push({
          key: new Date(createdAt),
          data: priceLevelIndicator[val],
        })
      );

      this.setState({
        priceLevelIndicator,
        ...valsArray,
      });
    });

    let data = await API.loadStockDataIndicator();
    data.reverse();
    this.shapeData(data);
  }

  shapeData(data) {
    let TRIN = getKeyData("TRIN", data);
    let TICK = getKeyData("TICK", data);
    let VIX = getKeyData("VIX", data);
    let SPX = getKeyData("SPX", data);
    let DJI = getKeyData("DJI", data);
    let UD_VOL = combineKeyData("UVOL", "DVOL", data);

    let hourlySupRes = combineKeyData(
      "totalHourlySupport",
      "totalHourlyResistance",
      data
    );
    let dailySupRes = combineKeyData(
      "totalDailySupport",
      "totalDailyResistance",
      data
    );
    let weeklySupRes = combineKeyData(
      "totalWeeklySupport",
      "totalWeeklyResistance",
      data
    );

    this.setState({
      stockData: data,
      TRIN,
      TICK,
      DJI,
      SPX,
      VIX,
      UD_VOL,
      hourlySupRes,
      dailySupRes,
      weeklySupRes,
    });

    function combineKeyData(key1, key2, data) {
      return [
        {
          key: key1,
          data: data.map((d, i) => ({
            key: new Date(d.createdAt),
            data: isNaN(d[key1].lastPrice) ? d[key1] : d[key1].lastPrice,
          })),
        },
        {
          key: key2,
          data: data.map((d, i) => ({
            key: new Date(d.createdAt),
            data: isNaN(d[key2].lastPrice) ? d[key2] : d[key2].lastPrice,
          })),
        },
      ];
    }

    function getKeyData(key, data) {
      return data.map((d) => ({
        key: new Date(d.createdAt),
        data: d[key].lastPrice,
      }));
      // return data.map((d) => ({ key, data: 5 }));
    }
  }

  componentWillUnmount() {
    Socket.off("PriceLevelIndicator");
  }

  componentDidUpdate(prevProps) {}

  addNewCombinedData(priceLevelIndicator) {

    let hourlySupRes = this.state.hourlySupRes;
    let dailySupRes = this.state.dailySupRes;
    let weeklySupRes = this.state.weeklySupRes;
    hourlySupRes[0].data.push({
      key: new Date(),
      data: priceLevelIndicator.totalHourlySupport,
    });
    dailySupRes[0].data.push({
      key: new Date(),
      data: priceLevelIndicator.totalDailySupport,
    });
    weeklySupRes[0].data.push({
      key: new Date(),
      data: priceLevelIndicator.totalWeeklySupport,
    });
    hourlySupRes[1].data.push({
      key: new Date(),
      data: priceLevelIndicator.totalHourlyResistance,
    });
    dailySupRes[1].data.push({
      key: new Date(),
      data: priceLevelIndicator.totalDailyResistance,
    });
    weeklySupRes[1].data.push({
      key: new Date(),
      data: priceLevelIndicator.totalWeeklyResistance,
    });
    this.setState({
      hourlySupRes,
      dailySupRes,
      weeklySupRes,
    });
  }

  render() {
    let { priceLevelIndicator } = this.state;

    return (
      <div className="container">
        <div className="row flex_center">
          <h1>Account_Profile</h1>
        </div>
        <div className="row flex_center white">
          {this.props.user.user.primary_email}
        </div>

        {this.state.TRIN && (
          <>
            <SingleAreaChart title={"TRIN"} data={this.state.TRIN} />
            <LINE_CHART title={"TICK"} data={this.state.TICK} />
            <LINE_CHART title={"SPX"} data={this.state.SPX} />
            <LINE_CHART title={"DJI"} data={this.state.DJI} />
            <LINE_CHART title={"VIX"} data={this.state.VIX} />
            <MULTI_CHART title={"UD_VOL"} data={this.state.UD_VOL} />
            <MULTI_CHART
              title={"hourlySupRes"}
              data={this.state.hourlySupRes}
            />
            <MULTI_CHART title={"dailySupRes"} data={this.state.dailySupRes} />
            <MULTI_CHART
              title={"weeklySupRes"}
              data={this.state.weeklySupRes}
            />
          </>
        )}
      </div>
    );
  }
}

function mapStateToProps(state) {
  const { user, stock_data, meta, stockbot } = state;
  return { user, stock_data, meta, stockbot };
}

const SingleAreaChart = ({ data, title }) => {
  return (
    <>
      <h2>{title}</h2>
      <ReavizChartContainer>
        <AreaChart data={data} />
      </ReavizChartContainer>
    </>
  );
};

const LINE_CHART = ({ data, title }) => {
  return (
    <>
      <h2>{title}</h2>
      <ReavizChartContainer>
        <LineChart
          zoomPan={<ChartZoomPan />}
          data={data}
          // gridlines={<GridlineSeries line={<Gridline direction="none" />} />}
        />
      </ReavizChartContainer>
    </>
  );
};

const MULTI_CHART = ({ data, title }) => {
  console.log(data);
  if (!data) return null;
  return (
    <>
      <h2>{title}</h2>
      <ReavizChartContainer>
        <LineChart
          // width={500}
          // height={250}
          zoomPan={<ChartZoomPan />}
          series={
            <LineSeries
              type="grouped"
              line={<Line strokeWidth={4} />}
              colorScheme={"cybertron"}
            />
          }
          data={data}
        />
      </ReavizChartContainer>
    </>
  );
};

export default connect(mapStateToProps)(withRouter(Account_Profile));

const ReavizChartContainer = styled.div`
  color: white;
  width: 100%;
  height: 400px;
`;



/**
 * 
 * https://eminimind.com/nyse-tick-and-breadth-thinkorswim-chart-setup/
 * Breadth Box Code
Same as above, copy this code into a new study, save and activate.
def A = close(“$UVOL”);
def D = close (“$DVOL”);
def ADL = Round(A / D, 1);
def ADR = if A > D then Round(A / D, 1) else Round(-D / A, 1);
input mode = {default Ratio};
def modeSwitch = if mode == mode.Ratio then 1 else 0;
AddLabel(yes, Concat(
if modeSwitch then ADR else ADL, Concat(” “,
if modeSwitch then “:1” else ” “)),
if modeSwitch then if ADR > ADR[1] then Color.GREEN else Color.RED else if ADL > ADL[1] then Color.GREEN else Color.RED);
plot null = Double.NaN;

Advance/Decline Box Code
def A = close(“$ADVN”);
def D = close (“$DECN”);
def ADL = Round(A / D);
def ADR = if A > D then Round(A – D) else Round (-D + A);
input mode = {default Ratio};
def modeSwitch = if mode == mode.Ratio then 1 else 0;
AddLabel(yes, Concat(
if modeSwitch then ADR else ADL, Concat(” “,
if modeSwitch then ” ” else ” “)),
if modeSwitch then if ADR > ADR[1] then Color.GREEN else Color.RED else if ADL > ADL[1] then Color.GREEN else Color.RED);
plot null = Double.NaN;
 */