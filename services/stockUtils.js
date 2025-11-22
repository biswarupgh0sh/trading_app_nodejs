import { NotFoundError } from "../errors/index.js";
import Stock from "../models/Stock.js";

const roundToTwoDecimals = (num) => {
    return Math.round((num + Number.EPSILON) * 100) / 100;
}

const generateStockData = async (symbol) => {
    const stock = await Stock.findOne({ symbol });

    if(!stock) throw new NotFoundError(`No stock found with ${symbol}`);

    const now = new Date();
    const minChange = 0.20;
    const maxChange = 0.20;
    const trendChange = 0.005;
    const currentPrice = stock?.currentPrice;

    const trendType = Math.random();
    let trendModifier = 0;

    if(trendType < 0.33) {
        trendModifier = 0;
    }else if(trendType < 0.66) {
        trendModifier = trendChange;
    }else{
        trendModifier = -trendChange;
    }

    const changePercentage = Math.random() * (maxChange - minChange) + minChange + trendModifier;

    const close = roundToTwoDecimals(currentPrice * (1 + changePercentage));


    const patternType = Math.random();
    let high, low;


    if(patternType < 0.15){
        high = Math.max(currentPrice, close);
        low = Math.min(currentPrice, close);
    } 
    else if (patternType < 0.30) {
        high = Math.max(currentPrice, close);
        low = Math.min(currentPrice, close) - Math.random() * 2;
    }
    else if (patternType < 0.45) {
        high = Math.max(currentPrice, close) + Math.random() * 2;
        low = Math.min(currentPrice, close);
    }
    else if (patternType < 0.60) {
        high = Math.max(currentPrice, close) + Math.random() * 2;
        low = Math.min(currentPrice, close);
    }
    else{
        if(Math.random() < 0.5) {
            high = close + Math.random() * 4;
            low = close - Math.random() * 2;
        }else{
            high = close + Math.random() * 2;
            low = close - Math.random() * 4;
        }
    }


    high = roundToTwoDecimals(high);
    low = roundToTwoDecimals(low);


    const timestamp = now.toISOString();
    const time = now.getTime() / 1000;
    const lastTime = stock?.dayTimeSeries[stock?.dayTimeSeries?.length - 1];


    if (!lastTime || now - new Date(lastTime.timestamp) > 1 * 60 * 1000) {
        stock.dayTimeSeries.push({
            timestamp,
            time,
            _internal_originalTime: time,
            open: roundToTwoDecimals(currentPrice),
            high,
            low,
            close
        })
    }else{
        const updateHigh = Math.max(lastTime?.high, close + Math.random() * 1);
        const updateLow = Math.min(lastTime?.low, close - Math.random() * 1);

        const updateCandle = {
            high: roundToTwoDecimals(high),
            low: roundToTwoDecimals(low),
            close: roundToTwoDecimals(close),
            open: lastTime?.open,
            timestamp: lastTime?.timestamp,
            time: lastTime?.time,
            _internal_originalTime: lastTime?._internal_originalTime 
        }

        stock.dayTimeSeries[stock?.dayTimeSeries?.length - 1] = updateCandle;
    }

    stock.dayTimeSeries = stock?.dayTimeSeries.slice(-390);

    stock.currentPrice = close;

    try {
        await stock.save();
    } catch (error) {
        console.log("skipping conflicts");
    }
}


const store10Min = async (symbol) => {
    const stock = await Stock.findOne({ symbol });

    if(!stock) throw new NotFoundError(`No stock found with ${symbol}`);


    const now = new Date();
    const currentPrice = stock?.currentPrice;
    const lastItem = stock?.dayTimeSeries[stock?.dayTimeSeries?.length - 1];
    
    const timestamp = now.toISOString();
    const time = now.getTime() / 1000;


    stock.tenMinTimeSeries.push({
        timestamp,
        time,
        _internal_originalTime: time,
        open: roundToTwoDecimals(currentPrice),
        high: roundToTwoDecimals(lastItem?.high),
        low: roundToTwoDecimals(lastItem?.low),
        close: roundToTwoDecimals(lastItem?.close),
    });


    try {
        await stock.save();
    } catch (error) {
        console.log("Skipping conflicts");
    }
}


export { generateStockData, store10Min };