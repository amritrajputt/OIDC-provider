
import pool from "../model/db.js";
import ApiError from "../../common/ApiError.js";
import ApiResponse from "../../common/ApiResponse.js";
import bcrypt from "bcrypt";

interface RegisterInput {
    email: string;
    name: string;
    password: string;
}
interface LoginInput {
    email: string;
    password: string;

}


const register = async (registerInput: RegisterInput) => {
    const { email, name, password } = registerInput;
    const isExistingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (isExistingUser.rows.length > 0) {
        throw ApiError.badRequest('User already exists');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await pool.query(
        'INSERT INTO users (email, name, password) VALUES ($1, $2, $3) RETURNING id, email, name, created_at',
        [email, name, hashedPassword]
    );
    return ApiResponse.success(201, user.rows[0], 'User registered successfully');
}

const login = async (loginInput: LoginInput) => {
    const { email, password } = loginInput;
    const user = await pool.query('SELECT id, email, name, password FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
        throw ApiError.unauthorized('Invalid email or password');
    }
    const isPasswordValid = await bcrypt.compare(password, user.rows[0].password);
    if (!isPasswordValid) {
        throw ApiError.unauthorized('Invalid email or password');
    }
    const userData = {
        id: user.rows[0].id,
        email: user.rows[0].email,
        name: user.rows[0].name
    };
    return ApiResponse.success(200, userData, 'User logged in successfully');
}


export { register, login }
