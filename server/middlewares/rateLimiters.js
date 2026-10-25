import rateLimit from "express-rate-limit";
import { MongoRateLimitStore } from "../utils/mongoRateLimitStore.js";

const skipInTests = () => process.env.NODE_ENV === "test";

const make = (name, limit, message, extra = {}) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
    store: new MongoRateLimitStore(name),
    passOnStoreError: true,
    skip: skipInTests,
    ...extra,
  });

export const authLimiter = make("auth", 30, "Too many attempts, please try again later");
export const otpLimiter = make("otp", 10, "Too many OTP requests, please try again later");
export const applyLimiter = make("apply", 30, "Too many applications, please try again later");
export const uploadLimiter = make("upload", 20, "Too many uploads, please try again later");


export const loginAccountLimiter = make(
  "login-account",
  10,
  "Too many failed login attempts for this account. Please try again later.",
  {
    skipSuccessfulRequests: true,
    keyGenerator: (req) =>
      typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase().slice(0, 254) : "no-email",
  }
);

export const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please slow down" },
  skip: skipInTests,
});