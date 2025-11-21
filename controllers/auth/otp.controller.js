import jwt from 'jsonwebtoken';
import BadRequestError from '../../errors/bad-request.js';
import Otp from '../../models/Otp.js';
import User from '../../models/User.js';
import { StatusCodes } from 'http-status-codes';
import { otpGeneratorFn } from '../../services/mailSender.js';


const verifyOtp = async (req, res) => {
    const { email, otp, otp_type, data } = req.body;

    console.log(email, otp, otp_type, data)

    if(!email || !otp || !otp_type) {
        throw new BadRequestError("Please provide all values");
    } else if(otp_type !== 'email' && !data) {
        throw new BadRequestError("Please provide all values");
    }

    const otpRecord = await Otp.findOne({ email, otp_type }).sort({ createdAt: -1 });

    if(!otpRecord) throw new BadRequestError("Invalid otp or otp expired");

    const isVerified = await otpRecord.comparOtp(otp);

    if(!isVerified) throw new BadRequestError("Invalid otp or otp expired");

    await Otp.findByIdAndDelete(otpRecord?._id);

    switch(otp_type){
        case 'phone':
            await User.findOneAndUpdate({ email }, {phone_number: data});
            break;
        case 'email':
            break;
        case 'reset_pin':
            if(!data || data.length !=4) {
                throw new BadRequestError("PIN should be 4 digit");
            }
            await User.updatePIN(email, data);
            break;
        case 'reset_password':
            await User.updatePassword(email, data);
            break;
        default:
            throw new BadRequestError("Invalid otp request type");
    }

    const user = await User.findOne({ email });
    console.log(otp_type === 'email' && !user)
    if(otp_type === 'email' && !user) {
        const registered_token = jwt.sign({ email }, process.env.REGISTER_SECRET, { expiresIn: process.env.REGISTER_SECRET_EXPIRY });
        return res.status(StatusCodes.OK).json({ msg: "OTP verified successfully", registered_token });
    }

    return res.status(StatusCodes.OK).json({ msg: "OTP verified successfully" });
}


const sendOtp = async (req, res) => {
    const { email, otp_type } = req.body;

    if(!email || !otp_type){
        throw new BadRequestError("Please provide all values");
    }

    const user = await User.findOne({ email });

    if(!user && otp_type === 'phone') {
        throw new BadRequestError("User not found");
    }

    if(user && otp_type === 'email') {
        throw new BadRequestError("User already exists");
    }


    if(otp_type === 'phone' && user?.phone_number){
        throw new BadRequestError("Phone number already exists");
    }


    const otp = otpGeneratorFn();
    const otpPayload = { email, otp, otp_type };
    await Otp.create(otpPayload);
    
    return res.status(StatusCodes.OK).json({ msg: "Otp sent successfully" });
}


export { verifyOtp, sendOtp };