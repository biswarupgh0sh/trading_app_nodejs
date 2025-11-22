import jwt from "jsonwebtoken";
import UnauthenticatedError from "../errors/unauthenticated.js";
import User from "../models/User.js";


const authenticateSocketUser = async (socket, next) => {
    try {
        const token = socket.handshake.headers.access_token;
        if(!token) throw new UnauthenticatedError("Authentication invalid");

        const decodedToken = jwt.decode(token, process.env.SOCKET_TOKEN_SECRET);
        if(!decodedToken) throw new UnauthenticatedError("Invalid token");



        const user = await User.findById(decodedToken?.userId);
        if(!user) throw new UnauthenticatedError("No valid user found");


        socket.user = user;
        next();
    } catch (error) {
        next(new UnauthenticatedError("Authentication error"));
    }
}


export default authenticateSocketUser;