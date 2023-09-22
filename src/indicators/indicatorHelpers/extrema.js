import { mean, min } from "d3-array";

function pythagorean(x1, x2, y1, y2) {
    let sideA, sideB;
    sideA = Math.abs(x1 - x2);
    sideB = Math.abs(y1 - y2);

    return Math.sqrt(Math.pow(sideA, 2) + Math.pow(sideB, 2));
}

function minMax(xArray, yArray, tolerance = 1) {
    //xArray is time, yArray is price
    let minValues = [];
    let maxValues = [];
    let totalLength = yArray.length;

    //MIN
    for (let index = 0; index < yArray.length; index++) {
        let yValue = yArray[index];
        let startingPoint = index - tolerance;
        if (startingPoint < 0) {
            startingPoint = 0;
        }

        let minima = false;
        let maxima = false;
        let same = [];
        for (let x = startingPoint; x <= index + tolerance; x++) {
            let iCheck = x;
            if (x > totalLength) iCheck = totalLength - 1;
            if (x === index) continue;
            if (yValue < yArray[iCheck]) minima = true;
            if (yValue > yArray[iCheck]) maxima = true;
        }
        if (!maxima && minima) {
            minValues.push({ x: xArray[index], y: yValue });
            index += tolerance - 1;
        }
    }

    //MAX
    for (let index = 0; index < yArray.length; index++) {
        let yValue = yArray[index];
        let startingPoint = index - tolerance;
        if (startingPoint < 0) {
            startingPoint = 0;
        }

        let minima = false;
        let maxima = false;
        for (let x = startingPoint; x <= index + tolerance; x++) {
            let iCheck = x;
            if (x > totalLength) iCheck = totalLength - 1;
            if (x === index) continue;
            if (yValue < yArray[iCheck]) minima = true;
            if (yValue > yArray[iCheck]) maxima = true;
        }
        if (!minima && maxima) {
            maxValues.push({ x: xArray[index], y: yValue });
            index += tolerance - 1;
        }
    }
    return { minValues, maxValues };
}

function consolidateMinMaxValues(allPoints, allOHLCdata) {
    console.log({ allPoints, allOHLCdata });
    allPoints = allPoints.sort((a, b) => {
        if (a.x > b.x) return 1;
        if (a.x < b.x) return -1;
    });
    //hmm figure out the time for each bar
    let timeframe = 0;
    let timeFrameFlag = 0;
    let loopCount = 0;

    allOHLCdata.forEach((p, i) => {
        loopCount++;
        if (timeFrameFlag > 10) {
            if (!timeframe) timeFrameFlag = 0;
            else return;
        }
        if (i + 1 < allOHLCdata.length) {
            let diff = allOHLCdata[i + 1].timestamp - p.timestamp;
            if (diff != timeframe) {
                timeframe = diff;
                timeFrameFlag = 0;
            } else {
                timeFrameFlag++;
            }
        }
    });

    //look for consolidated points
    let consolidatedPoints = [];
    allPoints.forEach((point, pointIndex) => {
        let { x } = point;
        if (pointIndex === 0) {
            return consolidatedPoints.push([point]);
        }
        //find group index where this market should go
        let groupIndex = consolidatedPoints.findIndex((group) => {
            let flag = false;
            group.forEach((p) => {
                if (x - p.x <= timeframe) {
                    flag = true;
                }
            });
            return flag;
        });
        if (groupIndex < 0) {
            consolidatedPoints.push([point]);
        } else {
            if (!consolidatedPoints[groupIndex]) {
                consolidatedPoints[groupIndex] = [point];
            } else {
                consolidatedPoints[groupIndex].push(point);
            }
        }
    });

    let finalConsolidatedMarkers = consolidatedPoints.map((group) => {
        let x = mean(group, (d) => d.x);
        let y = mean(group, (d) => d.y);
        return { x, y };
    });
    return finalConsolidatedMarkers;
}

function mergeImportantPriceLevels(priceLevels, priceLevelSensitivity) {
    let mergedPrices = {};
    priceLevels.sort((a, b) => a.y - b.y);

    priceLevels.map((priceLevel) => {
        let similar = false;

        for (let mergedPriceLevel in mergedPrices) {
            if (similar) return;
            let absDiff = Math.abs(priceLevel.y / mergedPriceLevel - 1);
            if (absDiff < priceLevelSensitivity / 10000) {
                similar = true;
                mergedPrices[mergedPriceLevel].push(priceLevel);
            }
        }
        if (!similar) {
            mergedPrices[priceLevel.y] = [priceLevel];
        }
    });
    let groupedPoints = [];
    for (let price in mergedPrices) {
        let avgPrice = mean(mergedPrices[price], ({ y }) => y);
        avgPrice = parseFloat(avgPrice.toFixed(4));
        let minTime = min(mergedPrices[price], ({ x }) => x);
        let points = mergedPrices[price];
        groupedPoints.push({ x: minTime, y: avgPrice, points });
    }
    return groupedPoints;
}

function regressionAnalysis(points, errLimit, lines = [], count = 2) {
    //Make two line and compare

    let { line1, line2, current_count, pointsArray } = RMSerror(points, count);
    //compare the error
    let error = line2.results_error;
    //NEW use percent error limit
    const percentageErrorValue = line1.y1 * (errLimit / 100);

    /**
     * If the RMS error is too high
     * we will just take the last good line (line1)
     * and restart the process
     */

    let badLine1 = isNaN(line1.results_error);
    let badLine2 = isNaN(line2.results_error);

    if (error > percentageErrorValue && !badLine1 && !badLine2) {
        //we need to save line 1, and restart the function with spliced array
        let nearbyPoints = pointsArray.slice(0, count);
        pointsArray.splice(0, count - 1);
        line1.nearbyPoints = nearbyPoints;
        lines.push(line1);
        /**
         * if the sliced array is too small to restart
         * we will just return the lines and stop
         */
        if (pointsArray.length < 2) {
            console.log("Returning lines");
            console.log(pointsArray);
            return lines;
            /**
             * else, we will restart with the spliced
             * array and use the default count.
             * Include the lines array to continue adding
             */
        } else {
            regressionAnalysis(pointsArray, errLimit, lines);
        }
        /**
         * if the RMS error is still low,
         * we can increment count to test more points
         */
    } else {
        /**
         * make sure there is enough points in the
         * array to run the function again,
         */
        if (pointsArray.length > count) {
            regressionAnalysis(pointsArray, errLimit, lines, count + 1);
        } else {
            /**
             * else we can just take the last good line (line2)
             * and return all the lines.
             */
            if (badLine2) return;
            line2.nearbyPoints = pointsArray;
            lines.push(line2);

            return lines;
        }
    }
    return lines;
}

function RMSerror(pointsArray, current_count) {
    // console.log(pointsArray.length)
    let line1 = findLineByLeastSquares(pointsArray.slice(0, current_count));
    let line2 = findLineByLeastSquares(pointsArray.slice(0, current_count + 1));

    return {
        pointsArray,
        line1,
        line2,
        current_count,
    };

    // highLines[0] = findLineByLeastSquares(highMarks.slice(0, 2));
    // highLines[1] = findLineByLeastSquares(highMarks.slice(0, 3));
}

function findLineByLeastSquares(points) {
    let values_x = points.map(({ x }) => x);
    let values_y = points.map(({ y }) => y);
    // console.log({ points, values_x, values_y });
    var x_sum = 0;
    var y_sum = 0;
    var xy_sum = 0;
    var xx_sum = 0;
    var count = 0;

    /*
     * The above is just for quick access, makes the program faster
     */
    var x = 0;
    var y = 0;
    var values_length = values_x.length;

    if (values_length != values_y.length) {
        throw new Error("The parameters values_x and values_y need to have same size!");
    }

    /*
     * Above and below cover edge cases
     */
    if (values_length === 0) {
        return [[], []];
    }

    /*
     * Calculate the sum for each of the parts necessary.
     */
    for (let i = 0; i < values_length; i++) {
        x = values_x[i];
        y = values_y[i];
        x_sum += x;
        y_sum += y;
        xx_sum += x * x;
        xy_sum += x * y;
        count++;
    }

    /*
     * Calculate m and b for the line equation:
     * y = x * m + b
     */
    var m = (count * xy_sum - x_sum * y_sum) / (count * xx_sum - x_sum * x_sum);
    var b = y_sum / count - (m * x_sum) / count;

    /*
     * We then return the x and y data points according to our fit
     */
    var result_values_x = [];
    var result_values_y = [];
    var results_error = 0;

    for (let i = 0; i < values_length; i++) {
        x = values_x[i];
        y = x * m + b;
        result_values_x.push(x);
        result_values_y.push(y);
        results_error += Math.abs(y - values_y[i]);
    }
    /**
     * Combine x, y results into object points
     */

    let x1 = result_values_x[0];
    let t1 = points[0].timestamp;
    let t2 = points.slice(-1)[0].timestamp;
    let y1 = result_values_y[0];
    let x2 = result_values_x[result_values_x.length - 1];
    // x2 = (x2 - x1) * 0.5 + x2;
    let y2 = result_values_y.slice(-1)[0]; // x2 * m + b;
    let length = pythagorean(x1, x2, y1, y2);
    // console.log({ x1, y1, x2, y2, m, b, results_error, length})
    return { x1, y1, x2, y2, m, b, results_error, length, t1, t2 };
}

// y = [ 0,   1,   2,   3,  2,   3.2,   4,   5,   1,   0];
// x = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
export default {
    pythagorean,
    minMax,
    mergeImportantPriceLevels,
    consolidateMinMaxValues,
    regressionAnalysis,
    findLineByLeastSquares,
};
