import { StatusCodes } from "http-status-codes";
import Order from "../../models/Order.js";
import { getUserIdFromRequest } from "../../utils/getUserIdFromRequest.js"
import { BadRequestError } from "../../errors/index.js";

const getOrder = async (req, res) => {
    const { userId, accessToken } = getUserIdFromRequest(req);

    try {
        const orders = await Order.find({ user: userId })
        .sort({ createdAt: -1 })
        .populate({
            path: "user",
            select: "-password -biometric_key -login_pin"
        })
        .populate({
            path: "stock",
            select: "symbol companyName iconUrl lastDayTradedPrice currentPrice"
        });

        return res.status(StatusCodes.OK).json({
            msg: "Orders retrieved successfully",
            data: orders
        });
    } catch (error) {
        throw new BadRequestError("Failed to retrieve orders "+error.message);
    }
}


export { getOrder };