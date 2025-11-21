import { StatusCodes } from "http-status-codes";
import {BadRequestError} from "../../errors/index.js";
import Otp from "../../models/Otp.js";
import User from "../../models/User.js";
import { otpGeneratorFn } from "../../services/mailSender.js";

const checkEmail = async (req, res) => {
    const { email } = req?.body;

    if(!email) {
        throw new BadRequestError("Email is required");
    }

    const user = await User.findOne({ email });
    let isExists = true;


    if (!user) {
        const otp = otpGeneratorFn();
        const vol = await Otp.create({ email, otp, otp_type: "email" });
        console.log(vol)
        isExists = false;
    }

    return res.status(StatusCodes.OK).json({ isExists });
}

export { checkEmail };