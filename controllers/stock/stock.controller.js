import { StatusCodes } from "http-status-codes";
import { BadRequestError } from "../../errors/index.js";
import Stock from "../../models/Stock.js";

const registerStock = async (req, res) => {
    try {
        const { symbol, companyName, currentPrice, lastDayTradedPrice, iconUrl } = req.body;

        if (!symbol || !companyName || !currentPrice || !lastDayTradedPrice || !iconUrl) {
            throw new BadRequestError("Please provide all the details.");
        }

        const stock = new Stock({ symbol, companyName, currentPrice, lastDayTradedPrice, iconUrl });

        await stock.save();

        return res.status(StatusCodes.CREATED).json({ msg: "Stock added successfully", data: stock });
    } catch (error) {
        throw new BadRequestError(error.message);
    }
}

const getAllStocks = async (req, res) => {
    try {
        const stocks = await Stock.find().select("-dayTimeSeries -tenMinTimeSeries");

        return res.status(StatusCodes.OK).json({ msg: "Stocks retrieved successfully", data: stocks });
    } catch (error) {
        throw new BadRequestError("Failed to get stocks "+error.message);
    }
}

const getStockBySymbol = async (req, res) => {
        const { stock: symbol } = req.query;

        if(!symbol) throw new BadRequestError("Please provide stock symbol");

    try {
        const sym = symbol.toUpperCase();
        const stock = await Stock.findOne({ symbol: sym }).select("-dayTimeSeries -tenMinTimeSeries");

        if(!stock) throw new BadRequestError("Stock not found");
        
        return res.status(StatusCodes.OK).json({ msg: "Stock retrieved successfully", data: stock });
    } catch (error) {
        throw new BadRequestError(error.message);
    }
}

export { registerStock, getAllStocks, getStockBySymbol };