import crypto from "crypto";
import ApiError from "../utils/ApiError.js";

export const cronAuth = (req, res, next) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return next(new ApiError(503, "Scheduled tasks are not configured"));
  const given = crypto.createHash("sha256").update(req.get("authorization") || "").digest();
  const expected = crypto.createHash("sha256").update(`Bearer ${secret}`).digest();

  return crypto.timingSafeEqual(given, expected) ? next() : next(new ApiError(401, "Unauthorized"));
};