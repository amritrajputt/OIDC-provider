import crypto from "crypto"
import dotenv from "dotenv"
dotenv.config()
import jwt from "jsonwebtoken"

export class Jwt {
    static privateKey = process.env.PRIVATE_KEY;
    static publicKey = crypto.createPublicKey(process.env.PRIVATE_KEY);

    static signAccessToken(payload, expiresIn) {
        return jwt.sign(payload, this.privateKey, { algorithm: 'RS256', expiresIn })
    }
    static verifyAccessToken(token) {
        return jwt.verify(token, this.publicKey, { algorithms: ["RS256"] })
    }
    static signRefreshToken(payload, expiresIn) {
        return jwt.sign(payload, this.privateKey, { algorithm: 'RS256', expiresIn })
    }
    static verifyRefreshToken(token) {
        return jwt.verify(token, this.publicKey, { algorithms: ["RS256"] })
    }
    static signIdToken(payload, expiresIn) {
        return jwt.sign(payload, this.privateKey, { algorithm: 'RS256', expiresIn })
    }
    static verifyIdToken(token) {
        return jwt.verify(token, this.publicKey, { algorithms: ["RS256"] })
    }
}