import bcrypt from "bcryptjs";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { setAuthCookie } from "../utils/token.js";
import { writeAudit } from "../utils/audit.js";

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+passwordHash");
  if (!user.passwordHash) {
    throw new ApiError(400, "This account signs in with Google and has no password yet. Use 'Forgot password' to set one.");
  }

  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new ApiError(400, "Current password is incorrect");
  }
  if (currentPassword === newPassword) {
    throw new ApiError(400, "The new password must be different from the current one");
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.passwordChangedAt = new Date(); 
  await user.save();

  setAuthCookie(res, user);
  await writeAudit(req, "User", "PASSWORD_CHANGED", user._id);

  res.json({ message: "Password updated. Other devices have been logged out." });
});