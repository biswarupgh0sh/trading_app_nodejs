import cron from "node-cron";
import Stock from "../models/Stock";
import { generateStockData, store10Min } from "./stockUtils";


const holidays = ["2025-08-24", "2025-08-31"];


const isTradingHour = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const isWeekDay = dayOfWeek > 0 && dayOfWeek < 6;
    const isTradingTime = 
    (now.getHours() === 9 && now.getMinutes() >= 30) ||
    (now.getHours() > 9 && now.getHours() < 15) ||
    (now.getHours() === 15 && now.getMinutes() <= 30);


    const today = new Date().toISOString().slice(0, 10);
    return isWeekDay && isTradingTime && !holidays.includes(today);
}


const isNewTradeDay = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const isWeekDay = dayOfWeek > 0 && dayOfWeek < 6;
    const today = new Date().toISOString().slice(0, 10);
    return isWeekDay && !holidays.includes(today);
}

const scheduleDayReset = () => {
    cron.schedule("15 9 * * 1-5", async () => {
        if(isNewTradeDay()){
            await Stock.updateMany({},[
            {
                $set: {
                    dayTimeSeries: [],
                    tenMinTimeSeries: [],
                    lastDayTradedPrice: "$currentPrice"
                },
            },
            {
                $set: { __v: 0 },
            }
        ]);
        console.log("Day reset completed at 9:15AM");
        }
    })
}

const update10MinCandle = () => {
    cron.schedule("*/10 * * * *", async () => {
        if(isNewTradeDay()) {
            const stock = await Stock.find();
            stock.forEach(async (s) => {
                await store10Min(s.symbol);
            })
        }
    })
}


const generateRandomDataEvery5Seconds = () => {
    cron.schedule("*/5 * * * *", async () => {
        if(isNewTradeDay()) {
            const stock = await Stock.find();
            stock.forEach(async (s) => {
                await generateStockData(s.symbol);
            })
        }
    })
}


export { scheduleDayReset, update10MinCandle, generateRandomDataEvery5Seconds };