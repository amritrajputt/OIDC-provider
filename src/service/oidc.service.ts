import pool from "../model/db.js"
import ApiError from "../../common/ApiError.js"
import { v4 as uuidv4 } from "uuid"
import bcrypt from "bcrypt"
import { Jwt } from "../utils/utils.jwt.js"
import { Request, Response } from "express";
import { isValidRedirectUri } from "../utils/oidc.utils.js";

interface AuthorizeQuery {
    client_id?: string;
    redirect_uri?: string;
    response_type?: string;
    scope?: string;
    state?: string;
    consented?: string;
}

interface TokenRequestBody {
    grant_type: string;
    code: string;
    client_id: string;
    client_secret: string;
    redirect_uri: string;
}


const authorizeService = async (req: Request<any, any, any, AuthorizeQuery>, res: Response) => {
    const { client_id, redirect_uri, response_type, scope, state, consented } = req.query
    const client = await pool.query("select * from clients where client_id=$1", [client_id])
    if (client.rows.length == 0) {
        throw ApiError.notFound("Client not found")
    }

    const host = req.get('host') || '';
    const isRedirectUriValid = isValidRedirectUri({
        clientId: client_id || '',
        incomingRedirectUri: redirect_uri || '',
        dbRedirectUri: client.rows[0].redirect_uri,
        host
    });

    if (!isRedirectUriValid) {
        throw ApiError.badRequest("Invalid redirect URI");
    }

    if (response_type !== 'code') {
        throw ApiError.badRequest("Invalid response type. Only 'code' is supported.");
    }
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";



    //checking that with demo email you are allowed to enter only demo-client app
    if (req.session.userId) {
        const userQuery = await pool.query("SELECT email FROM users WHERE id = $1", [req.session.userId]);
        if (userQuery.rows.length > 0 && userQuery.rows[0].email === 'demo@example.com' && client_id !== 'demo-client-id') {
            req.session.userId = null;
        }
    }

    if (!req.session.userId) {
        const loginUrl = `${frontendUrl}/login?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&response_type=${response_type}&scope=${scope}&state=${state}`;
        return res.redirect(loginUrl);
    }

    if (consented !== 'true') {
        const consentUrl = `${frontendUrl}/consent?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&response_type=${response_type}&scope=${scope}&state=${state}&app_name=${encodeURIComponent(client.rows[0].app_name)}`;
        return res.redirect(consentUrl);
    }

    const userId = req.session.userId;
    const code = uuidv4();
    const expires_at = new Date(Date.now() + 2 * 60 * 1000);
    await pool.query(
        "INSERT INTO autorization_codes (code, user_id, client_id, expires_at, is_used) VALUES ($1, $2, $3, $4, $5)",
        [code, userId, client.rows[0].id, expires_at, false]
    )
    const finalUrl = `${redirect_uri}?code=${code}&state=${state}`
    res.redirect(finalUrl)
}


const tokenService = async (req: Request<any, any, TokenRequestBody>, res: Response) => {
    const { grant_type, code, client_id, client_secret, redirect_uri } = req.body;

    // "authorization_code": Required by OIDC standard
    if (grant_type !== "authorization_code") {
        throw ApiError.badRequest("unsupported_grant_type");
    }
    const clientRequest = await pool.query("select * from  clients where client_id = $1", [client_id])
    if (clientRequest.rows.length == 0) {
        throw ApiError.badRequest("invalid_client")
    }

    const host = req.get('host') || '';
    const isRedirectUriValid = isValidRedirectUri({
        clientId: client_id || '',
        incomingRedirectUri: redirect_uri || '',
        dbRedirectUri: clientRequest.rows[0].redirect_uri,
        host
    });

    if (!isRedirectUriValid) {
        throw ApiError.badRequest("invalid_redirect_uri");
    }

    const isSecretValid = await bcrypt.compare(client_secret, clientRequest.rows[0].client_secret);

    if (!isSecretValid) {
        throw ApiError.badRequest("invalid_client")
    }

    const updateResult = await pool.query(
        "UPDATE autorization_codes SET is_used = true WHERE code = $1 AND is_used = false RETURNING *",
        [code]
    );

    if (updateResult.rows.length === 0) {
        throw ApiError.badRequest("invalid_grant");
    }

    const codeRecord = updateResult.rows[0];

    if (codeRecord.expires_at < new Date()) {
        throw ApiError.badRequest("invalid_grant");
    }

    if (codeRecord.client_id !== clientRequest.rows[0].id) {
        throw ApiError.badRequest("invalid_client");
    }

    const userRequest = await pool.query("SELECT * FROM users WHERE id = $1", [codeRecord.user_id]);
    const user = userRequest.rows[0]


    const accessToken =await Jwt.signAccessToken({
        sub: user.id, // sub tells about who is the user who has logged in to your application gives userid
        aud: clientRequest.rows[0].client_id, //client who has requested the token gives client  
        iss: process.env.ISSUER_URL || "http://localhost:3000", //issuer who has issued the token 

    }, "15m")

    const refreshToken =await Jwt.signRefreshToken({
        sub: user.id,
        aud: clientRequest.rows[0].client_id,
        iss: process.env.ISSUER_URL || "http://localhost:3000", //issuer who has issued the token 
        jti: uuidv4()
    }, "7d")

    const idToken =await Jwt.signIdToken({
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

const userInfoService = async (req:Request, res:Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'invalid_token' });
    }

    const token = authHeader.replace('Bearer ', '');
    let decoded: any;
    try {
        decoded = await Jwt.verifyAccessToken(token);
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


// Helper function to authenticate clients via Basic before providing sesitive information ex introspect and refresh token endpoint
const authenticateClient = async (req:Request) => {
    let client_id:string, client_secret:string;

    // Check Basic Auth header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Basic ')) {
        try {
            const credentials = Buffer.from(authHeader.substring(6), 'base64').toString('ascii').split(':');
            client_id = credentials[0];
            client_secret = credentials[1];
        } catch (e) {
            throw ApiError.unauthorized("invalid_client");
        }
    } else {
        // Fallback to body params
        client_id = req.body.client_id;
        client_secret = req.body.client_secret;
    }

    if (!client_id || !client_secret) {
        throw ApiError.unauthorized("invalid_client");
    }

    const clientQuery = await pool.query("SELECT * FROM clients WHERE client_id = $1", [client_id]);
    if (clientQuery.rows.length === 0) {
        throw ApiError.unauthorized("invalid_client");
    }

    const client = clientQuery.rows[0];

    const isSecretValid = await bcrypt.compare(client_secret, client.client_secret);
    if (!isSecretValid) {
        throw ApiError.unauthorized("invalid_client");
    }

    return client;
};

// Token introspection (RFC 7662) - Used by client backend to validate tokens
const tokenIntrospectionService = async (req:Request, res:Response) => {
    const client = await authenticateClient(req);

    const { token, token_type_hint } = req.body as {
        token:string;
        token_type_hint:string;
    };

    if (!token) {
        throw ApiError.badRequest("invalid_request: Token is required");
    }

    let decoded:any;
    let isActive = false;
    let tokenType = 'access_token';

    try {
        if (token_type_hint === 'refresh_token') {
            try {
                decoded = await Jwt.verifyRefreshToken(token);
                isActive = true;
                tokenType =  'refresh_token';
            } catch (err) {
                decoded = await Jwt.verifyAccessToken(token);
                isActive = true;
                tokenType = 'access_token';
            }
        } else {
            try {
                decoded = await Jwt.verifyAccessToken(token);
                isActive = true;
                tokenType = 'access_token';
            } catch (err) {
                decoded = await Jwt.verifyRefreshToken(token);
                isActive = true;
                tokenType = 'refresh_token';
            }
        }
    } catch (error) {
        isActive = false;
    }

    if (isActive && decoded && decoded.sub) {
        const userQuery = await pool.query('SELECT id FROM users WHERE id = $1', [decoded.sub]);
        if (userQuery.rows.length === 0) {
            isActive = false;
        }
    }
    //check that refresh token is of same client who is requesting for new token otherwise anyone can get access token by giving any other registered apps refresh token 
    if (isActive && decoded && decoded.aud !== client.client_id) {
        isActive = false;
    }

    if (isActive) {
        return res.status(200).json({
            active: true,
            scope: decoded.scope || 'openid',
            client_id: decoded.aud,
            sub: decoded.sub,
            exp: decoded.exp,
            iat: decoded.iat,
            iss: decoded.iss,
            token_type: tokenType
        });
    } else {
        return res.status(200).json({
            active: false
        });
    }
};

//refresh token 
const refreshTokenService = async (req:Request, res:Response) => {
    const client = await authenticateClient(req);

    const { refresh_token } = req.body;
    if (!refresh_token) {
        throw ApiError.badRequest("invalid_request: Token is required");
    }

    let decoded: any;
    try {
        decoded = await Jwt.verifyRefreshToken(refresh_token);
    } catch (error) {
        throw ApiError.unauthorized("invalid_grant: Invalid or expired refresh token");
    }
    //check that refresh token is of same client who is requesting for new token otherwise anyone can get access token by giving any other registered apps refresh token
    if (decoded.aud !== client.client_id) {
        throw ApiError.badRequest("invalid_grant: Client mismatch");
    }

    const userResult = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [decoded.sub]);
    if (userResult.rows.length === 0) {
        throw ApiError.unauthorized("invalid_grant: User not found");
    }
    const user = userResult.rows[0];

    const accessToken =await Jwt.signAccessToken({
        sub: user.id,
        aud: client.client_id,
        iss: process.env.ISSUER_URL || "http://localhost:3000",
    }, "15m");

    const newRefreshToken = await Jwt.signRefreshToken({
        sub: user.id,
        aud: client.client_id,
        iss: process.env.ISSUER_URL || "http://localhost:3000",
        jti: uuidv4()
    }, "7d");

    const idToken = await Jwt.signIdToken({
        sub: user.id,
        name: user.name,
        email: user.email,
        aud: client.client_id,
        iss: process.env.ISSUER_URL || "http://localhost:3000",
    }, "15m");

    return res.status(200).json({
        access_token: accessToken,
        id_token: idToken,
        refresh_token: newRefreshToken,
        token_type: "Bearer",
        expires_in: 900
    });
};

export { authorizeService, tokenService, userInfoService, tokenIntrospectionService, refreshTokenService }