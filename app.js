import "express-async-errors";
import express from "express";
import dotenv from 'dotenv';
import YAML from 'yamljs';
import cors from 'cors';
import swaggerUI from 'swagger-ui-express';
import { createServer } from 'http';
import authRouter from "./routes/auth.routes.js";
import notFoundMiddleware from "./middleware/not-found.js"
import errorHandlerMiddleware from "./middleware/error-handler.js"


import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import notFound from "./middleware/not-found.js";
import connectDb from "./config/connect.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();


const app = express();
app.use(express.json());

const httpServer = createServer(app);

app.get("/", (req, res) => {
    res.send('<h1>Trading apis</h1><a href="/api-docs">Documentation</a>');
});

//swagger docs

const swaggerDocs = YAML.load(join(__dirname, './docs/swagger.yaml'));

app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerDocs));


// routes

app.use("/auth", authRouter);

// middlewares

app.use(cors());
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

// start the server

const start = async () => {
    try {
        await connectDb(process.env.MONGO_URI);
        const port = process.env.PORT || 3000;
        httpServer.listen(port, () => {
            console.log(`Server is listening on ${port}`);
        });
    } catch (error) {
        console.log(error);
    }
}


await start();