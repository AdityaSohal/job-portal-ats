import mongoose from "mongoose";
import { ROLES } from "../utils/constants.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, select: false }, 
    role: { type: String, enum: Object.values(ROLES), default: ROLES.CANDIDATE },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null },

    googleId: { type: String, unique: true, sparse: true },
    authProvider: { type: String, enum: ["local", "google", "both"], default: "local" },
    avatarUrl: { type: String },

    emailVerified: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    blockedReason: { type: String, maxlength: 500 },
    blockedAt: { type: Date },
    lastLoginAt: { type: Date },
    passwordChangedAt: { type: Date },

    resetOtpHash: { type: String, select: false },
    resetOtpExpires: { type: Date, select: false },
    resetOtpAttempts: { type: Number, default: 0, select: false },
    resetOtpSentAt: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.resetOtpHash;
    delete ret.resetOtpExpires;
    delete ret.resetOtpAttempts;
    delete ret.resetOtpSentAt;
    delete ret.__v;
    return ret;
  },
});
userSchema.index({ role: 1, createdAt: -1 });
export default mongoose.model("User", userSchema);