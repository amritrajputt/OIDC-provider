
import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import redisClient from '../../src/model/redis.js';

export const authRateLimiter = rateLimit({
    store: new RedisStore({
        // @ts-expect-error - ioredis type mapping overrid
        sendCommand: (...args: string[]) => redisClient.call(args[0], ...args.slice(1)),
        prefix: 'rl_auth:', // Keys are saved as rl_auth:<IP> in Redis
    }),
    windowMs: 1 * 60 * 1000, 
    limit: 5, 
    standardHeaders: true, 
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many authentication requests. Please try again after 1 minute."
    }
});


export const generalRateLimiter = rateLimit({
    store: new RedisStore({
        // @ts-expect-error - ioredis type mapping override
        sendCommand: (...args: string[]) => redisClient.call(args[0], ...args.slice(1)),
        prefix: 'rl_gen:', // Keys are saved as rl_gen:<IP> in Redis
    }),
    windowMs: 15 * 60 * 1000, 
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many requests. Please try again later."
    }
});
