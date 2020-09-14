import React from "react";
import { connect } from "react-redux";
import { toastr } from "react-redux-toastr";
import { Link, withRouter } from "react-router-dom";
import styled from "styled-components";
import { avg } from "../../helpers";

//import Main_Layout from '../layouts/Main_Layout.js';
class Timers extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      lastMinuteBar: null,
      secondsUntilNextMinute: 59,
      tickTimes: [],
      avgTickTime: 3.0,
      tickTimer: null,
      startTimer: null,
      minuteTimer: null,
    };
  }

  componentDidMount() {
    this.setMinuteTimer();
    let startTimer = setTimeout(() => {
      // this.startTickTimer()
      this.startMinuteTimer();
    }, 0);
    this.setState({ startTimer });
  }

  componentDidUpdate(prevProps) {
    let { lastTick } = this.props;
    // console.log({prevProps, lastTick})
    this.handleNewMinute(prevProps);
    // this.handleNewTick(prevProps);
  }
  componentWillUnmount() {
    clearInterval(this.state.tickTimer);
    clearInterval(this.state.minuteTimer);

    clearTimeout(this.state.startTimer);
  }

  handleNewMinute(prevProps) {
    let { lastTick } = this.props;
    let lastTickTime = lastTick.timestamp;
    let prevTickTime = prevProps.lastTick.timestamp;

    // console.log({lastTickTime, prevTickTime})
    if (lastTickTime != prevTickTime) {
      console.log("Got a new Minute");
      this.setMinuteTimer();
    }
  }

  // handleNewTick(prevProps) {
  //   let { lastTick } = this.props;
  //   debugger
  //   let lastTickSampleTime = new Date(
  //     lastTick.sample_times.slice(-1)[0]
  //   ).getTime();
  //   let prevTickSampleTime = new Date(
  //     prevProps.lastTick.sample_times.slice(-1)[0]
  //   ).getTime();

  //   if (lastTickSampleTime != prevTickSampleTime) {
  //     // console.log({lastTick})
  //     // console.log({lastTickSampleTime, prevTickSampleTime})
  //   //   console.log("Got a new Tick");

  //   //   console.log({lastTickSampleTime, prevTickSampleTime})
  //     let tickDelta = lastTickSampleTime - prevTickSampleTime
  //   //   console.log({tickDelta})
  //     this.setTickerTimer(tickDelta)

  //   }
  // }

  // setTickerTimer(tickDelta){

  //   let {tickTimes} = this.state

  //   tickTimes.push(tickDelta)
  //   if(tickTimes.length>10)tickTimes.shift()
  //   let avgTickTime = (tickTimes.reduce((a,b)=>a+b,0)/tickTimes.length)
  //   avgTickTime = avgTickTime/1000
  //   avgTickTime = avgTickTime.toFixed(1)
  //   // console.log({avgTickTime})
  //   this.setState({
  //       avgTickTime
  //   })

  // }

  setMinuteTimer() {
    let now = new Date().getTime();
    let nowMinutes = new Date().getMinutes();
    let nextMinuteTime = new Date(now).setMinutes(nowMinutes + 1);
    nextMinuteTime = new Date(nextMinuteTime).setSeconds(0);
    nextMinuteTime = new Date(nextMinuteTime).setMilliseconds(0);
    // console.log({ nowMinutes, nowMinutes });
    let secondsUntilNextMinute = parseInt((nextMinuteTime - now) / 1000);
    // console.log(`Time till next minute = ${secondsUntilNextMinute}`);

    // console.log(`Set minute time to be ${secondsUntilNextMinute}`);
    this.setState({ secondsUntilNextMinute });
  }

  startMinuteTimer() {
    let minuteTimer = setInterval(() => {
      let { secondsUntilNextMinute } = this.state;
      //   console.log({ secondsUntilNextMinute });
      //   console.log(`timer ${secondsUntilNextMinute}`);
      secondsUntilNextMinute--;
      this.setState({
        secondsUntilNextMinute,
      });
    }, 1000);
    this.setState({ minuteTimer });
  }

  //   startTickTimer() {
  //     let tickTimer = setInterval(() => {
  //         let { avgTickTime } = this.state;
  //         // console.log({ avgTickTime });
  //     // console.log(`timer ${avgTickTime}`);
  //     avgTickTime-=0.1
  //     avgTickTime = avgTickTime.toFixed(1)

  //   //   this.setState({
  //   //     avgTickTime,
  //   //   });
  //   // }, 100);
  //   this.setState({tickTimer})
  // }
  render() {
    let { secondsUntilNextMinute, avgTickTime } = this.state;
    return (
      <TimersContainer>
        <h5>Seconds until next minute {secondsUntilNextMinute}</h5>
        {/* <h5>Seconds until next tick {avgTickTime}</h5> */}
      </TimersContainer>
    );
  }
}

function mapStateToProps(state) {
  return state;
}

export default connect(mapStateToProps)(withRouter(Timers));

const TimersContainer = styled.div`
  color: white;
`;
