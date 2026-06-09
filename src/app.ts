import express from "express";
import cors from "cors";
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
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
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


if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../frontend/dist')));
    
    app.get(/^(?!\/api|\/demo-client|\/\.well-known|\/jwks\.json).*$/, (req, res) => {
        res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
    });
} else {
    app.get("/", (req, res) => {
        res.json({ message: "OIDC Provider Server is running" });
    });
}


app.use((err, req, res, next) => {
    console.error("App Error:", err);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || "Internal Server Error",
        error: err.error || []
    });
});

export default app;
