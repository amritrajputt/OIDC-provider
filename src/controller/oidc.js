import { authorizeService, tokenService, userInfoService } from "../service/oidc.service.js"

const authorizeController = async (req, res) => {
    try {
        await authorizeService(req, res);
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Internal Server Error",
            error: error.error || []
        });
    }
}

const tokenController = async (req, res) => {
    try {
        await tokenService(req, res);
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Internal Server Error",
            error: error.error || []
        });
    }
}

const userInfoController = async (req, res) => {
    try {
        await userInfoService(req, res);
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Internal Server Error",
            error: error.error || []
        });
    }
}

export { authorizeController, tokenController, userInfoController }