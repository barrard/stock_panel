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

function maintenanceTime(date) {
    date = date || new Date().getTime();

    let { day, hour, minute, second } = eastCoastTime(date);
    //markets closed from 5:00pm-5:59pm where hour = 17
    if (hour === 17) {
        return true;
    }
}

function futuresAreTrading(date) {
    date = date || new Date().getTime();
    let { day, hour, minute, second } = eastCoastTime(date);

    //sunday evening 6pm
    if (day === 0) {
        //5:59 is ok too
        if (hour >= 18 || (hour === 17 && minute === 59)) return true;
        else {
            // log("Sunday morning, Markets aren't open yet")
            return false;
        }
    }

    //any day from 4:15-4:29
    // if (hour === 16) {
    //     if (minute >= 15 && minute <= 29) return false;
    // }
    //markets closed from 5:00pm-5:59pm where hour = 17
    if (hour === 17) {
        return false;
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

function eastCoastTime(_date) {
    let utc;
    _date = _date || new Date().getTime();
    utc = new Date(_date).getTime() + new Date().getTimezoneOffset() * 60000;

    let eastCoastTime = new Date(utc + 3600000 * -5); //SPRING TIME DST, SWITCH TO 5 when Fall Back
    let date = new Date(eastCoastTime).getDate();
    let day = new Date(eastCoastTime).getDay();
    let hour = new Date(eastCoastTime).getHours();
    let minute = new Date(eastCoastTime).getMinutes();
    let second = new Date(eastCoastTime).getSeconds();
    eastCoastTime = new Date(eastCoastTime);

    return { date, day, hour, minute, second, eastCoastTime };
}

function isRTH(date) {
    let futsOpen = futuresAreTrading(date);
    if (!futsOpen) return false;

    let { day, hour, minute } = eastCoastTime(date);
    // if(hour <= 18) return false

    if (hour < 16 && hour >= 9) {
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

let t = 0;
function isOpeningSession(date) {
    // t++
    // if (t == 1) {
    //   return true
    // } else if (t >= 2) {
    //   return false
    // }
    date = date || new Date();
    let futsOpen = futuresAreTrading(date);
    if (!futsOpen) return false;

    let { day, hour, minute } = eastCoastTime(date);
    // if(hour <= 18) return false

    if (hour === 9 && minute < 45 && minute >= 30) return true;
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

function timeAsEST(time) {
    let date = new Date(time);
    return `${date.toLocaleString("en-US", {
        timeZone: "America/New_York",
    })} EST`;
}

function getTimestampForPreviousSession(time) {
    let date = new Date(time).getDate();
    let day = new Date(time).getDay();
    if (day === 0) {
        date = date - 2;
    } else if (day === 6) {
        date = date - 1;
    }
    date = date - 1;
    time = new Date(time).setDate(date);
    return time;
}

function getTimestampForLastSession() {
    //10pm UTC
    let now = new Date().getTime();
    let tenPM_UTC = new Date(now).setUTCHours(22);
    tenPM_UTC = new Date(tenPM_UTC).setUTCMinutes(0);
    tenPM_UTC = new Date(tenPM_UTC).setUTCSeconds(0);
    tenPM_UTC = new Date(tenPM_UTC).setUTCMilliseconds(0);
    if (tenPM_UTC > now) {
        let day = new Date(tenPM_UTC).getDate();
        tenPM_UTC = new Date(tenPM_UTC).setUTCDate(day - 1);
    }
    return tenPM_UTC;
}

function getTimestampForTodaysOpen() {
    //4:30pm UTC
    let now = new Date().getTime();
    let tenPM_UTC = new Date(now).setUTCHours(13);
    tenPM_UTC = new Date(tenPM_UTC).setUTCMinutes(30);
    tenPM_UTC = new Date(tenPM_UTC).setUTCSeconds(0);
    tenPM_UTC = new Date(tenPM_UTC).setUTCMilliseconds(0);
    if (tenPM_UTC > now) {
        let day = new Date(tenPM_UTC).getDate();
        tenPM_UTC = new Date(tenPM_UTC).setUTCDate(day - 1);
    }
    return tenPM_UTC;
}

function isOptionsTime() {
    let date = new Date();
    let futsOpen = futuresAreTrading(date);
    if (!futsOpen) return false;
    let { day, hour, minute } = eastCoastTime(date);
    // if(hour <= 18) return false
    //start half hour before market open
    // and run half hour after
    let startHour = 9; //9:00am
    let startMin = 00; //00:00
    let endHour = 16; //4:00pm
    let endMin = 30; // 00:30
    if (hour <= endHour && hour >= startHour) {
        if (hour === endHour && minute > endMin) {
            return false;
        }
        if (hour === startHour) {
            if (minute >= startMin) {
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

function getExpStr(date) {
    let today = date || new Date().getTime();
    let year = new Date(today).getFullYear();
    let month = new Date(today).getMonth() + 1;
    let day = new Date(today).getDate();

    if (month.toString().length === 1) {
        month = `0${month}`;
    }
    if (day.toString().length === 1) {
        day = `0${day}`;
    }
    return `${year}-${month}-${day}`;
}

//random function that returns how long till 9pm
function getTimeTillEvening() {
    let now = new Date().getTime();
    let _3PM = new Date().setHours(13);
    return _3PM - now < 0 ? 0 : _3PM - now;
}

function getTimeTillRTH() {
    // if(isRTH())return 0
    let _630AM = new Date().setHours(6);
    _630AM = new Date(_630AM).setMinutes(30);
    _630AM = new Date(_630AM).setSeconds(0);
    let now = new Date().getTime();
    _630AM = new Date(_630AM).getTime();
    if (now < _630AM) {
        return _630AM - now;
    } else {
        return _630AM + 1000 * 60 * 60 * 24 - now;
    }
}

function getTimeTillPreMarket() {
    let now = new Date();
    // console.log(new Date(date).toLocaleString());

    let { date, day, hour, minute } = eastCoastTime(now);

    let _400_AM = new Date().setDate(date);
    _400_AM = new Date().setHours(4);
    _400_AM = new Date(_400_AM).setMinutes(0);
    _400_AM = new Date(_400_AM).setSeconds(0);

    now = new Date().getTime();
    _400_AM = new Date(_400_AM).getTime();
    if (now < _400_AM) {
        return _400_AM - now;
    } else {
        return _400_AM + 1000 * 60 * 60 * 24 - now;
    }
}

function isAfterHours(date) {
    // if (!futuresAreTrading()) return false;
    date || new Date();
    // console.log(new Date(date).toLocaleString());

    let { day, hour, minute } = eastCoastTime(date);
    if (hour >= 16) {
        return true;
    }
    return false;
}
function isOpeningBell(date) {
    date = date || new Date();
    let { day, hour, minute } = eastCoastTime(date);
    if (hour === 9 && minute === 30) {
        return true;
    }
    return false;
}
function isClosingBell(date) {
    date = date || new Date();
    let { day, hour, minute } = eastCoastTime(date);
    if (hour === 15 && minute === 59) {
        return true;
    }
    return false;
}

function isPreMarket(date) {
    // if (!futuresAreTrading()) return false;
    let now = date || new Date();
    now = new Date(now);
    now = new Date(now).getTime();

    let { day, hour, minute } = eastCoastTime(date);
    if (hour >= 6 && hour < 9) {
        return true;
    } else if (hour == 9 && minute < 30) {
        return true;
    }
    return false;

    // if (process.env.NODE_ENV === "DEV") {
    //     //FOR LOCAL HAWAII DEVELOPMENT
    //     let timeTill = makeTime(00, 00, "AM"); //4:30am
    //     let timeStop = makeTime(3, 30, "AM"); //6:30am
    //     console.log(timeTill <= now && now <= timeStop);
    //     return timeTill <= now && now <= timeStop;
    // } else {
    //     //FOR PROD SERVER WEST COAST
    //     let timeTill = makeTime(3, 30, "AM"); //4:30am
    //     let timeStop = makeTime(6, 30, "AM"); //6:30am
    //     console.log(timeTill <= now && now <= timeStop);
    //     return timeTill <= now && now <= timeStop;
    // }
}

function makeTime(hr, min, date, amPM) {
    hr = amPM === "AM" ? hr : hr + 12;
    let time = new Date();
    time = new Date(time).setHours(hr);
    time = new Date(time).setMinutes(min);
    time = new Date(time).setDate(date);
    time = new Date(time).setSeconds(0);
    return new Date(time).getTime();
}

/**
 * @param {*} time
 */
function getTimeTill(time) {
    // if(isRTH())return 0
    time = new Date();
    time = new Date(time).setHours(6);
    time = new Date(time).setMinutes(30);
    time = new Date(time).setSeconds(0);
    let now = new Date().getTime();
    time = new Date(time).getTime();
    if (now < time) {
        return time - now;
    } else {
        return time + 1000 * 60 * 60 * 24 - now;
    }
}

function isWeekend(date) {
    // if (!futuresAreTrading()) return false;
    let now = date || new Date();
    now = new Date(now);
    now = new Date(now).getTime();

    let { day, hour, minute } = eastCoastTime(date);
    if (day === 6) {
        return true;
    } else if (day === 5 && hour >= 17) {
        return true;
    } else if (day === 0 && hour < 7) {
        return true;
    }
    return false;
}

module.exports = {
    checkBeginningNewDay,
    checkEndOpeningSessionTime,
    checkForMaintenance,
    checkNewDay,
    checkOpenTime,
    eastCoastTime,
    forbiddenTimestamp,
    futuresAreTrading,
    getExpStr,
    getTimestampForLastSession,
    getTimestampForPreviousSession,
    getTimestampForTodaysOpen,
    getTimeTill,
    getTimeTillEvening,
    getTimeTillRTH,
    isAboutToClose,
    isAboutToOpen,
    isAfterHours,
    isClosingBell,
    isOpeningBell,
    isOpeningSession,
    isWeekend,
    isOptionsTime,
    getTimeTillPreMarket,
    isPreMarket,
    isRTH,
    maintenanceTime,
    stocksAreTrading,
    timeAsEST,
    makeTime,
};
