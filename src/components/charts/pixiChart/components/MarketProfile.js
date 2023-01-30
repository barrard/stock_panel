import {
    Graphics,
    Container,
    Rectangle,
    Text,
    TextMetrics,
    TextStyle,
    utils,
    CLEAR_MODES,
} from "pixi.js";
import { extent, max, min } from "d3-array";

import { scaleLinear } from "d3";

import {
    eastCoastTime,
    isRTH,
} from "../../../../indicators/indicatorHelpers/IsMarketOpen";

export default class MarketProfile {
    constructor(dataHandler) {
        this.data = dataHandler;
        this.marketProfile = {};
        this.marketProfileComposite = {};
        this.textBars = {};
        this.textures = {};
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
        this.profileBarsContainer = new Container();
        this.profileCompositeContainer = new Container();

        this.profileCompositeGfx = new Graphics();

        this.profileCompositeContainer.addChild(this.profileCompositeGfx);
        this.container.addChild(this.profileCompositeContainer);

        this.init();
    }

    init() {
        // this.container.position.x = this.data.margin.left;
        // this.container.position.y = this.data.margin.top;
        this.marketProfile = {};
        this.marketProfileComposite = {};

        this.container.removeChildren();
        this.container.addChild(this.profileBarsContainer);
        this.container.addChild(this.profileCompositeContainer);

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
            }

            const code = bar.charCodeAt(0);

            if (!this.marketProfile[day][bar]) {
                let color;
                if (code >= 97 || code < 65) {
                    if (code >= 97) {
                        color = code - 97;
                    } else if (code < 65) {
                        color = code - 49 + (122 - 96);
                    }
                } else {
                    // console.log({ code, bar });
                    color = 34 + code - 64;
                }

                // console.log(
                //     "=========================================================================="
                // );
                // console.log({ offset, bar, color, code });

                // console.log(
                //     "=========================================================================="
                // );
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
        redToBlue.domain([0, 34]);
        greenToYellow.domain([35, 47]);

        Object.keys(this.marketProfile).forEach((day) => {
            Object.keys(this.marketProfile[day]).forEach((letter, i) => {
                const bar = this.marketProfile[day][letter];
                const code = letter.charCodeAt(0);
                const isSmall = code >= 97 || code < 65;

                const { startTime, high, low, color } = bar;

                const letterCount =
                    (Math.ceil(high) - Math.floor(low)) / 0.25 / 4;

                const mid = Math.floor(letterCount / 2);

                console.log(
                    `-------------------- day ${day}--- color ${color}-- letter ${letter}-- code ${code}----------------------`
                );
                let paint = "white";

                if (color !== undefined && color <= 34) {
                    const rgb = Math.floor(redToBlue(color));
                    if (rgb <= 255) {
                        paint = utils.rgb2hex([255 / 255, 0, rgb / 255]);
                    } else {
                        paint = utils.rgb2hex([
                            (255 - (rgb - 255)) / 255,
                            0,
                            255 / 255,
                        ]);
                    }
                } else if (color !== undefined && color > 34) {
                    const rgb = Math.floor(greenToYellow(color));
                    if (rgb <= 255) {
                        paint = utils.rgb2hex([rgb / 255, 255 / 255, 0]);
                    } else {
                        paint = utils.rgb2hex([
                            (255 - (rgb - 255)) / 255,
                            0,
                            255 / 255,
                        ]);
                    }
                }

                const floorHigh = Math.floor(high);
                const floorLow = Math.floor(low);
                bar.letters = Array(letterCount)
                    .fill()
                    .map((x, i) => {
                        //determine color?

                        const profileLetter = new Text(
                            letter,
                            isSmall
                                ? new TextStyle({
                                      fontFamily: "Arial",
                                      fontSize: 10,
                                      //   fontWeight: "bold",
                                      fill: paint,
                                      align: "center",
                                  })
                                : new TextStyle({
                                      fontFamily: "Arial",
                                      fontSize: 12,
                                      //   fontWeight: "bold",
                                      fill: paint,
                                      align: "center",
                                  })
                        );

                        profileLetter.anchor.set(0.5); //= 0.5;

                        profileLetter.price = floorHigh - i + 0.5;

                        this.addCompositeProfile(
                            profileLetter,
                            day,
                            color,
                            startTime
                        );

                        // console.log({ price: profileLetter.price, high, low });
                        // debugger;
                        return profileLetter;
                    });
            });
        });

        console.log(this.marketProfileComposite);
    }

    addCompositeProfile(profileLetter, day, color, startTime) {
        const overNightProfileDay = color <= 25 ? parseInt(day) + 1 : day;
        const isOverNight = color <= 34;
        // const offSetDay = !isOverNight ? day : isOverNight && overNightProfileDay ? :

        let composite = this.marketProfileComposite[overNightProfileDay];

        if (!this.marketProfileComposite[overNightProfileDay]) {
            this.marketProfileComposite[overNightProfileDay] = {};

            composite = this.marketProfileComposite[overNightProfileDay];

            composite.marketOpen = 0;
            composite.marketClose = 0;
            composite.composite = {};
            composite.overnight = {};
            composite.regularSession = {};
        }

        //Total Full Day Composite

        if (!composite.composite[profileLetter.price]) {
            composite.composite[profileLetter.price] = [];
        }
        //
        composite.composite[profileLetter.price].push(profileLetter);

        //Total overnight, a - 9
        if (isOverNight && !composite.overnight[profileLetter.price]) {
            composite.overnight[profileLetter.price] = [];
        }
        if (isOverNight) {
            if (startTime > composite.marketOpen)
                composite.marketOpen = startTime;

            composite.overnight[profileLetter.price].push(profileLetter);
        }
        //
        //Total Regular Session A - M
        if (!isOverNight && !composite.regularSession[profileLetter.price]) {
            composite.regularSession[profileLetter.price] = [];
        }
        if (!isOverNight) {
            if (startTime > composite.marketClose)
                composite.marketClose = startTime;

            composite.regularSession[profileLetter.price].push(profileLetter);
        }
    }

    draw(data) {
        console.time("writeProfile");
        this.profileBarsContainer.removeChildren();

        Object.keys(this.marketProfile).forEach((day) => {
            Object.keys(this.marketProfile[day]).forEach((letter, i) =>
                this.drawLetter(day, letter, i)
            );
        });

        if (!this.profileCompositeGfx?._geometry) {
            return;
        }

        this.profileCompositeGfx.clear();

        Object.keys(this.marketProfileComposite).forEach((day) => {
            if (this.marketProfileComposite[day].marketOpen) {
                //draw regular hours

                this.drawProfile(
                    this.marketProfileComposite[day].overnight,
                    this.marketProfileComposite[day].marketOpen
                );
            }

            if (this.marketProfileComposite[day].marketClose) {
                //draw regular hours
                console.log("Draw Profile");

                this.drawProfile(
                    this.marketProfileComposite[day].regularSession,
                    this.marketProfileComposite[day].marketClose
                );
            }
        });

        console.timeEnd("writeProfile");
    }

    drawProfile(profile, time) {
        if (!this.profileCompositeGfx?._geometry) return;

        let endIndex = this.data.slicedData.findIndex(
            (d) => d.timestamp === time
        );

        if (endIndex < 0) {
            return;
            // endIndex = this.data.slicedData.length;
        }

        let prices = Object.keys(profile)
            .map((p) => parseFloat(p))
            .sort((a, b) => a - b);

        const rightSideProfile = this.data.xScale(endIndex);

        const [minPrice, maxPrice] = extent(prices);

        const minY = this.data.priceScale(minPrice);
        const maxY = this.data.priceScale(maxPrice);
        const radius = 6; //this.data.priceScale(0) - this.data.priceScale(1);
        console.log({ radius });
        this.profileCompositeGfx.lineStyle(3, 0xffffff, 0.9);

        this.profileCompositeGfx.moveTo(rightSideProfile, minY);
        this.profileCompositeGfx.lineTo(rightSideProfile, maxY);

        this.profileCompositeGfx.lineStyle(0, 0xffffff, 0.9);

        prices.forEach((price) => {
            //circles
            const y = this.data.priceScale(price);

            profile[price].forEach((marker, i) => {
                console.log(radius);
                const x = rightSideProfile - radius - i * 10;
                this.profileCompositeGfx.beginFill(
                    utils.string2hex(marker.style.fill),
                    0.3
                );
                this.profileCompositeGfx.drawCircle(x, y, radius);
            });
        });
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

        // const scaleWidth = Math.floor(this.data.xScale(endIndex - startIndex));

        // const scaleHeight = Math.ceil(
        //     this.data.priceScale(Math.floor(low)) -
        //         this.data.priceScale(Math.ceil(high))
        // );

        // const top = Math.ceil(this.data.priceScale(Math.ceil(high)));

        const mid = Math.floor(letters.length / 2);
        letters.forEach((txtLetter, i) => {
            if (!txtLetter) {
                return;
            }
            if (!txtLetter.transform) return;

            const isMid = i === mid;
            if (isMid) {
                txtLetter.style.fill = "white";
            }
            // const offset = i * (scaleHeight / letters.length);

            txtLetter.x = this.data.xScale(
                (endIndex - startIndex) / 2 + startIndex
            );
            txtLetter.y = this.data.priceScale(txtLetter.price);
            // i === 0
            //     ? top
            //     : top + Math.ceil(scaleHeight / letters.length) * i;
            this.profileBarsContainer.addChild(txtLetter);
        });
        // };
    }
}

// ABCDEFGHIJK L M N a b c d e f g h i j k l m n o p q r s t u v w x y z 1 2 3 4 5 6 7 8 9
// 0123456789101112131415161718192021222324252627282930313233343536373839404142434445464748
// abcdefghijk l m n o p q r s t u v w x y z 1 2 3 4 5 6 7 8 9 A B C D E F G H I J K L M N
// 0123456789101112131415161718192021222324252627282930313233343536373839404142434445464748
