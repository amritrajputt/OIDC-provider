import { authorizeService, tokenService, userInfoService, tokenIntrospectionService, refreshTokenService } from "../service/oidc.service.js"

const authorizeController = async (req, res) => {
    try {
        await authorizeService(req, res);
    } catch (error) {
        return res.status(error.statusCode || 400).json({
            error: error.message || "invalid_request",
            error_description: error.message || "An error occurred during authorization"
        });
    }
}

const tokenController = async (req, res) => {
    try {
        await tokenService(req, res);
    } catch (error) {
        return res.status(error.statusCode || 400).json({
            error: error.message || "invalid_request",
            error_description: error.message || "An error occurred during token exchange"
        });
    }
}

const userInfoController = async (req, res) => {
    try {
        await userInfoService(req, res);
    } catch (error) {
        return res.status(error.statusCode || 401).json({
            error: "invalid_token",
            error_description: error.message || "An error occurred during userinfo extraction"
        });
    }
}

const tokenIntrospectionController = async (req, res) => {
    try {
        await tokenIntrospectionService(req, res);
    } catch (error) {
        return res.status(error.statusCode || 400).json({
            error: error.message || "invalid_request",
            error_description: error.message || "An error occurred during token introspection"
        });
    }
}

const refreshTokenController = async (req, res) => {
    try {
        await refreshTokenService(req, res);
    } catch (error) {
        return res.status(error.statusCode || 400).json({
            error: error.message || "invalid_request",
            error_description: error.message || "An error occurred during token refresh"
        });
    }
}

export { authorizeController, tokenController, userInfoController,tokenIntrospectionController,refreshTokenController }