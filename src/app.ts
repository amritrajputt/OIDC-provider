import cors from "cors";
import express, { Request, Response, NextFunction } from "express";
import authRouter from "./routes/auth.js";
import clientRouter from "./routes/clients.js";
import oidcRouter from "./routes/oidc.js";
import session from 'express-session'
import discoveryRoutes from './routes/discovery.js';
import demoClientRouter from "./routes/demoClient.js";
import path from "path";
import { fileURLToPath } from "url";

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

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))

app.use("/api/auth", authRouter);
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

export default app;
