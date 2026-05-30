import {Pool} from 'pg';
import bcrypt from 'bcrypt';

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
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
        await pool.query(`
            INSERT INTO clients (client_id, client_secret, redirect_uri, app_name)
            VALUES ('demo-client-id', $1, 'http://localhost:3000/demo-client/callback', 'Demo Client App')
            ON CONFLICT (client_id) DO NOTHING
        `, [hashedSecret]);

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

pool.query('SELECT NOW()')
    .then(() => seedDatabase())
    .catch((err) => console.error('Initial DB connection failed:', err.message));

export default pool;