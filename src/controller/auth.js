import pool from "../model/db.js";
import bcrypt from "bcrypt";

const register = async (req, res) => {
    const {email, name, password} = req.body;
    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'User already exists' });
    }
const hashedPassword = await bcrypt.hash(password, 10);

    const user = await pool.query('INSERT INTO users (email, name, password) VALUES ($1, $2, $3) RETURNING *', [email, name, hashedPassword]);
    res.json(user.rows[0]);
}