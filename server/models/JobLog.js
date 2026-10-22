import mongoose from "mongoose";
import { WORK_MODES } from "../utils/constants.js";

const jobAlertSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, trim: true, maxlength: 80 },
    filters: {
      keywords: String,
      location: String,
      workMode: { type: String, enum: WORK_MODES },
      minExp: Number,
      skills: [{ type: String, lowercase: true, trim: true }],
      minCtc: Number,
    },
    frequency: { type: String, enum: ["daily", "weekly"], default: "daily" },
    isActive: { type: Boolean, default: true },
    lastSentAt: { type: Date },
  },
  { timestamps: true }
);

jobAlertSchema.index({ isActive: 1, frequency: 1 });
jobAlertSchema.index({ userId: 1 });

export default mongoose.model("JobAlert", jobAlertSchema);