import "express-async-errors";
import express from "express";
import dotenv from 'dotenv';
import YAML from 'yamljs';
import cors from 'cors';
import swaggerUI from 'swagger-ui-express';
import { createServer } from 'http';
import authRouter from "./routes/auth.routes.js";
import stockRouter from "./routes/stock.routes.js";
import authenticatedSocketUser from "./middleware/socketAuth.js"
import notFoundMiddleware from "./middleware/not-found.js"
import errorHandlerMiddleware from "./middleware/error-handler.js"
import soketHandshake from "./middleware/socketHandShake.js";


import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import connectDb from "./config/connect.js";
import { generateRandomDataEvery5Seconds, scheduleDayReset, update10MinCandle } from "./services/cronJob.js";
import { Server } from "socket.io";
import Stock from "./models/Stock.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();


scheduleDayReset();
generateRandomDataEvery5Seconds();
update10MinCandle();


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


const app = express();
app.use(express.json());

const httpServer = createServer();

const io = new Server(httpServer, {
    cors: {
        origin: process.env.WEBSERVER_URI || "http://localhost:3001",
        methods: ["GET", "POST"],
        allowedHeaders: ["access_token"],
        credentials: true
    }
});

io.use(soketHandshake);

io.on("connection", (socket) => {
    console.log("New client connected", socket.id);


    socket.on("subscribeToStocks", async (stockSymbol) => {
        console.log(`CLient ${socket.id} subscribed to ${stockSymbol}`);
        const sendUpdates = async () => {
            try {
                const stock = await Stock.findOne({ symbol: stockSymbol });
                if(!stock) {
                    console.log(`Stock with symbol ${stockSymbol} not found.`);
                    return;
                }else{
                    socket.emit(`${stockSymbol}`, stock);
                }

            } catch (error) {
                console.log("Error sending stock update");
            }
        }

        await sendUpdates();

        const intervalId = setInterval(sendUpdates, 5000);

        if(!isTradingHour()) {
            clearInterval(intervalId);
        }
    });


    socket.on("subscribeToMultipleStocks", async (stockSymbols) => {
        console.log(`Client ${socket.id} subscribed to multiple stocks: ${stockSymbols}`);
        const sendUpdates = async () => {
            try {
                for(const symbol of stockSymbols){
                    const stock = await Stock.findOne({ symbol });
                    if(!stock) {
                        console.log(`Stock with ${symbol} not found.`);
                        continue;
                    }else{
                        socket.emit(`${symbol}`, stock);
                    }
                }
            } catch (error) {
                console.log(`Error sending stock update: ${error}`);
            }
        }
        await sendUpdates();

        const intervalId = setInterval(sendUpdates, 5000);

        if(!isTradingHour()) {
            clearInterval(intervalId);
        }
    });

    socket.on("disconnect", () => {
        console.log("A client disconnected");
    })
})

httpServer.listen(process.env.SOCKET_PORT || 4000, () => {
    console.log("Websocket is running on: ", httpServer.address().port);
})

app.get("/", (req, res) => {
    res.send('<h1>Trading apis</h1><a href="/api-docs">Documentation</a>');
});

//swagger docs

const swaggerDocs = YAML.load(join(__dirname, './docs/swagger.yaml'));

app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerDocs));


// routes

app.use("/auth",(req, res, next) => {
    console.log("coming here")
    next();
} , authRouter);
app.use("/stocks", authenticatedSocketUser, stockRouter);

// middlewares

app.use(cors());
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

// start the server

const start = async () => {
    try {
        await connectDb(process.env.MONGO_URI);
        const port = process.env.PORT || 3000;
        app.listen(port, () => {
            console.log(`Server is listening on ${port}`);
        });
    } catch (error) {
        console.log(error);
    }
}


await start();