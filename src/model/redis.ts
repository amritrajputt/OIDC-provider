// File: d:\oidc provider\src\model\redis.ts
import { Redis } from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6383';

const redis = new Redis(redisUrl);

redis.on('connect', () => {
    console.log('Connected to Redis successfully');
});

redis.on('error', (err) => {
    console.error('Redis connection error:', err);
});

export default redis;
