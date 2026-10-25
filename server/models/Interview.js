import mongoose from "mongoose";
import { INTERVIEW_MODES, INTERVIEW_STATUS } from "../utils/constants.js";

const interviewSchema = new mongoose.Schema(
  {
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    scheduledAt: { type: Date, required: true },
    durationMinutes: { type: Number, min: 15, max: 480, default: 60 },
    mode: { type: String, enum: INTERVIEW_MODES, required: true },
    meetingLink: { type: String, maxlength: 500 },
    location: { type: String, trim: true, maxlength: 200 },
    interviewerName: { type: String, trim: true, maxlength: 80 },
    instructions: { type: String, trim: true, maxlength: 1000 },

    status: { type: String, enum: INTERVIEW_STATUS, default: "scheduled" },
    rescheduleReason: { type: String, maxlength: 500 },
    open: { type: Boolean, default: true },
  },
  { timestamps: true }
);

interviewSchema.index({ applicationId: 1 }, { unique: true, partialFilterExpression: { open: true } });
interviewSchema.index({ applicationId: 1, scheduledAt: -1 });
interviewSchema.index({ recruiterId: 1, scheduledAt: -1 });
interviewSchema.index({ candidateId: 1, scheduledAt: -1 });

export default mongoose.model("Interview", interviewSchema);