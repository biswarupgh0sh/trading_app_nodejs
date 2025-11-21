import jwt from 'jsonwebtoken';
import { BadRequestError, NotFoundError, UnauthenticatedError } from '../../errors/index.js';
import User from '../../models/User.js';
import { StatusCodes } from 'http-status-codes';


const register = async (req, res) => {
    const { email, password, register_token: registered_token } = req.body;

    if(!email || !password || !registered_token){
        throw new BadRequestError("Please provide all the details");
    }

    const user = await User.findOne({ email });
    if(user) {
        throw new BadRequestError('User already exists.');
    }

    try {
        const payload = jwt.verify(registered_token, process.env.REGISTER_SECRET);
        if(payload.email !== email) {
            throw new BadRequestError("Invalid registered token.");
        }

        const newUser = await User.create({ email, password });
        const accessToken = newUser.createAccessToken();
        const refreshToken = newUser.createRefreshToken();
        return res.status(StatusCodes.CREATED).json({ user: { email: newUser?.email, userId: newUser?._id }, tokens: { accessToken, refreshToken }});
    } catch (error) {
        throw new BadRequestError(error?.message || "Invalid operation.");
    }

}



const login = async (req, res) => {
    const { email, password } = req.body;

    if(!email || !password) {
        throw new BadRequestError("Please provide all the values.");
    }

    const user = await User.findOne({ email });
    if(!user) {
        throw new UnauthenticatedError('Invalid credentials.');
    }
    const isPasswordCorrect = await user.comparePassword(password);
    if(!isPasswordCorrect) {
        let message;

        if(user?.blocked_until_password && user?.blocked_until_password > new Date()) {
            const remainingTime = Math.ceil((user?.blocked_until_password - new Date()) / (60 * 1000));
            message = 'Your account is blocked for password. Please try after ' + remainingTime + ' minute(s)';
        }else {
            const attemptsLeft = 3 - user?.wrong_password_attempts;
            message = attemptsLeft > 0 ? `Invalid password, ${attemptsLeft} attempts remaining.` : 'Invalid login attempts exceeded. Please try after 30 minutes.';
        }
        throw new UnauthenticatedError(message);
    }


    const accessToken = user.createAccessToken();
    const refreshToken = user.createRefreshToken();


    let phone_exists = false;
    let login_pin_exists = false;


    if (user?.phone_number) {
        phone_exists = true;
    }

    if(user?.login_pin) {
        login_pin_exists = true;
    }

    return res.status(StatusCodes.OK).json({ 
        user: { name: user?.name, email: user?.email, userId: user?._id, phone_exists, login_pin_exists },
        tokens: { accessToken, refreshToken }
    });
}

const refreshToken = async (req, res) => {
    const { type, refresh_token } = req.body;

    if(!type || !["socket", "app"].includes(type) || !refresh_token){
        throw new BadRequestError("Invalid body");
    }

    try {
        let accessToken, newRefreshToken;

        if(type === 'app') {
            ({ access_token: accessToken, newRefreshToken } = await generateRefreshToken(
                refreshToken, 
                process.env.REFRESH_TOKEN_SECRET,
                process.env.REFRESH_TOKEN_EXPIRY,
                process.env.ACCESS_TOKEN_SECRET,
                process.env.ACCESS_TOKEN_EXPIRY
            ));
        }else if (type === 'socket') {
            ({ access_token: accessToken, newRefreshToken } = await generateRefreshToken(
                refreshToken, 
                process.env.REFRESH_SOCKET_TOKEN_SECRET,
                process.env.REFRESH_SOCKET_TOKEN_EXPIRY,
                process.env.SOCKET_TOKEN_SECRET,
                process.env.SOCKET_TOKEN_EXPIRY
            ));
        }

        return res.status(StatusCodes.OK).json({ access_token: accessToken, refresh_token: newRefreshToken});
    } catch (error) {
        throw new UnauthenticatedError("Invalid token");
    }
}


const logout = async (req, res) => {
    const accessToken = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.decode(accessToken, process.env.ACCESS_TOKEN_SECRET);
    const userId = decodedToken?.userId;
    await User.updateOne({ _id: userId }, { $unset: { biometric_key: 1 }});

    return res.status(StatusCodes.OK).json({ message: "Logged out successfully"});
}

async function generateRefreshToken(token, refresh_secret, refresh_expiry, access_secret, access_expiry) {
    try {
        const payload = jwt.verify(token, refresh_secret);
        const user = await User.findById(payload?.userId);

        if(!user) {
            throw new NotFoundError("User not found.");
        }
        const access_token = jwt.sign({ userId: payload?.userId }, access_secret, { expiresIn: access_expiry });
        const newRefreshToken = jwt.sign({ userId: payload?.userId }, refresh_secret, { expiresIn: refresh_expiry });
        return { access_token, newRefreshToken };
    } catch (error) {
        console.log(error)
        throw new UnauthenticatedError("Invalid token.");
    }
}

export { register, login, refreshToken, logout };