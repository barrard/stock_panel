const {momoTrend, momoStrength} = require('./momentum.js')
const{ evalVWAP} = require('./VWAP.js')
const {evalEMA} = require('./EMA.js')
const {prevCurrentStoch} = require('./stochastics.js')

module.exports =  {
    analyzeIndicators
}

function analyzeIndicators(data, timeframe){
    if(timeframe==='daily'){
        // console.log(`Analyze ${timeframe} data`)

        intradayAnalysis(data)
    }else{
        // console.log(`Analyze ${timeframe}Min data`)
        intradayAnalysis(data)
    }
}


function intradayAnalysis(data){
    // console.log(data)
    //MOM analysis?
    // momoTrend(data.slice(-1)[0].momentum)
    // momentumAnalysis(data)
    // evalVWAP(data)
    // evalEMA(data)
    // let stochastic_tradeDecision =prevCurrentStoch(data)



    //VWAP
}

function momentumAnalysis(data){
    let {momentum, symbol, timeframe} = data.slice(-1)[0]
    // console.log(`current momentum for ${symbol}`)
    // console.log(dailyData)
    let {biggerTrend, smallerTrend} = momoTrend({momentum})
    // console.log(`---momo--- biggerTrend for ${symbol} ${timeframe} is ${biggerTrend}`)
    // console.log(`---momo--- smallerTrend for ${symbol} ${timeframe} is ${smallerTrend}`)
    momoStrength(data)
}


