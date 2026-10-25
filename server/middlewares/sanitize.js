import ApiError from "../utils/ApiError.js";

const BAD_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const hasBadKey = (value, depth = 0) => {
  if (depth > 10) return true; 
  if (Array.isArray(value)) return value.some((v) => hasBadKey(v, depth + 1));
  if (value && typeof value === "object") {
    return Object.keys(value).some(
      (k) => k.startsWith("$") || k.includes(".") || BAD_KEYS.has(k) || hasBadKey(value[k], depth + 1)
    );
  }
  return false;
};

export const sanitizeInput = (req, res, next) => {
  const badQuery = Object.keys(req.query || {}).some((k) => k.includes("$"));
  if (badQuery || hasBadKey(req.body) || hasBadKey(req.params)) {
    return next(new ApiError(400, "Request contains invalid characters in field names"));
  }
  next();
};