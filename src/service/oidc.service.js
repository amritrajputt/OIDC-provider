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

    const host = req.get('host');
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const expectedDemoRedirectUri = `${protocol}://${host}/demo-client/callback`;

    let isRedirectUriValid = (client.rows[0].redirect_uri === redirect_uri);
    if (client_id === 'demo-client-id' && !isRedirectUriValid) {
        isRedirectUriValid = (redirect_uri === expectedDemoRedirectUri);
    }
    if (client_id === 'todo-client-id' && !isRedirectUriValid) {
        try {
            const url = new URL(redirect_uri);
            const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
            const isRender = url.hostname.endsWith('.onrender.com');
            const isCorrectPath = url.pathname === '/api/auth/callback';
            if ((isLocalhost || isRender) && isCorrectPath) {
                isRedirectUriValid = true;
            }
        } catch (e) {
        }
    }

    if (!isRedirectUriValid) {
        throw ApiError.badRequest("Invalid redirect URI")
    }
    if (response_type !== 'code') {
        throw ApiError.badRequest("Invalid response type. Only 'code' is supported.");
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    if (!req.session.userId) {
        const loginUrl = `${frontendUrl}/login?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&response_type=${response_type}&scope=${scope}&state=${state}`;
        return res.redirect(loginUrl);
    }

    if (req.query.consented !== 'true') {
        const consentUrl = `${frontendUrl}/consent?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&response_type=${response_type}&scope=${scope}&state=${state}&app_name=${encodeURIComponent(client.rows[0].app_name)}`;
        return res.redirect(consentUrl);
    }

    const userId = req.session.userId;
    console.log("User logged in:", userId);
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

    const host = req.get('host');
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const expectedDemoRedirectUri = `${protocol}://${host}/demo-client/callback`;

    let isRedirectUriValid = (clientRequest.rows[0].redirect_uri === redirect_uri);
    if (client_id === 'demo-client-id' && !isRedirectUriValid) {
        isRedirectUriValid = (redirect_uri === expectedDemoRedirectUri);
    }
    if (client_id === 'todo-client-id' && !isRedirectUriValid) {
        try {
            const url = new URL(redirect_uri);
            const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
            const isRender = url.hostname.endsWith('.onrender.com');
            const isCorrectPath = url.pathname === '/api/auth/callback';
            if ((isLocalhost || isRender) && isCorrectPath) {
                isRedirectUriValid = true;
            }
        } catch (e) {
            // Invalid URL format
        }
    }

    if (!isRedirectUriValid) {
        throw ApiError.badRequest("invalid_redirect_uri")
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


// Helper function to authenticate clients via Basic Auth or POST Body
const authenticateClient = async (req) => {
    let client_id, client_secret;

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

//token introspection is used to check if the token is valid or not 
const tokenIntrospectionService = async (req, res) => {
    const client = await authenticateClient(req);

    const { token, token_type_hint } = req.body;
    if (!token) {
        throw ApiError.badRequest("invalid_request: Token is required");
    }

    let decoded;
    let isActive = false;
    let tokenType = 'access_token';

    try {
        if (token_type_hint === 'refresh_token') {
            try {
                decoded = Jwt.verifyRefreshToken(token);
                isActive = true;
                tokenType = 'refresh_token';
            } catch (err) {
                decoded = Jwt.verifyAccessToken(token);
                isActive = true;
                tokenType = 'access_token';
            }
        } else {
            try {
                decoded = Jwt.verifyAccessToken(token);
                isActive = true;
                tokenType = 'access_token';
            } catch (err) {
                decoded = Jwt.verifyRefreshToken(token);
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
const refreshTokenService = async (req, res) => {
    const client = await authenticateClient(req);

    const { refresh_token } = req.body;
    if (!refresh_token) {
        throw ApiError.badRequest("invalid_request: Token is required");
    }

    let decoded;
    try {
        decoded = Jwt.verifyRefreshToken(refresh_token);
    } catch (error) {
        throw ApiError.unauthorized("invalid_grant: Invalid or expired refresh token");
    }

    if (decoded.aud !== client.client_id) {
        throw ApiError.badRequest("invalid_grant: Client mismatch");
    }

    const userResult = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [decoded.sub]);
    if (userResult.rows.length === 0) {
        throw ApiError.unauthorized("invalid_grant: User not found");
    }
    const user = userResult.rows[0];

    const accessToken = Jwt.signAccessToken({
        sub: user.id,
        aud: client.client_id,
        iss: process.env.ISSUER_URL || "http://localhost:3000",
    }, "15m");

    const newRefreshToken = Jwt.signRefreshToken({
        sub: user.id,
        aud: client.client_id,
        iss: process.env.ISSUER_URL || "http://localhost:3000",
        jti: uuidv4()
    }, "7d");

    const idToken = Jwt.signIdToken({
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