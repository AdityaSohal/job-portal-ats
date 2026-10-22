import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Company from "../models/Company.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

export const protect = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) throw new ApiError(401, "Not authenticated");

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new ApiError(401, "Session expired, please log in again");
  }

  const user = await User.findById(decoded.sub);
  if (!user) throw new ApiError(401, "Not authenticated");
  if (user.isBlocked) throw new ApiError(403, "Your account has been blocked");

  if (
    user.passwordChangedAt &&
    decoded.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)
  ) {
    throw new ApiError(401, "Password changed, please log in again");
  }

  req.user = user; 
  next();
});

export const authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : next(new ApiError(403, "Forbidden"));

export const requireApprovedCompany = asyncHandler(async (req, res, next) => {
  const company = req.user.companyId
    ? await Company.findById(req.user.companyId).select("status")
    : null;
  if (!company || company.status !== "approved") {
    throw new ApiError(403, "Your company is awaiting admin approval");
  }
  next();
});