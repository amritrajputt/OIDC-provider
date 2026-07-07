import pool from "../model/db.js"
import ApiError from "../../common/ApiError.js"
import { v4 as uuidv4 } from "uuid"
import bcrypt from "bcrypt"
import { Jwt } from "../utils/utils.jwt.js"
import { isValidRedirectUri } from "../utils/oidc.utils.js";

import crypto from "crypto";

function base64UrlEncode(buffer: Buffer): string {
    return buffer.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

function generateS256Challenge(verifier: string): string {
    const hash = crypto.createHash('sha256').update(verifier).digest();
    return base64UrlEncode(hash);
}


interface AuthorizeParams {
    clientId: string;
    redirectUri: string;
    responseType: string;
    scope: string;
    state: string;
    consented: string;
    userId: string | null | undefined;
    host: string;
     codeChallenge?: string;      
    codeChallengeMethod?: string;
}

const authorizeService = async (params: AuthorizeParams) => {
    const { clientId, redirectUri, responseType, scope, state, consented, userId, host, codeChallenge, codeChallengeMethod } = params;

    const clientQuery = await pool.query("SELECT * FROM clients WHERE client_id=$1", [clientId]);
    if (clientQuery.rows.length === 0) {
        throw ApiError.notFound("Client not found");
    }

    const isRedirectUriValid = isValidRedirectUri({
        clientId: clientId || '',
        incomingRedirectUri: redirectUri || '',
        dbRedirectUri: clientQuery.rows[0].redirect_uri,
        host
    });

    if (!isRedirectUriValid) {
        throw ApiError.badRequest("Invalid redirect URI");
    }

    if (responseType !== 'code') {
        throw ApiError.badRequest("Invalid response type. Only 'code' is supported.");
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";


    let sessionUserId = userId;
    if (userId) {
        const userQuery = await pool.query("SELECT email FROM users WHERE id = $1", [userId]);
        if (userQuery.rows.length > 0 && userQuery.rows[0].email === 'demo@example.com' && clientId !== 'demo-client-id') {
            sessionUserId = null;
        }
    }

    if (!sessionUserId) {
        const loginUrl = `${frontendUrl}/login?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=${responseType}&scope=${scope}&state=${state}`;
        return { type: 'redirect', url: loginUrl, sessionUserId: null };
    }

    if (consented !== 'true') {
        const consentUrl = `${frontendUrl}/consent?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=${responseType}&scope=${scope}&state=${state}&app_name=${encodeURIComponent(clientQuery.rows[0].app_name)}`;
        return { type: 'redirect', url: consentUrl, sessionUserId };
    }

    // Generate Code
    const code = uuidv4();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);
    await pool.query(
        "INSERT INTO autorization_codes (code, user_id, client_id, expires_at, is_used, code_challenge, code_challenge_method) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [code, sessionUserId, clientQuery.rows[0].id, expiresAt, false, codeChallenge || null, codeChallengeMethod || null]
    );

    const finalUrl = `${redirectUri}?code=${code}&state=${state}`;
    return { type: 'redirect', url: finalUrl, sessionUserId };
};
interface ClientAuthParams {
    clientId?: string;
    clientSecret?: string;
    authHeader?: string;
}

const authenticateClient = async (params: ClientAuthParams) => {
    let client_id = params.clientId;
    let client_secret = params.clientSecret;
    if (params.authHeader && params.authHeader.startsWith('Basic ')) {
        try {
            const credentials = Buffer.from(params.authHeader.substring(6), 'base64').toString('ascii').split(':');
            client_id = credentials[0];
            client_secret = credentials[1];
        } catch (e) {
            throw ApiError.unauthorized("invalid_client");
        }
    }

    if (!client_id || !client_secret) {
        throw ApiError.unauthorized("invalid_client: Credentials required");
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

interface AuthCodeParams {
    code: string;
    clientId: string;
    clientSecret?: string;
    redirectUri: string;
    host: string;
    codeVerifier?: string;
}

const exchangeAuthCodeService = async (params: AuthCodeParams) => {
    const { code, clientId, clientSecret, redirectUri, host, codeVerifier } = params;

    const clientQuery = await pool.query("SELECT * FROM clients WHERE client_id = $1", [clientId]);
    if (clientQuery.rows.length === 0) {
        throw ApiError.badRequest("invalid_client");
    }
    const client = clientQuery.rows[0];

    const isRedirectUriValid = isValidRedirectUri({
        clientId,
        incomingRedirectUri: redirectUri,
        dbRedirectUri: client.redirect_uri,
        host
    });

    if (!isRedirectUriValid) {
        throw ApiError.badRequest("invalid_redirect_uri");
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
        throw ApiError.badRequest("invalid_grant: Expired code");
    }

    if (codeRecord.client_id !== client.id) {
        throw ApiError.badRequest("invalid_client: Code client mismatch");
    }

    // --- PKCE VERIFICATION BLOCK ---
    if (codeRecord.code_challenge) {
        // PKCE flow is enabled for this code
        if (!codeVerifier) {
            throw ApiError.badRequest("invalid_grant: code_verifier is required for PKCE flow");
        }

        let isVerifierValid = false;
        if (codeRecord.code_challenge_method === 'S256') {
            const calculatedChallenge = generateS256Challenge(codeVerifier);
            isVerifierValid = (calculatedChallenge === codeRecord.code_challenge);
        } else if (codeRecord.code_challenge_method === 'plain') {
            isVerifierValid = (codeVerifier === codeRecord.code_challenge);
        } else {
            throw ApiError.badRequest("server_error: Unsupported code_challenge_method");
        }

        if (!isVerifierValid) {
            throw ApiError.badRequest("invalid_grant: Invalid code_verifier");
        }
    } else {
        // Standard flow requires verification of client_secret
        if (!clientSecret) {
            throw ApiError.badRequest("invalid_client: client_secret is required");
        }
        const isSecretValid = await bcrypt.compare(clientSecret, client.client_secret);
        if (!isSecretValid) {
            throw ApiError.badRequest("invalid_client");
        }
    }
    // --- END OF PKCE VERIFICATION BLOCK ---

    const userQuery = await pool.query("SELECT * FROM users WHERE id = $1", [codeRecord.user_id]);
    const user = userQuery.rows[0];

    const accessToken = await Jwt.signAccessToken({
        sub: user.id,
        aud: client.client_id,
        iss: process.env.ISSUER_URL || "http://localhost:3000",
    }, "15m");

    const refreshJti = uuidv4();
    const refreshToken = await Jwt.signRefreshToken({
        sub: user.id,
        aud: client.client_id,
        iss: process.env.ISSUER_URL || "http://localhost:3000",
        jti: refreshJti
    }, "7d");

    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(
        "INSERT INTO refresh_tokens (jti, user_id, client_id, expires_at, parent_jti) VALUES ($1, $2, $3, $4, NULL)",
        [refreshJti, user.id, client.id, refreshExpiresAt]
    );

    const idToken = await Jwt.signIdToken({
        sub: user.id,
        name: user.name,
        email: user.email,
        aud: client.client_id,
        iss: process.env.ISSUER_URL || "http://localhost:3000",
    }, "15m");

    return {
        access_token: accessToken,
        id_token: idToken,
        refresh_token: refreshToken,
        token_type: "Bearer",
        expires_in: 900
    };
};


interface RefreshTokenParams {
    refreshToken: string;
    clientId?: string;
    clientSecret?: string;
    authHeader?: string;
}

const exchangeRefreshTokenService = async (params: RefreshTokenParams) => {
    const client = await authenticateClient(params);
    const { refreshToken } = params;

    let decoded: any;
    try {
        decoded = await Jwt.verifyRefreshToken(refreshToken);
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

    const newJti = uuidv4();
    const accessToken = await Jwt.signAccessToken({
        sub: user.id,
        aud: client.client_id,
        iss: process.env.ISSUER_URL || "http://localhost:3000",

    }, "15m");

    const newRefreshToken = await Jwt.signRefreshToken({
        sub: user.id,
        aud: client.client_id,
        iss: process.env.ISSUER_URL || "http://localhost:3000",
        jti: newJti
    }, "7d");

    const idToken = await Jwt.signIdToken({
        sub: user.id,
        name: user.name,
        email: user.email,
        aud: client.client_id,
        iss: process.env.ISSUER_URL || "http://localhost:3000",
    }, "15m");

    const dbClient = await pool.connect();
    try {
        await dbClient.query('BEGIN');

        const tokenQuery = await dbClient.query(
            "SELECT * FROM refresh_tokens WHERE jti = $1 FOR UPDATE",
            [decoded.jti]
        );
        if (tokenQuery.rows.length === 0) {
            throw ApiError.unauthorized("invalid_grant: Token not found or untracked");
        }

        const tokenRecord = tokenQuery.rows[0];

        if (tokenRecord.is_revoked) {
            console.warn(`SECURITY ALERT: Replay attack detected for user ${decoded.sub}. Refresh token ${decoded.jti} was reused!`);
            
            
            await dbClient.query(
                "UPDATE refresh_tokens SET is_revoked = TRUE WHERE user_id = $1 AND client_id = $2",
                [decoded.sub, client.id]
            );

            await dbClient.query('COMMIT');
            throw ApiError.unauthorized("invalid_grant: Refresh token has already been used. Session compromised.");
        }

        if (tokenRecord.expires_at < new Date()) {
            throw ApiError.unauthorized("invalid_grant: Refresh token expired");
        }

       
        await dbClient.query(
            "UPDATE refresh_tokens SET is_revoked = TRUE WHERE jti = $1",
            [decoded.jti]
        );

       
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await dbClient.query(
            "INSERT INTO refresh_tokens (jti, user_id, client_id, expires_at, parent_jti) VALUES ($1, $2, $3, $4, $5)",
            [newJti, user.id, client.id, expiresAt, decoded.jti]
        );

        await dbClient.query('COMMIT');
    } catch (dbError) {
        await dbClient.query('ROLLBACK');
        throw dbError;
    } finally {
        dbClient.release();
    }
    return {
        access_token: accessToken,
        id_token: idToken,
        refresh_token: newRefreshToken,
        token_type: "Bearer",
        expires_in: 900
    };
};


const userInfoService = async (accessToken: string) => {
    let decoded: any;
    try {
        decoded = await Jwt.verifyAccessToken(accessToken);
    } catch (error: any) {
        throw ApiError.unauthorized(`invalid_token: ${error.message}`);
    }

    const user = await pool.query('SELECT id, name, email, created_at FROM users WHERE id = $1', [decoded.sub]);
    if (user.rows.length === 0) {
        throw ApiError.unauthorized('invalid_token: User not found');
    }

    return {
        sub: user.rows[0].id,
        name: user.rows[0].name,
        email: user.rows[0].email,
    };
};

interface RevokeParams {
    token: string;
    tokenTypeHint?: string;
    clientId?: string;
    clientSecret?: string;
    authHeader?: string;
}

const revokeTokenService = async (params: RevokeParams) => {
    const client = await authenticateClient(params);
    const { token } = params;
    try {
        const decoded = await Jwt.verifyRefreshToken(token) as any;
        
        if (decoded.aud !== client.client_id) {
            throw ApiError.badRequest("invalid_grant: Client mismatch");
        }
        await pool.query(
            "UPDATE refresh_tokens SET is_revoked = TRUE WHERE jti = $1",
            [decoded.jti]
        );
    } catch (err) {
        console.warn("Revocation requested for invalid/expired token. Skipping.");
    }
};


interface IntrospectParams {
    token: string;
    tokenTypeHint?: string;
    clientId?: string;
    clientSecret?: string;
    authHeader?: string;
}

const tokenIntrospectionService = async (params: IntrospectParams) => {
    const client = await authenticateClient(params);
    const { token, tokenTypeHint } = params;

    if (!token) {
        throw ApiError.badRequest("invalid_request: Token is required");
    }

    let decoded: any;
    let isActive = false;
    let tokenType = 'access_token';

    try {
        if (tokenTypeHint === 'refresh_token') {
            try {
                decoded = await Jwt.verifyRefreshToken(token);
                isActive = true;
                tokenType = 'refresh_token';
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

    if (isActive && decoded && decoded.aud !== client.client_id) {
        isActive = false;
    }

    if (isActive) {
        return {
            active: true,
            scope: decoded.scope || 'openid',
            client_id: decoded.aud,
            sub: decoded.sub,
            exp: decoded.exp,
            iat: decoded.iat,
            iss: decoded.iss,
            token_type: tokenType
        };
    } else {
        return { active: false };
    }
};

export {
    authorizeService,
    exchangeAuthCodeService,
    exchangeRefreshTokenService,
    userInfoService,
    tokenIntrospectionService,
    revokeTokenService
};