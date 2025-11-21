import jwt from "jsonwebtoken";
import { BadRequestError, NotFoundError } from "../../errors/index.js";
import { getUserIdFromRequest } from "../../utils/getUserIdFromRequest.js";
import Stock from "../../models/Stock.js";
import User from "../../models/User.js";
import Holding from "../../models/Holding.js";
import Order from "../../models/Order.js";
import { StatusCodes } from "http-status-codes";



const buyStock = async (req, res) => {
    const { stock_id, quantity } = req.body;
    if(!stock_id || !quantity) throw new BadRequestError("Please provide all the details");


    const { userId, accessToken } = getUserIdFromRequest(req);

    try {
        const stock = await Stock.findById(stock_id);
        const buyPrice = stock?.currentPrice;
        const totalPrice = quantity * buyPrice;
        const currentUser = await User.findById(userId);
        if(currentUser?.balance < totalPrice) throw new BadRequestError("Insufficient balalnce");


        currentUser.balance -= totalPrice;
        await currentUser.save();

        const newHolding = new Holding({
            user: userId,
            stock: stock_id,
            quantity,
            buyPrice
        });

        await newHolding.save();

        const newOrder = new Order({
            user: userId,
            stock: stock_id,
            quantity,
            price: buyPrice,
            type: 'buy',
            remainingBalance: currentUser?.balance
        });

        await newOrder.save();

        return res.status(StatusCodes.OK).json({ 
            msg: "Stock purchased successfully",
            data: newHolding
        });
    } catch (error) {
        throw new BadRequestError(error.message);
    }
}


const sellStock = async (req, res) => {
    const { holdingId, quantity } = req.body;
    if(!holdingId || !quantity) throw new BadRequestError("Please provide all details");


    try {
        const holding = await Holding.findById(holdingId);

        if (!holding) throw new NotFoundError("Holding not found");

        if(quantity > holding?.quantity) throw new BadRequestError("You can not sell stocks more than you own");


        const stock = await Stock.findById(holding?.stock);
        const sellPrice = quantity * stock?.currentPrice;

        holding.quantity -= quantity;
        if(holding?.quantity <= 0) {
            await Holding.findByIdAndDelete(holdingId);
        }else{
            await holding.save();
        }


        const currentUser = await User.findById(holding?.user);
        if (!currentUser) throw new BadRequestError("User not found");

        currentUser.balance += sellPrice;
        await currentUser.save();

        const newOrder = new Order({
            user: holding?.user,
            stock: holding?.stock,
            quantity,
            price: stock?.currentPrice,
            type: 'sell',
            remainingBalance: currentUser?.balance
        });

        await newOrder.save();


        return res.status(StatusCodes.OK).json({
            msg: "Stock sold successfully",
            data: { orderId: newOrder?._id, sellPrice }
        });
    } catch (error) {
        throw new BadRequestError(error.message);
    }
}


const getAllHolding = async (req, res) => {
    const { userId, accessToken } = getUserIdFromRequest(req);

    try {
        const holdings = await Holding.find({ user: userId }).populate({
            path: "stock",
            select: "-dayTimeSeries -tenMinTimeSeries"
        });

        return res.status(StatusCodes.OK).json({ 
            msg: "Holding retrieved successfully",
            data: holdings
        });
    } catch (error) {
        throw new BadRequestError(error.message);
    }
}





export { buyStock, sellStock, getAllHolding };