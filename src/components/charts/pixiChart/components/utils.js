export function volumeScaleValues() {
    return [100, 1000, 10000, 10000];
}
export function priceScaleValues({ highest, lowest, tickSize }) {
    const _highest = highest;
    const diff = highest - lowest;
    let priceValues = [];

    const one = 1;
    const five = one * 5;
    const ten = five * 2;

    const twenty = five * 4;

    //find startingValue
    let tickSpread = diff / this.maxTicks;

    console.log({ diff, tickSpread });

    if (tickSpread > 10000) {
        tickSpread = 25000;
        while (highest % tickSpread !== 0 && highest > 0) {
            highest -= this.tickSize;
        }
    } else if (tickSpread > 1000) {
        tickSpread = 5000;
        while (highest % tickSpread !== 0 && highest > 0) {
            highest -= this.tickSize;
        }
    } else if (tickSpread > 500) {
        tickSpread = 1000;
        while (highest % tickSpread !== 0 && highest > 0) {
            highest -= this.tickSize;
        }
    } else if (tickSpread > 100) {
        tickSpread = 500;
        while (highest % tickSpread !== 0 && highest > 0) {
            highest -= this.tickSize;
        }
    } else if (tickSpread > 4) {
        tickSpread = twenty;
        while (highest % tickSpread !== 0 && highest > 0) {
            highest -= this.tickSize;
        }
    } else if (tickSpread > 2) {
        tickSpread = ten;

        while (highest % ten !== 0 && highest > 0) {
            highest -= this.tickSize;
        }
    } else if (tickSpread > 1) {
        tickSpread = five;

        while (highest % five !== 0 && highest > 0) {
            highest -= this.tickSize;
        }
    } else if (tickSpread > 0.5) {
        tickSpread = one;

        while (highest % one !== 0 && highest > 0) {
            highest -= this.tickSize;
        }
    } else {
        tickSpread = this.tickSize * 2;

        while (highest % tickSpread !== 0 && highest > 0) {
            highest -= this.tickSize;
        }
    }

    let price = highest;
    while (price > lowest) {
        priceValues.push(price);
        price -= tickSpread;
    }

    return priceValues;
}

export function timeScaleValues({ highest, lowest, values }) {
    let timeValues = [];

    const fiveMin = 1000 * 60 * 5;
    const fifteenMin = fiveMin * 3;

    const hour = fifteenMin * 4;
    const fourHour = hour * 4;
    const eightHour = fourHour * 2;
    const sixteenHour = eightHour * 4;

    lowest = values[0];
    highest = values[values.length - 1];

    const sixteenHours = [];
    const eightHours = [];
    const fourHours = [];
    const hours = [];
    const fifteenMins = [];
    const fiveMins = [];

    for (let x = 0; x < values.length; x++) {
        const time = values[x];
        if (time % sixteenHour === 0) {
            sixteenHours.push(x);
        }
        if (time % eightHour === 0) {
            eightHours.push(x);
        }
        if (fourHours.length > 8) continue;

        if (time % fourHour === 0) {
            fourHours.push(x);
        }
        if (hours.length > 8) continue;

        if (time % hour === 0) {
            hours.push(x);
        }
        if (fifteenMins.length > 8) continue;
        if (time % fifteenMin === 0) {
            fifteenMins.push(x);
        }
        if (time % fiveMin === 0) {
            fiveMins.push(x);
        }
    }

    if (fiveMins.length < 8) {
        timeValues = fiveMins; //.filter((el, i) => i % 2 != 0);
    } else if (fifteenMins.length < 8) {
        timeValues = fifteenMins; //.filter((el, i) => i % 2);
    } else if (hours.length < 8) {
        timeValues = hours; //.filter((el, i) => i % 2);
    } else if (fourHours.length < 8) {
        timeValues = fourHours; //.filter((el, i) => i % 2);
    } else if (eightHours.length < 8) {
        timeValues = eightHours; //.filter((el, i) => i % 2);
    } else if (sixteenHours.length < 8) {
        timeValues = sixteenHours; //.filter((el, i) => i % 2);
    }

    return timeValues;
}
