import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import Company from "../models/Company.js";
import CandidateProfile from "../models/CandidateProfile.js";
import { ROLES } from "../utils/constants.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { setAuthCookie, clearAuthCookie } from "../utils/token.js";
import { generateOtp, hashOtp, safeEqual } from "../utils/otp.js";
import { sendEmail } from "../utils/sendEmail.js";
import { otpEmail } from "../utils/emailTemplates.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const OTP_TTL_MINUTES = 10;
const OTP_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const buildSession = async (user) => {
  const company = user.companyId
    ? await Company.findById(user.companyId).select("name status rejectionReason logoUrl")
    : null;
  return { user, company };
};

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role = ROLES.CANDIDATE, company } = req.body;

  const passwordHash = await bcrypt.hash(password, 12);

  let user;
  try {
    user = await User.create({ name, email, passwordHash, role, authProvider: "local" });
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, "An account with this email already exists");
    throw err;
  }

  try {
    if (role === ROLES.CANDIDATE) {
      await CandidateProfile.create({ userId: user._id });
    } else {
      const newCompany = await Company.create({
        name: company.name,
        website: company.website,
        industry: company.industry,
        location: company.location,
        description: company.description,
        createdBy: user._id,
      });
      user.companyId = newCompany._id;
      await user.save();
    }
  } catch (err) {
    await Promise.all([
      User.deleteOne({ _id: user._id }),
      Company.deleteOne({ createdBy: user._id }),
    ]);
    throw err;
  }

  setAuthCookie(res, user);
  res.status(201).json(await buildSession(user));
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+passwordHash");
  const ok = user?.passwordHash && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) throw new ApiError(401, "Invalid email or password");
  if (user.isBlocked) throw new ApiError(403, "Your account has been blocked. Please contact support.");

  user.lastLoginAt = new Date();
  await user.save();

  setAuthCookie(res, user);
  res.json(await buildSession(user));
});

export const googleLogin = asyncHandler(async (req, res) => {
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: req.body.credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    throw new ApiError(401, "Invalid Google credential");
  }

  if (!payload?.email || !payload.email_verified) {
    throw new ApiError(401, "Your Google email is not verified");
  }

  const email = payload.email.toLowerCase();
  let user =
    (await User.findOne({ googleId: payload.sub })) || (await User.findOne({ email }));

  if (user) {
    if (user.role !== ROLES.CANDIDATE) {
      throw new ApiError(403, "Google sign-in is available for candidates only. Please use email and password.");
    }
    if (user.isBlocked) throw new ApiError(403, "Your account has been blocked. Please contact support.");

    if (!user.googleId) {
      user.googleId = payload.sub;
      user.authProvider = "both";
      user.emailVerified = true;
      if (!user.avatarUrl) user.avatarUrl = payload.picture;
    }
    user.lastLoginAt = new Date();
    await user.save();
  } else {
    user = await User.create({
      name: payload.name || email.split("@")[0],
      email,
      googleId: payload.sub,
      authProvider: "google",
      emailVerified: true,
      avatarUrl: payload.picture,
      role: ROLES.CANDIDATE,
      lastLoginAt: new Date(),
    });
    try {
      await CandidateProfile.create({ userId: user._id });
    } catch (err) {
      await User.deleteOne({ _id: user._id });
      throw err;
    }
  }

  setAuthCookie(res, user);
  res.json(await buildSession(user));
});

export const logout = (req, res) => {
  clearAuthCookie(res);
  res.json({ message: "Logged out" });
};

export const getMe = asyncHandler(async (req, res) => {
  res.json(await buildSession(req.user));
});

const GENERIC_FORGOT_RESPONSE = {
  message: "If an account exists for this email, a reset code has been sent.",
};

export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select("+resetOtpSentAt");

  if (user && !user.isBlocked) {
    const sentAt = user.resetOtpSentAt?.getTime() || 0;
    if (Date.now() - sentAt > OTP_COOLDOWN_MS) {
      const otp = generateOtp();
      user.resetOtpHash = hashOtp(user.email, otp);
      user.resetOtpExpires = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
      user.resetOtpAttempts = 0;
      user.resetOtpSentAt = new Date();
      await user.save();

      try {
        await sendEmail({ to: user.email, ...otpEmail(otp, OTP_TTL_MINUTES) });
      } catch (err) {
        console.error("OTP email failed:", err.message);
      }
    }
  }

  res.json(GENERIC_FORGOT_RESPONSE);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const invalid = new ApiError(400, "Invalid or expired code");

  const user = await User.findOne({ email }).select(
    "+passwordHash +resetOtpHash +resetOtpExpires +resetOtpAttempts"
  );

  if (!user || !user.resetOtpHash || user.resetOtpExpires < new Date()) throw invalid;

  if (user.resetOtpAttempts >= OTP_MAX_ATTEMPTS) {
    user.resetOtpHash = undefined;
    user.resetOtpExpires = undefined;
    await user.save();
    throw invalid;
  }

  if (!safeEqual(hashOtp(user.email, otp), user.resetOtpHash)) {
    user.resetOtpAttempts += 1;
    await user.save();
    throw invalid;
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.passwordChangedAt = new Date();
  if (user.authProvider === "google") user.authProvider = "both";
  user.resetOtpHash = undefined;
  user.resetOtpExpires = undefined;
  user.resetOtpAttempts = 0;
  await user.save();

  res.json({ message: "Password updated. Please log in with your new password." });
});