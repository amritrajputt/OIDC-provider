// File: d:\oidc provider\src\utils\rotateKeys.ts
import { generateKeyPairSync } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import pool from '../model/db.js';

export async function rotateSigningKeys(): Promise<string> {
    // 1. Generate random Kid using UUID
    const newKid = `key-${uuidv4()}`;

    // 2. Generate RSA Key Pair synchronously
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    // 3. Database transaction use karein
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Sabhi purani active keys ko 'retired' mark kar do
        await client.query("UPDATE signing_keys SET status = 'retired' WHERE status = 'active'");

        // Nayi key ko status = 'active' ke sath insert karo
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
