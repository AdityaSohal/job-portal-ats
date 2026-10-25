import "./loadEnv.js";
import "dotenv/config"; 
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import { connectDB } from "./configs/db.js";
import { validateEnv } from "./utils/validateEnv.js";
import { notFound, errorHandler } from "./middlewares/errorHandler.js";
import { sanitizeInput } from "./middlewares/sanitize.js";
import interviewRoutes from "./routes/interviewRoutes.js";
import accountRoutes from "./routes/accountRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import adminJobRoutes from "./routes/adminJobRoutes.js";
import adminUserRoutes from "./routes/adminUserRoutes.js";
import adminAnalyticsRoutes from "./routes/adminAnalyticsRoutes.js";
import adminAuditRoutes from "./routes/adminAuditRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import savedJobRoutes from "./routes/savedJobRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import alertRoutes from "./routes/alertRoutes.js";
import cronRoutes from "./routes/cronRoutes.js";

validateEnv(); 

const app = express();

app.set("trust proxy", 1); 
app.use(helmet());

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(null, false); 
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  })
);

app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests, please try again later" },
  })
);

app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use(sanitizeInput);

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin/jobs", adminJobRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/analytics", adminAnalyticsRoutes);
app.use("/api/admin/audit-logs", adminAuditRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/saved-jobs", savedJobRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/cron", cronRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;

if (!process.env.VERCEL && process.env.NODE_ENV !== "test") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on ${PORT}`));
}