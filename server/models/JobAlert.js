import mongoose from "mongoose";
import { WORK_MODES, EMPLOYMENT_TYPES } from "../utils/constants.js";

const jobAlertSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, trim: true, maxlength: 80, default: "My job alert" },
    filters: {
      q: { type: String, trim: true, maxlength: 100 },
      location: { type: String, trim: true, maxlength: 100 },
      workMode: [{ type: String, enum: WORK_MODES }],
      employmentType: [{ type: String, enum: EMPLOYMENT_TYPES }],
      exp: { type: Number, min: 0, max: 60 },
      ctc: { type: Number, min: 0, max: 1000 },
      skills: [{ type: String, trim: true, lowercase: true, maxlength: 40 }],
    },
    frequency: { type: String, enum: ["daily", "weekly"], default: "daily" },
    isActive: { type: Boolean, default: true },
    lastSentAt: { type: Date },
  },
  { timestamps: true }
);

jobAlertSchema.index({ userId: 1, createdAt: -1 });
jobAlertSchema.index({ isActive: 1, frequency: 1, lastSentAt: 1 });

export default mongoose.model("JobAlert", jobAlertSchema);