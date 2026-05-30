import express from "express";
import cors from "cors";
import authRouter from "./routes/auth.js";
import clientRouter from "./routes/clients.js";
import oidcRouter from "./routes/oidc.js";
import session from 'express-session'
import discoveryRoutes from './routes/discovery.js';
import demoClientRouter from "./routes/demoClient.js";

const app = express();

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
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

app.get("/", (req, res) => {
    res.json({ message: "OIDC Provider Server is running" });
});


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
