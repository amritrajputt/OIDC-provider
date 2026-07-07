
import { generateKeyPairSync } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import pool from '../model/db.js';

export async function rotateSigningKeys(): Promise<string> {
    
    const newKid = `key-${uuidv4()}`;

    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        
        await client.query("UPDATE signing_keys SET status = 'retired' WHERE status = 'active'");

        await client.query(
            "INSERT INTO signing_keys (kid, private_key, public_key, status) VALUES ($1, $2, $3, $4)",
            [newKid, privateKey, publicKey, 'active']
        );

        await client.query('COMMIT');
        return newKid;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}