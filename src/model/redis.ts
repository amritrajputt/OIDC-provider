// File: d:\oidc provider\src\model\redis.ts
import { Redis, RedisOptions } from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6383';

const options: RedisOptions = {};
if (redisUrl.startsWith('rediss://')) {
    options.tls = {
        rejectUnauthorized: false
    };
}

const redis = new Redis(redisUrl, options);

redis.on('connect', () => {
    console.log('Connected to Redis successfully');
});

redis.on('error', (err) => {
    console.error('Redis connection error:', err);
});

export default redis;
