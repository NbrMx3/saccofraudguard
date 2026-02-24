import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import authRouter from "./routes/auth.js";

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
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy for Render/Vercel
app.set("trust proxy", 1);

// Routes
app.use("/api/auth", authRouter);

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
