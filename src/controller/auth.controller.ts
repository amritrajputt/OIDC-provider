import { Request, Response, NextFunction } from "express";
import * as authService from "../service/auth.service.js";

interface RegisterInput {
    email: string;
    name: string;
    password: string;
}
interface LoginInput {
    email: string;
    password: string;
    client_id: string;
}
const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, name, password } = req.body as RegisterInput;
        const response = await authService.register({ email, name, password });
        return res.status(response.statusCode).json(response);
    } catch (error) {
        next(error);
    }
}

const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body as LoginInput;
        const response = await authService.login({ email, password });

        req.session.regenerate((err) => {
            if (err) {
                console.error("Session regenerate error:", err);
                return res.status(500).json({
                    success: false,
                    message: "Failed to regenerate login session"
                });
            }

            req.session.userId = response.data.id;

            req.session.save((saveErr) => {
                if (saveErr) {
                    console.error("Session save error:", saveErr);
                    return res.status(500).json({
                        success: false,
                        message: "Failed to initialize login session"
                    });
                }
                return res.status(response.statusCode).json(response);
            });
        });
    } catch (error) {
        next(error);
    }
}
export { register, login }