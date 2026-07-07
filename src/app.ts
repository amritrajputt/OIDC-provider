import cors from "cors";
import express, { Request, Response, NextFunction } from "express";
import authRouter from "./routes/auth.js";
import clientRouter from "./routes/clients.js";
import oidcRouter from "./routes/oidc.js";
import session from 'express-session'
import { RedisStore } from 'connect-redis';
import redisClient from './model/redis.js';
import discoveryRoutes from './routes/discovery.js';
import demoClientRouter from "./routes/demoClient.js";
import path from "path";
import { fileURLToPath } from "url";
import { rotateSigningKeys } from "./utils/rotateKeys.js";
import { authRateLimiter, generalRateLimiter } from "../common/middleware/rateLimitter.middleware.js";



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const allowedOrigins = [
    process.env.FRONTEND_URL || "http://localhost:5173",
    "http://localhost:5174"
];

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(generalRateLimiter);

// Initialize Redis Store for express-session
const redisStore = new RedisStore({
    client: redisClient,
    prefix: "oidc_sess:", // Redis keys will be saved as oidc_sess:<sid>
});

app.use(session({
    store: redisStore,
    secret: process.env.SESSION_SECRET || 'fallback-secret-key-123',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 Days expiry
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true, // Prevents XSS cookie theft
        sameSite: 'lax'
    }
}));


app.use("/api/auth",authRateLimiter, authRouter);
app.use("/api/clients", clientRouter);
app.use("/api/oidc", oidcRouter);
app.use('/', discoveryRoutes);
app.use("/demo-client", demoClientRouter);

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
