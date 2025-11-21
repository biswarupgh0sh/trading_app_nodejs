import jwt from "jsonwebtoken";

export const getUserIdFromRequest = (request) => {
    try {
        if(!request.headers.authorization) return null;
        const accessToken = request.headers.authorization.split(" ")[1];
        const decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
        return { accessToken, userId: decodedToken?.userId };
    } catch (error) {
        return { accessToken: null, userId: null };
    }
}