import { Request, Response, NextFunction } from "express";
import ApiError from "../../common/ApiError.js";
import { 
    authorizeService, 
    exchangeAuthCodeService, 
    exchangeRefreshTokenService, 
    userInfoService, 
    tokenIntrospectionService ,
    revokeTokenService
} from "../service/oidc.service.js";


const authorizeController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { client_id, redirect_uri, response_type, scope, state, consented, code_challenge, code_challenge_method } = req.query;
        const userId = req.session.userId;
        const host = req.get('host') || '';

        const result = await authorizeService({
            clientId: client_id as string,
            redirectUri: redirect_uri as string,
            responseType: response_type as string,
            scope: scope as string,
            state: state as string,
            consented: consented as string,
            userId,
            host,
            codeChallenge: code_challenge as string,
            codeChallengeMethod: code_challenge_method as string
        });

        if (result.type === 'redirect') {
            if (result.sessionUserId === null) {
                req.session.userId = null;
            }
            return res.redirect(result.url);
        }

        return res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};


const tokenController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { grant_type, code, client_id, client_secret, redirect_uri, refresh_token, code_verifier } = req.body;

        const host = req.get('host') || '';
        const authHeader = req.headers.authorization; // Basic Auth support

        if (!grant_type) {
            throw ApiError.badRequest("invalid_request: grant_type is required");
        }

        let tokenResult;

        if (grant_type === "authorization_code") {
            if (!code || !client_id || !redirect_uri) {
                throw ApiError.badRequest("invalid_request: Missing parameters for authorization_code grant");
            }
            tokenResult = await exchangeAuthCodeService({
                code,
                clientId: client_id,
                clientSecret: client_secret,
                redirectUri: redirect_uri,
                host
            });
        } else if (grant_type === "refresh_token") {
            if (!refresh_token) {
                throw ApiError.badRequest("invalid_request: refresh_token is required");
            }
            tokenResult = await exchangeRefreshTokenService({
                refreshToken: refresh_token,
                clientId: client_id,
                clientSecret: client_secret,
                authHeader
            });
        } else {
            throw ApiError.badRequest("unsupported_grant_type");
        }

        return res.status(200).json(tokenResult);
    } catch (error) {
        next(error);
    }
};


const userInfoController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'invalid_token', message: 'Missing or invalid authorization header' });
        }
        const accessToken = authHeader.replace('Bearer ', '');
        const profile = await userInfoService(accessToken);
        return res.status(200).json(profile);
    } catch (error) {
        next(error);
    }
};


const tokenIntrospectionController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token, token_type_hint, client_id, client_secret } = req.body;
        const authHeader = req.headers.authorization;

        const result = await tokenIntrospectionService({
            token,
            tokenTypeHint: token_type_hint,
            clientId: client_id,
            clientSecret: client_secret,
            authHeader
        });

        return res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const revokeController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token, token_type_hint, client_id, client_secret } = req.body;
        const authHeader = req.headers.authorization;

        if (!token) {
            throw ApiError.badRequest("invalid_request: Token is required for revocation");
        }

        await revokeTokenService({
            token,
            tokenTypeHint: token_type_hint,
            clientId: client_id,
            clientSecret: client_secret,
            authHeader
        });

        // RFC 7009 specifies returning a 200 OK status on success (even if token is already invalid)
        return res.status(200).json({ success: true, message: "Token revoked successfully" });
    } catch (error) {
        next(error);
    }
};


export { 
    authorizeController, 
    tokenController, 
    userInfoController, 
    tokenIntrospectionController,
    revokeController 
};