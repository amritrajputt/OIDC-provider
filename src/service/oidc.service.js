import pool from "../model/db.js"
import ApiError from "../../common/ApiError.js"
import { v4 as uuidv4 } from "uuid"
const authorizeService = async (req, res) => {
    const { client_id, redirect_uri, response_type, scope, state } = req.query
    const client = await pool.query("select * from clients where client_id=$1", [client_id])
    if (client.rows.length == 0) {
        throw ApiError.notFound("Client not found")
    }
    if (client.rows[0].redirect_uri != redirect_uri) {
        throw ApiError.badRequest("Invalid redirect URI")
    }
    if (response_type !== 'code') {
        throw ApiError.badRequest("Invalid response type. Only 'code' is supported.");
    }

    if (!req.session.userId) {
        throw ApiError.unauthorized("User not logged in. Please login via POST /api/auth/login first.");
    }
    const userId = req.session.userId
    console.log("User logged in:", userId)
    const code = uuidv4();
    const expires_at = new Date(Date.now() + 2 * 60 * 1000); 
    await pool.query(
        "INSERT INTO autorization_codes (code, user_id, client_id, expires_at, is_used) VALUES ($1, $2, $3, $4, $5)", 
        [code, userId, client.rows[0].id, expires_at, false]
    )
    const finalUrl = `${redirect_uri}?code=${code}&state=${state}`
    res.redirect(finalUrl)

}


export {authorizeService}