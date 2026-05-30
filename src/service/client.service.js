import { v4 as uuidv4 } from 'uuid';
import crypto from "crypto";
import bcrypt from "bcrypt";
import pool from '../model/db.js'
import ApiError from '../../common/ApiError.js';
import ApiResponse from '../../common/ApiResponse.js';

const registerClient = async (req, res) => { 
    const { app_name, redirect_uri } = req.body;
    const isExistingClient = await pool.query("SELECT * FROM client WHERE app_name = $1", [app_name]);
    if(isExistingClient.rows.length > 0) {
        throw ApiError.badRequest("Client already exists");
    }
    if(!app_name || !redirect_uri) {
        throw ApiError.badRequest("App name and redirect URI are required");
    }
    const client_id = uuidv4()
    const client_secret = crypto.randomBytes(32).toString('hex');
    const hashed_secret = bcrypt.hash(client_secret, 10);
    const client = await Pool.query("Insert into client (client_id,client_secret,app_name,redirect_uri) values($1, $2, $3,$4) RETURNING *", [client_id, client_secret, app_name, redirect_uri])
    
}

export {registerClient}
