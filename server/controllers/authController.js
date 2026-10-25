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
import { otpEmail, verifyEmailOtp, accountExistsEmail } from "../utils/emailTemplates.js";
import { runInTransaction } from "../utils/transaction.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const OTP_TTL_MINUTES = 10;
const OTP_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const NOTICE_COOLDOWN_MS = 15 * 60 * 1000;

const OTP_FIELDS = {
  verify: {
    hash: "emailVerifyOtpHash", expires: "emailVerifyOtpExpires",
    attempts: "emailVerifyOtpAttempts", sentAt: "emailVerifyOtpSentAt",
  },
  reset: {
    hash: "resetOtpHash", expires: "resetOtpExpires",
    attempts: "resetOtpAttempts", sentAt: "resetOtpSentAt",
  },
};

const GENERIC_REGISTER = {
  message: "If this email can be registered, a verification code has been sent. Verify it to finish signing up.",
};
const GENERIC_VERIFY = { message: "If this account needs verification, a new code has been sent." };
const GENERIC_FORGOT = { message: "If an account exists for this email, a reset code has been sent." };

const buildSession = async (user) => {
  const company = user.companyId
    ? await Company.findById(user.companyId).select("name status rejectionReason logoUrl")
    : null;
  return { user, company };
};

let dummyHash;
const getDummyHash = () => (dummyHash ??= bcrypt.hash("not-a-real-password", 12));

const sendOtp = async (user, purpose, template) => {
  const f = OTP_FIELDS[purpose];
  const now = Date.now();
  const otp = generateOtp();

  const claimed = await User.findOneAndUpdate(
    { _id: user._id, $or: [{ [f.sentAt]: null }, { [f.sentAt]: { $lte: new Date(now - OTP_COOLDOWN_MS) } }] },
    {
      $set: {
        [f.hash]: hashOtp(purpose, user.email, otp),
        [f.expires]: new Date(now + OTP_TTL_MINUTES * 60 * 1000),
        [f.attempts]: 0,
        [f.sentAt]: new Date(now),
      },
    }
  );
  if (!claimed) return false;

  try {
    await sendEmail({ to: user.email, ...template(otp, OTP_TTL_MINUTES) });
  } catch (err) {
    console.error(`${purpose} email failed:`, err.message);
  }
  return true;
};

const checkOtp = async (email, purpose, otp) => {
  const f = OTP_FIELDS[purpose];
  const user = await User.findOneAndUpdate(
    {
      email,
      [f.hash]: { $exists: true, $ne: null },
      [f.expires]: { $gt: new Date() },
      [f.attempts]: { $lt: OTP_MAX_ATTEMPTS },
    },
    { $inc: { [f.attempts]: 1 } },
    { new: true }
  ).select(`+${f.hash}`);

  if (!user) return null;
  return safeEqual(hashOtp(purpose, email, otp), user[f.hash]) ? user : null;
};

const claimNotice = async (userId) => {
  const claimed = await User.findOneAndUpdate(
    {
      _id: userId,
      $or: [{ accountNoticeSentAt: null }, { accountNoticeSentAt: { $lte: new Date(Date.now() - NOTICE_COOLDOWN_MS) } }],
    },
    { $set: { accountNoticeSentAt: new Date() } }
  );
  return !!claimed;
};

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role = ROLES.CANDIDATE, company } = req.body;

  const passwordHash = await bcrypt.hash(password, 12);

  let user = null;
  try {
    await runInTransaction(async (session) => {
      user = null;
      const [created] = await User.create(
        [{ name, email, passwordHash, role, authProvider: "local" }],
        { session }
      );

      if (role === ROLES.CANDIDATE) {
        await CandidateProfile.create([{ userId: created._id }], { session });
      } else {
        const [newCompany] = await Company.create(
          [{
            name: company.name,
            website: company.website,
            industry: company.industry,
            location: company.location,
            description: company.description,
            createdBy: created._id,
          }],
          { session }
        );
        created.companyId = newCompany._id;
        await created.save({ session });
      }
      user = created;
    });
  } catch (err) {
    if (err.code !== 11000) throw err;
    user = null; 
  }

  if (user) {
    await sendOtp(user, "verify", verifyEmailOtp);
  } else {
    const existing = await User.findOne({ email }).select("email isBlocked");
    if (existing && !existing.isBlocked && (await claimNotice(existing._id))) {
      try {
        await sendEmail({ to: existing.email, ...accountExistsEmail() });
      } catch (err) {
        console.error("Account notice email failed:", err.message);
      }
    }
  }

  res.status(202).json(GENERIC_REGISTER); 
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const user = await checkOtp(email, "verify", otp);
  if (!user) throw new ApiError(400, "Invalid or expired code");

  const f = OTP_FIELDS.verify;
  const result = await User.updateOne(
    { _id: user._id, [f.hash]: user[f.hash] },
    { $set: { emailVerified: true }, $unset: { [f.hash]: 1, [f.expires]: 1 } }
  );
  if (!result.modifiedCount) throw new ApiError(400, "Invalid or expired code");

  res.json({ message: "Email verified. You can now log in." });
});

export const resendVerification = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select("email isBlocked emailVerified");
  if (user && !user.isBlocked && !user.emailVerified) await sendOtp(user, "verify", verifyEmailOtp);
  res.json(GENERIC_VERIFY);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+passwordHash");

  const hash = user?.passwordHash || (await getDummyHash());
  const match = await bcrypt.compare(password, hash);
  if (!user || !user.passwordHash || !match) throw new ApiError(401, "Invalid email or password");

  if (user.isBlocked) throw new ApiError(403, "Your account has been blocked. Please contact support.");
  if (!user.emailVerified) {
    throw new ApiError(403, "Please verify your email before logging in", "EMAIL_NOT_VERIFIED");
  }

  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

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
  let user = (await User.findOne({ googleId: payload.sub })) || (await User.findOne({ email }));

  if (user) {
    if (user.role !== ROLES.CANDIDATE) {
      throw new ApiError(403, "Google sign-in is available for candidates only. Please use email and password.");
    }
    if (user.isBlocked) throw new ApiError(403, "Your account has been blocked. Please contact support.");
    if (user.googleId && user.googleId !== payload.sub) {
      throw new ApiError(401, "This email is linked to a different Google account");
    }

    const update = { $set: { lastLoginAt: new Date(), emailVerified: true } };

    if (!user.googleId) {
      update.$set.googleId = payload.sub;
      if (!user.avatarUrl && payload.picture) update.$set.avatarUrl = payload.picture;

      if (user.emailVerified) {
        update.$set.authProvider = "both";
      } else {
        update.$set.authProvider = "google";
        update.$set.passwordChangedAt = new Date();
        update.$unset = { passwordHash: 1, emailVerifyOtpHash: 1, emailVerifyOtpExpires: 1 };
      }
    }

    await User.updateOne({ _id: user._id }, update);
    user = await User.findById(user._id);
  } else {
    try {
      await runInTransaction(async (session) => {
        const [created] = await User.create(
          [{
            name: payload.name || email.split("@")[0],
            email,
            googleId: payload.sub,
            authProvider: "google",
            emailVerified: true,
            avatarUrl: payload.picture,
            role: ROLES.CANDIDATE,
            lastLoginAt: new Date(),
          }],
          { session }
        );
        await CandidateProfile.create([{ userId: created._id }], { session });
        user = created;
      });
    } catch (err) {
      if (err.code !== 11000) throw err;
      user = await User.findOne({ email }); 
      if (!user) throw err;
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

export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select("email isBlocked");
  if (user && !user.isBlocked) await sendOtp(user, "reset", otpEmail);
  res.json(GENERIC_FORGOT); // always the same answer
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const user = await checkOtp(email, "reset", otp);
  if (!user) throw new ApiError(400, "Invalid or expired code");

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const r = OTP_FIELDS.reset;
  const v = OTP_FIELDS.verify;

  const result = await User.updateOne(
    { _id: user._id, [r.hash]: user[r.hash] },
    {
      $set: {
        passwordHash,
        passwordChangedAt: new Date(),
        emailVerified: true,
        authProvider: user.authProvider === "google" ? "both" : user.authProvider,
        [r.attempts]: 0,
      },
      $unset: { [r.hash]: 1, [r.expires]: 1, [v.hash]: 1, [v.expires]: 1 },
    }
  );
  if (!result.modifiedCount) throw new ApiError(400, "Invalid or expired code");

  res.json({ message: "Password updated. Please log in with your new password." });
});