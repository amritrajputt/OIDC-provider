import { v4 as uuidv4 } from 'uuid';
import crypto from "crypto";
import bcrypt from "bcrypt";
import pool from '../model/db.js'
import ApiError from '../../common/ApiError.js';
import ApiResponse from '../../common/ApiResponse.js';

const registerClient = async (app_name, redirect_uri) => { 
    if (!app_name || !redirect_uri) {
        throw ApiError.badRequest("App name and redirect URI are required");
    }
    
    const isExistingClient = await pool.query("SELECT * FROM clients WHERE app_name = $1", [app_name]);
    if (isExistingClient.rows.length > 0) {
        throw ApiError.badRequest("Client already exists");
    }
    
    const client_id = uuidv4();
    const client_secret = crypto.randomBytes(32).toString('hex');
    const hashed_secret = await bcrypt.hash(client_secret, 10);
    
    const result = await pool.query(
        "INSERT INTO clients (client_id, client_secret, app_name, redirect_uri) VALUES ($1, $2, $3, $4) RETURNING *", 
        [client_id, hashed_secret, app_name, redirect_uri]
    );

    const client = {
        id: result.rows[0].id,
        client_id: result.rows[0].client_id,
        client_secret: client_secret, 
        app_name: result.rows[0].app_name,
        redirect_uri: result.rows[0].redirect_uri,
        created_at: result.rows[0].created_at
    };

    return ApiResponse.success(201, client, "Client registered successfully");
}

export { registerClient }
