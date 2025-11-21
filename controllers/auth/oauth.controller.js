import jwt from 'jsonwebtoken';
import { OAuth2Client } from "google-auth-library";
import { JwksClient } from 'jwks-rsa';
import BadRequestError from '../../errors/bad-request.js';
import User from '../../models/User.js';
import { StatusCodes } from 'http-status-codes';




const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const jwksClientInstance = new JwksClient({
    jwksUri: "https://appleid.apple.com/auth/keys",
    timeout: 30000, // 30 sec
});


async function getKey(kid) {
    return new Promise((resolve, reject) => {
        jwksClientInstance.getSigningKey(kid, (err, key) => {
            if (err) {
                return reject(err);
            }
            const signingKey = key.getPublicKey();
            resolve(signingKey);
        });
    });
}


const signingWithOauth = async (req, res) => {
    const { id_token, provider } = req.body;

    if(!id_token || ['apple', 'google'].includes(provider) || !provider) throw new BadRequestError("Invalid request.");

    try {
        let email, user;

        if(provider === 'apple') {
            const { header } = jwt.decode(id_token, { complete: true });
            const kid = header.kid;
            const publicKey = await getKey(kid);
            ({ email } = jwt.verify(id_token, publicKey))
        }else if (provider === 'google'){
            const ticket = await googleClient.verifyIdToken({
                id_token,
                audience: process.env.GOOGLE_CLIENT_ID
            });

            const payload = ticket.getPayload();
            email = payload?.email;
        }


        user = await User.findOneAndUpdate({ email }, { email_verified: true }, { new: true, upsert: true });

        const access_token = user.createAccessToken();
        const refresh_token = user.createRefreshToken();


        let phone_exist = false;
        let login_pin_exist = false;

        if(user?.phone_number) phone_exist = true;
        if(user?.login_pin) login_pin_exist = true;

        return res.status(StatusCodes.OK).json({ 
            user:{ 
                email: user?.email,
                name: user?.name,
                userId: user?._id,
                phone_exist,
                login_pin_exist
            },
            tokens: {
                access_token,
                refresh_token
            }
        });
    } catch (error) {
        throw new BadRequestError("Invalid request");
    }
}


export { signingWithOauth };