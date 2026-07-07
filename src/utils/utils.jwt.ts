import crypto from "crypto"
import dotenv from "dotenv"
dotenv.config()
import pool from "../model/db.js"
import jwt, { SignOptions } from "jsonwebtoken"

export interface AccessTokenPayload {
    sub: string;
    aud: string;
    iss: string;
}
export interface RefreshTokenPayload {
    sub: string;
    aud: string;
    iss: string;
    jti: string;
}
export interface IdTokenPayload {
    sub: string;
    name: string;
    email: string;
    aud: string;
    iss: string;
}

async function getActiveSigningKey(): Promise<{ kid: string; privateKey: string }> {
    const result = await pool.query(
        "SELECT kid, private_key FROM signing_keys WHERE status = 'active' LIMIT 1"
    );
    if (result.rows.length === 0) {
        throw new Error("No active signing key found in database!");
    }
    return {
        kid: result.rows[0].kid,
        privateKey: result.rows[0].private_key
    };
}

async function getPublicKeyByKid(kid: string): Promise<string> {
    const result = await pool.query(
        "SELECT public_key FROM signing_keys WHERE kid = $1",
        [kid]
    );
    if (result.rows.length === 0) {
        throw new Error(`Public key not found for kid: ${kid}`);
    }
    return result.rows[0].public_key;
}

export class Jwt {

    static async signAccessToken(payload: AccessTokenPayload, expiresIn: SignOptions['expiresIn']): Promise<string> {
        const {kid,privateKey} = await getActiveSigningKey()
        return jwt.sign(payload, privateKey, { algorithm: 'RS256', expiresIn , keyid:kid})
    }

    static async verifyAccessToken(token: string): Promise<jwt.JwtPayload | string> {
        const decoded = jwt.decode(token, { complete: true })
        if (!decoded) {
            throw new Error("Invalid access token")
        }
        const publicKey = await getPublicKeyByKid(decoded.header.kid)
        return jwt.verify(token, publicKey, { algorithms: ["RS256"] })
    }

    static async signRefreshToken(payload: RefreshTokenPayload, expiresIn: SignOptions['expiresIn']): Promise<string> {
        const {kid,privateKey} = await getActiveSigningKey()
        return jwt.sign(payload, privateKey, { algorithm: 'RS256', expiresIn, keyid: kid })
    }

    static async verifyRefreshToken(token: string): Promise<jwt.JwtPayload | string> {
        const decoded = jwt.decode(token, { complete: true })
        if (!decoded) {
            throw new Error("Invalid refresh token")
        }
        const publicKey = await getPublicKeyByKid(decoded.header.kid)
        return jwt.verify(token, publicKey, { algorithms: ["RS256"] })
    }

    static async signIdToken(payload: IdTokenPayload, expiresIn: SignOptions['expiresIn']): Promise<string> {
        const {kid,privateKey} = await getActiveSigningKey()
        return jwt.sign(payload, privateKey, { algorithm: 'RS256', expiresIn, keyid: kid })
    }

    static async verifyIdToken(token: string): Promise<jwt.JwtPayload | string>{
        const decoded = jwt.decode(token, { complete: true })
        if (!decoded) {
            throw new Error("Invalid id token")
        }
        const publicKey = await getPublicKeyByKid(decoded.header.kid)
        return jwt.verify(token, publicKey, { algorithms: ["RS256"] })
    }

}