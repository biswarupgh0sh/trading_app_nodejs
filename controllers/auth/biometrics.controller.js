import jwt from "jsonwebtoken";
import NodeRSA from "node-rsa";
import BadRequestError from "../../errors/bad-request.js";
import User from "../../models/User.js";
import { StatusCodes } from "http-status-codes";
import UnauthenticatedError from "../../errors/unauthenticated.js";

const uploadBiometrics = async (req, res) => {
    const { public_key } = req.body;

    if(!public_key) throw new BadRequestError("public key is required");

    const accessToken = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    const userId = decodedToken?.userId;

    const updatedUser = await User.findByIdAndUpdate( userId, { biometric_key: public_key }, { new: true, runValidators: true });

    return res.status(StatusCodes.OK).json({ msg: "Biometric key uploaded successfully" });
}

const verifyBiometricKey = async (req, res) => {
    const { signature } = req.body;

    if (!signature) throw new BadRequestError("Signature is required");

    const accessToken = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    const userId = decodedToken?.userId;


    const user = await User.findById(userId);

    if(!user?.biometric_key) throw new BadRequestError("Biometric key not found");

    const isVerifySignature = await verifySignature(signature, user?._id, user?.biometric_key);


    if(!isVerifySignature) throw new UnauthenticatedError("Invalid signature");

    const access_token = jwt.sign({ userId }, process.env.SOCKET_TOKEN_SECRET, { expiresIn: process.env.SOCKET_TOKEN_EXPIRY });
    const refresh_token = jwt.sign({ userId }, process.env.REFRESH_SOCKET_TOKEN_SECRET, { expiresIn: process.env.REFRESH_SOCKET_TOKEN_EXPIRY });

    user.blocked_until_pin = null;
    user.wrong_pin_attempts = 0;

    await user.save();


    return res.status(StatusCodes.OK).json({ success: true, socket_tokens: {
        socket_access_token: access_token,
        socket_refresh_token: refresh_token
    }});
}


async function verifySignature(signature, payload, publicKey) {
    const publicKeyBuffer = Buffer.from(publicKey, 'base64');
    const key = new NodeRSA();
    const signedData = key.importKey(publicKeyBuffer, 'public-der');
    const signatureVerified = signedData.verify(Buffer.from(payload), signature, 'utf8', 'base64');

    return signatureVerified;
}


export { uploadBiometrics, verifyBiometricKey };