import rateLimit from "express-rate-limit";

const make = (limit, message) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
  });

export const authLimiter = make(30, "Too many attempts, please try again later");
export const otpLimiter = make(10, "Too many OTP requests, please try again later");
export const searchLimiter = make(300, "Too many requests, please slow down");
export const uploadLimiter = make(20, "Too many uploads, please try again later");