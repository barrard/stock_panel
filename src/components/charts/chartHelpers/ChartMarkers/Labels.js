



export const CenterLabel = ({symbol, timeframe, chartWindow, x, y, })=>{
    chartWindow
    .append("text")
    .text(symbol)
    .attr("x", x)
    .attr("y", y)
    .attr("font-size", "5.3em")
    .attr("opacity", "0.3")
    .attr("font-color", "white")
    .attr("text-anchor", "middle");

    if(timeframe){

        
        chartWindow
        .append("text")
        .text(timeframe)
        .attr("x", x)
        .attr("y", y+55)
        .attr("font-size", "3.3em")
        .attr("opacity", "0.3")
        .attr("font-color", "white")
        .attr("text-anchor", "middle");
    }

}