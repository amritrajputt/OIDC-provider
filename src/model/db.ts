import {Pool} from 'pg';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const poolConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      }
    : {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
      };

const pool = new Pool({
    ...poolConfig,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

const seedDatabase = async () => {
    try {
        const hashedPassword = await bcrypt.hash('password123', 10);
        await pool.query(`
            INSERT INTO users (email, name, password) 
            VALUES ('demo@example.com', 'Demo User', $1) 
            ON CONFLICT (email) DO NOTHING
        `, [hashedPassword]);

        const hashedSecret = await bcrypt.hash('demo-client-secret', 10);
        const serverUrl = process.env.ISSUER_URL || 'http://localhost:3000';
        const redirectUri = `${serverUrl}/demo-client/callback`;
        await pool.query(`
            INSERT INTO clients (client_id, client_secret, redirect_uri, app_name)
            VALUES ('demo-client-id', $1, $2, 'Demo Client App')
            ON CONFLICT (client_id) DO UPDATE SET redirect_uri = EXCLUDED.redirect_uri
        `, [hashedSecret, redirectUri]);

        const hashedTodoSecret = await bcrypt.hash('todo-client-secret', 10);
        await pool.query(`
            INSERT INTO clients (client_id, client_secret, redirect_uri, app_name)
            VALUES ('todo-client-id', $1, 'http://localhost:4000/api/auth/callback', 'Todo Application')
            ON CONFLICT (client_id) DO UPDATE SET redirect_uri = EXCLUDED.redirect_uri
        `, [hashedTodoSecret]);

        console.log('Database seeded with demo user and client!');
    } catch (err) {
        console.error('Database seeding failed:', err);
    }
};

pool.on('connect', () => {
    console.log('Connected to database');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

const initializeDatabase = async () => {
    try {
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'users'
            );
        `);
        
        if (!tableCheck.rows[0].exists) {
            console.log('Tables do not exist. Initializing database schema...');
            
            const usersSql = fs.readFileSync(path.join(__dirname, '../../db/migrations/001_create_users.sql'), 'utf8');
            const clientsSql = fs.readFileSync(path.join(__dirname, '../../db/migrations/002_create_clients.sql'), 'utf8');
            const authCodesSql = fs.readFileSync(path.join(__dirname, '../../db/migrations/003_create_authorization_codes.sql'), 'utf8');
            
            await pool.query(usersSql);
            await pool.query(clientsSql);
            await pool.query(authCodesSql);
            
            console.log('Database schema initialized successfully!');
        }
        
        await seedDatabase();
    } catch (err) {
        console.error('Database initialization failed:', err);
    }
};

pool.query('SELECT NOW()')
    .then(() => initializeDatabase())
    .catch((err) => console.error('Initial DB connection failed:', err.message));

export default pool;