import { StatusCodes } from "http-status-codes";
import BadRequestError from "../../errors/bad-request";
import Otp from "../../models/Otp";
import User from "../../models/User";
import { otpGenerator } from "../../services/mailSender";

const checkEmail = async (req, res) => {
    const { email } = req.body;

    if(!email) throw new BadRequestError("Email is required");

    const user = await User.findOne({ email });
    let isExists = true;

    if (!user) {
        const otp = otpGenerator();
        await Otp.create({ email, otp, otp_type: "email" });
        isExists = false;
    }

    return res.status(StatusCodes.OK).json({ isExists });
}

export { checkEmail };