import { Request, Response, NextFunction } from "express";
import ApiError from "../ApiError.js";

export const adminAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers["authorization"];
    const apiKeyHeader = req.headers["x-admin-api-key"];
    
    let providedKey: string | undefined;
    if (typeof apiKeyHeader === "string") {
        providedKey = apiKeyHeader;
    } else if (authHeader && authHeader.startsWith("Bearer ")) {
        providedKey = authHeader.substring(7).trim();
    }

    const expectedKey = process.env.ADMIN_API_KEY;
    if (!expectedKey) {
        return next(ApiError.internalServerError("ADMIN_API_KEY is not configured on the server"));
    }

    if (!providedKey || providedKey !== expectedKey) {
        return next(ApiError.forbidden("Forbidden: Invalid or missing admin API key"));
    }

    next();
};
