import express from "express";
import { getAllStocks, getStockBySymbol, registerStock } from "../controllers/stock/stock.controller.js";
import { buyStock, getAllHolding, sellStock } from "../controllers/stock/holding.controller.js";
import { getOrder } from "../controllers/stock/order.controller.js";


const router = express.Router();


router.post("/register", registerStock)
      .post("/buy", buyStock)
      .post("/sell", sellStock)
      .get("/stock", getStockBySymbol)
      .get("", getAllStocks)
      .get("/order", getOrder)
      .get("/holding", getAllHolding);


export default router;