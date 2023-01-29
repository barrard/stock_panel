import {
    Graphics,
    Container,
    Rectangle,
    Text,
    TextMetrics,
    TextStyle,
    utils,
} from "pixi.js";
import { scaleLinear } from "d3";

import {
    eastCoastTime,
    isRTH,
} from "../../../../indicators/indicatorHelpers/IsMarketOpen";

export default class MarketProfile {
    constructor(dataHandler) {
        this.data = dataHandler;
        this.marketProfile = {};
        this.textBars = {};
        // this.textBarStyle = new TextStyle({
        //     fontFamily: "Arial",
        //     fontSize: 16,
        //     fontWeight: "bold",
        //     fill: 0xffffff,
        //     align: "center",
        // });
        // this.textSmallBarStyle = new TextStyle({
        //     fontFamily: "Arial",
        //     fontSize: 10,
        //     fontWeight: "bold",
        //     fill: 0xffffff,
        //     align: "center",
        // });
        this.container = new Container();

        this.init();
    }

    init() {
        // this.container.position.x = this.data.margin.left;
        // this.container.position.y = this.data.margin.top;
        this.marketProfile = {};
        this.container.removeChildren();

        console.log(this.data.slicedData.length);

        let bar = "";
        let color = "pink";
        const greenToYellow = scaleLinear().range([0, 255]);
        // const yellowToRed = scaleLinear().range([0, 255*2]);
        const redToBlue = scaleLinear().range([0, 255 * 2]);

        this.data.slicedData.forEach((ohlc, i) => {
            const { timestamp, high, low } = ohlc;

            // make hour and minute into a letter
            let asEastCoastTime = eastCoastTime(timestamp);

            //bucket shapes, month, day, hours, minutes
            let day = new Date(timestamp).getDate();
            let hour = new Date(timestamp).getHours();
            let minute = new Date(timestamp).getMinutes();
            // let second = new Date(timestamp).getSeconds();
            if (minute < 30) {
                minute = 0;
            } else {
                minute = 30;
            }
            const barTime = new Date(timestamp).setMinutes(minute);
            let offset;
            if (asEastCoastTime.hour < 9) {
                offset = asEastCoastTime.hour * 2;

                if (asEastCoastTime.minute >= 30) offset++;

                let charCode = (offset + 113).toString();
                if (charCode > 122) {
                    bar = (charCode - 122).toString();
                } else {
                    bar = String.fromCharCode(charCode);
                }

                color = offset + 14;
            } else if (asEastCoastTime.hour === 9) {
                if (asEastCoastTime.minute >= 30) {
                    bar = "A";
                } else if (asEastCoastTime.minute < 30) {
                    bar = "9";
                }
            } else if (asEastCoastTime.hour > 9) {
                offset = (asEastCoastTime.hour - 9) * 2;

                if (asEastCoastTime.minute >= 30) offset++;

                if (offset <= 13) {
                    bar = String.fromCharCode(offset + 64);
                } else {
                    bar = String.fromCharCode(offset + 96 - 13);
                    color = offset - 14;
                }
            }

            if (!bar || color === undefined) {
                debugger;
                console.log(asEastCoastTime);
                throw "No bar";
            }

            if (!this.marketProfile[day]) {
                this.marketProfile[day] = {};
                this.textBars[day] = {};
                this.textBars[day].composite = {};
                this.textBars[day].overnight = {};
                this.textBars[day].regularSession = {};
            }

            const code = bar.charCodeAt(0);

            if (!this.marketProfile[day][bar]) {
                let color;
                if (code >= 97 || code < 65) {
                    if (code >= 97) {
                        color = code - 97;
                    } else if (code < 65) {
                        color = code - 49 + (122 - 97);
                    }
                } else {
                    console.log({ code, bar });
                    debugger;
                    color = 34 + code - 65;
                }
                console.log(
                    "=========================================================================="
                );
                console.log({ offset, bar, color, code });

                console.log(
                    "=========================================================================="
                );
                this.marketProfile[day][bar] = {
                    low: Infinity,
                    high: -Infinity,
                    startTime: barTime,
                    startLocalTime: new Date(barTime).toLocaleString(),
                    color,
                };
            }
            if (this.marketProfile[day][bar].low > low) {
                this.marketProfile[day][bar].low = low;
            }

            if (this.marketProfile[day][bar].high < high) {
                this.marketProfile[day][bar].high = high;
            }
        });

        const morningRange = 31;
        redToBlue.domain([0, 33]);
        greenToYellow.domain([34, 47]);
        debugger;
        Object.keys(this.marketProfile).forEach((day) => {
            Object.keys(this.marketProfile[day]).forEach((letter, i) => {
                const bar = this.marketProfile[day][letter];
                const code = letter.charCodeAt(0);
                const isSmall = code >= 97 || code < 65;

                const { startTime, high, low, color } = bar;

                const letterCount = Math.ceil((high - low) / 0.25 / 4);

                const mid = Math.floor(letterCount / 2);

                console.log(
                    `-----------------------${color}--${letter}------------------------`
                );
                let paint = "white";
                console.log({ color });

                if (color !== undefined && color <= 33) {
                    console.log(utils);
                    const rgb = Math.floor(redToBlue(color));
                    if (rgb <= 255) {
                        console.log(rgb / 255);
                        paint = utils.rgb2hex([255 / 255, 0, rgb / 255]);
                    } else {
                        console.log((255 - (rgb - 255)) / 255);
                        paint = utils.rgb2hex([
                            (255 - (rgb - 255)) / 255,
                            0,
                            255 / 255,
                        ]);
                    }
                } else if (color !== undefined && color > 33) {
                    debugger;
                    const rgb = Math.floor(greenToYellow(color));
                    if (rgb <= 255) {
                        console.log(rgb / 255);
                        paint = utils.rgb2hex([rgb / 255, 255 / 255, 0]);
                    } else {
                        console.log((255 - (rgb - 255)) / 255);
                        paint = utils.rgb2hex([
                            (255 - (rgb - 255)) / 255,
                            0,
                            255 / 255,
                        ]);
                    }
                }

                bar.letters = Array(letterCount)
                    .fill()
                    .map((x, i) => {
                        //determine color?

                        //get the texture, or make one if not found

                        const profileLetter = new Text(
                            letter,
                            isSmall
                                ? new TextStyle({
                                      fontFamily: "Arial",
                                      fontSize: 10,
                                      fontWeight: "bold",
                                      fill: paint,
                                      align: "center",
                                  })
                                : new TextStyle({
                                      fontFamily: "Arial",
                                      fontSize: 16,
                                      fontWeight: "bold",
                                      fill: paint,
                                      align: "center",
                                  })
                        );

                        return profileLetter;
                    });
            });
        });
    }

    draw(data) {
        console.time("writeProfile");
        this.container.removeChildren();

        Object.keys(this.marketProfile).forEach((day) => {
            Object.keys(this.marketProfile[day]).forEach((letter, i) =>
                this.drawLetter(day, letter, i)
            );
        });
        console.timeEnd("writeProfile");
    }

    drawLetter(day, letter, i) {
        // (letter) => {
        //how many letters do we need to fit the height?

        //is the letter size ok?  how wide is the time span?
        // if (this.marketProfile[day][letter].index === undefined) {
        const { startTime, high, low, letters } =
            this.marketProfile[day][letter];

        let startIndex = this.data.slicedData.findIndex(
            (d) => d.timestamp === startTime
        );
        let endIndex = this.data.slicedData.findIndex(
            (d) => d.timestamp === startTime + 1000 * 60 * 29
        );
        if (startIndex < 0) {
            return;
            // startIndex = 0;
        }
        if (endIndex < 0) {
            // return;
            endIndex = this.data.slicedData.length;
        }

        this.marketProfile[day][letter].startIndex = startIndex;
        this.marketProfile[day][letter].endIndex = endIndex;
        // }

        // const { startTime, high, low, endIndex, startIndex } =
        //     this.marketProfile[day][letter];

        const scaleWidth = Math.floor(this.data.xScale(endIndex - startIndex));

        const scaleHeight = Math.ceil(
            this.data.priceScale(Math.floor(low)) -
                this.data.priceScale(Math.ceil(high))
        );

        const top = Math.ceil(
            // this.data.priceScale(Math.floor(low)) -
            this.data.priceScale(Math.ceil(high))
        );
        // const heightDivide = scaleHeight /
        // console.log({ scaleWidth, scaleHeight });

        // const mid = Math.floor(letters.length / 2);
        letters.forEach((txtLetter, i) => {
            if (!txtLetter.transform) return;

            // const isMid = i === mid;
            // if (isMid) {
            //     txtLetter.style.color = "red";
            // }
            const offset = i * (scaleHeight / letters.length);

            txtLetter.x = this.data.xScale(
                (endIndex - startIndex) / 2 + startIndex
            );
            txtLetter.y =
                i === 0
                    ? top
                    : top + Math.ceil(scaleHeight / letters.length) * i;
            this.container.addChild(txtLetter);
        });
        // };
    }
}
