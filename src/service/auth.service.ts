import pool from "../model/db.js";
import ApiError from "../../common/ApiError.js";
import ApiResponse from "../../common/ApiResponse.js";
import bcrypt from "bcrypt";


    const register = async (email, name, password) => {
        const isExistingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (isExistingUser.rows.length > 0) {
            throw ApiError.badRequest('User already exists');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await pool.query('INSERT INTO users (email, name, password) VALUES ($1, $2, $3) RETURNING *', [email, name, hashedPassword]);
        return ApiResponse.success(201, user.rows[0], 'User registered successfully');
    }
    const login = async(email, password) => {
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            throw ApiError.badRequest('User not found');
        }
        const isPasswordValid = await bcrypt.compare(password, user.rows[0].password);
        if (!isPasswordValid) {
            throw ApiError.unauthorized('Invalid credentials');
        }
        return ApiResponse.success(200, user.rows[0], 'User logged in successfully');
    }


export {register, login}
