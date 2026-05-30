import pool from "../model/db.js"
import ApiError from "../../common/ApiError.js"
import { v4 as uuidv4 } from "uuid"
import bcrypt from "bcrypt"
import { Jwt } from "../utils/utils.jwt.js"

const authorizeService = async (req, res) => {
    const { client_id, redirect_uri, response_type, scope, state } = req.query
    const client = await pool.query("select * from clients where client_id=$1", [client_id])
    if (client.rows.length == 0) {
        throw ApiError.notFound("Client not found")
    }
    if (client.rows[0].redirect_uri != redirect_uri) {
        throw ApiError.badRequest("Invalid redirect URI")
    }
    if (response_type !== 'code') {
        throw ApiError.badRequest("Invalid response type. Only 'code' is supported.");
    }

    if (!req.session.userId) {
        throw ApiError.unauthorized("User not logged in. Please login via POST /api/auth/login first.");
    }
    const userId = req.session.userId
    console.log("User logged in:", userId)
    const code = uuidv4();
    const expires_at = new Date(Date.now() + 2 * 60 * 1000);
    await pool.query(
        "INSERT INTO autorization_codes (code, user_id, client_id, expires_at, is_used) VALUES ($1, $2, $3, $4, $5)",
        [code, userId, client.rows[0].id, expires_at, false]
    )
    const finalUrl = `${redirect_uri}?code=${code}&state=${state}`
    res.redirect(finalUrl)

}

const tokenService = async (req, res) => {
    const { grant_type, code, client_id, client_secret, redirect_uri } = req.body;
    if (grant_type !== "authorization_code") {
        throw ApiError.badRequest("unsupported_grant_type");
    }
    const clientRequest = await pool.query("select * from  clients where client_id = $1", [client_id])
    if (clientRequest.rows.length == 0) {
        throw ApiError.badRequest("invalid_client")
    }
    if (clientRequest.rows[0].redirect_uri !== redirect_uri) {
        throw ApiError.badRequest("invalid_redirect_uri")
    }
    const isSecretValid = await bcrypt.compare(client_secret, clientRequest.rows[0].client_secret);
    if (!isSecretValid) {
        throw ApiError.badRequest("invalid_client")
    }
    const codeRequest = await pool.query("select * from autorization_codes where code = $1", [code])

    if (codeRequest.rows.length == 0) {
        throw ApiError.badRequest("invalid_code")
    }
    if (codeRequest.rows[0].is_used) {
        throw ApiError.badRequest("invalid_code")
    }
    if (codeRequest.rows[0].expires_at < new Date()) {
        throw ApiError.badRequest("invalid_code")
    }
    if (codeRequest.rows[0].client_id !== clientRequest.rows[0].id) {
        throw ApiError.badRequest("invalid_client")
    }
    await pool.query("UPDATE autorization_codes SET is_used = true WHERE code = $1", [code])
    const userRequest = await pool.query("SELECT * FROM users WHERE id = $1", [codeRequest.rows[0].user_id])
    const user = userRequest.rows[0]


    const accessToken = Jwt.signAccessToken({
        sub: user.id, // sub tells about who is the user who has logged in to your application
        aud: clientRequest.rows[0].client_id, //client who has requested the token 
        iss: process.env.ISSUER_URL || "http://localhost:3000", //issuer who has issued the token 
       
    }, "15m")

    const refreshToken = Jwt.signRefreshToken({
        sub: user.id,
        aud: clientRequest.rows[0].client_id,
        iss: process.env.ISSUER_URL || "http://localhost:3000", //issuer who has issued the token 
        jti: uuidv4()
    }, "7d")

    const idToken = Jwt.signIdToken({
        sub: user.id,
        name: user.name,
        email: user.email,
        aud: clientRequest.rows[0].client_id,
        iss: process.env.ISSUER_URL || "http://localhost:3000",
        
    }, "15m")

    return res.status(200).json({
        access_token: accessToken,
        id_token: idToken,
        refresh_token: refreshToken,
        token_type: "Bearer",
        expires_in: 900 
    });
}

const userInfoService = async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'invalid_token' });
    }

    const token = authHeader.replace('Bearer ', '');
    let decoded;
    try {
        decoded = Jwt.verifyAccessToken(token);
    } catch (error) {
        return res.status(401).json({ error: 'invalid_token', message: error.message });
    }

    const user = await pool.query('SELECT id, name, email, created_at FROM users WHERE id = $1', [decoded.sub]);

    if (user.rows.length === 0) {
        return res.status(401).json({ error: 'invalid_token' });
    }

    return res.json({
        sub: user.rows[0].id,
        name: user.rows[0].name,
        email: user.rows[0].email,
    });
};
export { authorizeService, tokenService, userInfoService }