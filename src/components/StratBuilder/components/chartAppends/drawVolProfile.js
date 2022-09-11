import { scaleLinear, scaleTime } from "d3-scale";
import { extent, max, min } from "d3-array";

export default function drawVolProfile(
    toggleVolProfile,
    chartSvg,
    data,
    yScales,
    margin,
    width
) {
    const profileBarClassName = "volProfileBar";
    const valueAreaClassName = "valueArea";
    const POC_ClassName = "POC_VolProfile";
    const HighLowVolNodeTextClassName = "HighLowVolNodeTextClassName";
    const { volProfile, valueAreaHigh, valueAreaLow, POC } = data;
    const { yScale } = yScales;
    chartSvg.selectAll(`.${profileBarClassName}`).remove();
    chartSvg.selectAll(`.${valueAreaClassName}`).remove();
    chartSvg.selectAll(`.${POC_ClassName}`).remove();
    chartSvg.selectAll(`.${HighLowVolNodeTextClassName}`).remove();
    chartSvg.selectAll(`.${"test_profileCirc"}`).remove();
    chartSvg.selectAll(`.${"test_profileText2"}`).remove();
    chartSvg.selectAll(`.${"test_profileText"}`).remove();

    const innerWidth = width - (margin.left + margin.right);
    const halfWidth = innerWidth * 0.5;
    if (!toggleVolProfile) return;

    const xScale = scaleLinear().range([
        halfWidth + margin.left,
        width - margin.right,
    ]);

    const binnedProfile = binProfile({ volProfile, bins: 20, yScale });
    const [profileMin, profileMax] = extent(
        Object.values(binnedProfile).map((d) => d.totalVol)
    );

    xScale.domain([profileMax, 0]);

    // const height =
    //     yScale(yScale.domain()[0]) - yScale(yScale.domain()[0] + 0.01);

    const profilesData = [];

    Object.keys(binnedProfile).forEach((price) => {
        const x = xScale(binnedProfile[price].totalVol); //xScale(binnedProfile[price].totalVol);
        const width = xScale(0) - xScale(binnedProfile[price].totalVol);
        const y = yScale(parseFloat(price)) - margin.top;

        const height = binnedProfile[price].height;
        profilesData.push({
            x,
            y, //: y + height / 2,
            width,
            height,
            price,
            totalVol: binnedProfile[price].totalVol,
        });
    });

    console.log(profilesData);
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

    // chartSvg
    //     .selectAll(".test_profileCirc")
    //     .data(profilesData)
    //     .enter()

    //     .append("circle")
    //     .attr("class", `${"test_profileCirc"}`)
    //     .attr("r", 3)
    //     .attr("cx", (d) => d.x)
    //     .attr("cy", (d) => d.y)
    //     .attr("stroke-width", 2)
    //     .attr("stroke", "pink")
    //     .attr("clip-path", "url(#mainChart-clipBox)") //CORRECTION

    //     .exit();

    // chartSvg

    //     .selectAll(".test_profileText")

    //     .data(profilesData)
    //     .enter()

    //     .append("text")
    //     .attr("class", `${"test_profileText"}`)

    //     .text((d) => d.totalVol)
    //     .attr("x", (d) => d.x)
    //     .attr("y", (d) => d.y)
    //     .attr("font-size", "1.5em")
    //     .style("fill", "white")
    //     .attr("text-anchor", "middle")

    //     .attr("stroke", "none")
    //     .attr("clip-path", "url(#mainChart-clipBox)") //CORRECTION

    //     .exit();

    // chartSvg

    //     .selectAll(".test_profileText2")

    //     .data(profilesData)
    //     .enter()

    //     .append("text")
    //     .attr("class", `${"test_profileText2"}`)

    //     .text((d) => d.price)
    //     .attr("x", (d) => d.x - 100)
    //     .attr("y", (d) => d.y)
    //     .attr("font-size", "1.5em")
    //     .style("fill", "#000")
    //     .attr("text-anchor", "middle")

    //     .attr("stroke", "none")
    //     .attr("clip-path", "url(#mainChart-clipBox)") //CORRECTION

    //     .exit();

    //valueArea High/Low
    //APPEND Price Level
    chartSvg
        .selectAll(`.${valueAreaClassName}`)
        .data([parseFloat(valueAreaHigh), parseFloat(valueAreaLow)])
        .enter()
        .append("line")
        .attr("class", `${valueAreaClassName}`)
        .attr("x1", (d) => halfWidth)
        .attr("x2", xScale.domain()[0])
        .attr("y1", (d) => yScale(d) + margin.top)
        .attr("y2", (d) => yScale(d) + margin.top)
        .style("opacity", 0.7)

        .attr("stroke-width", 3)
        .attr("stroke", (d) => {
            return "goldenrod";
        })
        .attr("clip-path", "url(#mainChart-clipBox)") //CORRECTION
        .on("mouseover", function (d, a, i, u) {
            chartSvg.selectAll(`.${HighLowVolNodeTextClassName}`).remove();

            chartSvg
                .append("text")
                .attr("class", `${HighLowVolNodeTextClassName}`)
                .text(d)
                .attr("x", halfWidth)
                .attr("y", yScale(d) + margin.top)
                .attr("font-size", "1.5em")
                .style("fill", "#000")
                .attr("text-anchor", "middle")
                .attr("stroke", "none")
                .attr("clip-path", "url(#mainChart-clipBox)") //CORRECTION
                .exit();

            this.setAttribute("stroke-width", 10);
        })
        .on("mouseout", function () {
            chartSvg.selectAll(`.${HighLowVolNodeTextClassName}`).remove();
            this.setAttribute("stroke-width", 3);
        })

        .exit();

    //POC
    //APPEND Price Level
    chartSvg
        .selectAll(`.${POC_ClassName}`)
        .data([parseFloat(POC)])
        .enter()
        .append("line")
        .attr("class", `${POC_ClassName}`)
        .attr("x1", (d) => halfWidth)
        .attr("x2", xScale.domain()[0])
        .attr("y1", (d) => {
            return yScale(d) + margin.top;
        })
        .attr("y2", (d) => {
            return yScale(d) + margin.top;
        })
        // .style("opacity", 0.7)

        .attr("stroke-width", 3)
        .attr("stroke", (d) => {
            return "indianred";
        })
        .attr("clip-path", "url(#mainChart-clipBox)") //CORRECTION
        .on("mouseover", function (d, a, i, u) {
            chartSvg.selectAll(`.${HighLowVolNodeTextClassName}`).remove();

            chartSvg
                .append("text")
                .attr("class", `${HighLowVolNodeTextClassName}`)
                .text(d)
                .attr("x", halfWidth)
                .attr("y", yScale(d) + margin.top)
                .attr("font-size", "1.5em")
                .style("fill", "#000")
                .attr("text-anchor", "middle")
                .attr("stroke", "none")
                .attr("clip-path", "url(#mainChart-clipBox)") //CORRECTION
                .exit();
            this.setAttribute("stroke-width", 10);
        })
        .on("mouseout", function () {
            chartSvg.selectAll(`.${HighLowVolNodeTextClassName}`).remove();
            this.setAttribute("stroke-width", 3);
        })
        .exit();

    return;
}

function binProfile({ volProfile = {}, bins = 20, yScale }) {
    const sortedPrices = Object.keys(volProfile)
        .map((p) => +p)
        .sort((a, b) => a - b);
    let barsPerBin = Math.round(sortedPrices.length / bins);

    if (barsPerBin * bins < sortedPrices.length) {
        let extra = sortedPrices.length - barsPerBin * bins;
        let addedBins = Math.ceil(extra / barsPerBin);
        bins += addedBins;
    }

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
    return binnedProfile;
}
