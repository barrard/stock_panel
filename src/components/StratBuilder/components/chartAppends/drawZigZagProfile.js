import { line } from "d3";
import { scaleLinear, scaleTime } from "d3-scale";
import { extent, max, min } from "d3-array";
import extrema from "../../../../indicators/indicatorHelpers/extrema";
import { CalcVolProfile } from "../chartComponents/classes";
import TotalVolume from "../../../QuoteComponents/TotalVolume";

export default function drawZigZagProfile(
    toggleZigzagProfile,
    chartSvg,
    ohlc,
    data,
    { xScale, yScale },
    margin,
    candleWidth,
    toggleZigZag
) {
    const profileBarClassName = "zigZagVolProfileBar";
    const valueAreaClassName = "zigZagValueArea";
    const POC_ClassName = "zigZagPOC_VolProfile";

    chartSvg.selectAll(`.${profileBarClassName}`).remove();
    chartSvg.selectAll(`.${valueAreaClassName}`).remove();
    chartSvg.selectAll(`.${POC_ClassName}`).remove();

    console.log({ toggleZigzagProfile, toggleZigZag });

    if (!toggleZigzagProfile || !toggleZigZag) return;

    const zigZagFibsData = data.zigZagFibs;

    const profilesData = [];
    debugger;
    zigZagFibsData.forEach((fibData) => {
        let bins = 20;
        const x1 = fibData.firstPoint.index;
        const x2 = fibData.secondPoint.index;
        const color =
            fibData.firstPoint.name === "high" ? "indianred" : "lawngreen";
        //              use x1 minus 1, but not -1
        const data = ohlc.slice(x1, x2 + 1);
        console.log(data);
        const { volProfile, valueAreaHigh, valueAreaLow, POC } =
            new CalcVolProfile(data);

        //BIN PROFILE HERE

        const sortedPrices = Object.keys(volProfile)
            .map((p) => +p)
            .sort((a, b) => a - b);
        let barsPerBin = Math.round(sortedPrices.length / bins);

        if (barsPerBin * bins < sortedPrices.length) {
            let extra = sortedPrices.length - barsPerBin * bins;
            let addedBins = Math.ceil(extra / barsPerBin);
            bins += addedBins;
        }

        debugger;

        const binnedProfile = {};

        for (let iBin = 0; iBin < bins; iBin++) {
            let totalVol = 0;
            let start = barsPerBin * iBin;
            let end = start + barsPerBin;
            let pricesInBin = sortedPrices.slice(start, end);
            binnedProfile[pricesInBin[0]] = {};
            pricesInBin.forEach((price, iPrice) => {
                price = +price;

                totalVol += volProfile[price];
            });

            const height =
                yScale(pricesInBin[0]) -
                yScale(pricesInBin[pricesInBin.length - 1]);

            binnedProfile[pricesInBin[0]] = { totalVol, height };
        }

        debugger;

        const _xScale = scaleLinear().range([xScale(x1), xScale(x2)]);
        const [profileMin, profileMax] = extent(
            Object.values(binnedProfile).map((d) => d.totalVol)
        );

        _xScale.domain([0, profileMax]);

        Object.keys(binnedProfile).forEach((price) => {
            const x = _xScale(x1); //_xScale(binnedProfile[price].totalVol);
            const width = _xScale(binnedProfile[price].totalVol) - _xScale(x1);
            const y = yScale(parseFloat(price));

            profilesData.push({
                x,
                y,
                width,
                height: binnedProfile[price].height,
            });
        });
    });

    //Profile Bars
    chartSvg
        .selectAll(`.${profileBarClassName}`)
        .data(profilesData)
        .enter()
        .append("rect")
        .attr("class", `${profileBarClassName}`)
        .attr("x", (d) => d.x)
        .attr("width", (d) => d.width)
        .attr("y", (d) => d.y)
        .attr("height", (d) => d.height)

        .style("fill-opacity", 0.3)

        .attr("stroke-width", 0.5)
        .attr("stroke", "#bbb")
        .attr("stroke-opacity", 1)
        .attr("fill", "teal")
        .attr("clip-path", "url(#mainChart-clipBox)") //CORRECTION

        .exit();

    //BOTTOM LINE
    // chartSvg
    //     .selectAll(`.${fibBottomLineClassName}`)
    //     .data(zigZagProfileData)
    //     .enter()
    //     .append("line")
    //     .attr("class", `${fibBottomLineClassName}`)
    //     .attr("x1", (d) => xScale(d.firstPoint.index) + candleWidth / 2)
    //     .attr("x2", (d) => xScale(d.secondPoint.index) + candleWidth / 2)
    //     .attr("y1", (d) => yScale(d.secondPoint.val.y) + margin.top)
    //     .attr("y2", (d) => yScale(d.secondPoint.val.y) + margin.top)
    //     .style("opacity", 0.7)

    //     .attr("stroke-width", 3)
    //     .attr("stroke", "#aaa")
    //     .attr("clip-path", "url(#mainChart-clipBox)") //CORRECTION

    //     .exit();
}
