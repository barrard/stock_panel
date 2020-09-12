function checkForMaintenance(date) {
  let { day, hour, minute } = eastCoastTime(date);
  //first just check if the market is open in general
  let futsOpen = futuresAreTrading();
  if (!futsOpen) return false;
  //next check the specific time maintenance happens
  // 4:15 - 4:29  /hour 19 - 7pm
  // console.log({ day, hour, minute });
  //this is 4pm hour
  if (hour === 16) {
    if (minute >= 15 && minute <= 29) {
      return false;
    } else {
      return true;
    }
    //5:00 - 5:59
  } else if (hour === 17) {
    return false;
  } else {
    return true;
  }
}

function futuresAreTrading(date) {
  let { day, hour, minute, second } = eastCoastTime(date);
  //sunday evening 6pm
  if (day === 0) {
    if (hour >= 18) return true;
    else {
      // log('Sunday morning, Markets aren\'t open yet')
      return false;
    }
  }
  if (day >= 1 && day <= 4 && (hour >= 18 || hour < 17)) return true;
  if (day === 5) {
    //we need to get the 5:00pm minute to save 4:59pm
    if (hour < 17) return true;
    else {
      // log('Its the weekend! Markets closed')
      return false;
    }
  }
}

function stocksAreTrading(date) {
  /**
   * 0- Sunday
   * 6 - Saturday
   * 1 - Monday
   */
  let { day, hour, minute } = eastCoastTime(date);
  if (day > 0 && day < 6) {
    if (hour >= 8 && hour <= 16) return true;
  } else {
    // log('Its the weekend! Markets closed')
    return false;
  }
}

function eastCoastTime(date) {
  let utc;
  if (!date) {
    utc = new Date().getTime() + new Date().getTimezoneOffset() * 60000;
  } else {
    utc = new Date(date).getTime() + new Date().getTimezoneOffset() * 60000;
  }
  let eastCoastTime = new Date(utc + 3600000 * -4); //get East coast time
  let day = new Date(eastCoastTime).getDay();
  let hour = new Date(eastCoastTime).getHours();
  let minute = new Date(eastCoastTime).getMinutes();
  let second = new Date(eastCoastTime).getSeconds();
  eastCoastTime = new Date(eastCoastTime);

  return { day, hour, minute, second, eastCoastTime };
}

function isRTH(date) {
  let futsOpen = futuresAreTrading(date);
  if (!futsOpen) return false;

  let { day, hour, minute } = eastCoastTime(date);
  // if(hour <= 18) return false

  if (hour < 17 && hour >= 9) {
    if (hour === 9) {
      if (minute >= 30) {
        return true;
      } else {
        //9:00 am - 9:29am
        return false;
      }
    } else {
      return true;
    }
  } else {
    return false;
  }
}

function isOpeningSession(date) {
  let futsOpen = futuresAreTrading(date);
  if (!futsOpen) return false;

  let { day, hour, minute } = eastCoastTime(date);
  // if(hour <= 18) return false

  if ((hour === 10 && minute < 30) || (hour === 9 && minute >= 30)) return true;
  else return false;
}

function isAboutToOpen(date) {
  let futsOpen = futuresAreTrading(date);
  if (!futsOpen) return false;

  let { day, hour, minute } = eastCoastTime(date);
  // if(hour <= 18) return false

  if (hour == 9 && minute >= 20 && minute < 30) return true;
  else return false;
}
function isAboutToClose(date) {
  let futsOpen = futuresAreTrading(date);
  if (!futsOpen) return false;

  let { day, hour, minute } = eastCoastTime(date);
  // if(hour <= 18) return false

  if (hour == 15 && minute >= 50) return true;
  else return false;
}

function checkOpenTime(time) {
  let { day, hour, minute } = eastCoastTime(time);

  //should be 930am
  if (hour !== 9) return false;
  if (minute !== 30) return false;
  return true;
}

function checkNewDay(time) {
  let { day, hour, minute } = eastCoastTime(time);
  //should be 5PM eastern
  if (hour == 17 && minute == 0) return true;
  return false;
}
function checkBeginningNewDay(time) {
  let { day, hour, minute } = eastCoastTime(time);
  //should be 6PM eastern
  if (hour == 18 && minute == 0) return true;
  return false;
}

function checkEndOpeningSessionTime(time) {
  //should be 1030am
  let { day, hour, minute } = eastCoastTime(time);
  if (hour !== 10) return false;
  if (minute !== 30) return false;
  return true;
}

function forbiddenTimestamp(time) {
  //should be 4:59pm
  let { day, hour, minute } = eastCoastTime(time);
  if (hour === 16 && minute === 59) {
    return true;
  }
  return false;
}

module.exports = {
  checkBeginningNewDay,
  forbiddenTimestamp,
  checkEndOpeningSessionTime,
  eastCoastTime,
  futuresAreTrading,
  stocksAreTrading,
  checkForMaintenance,
  isRTH,
  isOpeningSession,
  isAboutToOpen,
  isAboutToClose,
  checkOpenTime,
  checkNewDay,
};
