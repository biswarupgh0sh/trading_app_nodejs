import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { getUserIdFromRequest } from "../../utils/getUserIdFromRequest.js";
import User from "../../models/User.js";
import NotFoundError from "../../errors/not-found.js";
import { StatusCodes } from "http-status-codes";
import BadRequestError from "../../errors/bad-request.js";
import UnauthenticatedError from "../../errors/unauthenticated.js";

const updateProfile = async (req, res) => {
    const { name, gender, date_of_birth } = req.body;
    const { accessToken, userId } = getUserIdFromRequest(req);

    const updatedFields = {};

    if (name) updatedFields.name = name;
    if (gender) updatedFields.gender = gender;
    if (date_of_birth) updatedFields.date_of_birth = date_of_birth;

    const updatedUser = await User.findByIdAndUpdate(userId, updatedFields, { new: true, runValidators: true }).select("-password -biometric_key -login_pin") ;

    if (!updatedUser) throw new NotFoundError(`No user found with key: ${userId}`);

    return res.status(StatusCodes.OK).json({ success: true, data: updatedUser });
}

const setLoginPinFirst = async (req, res) => {
    const { login_pin } = req.body;

    if (!login_pin || login_pin.length != 4) {
        throw new BadRequestError("Login pin must be 4-digit");
    }


    const { userId, accessToken } = getUserIdFromRequest(req);

    const user = await User.findById(userId);
    if (!user) throw new NotFoundError(`No user found with id: ${user?._id}`);

    if (user?.login_pin) throw new BadRequestError("Login pin is already set");

    const salt = await bcrypt.genSalt(10);
    const hashed_pin = await bcrypt.hash(login_pin, salt);

    const updatedUser = await User.findByIdAndUpdate(userId, { login_pin: hashed_pin }, { new: true, runValidators: true });

    const access_token = jwt.sign({ userId }, process.env.SOCKET_TOKEN_SECRET, { expiresIn: process.env.SOCKET_TOKEN_EXPIRY });
    const refresh_token = jwt.sign({ userId }, process.env.REFRESH_SOCKET_TOKEN_SECRET, { expiresIn: process.env.REFRESH_SOCKET_TOKEN_EXPIRY });

    return res.status(StatusCodes.OK).json({
        success: true, socket_tokens: {
            socket_access_token: access_token,
            socket_refresh_token: refresh_token
        }
    });
}


const verifyPin = async (req, res) => {
    const { login_pin } = req.body;

    if (!login_pin || login_pin.length != 4) {
        throw new BadRequestError("Login pin must be 4-digit");
    }


    const { userId, accessToken } = getUserIdFromRequest(req);

    const user = await User.findById(userId);
    if (!user) throw new NotFoundError(`No user found with id: ${user?._id}`);

    if (!user?.login_pin) throw new BadRequestError("Login pin is not set");

    if (user?.blocked_until_pin && user?.blocked_until_pin > new Date()) throw new UnauthenticatedError(`Too many wrong attempts. Try again after ${Math.ceil(user?.blocked_until_pin - new Date()) / (60 * 1000)} minute(s)`);


    const isVerifyingPin = await user.comparePin(login_pin);

    if (!isVerifyingPin) {
        let message;

        user.wrong_pin_attempts += 1;
        await user.save();
        if (user?.blocked_until_pin && user?.blocked_until_pin > new Date()) {
            const blockedTime = Math.ceil((user?.blocked_until_pin - new Date()) / (60 * 1000));
            message = `Please try again after ${blockedTime} minute(s)`;
        } else {
            const attemptsRemaining = 3 - user?.wrong_password_attempts;
            message = attemptsRemaining <= 3 ? `Wrong PIN, ${attemptsRemaining} attempts remaining` : "You have been blocked due to multiple wrong attempts, try again in 15 minutes";
        }
        throw new UnauthenticatedError(message);
    }

    const access_token = jwt.sign({ userId }, process.env.SOCKET_TOKEN_SECRET, { expiresIn: process.env.SOCKET_TOKEN_EXPIRY });
    const refresh_token = jwt.sign({ userId }, process.env.REFRESH_SOCKET_TOKEN_SECRET, { expiresIn: process.env.REFRESH_SOCKET_TOKEN_EXPIRY });

    return res.status(StatusCodes.OK).json({
        success: true, socket_tokens: {
            socket_access_token: access_token,
            socket_refresh_token: refresh_token
        }
    });
}


const getProfile = async (req, res) => {
    const { userId, accessToken } = getUserIdFromRequest(req);

    const user = await User.findById(userId).select("-password -biometric_key");

    if(!user) throw new NotFoundError(`No user found with: ${userId}`);

    let pinExists = false;
    let phoneExists = false;

    if(user?.login_pin) pinExists = true;
    if(user?.phone_number) phoneExists = true;

    return res.status(StatusCodes.OK).json({ userId: user?._id, name: user?.name, email: user?.email, phone_exist: phoneExists, login_pin_exist: pinExists, balance: user?.balance?.toFixed(2)});
}

export { updateProfile, setLoginPinFirst, verifyPin, getProfile };