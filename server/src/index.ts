import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import authRouter from "./routes/auth.js";
import membersRouter from "./routes/members.js";
import transactionsRouter from "./routes/transactions.js";
import adminRouter from "./routes/admin.js";
import officerRouter from "./routes/officer.js";
import auditorRouter from "./routes/auditor.js";
import fraudEngineRouter from "./routes/fraudEngine.js";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// CORS – allow Vercel & localhost
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  "https://saccofraudguard.vercel.app",
];

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) {
        callback(null, true);
        return;
      }
      // Strip trailing slash for comparison
      const normalised = origin.replace(/\/$/, "");
      if (allowedOrigins.includes(normalised)) {
        callback(null, true);
      } else {
        console.log(`CORS blocked origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy for Render/Vercel
app.set("trust proxy", 1);

// Routes
app.use("/api/auth", authRouter);
app.use("/api/members", membersRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/officer", officerRouter);
app.use("/api/auditor", auditorRouter);
app.use("/api/fraud-engine", fraudEngineRouter);

// Health check
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Root
app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Welcome to SaccoFraudGuard API" });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
