import pool from "../model/db.js";
import bcrypt from "bcrypt";
import * as authService from "../service/auth.service.js";

const register = async (req, res) => {
   try{
    const {email, name, password} = req.body;
    const response = await authService.register(email, name, password);
    return res.status(response.statusCode).json(response);
   }catch(error){
    return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
        error: error.error || []
    });
   }
}
const login = async (req, res) => {
    try{
        const {email, password} = req.body;
        const response = await authService.login(email, password);
        req.session.userId = response.data.id;
        return res.status(response.statusCode).json(response);
    }catch(error){
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Internal Server Error",
            error: error.error || []
        });
    }
}
export {register,login}