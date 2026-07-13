import cors from "cors";
import express, { Request, Response, NextFunction } from "express";
import authRouter from "./routes/auth.js";
import clientRouter from "./routes/clients.js";
import oidcRouter from "./routes/oidc.js";
import session from 'express-session'
import { RedisStore } from 'connect-redis';
import redisClient from './model/redis.js';
import discoveryRoutes from './routes/discovery.js';
import path from "path";
import { fileURLToPath } from "url";
import { rotateSigningKeys } from "./utils/rotateKeys.js";
import { authRateLimiter, generalRateLimiter } from "../common/middleware/rateLimitter.middleware.js";



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const allowedOrigins = [
    process.env.FRONTEND_URL || "http://localhost:5173",
    "http://localhost:5175"
];

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(generalRateLimiter);


const redisStoreClient = {
    get: (key: string) => redisClient.get(key),
    set: (key: string, value: string, options?: { EX?: number }) => {
        if (options && options.EX) {
            return redisClient.set(key, value, "EX", options.EX);
        }
        return redisClient.set(key, value);
    },
    del: (key: string | string[]) => {
        const keys = Array.isArray(key) ? key : [key];
        return redisClient.del(...keys);
    }
};

const redisStore = new RedisStore({
    client: redisStoreClient as any,
    prefix: "oidc_sess:", 
});

app.use(session({
    store: redisStore,
    secret: process.env.SESSION_SECRET || 'fallback-secret-key-123',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, 
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true, 
        sameSite: 'lax'
    }
}));


app.use("/api/auth",authRateLimiter ,authRouter);
app.use("/api/clients", clientRouter);
app.use("/api/oidc", oidcRouter);
app.use('/', discoveryRoutes);

app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({ status: "OK", message: "Server is healthy", timestamp: new Date().toISOString() });
});

if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(process.cwd(), 'frontend/dist')));

    app.get(/.*/, (req: Request, res: Response) => {
        if (req.path.startsWith("/api") || req.path.startsWith("/.well-known")) {
            res.status(404).json({ success: false, message: "Not found" });
            return;
        }
        res.sendFile(path.join(process.cwd(), 'frontend/dist/index.html'));
    })
} else {
    app.get("/", (req: Request, res: Response) => {
        res.json({ message: "OIDC Provider Server is running" });
    });

}

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("App Error:", err);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || "Internal Server Error",
        error: err.error || []
    });
});
app.post("/api/admin/rotate-keys", async (req, res, next) => {
    try {
        const newKid = await rotateSigningKeys();
        res.status(200).json({
            success: true,
            message: "Keys rotated successfully!",
            active_kid: newKid
        });
    } catch (error) {
        next(error);
    }
});
export default app;
